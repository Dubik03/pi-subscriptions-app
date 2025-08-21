// pages/api/pi/approvePayment.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { paymentId, service } = req.body;
  if (!paymentId || !service) return res.status(400).json({ error: "Missing paymentId or service" });

  if (!paymentId || !service) {
    return res.status(400).json({ error: "Missing paymentId or service" });
  }

  try {
    // ------------------------
    // 1️⃣ Volání Pi API pro approval
    // ------------------------
    const PI_API_KEY = process.env.PI_API_KEY;
    if (!PI_API_KEY) {
      throw new Error("Missing PI_API_KEY in env");
    }

    // 🔑 Volání Pi SDK approve
    const approveRes = await fetch("https://api.minepi.com/v2/payments/approve", {
    const response = await fetch("https://api.pi.io/v1/payments/approve", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PI_API_KEY}`,
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PI_API_KEY}`,
      },
      body: JSON.stringify({
        paymentId,
        amount: service.price,
        currency: "PI",
        description: `Subscription: ${service.name}`,
      }),
    });

    const approveData = await approveRes.json();
    if (!approveRes.ok) throw new Error(JSON.stringify(approveData));
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Pi API error: ${response.status} ${errText}`);
    }

    const piData = await response.json();

    // Vložení do Supabase
    const studentId = "11111111-1111-1111-1111-111111111111";
    const teacherId = "22222222-2222-2222-2222-222222222222";
    // ------------------------
    // 2️⃣ Uložit do Supabase
    // ------------------------
    const studentId = "11111111-1111-1111-1111-111111111111"; // placeholder
    const teacherId = "22222222-2222-2222-2222-222222222222"; // placeholder

    const { data, error } = await supabase
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert([{
        id: paymentId,
        payer_id: studentId,
        payee_id: teacherId,
        pi_amount: service.price,
        status: "pending",
      }])
      .insert([
        {
          id: paymentId,
          payer_id: studentId,
          payee_id: teacherId,
          pi_amount: service.price,
          status: "pending", // zatím approved v Pi, ale u nás pending
        },
      ])
      .select()
      .single();

    if (error) throw error;
    if (payError) throw payError;

    res.status(200).json({ payment: data, approveData });
    res.status(200).json({ ok: true, piData, payment });
  } catch (err) {
    console.error("Pi Approve error:", err);
    console.error("ApprovePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
