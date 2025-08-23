// pages/api/pi/completePayment.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { paymentId, txid, studentId, serviceId, planName } = req.body;
  if (!paymentId || !txid || !studentId || !serviceId)
    return res
      .status(400)
      .json({ error: "Missing paymentId, txid, studentId or serviceId" });

  try {
    const PI_API_KEY = process.env.PI_API_KEY;
    if (!PI_API_KEY) throw new Error("Missing PI_API_KEY in environment");

    console.log("✅ Starting completePayment for paymentId:", paymentId);

    // 1️⃣ Zavoláme Pi API /complete
    const completeRes = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      }
    );
    const completeData = await completeRes.json();

    if (!completeRes.ok) {
      console.error("❌ Pi API Complete error:", completeData);
      return res
        .status(400)
        .json({ error: completeData.error || "Pi complete failed" });
    }

    // 🪙 Wallety
    const payerWallet =
      completeData?.payer?.wallet_address ||
      completeData?.from_address ||
      "unknown";
    const developerWallet =
      completeData?.developer?.wallet_address ||
      completeData?.to_address ||
      "unknown";

    // 2️⃣ Najdeme službu (kdo je owner)
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, owner_id, price, name")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      console.error("Service fetch error:", serviceError);
      return res.status(404).json({ error: "Service not found" });
    }

    // 3️⃣ Vytvoříme subscription
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert([
        {
          user_id: studentId,
          service_id: service.id,
          teacher_id: service.owner_id,
          plan_name: planName || service.name,
          pi_amount: completeData.amount,
          end_date: endDate.toISOString().split("T")[0],
          status: "pending",
        },
      ])
      .select()
      .single();

    if (subError) throw subError;

    // 4️⃣ Update payment
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .update({
        status: "pending",
        subscription_id: subscription.id,
        txid,
        from_wallet: payerWallet,
        to_wallet: developerWallet,
      })
      .eq("pi_payment_id", paymentId)
      .select()
      .single();

    if (payError) throw payError;

    // 5️⃣ Update wallet uživatele
    await supabase
      .from("users")
      .update({ wallet_address: payerWallet })
      .eq("id", studentId);

    res.status(200).json({ subscription, payment, pi: completeData });
  } catch (err) {
    console.error("🔥 completePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
