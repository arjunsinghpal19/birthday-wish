/**
 * ============================================================================
 * MODULE: Customizer Wishes Editor (js/modules/editor/wishes.js)
 * Phase 8 Extraction
 *
 * Purpose:
 * Owns Customizer Wishes Editor UI rendering, Wish quote input field generation,
 * item deletion within the Wishes editor, and real-time synchronization of edited
 * Wish quotes into CONFIG state.
 *
 * Owns:
 * - renderWishInputs()
 * - syncWishInputsToConfig()
 *
 * Relationship with other modules:
 * - app.js orchestrates customizer modal boot, add-wish button, save/apply, and reset flows
 * - interactive.js / app.js owns initWishes() live birthday page quote slideshow
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
  // WISHES EDITOR RENDERING
  // ============================================================

  /**
   * Builds and populates Wish quote input textareas inside #wishes-inputs-container
   * based on current CONFIG.wishes array.
   */
  function renderWishInputs() {
    const container = document.getElementById("wishes-inputs-container");
    if (!container) return;
    container.innerHTML = "";
    const cfg = getConfig();
    const wishes = Array.isArray(cfg.wishes) ? cfg.wishes : [];
    const esc = (root.escapeHtml && typeof root.escapeHtml === "function")
      ? root.escapeHtml
      : (typeof escapeHtml === "function" ? escapeHtml : (s) => (s === null || s === undefined ? "" : String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")));

    wishes.forEach((w, i) => {
      const group = document.createElement("div");
      group.className = "editor-item-group";
      group.innerHTML = `
        <div class="item-header">
          <span class="item-label">Wish Quote ${i + 1}</span>
          <button type="button" class="item-delete-btn" data-type="wish" data-index="${i}" title="Delete">✕</button>
        </div>
        <div class="form-group">
          <textarea class="wish-input" rows="2" data-index="${i}">${esc(w || '')}</textarea>
        </div>
      `;
      container.appendChild(group);
    });

    // Bind delete buttons for Wish items
    container.querySelectorAll(".item-delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        // Sync live textarea edits into CONFIG.wishes before item removal
        // Required because editor DOM contains unsaved live edits that must be copied into CONFIG before the selected item is removed.
        syncWishInputsToConfig();
        const idx = parseInt(btn.dataset.index, 10);
        const currentWishes = getConfig().wishes;
        if (currentWishes && currentWishes.length > 1) {
          currentWishes.splice(idx, 1);
          renderWishInputs();
        } else {
          const toastFn = root.showToast || (typeof showToast === "function" ? showToast : null);
          if (toastFn) toastFn("At least 1 wish required ✨");
        }
      });
    });
  }

  // ============================================================
  // WISHES STATE SYNCHRONIZATION
  // ============================================================

  /**
   * Reads values from all .wish-input textareas and syncs them into CONFIG.wishes.
   */
  function syncWishInputsToConfig() {
    const cfg = getConfig();
    if (!Array.isArray(cfg.wishes)) return;
    const wishInputs = document.querySelectorAll(".wish-input");
    if (wishInputs.length > 0) {
      wishInputs.forEach((el, i) => {
        cfg.wishes[i] = el.value;
      });
    }
  }

  // Export public symbols globally on root (window)
  root.renderWishInputs = renderWishInputs;
  root.syncWishInputsToConfig = syncWishInputsToConfig;

})(typeof window !== "undefined" ? window : globalThis);
