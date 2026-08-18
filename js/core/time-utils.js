/**
 * ============================================================================
 * TIME & DURATION PARSING UTILITIES (js/core/time-utils.js)
 * Reusable Helpers for Audio, Video, and Seekbar Time Parsing & Formatting.
 * ============================================================================
 */

(function (root) {
  "use strict";

  /**
   * Parses various time formats (e.g. "30", ":30", "1:15", "1.30", "1m15s") into total integer seconds.
   * @param {number|string} input - Raw time representation.
   * @returns {number} Non-negative integer seconds.
   */
  function parseTimeToSeconds(input) {
    if (typeof input === "number") {
      return isNaN(input) ? 0 : Math.max(0, Math.floor(input));
    }
    if (!input || typeof input !== "string") return 0;
    const str = input.trim();
    if (!str) return 0;

    if (str.includes(":")) {
      const parts = str.split(":");
      const m = parseInt(parts[0], 10) || 0;
      const s = parseInt(parts[1], 10) || 0;
      return Math.max(0, m * 60 + s);
    }
    if (str.includes(".")) {
      const parts = str.split(".");
      const m = parseInt(parts[0], 10) || 0;
      const s = parseInt(parts[1], 10) || 0;
      return Math.max(0, m * 60 + s);
    }
    if (str.includes("m") || str.includes("s")) {
      const mMatch = str.match(/(\d+)m/);
      const sMatch = str.match(/(\d+)s/);
      const m = mMatch ? parseInt(mMatch[1], 10) || 0 : 0;
      const s = sMatch ? parseInt(sMatch[1], 10) || 0 : 0;
      return Math.max(0, m * 60 + s);
    }
    const sec = parseInt(str, 10);
    return isNaN(sec) ? 0 : Math.max(0, sec);
  }

  /**
   * Formats total seconds into MM:SS display format (e.g. 90 -> "01:30").
   * @param {number} seconds - Total seconds.
   * @returns {string} Formatted MM:SS time string.
   */
  function formatSecondsToMMSS(seconds) {
    const total = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const TimeUtils = Object.freeze({
    parseTimeToSeconds,
    formatSecondsToMMSS
  });

  root.TimeUtils = TimeUtils;
  root.parseTimeToSeconds = parseTimeToSeconds;
  root.formatSecondsToMMSS = formatSecondsToMMSS;

})(typeof window !== "undefined" ? window : globalThis);
