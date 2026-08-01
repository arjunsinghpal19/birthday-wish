/**
 * ============================================================================
 * VERCEL SERVERLESS OTP & RECOVERY EMAIL SERVICE (api/send-otp.js)
 * Executes OTP generation, SHA-256 salted hashing, 5-min expiry, 
 * 60s cooldown, max 5 attempts, 15-min lockout, and Resend email delivery.
 * Displays explicit error if RESEND_API_KEY is missing or Resend API rejects.
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
  const resendApiKey = (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) || "";

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

      // Explicit check if RESEND_API_KEY is configured
      if (!resendApiKey) {
        return res.status(400).json({
          error: "Resend API Key is not configured in Vercel Environment Variables. Please set RESEND_API_KEY in Vercel Dashboard."
        });
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
      try {
        const emailSubject = "Wish Studio Security Verification Code";
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "Wish Studio Security <onboarding@resend.dev>",
            to: [targetEmail],
            subject: emailSubject,
            html: `
              <!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Wish Studio Security Verification</title>
              </head>
              <body style="margin: 0; padding: 0; background-color: #0F0A1C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0F0A1C; padding: 36px 12px;">
                  <tr>
                    <td align="center">
                      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #1B1530; border: 1px solid rgba(247, 201, 74, 0.25); border-radius: 18px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);">
                        
                        <!-- Header Banner -->
                        <tr>
                          <td style="padding: 32px 24px 22px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: linear-gradient(180deg, rgba(247, 201, 74, 0.08) 0%, rgba(27, 21, 48, 0) 100%);" align="center">
                            <div style="margin-bottom: 8px;">
                              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#F7C94A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
                                <rect x="3" y="8" width="18" height="13" rx="2" ry="2"/>
                                <path d="M12 8v13"/>
                                <path d="M3 12h18"/>
                                <path d="M12 8C9.5 8 7 5.5 8.5 3.5 10 1.5 12 5 12 8z"/>
                                <path d="M12 8C14.5 8 17 5.5 15.5 3.5 14 1.5 12 5 12 8z"/>
                              </svg>
                            </div>
                            <div style="font-size: 22px; font-weight: 800; color: #F7C94A; letter-spacing: 0.5px; margin-top: 4px;">Wish Studio</div>
                            <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255, 255, 255, 0.6); margin-top: 4px;">Premium Unforgettable Celebration Experiences</div>
                          </td>
                        </tr>

                        <!-- Security Title & Intro -->
                        <tr>
                          <td style="padding: 28px 28px 14px 28px;" align="center">
                            <h1 style="margin: 0 0 10px 0; font-size: 19px; font-weight: 700; color: #FFFFFF; text-align: center;">🔐 Admin Security Verification</h1>
                            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #CBD5E1; text-align: center;">
                              An admin security verification code was requested for your account session. Enter the code below to proceed:
                            </p>
                          </td>
                        </tr>

                        <!-- Large OTP Card -->
                        <tr>
                          <td style="padding: 6px 28px 20px 28px;" align="center">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #120D24; border: 1px dashed #F7C94A; border-radius: 12px; padding: 20px 18px;">
                              <tr>
                                <td align="center">
                                  <div style="font-size: 44px; font-weight: 800; letter-spacing: 10px; color: #F7C94A; font-family: 'Courier New', Courier, monospace; text-shadow: 0 0 10px rgba(247, 201, 74, 0.2);">
                                    ${rawOtp}
                                  </div>
                                  <div style="font-size: 11px; color: #94A3B8; margin-top: 8px; letter-spacing: 0.3px;">Copy this code into the verification screen.</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Expiry Notice Card Pill -->
                        <tr>
                          <td style="padding: 0 28px 20px 28px;" align="center">
                            <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(247, 201, 74, 0.1); border: 1px solid #F7C94A; border-radius: 20px; padding: 6px 18px; box-shadow: 0 0 12px rgba(247, 201, 74, 0.25);">
                              <tr>
                                <td style="font-size: 12px; font-weight: 600; color: #FDE047; text-align: center;">
                                  ⏱ Expires in 5 minutes
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Security Advisory Box -->
                        <tr>
                          <td style="padding: 0 28px 24px 28px;">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 16px;">
                              <tr>
                                <td>
                                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94A3B8; margin-bottom: 10px;">Security Advisory:</div>
                                  <div style="font-size: 12px; line-height: 1.8; color: #CBD5E1;">
                                    <div style="margin-bottom: 4px;">🛡 Never share this code.</div>
                                    <div style="margin-bottom: 4px;">🛡 Wish Studio will never ask for your OTP.</div>
                                    <div>🛡 Ignore this email if you didn't request it.</div>
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td style="padding: 22px 24px; background-color: #120D24; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center;" align="center">
                            <div style="font-size: 12px; font-weight: 700; color: #F7C94A;">Wish Studio</div>
                            <div style="font-size: 10px; color: #64748B; margin-top: 3px;">Premium Unforgettable Celebration Experiences</div>
                            <div style="font-size: 11px; color: #94A3B8; margin-top: 10px; line-height: 1.5;">This is an automated security email.<br>Please do not reply.</div>
                            <div style="font-size: 10px; color: #475569; margin-top: 10px;">© 2026 Wish Studio. All rights reserved.</div>
                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `
          })
        });

        if (!resendResponse.ok) {
          const resendErrText = await resendResponse.text();
          let detail = resendErrText;
          try {
            const parsedErr = JSON.parse(resendErrText);
            if (parsedErr.message) detail = parsedErr.message;
          } catch (e) {}
          return res.status(400).json({ error: `Resend Email Delivery Error: ${detail}` });
        }
      } catch (e) {
        return res.status(500).json({ error: `Resend API Connection Error: ${e.message}` });
      }

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully via Resend!",
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
