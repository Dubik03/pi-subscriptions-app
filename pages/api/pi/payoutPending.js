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
      .select("id, pi_amount, payee_id")
      .eq("status", "released")
      .is("paid_at", null); // ještě nevyplaceno

    if (payError) throw payError;
    if (!payments || payments.length === 0) {
      debug.push("⚠️ No payments to payout");
      return res.status(200).json({ debug, payouts: [] });
    }

    debug.push(`📌 Found ${payments.length} payments to payout`);

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

      // 3️⃣ Zavoláme Pi API pro převod
      const PI_API_KEY = process.env.PI_API_KEY;
      const transferRes = await fetch("https://api.minepi.com/v2/transfers", {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to_address: walletAddress,
          amount: p.pi_amount,
          memo: `Payment ${p.id} payout`,
        }),
      });

      const transferData = await transferRes.json();
      if (!transferRes.ok) {
        debug.push(`❌ Transfer failed for payment ${p.id}: ${transferData.error}`);
        continue;
      }

      // 4️⃣ Aktualizujeme payment jako vyplacenou
      const now = new Date().toISOString();
      const { data: updatedPayment, error: updateError } = await supabase
        .from("payments")
        .update({ status: "completed", paid_at: now })
        .eq("id", p.id)
        .select()
        .single();

      if (updateError) {
        debug.push(`⚠️ Failed to update payment ${p.id}: ${updateError.message}`);
        continue;
      }

      payouts.push({ paymentId: p.id, transfer: transferData });
    }

    res.status(200).json({ payouts, debug });
  } catch (err) {
    console.error("🔥 Payout error:", err);
    res.status(500).json({ error: err.message, debug });
  }
}
