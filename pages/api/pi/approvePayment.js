// pages/api/pi/approvePayment.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { paymentId, service } = req.body;

  if (!paymentId || !service) {
    return res.status(400).json({ error: "Missing paymentId or service data" });
  }

  try {
    // 🔑 Tady by mělo být volání Pi API k ověření (zkráceně jen mock)
    console.log("Approve Payment, paymentId:", paymentId);

    // Zatím jen uložíme pending platbu do DB
    const { data: payment, error } = await supabase
      .from("payments")
      .insert([
        {
          subscription_id: null, // zatím null, vytvoříme až při completion
          payer_id: "pi-user-placeholder", // později získáme z Pi API
          payee_id: "22222222-2222-2222-2222-222222222222", // učitel
          pi_amount: service.price,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ ok: true, payment });
  } catch (err) {
    console.error("approvePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
