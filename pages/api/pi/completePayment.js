// pages/api/pi/completePayment.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { paymentId, txid } = req.body;

    if (!paymentId || !txid) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Aktualizujeme payment na "released"
    const { data, error } = await supabase
      .from("payments")
      .update({ status: "released", txid })
      .eq("id", paymentId)
      .select()
      .single();

    if (error) {
      console.error("Error updating payment:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ payment: data });
  } catch (err) {
    console.error("Internal Server Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}
