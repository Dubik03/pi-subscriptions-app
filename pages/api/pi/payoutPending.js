// /pages/api/pi/payoutPending.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  const debug = [];

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", debug });
  }

  const { paymentId, txId } = req.body;

  if (!paymentId) {
    debug.push("❌ Missing paymentId");
    return res.status(400).json({ error: "Missing paymentId", debug });
  }

  if (!txId) {
    debug.push("❌ Missing txId");
    return res.status(400).json({ error: "Missing txId", debug });
  }

  try {
    // 1️⃣ Načteme platbu z DB
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, pi_amount, payee_id, status")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      debug.push(`❌ Payment not found: ${paymentError?.message}`);
      return res.status(404).json({ error: "Payment not found", debug });
    }

    if (payment.status !== "released") {
      debug.push(`⚠️ Payment is not in 'released' status`);
      return res.status(400).json({ error: "Payment not ready for completion", debug });
    }

    // 2️⃣ Ověření u Pi serveru
    // Zde bys měl zavolat Pi /complete endpoint s txId, ale pro test můžeme jen logovat
    debug.push(`📌 Completing payment ${paymentId} with TxID ${txId}`);

    // 3️⃣ Aktualizace DB: označit jako completed
    const now = new Date().toISOString();
    const { data: updatedPayment, error: updateError } = await supabase
      .from("payments")
      .update({ status: "completed", paid_at: now, tx_id: txId })
      .eq("id", paymentId)
      .select()
      .single();

    if (updateError) {
      debug.push(`❌ Failed to update payment: ${updateError.message}`);
      return res.status(500).json({ error: updateError.message, debug });
    }

    debug.push(`✅ Payment ${paymentId} marked as completed`);

    res.status(200).json({ payment: updatedPayment, debug });
  } catch (err) {
    console.error("🔥 Payout error:", err);
    debug.push(`🔥 Server error: ${err.message}`);
    res.status(500).json({ error: err.message, debug });
  }
}
