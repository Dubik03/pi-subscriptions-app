// pages/service/[id].tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function ServiceDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Dynamické načtení Pi SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.minepi.com/pi-sdk.js";
    script.async = true;
    script.onload = () => {
      if (window.Pi) {
        window.Pi.init({ version: "2.0", sandbox: true }); // sandbox: false v produkci
        setSdkLoaded(true);
        console.log("Pi SDK initialized");
      }
    };
    script.onerror = () => console.error("Failed to load Pi SDK");
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    if (!sdkLoaded) return alert("Pi SDK ještě není načtený.");

    try {
      // Vytvoření platby přes Pi SDK
      const payment = await window.Pi.createPayment({
        amount: 1.5, // cena služby
        memo: "Subscription Example",
      });

      console.log("Payment created:", payment);

      // Po vytvoření platby pošli ID na server pro schválení
      const res = await fetch("/api/pi/approvePayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id, service: { price: 1.5, name: "Example" } }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));

      console.log("Server response:", data);
      alert("Payment approved & recorded!");
    } catch (err) {
      console.error(err);
      alert("Chyba při platbě: " + err.message);
    }
  };

  return (
    <div>
      <h1>Service Detail {id}</h1>
      <button onClick={handlePayment} disabled={!sdkLoaded}>
        Pay with Pi
      </button>
    </div>
  );
}
