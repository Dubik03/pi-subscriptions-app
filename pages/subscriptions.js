import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function MySubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userUid, setUserUid] = useState(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        console.log("⚡ Attempting Pi SDK authentication...");
        if (!window.Pi || !window.Pi.authenticate) {
          console.error("❌ Pi SDK not loaded or authenticate() missing");
          return;
        }

        const authRes = await window.Pi.authenticate(["username"], (incompletePayment) => {
          console.log("⚠️ Incomplete payment found:", incompletePayment);
        });

        if (!authRes?.user?.uid) {
          console.error("❌ Authentication failed:", authRes);
          return;
        }

        console.log("✅ Pi wallet authenticated:", authRes);
        setUserUid(authRes.user.uid);

        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("pi_uid", authRes.user.uid)
          .single();

        if (userError || !user) {
          console.error("🔥 Supabase fetch user error:", userError);
          return;
        }

        const userId = user.id;
        const { data: subs, error: subsError } = await supabase
          .from("subscriptions")
          .select("id, plan_name, pi_amount, end_date, status")
          .eq("user_id", userId);

        if (subsError) {
          console.error("🔥 Supabase fetch subscriptions error:", subsError);
          return;
        }

        console.log("📄 Subscriptions fetched:", subs);
        setSubscriptions(subs);
      } catch (err) {
        console.error("🔥 fetchSubscriptions error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const handleApprove = async (subscriptionId) => {
    try {
      console.log(`➡️ Activating subscription ${subscriptionId}...`);
      const res = await fetch("/api/pi/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });

      const result = await res.json();
      console.log("📡 Activate API response:", result);

      if (!res.ok) {
        console.error("❌ Activate API error:", result.error, result.debug);
        return;
      }

      if (result.debug?.length) {
        console.groupCollapsed(`📜 Debug info for subscription ${subscriptionId}`);
        result.debug.forEach((line) => console.log(line));
        console.groupEnd();
      }

      // Phase II - otevřít Pi payment flow pro uživatele
      if (window.Pi && window.Pi.createPayment) {
        for (const p of result.payments) {
          const piPayment = window.Pi.createPayment({
            amount: p.pi_amount,
            memo: `Payment for ${p.id}`,
          });

          piPayment.onReadyForServerApproval = async (paymentId) => {
            console.log("📝 Server-side approval, paymentId:", paymentId);
            // tu můžeš případně zavolat /api/pi/approve pokud používáš approve endpoint
          };

          piPayment.onReadyForServerCompletion = async (paymentId, txId) => {
            console.log("📌 Server-side completion, paymentId:", paymentId, "txId:", txId);

            try {
              const payoutRes = await fetch("/api/pi/payoutPending", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId, txId }),
              });

              let payoutData;
              try {
                payoutData = await payoutRes.json();
              } catch (jsonErr) {
                const text = await payoutRes.text();
                payoutData = { error: "Invalid JSON response", body: text };
              }

              console.log("💸 Payout response:", payoutData);

              if (payoutData.error) {
                console.warn("⚠️ Payout error detected:", payoutData.error);
                if (payoutData.body) console.log("📄 Raw response body:", payoutData.body);
              }
            } catch (err) {
              console.error("🔥 Payout request failed:", err);
            }
          };

          piPayment.onCancel = () => console.log("❌ User cancelled payment");
          piPayment.onError = (err) => console.error("🔥 Pi SDK error", err);
        }
      }

      setSubscriptions(subscriptions.map((s) =>
        s.id === subscriptionId ? { ...s, status: "active" } : s
      ));
    } catch (err) {
      console.error("🔥 handleApprove error:", err);
    }
  };

  const handleCancel = async (id) => {
    try {
      console.log(`➡️ Cancelling subscription ${id}`);
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) {
        console.error("❌ Cancel subscription error:", error);
      } else {
        console.log(`✅ Subscription ${id} cancelled`);
        setSubscriptions(subscriptions.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error("🔥 handleCancel error:", err);
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
            <h2 className="font-semibold text-xl mb-2 text-blue-700">
              {sub.plan_name}
            </h2>
            <p className="text-gray-700 mb-1">Next Payment: {sub.end_date}</p>
            <p className="text-gray-700 mb-1">Price: {sub.pi_amount} Pi / month</p>
            <p className="text-gray-700 mb-2">Status: {sub.status}</p>

            {sub.status === "pending" && (
              <button
                onClick={() => handleApprove(sub.id)}
                className="px-6 py-2 bg-green-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform mr-2"
              >
                Approve Payment
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
