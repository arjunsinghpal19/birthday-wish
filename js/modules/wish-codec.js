/**
 * ============================================================================
 * WISH PAYLOAD CODEC & SERIALIZATION ENGINE (js/modules/wish-codec.js)
 * ============================================================================
 *
 * FILE:
 *   js/modules/wish-codec.js
 *
 * RESPONSIBILITY:
 *   Handles client-side payload serialization, publish-payload sanitization,
 *   and legacy Base64 deserialization for Birthday Wish configuration data.
 *
 * WHY THIS MODULE EXISTS:
 *   These functions were previously embedded in js/app.js.
 *   They are now extracted into a dedicated codec module because they perform
 *   pure data transformation and encoding/decoding math rather than application
 *   orchestration, event management, or DOM rendering.
 *
 * ============================================================================
 * COMPLETE APPLICATION DATA FLOWS
 * ============================================================================
 *
 * 1. CREATOR PREVIEW / NON-PERSISTED FLOW (Base64 URL Parameter):
 *   Editor / Customizer
 *        │
 *        ▼
 *     [CONFIG] (In-memory application state)
 *        │
 *        ▼
 *   buildPublishConfig(CONFIG)
 *        │ (Compares against template defaults, strips blob: URLs & draft metadata)
 *        ▼
 *   [publishConfig]
 *        │
 *        ▼
 *   encodeWishData(publishConfig)
 *        │ (Compresses keys to n, c, y, m, d, etc., and produces URL-safe Base64)
 *        ▼
 *   ?w={token}&name={name}
 *
 *
 * 2. CREATOR PERSISTED FLOW (Supabase Database UUID Link):
 *   Editor / Customizer
 *        │
 *        ▼
 *     [CONFIG] (In-memory application state)
 *        │
 *        ▼
 *   buildPublishConfig(CONFIG)
 *        │
 *        ▼
 *   [publishConfig]
 *        │
 *        ▼
 *   window.ShareModule.buildShareUrl(publishConfig, name, { persist: true })
 *        │
 *        ▼ (Calls window.DatabaseModule.saveWish(publishConfig))
 *   ?w={uuid}&name={name}
 *
 *
 * 3. RECIPIENT LEGACY BASE64 ROUTING FLOW:
 *   Recipient opens URL: ?w={base64_token}
 *        │
 *        ▼
 *   boot() in js/app.js ──> parseQueryParams()
 *        │
 *        ▼
 *   decodeWishData(tokenParam) (or via window.ShareModule.parseRoute)
 *        │ (Restores URL chars, decodes Base64, and parses JSON)
 *        ▼
 *   [decoded payload object]
 *        │
 *        ▼
 *   Hydrate [CONFIG] in js/app.js
 *        │
 *        ▼
 *   populateContent() & Live Renderers
 *        │
 *        ▼
 *   Recipient views customized Birthday Wish experience!
 *
 *
 * 4. RECIPIENT PERSISTED UUID ROUTING FLOW:
 *   Recipient opens URL: ?w={uuid}
 *        │
 *        ▼
 *   boot() in js/app.js ──> parseQueryParams()
 *        │
 *        ▼
 *   window.ShareModule.parseRoute() ──> window.DatabaseModule.getWishById(uuid)
 *        │
 *        ▼
 *   [database record] ──> Hydrate [CONFIG] ──> populateContent()
 *
 *
 * ============================================================================
 * COMPRESSED KEY MAPPING CONTRACT (PERMANENT BACKWARD COMPATIBILITY)
 * ============================================================================
 * The single and two-letter key compression dictionary in encodeWishData() is a
 * permanent shared-link protocol contract. These mappings MUST NEVER be renamed
 * or deleted, as doing so would permanently break legacy wish links:
 *
 *   Key   Full Property Name   Data Type   Description
 *   ───   ──────────────────   ─────────   ─────────────────────────────────────────────
 *   n     name                 String      Recipient display name
 *   c     passcode.code        String      4-digit secret door passcode
 *   y     birthDate.year       Number      Birth year (e.g. 2001)
 *   m     birthDate.month      Number      Birth month (1-12)
 *   d     birthDate.day        Number      Birth day (1-31)
 *   f     from                 String      Sender / signature name
 *   mem   memory               String      Featured memory paragraph text
 *   cf    cakeFlavor           String      Interactive cake flavor theme key
 *   lf    letterFont           String      Selected letter typography key
 *   lt    letterTheme          String      Selected letter visual theme key
 *   gft   gift                 Object      Gift box payload { message, coupon }
 *   msc   music                Object      Background music { f: file, t: startTime }
 *   v     videoWish            Object      Video surprise { u: url, t: startTime }
 *   l     letterLines          Array       Array of letter text paragraph strings
 *   r     reasons              Array       Array of reasons objects { icon, text }
 *   w     wishes               Array       Array of inspirational quote strings
 *   t     timeline             Array       Array of milestone objects { year, title, desc }
 *   g     gallery              Array       Array of photo items { img, e, rot, c, n }
 *
 * ============================================================================
 * ARCHITECTURAL CONTRACT & ISOLATION
 * ============================================================================
 * - Consumers: js/app.js (buildRecipientShareUrl, parseQueryParams), js/share.js
 * - Public API: window.encodeWishData, window.buildPublishConfig, window.decodeWishData
 * - DOM Access: NONE (0 DOM interactions)
 * - Database Access: NONE (0 database writes or reads)
 * - Storage Access: NONE (0 localStorage / IndexedDB access)
 * - Network Access: NONE (0 fetch / XMLHttpRequest calls)
 * - Execution Model: 100% synchronous, non-blocking, zero Promises
 * - Dependencies: Native Base64 (btoa/atob), JSON, encodeURIComponent, window.DEFAULT_CONFIG_BACKUP
 * ============================================================================
 */

