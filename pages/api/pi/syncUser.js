// pages/api/pi/syncUser.js
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid, username, wallet } = req.body;

  // UID je povinný, wallet v sandboxu nemusí být
  if (!uid) {
    return res.status(400).json({ error: "Missing uid" });
  }

  try {
    // Najdi uživatele podle uid
    const { data: existingUser, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("pi_uid", uid)
      .single();

    if (findError && findError.code !== "PGRST116") {
      // PGRST116 = no rows found, to není chyba
      throw findError;
    }

    if (existingUser) {
      return res.status(200).json(existingUser);
    }

    // Vlož nového uživatele
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          pi_uid: uid,
          username,
          pi_wallet_address: wallet || null, // 👈 pokud null, uloží se prázdná hodnota
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    return res.status(200).json(newUser);
  } catch (err) {
    console.error("syncUser error:", err);
    return res.status(500).json({ error: err.message });
  }
}
