/**
 * ============================================================================
 * VERCEL SERVERLESS OTP & RECOVERY EMAIL SERVICE (api/send-otp.js)
 * Executes OTP generation, SHA-256 salted hashing, 5-min expiry, 
 * 60s cooldown, max 5 attempts, 15-min lockout, and Resend email delivery.
 * Supports pre-migration and post-migration schema fallbacks.
 * ============================================================================
 */

import crypto from "crypto";

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

function hashOtp(otp, salt) {
  return crypto.pbkdf2Sync(otp, salt, 10000, 32, "sha256").toString("hex");
}

function generateOtpDigits() {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
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
  const resendApiKey = process.env.RESEND_API_KEY || "";

  try {
    const { action, email, otpCode, newPassword, purpose } = req.body || {};

    // Fetch current security state from Supabase reserved row 00000000-0000-0000-0000-000000000001
    let fetchRes = await fetch(
      `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001&select=recovery_email,otp_hash,otp_salt,otp_expiry,otp_attempts,otp_locked_until,memory_text`,
      {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      }
    );

    // Fallback to basic columns if dedicated columns do not exist yet (pre-migration)
    if (!fetchRes.ok) {
      fetchRes = await fetch(
        `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001&select=pass_code,memory_text`,
        {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
        }
      );
    }

    if (!fetchRes.ok) {
      return res.status(500).json({ error: "Failed to read security configuration" });
    }

    const records = await fetchRes.json();
    const secRow = records[0] || {};
    const now = new Date();

    // Check Lockout
    if (secRow.otp_locked_until) {
      const lockedUntil = new Date(secRow.otp_locked_until);
      if (lockedUntil > now) {
        const remainingMinutes = Math.ceil((lockedUntil - now) / 60000);
        return res.status(429).json({
          error: `Security Lockout Active: Too many failed attempts. Try again in ${remainingMinutes} minute(s).`
        });
      }
    }

    // Read recovery email from dedicated column or memory_text fallback
    let currentRecoveryEmail = secRow.recovery_email;
    if (!currentRecoveryEmail && secRow.memory_text) {
      try {
        const parsed = JSON.parse(secRow.memory_text);
        if (parsed.admin_recovery_email) currentRecoveryEmail = parsed.admin_recovery_email;
      } catch (e) {}
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION 1: REQUEST / SEND OTP
    // ────────────────────────────────────────────────────────────────────────
    if (action === "request-otp") {
      const targetEmail = (email || currentRecoveryEmail || "").trim().toLowerCase();
      if (!targetEmail || !targetEmail.includes("@")) {
        return res.status(400).json({ error: "Valid email address is required" });
      }

      // Check 60s Resend Cooldown
      if (secRow.otp_expiry) {
        const expiryDate = new Date(secRow.otp_expiry);
        const issuedTime = expiryDate.getTime() - OTP_EXPIRY_MS;
        if (now.getTime() - issuedTime < RESEND_COOLDOWN_MS) {
          const secondsLeft = Math.ceil((RESEND_COOLDOWN_MS - (now.getTime() - issuedTime)) / 1000);
          return res.status(429).json({ error: `Please wait ${secondsLeft}s before requesting a new OTP.` });
        }
      }

      const rawOtp = generateOtpDigits();
      const otpSalt = generateSalt();
      const saltedHash = hashOtp(rawOtp, otpSalt);
      const expiryTimestamp = new Date(now.getTime() + OTP_EXPIRY_MS).toISOString();

      let payload = {};
      if (secRow.memory_text) {
        try { payload = JSON.parse(secRow.memory_text); } catch (e) {}
      }
      payload.temp_otp_hash = saltedHash;
      payload.temp_otp_salt = otpSalt;
      payload.temp_otp_expiry = expiryTimestamp;

      // Update Supabase with new hashed OTP & expiry
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
            otp_hash: saltedHash,
            otp_salt: otpSalt,
            otp_expiry: expiryTimestamp,
            otp_attempts: 0,
            otp_locked_until: null,
            memory_text: JSON.stringify(payload),
            updated_at: now.toISOString()
          })
        }
      );

      // Pre-migration fallback
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
            body: JSON.stringify({
              memory_text: JSON.stringify(payload),
              updated_at: now.toISOString()
            })
          }
        );
      }

      if (!updateRes.ok) {
        return res.status(500).json({ error: "Failed to store OTP in security record" });
      }

      // Send Email via Resend API
      if (resendApiKey) {
        try {
          const emailSubject = purpose === "SETUP" ? "Verify Admin Recovery Email - Birthday Suite" : "Admin Password Reset OTP - Birthday Suite";
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: "Birthday Suite Security <onboarding@resend.dev>",
              to: [targetEmail],
              subject: emailSubject,
              html: `
                <div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; borderRadius: 12px;">
                  <h2 style="color: #fbbf24; margin-bottom: 8px;">🔐 Birthday Suite Security Code</h2>
                  <p style="font-size: 14px; color: #94a3b8;">Your 6-digit verification code is:</p>
                  <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8; background: #1e293b; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
                    ${rawOtp}
                  </div>
                  <p style="font-size: 12px; color: #64748b;">This code expires in <strong>5 minutes</strong>. Do not share this code with anyone.</p>
                </div>
              `
            })
          });

          if (!resendResponse.ok) {
            const resendErr = await resendResponse.text();
            console.warn("⚠️ Resend Email Delivery Notice:", resendErr);
          }
        } catch (e) {
          console.warn("⚠️ Resend API Dispatch Exception:", e);
        }
      } else {
        console.log(`ℹ️ [TESTING MODE] Generated OTP for ${targetEmail}: ${rawOtp}`);
      }

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully!",
        expiresInSeconds: 300,
        resendCooldownSeconds: 60
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION 2: VERIFY OTP / SAVE EMAIL / RESET PASSWORD
    // ────────────────────────────────────────────────────────────────────────
    if (action === "verify-otp" || action === "save-recovery-email" || action === "reset-password-otp") {
      if (!otpCode || otpCode.trim().length !== 6) {
        return res.status(400).json({ error: "Please enter the 6-digit OTP code" });
      }

      let activeHash = secRow.otp_hash;
      let activeSalt = secRow.otp_salt;
      let activeExpiry = secRow.otp_expiry;

      if (!activeHash && secRow.memory_text) {
        try {
          const parsed = JSON.parse(secRow.memory_text);
          activeHash = parsed.temp_otp_hash;
          activeSalt = parsed.temp_otp_salt;
          activeExpiry = parsed.temp_otp_expiry;
        } catch (e) {}
      }

      if (!activeHash || !activeSalt || !activeExpiry) {
        return res.status(400).json({ error: "No active OTP found. Please request a new code." });
      }

      const expiryDate = new Date(activeExpiry);
      if (now > expiryDate) {
        return res.status(400).json({ error: "OTP has expired. Please request a new code." });
      }

      const inputHash = hashOtp(otpCode.trim(), activeSalt);
      const isMatch = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(activeHash));

      if (!isMatch) {
        const newAttempts = (secRow.otp_attempts || 0) + 1;
        let updateData = { otp_attempts: newAttempts, updated_at: now.toISOString() };

        if (newAttempts >= MAX_ATTEMPTS) {
          const lockoutTimestamp = new Date(now.getTime() + LOCKOUT_MS).toISOString();
          updateData.otp_locked_until = lockoutTimestamp;
        }

        await fetch(`${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`, {
          method: "PATCH",
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(updateData)
        });

        if (newAttempts >= MAX_ATTEMPTS) {
          return res.status(429).json({ error: "Maximum attempts reached. System locked for 15 minutes." });
        }

        const attemptsLeft = MAX_ATTEMPTS - newAttempts;
        return res.status(400).json({ error: `Invalid OTP code. ${attemptsLeft} attempt(s) remaining.` });
      }

      // OTP Verified Successfully!
      if (action === "verify-otp") {
        return res.status(200).json({ valid: true, message: "OTP Verified!" });
      }

      // Save Recovery Email (Stage 1)
      if (action === "save-recovery-email") {
        const cleanEmail = (email || currentRecoveryEmail || "").trim().toLowerCase();
        let payload = {};
        if (secRow.memory_text) {
          try { payload = JSON.parse(secRow.memory_text); } catch (e) {}
        }
        payload.admin_recovery_email = cleanEmail;
        payload.recovery_email_verified = true;
        delete payload.temp_otp_hash;
        payload.updated_at = now.toISOString();

        await fetch(`${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`, {
          method: "PATCH",
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            recovery_email: cleanEmail,
            recovery_email_verified: true,
            otp_attempts: 0,
            otp_hash: null,
            memory_text: JSON.stringify(payload),
            updated_at: now.toISOString()
          })
        });

        return res.status(200).json({ success: true, message: "Recovery email verified and saved!" });
      }

      // Reset Password via OTP (Stage 2)
      if (action === "reset-password-otp") {
        if (!newPassword || newPassword.trim().length < 4) {
          return res.status(400).json({ error: "New password must be at least 4 characters" });
        }

        const cleanNewPass = newPassword.trim();
        const passSalt = crypto.randomBytes(16).toString("hex");
        const passHash = crypto.pbkdf2Sync(cleanNewPass, passSalt, 600000, 32, "sha256").toString("hex");

        let payload = {};
        if (secRow.memory_text) {
          try { payload = JSON.parse(secRow.memory_text); } catch (e) {}
        }
        payload.admin_master_password = cleanNewPass;
        delete payload.temp_otp_hash;
        payload.updated_at = now.toISOString();

        await fetch(`${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`, {
          method: "PATCH",
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            admin_password_hash: passHash,
            admin_password_salt: passSalt,
            pass_code: cleanNewPass,
            otp_attempts: 0,
            otp_hash: null,
            memory_text: JSON.stringify(payload),
            updated_at: now.toISOString()
          })
        });

        return res.status(200).json({ success: true, message: "Password updated successfully!" });
      }
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error("❌ Send OTP API Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
