// pages/services/[id].js
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
  const service = services.find((s) => s.id === parseInt(id));

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [lastPaymentId, setLastPaymentId] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.minepi.com/pi-sdk.js";
    script.async = true;
    script.onload = () => {
      if (window.Pi) {
        window.Pi.init({ version: "2.0", sandbox: true }); // sandbox: false v produkci
        setSdkLoaded(true);
        console.log("Pi SDK loaded and initialized");
      }
    };
    script.onerror = () => {
      console.error("Failed to load Pi SDK");
      setMessage("❌ Nepodařilo se načíst Pi SDK");
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (!service) return <p className="text-center mt-10 text-red-500">Service not found</p>;

  const handlePiApproveComplete = async () => {
    if (!sdkLoaded || !window.Pi || !window.Pi.payments) {
      setMessage("❌ Pi SDK ještě není načtený.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      window.Pi.payments.requestPayment({
        productId: service.id,
        amount: service.price,
        onReadyForServerApproval: async (payment) => {
          const paymentId = payment.paymentID;
          setLastPaymentId(paymentId);

          try {
            const approveRes = await fetch("/api/pi/approvePayment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId, service }),
            });
            const approveData = await approveRes.json();
            if (!approveRes.ok) throw new Error(JSON.stringify(approveData));

            const completeRes = await fetch("/api/pi/completePayment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId }),
            });
            const completeData = await completeRes.json();
            if (!completeRes.ok) throw new Error(JSON.stringify(completeData));

            setMessage(
              `✅ Payment approved & completed!\nPayment ID: ${paymentId}\nSubscription ID: ${completeData.subscription.id}`
            );
          } catch (err) {
            console.error("Server error:", err);
            setMessage("❌ Chyba serveru: " + err.message);
          } finally {
            setLoading(false);
          }
        },
        onCancel: () => {
          setMessage("❌ Platba zrušena uživatelem.");
          setLoading(false);
        },
        onError: (err) => {
          console.error("Pi SDK error:", err);
          setMessage("❌ Chyba Pi SDK: " + JSON.stringify(err));
          setLoading(false);
        },
      });
    } catch (err) {
      console.error("Unhandled error:", err);
      setMessage("❌ Neočekávaná chyba: " + err.message);
      setLoading(false);
    }
  };

  const handlePiRefund = async () => {
    if (!lastPaymentId) return setMessage("❌ Nejprve proveď platbu.");

    setLoading(true);
    setMessage("");

    try {
      const refundRes = await fetch("/api/pi/refundPayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: lastPaymentId }),
      });
      const refundData = await refundRes.json();
      if (!refundRes.ok) throw new Error(JSON.stringify(refundData));

      setMessage(`💸 Payment refunded!\nSubscription deaktivována.`);
    } catch (err) {
      console.error("Refund error:", err);
      setMessage("❌ Chyba refundu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-50 p-6">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold mb-4 text-blue-700">{service.name}</h1>
        <p className="text-gray-700 mb-2">{service.price} Pi / měsíc</p>
        <p className="whitespace-pre-line mb-6 text-gray-600">{service.description}</p>

        <button
          onClick={handlePiApproveComplete}
          disabled={loading || !sdkLoaded}
          className="px-6 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform mr-3"
        >
          {loading ? "Probíhá..." : "Subscribe & Pay (Pi SDK)"}
        </button>

        <button
          onClick={handlePiRefund}
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
