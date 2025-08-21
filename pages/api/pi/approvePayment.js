import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { paymentId, service, studentId } = req.body;
    if (!paymentId || !service || !studentId) return res.status(400).json({ error: "Missing data" });

    const PI_API_KEY = process.env.PI_API_KEY;

    // --- approve sandbox/real payment ---
    const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: { "Authorization": `Key ${PI_API_KEY}`, "Content-Type": "application/json" },
    });

    const approveData = await approveRes.json();
    if (!approveRes.ok) return res.status(400).json({ error: approveData.error || "Pi approve failed" });

    // --- uložíme escrow payment do payments ---
    const { data, error } = await supabase
      .from("payments")
      .insert([
        {
          pi_payment_id: paymentId,
          payer_id: studentId,
          payee_id: "22222222-2222-2222-2222-222222222222",
          pi_amount: service.price,
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
