// pages/api/pi/approvePayment.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { paymentId, service } = req.body;

  if (!paymentId || !service) {
    return res.status(400).json({ error: "Missing paymentId or service" });
  }

  try {
    // ------------------------
    // 1️⃣ Volání Pi API pro approval
    // ------------------------
    const PI_API_KEY = process.env.PI_API_KEY;
    if (!PI_API_KEY) {
      throw new Error("Missing PI_API_KEY in environment variables");
    }

    const approveURL = `https://api.minepi.com/v2/payments/${paymentId}/approve`;

    const response = await fetch(approveURL, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}), // Pi API approve endpoint může vyžadovat prázdný JSON
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Pi API error: ${response.status} ${errText}`);
    }

    const piData = await response.json();

    // ------------------------
    // 2️⃣ Uložit do Supabase
    // ------------------------
    // TODO: nahraďte skutečnými ID uživatele a příjemce
    const studentId = "11111111-1111-1111-1111-111111111111";
    const teacherId = "22222222-2222-2222-2222-222222222222";

    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert([
        {
          id: paymentId,
          payer_id: studentId,
          payee_id: teacherId,
          pi_amount: service.price,
          status: "approved",
        },
      ])
      .select()
      .single();

    if (payError) throw payError;

    res.status(200).json({ ok: true, piData, payment });
  } catch (err) {
    console.error("ApprovePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
