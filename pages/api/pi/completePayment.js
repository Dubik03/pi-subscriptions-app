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

    const payerWallet =
      completeData?.payer?.wallet_address ||
      completeData?.from_address ||
      "unknown";
    const escrowWallet = "22222222-2222-2222-2222-222222222222";

    console.log("📥 Pi API /complete response:", completeData);
    console.log(
      `💸 Payment flow: ${payerWallet}  --->  ${escrowWallet} (amount: ${completeData?.amount})`
    );

    if (!completeRes.ok) {
      console.error("❌ Pi API Complete error:", completeData);
      return res
        .status(400)
        .json({ error: completeData.error || "Pi complete failed" });
    }

    // 2️⃣ Vytvoříme subscription s pending
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
          status: "pending",
        },
      ])
      .select()
      .single();

    if (subError) throw subError;
    console.log("✅ Subscription created:", subscription);

    // 3️⃣ Update payment → released + wallet + teacher
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .update({
        status: "released",
        subscription_id: subscription.id,
        txid,
        from_wallet: payerWallet,
        to_wallet: escrowWallet,
        payee_teacher_id: teacherId,
      })
      .eq("pi_payment_id", paymentId)
      .select()
      .single();

    if (payError) throw payError;
    console.log("✅ Payment updated:", payment);

    // 4️⃣ Update student wallet
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ wallet_address: payerWallet })
      .eq("id", studentId);

    if (userUpdateError) console.error("⚠️ Failed to update user wallet:", userUpdateError);

    res.status(200).json({ subscription, payment, pi: completeData });
  } catch (err) {
    console.error("🔥 completePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}

// pages/api/pi/approvePayment.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { paymentId, service, studentId, teacherId } = req.body;
  if (!paymentId || !studentId || !teacherId)
    return res.status(400).json({ error: "Missing required params" });

  const PI_API_KEY = process.env.PI_API_KEY;
  if (!PI_API_KEY) return res.status(500).json({ error: "Missing PI_API_KEY" });

  try {
    // 1️⃣ Zavoláme Pi API approve
    const approveRes = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const approveData = await approveRes.json();
    if (!approveRes.ok) return res.status(400).json({ error: approveData.error || "Pi approve failed" });

    // 2️⃣ Update payment na skutečného učitele
    const { data, error } = await supabase
      .from("payments")
      .update({
        status: "approved",
        payee_id: teacherId, // skutečný učitel dostane peníze
      })
      .eq("pi_payment_id", paymentId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // 3️⃣ Update subscription status na active
    await supabase
      .from("subscriptions")
      .update({ status: "active" })
      .eq("id", data.subscription_id);

    res.status(200).json({ payment: data, pi: approveData });
  } catch (err) {
    console.error("🔥 ApprovePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
