import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function MySubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, plan_name, pi_amount, end_date, status')
        .eq('user_id', '11111111-1111-1111-1111-111111111111'); // aktuální uživatel
      if (!error) setSubscriptions(data);
      setLoading(false);
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

  const handleConfirmPayment = async (sub) => {
    const res = await fetch('/api/subscription/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId: sub.id }),
    });
    const data = await res.json();
    if (data.error) {
      alert("Chyba: " + data.error);
    } else {
      alert("Payment released and subscription is now active!");
      setSubscriptions(subscriptions.map(s => s.id === sub.id ? { ...s, status: 'active' } : s));
    }
  };

  const statusInfo = {
    pending: { color: 'text-yellow-600', tooltip: 'Payment is pending, waiting for confirmation' },
    active: { color: 'text-green-600', tooltip: 'Subscription is active' },
    cancelled: { color: 'text-red-600', tooltip: 'Subscription has been cancelled' }
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
            <p className="text-gray-700 mb-1">Price: {sub.pi_amount} Pi / month</p>
            <p className="text-gray-700 mb-2">
              Status:{" "}
              <span 
                className={statusInfo[sub.status]?.color || 'text-gray-700'} 
                title={statusInfo[sub.status]?.tooltip || ''}
              >
                {sub.status}
              </span>
            </p>

            {sub.status === 'pending' && (
              <button
                onClick={() => handleConfirmPayment(sub)}
                className="px-6 py-2 bg-green-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform mr-3"
              >
                Confirm / Release Payment
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