(function (root) {
  "use strict";

  /**
   * --------------------------------------------------------------------------
   * encodeWishData(dataObj)
   * --------------------------------------------------------------------------
   * PURPOSE:
   *   Serializes a sanitized wish configuration object into a compact,
   *   URL-safe Base64 token using the compressed single/two-letter key dictionary.
   *
   * INPUT:
   *   @param {Object|string} dataObj - Sanitized wish configuration object (or string name).
   *
   * OUTPUT:
   *   @returns {string} URL-safe Base64 token string, or "" if empty/invalid.
   *
   * CALLED BY:
   *   - js/share.js → generateShareableUrl() (Base64 fallback)
   *   - js/app.js → buildRecipientShareUrl() (Client-side URL generation)
   *
   * COMPATIBILITY & SAFETY:
   *   - Automatically strips local blob: URLs from music, video, and gallery items.
   *   - Replaces '+' with '-', '/' with '_', and strips '=' padding for clean URLs.
   *   - Returns empty string if payload contains no custom fields beyond default name.
   */
  function encodeWishData(dataObj) {
    try {
      let payload = {};
      if (typeof dataObj === "object" && dataObj !== null) {
        const target = dataObj;
        if (target.name) payload.n = target.name;
        if (target.passcode?.code && target.passcode.code !== "1234") payload.c = target.passcode.code;
        if (target.birthDate?.year && target.birthDate.year !== 2001) payload.y = target.birthDate.year;
        if (target.birthDate?.month && target.birthDate.month !== 1) payload.m = target.birthDate.month;
        if (target.birthDate?.day && target.birthDate.day !== 1) payload.d = target.birthDate.day;
        if (target.from && target.from !== "your friends who adore you") payload.f = target.from;
        if (target.memory && !target.memory.includes("That one late night we didn't plan anything")) payload.mem = target.memory;
        if (target.cakeFlavor && target.cakeFlavor !== "default") payload.cf = target.cakeFlavor;
        if (target.letterFont && target.letterFont !== "default") payload.lf = target.letterFont;
        if (target.letterTheme && target.letterTheme !== "default") payload.lt = target.letterTheme;
        if (target.gift && typeof target.gift === "object") {
          payload.gft = target.gift;
        }
        if (target.music?.file && typeof target.music.file === "string" && !target.music.file.startsWith("blob:")) {
          payload.msc = { f: target.music.file, t: target.music.startTime || "" };
        }
        const vTarget = target.videoWish?.url || target.videoWish?.file || "";
        if (vTarget && typeof vTarget === "string" && !vTarget.startsWith("blob:")) {
          payload.v = { u: vTarget, t: target.videoWish?.startTime || "" };
        }

        if (target.letterLines && Array.isArray(target.letterLines) && target.letterLines.length > 0) {
          payload.l = target.letterLines;
        }
        if (target.reasons && Array.isArray(target.reasons) && target.reasons.length > 0) {
          payload.r = target.reasons;
        }
        if (target.wishes && Array.isArray(target.wishes) && target.wishes.length > 0) {
          payload.w = target.wishes;
        }
        if (target.timeline && Array.isArray(target.timeline) && target.timeline.length > 0) {
          payload.t = target.timeline;
        }

        if (target.gallery && Array.isArray(target.gallery) && target.gallery.length > 0) {
          payload.g = target.gallery.map(item => ({
            img: (item.image && typeof item.image === "string" && !item.image.startsWith("blob:")) ? item.image : null,
            e: item.emoji || "🎈",
            rot: item.rot || 0,
            c: item.cap || "",
            n: item.secretNote || ""
          }));
        }
      } else {
        payload = { n: dataObj };
      }

      const keys = Object.keys(payload);
      if (keys.length === 0 || (keys.length === 1 && keys[0] === "n")) {
        return "";
      }

      const str = JSON.stringify(payload);
      return btoa(encodeURIComponent(str))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
    } catch (e) {
      return "";
    }
  }

  /**
   * --------------------------------------------------------------------------
   * buildPublishConfig(sourceConfig)
   * --------------------------------------------------------------------------
   * PURPOSE:
   *   Constructs a clean, publish-only configuration payload by comparing the current
   *   in-memory configuration against template defaults (window.DEFAULT_CONFIG_BACKUP).
   *
   * BEHAVIOR & RULES:
   *   1. Source configuration is read from `sourceConfig` or falls back to global `CONFIG`.
   *   2. Default values matching `window.DEFAULT_CONFIG_BACKUP` are omitted from the output.
   *   3. Customized values (name, from, birthDate, passcode, font, theme, flavor) are retained.
   *   4. Dynamic arrays (letterLines, reasons, wishes, gallery, timeline) are deep-cloned.
   *   5. Local draft blob: URLs are excluded so remote recipients receive clean URLs.
   *   6. The source object or global CONFIG is NEVER mutated.
   *
   * INPUT:
   *   @param {Object} [sourceConfig] - Source configuration object to extract publish state from.
   *
   * OUTPUT:
   *   @returns {Object} Sanitized, clone-isolated publish configuration payload.
   *
   * CALLED BY:
   *   - js/app.js → buildRecipientShareUrl()
   */
  function buildPublishConfig(sourceConfig) {
    const src = sourceConfig || (typeof CONFIG !== "undefined" ? CONFIG : {});
    if (!src || typeof src !== "object") return {};

    const def = (typeof window !== "undefined" && window.DEFAULT_CONFIG_BACKUP) || src;
    const payload = {};

    // 1. Recipient Name (Always published if present)
    if (typeof src.name === "string" && src.name.trim()) {
      payload.name = src.name.trim();
    }

    // 2. Sender Name (Only if customized from template default)
    if (typeof src.from === "string" && src.from !== def.from) {
      payload.from = src.from;
    }

    // 3. Birth Date (Only if customized from template default)
    if (src.birthDate && typeof src.birthDate === "object") {
      const isDefYear = def.birthDate && src.birthDate.year === def.birthDate.year;
      const isDefMonth = def.birthDate && src.birthDate.month === def.birthDate.month;
      const isDefDay = def.birthDate && src.birthDate.day === def.birthDate.day;
      if (!isDefYear || !isDefMonth || !isDefDay) {
        payload.birthDate = {
          year: src.birthDate.year,
          month: src.birthDate.month,
          day: src.birthDate.day
        };
      }
    }

    // 4. Passcode (Only if customized from template default)
    if (src.passcode?.code && def.passcode?.code && src.passcode.code !== def.passcode.code) {
      payload.passcode = { code: src.passcode.code };
    }

    // 5. Letter Lines (Always publish if present)
    if (Array.isArray(src.letterLines)) {
      payload.letterLines = [ ...src.letterLines ];
    }

    // 6. Memory Paragraph (Only if customized from template default)
    if (typeof src.memory === "string" && src.memory !== def.memory) {
      payload.memory = src.memory;
    }

    // 7. Reasons Grid (Always publish if present)
    if (Array.isArray(src.reasons)) {
      payload.reasons = JSON.parse(JSON.stringify(src.reasons));
    }

    // 8. Wishes Array (Always publish if present)
    if (Array.isArray(src.wishes)) {
      payload.wishes = [ ...src.wishes ];
    }

    // 9. Gallery Deck (Always preserve publishable items, stripping out local blob: URLs)
    if (Array.isArray(src.gallery) && src.gallery.length > 0) {
      payload.gallery = src.gallery.map(item => ({
        image: (item.image && typeof item.image === "string" && !item.image.startsWith("blob:")) ? item.image : (item._localDraft || null),
        emoji: item.emoji || "🎈",
        rot: item.rot || 0,
        cap: item.cap || "",
        secretNote: item.secretNote || ""
      }));
    }

    // 10. Milestone Timeline (Always preserve timeline if present)
    if (Array.isArray(src.timeline) && src.timeline.length > 0) {
      payload.timeline = JSON.parse(JSON.stringify(src.timeline));
    }

    // 11. Gift Section (Always preserve gift message & coupon if present)
    if (src.gift && typeof src.gift === "object") {
      payload.gift = {
        message: src.gift.message || "",
        coupon: src.gift.coupon || ""
      };
    }

    // 12. Remote Public Media URLs (Exclude local blob: URLs)
    if (src.music?.file && typeof src.music.file === "string" && !src.music.file.startsWith("blob:")) {
      payload.music = { file: src.music.file, startTime: src.music.startTime || "" };
    }

    const videoTarget = src.videoWish?.url || src.videoWish?.file || "";
    if (videoTarget && typeof videoTarget === "string" && !videoTarget.startsWith("blob:")) {
      payload.videoWish = { url: videoTarget, startTime: src.videoWish?.startTime || "" };
    }

    // 13. Styling Options (Only if customized from template default)
    if (src.letterFont && def.letterFont && src.letterFont !== def.letterFont) payload.letterFont = src.letterFont;
    if (src.letterTheme && def.letterTheme && src.letterTheme !== def.letterTheme) payload.letterTheme = src.letterTheme;
    if (src.cakeFlavor && def.cakeFlavor && src.cakeFlavor !== def.cakeFlavor) payload.cakeFlavor = src.cakeFlavor;

    // 14. Active Wish UUID Identity (Preserved if present)
    if (src._activeWishUuid) {
      payload._activeWishUuid = src._activeWishUuid;
    }

    return payload;
  }

  /**
   * --------------------------------------------------------------------------
   * decodeWishData(token)
   * --------------------------------------------------------------------------
   * PURPOSE:
   *   Deserializes a URL-safe Base64 token back into a decoded JavaScript object.
   *
   * PIPELINE:
   *   URL token string
   *        │
   *        ▼
   *   URL-safe character substitution ('-' → '+', '_' → '/')
   *        │
   *        ▼
   *   Base64 padding restoration (appends '=' until length % 4 === 0)
   *        │
   *        ▼
   *   atob()
   *        │
   *        ▼
   *   decodeURIComponent()
   *        │
   *        ▼
   *   JSON.parse()
   *        │
   *        ▼
   *   Decoded JavaScript wish payload object (or null on failure)
   *
   * INPUT:
   *   @param {string} token - URL Base64 token from ?w={token}.
   *
   * OUTPUT:
   *   @returns {Object|null} Decoded wish payload dictionary, or null if corrupt/invalid.
   *
   * CALLED BY:
   *   - js/share.js → parseWishRoute()
   *   - js/app.js → parseQueryParams()
   */
  function decodeWishData(token) {
    try {
      if (typeof token !== "string" || !token.trim()) return null;
      let base64 = token.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) base64 += "=";
      const str = decodeURIComponent(atob(base64));
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }

  // ============================================================
  // PUBLIC API EXPOSURE ON WINDOW / ROOT
  // ============================================================

  root.encodeWishData = encodeWishData;
  root.buildPublishConfig = buildPublishConfig;
  root.decodeWishData = decodeWishData;

})(typeof window !== "undefined" ? window : globalThis);
