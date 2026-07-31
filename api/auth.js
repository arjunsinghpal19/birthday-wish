/**
 * ============================================================================
 * VERCEL SERVERLESS AUTHENTICATION & CRYPTOGRAPHY API (api/auth.js)
 * Executes PBKDF2-HMAC-SHA256 password & security answer hashing/verification.
 * Never exposes salts or hashing mechanics to the browser client.
 * Automatically migrates unhashed security answers to PBKDF2 hashes.
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
    const { action, password, newPassword, question, answer } = req.body || {};

    // Fetch security columns from reserved system row 00000000-0000-0000-0000-000000000001
    let fetchRes = await fetch(
      `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001&select=admin_password_hash,admin_password_salt,security_question,security_answer_hash,security_answer_salt,pass_code,memory_text`,
      {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      }
    );

    // Pre-migration fallback if dedicated columns do not exist yet
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
    let storedPassHash = secRow.admin_password_hash;
    let storedPassSalt = secRow.admin_password_salt;
    let storedAnsHash = secRow.security_answer_hash;
    let storedAnsSalt = secRow.security_answer_salt;

    let parsedMemory = {};
    if (secRow.memory_text) {
      try { parsedMemory = JSON.parse(secRow.memory_text); } catch (e) {}
    }
    if (!actualPass && parsedMemory.admin_master_password) {
      actualPass = parsedMemory.admin_master_password;
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION: VERIFY ADMIN PASSWORD
    // ────────────────────────────────────────────────────────────────────────
    if (action === "verify") {
      if (!password) {
        return res.status(400).json({ valid: false, message: "Password is required" });
      }

      const inputClean = password.trim();

      if (storedPassHash && storedPassSalt) {
        const inputHash = await pbkdf2Async(inputClean, storedPassSalt);
        const isValid = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedPassHash));
        return res.status(200).json({ valid: isValid });
      }

      const isValid = (actualPass && inputClean === actualPass.trim());
      return res.status(200).json({ valid: isValid });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION: UPDATE ADMIN PASSWORD
    // ────────────────────────────────────────────────────────────────────────
    if (action === "update") {
      if (!newPassword || newPassword.trim().length < 4) {
        return res.status(400).json({ success: false, message: "Password must be at least 4 characters" });
      }

      const cleanNewPass = newPassword.trim();
      const newSalt = generateSalt();
      const newHash = await pbkdf2Async(cleanNewPass, newSalt);

      parsedMemory.admin_master_password = cleanNewPass;
      parsedMemory.updated_at = new Date().toISOString();

      let updateBody = {
        pass_code: cleanNewPass,
        memory_text: JSON.stringify(parsedMemory),
        updated_at: new Date().toISOString()
      };

      let updateRes = await fetch(
        `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`,
        {
          method: "PATCH",
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            ...updateBody,
            admin_password_hash: newHash,
            admin_password_salt: newSalt
          })
        }
      );

      if (!updateRes.ok) {
        updateRes = await fetch(
          `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`,
          {
            method: "PATCH",
            headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(updateBody)
          }
        );
      }

      if (!updateRes.ok) {
        return res.status(500).json({ success: false, message: "Database update failed" });
      }

      return res.status(200).json({ success: true });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION: VERIFY SECURITY ANSWER (WITH AUTOMATIC PBKDF2 HASH MIGRATION)
    // ────────────────────────────────────────────────────────────────────────
    if (action === "verify-question") {
      if (!answer) {
        return res.status(400).json({ valid: false, message: "Answer is required" });
      }

      const cleanAns = answer.trim().toLowerCase();

      // Case A: Dedicated answer hash & salt exist
      if (storedAnsHash && storedAnsSalt) {
        const inputHash = await pbkdf2Async(cleanAns, storedAnsSalt);
        const isValid = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedAnsHash));
        return res.status(200).json({ valid: isValid });
      }

      // Case B: First migration / pre-migration fallback (expected answer is "shivam")
      let expectedLegacyAns = "shivam";
      if (parsedMemory.custom_secret_answer) {
        const parsedClean = parsedMemory.custom_secret_answer.trim().toLowerCase();
        if (parsedClean !== "arjun") expectedLegacyAns = parsedClean;
      }

      const isValid = (cleanAns === expectedLegacyAns);

      if (isValid) {
        // Automatically migrate unhashed answer to PBKDF2 hash & salt in Supabase
        const newAnsSalt = generateSalt();
        const newAnsHash = await pbkdf2Async(cleanAns, newAnsSalt);
        parsedMemory.custom_secret_answer = "Shivam";
        parsedMemory.updated_at = new Date().toISOString();

        await fetch(`${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`, {
          method: "PATCH",
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            security_answer_hash: newAnsHash,
            security_answer_salt: newAnsSalt,
            security_question: secRow.security_question || "Who is your best friend?",
            memory_text: JSON.stringify(parsedMemory),
            updated_at: new Date().toISOString()
          })
        });
      }

      return res.status(200).json({ valid: isValid });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION: SAVE SECURITY QUESTION & ANSWER
    // ────────────────────────────────────────────────────────────────────────
    if (action === "save-question") {
      if (!question || !answer) {
        return res.status(400).json({ success: false, message: "Question and Answer are required" });
      }

      const cleanQuest = question.trim();
      const cleanAns = answer.trim().toLowerCase();
      const newAnsSalt = generateSalt();
      const newAnsHash = await pbkdf2Async(cleanAns, newAnsSalt);

      parsedMemory.custom_secret_question = cleanQuest;
      parsedMemory.custom_secret_answer = answer.trim();
      parsedMemory.updated_at = new Date().toISOString();

      let updateRes = await fetch(
        `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`,
        {
          method: "PATCH",
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            security_question: cleanQuest,
            security_answer_hash: newAnsHash,
            security_answer_salt: newAnsSalt,
            memory_text: JSON.stringify(parsedMemory),
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!updateRes.ok) {
        return res.status(500).json({ success: false, message: "Failed to save security question & answer" });
      }

      return res.status(200).json({ success: true, message: "Security Question & Answer Saved!" });
    }

    return res.status(400).json({ error: "Invalid action parameter" });
  } catch (err) {
    console.error("❌ Auth API Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
