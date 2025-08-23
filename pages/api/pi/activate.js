// pages/api/activate.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { subscriptionId, teacherWallet } = req.body;
  if (!subscriptionId || !teacherWallet)
    return res.status(400).json({ error: "Missing subscriptionId or teacherWallet" });

  try {
    // 1️⃣ Update subscription status
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .update({ status: "active" })
      .eq("id", subscriptionId)
      .select()
      .single();

    if (subError) throw subError;

    // 2️⃣ Uvolníme platbu z escrow na učitele
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .update({
        payee_id: teacherWallet,
        status: "released"
      })
      .eq("subscription_id", subscriptionId)
      .select()
      .single();

    if (payError) throw payError;

    res.status(200).json({ subscription, payment });
  } catch (err) {
    console.error("Activate subscription error:", err);
    res.status(500).json({ error: err.message });
  }
}
