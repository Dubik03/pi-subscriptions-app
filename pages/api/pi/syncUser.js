import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { uid, username, wallet } = req.body;
  if (!uid || !wallet) return res.status(400).json({ error: "Missing uid or wallet" });

  try {
    // zkontrolovat existenci
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("pi_wallet_address", wallet)
      .single();

    if (existingUser) return res.status(200).json(existingUser);

    // vložit nového uživatele
    const { data: newUser, error } = await supabase
      .from("users")
      .insert([{ pi_wallet_address: wallet, username }])
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(newUser);
  } catch (err) {
    console.error("syncUser error:", err);
    res.status(500).json({ error: err.message });
  }
}
