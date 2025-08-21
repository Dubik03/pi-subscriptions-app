// pages/api/pi/approvePayment.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { paymentId, service, student, teacher, sandbox = true } = req.body;

    if (!paymentId || !service) {
      return res.status(400).json({ error: "Missing paymentId or service" });
    }

    // 🔑 Pi API key z .env
    const PI_API_KEY = process.env.PI_API_KEY;
    if (!PI_API_KEY) throw new Error("Missing PI_API_KEY in environment variables");

    // 1️⃣ Zavoláme Pi Platform API /approve
    const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });
    const approveData = await approveRes.json();
    if (!approveRes.ok) {
      console.error("Pi API Approve error:", approveData);
      return res.status(400).json({ error: approveData.error || "Pi approve failed" });
    }

    // 2️⃣ Zajistíme uživatele ve Supabase
    // Používáme sandbox placeholdery, pokud neexistují reální údaje
    const studentId = student?.uid || (sandbox ? "sandbox_student" : null);
    const teacherId = teacher?.uid || (sandbox ? "sandbox_teacher" : null);
    const studentWallet = student?.walletAddress || (sandbox ? "sandbox_wallet" : null);
    const teacherWallet = teacher?.walletAddress || (sandbox ? "sandbox_wallet" : null);

    if (!studentId || !teacherId) {
      return res.status(400).json({ error: "Missing student or teacher UID" });
    }

    // Kontrola / vytvoření student
    let { data: existingStudent } = await supabase
      .from("users")
      .select("*")
      .eq("id", studentId)
      .single();
    if (!existingStudent) {
      const { error: userError } = await supabase
        .from("users")
        .insert([{ id: studentId, role: "student", pi_wallet_address: studentWallet }]);
      if (userError) throw new Error("Failed to insert student: " + userError.message);
    }

    // Kontrola / vytvoření teacher
    let { data: existingTeacher } = await supabase
      .from("users")
      .select("*")
      .eq("id", teacherId)
      .single();
    if (!existingTeacher) {
      const { error: teacherError } = await supabase
        .from("users")
        .insert([{ id: teacherId, role: "teacher", pi_wallet_address: teacherWallet }]);
      if (teacherError) throw new Error("Failed to insert teacher: " + teacherError.message);
    }

    // 3️⃣ Uložíme payment do Supabase
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert([
        {
          id: paymentId,
          payer_id: studentId,
          payee_id: teacherId,
          pi_amount: service.price || approveData.amount,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (payError) throw payError;

    res.status(200).json({ ok: true, payment, pi: approveData });
  } catch (err) {
    console.error("ApprovePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
