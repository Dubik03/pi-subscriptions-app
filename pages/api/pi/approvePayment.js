import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { paymentId, service, studentWallet, studentUsername, studentEmail, teacherWallet, teacherUsername, teacherEmail } = req.body;

    if (!paymentId || !studentWallet || !teacherWallet) {
      return res.status(400).json({ error: "Missing paymentId or wallet addresses" });
    }

    const PI_API_KEY = process.env.PI_API_KEY;

    // 1️⃣ Zavolat Pi API /approve
    const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const approveData = await approveRes.json();
    if (!approveRes.ok) return res.status(400).json({ error: approveData.error || "Pi approve failed" });

    // 2️⃣ Ujistíme se, že student existuje
    let { data: student, error: studentError } = await supabase
      .from("users")
      .select("*")
      .eq("pi_wallet_address", studentWallet)
      .single();

    if (!student) {
      const { data: newStudent, error: insertErr } = await supabase
        .from("users")
        .insert([{ pi_wallet_address: studentWallet, username: studentUsername || "Student", email: studentEmail, role: "student" }])
        .select()
        .single();
      if (insertErr) throw new Error("Failed to insert student: " + insertErr.message);
      student = newStudent;
    }

    // 3️⃣ Ujistíme se, že učitel existuje
    let { data: teacher, error: teacherError } = await supabase
      .from("users")
      .select("*")
      .eq("pi_wallet_address", teacherWallet)
      .single();

    if (!teacher) {
      const { data: newTeacher, error: insertErr } = await supabase
        .from("users")
        .insert([{ pi_wallet_address: teacherWallet, username: teacherUsername || "Teacher", email: teacherEmail, role: "teacher" }])
        .select()
        .single();
      if (insertErr) throw new Error("Failed to insert teacher: " + insertErr.message);
      teacher = newTeacher;
    }

    // 4️⃣ Uložíme platbu do Supabase
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert([{
        id: paymentId,
        payer_id: student.id,
        payee_id: teacher.id,
        pi_amount: service?.price || approveData.amount,
        status: "pending",
      }])
      .select()
      .single();

    if (payError) throw new Error("Failed to insert payment: " + payError.message);

    res.status(200).json({ payment, pi: approveData });

  } catch (err) {
    console.error("ApprovePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
