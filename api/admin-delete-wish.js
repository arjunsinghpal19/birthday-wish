/**
 * ============================================================================
 * VERCEL SERVERLESS ADMIN DELETE WISH API (api/admin-delete-wish.js)
 * Executes privileged single-wish deletion in Supabase after verifying
 * the caller's cryptographic Admin Session Token.
 *
 * SECURITY INVARIANTS:
 * 1. Strictly requires process.env.SUPABASE_SERVICE_ROLE_KEY for execution.
 *    ZERO fallback to anon or publishable keys.
 * 2. Requires valid HMAC-SHA256 Admin Session Token (cookie, header, or body).
 * 3. Unauthenticated / public requests are strictly rejected with 401 Unauthorized.
 * 4. Master system config row (00000000-0000-0000-0000-000000000001) is protected
 *    with 403 Forbidden.
 * 5. Only deletes the targeted database row; NEVER touches wish-media Storage files.
 * 6. Uses server-side credentials only (process.env); never exposes secrets to browser.
 * ============================================================================
 */

import { verifyAdminSessionToken, loadLocalEnv } from "./session.js";

const SYSTEM_CONFIG_UUID = "00000000-0000-0000-0000-000000000001";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Extracts session token from headers, cookies, or request payload.
 * @param {Object} req - HTTP request object.
 * @param {Object} body - Parsed request body.
 * @returns {string|null} Token or null.
 */
function extractToken(req, body) {
  // 1. Authorization header: Bearer <token>
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.trim().split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      return parts[1];
    }
  }

  // 2. Custom header: x-admin-token
  const customHeader = req.headers["x-admin-token"];
  if (customHeader && typeof customHeader === "string") {
    return customHeader.trim();
  }

  // 3. Request payload: adminToken
  if (body && body.adminToken && typeof body.adminToken === "string") {
    return body.adminToken.trim();
  }

  // 4. Cookie: admin_session=<token>
  const cookieHeader = req.headers.cookie;
  if (cookieHeader && typeof cookieHeader === "string") {
    const match = cookieHeader.match(/admin_session=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

export default async function handler(req, res) {
  // CORS Configuration: Supports both production Vercel deployment and local UAT environments
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-token");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 0. ENFORCE SERVICE_ROLE CREDENTIAL REQUIREMENT (ZERO ANON FALLBACK)
  // ────────────────────────────────────────────────────────────────────────
  loadLocalEnv();

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  if (!serviceRoleKey) {
    console.error("❌ Admin Delete API Error: Missing SUPABASE_SERVICE_ROLE_KEY server environment variable.");
    return res.status(500).json({
      success: false,
      error: "Server delete configuration unavailable."
    });
  }

  const supabaseUrl = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim()) || "https://dvacxeooaqxwldszqpek.supabase.co";

  try {
    const body = req.body || {};
    const targetUuid = (body.uuid || req.query.uuid || "").trim();

    // ────────────────────────────────────────────────────────────────────────
    // 1. VALIDATE TARGET UUID
    // ────────────────────────────────────────────────────────────────────────
    if (!targetUuid) {
      return res.status(400).json({ success: false, error: "Wish UUID parameter is required." });
    }

    if (!UUID_REGEX.test(targetUuid)) {
      return res.status(400).json({ success: false, error: "Invalid UUID format." });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. STRICT SYSTEM-ROW PROTECTION
    // ────────────────────────────────────────────────────────────────────────
    if (targetUuid.toLowerCase() === SYSTEM_CONFIG_UUID) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Cannot delete protected system configuration record."
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. FETCH SECURITY ROW TO VERIFY CALLER SESSION
    // ────────────────────────────────────────────────────────────────────────
    const fetchRes = await fetch(
      `${supabaseUrl}/rest/v1/wishes?id=eq.${SYSTEM_CONFIG_UUID}&select=admin_password_hash,admin_password_salt,pass_code,memory_text`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`
        }
      }
    );

    if (!fetchRes.ok) {
      return res.status(500).json({ success: false, error: "Failed to query database security configuration." });
    }

    const records = await fetchRes.json();
    const secRow = records[0] || {};

    // ────────────────────────────────────────────────────────────────────────
    // 4. VERIFY ADMIN SESSION TOKEN
    // ────────────────────────────────────────────────────────────────────────
    const token = extractToken(req, body);
    const isAuthorized = verifyAdminSessionToken(token, secRow);

    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or expired admin session token."
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 5. EXECUTE PRIVILEGED DELETE IN SUPABASE
    // ────────────────────────────────────────────────────────────────────────
    const deleteRes = await fetch(
      `${supabaseUrl}/rest/v1/wishes?id=eq.${encodeURIComponent(targetUuid)}`,
      {
        method: "DELETE",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      return res.status(deleteRes.status).json({
        success: false,
        error: `Supabase deletion failed: ${errText}`
      });
    }

    return res.status(200).json({
      success: true,
      message: "Wish record deleted successfully.",
      id: targetUuid
    });
  } catch (err) {
    console.error("❌ Admin Delete API Error:", err);
    return res.status(500).json({ success: false, error: "Internal Server Error during deletion." });
  }
}
