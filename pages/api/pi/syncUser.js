// pages/api/pi/syncUser.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { pi_uid, username, wallet_address } = req.body;

  if (!pi_uid || !wallet_address) {
    return res.status(400).json({ error: "Missing uid or wallet" });
  }

  try {
    // 1️⃣ Zkontrolujeme, jestli uživatel existuje podle pi_uid
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("*")
      .eq("pi_uid", pi_uid)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      // PGRST116 = no rows found → to není chyba
      throw selectError;
    }

    if (existingUser) {
      // Uživatel existuje → vrátíme
      return res.status(200).json(existingUser);
    }

    // 2️⃣ Vložíme nového uživatele
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          pi_uid,
          username,
          wallet_address,
          role: "student", // default role
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(200).json(newUser);
  } catch (err) {
    console.error("syncUser error:", err);
    res.status(500).json({ error: err.message });
  }
}
