import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function MySubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      console.log("🔹 fetchSubscriptions started");

      if (typeof window === "undefined") return;

      const waitForPi = async () => {
        if (!window.Pi) {
          console.log("⚠️ Pi SDK not loaded yet, retrying...");
          setTimeout(waitForPi, 500);
          return;
        }

        const Pi = window.Pi;
        console.log("✅ Pi SDK loaded:", Pi);

        try {
          const auth = await Pi.authenticate();
          console.log("✅ Pi auth success:", auth);
          const piUid = auth.user.uid;
          console.log("ℹ️ Current user Pi UID:", piUid);

          const { data, error } = await supabase
            .from('subscriptions')
            .select('id, plan_name, pi_amount, end_date, status, payment_id, teacher_id')
            .eq('user_id', piUid);

          if (error) {
            console.error("❌ Supabase fetch error:", error);
            setSubscriptions([]);
          } else {
            console.log("✅ Subscriptions fetched:", data);
            setSubscriptions(data || []);
          }
        } catch (err) {
          console.error("🔥 Pi fetchSubscriptions error:", err);
          setSubscriptions([]);
        }

        setLoading(false);
      };

      waitForPi();
    };

    fetchSubscriptions();
  }, []);

  const handleCancel = async (id) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (!error) setSubscriptions(subscriptions.filter(s => s.id !== id));
  };

  const handleApprovePayment = async (sub) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('id', sub.id)
        .select()
        .single();

      if (error) {
        console.error("❌ Error approving payment:", error);
        return;
      }

      console.log("✅ Payment approved for subscription:", data);
      setSubscriptions(subscriptions.map(s => s.id === sub.id ? data : s));
    } catch (err) {
      console.error("🔥 handleApprovePayment error:", err);
    }
  };

  if (loading) return <p className="text-center mt-10">Načítám předplatná...</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-50 p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-purple-800">My Subscriptions</h1>
        {subscriptions.map(sub => (
          <div key={sub.id} className="border p-5 mb-5 rounded-2xl shadow-lg bg-white hover:shadow-xl transition-shadow">
            <h2 className="font-semibold text-xl mb-2 text-blue-700">{sub.plan_name}</h2>
            <p className="text-gray-700 mb-1">Next Payment: {sub.end_date}</p>
            <p className="text-gray-700 mb-2">Price: {sub.pi_amount} Pi / month</p>
            <p className={`mb-2 font-semibold ${sub.status === 'active' ? 'text-green-600' : 'text-yellow-700'}`}>
              Status: {sub.status}
            </p>

            {sub.status === 'pending' && (
              <button
                onClick={() => handleApprovePayment(sub)}
                className="px-6 py-2 bg-green-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform mr-3"
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
