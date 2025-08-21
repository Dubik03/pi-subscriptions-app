// pages/api/pi/approvePayment.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { paymentId, service } = req.body;

    // testovací UUID (dokud nebude Pi login)
    const studentId = "11111111-1111-1111-1111-111111111111";
    const teacherId = "22222222-2222-2222-2222-222222222222";

    const { data, error } = await supabase
      .from("payments")
      .insert([
        {
          id: paymentId,
          payer_id: studentId,
          payee_id: teacherId,
          pi_amount: service.price,
          status: "pending", // ✅ musí být pending kvůli check constraint
        },
      ])
      .select()
      .single();

    if (error) throw error;

    console.log("Payment approved (mock):", data);

    res.status(200).json({ payment: data });
  } catch (err) {
    console.error("ApprovePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
