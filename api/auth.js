/**
 * ============================================================================
 * VERCEL SERVERLESS AUTHENTICATION & CRYPTOGRAPHY API (api/auth.js)
 * Executes PBKDF2-HMAC-SHA256 password hashing & verification server-side.
 * Never exposes salts or hashing mechanics to the browser client.
 * Supports graceful fallback before or after database migration.
 * ============================================================================
 */

import crypto from "crypto";

const ITERATIONS = 600000;
const KEY_LEN = 32;
const DIGEST = "sha256";

function pbkdf2Async(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LEN, DIGEST, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString("hex"));
    });
  });
}

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const supabaseUrl = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim()) || "https://dvacxeooaqxwldszqpek.supabase.co";
  const supabaseKey = (process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY.trim()) || "sb_publishable_UZ1WSWZHyaij07xleBgSxw_YBn7-lAx";

  try {
    const { action, password, newPassword } = req.body || {};

    // 1. Try querying dedicated security columns first
    let fetchRes = await fetch(
      `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001&select=admin_password_hash,admin_password_salt,pass_code,memory_text`,
      {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      }
    );

    // 2. Fallback to basic columns if dedicated columns do not exist yet (pre-migration compatibility)
    if (!fetchRes.ok) {
      fetchRes = await fetch(
        `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001&select=pass_code,memory_text`,
        {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
        }
      );
    }

    if (!fetchRes.ok) {
      return res.status(500).json({ error: "Failed to query database security configuration" });
    }

    const records = await fetchRes.json();
    const secRow = records[0] || {};

    let actualPass = secRow.pass_code;
    let storedHash = secRow.admin_password_hash;
    let storedSalt = secRow.admin_password_salt;

    if (!actualPass && secRow.memory_text) {
      try {
        const parsed = JSON.parse(secRow.memory_text);
        if (parsed.admin_master_password) actualPass = parsed.admin_master_password;
      } catch (e) {}
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION: VERIFY PASSWORD
    // ────────────────────────────────────────────────────────────────────────
    if (action === "verify") {
      if (!password) {
        return res.status(400).json({ valid: false, message: "Password is required" });
      }

      const inputClean = password.trim();

      // If stored hash & salt exist, verify using PBKDF2-HMAC-SHA256
      if (storedHash && storedSalt) {
        const inputHash = await pbkdf2Async(inputClean, storedSalt);
        const isValid = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedHash));
        return res.status(200).json({ valid: isValid });
      }

      // Pre-migration fallback: Compare with canonical pass_code
      const isValid = (actualPass && inputClean === actualPass.trim());
      return res.status(200).json({ valid: isValid });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION: UPDATE PASSWORD
    // ────────────────────────────────────────────────────────────────────────
    if (action === "update") {
      if (!newPassword || newPassword.trim().length < 4) {
        return res.status(400).json({ success: false, message: "Password must be at least 4 characters" });
      }

      const cleanNewPass = newPassword.trim();
      const newSalt = generateSalt();
      const newHash = await pbkdf2Async(cleanNewPass, newSalt);

      let payload = {};
      if (secRow.memory_text) {
        try { payload = JSON.parse(secRow.memory_text); } catch (e) {}
      }
      payload.admin_master_password = cleanNewPass;
      payload.updated_at = new Date().toISOString();

      // Build update body with fallback for pre-migration schema
      let updateBody = {
        pass_code: cleanNewPass,
        memory_text: JSON.stringify(payload),
        updated_at: new Date().toISOString()
      };

      // Try updating with dedicated columns
      let updateRes = await fetch(
        `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`,
        {
          method: "PATCH",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...updateBody,
            admin_password_hash: newHash,
            admin_password_salt: newSalt
          })
        }
      );

      // Fallback if dedicated columns do not exist yet
      if (!updateRes.ok) {
        updateRes = await fetch(
          `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`,
          {
            method: "PATCH",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(updateBody)
          }
        );
      }

      if (!updateRes.ok) {
        const errTxt = await updateRes.text();
        console.error("❌ Serverless Password Update failed:", errTxt);
        return res.status(500).json({ success: false, message: "Database update failed" });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Invalid action parameter" });
  } catch (err) {
    console.error("❌ Auth API Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
