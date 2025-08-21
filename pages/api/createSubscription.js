// pages/api/createSubscription.js
import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
  console.log("API /createSubscription voláno, method:", req.method);

  if (req.method !== "POST") {
    console.warn("Metoda není POST:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { studentId, teacherId, planName, piAmount, durationDays } = req.body;

    console.log("Received request body:", req.body);

    if (!studentId || !teacherId || !planName || !piAmount || !durationDays) {
      console.error("Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Zkontroluj, jestli student existuje
    const { data: student, error: studentError } = await supabase
      .from("users")
      .select("*")
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      console.error("Student not found:", studentError);
      return res.status(400).json({ error: "Student not found", details: studentError?.message });
    }

    // Zkontroluj, jestli teacher existuje
    const { data: teacher, error: teacherError } = await supabase
      .from("users")
      .select("*")
      .eq("id", teacherId)
      .single();

    if (teacherError || !teacher) {
      console.error("Teacher not found:", teacherError);
      return res.status(400).json({ error: "Teacher not found", details: teacherError?.message });
    }

    // Vytvoříme subscription
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    console.log("Inserting subscription with endDate:", endDate.toISOString().split("T")[0]);

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert([
        {
          user_id: studentId,
          teacher_id: teacherId,
          plan_name: planName,
          pi_amount: piAmount,
          end_date: endDate.toISOString().split("T")[0],
        },
      ])
      .select()
      .single();

    if (subError) {
      console.error("Subscription insert error:", subError);
      return res.status(500).json({ error: "Subscription insert failed", details: subError.message });
    }

    console.log("Subscription created:", subscription);

    // Vytvoříme escrow payment
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert([
        {
          subscription_id: subscription.id,
          payer_id: studentId,
          payee_id: teacherId,
          pi_amount: piAmount,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (payError) {
      console.error("Payment insert error:", payError);
      return res.status(500).json({ error: "Payment insert failed", details: payError.message });
    }

    console.log("Payment created:", payment);

    res.status(200).json({ subscription, payment });
  } catch (err) {
    console.error("Internal Server Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}
