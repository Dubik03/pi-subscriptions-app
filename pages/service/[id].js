import { useState } from "react";
import { useRouter } from "next/router";

const services = [
  { id: 1, name: "Fitness Klub Praha", price: 2 },
  { id: 2, name: "Online English Tutor", price: 1.5 },
  { id: 3, name: "Crypto News Portal", price: 0.5 },
];

export default function ServiceDetail() {
  const router = useRouter();
  const { id } = router.query;
  const service = services.find((s) => s.id === parseInt(id));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentId, setPaymentId] = useState(null);

  if (!service) return <p className="text-center mt-10 text-red-500">Service not found</p>;

  const handleSubscribe = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/createSubscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: "11111111-1111-1111-1111-111111111111",
          teacherId: "22222222-2222-2222-2222-222222222222",
          planName: service.name,
          piAmount: service.price,
          durationDays: 30,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage("Chyba: " + data.error);
      } else {
        setPaymentId(data.payment.id);
        setMessage(`Subscribed! Payment ID: ${data.payment.id}`);
      }
    } catch (err) {
      setMessage("Chyba: " + err.message);
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!paymentId) return setMessage("Nejdříve vytvoř platbu.");
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/pi/approvePayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, service }),
      });
      const data = await res.json();
      if (data.error) setMessage("Chyba: " + data.error);
      else setMessage(`Payment approved! Status: ${data.payment.status}`);
    } catch (err) {
      setMessage("Chyba: " + err.message);
    }
    setLoading(false);
  };

  const handleComplete = async () => {
    if (!paymentId) return setMessage("Nejdříve vytvoř platbu.");
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/pi/completePayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, txid: "fake-txid-456" }),
      });
      const data = await res.json();
      if (data.error) setMessage("Chyba: " + data.error);
      else setMessage(`Payment completed! TXID: ${data.payment.txid}`);
    } catch (err) {
      setMessage("Chyba: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-50 p-6">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold mb-4 text-blue-700">{service.name}</h1>
        <p className="text-gray-700 mb-2">{service.price} Pi / měsíc</p>

        <div className="flex gap-3 mb-4">
          <button onClick={handleSubscribe} disabled={loading} className="px-4 py-2 bg-green-500 text-white rounded-xl hover:scale-105 transform transition-transform">
            {loading ? "Probíhá..." : "Subscribe"}
          </button>
          <button onClick={handleApprove} disabled={loading} className="px-4 py-2 bg-yellow-400 text-white rounded-xl hover:scale-105 transform transition-transform">
            Approve
          </button>
          <button onClick={handleComplete} disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:scale-105 transform transition-transform">
            Complete
          </button>
        </div>

        {message && <p className="mt-2 text-blue-700">{message}</p>}
      </div>
    </div>
  );
}
