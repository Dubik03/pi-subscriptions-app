// pages/api/pi/completePayment.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { paymentId, txid, studentId, teacherId, planName } = req.body;
  if (!paymentId || !txid || !studentId || !teacherId)
    return res
      .status(400)
      .json({ error: "Missing paymentId, txid, studentId or teacherId" });

  try {
    const PI_API_KEY = process.env.PI_API_KEY;

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
      console.error("Pi API Complete error:", completeData);
      return res
        .status(400)
        .json({ error: completeData.error || "Pi complete failed" });
    }

    // 2️⃣ Vytvoříme subscription
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert([
        {
          user_id: studentId,
          teacher_id: teacherId,
          plan_name: planName || "Pi subscription",
          pi_amount: completeData.amount,
          end_date: endDate.toISOString().split("T")[0],
        },
      ])
      .select()
      .single();

    if (subError) throw subError;

    // 3️⃣ Update payment → released
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .update({
        status: "released",
        subscription_id: subscription.id,
        txid,
      })
      .eq("pi_payment_id", paymentId)
      .select()
      .single();

    if (payError) throw payError;

    res.status(200).json({ subscription, payment, pi: completeData });
  } catch (err) {
    console.error("completePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
