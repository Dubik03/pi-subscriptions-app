import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { paymentId, refundTxid } = req.body;
  if (!paymentId || !refundTxid) {
    return res.status(400).json({ error: "Missing paymentId or refundTxid" });
  }

  try {
    console.log("Refund Payment (mock):", paymentId, refundTxid);

    // Update payment na refunded a přidat refundTxid
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .update({ status: "refunded", refund_txid: refundTxid })
      .eq("id", paymentId)
      .select()
      .single();

    if (payError) throw payError;

    res.status(200).json({ ok: true, payment });
  } catch (err) {
    console.error("refundPayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
