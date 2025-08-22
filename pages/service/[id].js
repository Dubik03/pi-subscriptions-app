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
  const [Pi, setPi] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const initPi = () => {
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
      };
      initPi();
    }
  }, []);

  if (!service) return <p className="text-center mt-10 text-red-500">Service not found</p>;

  const handleSubscribe = async () => {
    if (!Pi) {
      setMessage("Pi SDK not loaded yet");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // 1️⃣ Autentizace Pi
      const auth = await Pi.authenticate(["payments"]);
      const piUser = auth.user;
      console.log("🔑 Pi Auth User:", piUser);

      // fallbacky pro sandbox
      const uid = piUser?.uid;
      const username = piUser?.username || "guest_" + Date.now();
      const wallet =
        piUser?.wallet?.address ||
        piUser?.wallet_address ||
        "sandbox-wallet-" + Date.now();

      if (!uid) throw new Error("Missing uid from Pi Auth");

      // 2️⃣ Sync user do Supabase
      const userRes = await fetch("/api/pi/syncUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pi_uid: uid, username, wallet_address: wallet }),
      });
      const userData = await userRes.json();
      if (userData.error) throw new Error(userData.error);
      const userId = userData.id;

      // 3️⃣ Vytvoření platby přes Pi SDK
      await Pi.createPayment(
        {
          amount: service.price,
          memo: service.name,
          metadata: {
            planName: service.name,
            studentId: userId,
            teacherId: "22222222-2222-2222-2222-222222222222",
          },
        },
        {
          onReadyForServerApproval: async (paymentId) => {
            setMessage(`Payment ready for approval: ${paymentId}`);
            const res = await fetch("/api/pi/approvePayment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId, service, studentId: userId }),
            });
            const data = await res.json();
            if (data.error) setMessage("Approve error: " + data.error);
            else setMessage(`Payment approved and stored! Payment ID: ${paymentId}`);
          },

          onReadyForServerCompletion: async (paymentId, txid) => {
            setMessage(`Completing payment: ${paymentId}, txid: ${txid}`);
            const res = await fetch("/api/pi/completePayment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId,
                txid,
                studentId: userId,
                teacherId: "22222222-2222-2222-2222-222222222222",
                planName: service.name,
              }),
            });
            const data = await res.json();
            if (data.error) setMessage("Complete error: " + data.error);
            else setMessage(`Payment completed! Subscription ID: ${data.subscription.id}`);
          },

          onCancel: () => setMessage("Payment canceled by user"),
          onError: (err) => setMessage("Payment error: " + err.message),
        }
      );
    } catch (err) {
      setMessage("Error: " + err.message);
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
          onClick={handleSubscribe}
          disabled={loading}
          className="px-6 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-xl shadow hover:scale-105 transform transition-transform mr-3"
        >
          {loading ? "Probíhá..." : "Subscribe Now"}
        </button>

        <p className="mt-3 text-yellow-700">
          ⚠️ Sandbox režim je aktivní – můžete testovat v běžném prohlížeči.
        </p>

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
