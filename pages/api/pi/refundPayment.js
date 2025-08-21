import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { paymentId, refundTxid } = req.body;
  if (!paymentId || !refundTxid) return res.status(400).json({ error: "Missing paymentId or refundTxid" });

  try {
    const PI_API_KEY = process.env.PI_API_KEY;

    // 🔑 Volání Pi SDK refund
    const refundRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid: refundTxid }),
    });

    const refundData = await refundRes.json();
    if (!refundRes.ok) throw new Error(JSON.stringify(refundData));

    // Update payment na refunded
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .update({ status: "refunded", refund_txid: refundTxid })
      .eq("id", paymentId)
      .select()
      .single();
    if (payError) throw payError;

    // Zrušení subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .update({ active: false })
      .eq("id", payment.subscription_id)
      .select()
      .single();
    if (subError) console.warn("Subscription not found or already inactive");

    res.status(200).json({ ok: true, payment, refundData, subscription });
  } catch (err) {
    console.error("refundPayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
