import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const services = [
  { id: 1, name: "Fitness Klub Praha", price: 2, description: "✔️ Přístup do posilovny\n✔️ Online rezervace\n✔️ Členství ve skupině" },
  { id: 2, name: "Online English Tutor", price: 1.5, description: "✔️ Online lekce\n✔️ Přístup k materiálům\n✔️ Individuální feedback" },
  { id: 3, name: "Crypto News Portal", price: 0.5, description: "✔️ Přístup k exkluzivnímu obsahu\n✔️ Týdenní analýzy\n✔️ Premium newsletter" },
];

export default function ServiceDetail() {
  const router = useRouter();
  const { id } = router.query;
  const service = services.find(s => s.id === parseInt(id));

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [lastPaymentId, setLastPaymentId] = useState(null);
  const [Pi, setPi] = useState(null);

  // --- Pi SDK init ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Pi) {
      window.Pi.init({ version: "2.0", sandbox: true });
      setPi(window.Pi);
    } else {
      const script = document.createElement("script");
      script.src = "https://sdk.minepi.com/pi-sdk.js";
      script.async = true;
      script.onload = () => {
        window.Pi.init({ version: "2.0", sandbox: true });
        setPi(window.Pi);
      };
      document.body.appendChild(script);
    }
  }, []);

  if (!service) return <p className="text-center mt-10 text-red-500">Service not found</p>;

  const handleApprove = async () => {
    setLoading(true);
    setMessage("");
    try {
      // Simulujeme sandbox platbu
      const paymentId = crypto.randomUUID();
      setLastPaymentId(paymentId);

      const res = await fetch("/api/pi/approvePayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, service }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));

      setMessage(`✅ Payment approved (pending)!\nPayment ID: ${paymentId}`);
    } catch (err) {
      setMessage("❌ Approve error: " + err.message);
    }
    setLoading(false);
  };

  const handleComplete = async () => {
    if (!lastPaymentId) return setMessage("❌ Nejprve proveď approve.");

    setLoading(true);
    setMessage("");
    try {
      const txid = crypto.randomUUID(); // simulujeme TXID

      const res = await fetch("/api/pi/completePayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: lastPaymentId, txid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));

      setMessage(`✅ Payment completed!\nSubscription ID: ${data.subscription.id}\nTXID: ${txid}`);
    } catch (err) {
      setMessage("❌ Complete error: " + err.message);
    }
    setLoading(false);
  };

  const handleRefund = async () => {
    if (!lastPaymentId) return setMessage("❌ Nejprve proveď platbu.");

    setLoading(true);
    setMessage("");
    try {
      const refundTxid = crypto.randomUUID(); // simulujeme refund TXID

      const res = await fetch("/api/pi/refundPayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: lastPaymentId, refundTxid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));

      setMessage(`💸 Payment refunded!\nRefund TXID: ${refundTxid}`);
    } catch (err) {
      setMessage("❌ Refund error: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-50 p-6">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold mb-4 text-blue-700">{service.name}</h1>
        <p className="text-gray-700 mb-2">{service.price} Pi / měsíc</p>
        <p className="whitespace-pre-line mb-6 text-gray-600">{service.description}</p>

        <button
          onClick={handleApprove}
          disabled={loading}
          className="px-6 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform mr-3"
        >
          {loading ? "Probíhá..." : "Approve Payment (pending)"}
        </button>

        <button
          onClick={handleComplete}
          disabled={loading || !lastPaymentId}
          className="px-6 py-2 bg-gradient-to-r from-blue-400 to-indigo-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform mr-3"
        >
          {loading ? "Probíhá..." : "Complete Payment & Create Subscription"}
        </button>

        <button
          onClick={handleRefund}
          disabled={loading || !lastPaymentId}
          className="px-6 py-2 bg-gradient-to-r from-red-400 to-pink-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform mr-3"
        >
          {loading ? "Probíhá..." : "Refund Payment"}
        </button>

        <Link href="/subscriptions">
          <button className="px-6 py-2 bg-gray-300 rounded-xl shadow hover:scale-105 transform transition-transform mt-3">
            My Subscriptions
          </button>
        </Link>

        {message && <pre className="mt-4 text-blue-700 whitespace-pre-wrap">{message}</pre>}
      </div>
    </div>
  );
}
