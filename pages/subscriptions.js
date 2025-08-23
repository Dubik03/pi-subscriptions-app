import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function MySubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userUid, setUserUid] = useState(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      console.log("fetchSubscriptions started");

      // 1️⃣ počkáme na Pi SDK
      if (!window.Pi || !window.Pi.Wallet) {
        console.warn("⚠️ Pi SDK not loaded yet");
        return;
      }

      try {
        // 2️⃣ autentizace uživatele přes Pi
        const authRes = await window.Pi.authenticate(
          ["username", "platform"], // požadované scope
          (incompletePayment) => {
            console.log("⚠️ Incomplete payment found:", incompletePayment);
          }
        );

        if (!authRes || !authRes.user || !authRes.user.uid) {
          console.error("❌ Authentication failed:", authRes);
          setLoading(false);
          return;
        }

        console.log("✅ Pi wallet authenticated:", authRes);

        const uid = authRes.user.uid;
        setUserUid(uid);

        // 3️⃣ načteme předplatná z Supabase
        const { data, error } = await supabase
          .from("subscriptions")
          .select("id, plan_name, pi_amount, end_date, status")
          .eq("user_id", uid);

        if (error) {
          console.error("🔥 Supabase fetch error:", error);
        } else {
          console.log("✅ Subscriptions fetched:", data);
          setSubscriptions(data);
        }

      } catch (err) {
        console.error("🔥 fetchSubscriptions error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const handleCancel = async (id) => {
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (!error) {
      setSubscriptions(subscriptions.filter((s) => s.id !== id));
    } else {
      console.error("🔥 Cancel subscription error:", error);
    }
  };

  const handleApprove = async (id) => {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .update({ status: "active" })
        .eq("id", id);

      if (!error) {
        setSubscriptions(
          subscriptions.map((s) => (s.id === id ? { ...s, status: "active" } : s))
        );
        console.log("✅ Subscription approved:", id);
      } else {
        console.error("🔥 Approve subscription error:", error);
      }
    } catch (err) {
      console.error("🔥 handleApprove error:", err);
    }
  };

  if (loading) return <p className="text-center mt-10">Načítám předplatná...</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-50 p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-purple-800">
          My Subscriptions
        </h1>
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="border p-5 mb-5 rounded-2xl shadow-lg bg-white hover:shadow-xl transition-shadow"
          >
            <h2 className="font-semibold text-xl mb-2 text-blue-700">{sub.plan_name}</h2>
            <p className="text-gray-700 mb-1">Next Payment: {sub.end_date}</p>
            <p className="text-gray-700 mb-2">Price: {sub.pi_amount} Pi / month</p>
            <p className="text-gray-700 mb-2">Status: {sub.status}</p>

            {/* Zobrazíme tlačítko pro schválení jen pokud je pending */}
            {sub.status === "pending" && (
              <button
                onClick={() => handleApprove(sub.id)}
                className="px-6 py-2 mr-3 bg-green-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform"
              >
                Approve Payment
              </button>
            )}

            <button
              onClick={() => handleCancel(sub.id)}
              className="px-6 py-2 bg-red-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform"
            >
              Cancel
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
