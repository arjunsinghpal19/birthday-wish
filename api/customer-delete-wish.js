/**
 * ============================================================================
 * SECURE CUSTOMER WISH DELETION API (api/customer-delete-wish.js)
 * Architecture: Phase P4D Customer Platform Subsystem
 *
 * Dedicated serverless endpoint to safely delete an authenticated customer's
 * celebration record using SUPABASE_SERVICE_ROLE_KEY after verifying GoTrue JWT.
 *
 * CRITICAL ARCHITECTURAL & SECURITY INVARIANTS:
 * 1. Requires valid Customer Bearer JWT in Authorization header.
 * 2. Authenticates user identity via Supabase GoTrue Auth before deletion.
 * 3. Enforces strict tenant isolation:
 *    - Customers can delete ONLY their own wishes (owner_id === authenticatedUserId).
 *    - Customer A CANNOT delete Customer B's wish (403 Forbidden).
 *    - Customers CANNOT delete unowned / Admin wishes (owner_id === null => 403 Forbidden).
 *    - Protected system config row is blocked (403 Forbidden).
 * 4. Executes deletion using SUPABASE_SERVICE_ROLE_KEY with BOTH id AND owner_id.
 * 5. SUPABASE_SERVICE_ROLE_KEY is strictly server-side and never leaked.
 * ============================================================================
 */

import { loadLocalEnv } from "./session.js";

const SYSTEM_CONFIG_UUID = "00000000-0000-0000-0000-000000000001";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Safe body parsing supporting JSON objects, strings, and chunked streams.
 * @param {Object} req - HTTP request object.
 * @returns {Promise<Object>} Parsed body.
 */
async function parseRequestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); } catch (e) { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  // 1. Resolve Server Environment & Credentials
  loadLocalEnv();

  const supabaseUrl = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim())
    || "https://dvacxeooaqxwldszqpek.supabase.co";

  const anonKey = (process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY.trim())
    || "sb_publishable_UZ1WSWZHyaij07xleBgSxw_YBn7-lAx";

  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim())
    || "";

  if (!serviceRoleKey) {
    console.error("❌ Customer Delete Wish API Error: Missing SUPABASE_SERVICE_ROLE_KEY on server.");
    return res.status(500).json({ success: false, error: "Server configuration error: missing database credentials." });
  }

  // 2. Extract Customer Bearer Token
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Unauthorized: Missing customer session token." });
  }

  const customerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!customerToken) {
    return res.status(401).json({ success: false, error: "Unauthorized: Invalid customer session token." });
  }

  try {
    // 3. Verify Customer Identity with Supabase GoTrue Auth
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${customerToken}`
      }
    });

    if (!userRes.ok) {
      return res.status(401).json({ success: false, error: "Unauthorized: Session expired or invalid." });
    }

    const userData = await userRes.json();
    const authenticatedUserId = userData ? userData.id : null;

    if (!authenticatedUserId) {
      return res.status(401).json({ success: false, error: "Unauthorized: Could not verify customer identity." });
    }

    // 4. Validate Target Wish UUID
    const body = await parseRequestBody(req);
    const targetUuid = String(body.uuid || body.id || (req.query && (req.query.uuid || req.query.id)) || "").trim();

    if (!targetUuid) {
      return res.status(400).json({ success: false, error: "Missing celebration UUID." });
    }

    if (!UUID_REGEX.test(targetUuid)) {
      return res.status(400).json({ success: false, error: "Invalid UUID format." });
    }

    if (targetUuid.toLowerCase() === SYSTEM_CONFIG_UUID) {
      return res.status(403).json({ success: false, error: "Forbidden: Cannot delete protected system configuration record." });
    }

    // 5. Fetch Target Wish with Service Role to check ownership
    const getRes = await fetch(
      `${supabaseUrl}/rest/v1/wishes?id=eq.${encodeURIComponent(targetUuid)}&select=id,owner_id`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`
        }
      }
    );

    if (!getRes.ok) {
      return res.status(500).json({ success: false, error: "Failed to query celebration record." });
    }

    const rows = await getRes.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ success: false, error: "Celebration not found." });
    }

    const wish = rows[0];

    // 6. Strict Tenant Isolation Check
    // - Unowned / admin wish (owner_id === null) => 403 Forbidden
    // - Another customer's wish (owner_id !== authenticatedUserId) => 403 Forbidden
    if (!wish.owner_id || wish.owner_id !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: You do not have permission to delete this celebration."
      });
    }

    // 7. Delete Wish using Service Role strictly binding BOTH id AND owner_id
    const deleteRes = await fetch(
      `${supabaseUrl}/rest/v1/wishes?id=eq.${encodeURIComponent(targetUuid)}&owner_id=eq.${encodeURIComponent(authenticatedUserId)}`,
      {
        method: "DELETE",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: "return=minimal"
        }
      }
    );

    if (!deleteRes.ok) {
      const errText = typeof deleteRes.text === "function" ? await deleteRes.text() : "";
      return res.status(500).json({
        success: false,
        error: `Failed to delete celebration record: ${errText}`
      });
    }

    return res.status(200).json({
      success: true,
      message: "Celebration deleted successfully."
    });

  } catch (err) {
    console.error("❌ Customer Delete Wish API Exception:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error while deleting celebration."
    });
  }
}
