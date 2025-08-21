import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { paymentId, txid } = req.body;
  if (!paymentId || !txid) {
    return res.status(400).json({ error: "Missing paymentId or txid" });
  }

  try {
    console.log("Complete Payment (mock):", paymentId, txid);

    // 1. Vytvořit subscription (student/teacher hardcodnuto zatím)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert([
        {
          user_id: "11111111-1111-1111-1111-111111111111",
          teacher_id: "22222222-2222-2222-2222-222222222222",
          plan_name: "Plan přes Pi",
          pi_amount: 2,
          end_date: endDate.toISOString().split("T")[0],
        },
      ])
      .select()
      .single();

    if (subError) throw subError;

    // 2. Update payment na released a přidat subscription_id a txid
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .update({ status: "released", subscription_id: subscription.id, txid })
      .eq("id", paymentId)
      .select()
      .single();

    if (payError) throw payError;

    res.status(200).json({ ok: true, subscription, payment });
  } catch (err) {
    console.error("completePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
