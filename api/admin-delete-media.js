/**
 * ============================================================================
 * VERCEL SERVERLESS ADMIN DELETE MEDIA API (api/admin-delete-media.js)
 * Executes privileged media file deletion in Supabase Storage bucket 'wish-media'
 * after verifying the caller's cryptographic Admin Session Token.
 *
 * SECURITY INVARIANTS:
 * 1. Strictly requires process.env.SUPABASE_SERVICE_ROLE_KEY for execution.
 *    ZERO fallback to anon or publishable keys.
 * 2. Requires valid HMAC-SHA256 Admin Session Token (cookie, header, or body).
 * 3. Unauthenticated / public requests are strictly rejected with 401 Unauthorized.
 * 4. Path validation: only paths belonging to 'photos/', 'videos/', or 'audio/'
 *    inside 'wish-media' bucket are permitted.
 * 5. Rejects local assets, external URLs, Data URLs, and traversal patterns.
 * 6. Uses server-side credentials only (process.env); never exposes secrets to browser.
 * ============================================================================
 */

import { verifyAdminSessionToken, loadLocalEnv } from "./_session.js";

const BUCKET_NAME = "wish-media";
const SYSTEM_CONFIG_UUID = "00000000-0000-0000-0000-000000000001";
const VALID_FOLDER_PREFIX_REGEX = /^(photos|videos|audio)\/[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+$/;
const MAX_MEDIA_BULK_LIMIT = 100;
const DELETE_RATE_LIMITS = new Map();
const MAX_DELETE_REQUESTS_PER_MINUTE = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/**
 * Extracts session token from headers, cookies, or request payload.
 * @param {Object} req - HTTP request object.
 * @param {Object} body - Parsed request body.
 * @returns {string|null} Token or null.
 */
function extractToken(req, body) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.trim().split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      return parts[1];
    }
  }

  const customHeader = req.headers["x-admin-token"];
  if (customHeader && typeof customHeader === "string") {
    return customHeader.trim();
  }

  if (body && body.adminToken && typeof body.adminToken === "string") {
    return body.adminToken.trim();
  }

  const cookieHeader = req.headers.cookie;
  if (cookieHeader && typeof cookieHeader === "string") {
    const match = cookieHeader.match(/admin_session=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

/**
 * Validates and normalizes a storage path.
 * @param {string} rawPath
 * @returns {string|null}
 */
function validateStoragePath(rawPath) {
  if (!rawPath || typeof rawPath !== "string") return null;
  let p = rawPath.trim();

  // Reject traversal or protocol injection
  if (p.includes("..") || p.includes("\\") || p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:")) {
    return null;
  }

  // Remove leading/trailing slashes
  p = p.replace(/^\/+/, "").replace(/\/+$/, "");

  // If path starts with bucket name prefix, strip it
  if (p.startsWith(`${BUCKET_NAME}/`)) {
    p = p.substring(BUCKET_NAME.length + 1);
  }

  // Check valid folder prefix
  if (p.startsWith("photos/") || p.startsWith("videos/") || p.startsWith("audio/")) {
    const parts = p.split("/");
    if (parts.length === 2 && parts[1] && parts[1] !== ".emptyFolderPlaceholder") {
      return p;
    }
  }

  return null;
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

  // Rate Limiting Protection (Sliding Window per IP)
  const clientIp = (req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "127.0.0.1").split(",")[0].trim();
  const now = Date.now();
  const ipRecord = DELETE_RATE_LIMITS.get(clientIp) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > ipRecord.resetTime) {
    ipRecord.count = 0;
    ipRecord.resetTime = now + RATE_LIMIT_WINDOW_MS;
  }

  if (ipRecord.count >= MAX_DELETE_REQUESTS_PER_MINUTE) {
    const waitSec = Math.ceil((ipRecord.resetTime - now) / 1000);
    return res.status(429).json({
      success: false,
      error: `Media deletion rate limit exceeded. Please wait ${waitSec}s before retrying.`
    });
  }

  ipRecord.count += 1;
  DELETE_RATE_LIMITS.set(clientIp, ipRecord);

  loadLocalEnv();

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  if (!serviceRoleKey) {
    console.error("❌ Admin Delete Media API Error: Missing SUPABASE_SERVICE_ROLE_KEY server environment variable.");
    return res.status(500).json({
      success: false,
      error: "Server storage configuration unavailable."
    });
  }

  const supabaseUrl = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim()) || "https://dvacxeooaqxwldszqpek.supabase.co";

  try {
    const body = req.body || {};
    const rawPaths = Array.isArray(body.paths)
      ? body.paths
      : (typeof body.path === "string" ? [body.path] : []);

    if (rawPaths.length === 0) {
      return res.status(400).json({ success: false, error: "No media paths provided for deletion." });
    }

    if (rawPaths.length > MAX_MEDIA_BULK_LIMIT) {
      return res.status(400).json({
        success: false,
        error: `Bulk deletion request exceeds maximum allowed limit of ${MAX_MEDIA_BULK_LIMIT} files per request.`
      });
    }

    const validPaths = [];
    const invalidPaths = [];

    for (const rp of rawPaths) {
      const valid = validateStoragePath(rp);
      if (valid) {
        if (!validPaths.includes(valid)) validPaths.push(valid);
      } else {
        invalidPaths.push({ path: String(rp || ""), error: "Invalid storage path or folder prefix" });
      }
    }

    if (validPaths.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid storage paths provided for deletion.",
        failedPaths: invalidPaths
      });
    }

    // Verify Admin Session Token
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

    const token = extractToken(req, body);
    const isAuthorized = verifyAdminSessionToken(token, secRow);

    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or expired admin session token."
      });
    }

    // Execute privileged Storage deletion via Supabase REST API
    const deleteRes = await fetch(
      `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}`,
      {
        method: "DELETE",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prefixes: validPaths })
      }
    );

    if (!deleteRes.ok) {
      const errText = typeof deleteRes.text === "function" ? await deleteRes.text() : "";
      return res.status(deleteRes.status || 500).json({
        success: false,
        error: `Supabase Storage deletion failed: ${errText}`,
        deletedPaths: [],
        failedPaths: validPaths.map(p => ({ path: p, error: errText }))
      });
    }

    const deleteData = await deleteRes.json().catch(() => []);
    const deletedNames = Array.isArray(deleteData) ? deleteData.map(d => d.name) : [];
    
    // Matched deleted paths
    const deletedPaths = validPaths.filter(p => deletedNames.some(dn => dn === p || dn.endsWith(`/${p}`) || p.endsWith(dn)));
    const unremovedPaths = validPaths.filter(p => !deletedPaths.includes(p));

    const failedPaths = [
      ...invalidPaths,
      ...unremovedPaths.map(p => ({ path: p, error: "Object was not returned by storage remove operation" }))
    ];

    return res.status(200).json({
      success: deletedPaths.length > 0 || failedPaths.length === 0,
      message: `Deleted ${deletedPaths.length} storage file(s) successfully.`,
      deletedCount: deletedPaths.length,
      deletedPaths: deletedPaths.length > 0 ? deletedPaths : validPaths,
      failedPaths
    });
  } catch (err) {
    console.error("❌ Admin Delete Media API Error:", err);
    return res.status(500).json({ success: false, error: "Internal Server Error during media deletion." });
  }
}
