/**
 * ============================================================================
 * SECURE ADMIN WISH DUPLICATE API (api/admin-duplicate-wish.js)
 * Privileged Serverless Endpoint for Master Administrator Wish Duplication.
 * Executes server-side duplication using SUPABASE_SERVICE_ROLE_KEY.
 * Strictly verifies HMAC Admin Session Token.
 *
 * SECURITY INVARIANTS:
 * 1. Strictly requires process.env.SUPABASE_SERVICE_ROLE_KEY for execution.
 * 2. Requires valid HMAC-SHA256 Admin Session Token (x-admin-token, header, or body).
 * 3. Unauthenticated / public requests are strictly rejected with 401 Unauthorized.
 * 4. Master system config row (00000000-0000-0000-0000-000000000001) is protected
 *    with 403 Forbidden.
 * 5. Generates server-side cryptographic UUID (crypto.randomUUID()).
 * 6. Explicitly sets owner_id = null (unowned wish).
 * 7. Appends " (Copy)" to recipient_name.
 * 8. Never exposes service-role credentials to browser.
 * ============================================================================
 */

import crypto from "crypto";
import { verifyAdminSessionToken, loadLocalEnv } from "./session.js";

const SYSTEM_CONFIG_UUID = "00000000-0000-0000-0000-000000000001";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Extracts session token from headers, body, or cookies.
 * @param {Object} req - HTTP request object.
 * @param {Object} body - Parsed request body.
 * @returns {string} Token or empty string.
 */
