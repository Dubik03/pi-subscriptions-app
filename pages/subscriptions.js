import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function MySubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [piUser, setPiUser] = useState(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        console.log("fetchSubscriptions started");

        if (!window.Pi || !window.Pi.Wallet) {
          console.warn("⚠️ Pi SDK not loaded yet");
          return;
        }

        // 1️⃣ Inicializace Pi SDK a autentizace
        console.log("🔐 Authenticating user via Pi SDK...");
        const authRes = await window.Pi.Wallet.authenticate(
          ["username"], // scopes, můžeme přidat další pokud bude potřeba
          (incompletePayment) => {
            console.log("⚠️ Incomplete payment found:", incompletePayment);
          }
        );

        console.log("✅ Pi SDK authenticated:", authRes);

        // 2️⃣ Získání uid přes /me endpoint
        const accessToken = authRes?.accessToken;
        if (!accessToken) throw new Error("Missing access token from Pi SDK");

        const meRes = await fetch("https://api.minepi.com/v2/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!meRes.ok) throw new Error("Failed to fetch Pi user info");

        const meData = await meRes.json();
        console.log("📦 Pi /me response:", meData);

        const currentUserId = meData.uid;
        setPiUser(meData);

        // 3️⃣ Načtení předplatných z Supabase podle uid
        const { data, error } = await supabase
          .from("subscriptions")
          .select("id, plan_name, pi_amount, end_date, status")
          .eq("user_id", currentUserId);

        if (error) throw error;

        setSubscriptions(data);
        console.log("✅ Subscriptions loaded:", data);
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

  const handleApprove = async (id) => {
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "active" })
        .eq("id", id);

      if (error) throw error;

      setSubscriptions(
        subscriptions.map((s) =>
          s.id === id ? { ...s, status: "active" } : s
        )
      );
    } catch (err) {
      console.error("🔥 Approve subscription error:", err);
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
            <p className="text-gray-700 mb-2">
              Status:{" "}
              <span
                className={
                  sub.status === "active"
                    ? "text-green-600 font-semibold"
                    : sub.status === "pending"
                    ? "text-yellow-600 font-semibold"
                    : "text-red-600 font-semibold"
                }
              >
                {sub.status}
              </span>
            </p>
            {sub.status === "pending" && (
              <button
                onClick={() => handleApprove(sub.id)}
                className="px-6 py-2 bg-green-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform mr-2"
              >
                Approve / Release Payment
              </button>
            )}
            {sub.status !== "cancelled" && (
              <button
                onClick={() => handleCancel(sub.id)}
                className="px-6 py-2 bg-red-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform"
              >
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
