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
    debug.push(`🔹 Activating payments for subscriptionId=${subscriptionId}...`);

    const { data, error, count } = await supabase
      .from("payments")
      .update({ status: "released" })
      .eq("subscription_id", subscriptionId)
      .select("*", { count: "exact" });

    if (error) {
      debug.push(`❌ Payment update error: ${error.message}`);
      throw error;
    }

    debug.push(`✅ Payments updated successfully. Rows affected: ${count}`);

    res.status(200).json({ payments: data, debug });
  } catch (err) {
    debug.push(`🔥 Activate subscription error: ${err.message}`);
    res.status(500).json({ error: err.message, debug });
  }
}
