/**
 * ============================================================================
 * ADMIN STUDIO CORE UTILITIES (js/admin/admin-core.js)
 * Provides authoritative shared formatting, toast messaging, and clipboard
 * utilities for the Admin Studio control panel.
 * ============================================================================
 */

(function (window) {
  "use strict";

  /* ============================================================
     ADMIN CORE — FORMATTING
     ============================================================ */
  /**
   * Converts a numeric byte size to human-readable string (B, KB, MB, GB, TB).
   * @param {number} bytes - File size in bytes.
   * @param {number} [decimals=1] - Decimal points to format.
   * @returns {string} Formatted size string.
   */
  function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /* ============================================================
     ADMIN CORE — TOAST
     ============================================================ */
  /**
   * Displays a temporary toast notification in the Admin Studio UI.
   * @param {string} message - Message text to display.
   */
  function showToast(message) {
    const toast = document.getElementById("admin-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  /* ============================================================
     ADMIN CORE — CLIPBOARD
     ============================================================ */
  /**
   * Copies a wish or media URL to the system clipboard with toast feedback.
   * @param {string} url - Target URL to copy.
   */
  function copyWishUrl(url) {
    if (!url) return;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(url).then(() => {
        showToast("📋 Link copied to clipboard!");
      }).catch(() => {
        showToast(`Link: ${url}`);
      });
    } else {
      showToast(`Link: ${url}`);
    }
  }

  /* ============================================================
     EXPORT AUTHORITATIVE NAMESPACE
     ============================================================ */
  window.AdminCore = Object.freeze({
    formatBytes,
    showToast,
    copyWishUrl
  });

})(window);
