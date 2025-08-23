import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function MySubscriptions({ Pi }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!Pi) return;

      try {
        const auth = await Pi.authenticate(); // aktuální Pi uživatel
        const piUid = auth.user.uid;

        const { data, error } = await supabase
          .from('subscriptions')
          .select('id, plan_name, pi_amount, end_date, status, payment_id, teacher_id')
          .eq('user_id', piUid);

        if (!error) setSubscriptions(data);
        else console.error("Error fetching subscriptions:", error);
      } catch (err) {
        console.error("Pi auth error:", err);
      }

      setLoading(false);
    };

    fetchSubscriptions();
  }, [Pi]);

  const handleApprove = async (subscription) => {
    try {
      const { payment_id, teacher_id, id } = subscription;
      if (!payment_id) throw new Error("Missing payment ID");

      // Zavoláme backend endpoint pro uvolnění platby
      const res = await fetch('/api/pi/releasePayment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payment_id, teacherId: teacher_id }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Aktualizujeme status v tabulce subscriptions
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('id', id);

      if (updateError) throw updateError;

      setSubscriptions(subs => subs.map(s => s.id === id ? { ...s, status: 'active' } : s));
    } catch (err) {
      console.error("Approve payment error:", err);
      alert("Chyba při uvolnění platby: " + err.message);
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
            <p className="text-gray-700 mb-2">Status: {sub.status}</p>

            {sub.status === 'pending' && (
              <button
                onClick={() => handleApprove(sub)}
                className="px-6 py-2 bg-green-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform"
              >
                Approve / Release Payment
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
