// pages/api/activate.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  const debug = []; // sběr logů

  if (req.method !== "POST") {
    debug.push("❌ Method not allowed");
    return res.status(405).json({ error: "Method not allowed", debug });
  }

  const { subscriptionId, teacherWallet } = req.body;

  if (!subscriptionId || !teacherWallet) {
    debug.push("❌ Missing subscriptionId or teacherWallet");
    return res.status(400).json({ error: "Missing subscriptionId or teacherWallet", debug });
  }

  try {
    debug.push(`🔹 Starting activate for subscriptionId=${subscriptionId}`);

    // 1️⃣ Update subscription status
    debug.push("➡️ Updating subscription status to 'active'...");
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

    // 2️⃣ Fetch all payments before update
    debug.push("➡️ Fetching all payments for this subscription...");
    const { data: paymentsBefore, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("subscription_id", subscriptionId);

    if (fetchError) {
      debug.push(`⚠️ Error fetching payments: ${fetchError.message}`);
    } else {
      debug.push(`📄 Payments before release: ${JSON.stringify(paymentsBefore, null, 2)}`);
    }

    // 3️⃣ Update all payments for this subscription
    debug.push("➡️ Releasing all payments from escrow to teacherWallet...");
    const { data: paymentsAfter, error: payError } = await supabase
      .from("payments")
      .update({
        status: "released",
        payee_id: teacherWallet
      })
      .eq("subscription_id", subscriptionId)
      .select(); // získáme pole všech paymentů

    if (payError) {
      debug.push(`❌ Payment update error: ${payError.message}`);
      throw payError;
    }

    if (!paymentsAfter || paymentsAfter.length === 0) {
      debug.push("⚠️ No payments found for this subscription!");
    } else {
      debug.push(`✅ Payments released successfully: ${paymentsAfter.length} payment(s) updated`);
      debug.push(`📄 Payments after release: ${JSON.stringify(paymentsAfter, null, 2)}`);
    }

    // 📤 Response do frontendu
    res.status(200).json({ subscription, payments: paymentsAfter, debug });
  } catch (err) {
    debug.push(`🔥 Activate subscription error: ${err.message}`);
    res.status(500).json({ error: err.message, debug });
  }
}
