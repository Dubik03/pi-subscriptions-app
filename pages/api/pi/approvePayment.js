// pages/api/pi/approvePayment.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { paymentId, service, studentId, teacherId } = req.body;
    if (!paymentId || !service || !studentId || !teacherId) {
      return res.status(400).json({ error: "Missing params" });
    }

    const PI_API_KEY = process.env.PI_API_KEY;
    if (!PI_API_KEY) throw new Error("Missing PI_API_KEY in environment");

    // 1️⃣ Zavoláme Pi API /approve
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
    if (!approveRes.ok) {
      console.error("Pi API Approve error:", approveData);
      return res
        .status(400)
        .json({ error: approveData.error || "Pi approve failed" });
    }

    // 2️⃣ Uložíme do Supabase payments
    const { data, error } = await supabase
      .from("payments")
      .insert([
        {
          pi_payment_id: paymentId,
          payer_id: studentId,
          payee_id: teacherId,
          pi_amount: service?.price || approveData.amount,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ payment: data, pi: approveData });
  } catch (err) {
    console.error("ApprovePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