function extractToken(req, body = {}) {
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const customHeader = req.headers["x-admin-token"] || req.headers["X-Admin-Token"] || "";
  if (customHeader) {
    return String(customHeader).trim();
  }
  if (body.adminToken && typeof body.adminToken === "string") {
    return body.adminToken.trim();
  }
  if (body.token && typeof body.token === "string") {
    return body.token.trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader && typeof cookieHeader === "string") {
    const match = cookieHeader.match(/admin_session=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return "";
}

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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-token");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  // ────────────────────────────────────────────────────────────────────────
  // 1. RESOLVE SERVER ENVIRONMENT & PRIVILEGED CREDENTIALS
  // ────────────────────────────────────────────────────────────────────────
  loadLocalEnv();

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  if (!serviceRoleKey) {
    console.error("❌ Admin Duplicate API Error: Missing SUPABASE_SERVICE_ROLE_KEY server environment variable.");
    return res.status(500).json({
      success: false,
      error: "Server duplicate configuration unavailable."
    });
  }

  const supabaseUrl = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim())
    || "https://dvacxeooaqxwldszqpek.supabase.co";

  try {
    const body = await parseRequestBody(req);
    const isBulk = Array.isArray(body.uuids);
    const targetUuid = !isBulk
      ? String(body.uuid || body.id || (req.query && (req.query.uuid || req.query.id)) || "").trim()
      : "";

    // ────────────────────────────────────────────────────────────────────────
    // 2. VALIDATE TARGET SOURCE UUID(S)
    // ────────────────────────────────────────────────────────────────────────
    let validUuids = [];
    const failedIds = [];

    if (isBulk) {
      if (body.uuids.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No wish UUIDs provided for duplication.",
          createdCount: 0,
          newWishes: [],
          failedIds: []
        });
      }

      const MAX_BULK_LIMIT = 100;
      if (body.uuids.length > MAX_BULK_LIMIT) {
        return res.status(400).json({
          success: false,
          error: `Bulk duplication request exceeds maximum allowed limit of ${MAX_BULK_LIMIT} wishes per request.`,
          createdCount: 0,
          newWishes: [],
          failedIds: []
        });
      }

      for (const rawId of body.uuids) {
        if (!rawId || typeof rawId !== "string") {
          failedIds.push({ id: String(rawId || ""), error: "Invalid UUID format." });
          continue;
        }
        const cleanId = rawId.trim();
        if (!UUID_REGEX.test(cleanId)) {
          failedIds.push({ id: cleanId, error: "Invalid UUID format." });
          continue;
        }
        if (cleanId.toLowerCase() === SYSTEM_CONFIG_UUID) {
          failedIds.push({ id: cleanId, error: "Forbidden: Cannot duplicate protected system configuration record." });
          continue;
        }
        if (!validUuids.includes(cleanId)) {
          validUuids.push(cleanId);
        }
      }

      if (validUuids.length === 0) {
        const hasOnlySystem = body.uuids.every(id => String(id).trim().toLowerCase() === SYSTEM_CONFIG_UUID);
        if (hasOnlySystem) {
          return res.status(403).json({
            success: false,
            error: "Forbidden: Cannot duplicate protected system configuration record.",
            createdCount: 0,
            newWishes: [],
            failedIds
          });
        }
        return res.status(400).json({
          success: false,
          error: "All provided wish UUIDs are invalid or protected.",
          createdCount: 0,
          newWishes: [],
          failedIds
        });
      }
    } else {
      if (!targetUuid) {
        return res.status(400).json({
          success: false,
          error: "Missing source wish UUID."
        });
      }

      if (!UUID_REGEX.test(targetUuid)) {
        return res.status(400).json({
          success: false,
          error: "Invalid UUID format."
        });
      }

      if (targetUuid.toLowerCase() === SYSTEM_CONFIG_UUID) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: Cannot duplicate protected system configuration record."
        });
      }

      validUuids = [targetUuid];
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
    // 4. READ SOURCE WISHES VIA SERVICE ROLE
    // ────────────────────────────────────────────────────────────────────────
    const sourceQuery = isBulk
      ? `${supabaseUrl}/rest/v1/wishes?id=in.(${validUuids.join(",")})&select=*`
      : `${supabaseUrl}/rest/v1/wishes?id=eq.${encodeURIComponent(targetUuid)}&select=*`;

    const sourceRes = await fetch(sourceQuery, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    });

    if (!sourceRes.ok) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch source wish record(s)."
      });
    }

    const records = await sourceRes.json();
    if (!Array.isArray(records) || records.length === 0) {
      if (!isBulk) {
        return res.status(404).json({
          success: false,
          error: "Source wish not found."
        });
      }
      return res.status(404).json({
        success: false,
        error: "No matching source wish records found to duplicate.",
        createdCount: 0,
        newWishes: [],
        failedIds: validUuids.map(id => ({ id, error: "Source record not found in database." }))
      });
    }

    // Check for missing records in bulk mode
    if (isBulk) {
      const foundIds = new Set(records.map(r => r.id));
      for (const id of validUuids) {
        if (!foundIds.has(id)) {
          failedIds.push({ id, error: "Source record not found in database." });
        }
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 5. GENERATE NEW UUIDs SERVER-SIDE & PREPARE DUPLICATE PAYLOADS
    // ────────────────────────────────────────────────────────────────────────
    const duplicatePayloads = records.map(source => {
      const newId = crypto.randomUUID();
      const originalRecipient = (source.recipient_name && source.recipient_name.trim()) || "Friend";

      return {
        id: newId,
        recipient_name: `${originalRecipient} (Copy)`,
        sender_name: source.sender_name || "",
        pass_code: source.pass_code || "1234",
        birth_date: source.birth_date || { year: 2001, month: 1, day: 1 },
        letter_lines: Array.isArray(source.letter_lines) ? source.letter_lines : (source.letter_lines || []),
        memory_text: source.memory_text || "",
        reasons_json: Array.isArray(source.reasons_json) ? source.reasons_json : (source.reasons_json || []),
        wishes_json: Array.isArray(source.wishes_json) ? source.wishes_json : (source.wishes_json || []),
        gallery_json: Array.isArray(source.gallery_json) ? source.gallery_json : (source.gallery_json || []),
        timeline_json: Array.isArray(source.timeline_json) ? source.timeline_json : (source.timeline_json || []),
        gift_json: (source.gift_json && typeof source.gift_json === "object") ? source.gift_json : (source.gift_json || {}),
        music_url: source.music_url || null,
        video_url: source.video_url || null,
        cake_flavor: source.cake_flavor || "default",
        letter_font: source.letter_font || "default",
        letter_theme: source.letter_theme || "default",
        owner_id: null,
        status: source.status || "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    if (duplicatePayloads.length === 0) {
      return res.status(500).json({
        success: false,
        error: "No duplicate records could be prepared.",
        createdCount: 0,
        newWishes: [],
        failedIds
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 6. INSERT DUPLICATES VIA SERVICE ROLE
    // ────────────────────────────────────────────────────────────────────────
    let insertRes = await fetch(
      `${supabaseUrl}/rest/v1/wishes`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(duplicatePayloads)
      }
    );

    if (!insertRes.ok && insertRes.status === 403) {
      const anonKey = process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY.trim();
      if (anonKey) {
        insertRes = await fetch(
          `${supabaseUrl}/rest/v1/wishes`,
          {
            method: "POST",
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal"
            },
            body: JSON.stringify(duplicatePayloads)
          }
        );
      }
    }

    if (!insertRes.ok) {
      const errText = typeof insertRes.text === "function" ? await insertRes.text() : "";
      return res.status(500).json({
        success: false,
        error: `Supabase duplicate insert failed: ${errText}`
      });
    }

    if (!isBulk) {
      return res.status(200).json({
        success: true,
        newId: duplicatePayloads[0].id,
        createdCount: 1,
        newWishes: duplicatePayloads,
        failedIds: []
      });
    }

    return res.status(200).json({
      success: true,
      createdCount: duplicatePayloads.length,
      newWishes: duplicatePayloads,
      failedIds
    });

  } catch (err) {
    console.error("❌ Admin Duplicate API Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error during wish duplication."
    });
  }
}
