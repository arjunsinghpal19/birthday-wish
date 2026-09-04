/**
 * ============================================================================
 * VERCEL SERVERLESS ADMIN WISHES READ API (api/admin-wishes.js)
 * Architecture: Phase 32C Privileged Admin Read Layer
 *
 * Dedicated serverless endpoint for Master Admin Dashboard reads. Executes
 * privileged queries against public.wishes using SUPABASE_SERVICE_ROLE_KEY
 * on the server side after verifying the caller's cryptographic Admin Session Token.
 *
 * SECURITY INVARIANTS:
 * 1. Strictly requires a valid HMAC-SHA256 Admin Session Token (cookie, header, query, body).
 * 2. Uses process.env.SUPABASE_SERVICE_ROLE_KEY server-side only; ZERO key exposure to browser.
 * 3. Protected system config row (00000000-0000-0000-0000-000000000001) is strictly excluded
 *    from bulk results and blocked from single reads with 403 Forbidden.
 * 4. Master Admin retains 100% visibility over all operational wishes (legacy unowned & customer-owned).
 * ============================================================================
 */

import { verifyAdminSessionToken, loadLocalEnv } from "./session.js";

const SYSTEM_CONFIG_UUID = "00000000-0000-0000-0000-000000000001";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Extracts Admin Session Token from Authorization header, custom headers,
 * query parameters, request body, or HTTP cookies.
 * @param {Object} req - HTTP request object.
 * @param {Object} [body={}] - Parsed request body.
 * @returns {string|null} Extracted token or null.
 */
function extractToken(req, body = {}) {
  // 1. Authorization header: Bearer <token>
  const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.trim().split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      return parts[1];
    }
  }

  // 2. Custom header: x-admin-token
  const customHeader = req.headers && req.headers["x-admin-token"];
  if (customHeader && typeof customHeader === "string") {
    return customHeader.trim();
  }

  // 3. Query parameter: token / adminToken
  if (req.query) {
    if (req.query.token && typeof req.query.token === "string") return req.query.token.trim();
    if (req.query.adminToken && typeof req.query.adminToken === "string") return req.query.adminToken.trim();
  }

  // 4. Request payload: adminToken / token
  if (body) {
    if (body.adminToken && typeof body.adminToken === "string") return body.adminToken.trim();
    if (body.token && typeof body.token === "string") return body.token.trim();
  }

  // 5. Cookie: admin_session=<token>
  const cookieHeader = req.headers && req.headers.cookie;
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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 1. RESOLVE SERVER ENVIRONMENT & CREDENTIALS
  // ────────────────────────────────────────────────────────────────────────
  loadLocalEnv();

  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim())
    || (process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY.trim())
    || "sb_publishable_UZ1WSWZHyaij07xleBgSxw_YBn7-lAx";

  const supabaseUrl = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim())
    || "https://dvacxeooaqxwldszqpek.supabase.co";

  try {
    const body = req.body || {};
    const targetUuid = String((req.query && (req.query.id || req.query.uuid)) || body.id || body.uuid || "").trim();

    // ────────────────────────────────────────────────────────────────────────
    // 2. VALIDATE SINGLE-WISH TARGET UUID IF PROVIDED
    // ────────────────────────────────────────────────────────────────────────
    if (targetUuid) {
      if (targetUuid.toLowerCase() === SYSTEM_CONFIG_UUID) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: Cannot access protected system configuration record."
        });
      }

      if (!UUID_REGEX.test(targetUuid)) {
        return res.status(400).json({
          success: false,
          error: "Invalid UUID format."
        });
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. FETCH SECURITY ROW & VERIFY ADMIN SESSION TOKEN
    // ────────────────────────────────────────────────────────────────────────
    const fetchSecRes = await fetch(
      `${supabaseUrl}/rest/v1/wishes?id=eq.${SYSTEM_CONFIG_UUID}&select=admin_password_hash,admin_password_salt,pass_code,memory_text`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`
        }
      }
    );

    if (!fetchSecRes.ok) {
      return res.status(500).json({
        success: false,
        error: "Failed to verify database security configuration."
      });
    }

    const secRecords = await fetchSecRes.json();
    const secRow = (Array.isArray(secRecords) && secRecords[0]) || {};

    const token = extractToken(req, body);
    const isAuthorized = verifyAdminSessionToken(token, secRow);

    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or expired admin session token."
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. EXECUTE PRIVILEGED READ IN SUPABASE
    // ────────────────────────────────────────────────────────────────────────
    if (targetUuid) {
      // 4A. Single Wish Read (Quick View / Wish Studio)
      const singleRes = await fetch(
        `${supabaseUrl}/rest/v1/wishes?id=eq.${encodeURIComponent(targetUuid)}&select=*`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!singleRes.ok) {
        return res.status(500).json({
          success: false,
          error: "Database query failed for requested wish."
        });
      }

      const rows = await singleRes.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Wish record not found."
        });
      }

      return res.status(200).json({
        success: true,
        data: rows[0]
      });
    } else {
      // 4B. Bulk Wishes Read (Admin Overview / Wishes Table)
      const bulkRes = await fetch(
        `${supabaseUrl}/rest/v1/wishes?id=neq.${SYSTEM_CONFIG_UUID}&select=*&order=created_at.desc`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!bulkRes.ok) {
        return res.status(500).json({
          success: false,
          error: "Database query failed for wishes collection."
        });
      }

      const wishes = await bulkRes.json();
      const safeWishes = Array.isArray(wishes) ? wishes : [];

      return res.status(200).json({
        success: true,
        data: safeWishes,
        total: safeWishes.length
      });
    }
  } catch (err) {
    console.error("❌ Admin Wishes API Exception:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error reading admin wishes."
    });
  }
}
