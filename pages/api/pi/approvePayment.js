import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { paymentId, service } = req.body;
  if (!paymentId || !service) return res.status(400).json({ error: "Missing paymentId or service" });

  try {
    const PI_API_KEY = process.env.PI_API_KEY;

    // 🔑 Volání Pi SDK approve
    const approveRes = await fetch("https://api.minepi.com/v2/payments/approve", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: service.price,
        currency: "PI",
        description: `Subscription: ${service.name}`,
      }),
    });

    const approveData = await approveRes.json();
    if (!approveRes.ok) throw new Error(JSON.stringify(approveData));

    // Vložení do Supabase
    const studentId = "11111111-1111-1111-1111-111111111111";
    const teacherId = "22222222-2222-2222-2222-222222222222";

    const { data, error } = await supabase
      .from("payments")
      .insert([{
        id: paymentId,
        payer_id: studentId,
        payee_id: teacherId,
        pi_amount: service.price,
        status: "pending",
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ payment: data, approveData });
  } catch (err) {
    console.error("Pi Approve error:", err);
    res.status(500).json({ error: err.message });
  }
}
