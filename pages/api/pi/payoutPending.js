// /pages/api/pi/payoutPending.js

import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  const debug = [];

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", debug });
  }

  try {
    // 1️⃣ Najdeme všechny platby k vyplacení
    const { data: payments, error: payError } = await supabase
      .from("payments")
      .select("id, pi_amount, payee_id, pi_payment_id, tx_id, status")
      .eq("status", "pending"); // čekají na Payment Request

    if (payError) throw payError;
    if (!payments || payments.length === 0) {
      debug.push("⚠️ No payments to process");
      return res.status(200).json({ debug, payouts: [] });
    }

    debug.push(`📌 Found ${payments.length} payments to process`);

    const payouts = [];

    for (const p of payments) {
      // 2️⃣ Načteme wallet adresu payee
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("wallet_address")
        .eq("id", p.payee_id)
        .single();

      if (userError || !user?.wallet_address) {
        debug.push(`⚠️ Failed to fetch wallet for payee_id ${p.payee_id}`);
        continue;
      }

      const walletAddress = user.wallet_address;

      // 3️⃣ Pokud ještě nemáme PaymentID, vytvoříme Payment Request
      let paymentId = p.payment_id;
      if (!paymentId) {
        // Zde by frontend volal createPayment SDK a poslal PaymentID serveru
        debug.push(`ℹ️ PaymentID missing for payment ${p.id}, frontend musí vytvořit Payment Request`);
        continue;
      }

      // 4️⃣ Server-side approve
      const PI_API_KEY = process.env.PI_API_KEY;
      const approveRes = await fetch("https://api.minepi.com/v2/payments/approve", {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payment_id: paymentId }),
      });

      const approveData = await approveRes.json();
      if (!approveRes.ok) {
        debug.push(`❌ Approval failed for payment ${p.id}: ${approveData.error}`);
        continue;
      }

      debug.push(`✅ Payment ${p.id} approved`);

      // 5️⃣ Pokud máme TxID, dokončíme platbu
      if (p.tx_id) {
        const completeRes = await fetch("https://api.minepi.com/v2/payments/complete", {
          method: "POST",
          headers: {
            Authorization: `Key ${PI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tx_id: p.tx_id }),
        });

        const completeData = await completeRes.json();
        if (!completeRes.ok) {
          debug.push(`❌ Completion failed for payment ${p.id}: ${completeData.error}`);
          continue;
        }

        // 6️⃣ Aktualizujeme stav platby
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("payments")
          .update({ status: "completed", paid_at: now })
          .eq("id", p.id);

        if (updateError) {
          debug.push(`⚠️ Failed to update payment ${p.id}: ${updateError.message}`);
          continue;
        }

        payouts.push({ paymentId: p.id, txId: p.tx_id });
        debug.push(`💰 Payment ${p.id} completed`);
      }
    }

    res.status(200).json({ payouts, debug });
  } catch (err) {
    console.error("🔥 Payout error:", err);
    res.status(500).json({ error: err.message, debug });
  }
}
