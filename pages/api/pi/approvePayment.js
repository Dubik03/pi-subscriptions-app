// pages/api/pi/approvePayment.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { paymentId, service, studentId, teacherId } = req.body;
  console.log("ApprovePayment request body:", req.body);

  if (!paymentId || !studentId || !teacherId) {
    return res.status(400).json({ error: "Missing required params" });
  }

  const PI_API_KEY = process.env.PI_API_KEY;
  if (!PI_API_KEY) return res.status(500).json({ error: "Missing PI_API_KEY" });

  try {
    // 1️⃣ Zavoláme Pi API
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
    console.log("Pi API approve response:", approveData);

    if (!approveRes.ok) {
      return res
        .status(400)
        .json({ error: approveData.error || "Pi approve failed" });
    }

    // 2️⃣ Uložíme do Supabase
    const { data, error } = await supabase
      .from("payments")
      .insert([
        {
          pi_payment_id: paymentId,
          payer_id: studentId,
          payee_id: "22222222-2222-2222-2222-222222222222", // escrow účet
          payee_teacher_id: teacherId, // skutečný učitel
          pi_amount: service?.price || approveData.amount,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("Payment inserted into Supabase:", data);

    res.status(200).json({ payment: data, pi: approveData });
  } catch (err) {
    console.error("ApprovePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
