// pages/subscriptions.js
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

        const authRes = await window.Pi.authenticate(
          ["username"],
          (incompletePayment) => {
            console.log("⚠️ Incomplete payment found:", incompletePayment);
          }
        );

        if (!authRes || !authRes.user || !authRes.user.uid) {
          console.error("❌ Authentication failed:", authRes);
          return;
        }

        console.log("✅ Pi wallet authenticated:", authRes);
        setUserUid(authRes.user.uid);

        // Najdeme Supabase user_id podle pi_uid
        const { data: users, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("pi_uid", authRes.user.uid)
          .single();

        if (userError || !users) {
          console.error("🔥 Supabase fetch user error:", userError);
          return;
        }

        const userId = users.id;

        // Načteme subscriptions + teacher_id
        const { data: subs, error: subsError } = await supabase
          .from("subscriptions")
          .select("id, plan_name, pi_amount, end_date, status, teacher_id")
          .eq("user_id", userId);

        if (subsError) {
          console.error("🔥 Supabase fetch subscriptions error:", subsError);
        } else {
          // Pro každý subscription doplníme wallet_address učitele
          const subsWithWallets = await Promise.all(
            subs.map(async (sub) => {
              if (!sub.teacher_id) return sub;
              const { data: teacherUser, error: teacherError } = await supabase
                .from("users")
                .select("wallet_address")
                .eq("id", sub.teacher_id)
                .single();
              if (teacherError) {
                console.error(`❌ Fetch teacher wallet for ${sub.teacher_id} failed:`, teacherError);
                return sub;
              }
              return { ...sub, teacher_wallet: teacherUser.wallet_address };
            })
          );

          console.log("📄 Subscriptions fetched with teacher wallets:", subsWithWallets);
          setSubscriptions(subsWithWallets);

          // Načteme payments pro každou subscription
          for (const sub of subsWithWallets) {
            const { data: payments, error: payError } = await supabase
              .from("payments")
              .select("id, subscription_id, status, payee_id, pi_amount")
              .eq("subscription_id", sub.id);

            if (payError) {
              console.error(`❌ Payments fetch error for subscription ${sub.id}:`, payError);
            } else {
              console.log(`💰 Payments for subscription ${sub.id}:`, payments);
            }
          }
        }
      } catch (err) {
        console.error("🔥 fetchSubscriptions error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const handleApprove = async (id, teacherWallet) => {
    try {
      console.log(`➡️ Approving subscription ${id} via /api/pi/activate`);
      const res = await fetch("/api/pi/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: id,
          teacherWallet: teacherWallet,
        }),
      });

      const result = await res.json();
      console.log("📡 Activate API response:", result);

      if (!res.ok) {
        console.error("❌ Activate API error:", result.error, result.debug);
        return;
      }

      // update local state
      setSubscriptions(
        subscriptions.map((s) =>
          s.id === id ? { ...s, status: "active" } : s
        )
      );
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
            <p className="text-gray-700 mb-1">Price: {sub.pi_amount} Pi / month</p>
            <p className="text-gray-700 mb-2">Status: {sub.status}</p>

            {sub.status === "pending" && sub.teacher_wallet && (
              <button
                onClick={() => handleApprove(sub.id, sub.teacher_wallet)}
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
