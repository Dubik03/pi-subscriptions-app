// pages/api/pi/refundPayment.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { paymentId, refundTxid } = req.body;
  if (!paymentId || !refundTxid) return res.status(400).json({ error: "Missing paymentId or refundTxid" });

  try {
    // 1️⃣ Refund v tabulce payments
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .update({ status: "refunded", refund_txid: refundTxid })
      .eq("id", paymentId)
      .select()
      .single();

    if (payError) throw payError;

    // 2️⃣ Deaktivace subscription
    if (payment.subscription_id) {
      const { error: subError } = await supabase
        .from("subscriptions")
        .update({ active: false })
        .eq("id", payment.subscription_id);

      if (subError) throw subError;
    }

    res.status(200).json({ payment });
  } catch (err) {
    console.error("refundPayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
