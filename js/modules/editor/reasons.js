/**
 * ============================================================================
 * MODULE: Customizer Reasons Editor (js/modules/editor/reasons.js)
 * Phase 7 Extraction
 *
 * Purpose:
 * Owns Customizer Reasons Editor UI rendering, Reason card input field generation,
 * item deletion within the Reasons editor, and real-time synchronization of edited
 * Reason cards into CONFIG state.
 *
 * Owns:
 * - renderReasonInputs()
 * - syncReasonInputsToConfig()
 *
 * Relationship with other modules:
 * - renderers.js owns renderReasonsGrid() (CONFIG -> visible birthday page DOM)
 * - app.js orchestrates customizer modal boot, add-reason button, save/apply, and reset flows
 * - editor/accordion.js owns accordion section toggling & auto-scroll
 * ============================================================================
 */

(function (root) {
  "use strict";

  /**
   * Safe helper resolving global CONFIG object across window/script scopes.
   */
  function getConfig() {
    if (typeof CONFIG !== "undefined") return CONFIG;
    if (root.CONFIG) return root.CONFIG;
    return {};
  }

  // ============================================================
  // REASONS EDITOR RENDERING
  // ============================================================

  /**
   * Builds and populates Reason card input fields inside #reasons-inputs-container
   * based on current CONFIG.reasons array.
   */
  function renderReasonInputs() {
    const container = document.getElementById("reasons-inputs-container");
    if (!container) return;
    container.innerHTML = "";
    const cfg = getConfig();
    const reasons = Array.isArray(cfg.reasons) ? cfg.reasons : [];
    reasons.forEach((r, i) => {
      const group = document.createElement("div");
      group.className = "editor-item-group";
      group.innerHTML = `
        <div class="item-header">
          <span class="item-label">Reason Card ${i + 1}</span>
          <button type="button" class="item-delete-btn" data-type="reason" data-index="${i}" title="Delete">✕</button>
        </div>
        <div class="form-group">
          <div class="emoji-text-row">
            <div>
              <label>Icon</label>
              <input type="text" class="emoji-input reason-icon" value="${r.icon}" data-index="${i}" maxlength="4">
            </div>
            <div class="text-input">
              <label>Title</label>
              <input type="text" class="reason-title" value="${r.title}" data-index="${i}">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" class="reason-text" value="${r.text}" data-index="${i}">
        </div>
      `;
      container.appendChild(group);
    });

    // Bind delete buttons for Reason items
    container.querySelectorAll(".item-delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        // Sync live input edits into CONFIG.reasons before item removal
        // Required because editor DOM contains unsaved live edits that must be copied into CONFIG before the selected item is removed.
        syncReasonInputsToConfig();
        const idx = parseInt(btn.dataset.index, 10);
        const currentReasons = getConfig().reasons;
        if (currentReasons && currentReasons.length > 1) {
          currentReasons.splice(idx, 1);
          renderReasonInputs();
          const renderSecFn = root.renderSections || (typeof renderSections === "function" ? renderSections : null);
          if (renderSecFn) {
            renderSecFn(["reasons"]);
          }
        } else {
          const toastFn = root.showToast || (typeof showToast === "function" ? showToast : null);
          if (toastFn) toastFn("At least 1 reason required ⭐");
        }
      });
    });
  }

  // ============================================================
  // REASONS STATE SYNCHRONIZATION
  // ============================================================

  /**
   * Reads values from all .reason-icon, .reason-title, and .reason-text inputs
   * and syncs them into CONFIG.reasons.
   */
  function syncReasonInputsToConfig() {
    const cfg = getConfig();
    if (!Array.isArray(cfg.reasons)) return;
    const reasonIcons = document.querySelectorAll(".reason-icon");
    const reasonTitles = document.querySelectorAll(".reason-title");
    const reasonTexts = document.querySelectorAll(".reason-text");
    if (reasonIcons.length > 0) {
      reasonIcons.forEach((el, i) => {
        if (!cfg.reasons[i]) {
          cfg.reasons[i] = { icon: "💫", title: "", text: "" };
        }
        cfg.reasons[i].icon = el.value;
        if (reasonTitles[i]) cfg.reasons[i].title = reasonTitles[i].value;
        if (reasonTexts[i]) cfg.reasons[i].text = reasonTexts[i].value;
      });
    }
  }

  // Export public symbols globally on root (window)
  root.renderReasonInputs = renderReasonInputs;
  root.syncReasonInputsToConfig = syncReasonInputsToConfig;

})(typeof window !== "undefined" ? window : globalThis);
