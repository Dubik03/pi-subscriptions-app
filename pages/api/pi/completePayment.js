import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { paymentId, txid } = req.body;
  if (!paymentId || !txid) return res.status(400).json({ error: "Missing paymentId or txid" });

  try {
    const PI_API_KEY = process.env.PI_API_KEY;

    // 1️⃣ Zavolat Pi API /complete
    const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid }),
    });

    const completeData = await completeRes.json();
    if (!completeRes.ok) return res.status(400).json({ error: completeData.error || "Pi complete failed" });

    // 2️⃣ Načteme platbu
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();
    if (payErr || !payment) throw new Error("Payment not found: " + payErr?.message);

    // 3️⃣ Vytvoříme subscription
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const { data: subscription, error: subErr } = await supabase
      .from("subscriptions")
      .insert([{
        user_id: payment.payer_id,
        teacher_id: payment.payee_id,
        plan_name: "Plan přes Pi",
        pi_amount: completeData.amount,
        end_date: endDate.toISOString().split("T")[0],
      }])
      .select()
      .single();
    if (subErr) throw new Error("Subscription insert failed: " + subErr.message);

    // 4️⃣ Aktualizujeme platbu → released
    const { data: updatedPayment, error: updateErr } = await supabase
      .from("payments")
      .update({ status: "released", subscription_id: subscription.id, txid })
      .eq("id", paymentId)
      .select()
      .single();
    if (updateErr) throw updateErr;

    res.status(200).json({ subscription, payment: updatedPayment, pi: completeData });

  } catch (err) {
    console.error("CompletePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
