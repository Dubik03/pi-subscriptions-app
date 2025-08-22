// pages/api/pi/completePayment.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { paymentId, txid, studentId, teacherId, planName } = req.body;
  if (!paymentId || !txid || !studentId || !teacherId)
    return res
      .status(400)
      .json({ error: "Missing paymentId, txid, studentId or teacherId" });

  try {
    const PI_API_KEY = process.env.PI_API_KEY;
    if (!PI_API_KEY) throw new Error("Missing PI_API_KEY in environment");

    console.log("✅ Starting completePayment for paymentId:", paymentId);

    // 1️⃣ Zavoláme Pi API /complete
    console.log("🌐 Calling Pi API /complete with txid:", txid);
    const completeRes = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      }
    );

    const completeData = await completeRes.json();

    // 🪙 Log peněženek
    const payerWallet =
      completeData?.payer?.wallet_address ||
      completeData?.from_address ||
      "unknown";
    const developerWallet =
      completeData?.developer?.wallet_address ||
      completeData?.to_address ||
      "unknown";

    console.log("📥 Pi API /complete response:", completeData);
    console.log(
      `💸 Payment flow: ${payerWallet}  --->  ${developerWallet} (amount: ${completeData?.amount})`
    );

    if (!completeRes.ok) {
      console.error("❌ Pi API Complete error:", completeData);
      return res
        .status(400)
        .json({ error: completeData.error || "Pi complete failed" });
    }

    // 2️⃣ Vytvoříme subscription
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    console.log("📝 Creating subscription in Supabase...");
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert([
        {
          user_id: studentId,
          teacher_id: teacherId,
          plan_name: planName || "Pi subscription",
          pi_amount: completeData.amount,
          end_date: endDate.toISOString().split("T")[0],
        },
      ])
      .select()
      .single();

    if (subError) {
      console.error("❌ Supabase subscription insert error:", subError);
      throw subError;
    }
    console.log("✅ Subscription created:", subscription);

    // 3️⃣ Update payment → released + wallet adresy
    console.log("📝 Updating payment record in Supabase...");
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .update({
        status: "released",
        subscription_id: subscription.id,
        txid,
        from_wallet: payerWallet,
        to_wallet: developerWallet,
      })
      .eq("pi_payment_id", paymentId)
      .select()
      .single();

    if (payError) {
      console.error("❌ Supabase payment update error:", payError);
      throw payError;
    }
    console.log("✅ Payment updated:", payment);

    // 4️⃣ Update user's wallet address pokud ještě není uložená
    console.log("🔄 Updating user's wallet address if missing...");
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ wallet_address: payerWallet })
      .eq("id", studentId)
      .is("wallet_address", null);

    if (userUpdateError) {
      console.error("⚠️ Failed to update user wallet address:", userUpdateError);
    } else {
      console.log("✅ User wallet address updated (if it was missing).");
    }

    res.status(200).json({ subscription, payment, pi: completeData });
  } catch (err) {
    console.error("🔥 completePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
