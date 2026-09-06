/**
 * ============================================================================
 * VERCEL SERVERLESS ADMIN CUSTOMERS READ API (api/admin-customers.js)
 * Architecture: Phase P4C Admin Customer Management
 *
 * Dedicated serverless endpoint for Master Admin Dashboard customer management.
 * Executes privileged queries against public.customers using SUPABASE_SERVICE_ROLE_KEY
 * on the server side after verifying the caller's cryptographic Admin Session Token.
 *
 * SECURITY INVARIANTS:
 * 1. Strictly requires a valid HMAC-SHA256 Admin Session Token (cookie, header, query, body).
 * 2. Uses process.env.SUPABASE_SERVICE_ROLE_KEY server-side only; ZERO key exposure to browser.
 * 3. Returns customer profiles with accurate wish counts via foreign key join.
 * ============================================================================
 */

import { verifyAdminSessionToken, loadLocalEnv } from "./_session.js";

const SYSTEM_CONFIG_UUID = "00000000-0000-0000-0000-000000000001";

/**
 * Extracts Admin Session Token from Authorization header, custom headers,
 * query parameters, request body, or HTTP cookies.
 * @param {Object} req - HTTP request object.
 * @param {Object} [body={}] - Parsed request body.
 * @returns {string|null} Extracted token or null.
 */
function extractToken(req, body = {}) {
  const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.trim().split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      return parts[1];
    }
  }

  const customHeader = req.headers && req.headers["x-admin-token"];
  if (customHeader && typeof customHeader === "string") {
    return customHeader.trim();
  }

  if (req.query) {
    if (req.query.token && typeof req.query.token === "string") return req.query.token.trim();
    if (req.query.adminToken && typeof req.query.adminToken === "string") return req.query.adminToken.trim();
  }

  if (body) {
    if (body.adminToken && typeof body.adminToken === "string") return body.adminToken.trim();
    if (body.token && typeof body.token === "string") return body.token.trim();
  }

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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-token");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  // 1. Resolve Server Environment & Credentials
  loadLocalEnv();

  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim())
    || (process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY.trim());

  if (!serviceRoleKey) {
    return res.status(500).json({ success: false, error: "Server configuration error: missing database credentials." });
  }

  const supabaseUrl = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim())
    || "https://dvacxeooaqxwldszqpek.supabase.co";

  try {
    const body = req.body || {};

    // 2. Fetch Security Row & Verify Admin Session Token
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
      return res.status(500).json({ success: false, error: "Failed to verify database security configuration." });
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

    // 3. Query Customers with Embedded Wishes Count via Service Role
    const custRes = await fetch(
      `${supabaseUrl}/rest/v1/customers?select=id,email,full_name,avatar_url,account_status,plan_tier,storage_quota_bytes,created_at,last_active_at,wishes(id)&order=created_at.desc`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!custRes.ok) {
      return res.status(500).json({ success: false, error: "Database query failed for customers collection." });
    }

    const customersRaw = await custRes.json();
    const safeCustomers = (Array.isArray(customersRaw) ? customersRaw : []).map(c => {
      const wishList = Array.isArray(c.wishes) ? c.wishes : [];
      return {
        id: c.id,
        email: c.email,
        full_name: c.full_name || "",
        avatar_url: c.avatar_url || null,
        account_status: c.account_status || "active",
        plan_tier: c.plan_tier || "free",
        storage_quota_bytes: c.storage_quota_bytes,
        created_at: c.created_at,
        last_active_at: c.last_active_at,
        total_wishes: wishList.length,
        wish_ids: wishList.map(w => w.id)
      };
    });

    return res.status(200).json({
      success: true,
      customers: safeCustomers,
      total: safeCustomers.length
    });

  } catch (err) {
    console.error("❌ Admin Customers API Exception:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error reading admin customers."
    });
  }
}
