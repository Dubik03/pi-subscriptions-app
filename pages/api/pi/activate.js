// pages/api/activate.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { subscriptionId, teacherWallet } = req.body;
  if (!subscriptionId || !teacherWallet)
    return res.status(400).json({ error: "Missing subscriptionId or teacherWallet" });

  const debug = []; // sběr logů

  try {
    debug.push(`🔹 Starting activate for subscriptionId=${subscriptionId}`);

    // 1️⃣ Update subscription status
    debug.push("➡️ Updating subscription status to active...");
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .update({ status: "active" })
      .eq("id", subscriptionId)
      .select()
      .single();

    if (subError) {
      debug.push(`❌ Subscription update error: ${subError.message}`);
      throw subError;
    }
    debug.push("✅ Subscription updated successfully");

    // 2️⃣ Uvolníme platbu z escrow na učitele
    debug.push("➡️ Releasing payment from escrow...");
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .update({
        status: "released",
      })
      .eq("subscription_id", subscriptionId)
      .select()
      .single();

    if (payError) {
      debug.push(`❌ Payment update error: ${payError.message}`);
      throw payError;
    }

    if (!payment) {
      debug.push("⚠️ No payment found for this subscription!");
    } else {
      debug.push("✅ Payment released successfully");
    }

    // 📤 Response do frontendu
    res.status(200).json({ subscription, payment, debug });
  } catch (err) {
    debug.push(`🔥 Activate subscription error: ${err.message}`);
    res.status(500).json({ error: err.message, debug });
  }
}
