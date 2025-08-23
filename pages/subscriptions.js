import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function MySubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      console.log("fetchSubscriptions started");

      // čekáme, až SDK bude načtené
      if (!window.Pi || !window.Pi.Wallet) {
        console.warn("⚠️ Pi SDK not loaded yet");
        return;
      }

      try {
        // 1️⃣ Autentizace uživatele
        console.log("ℹ️ Authenticating user via Pi SDK...");
        const authRes = await window.Pi.authenticate(
          ["user:basic"], // pouze platný scope
          (incompletePayment) => {
            console.log("🔔 Incomplete payment callback:", incompletePayment);
          }
        );

        console.log("✅ Pi wallet authenticated:", authRes);

        const accessToken = authRes?.accessToken;
        if (!accessToken) throw new Error("No accessToken returned from Pi");

        // 2️⃣ Zavoláme Pi /me endpoint pro získání aktuálního userId
        const meRes = await fetch("https://api.minepi.com/v2/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!meRes.ok) throw new Error("Failed to fetch /me from Pi");
        const meData = await meRes.json();
        console.log("👤 Current Pi user:", meData);

        const currentUserId = meData.id;
        setUserId(currentUserId);

        // 3️⃣ Fetch subscriptions ze Supabase pro aktuálního uživatele
        const { data, error } = await supabase
          .from("subscriptions")
          .select("id, plan_name, pi_amount, end_date, status")
          .eq("user_id", currentUserId);

        if (error) {
          console.error("🔥 Supabase fetch subscriptions error:", error);
        } else {
          console.log("✅ Subscriptions fetched:", data);
          setSubscriptions(data);
        }
      } catch (err) {
        console.error("🔥 Pi fetchSubscriptions error:", err);
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

    if (!error) setSubscriptions(subscriptions.filter((s) => s.id !== id));
  };

  const handleApprovePayment = async (sub) => {
    try {
      const res = await fetch("/api/pi/approvePayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: sub.pi_payment_id,
          studentId: userId,
          teacherId: sub.teacher_id,
        }),
      });
      const data = await res.json();
      console.log("Payment approved:", data);

      // update status subscription na active
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === sub.id ? { ...s, status: "active" } : s
        )
      );
    } catch (err) {
      console.error("🔥 Approve payment error:", err);
    }
  };

  if (loading)
    return <p className="text-center mt-10">Načítám předplatná...</p>;

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
            <h2 className="font-semibold text-xl mb-2 text-blue-700">
              {sub.plan_name}
            </h2>
            <p className="text-gray-700 mb-1">Next Payment: {sub.end_date}</p>
            <p className="text-gray-700 mb-2">Price: {sub.pi_amount} Pi / month</p>
            <p className="text-gray-700 mb-2">Status: {sub.status}</p>
            {sub.status === "pending" && (
              <button
                onClick={() => handleApprovePayment(sub)}
                className="px-6 py-2 bg-green-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform mr-2"
              >
                Approve / Release Payment
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
