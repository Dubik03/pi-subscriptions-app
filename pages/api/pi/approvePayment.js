import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { paymentId, service, studentId, teacherId } = req.body;
    if (!paymentId || !studentId || !teacherId) return res.status(400).json({ error: "Missing fields" });

    const PI_API_KEY = process.env.PI_API_KEY;

    const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: { "Authorization": `Key ${PI_API_KEY}`, "Content-Type": "application/json" },
    });

    const approveData = await approveRes.json();
    if (!approveRes.ok) return res.status(400).json({ error: approveData.error });

    // --- Insert student if not exist ---
    const { data: existingStudent } = await supabase.from("users").select("*").eq("id", studentId).single();
    if (!existingStudent) await supabase.from("users").insert([{ id: studentId, role: "student" }]);

    const { data: payment, error } = await supabase
      .from("payments")
      .insert([{ id: paymentId, payer_id: studentId, payee_id: teacherId, pi_amount: service?.price || approveData.amount, status: "pending" }])
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ payment, pi: approveData });
  } catch (err) {
    console.error("ApprovePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
