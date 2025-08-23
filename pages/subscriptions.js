import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function MySubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [piAuth, setPiAuth] = useState(false);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      console.log("fetchSubscriptions started");

      const waitForPi = async () => {
        if (!window.Pi || !window.Pi.initialized) {
          console.log("⚠️ Pi SDK not ready yet, retrying in 500ms...");
          setTimeout(waitForPi, 500);
          return;
        }

        try {
          const isAuth = await window.Pi.Wallet.checkAuthenticated();
          console.log("✅ Pi wallet authenticated:", isAuth);
          setPiAuth(isAuth);

          if (!isAuth) {
            console.log("ℹ️ User not authenticated. Open this page in Pi Browser to login.");
            setLoading(false);
            return;
          }

          const piUid = window.Pi.Wallet.user?.uid;
          console.log("ℹ️ Current user Pi UID:", piUid);

          const { data, error } = await supabase
            .from('subscriptions')
            .select('id, plan_name, pi_amount, end_date, status')
            .eq('user_id', piUid);

          if (error) console.error("❌ Supabase fetch error:", error);
          else {
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

  if (loading) return <p className="text-center mt-10">Načítám předplatná...</p>;

  if (!piAuth)
    return (
      <div className="text-center mt-10 text-purple-700">
        <p>Abyste mohli vidět svá předplatná, otevřete tuto stránku v <strong>Pi Browser</strong> a přihlaste se.</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-50 p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-purple-800">My Subscriptions</h1>
        {subscriptions.map(sub => (
          <div key={sub.id} className="border p-5 mb-5 rounded-2xl shadow-lg bg-white hover:shadow-xl transition-shadow">
            <h2 className="font-semibold text-xl mb-2 text-blue-700">{sub.plan_name}</h2>
            <p className="text-gray-700 mb-1">Next Payment: {sub.end_date}</p>
            <p className="text-gray-700 mb-2">Price: {sub.pi_amount} Pi / month</p>
            <p className="text-gray-700 mb-2">Status: <span className="font-semibold">{sub.status}</span></p>
            {sub.status === 'active' && (
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
