/**
 * ============================================================================
 * SECURE QUICK EDITOR WISH UPDATE API (api/quick-update-wish.js)
 * Serverless Endpoint for Quick Editor Unowned Wish Updates.
 * Executes server-side updates using SUPABASE_SERVICE_ROLE_KEY.
 * Verifies wish passcode & unowned status before allowing content updates.
 * ============================================================================
 */

import { loadLocalEnv } from "./_session.js";

const SYSTEM_CONFIG_UUID = "00000000-0000-0000-0000-000000000001";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function encodeMediaUrlWithStart(url, startTime) {
  if (!url || typeof url !== "string") return null;
  const clean = url.trim();
  if (!clean) return null;
  const startSec = parseInt(startTime, 10);
  if (!isNaN(startSec) && startSec > 0) {
    const stripped = clean.replace(/#bw-start=\d+/i, "").replace(/#+$/, "").trim();
    return `${stripped}#bw-start=${startSec}`;
  }
  return clean;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-wish-passcode");
  res.setHeader("Access-Control-Allow-Methods", "PATCH, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "PATCH" && req.method !== "POST") {
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
    const body = await parseRequestBody(req);
    const targetUuid = String((req.query && (req.query.id || req.query.uuid)) || body.id || body.uuid || "").trim();

    // ────────────────────────────────────────────────────────────────────────
    // 2. VALIDATE TARGET UUID
    // ────────────────────────────────────────────────────────────────────────
    if (!targetUuid) {
      return res.status(400).json({
        success: false,
        error: "Missing target wish UUID."
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
        error: "Forbidden: Cannot update protected system configuration record."
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. FETCH EXISTING WISH & VERIFY AUTHORIZATION
    // ────────────────────────────────────────────────────────────────────────
    const fetchExistingRes = await fetch(
      `${supabaseUrl}/rest/v1/wishes?id=eq.${encodeURIComponent(targetUuid)}&select=id,pass_code,owner_id`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`
        }
      }
    );

    if (!fetchExistingRes.ok) {
      return res.status(500).json({
        success: false,
        error: "Failed to verify existing wish record."
      });
    }

    const existingRows = await fetchExistingRes.json();
    if (!Array.isArray(existingRows) || existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Wish record not found."
      });
    }

    const existingWish = existingRows[0];

    // Customer-owned wishes must be managed through authenticated Customer flows
    if (existingWish.owner_id !== null && existingWish.owner_id !== undefined) {
      return res.status(403).json({
        success: false,
        error: "Customer-owned wishes must be edited through the Customer Account."
      });
    }

    // Passcode Authorization Check: Verify candidate passcode against stored pass_code
    const candidatePasscode = String(
      body.passcode ||
      body.pass_code ||
      body.config?.passcode?.code ||
      body.config?.pass_code ||
      req.headers["x-wish-passcode"] ||
      ""
    ).trim();

    const storedPasscode = String(existingWish.pass_code || "1234").trim();

    if (storedPasscode && candidatePasscode !== storedPasscode) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Incorrect wish passcode."
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. SANITIZE & WHITELIST UPDATE FIELDS
    // ────────────────────────────────────────────────────────────────────────
    const payload = body.config || body.record || body;
    const allowedUpdate = {};

    if (payload.recipient_name !== undefined) allowedUpdate.recipient_name = payload.recipient_name;
    else if (payload.name !== undefined) allowedUpdate.recipient_name = payload.name;

    if (payload.sender_name !== undefined) allowedUpdate.sender_name = payload.sender_name;
    else if (payload.from !== undefined) allowedUpdate.sender_name = payload.from;

    if (payload.pass_code !== undefined) allowedUpdate.pass_code = payload.pass_code;
    else if (payload.passcode?.code !== undefined) allowedUpdate.pass_code = payload.passcode.code;

    if (payload.birth_date !== undefined) allowedUpdate.birth_date = payload.birth_date;
    else if (payload.birthDate !== undefined) allowedUpdate.birth_date = payload.birthDate;

    if (payload.letter_lines !== undefined) allowedUpdate.letter_lines = payload.letter_lines;
    else if (payload.letterLines !== undefined) allowedUpdate.letter_lines = payload.letterLines;

    if (payload.memory_text !== undefined) allowedUpdate.memory_text = payload.memory_text;
    else if (payload.memory !== undefined) allowedUpdate.memory_text = payload.memory;

    if (payload.reasons_json !== undefined) allowedUpdate.reasons_json = payload.reasons_json;
    else if (payload.reasons !== undefined) allowedUpdate.reasons_json = payload.reasons;

    if (payload.wishes_json !== undefined) allowedUpdate.wishes_json = payload.wishes_json;
    else if (payload.wishes !== undefined) allowedUpdate.wishes_json = payload.wishes;

    if (payload.gallery_json !== undefined) allowedUpdate.gallery_json = payload.gallery_json;
    else if (payload.gallery !== undefined) allowedUpdate.gallery_json = payload.gallery;

    if (payload.timeline_json !== undefined) allowedUpdate.timeline_json = payload.timeline_json;
    else if (payload.timeline !== undefined) allowedUpdate.timeline_json = payload.timeline;

    if (payload.gift_json !== undefined) allowedUpdate.gift_json = payload.gift_json;
    else if (payload.gift !== undefined) allowedUpdate.gift_json = payload.gift;

    if (payload.cake_flavor !== undefined) allowedUpdate.cake_flavor = payload.cake_flavor;
    else if (payload.cakeFlavor !== undefined) allowedUpdate.cake_flavor = payload.cakeFlavor;

    if (payload.letter_font !== undefined) allowedUpdate.letter_font = payload.letter_font;
    else if (payload.letterFont !== undefined) allowedUpdate.letter_font = payload.letterFont;

    if (payload.letter_theme !== undefined) allowedUpdate.letter_theme = payload.letter_theme;
    else if (payload.letterTheme !== undefined) allowedUpdate.letter_theme = payload.letterTheme;

    if (payload.music_url !== undefined) {
      allowedUpdate.music_url = payload.music_url;
    } else if (payload.music) {
      const rawAudio = payload.music.file || payload.music.url || null;
      allowedUpdate.music_url = encodeMediaUrlWithStart(rawAudio, payload.music.startTime);
    }

    if (payload.video_url !== undefined) {
      allowedUpdate.video_url = payload.video_url;
    } else if (payload.videoWish) {
      const rawVideo = payload.videoWish.url || payload.videoWish.file || null;
      allowedUpdate.video_url = encodeMediaUrlWithStart(rawVideo, payload.videoWish.startTime);
    }

    allowedUpdate.updated_at = new Date().toISOString();

    // ────────────────────────────────────────────────────────────────────────
    // 5. EXECUTE PRIVILEGED UPDATE IN POSTGREST VIA SERVICE ROLE
    // ────────────────────────────────────────────────────────────────────────
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/wishes?id=eq.${encodeURIComponent(targetUuid)}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify(allowedUpdate)
      }
    );

    if (!updateRes.ok) {
      return res.status(500).json({
        success: false,
        error: "Failed to update wish record."
      });
    }

    const updatedRows = await updateRes.json();
    if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Wish record not found."
      });
    }

    return res.status(200).json({
      success: true,
      id: targetUuid
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal server error during wish update."
    });
  }
}
