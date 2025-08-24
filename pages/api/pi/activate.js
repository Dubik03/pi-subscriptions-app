// pages/api/pi/activate.js
import { supabase } from "../../../lib/supabase";

const SEND_PAYOUTS = true; // true = posílat hned, false = pouze označit jako released

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
    debug.push(`🔹 Activating subscription ${subscriptionId}...`);

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

    // 2️⃣ Najdeme všechny payments k subscription, které ještě nejsou uvolněné
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

    // 3️⃣ Aktualizujeme každou platbu: status = released, escrow_release_date, payee_id
    for (const payment of paymentsList) {
      const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("owner_id")
        .eq("id", payment.service_id)
        .single();

      if (serviceError || !service) {
        debug.push(`⚠️ Failed to fetch service for payment ${payment.id}: ${serviceError?.message}`);
        continue;
      }

      const { data: updatedPayment, error: payError } = await supabase
        .from("payments")
        .update({
          status: "released",
          escrow_release_date: now,
          payee_id: service.owner_id,
        })
        .eq("id", payment.id)
        .select()
        .single();

      if (payError) {
        debug.push(`❌ Payment update error (id=${payment.id}): ${payError.message}`);
        continue;
      }

      // Přidáme payoutResult k aktualizované platbě
      let payoutResult = null;

      if (SEND_PAYOUTS) {
        try {
          const payoutRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/pi/payoutPending`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId: updatedPayment.id }),
          });
          payoutResult = await payoutRes.json();
          debug.push(`💸 Payout attempted for payment ${updatedPayment.id}: ${JSON.stringify(payoutResult)}`);
        } catch (err) {
          debug.push(`⚠️ Payout error for payment ${updatedPayment.id}: ${err.message}`);
        }
      }

      releasedPayments.push({ ...updatedPayment, payoutResult });
    }

    debug.push(`✅ Payments released successfully. Count: ${releasedPayments.length}`);

    res.status(200).json({ subscription, payments: releasedPayments, debug });
  } catch (err) {
    debug.push(`🔥 Activate subscription error: ${err.message}`);
    res.status(500).json({ error: err.message, debug });
  }
}
