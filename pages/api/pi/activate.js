import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  const debug = [];

  if (req.method !== "POST") {
    debug.push("❌ Method not allowed");
    return res.status(405).json({ error: "Method not allowed", debug });
  }

  const { subscriptionId } = req.body;

  if (!subscriptionId) {
    debug.push("❌ Missing subscriptionId");
    return res.status(400).json({ error: "Missing subscriptionId", debug });
  }

  try {
    debug.push(`🔹 Activating subscription and payments for subscriptionId=${subscriptionId}...`);

    // 1️⃣ Aktualizace statusu subscription na "active"
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
    debug.push("✅ Subscription updated to active");

    // 2️⃣ Uvolnění všech payments (status = "released") s timestampem
    const now = new Date().toISOString();
    const { data: payments, error: payError, count } = await supabase
      .from("payments")
      .update({
        status: "released",
        escrow_release_date: now // aktuální datum a čas
      })
      .eq("subscription_id", subscriptionId)
      .neq("status", "released")
      .select("*", { count: "exact" });

    if (payError) {
      debug.push(`❌ Payments update error: ${payError.message}`);
      throw payError;
    }

    debug.push(`✅ Payments released successfully. Rows affected: ${count}`);

    res.status(200).json({ subscription, payments, debug });
  } catch (err) {
    debug.push(`🔥 Activate subscription error: ${err.message}`);
    res.status(500).json({ error: err.message, debug });
  }
}
