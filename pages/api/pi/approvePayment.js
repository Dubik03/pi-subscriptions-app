// pages/api/pi/approvePayment.js
import { supabase } from "../../../lib/supabase";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { paymentId, service, student, teacher } = req.body;
    if (!paymentId || !service) {
      return res.status(400).json({ error: "Missing paymentId or service" });
    }

    const PI_API_KEY = process.env.PI_API_KEY;
    if (!PI_API_KEY) throw new Error("Missing PI_API_KEY in environment variables");

    // 1️⃣ Volání Pi API /approve
    const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const approveData = await approveRes.json();
    if (!approveRes.ok) {
      console.error("Pi API Approve error:", approveData);
      return res.status(400).json({ error: approveData.error || "Pi approve failed" });
    }

    // 2️⃣ Vytvoření / kontrola uživatele student
    let { data: existingStudent } = await supabase
      .from("users")
      .select("*")
      .eq("pi_wallet_address", student?.walletAddress || `sandbox_${crypto.randomUUID()}`)
      .single();

    if (!existingStudent) {
      const walletAddress = student?.walletAddress || `sandbox_${crypto.randomUUID()}`;
      const { data: newStudent, error: insertStudentError } = await supabase
        .from("users")
        .insert([{
          pi_wallet_address: walletAddress,
          username: student?.username || `Student_${walletAddress.substring(0, 6)}`,
          role: "student",
        }])
        .select()
        .single();

      if (insertStudentError) throw new Error("Failed to insert student: " + insertStudentError.message);
      existingStudent = newStudent;
    }

    // 3️⃣ Vytvoření / kontrola učitele
    let { data: existingTeacher } = await supabase
      .from("users")
      .select("*")
      .eq("pi_wallet_address", teacher?.walletAddress || `teacher_sandbox_${crypto.randomUUID()}`)
      .single();

    if (!existingTeacher) {
      const walletAddress = teacher?.walletAddress || `teacher_sandbox_${crypto.randomUUID()}`;
      const { data: newTeacher, error: insertTeacherError } = await supabase
        .from("users")
        .insert([{
          pi_wallet_address: walletAddress,
          username: teacher?.username || `Teacher_${walletAddress.substring(0, 6)}`,
          role: "teacher",
        }])
        .select()
        .single();

      if (insertTeacherError) throw new Error("Failed to insert teacher: " + insertTeacherError.message);
      existingTeacher = newTeacher;
    }

    // 4️⃣ Vložení platby do payments
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert([{
        id: paymentId,
        payer_id: existingStudent.id,
        payee_id: existingTeacher.id,
        pi_amount: service?.price || approveData.amount,
        status: "pending",
      }])
      .select()
      .single();

    if (paymentError) throw new Error("Failed to insert payment: " + paymentError.message);

    res.status(200).json({ ok: true, payment, pi: approveData });

  } catch (err) {
    console.error("approvePayment error:", err);
    res.status(500).json({ error: err.message });
  }
}
