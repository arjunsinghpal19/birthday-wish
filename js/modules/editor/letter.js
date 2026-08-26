/**
 * ============================================================================
 * MODULE: Customizer Letter Editor (js/modules/editor/letter.js)
 * Phase 6 Extraction
 *
 * Purpose:
 * Owns Customizer Letter Editor UI interactions, letter-line textarea building,
 * letter font & theme selector handlers, and real-time synchronization of edited
 * letter lines into CONFIG state.
 *
 * Owns:
 * - stripHtml()
 * - renderLetterInputs()
 * - syncLetterInputsToConfig()
 * - initLetterEditorListeners()
 *
 * Relationship with other modules:
 * - renderers.js owns updateLetterBody() & updateLetterThemeAndFont() (CONFIG -> visible DOM)
 * - interactive.js owns typeLetterBody() & typewriter lifecycle (window.letterTyped)
 * - app.js orchestrates customizer modal boot & save/apply flows
 * - editor/accordion.js owns accordion section toggling & auto-scroll
 *
 * Existing Hotfix Preservation:
 * - Letter Live Update: Editing .letter-line-input syncs CONFIG and calls updateLetterBody()
 *   instantly without page refresh.
 * - Letter Initial Render / Typewriter Lifecycle: window.letterTyped lifecycle is preserved.
 *   Initial typing is owned by interactive.js; post-typing live edits update visible letter.
 * ============================================================================
 */

(function (root) {
  "use strict";

  // ============================================================
  // HELPER UTILITIES
  // ============================================================

  /**
   * Helper utility stripping HTML markup tags from formatted customizer letter lines.
   * Uses safe tag-stripping to avoid DOM parsing execution vectors.
   * @param {string} html - HTML string.
   * @returns {string} Plain text string.
   */
  function stripHtml(html) {
    if (!html) return "";
    return String(html).replace(/<[^>]*>/g, "");
  }

  /**
   * Safe helper resolving global CONFIG object across window/script scopes.
   */
  function getConfig() {
    if (typeof CONFIG !== "undefined") return CONFIG;
    if (root.CONFIG) return root.CONFIG;
    return {};
  }

  // ============================================================
  // LETTER LINE INPUTS BUILDER
  // ============================================================

  /**
   * Builds and populates .letter-line-input textarea fields inside #letter-inputs-container
   * based on current CONFIG.letterLines array.
   */
  function renderLetterInputs() {
    const container = document.getElementById("letter-inputs-container");
    if (!container) return;
    container.innerHTML = "";
    const cfg = getConfig();
    const lines = Array.isArray(cfg.letterLines) ? cfg.letterLines : [];
    const esc = (root.escapeHtml && typeof root.escapeHtml === "function")
      ? root.escapeHtml
      : (typeof escapeHtml === "function" ? escapeHtml : (s) => (s === null || s === undefined ? "" : String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")));

    lines.forEach((line, i) => {
      const group = document.createElement("div");
      group.className = "form-group";
      const cleanLine = esc(stripHtml(line));
      group.innerHTML = `
        <label>Letter Line ${i + 1}</label>
        <small class="field-hint">Birthday letter ka ${i === 0 ? "pehla" : i === 1 ? "doosra" : i === 2 ? "teesra" : "last"} paragraph</small>
        <textarea class="letter-line-input" rows="2" data-index="${i}">${cleanLine}</textarea>
      `;
      container.appendChild(group);
    });
  }

  // ============================================================
  // LETTER STATE SYNCHRONIZATION
  // ============================================================

  /**
   * Reads values from all .letter-line-input textareas and syncs them into CONFIG.letterLines.
   */
  function syncLetterInputsToConfig() {
    const cfg = getConfig();
    if (!Array.isArray(cfg.letterLines)) return;
    const letterInputs = document.querySelectorAll(".letter-line-input");
    if (letterInputs.length > 0) {
      letterInputs.forEach((input, i) => {
        if (cfg.letterLines[i] !== undefined) {
          cfg.letterLines[i] = input.value;
        }
      });
    }
  }

  // ============================================================
  // LIVE LETTER UPDATE & EVENT LISTENERS
  // ============================================================

  /**
   * Binds live input and change event handlers to letter editor controls
   * (#letter-inputs-container, #input-letter-font, #input-letter-theme).
   */
  function initLetterEditorListeners() {
    const container = document.getElementById("letter-inputs-container");
    if (container) {
      container.addEventListener("input", (e) => {
        if (e.target && e.target.classList && e.target.classList.contains("letter-line-input")) {
          syncLetterInputsToConfig();
          const updateFn = root.updateLetterBody || (typeof updateLetterBody === "function" ? updateLetterBody : null);
          if (updateFn) updateFn();
        }
      });
    }

    const fontSelect = document.getElementById("input-letter-font");
    const themeSelect = document.getElementById("input-letter-theme");

    const handleStyleChange = () => {
      const cfg = getConfig();
      if (fontSelect) cfg.letterFont = fontSelect.value;
      if (themeSelect) cfg.letterTheme = themeSelect.value;
      const updateStyleFn = root.updateLetterThemeAndFont || (typeof updateLetterThemeAndFont === "function" ? updateLetterThemeAndFont : null);
      if (updateStyleFn) updateStyleFn();
    };

    if (fontSelect) fontSelect.addEventListener("change", handleStyleChange);
    if (themeSelect) themeSelect.addEventListener("change", handleStyleChange);
  }

  // Export public symbols globally on root (window)
  root.stripHtml = stripHtml;
  root.renderLetterInputs = renderLetterInputs;
  root.syncLetterInputsToConfig = syncLetterInputsToConfig;
  root.initLetterEditorListeners = initLetterEditorListeners;

})(typeof window !== "undefined" ? window : globalThis);
