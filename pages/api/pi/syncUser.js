// pages/api/pi/syncUser.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") 
    return res.status(405).json({ error: "Method not allowed" });

  const { uid, username, wallet } = req.body;
  if (!uid) return res.status(400).json({ error: "Missing uid" });

  try {
    // zkontrolovat existenci
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("pi_uid", uid)
      .maybeSingle();

    if (existingUser) return res.status(200).json(existingUser);

    // vložit nového uživatele
    const { data: newUser, error } = await supabase
      .from("users")
      .insert([{ pi_uid: uid, username, wallet_address: wallet }])
      .select()
      .maybeSingle();

    if (error) throw error;
    res.status(200).json(newUser);
  } catch (err) {
    console.error("syncUser error:", err);
    res.status(500).json({ error: err.message });
  }
}
