// pages/api/pi/activate.js
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

    // 2️⃣ Najdeme všechny payments k subscription
    const { data: paymentsList, error: listError } = await supabase
      .from("payments")
      .select("id, service_id")
      .eq("subscription_id", subscriptionId)
      .neq("status", "released");

    if (listError) {
      debug.push(`❌ Failed to fetch payments: ${listError.message}`);
      throw listError;
    }

    debug.push(`📌 Found ${paymentsList.length} payments to release.`);

    const now = new Date().toISOString();
    const releasedPayments = [];

    // 3️⃣ Každou platbu updatneme se správným payee_id
    for (const p of paymentsList) {
      // najdeme service → owner_id
      const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("owner_id")
        .eq("id", p.service_id)
        .single();

      if (serviceError) {
        debug.push(`⚠️ Failed to fetch service for payment ${p.id}: ${serviceError.message}`);
        continue; // přeskočíme, ale ostatní platby se zpracují
      }

      // update payment
      const { data: updatedPayment, error: payError } = await supabase
        .from("payments")
        .update({
          status: "released",
          escrow_release_date: now,
          payee_id: service.owner_id,
        })
        .eq("id", p.id)
        .select()
        .single();

      if (payError) {
        debug.push(`❌ Payment update error (id=${p.id}): ${payError.message}`);
        continue;
      }

      releasedPayments.push(updatedPayment);
    }

    debug.push(`✅ Payments released successfully. Count: ${releasedPayments.length}`);

    res.status(200).json({ subscription, payments: releasedPayments, debug });
  } catch (err) {
    debug.push(`🔥 Activate subscription error: ${err.message}`);
    res.status(500).json({ error: err.message, debug });
  }
}
