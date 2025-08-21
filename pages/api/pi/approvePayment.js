import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { paymentId } = req.body;
  if (!paymentId) return res.status(400).json({ error: "Missing paymentId" });

  try {
    const API_KEY = process.env.PI_API_KEY; // musí být v env
    const postingURL = `https://api.minepi.com/v2/payments/${paymentId}/approve`;

    const headers = {
      headers: {
        Authorization: `key ${API_KEY}`,
        "Content-Type": "application/json",
      },
    };

    // call Pi API
    const { data: paymentDTO } = await axios.post(postingURL, null, headers);

    console.log("Payment approved:", paymentDTO);

    // volitelně ulož do Supabase
    // const { data, error } = await supabase
    //   .from("payments")
    //   .update({ status: "approved" })
    //   .eq("id", paymentId);

    res.status(200).json({ ok: true, paymentDTO });
  } catch (err) {
    console.error("approvePayment error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
}
