import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { pi_uid, username, wallet_address } = req.body;
  if (!pi_uid) return res.status(400).json({ error: "Missing pi_uid" });

  try {
    // zkontrolovat existenci
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("pi_uid", pi_uid)
      .single();

    if (existingUser) return res.status(200).json(existingUser);

    // vložit nového uživatele
    const { data: newUser, error } = await supabase
      .from("users")
      .insert([{ pi_uid, username, wallet_address }])
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(newUser);
  } catch (err) {
    console.error("syncUser error:", err);
    res.status(500).json({ error: err.message });
  }
}
