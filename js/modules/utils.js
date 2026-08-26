/**
 * ============================================================================
 * MODULE: Utility Functions (js/modules/utils.js)
 *
 * Purpose:
 * Pure reusable helpers used across the birthday application.
 *
 * Owns:
 * - Name formatting (formatName)
 * - Calendar date validation (isValidCalendarDate)
 * - Zodiac sign calculation (getZodiacSign)
 * - Ordinal day formatting (getOrdinalDay)
 * - UTF-8 Mojibake string repair (repairMojibake)
 * - Recursive object text repair (repairObjectText)
 * - CP1252 byte mapping required by text repair (CP1252_BYTES)
 *
 * Does NOT Own:
 * - DOM manipulation
 * - CONFIG state
 * - Rendering
 * - Database
 * - Storage
 * - Audio
 * - Editor state
 * - Routing / Application boot
 * ============================================================================
 */

(function (root) {
  "use strict";

  // ------------------------------------------------------------
  // TEXT ENCODING REPAIR
  // ------------------------------------------------------------

  const CP1252_BYTES = {
    0x20ac: 0x80,
    0x201a: 0x82,
    0x0192: 0x83,
    0x201e: 0x84,
    0x2026: 0x85,
    0x2020: 0x86,
    0x2021: 0x87,
    0x02c6: 0x88,
    0x2030: 0x89,
    0x0160: 0x8a,
    0x2039: 0x8b,
    0x0152: 0x8c,
    0x017d: 0x8e,
    0x2018: 0x91,
    0x2019: 0x92,
    0x201c: 0x93,
    0x201d: 0x94,
    0x2022: 0x95,
    0x2013: 0x96,
    0x2014: 0x97,
    0x02dc: 0x98,
    0x2122: 0x99,
    0x0161: 0x9a,
    0x203a: 0x9b,
    0x0153: 0x9c,
    0x017e: 0x9e,
    0x0178: 0x9f,
  };

  function repairMojibake(value) {
    if (typeof value !== "string" || !/[\u00C2\u00C3\u00E2\u00F0]/.test(value))
      return value;

    let output = value;
    for (
      let pass = 0;
      pass < 3 && /[\u00C2\u00C3\u00E2\u00F0]/.test(output);
      pass++
    ) {
      try {
        const bytes = Uint8Array.from([...output], (char) => {
          const point = char.codePointAt(0);
          return CP1252_BYTES[point] ?? (point <= 255 ? point : 63);
        });

        const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        if (!decoded || decoded === output) break;
        output = decoded;
      } catch (e) {
        break;
      }
    }

    return output;
  }

  function repairObjectText(object) {
    if (!object || typeof object !== "object") return;

    Object.keys(object).forEach((key) => {
      if (typeof object[key] === "string")
        object[key] = repairMojibake(object[key]);
      else if (object[key] && typeof object[key] === "object")
        repairObjectText(object[key]);
    });
  }

  // ------------------------------------------------------------
  // NAME / DATE UTILITIES
  // ------------------------------------------------------------

  function formatName(name) {
    if (!name || typeof name !== "string") return "";
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  function isValidCalendarDate(year, monthIndex, day) {
    if (isNaN(year) || isNaN(monthIndex) || isNaN(day)) return false;
    const curYear = new Date().getFullYear();
    if (year < 1900 || year > curYear + 10) return false;
    if (monthIndex < 0 || monthIndex > 11) return false;
    if (day < 1) return false;
    const maxDays = new Date(year, monthIndex + 1, 0).getDate();
    return day <= maxDays;
  }

  // ------------------------------------------------------------
  // ZODIAC / ORDINAL HELPERS
  // ------------------------------------------------------------

  function getZodiacSign(day, month) {
    const zodiacs = [
      { name: "♑ Capricorn", endDay: 19 },
      { name: "♒ Aquarius", endDay: 18 },
      { name: "♓ Pisces", endDay: 20 },
      { name: "♈ Aries", endDay: 19 },
      { name: "♉ Taurus", endDay: 20 },
      { name: "♊ Gemini", endDay: 20 },
      { name: "♋ Cancer", endDay: 22 },
      { name: "♌ Leo", endDay: 22 },
      { name: "♍ Virgo", endDay: 22 },
      { name: "♎ Libra", endDay: 22 },
      { name: "♏ Scorpio", endDay: 21 },
      { name: "♐ Sagittarius", endDay: 21 },
      { name: "♑ Capricorn", endDay: 31 },
    ];

    if (!month || !day) return "✨ Birthday Star";

    const m = parseInt(month);
    const d = parseInt(day);

    if (m < 1 || m > 12) return "✨ Birthday Star";

    return d <= zodiacs[m - 1].endDay ? zodiacs[m - 1].name : zodiacs[m].name;
  }

  function getOrdinalDay(d) {
    if (!d) return "";
    const n = parseInt(d);
    if (n >= 11 && n <= 13) return n + "th";
    switch (n % 10) {
      case 1: return n + "st";
      case 2: return n + "nd";
      case 3: return n + "rd";
      default: return n + "th";
    }
  }

  let ytApiPromise = null;
  function loadYouTubeIFrameAPI() {
    if (root.YT && root.YT.Player) {
      return Promise.resolve(root.YT);
    }
    if (ytApiPromise) return ytApiPromise;

    ytApiPromise = new Promise((resolve) => {
      if (root.YT && root.YT.Player) {
        return resolve(root.YT);
      }
      const existingScript = document.getElementById("youtube-iframe-api-script");
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api-script";
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else if (document.head) {
          document.head.appendChild(tag);
        }
      }

      const prevOnReady = root.onYouTubeIframeAPIReady;
      root.onYouTubeIframeAPIReady = () => {
        if (typeof prevOnReady === "function") prevOnReady();
        resolve(root.YT);
      };

      const checkInterval = setInterval(() => {
        if (root.YT && root.YT.Player) {
          clearInterval(checkInterval);
          resolve(root.YT);
        }
      }, 200);
    });

    return ytApiPromise;
  }

  // ============================================================
  // LETTER LINE HIGHLIGHT HELPER
  // ============================================================

  /**
   * Auto-highlights featured phrases (e.g., "everything you are") in letter lines
   * by wrapping them with `<span class="highlight">...</span>`.
   *
   * Responsibility:
   *   Scans string content and safely injects highlight span tags without double-wrapping.
   * Input:
   *   @param {string} line - Raw letter sentence or paragraph string.
   * Output / Side Effects:
   *   @returns {string} Formatted HTML string with highlight spans applied.
   * Callers:
   *   - renderLetterBody() in js/modules/renderers.js
   *   - triggerTypewriter() in js/modules/interactive.js
   * Lifecycle:
   *   Runs during letter rendering on page boot, wish customization, and typewriter reveal.
   * Isolation & Safety:
   *   - Pure text transformation utility.
   *   - Performs 0 database writes.
   *   - Does not modify Supabase, UUIDs, audio/video, or admin security state.
   */
  /**
   * ============================================================
   * 9. CANONICAL HTML SANITIZATION UTILITY (Phase 31H-5 P0-A)
   * ============================================================
   * Converts unsafe HTML characters (&, <, >, ", ') into safe HTML entities.
   * Preserves normal Unicode characters, emojis, and valid punctuation.
   *
   * @param {any} str - Input text or value.
   * @returns {string} Sanitized string safe for DOM interpolation.
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function ensureLineHighlight(line) {
    if (!line) return "";
    if (line.includes('class="highlight"') || line.includes("class='highlight'")) {
      return line;
    }
    const safe = escapeHtml(line);
    if (safe.includes("everything you are.")) {
      return safe.replace("everything you are.", '<span class="highlight">everything you are.</span>');
    }
    if (safe.includes("everything you are")) {
      return safe.replace("everything you are", '<span class="highlight">everything you are</span>');
    }
    return safe;
  }

  // Export all public symbols globally on root
  root.repairMojibake = repairMojibake;
  root.repairObjectText = repairObjectText;
  root.formatName = formatName;
  root.isValidCalendarDate = isValidCalendarDate;
  root.getZodiacSign = getZodiacSign;
  root.getOrdinalDay = getOrdinalDay;
  root.loadYouTubeIFrameAPI = loadYouTubeIFrameAPI;
  root.escapeHtml = escapeHtml;
  root.ensureLineHighlight = ensureLineHighlight;

})(typeof window !== "undefined" ? window : globalThis);
