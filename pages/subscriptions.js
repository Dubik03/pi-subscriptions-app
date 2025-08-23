import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function MySubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [piUser, setPiUser] = useState(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      console.log("fetchSubscriptions started");

      if (!window.Pi || !window.Pi.initialized) {
        console.log("⚠️ Pi SDK not loaded yet, retrying...");
        setTimeout(fetchSubscriptions, 500);
        return;
      }

      try {
        // 1️⃣ Authenticate user through Pi SDK
        const authRes = await window.Pi.authenticate(
          ["user:basic", "wallet:basic"],
          (payment) => {
            console.log("Incomplete payment found:", payment);
          }
        );
        console.log("✅ Pi SDK authenticated:", authRes);

        // 2️⃣ Verify user via /me endpoint
        const meRes = await fetch("https://api.minepi.com/v2/me", {
          headers: {
            Authorization: `Bearer ${authRes.accessToken}`,
          },
        });
        const meData = await meRes.json();
        console.log("✅ Verified Pi user:", meData);
        setPiUser(meData);

        // 3️⃣ Fetch subscriptions from Supabase
        const { data, error } = await supabase
          .from("subscriptions")
          .select("id, plan_name, pi_amount, end_date, status")
          .eq("user_id", meData.uid);

        if (error) {
          console.error("🔥 Supabase fetch subscriptions error:", error);
        } else {
          setSubscriptions(data || []);
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
      console.log("Approving payment for subscription:", sub.id);

      const res = await fetch("/api/pi/completePayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: sub.pi_payment_id,
          txid: sub.txid,
          studentId: piUser.uid,
          teacherId: sub.teacher_id,
          planName: sub.plan_name,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        console.log("✅ Payment approved and subscription updated:", data);
        // Update status in state
        setSubscriptions((prev) =>
          prev.map((s) =>
            s.id === sub.id ? { ...s, status: "active" } : s
          )
        );
      } else {
        console.error("❌ Payment approval failed:", data);
      }
    } catch (err) {
      console.error("🔥 handleApprovePayment error:", err);
    }
  };

  if (loading) return <p className="text-center mt-10">Načítám předplatná...</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-50 p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-purple-800">My Subscriptions</h1>
        {subscriptions.length === 0 && <p className="text-center text-gray-600">Žádná předplatná nebyla nalezena.</p>}
        {subscriptions.map((sub) => (
          <div key={sub.id} className="border p-5 mb-5 rounded-2xl shadow-lg bg-white hover:shadow-xl transition-shadow">
            <h2 className="font-semibold text-xl mb-2 text-blue-700">{sub.plan_name}</h2>
            <p className="text-gray-700 mb-1">Next Payment: {sub.end_date}</p>
            <p className="text-gray-700 mb-2">Price: {sub.pi_amount} Pi / month</p>
            <p className="text-gray-700 mb-2">Status: <strong>{sub.status}</strong></p>

            {/* Show approve button only if status is pending */}
            {sub.status === "pending" && (
              <button
                onClick={() => handleApprovePayment(sub)}
                className="px-6 py-2 bg-green-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform mr-3"
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
