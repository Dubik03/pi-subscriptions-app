// pages/api/activate.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { subscriptionId, teacherWallet } = req.body;
  if (!subscriptionId || !teacherWallet)
    return res
      .status(400)
      .json({ error: "Missing subscriptionId or teacherWallet" });

  try {
    console.log("🔄 Activating subscription:", subscriptionId);
    console.log("👨‍🏫 Teacher wallet to release to:", teacherWallet);

    // 1️⃣ Update subscription status
    console.log("📝 Updating subscription status -> active");
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .update({ status: "active" })
      .eq("id", subscriptionId)
      .select()
      .single();

    if (subError) {
      console.error("❌ Failed to update subscription:", subError);
      throw subError;
    }
    console.log("✅ Subscription activated:", subscription);

    // 2️⃣ Uvolníme platbu z escrow na učitele
    console.log("📝 Releasing payment from escrow -> teacher");
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .update({
        payee_id: teacherWallet,
        status: "released",
      })
      .eq("subscription_id", subscriptionId)
      .select()
      .single();

    if (payError) {
      console.error("❌ Failed to release payment:", payError);
      throw payError;
    }

    if (!payment) {
      console.warn("⚠️ No payment found for subscription:", subscriptionId);
    } else {
      console.log("✅ Payment released:", payment);
    }

    res.status(200).json({ subscription, payment });
  } catch (err) {
    console.error("🔥 Activate subscription error:", err);
    res.status(500).json({ error: err.message });
  }
}
