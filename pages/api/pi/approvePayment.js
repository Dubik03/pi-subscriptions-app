// pages/api/pi/approvePayment.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { paymentId, service, studentId, teacherId } = req.body;
  if (!paymentId || !studentId || !teacherId)
    return res.status(400).json({ error: "Missing required params" });

  const PI_API_KEY = process.env.PI_API_KEY;
  if (!PI_API_KEY) return res.status(500).json({ error: "Missing PI_API_KEY" });

  try {
    // 1️⃣ Zavoláme Pi API approve
    const approveRes = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const approveData = await approveRes.json();
    if (!approveRes.ok) return res.status(400).json({ error: approveData.error || "Pi approve failed" });

    // 2️⃣ Update payment na skutečného učitele
    const { data, error } = await supabase
      .from("payments")
      .update({
        status: "approved",
        payee_id: teacherId, // skutečný učitel dostane peníze
      })
      .eq("pi_payment_id", paymentId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // 3️⃣ Update subscription status na active
    await supabase
      .from("subscriptions")
      .update({ status: "active" })
      .eq("id", data.subscription_id);

    res.status(200).json({ payment: data, pi: approveData });
  } catch (err) {
    console.error("🔥 ApprovePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
