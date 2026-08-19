/**
 * ============================================================================
 * VERCEL SERVERLESS ADMIN SESSION ENGINE (api/session.js)
 * Cryptographic HMAC-SHA256 session token generation and verification.
 * Provides server-side proof of admin authentication for privileged operations.
 * ============================================================================
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";

const SESSION_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Safely loads environment variables from .env.local if not already present in process.env.
 * No-op in production where process.env is injected by the hosting platform.
 */
export function loadLocalEnv() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch (e) {
    // Ignore in production environments
  }
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token for verified administrators.
 * @param {Object} secRow - Security row object containing stored hash or fallback password.
 * @returns {string} Encoded token in format header.payload.signature
 */
export function createAdminSessionToken(secRow) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    role: "admin",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS
  })).toString("base64url");

  const secret = (process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.trim()) ||
                 (secRow && secRow.admin_password_hash) ||
                 (secRow && secRow.pass_code) ||
                 "birthday_wish_admin_session_secret_2026";

  const signature = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

/**
 * Verifies the authenticity and expiration of an admin session token.
 * @param {string} token - The session token to verify.
 * @param {Object} secRow - Security row object containing stored hash or fallback password.
 * @returns {boolean} True if token is valid and unexpired, false otherwise.
 */
export function verifyAdminSessionToken(token, secRow) {
  if (!token || typeof token !== "string") return false;
  const parts = token.trim().split(".");
  if (parts.length !== 3) return false;

  const [headerB64, payloadB64, signature] = parts;

  const secret = (process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.trim()) ||
                 (secRow && secRow.admin_password_hash) ||
                 (secRow && secRow.pass_code) ||
                 "birthday_wish_admin_session_secret_2026";

  const expectedSignature = crypto.createHmac("sha256", secret).update(`${headerB64}.${payloadB64}`).digest("base64url");

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (payload.role !== "admin") return false;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false;

    return true;
  } catch (e) {
    return false;
  }
}
