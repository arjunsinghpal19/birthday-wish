/**
 * ============================================================================
 * MODULE: Customizer Timeline Editor (js/modules/editor/timeline.js)
 * Phase 10 Extraction
 *
 * Purpose:
 * Owns Customizer Timeline Editor UI rendering, Milestone card input field generation,
 * item deletion within the Timeline editor, and real-time synchronization of edited
 * Milestone cards into CONFIG state.
 *
 * Owns:
 * - renderTimelineInputs()
 * - syncTimelineInputsToConfig()
 *
 * Relationship with other modules:
 * - renderers.js owns renderTimelineSection() (CONFIG -> visible birthday page DOM)
 * - app.js orchestrates customizer modal boot, add-timeline button, save/apply, and reset flows
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
  // TIMELINE EDITOR RENDERING
  // ============================================================

  /**
   * Builds and populates Milestone card input fields inside #timeline-inputs-container
   * based on current CONFIG.timeline array.
   */
  function renderTimelineInputs() {
    const container = document.getElementById("timeline-inputs-container");
    if (!container) return;
    container.innerHTML = "";
    const cfg = getConfig();
    const timeline = Array.isArray(cfg.timeline) ? cfg.timeline : [];
    timeline.forEach((t, i) => {
      const group = document.createElement("div");
      group.className = "editor-item-group";
      group.innerHTML = `
        <div class="item-header">
          <span class="item-label">Milestone ${i + 1}</span>
          <button type="button" class="item-delete-btn" data-type="timeline" data-index="${i}" title="Delete">✕</button>
        </div>
        <div class="form-group">
          <div class="emoji-text-row">
            <div>
              <label>Icon</label>
              <input type="text" class="emoji-input timeline-icon" value="${t.icon}" data-index="${i}" maxlength="4">
            </div>
            <div class="text-input">
              <label>Date / Period Label</label>
              <input type="text" class="timeline-date" value="${t.date}" data-index="${i}">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Title</label>
          <input type="text" class="timeline-title" value="${t.title}" data-index="${i}">
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" class="timeline-text" value="${t.text}" data-index="${i}">
        </div>
      `;
      container.appendChild(group);
    });

    // Bind delete buttons for Timeline items
    container.querySelectorAll(".item-delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        // Sync live input edits into CONFIG.timeline before item removal
        // Required because editor DOM contains unsaved live edits that must be copied into CONFIG before the selected item is removed.
        syncTimelineInputsToConfig();
        const idx = parseInt(btn.dataset.index, 10);
        const currentTimeline = getConfig().timeline;
        if (currentTimeline && currentTimeline.length > 1) {
          currentTimeline.splice(idx, 1);
          renderTimelineInputs();
          const renderSecFn = root.renderSections || (typeof renderSections === "function" ? renderSections : null);
          if (renderSecFn) {
            renderSecFn(["timeline"]);
          }
        } else {
          const toastFn = root.showToast || (typeof showToast === "function" ? showToast : null);
          if (toastFn) toastFn("At least 1 milestone required 🕐");
        }
      });
    });
  }

  // ============================================================
  // TIMELINE STATE SYNCHRONIZATION
  // ============================================================

  /**
   * Reads values from all .timeline-icon, .timeline-date, .timeline-title, and .timeline-text inputs
   * and syncs them into CONFIG.timeline.
   */
  function syncTimelineInputsToConfig() {
    const cfg = getConfig();
    if (!Array.isArray(cfg.timeline)) return;
    const tlIcons = document.querySelectorAll(".timeline-icon");
    const tlDates = document.querySelectorAll(".timeline-date");
    const tlTitles = document.querySelectorAll(".timeline-title");
    const tlTexts = document.querySelectorAll(".timeline-text");
    if (tlIcons.length > 0) {
      tlIcons.forEach((el, i) => {
        if (!cfg.timeline[i]) {
          cfg.timeline[i] = { icon: "🌟", date: "", title: "", text: "" };
        }
        cfg.timeline[i].icon = el.value;
        if (tlDates[i]) cfg.timeline[i].date = tlDates[i].value;
        if (tlTitles[i]) cfg.timeline[i].title = tlTitles[i].value;
        if (tlTexts[i]) cfg.timeline[i].text = tlTexts[i].value;
      });
    }
  }

  // Export public symbols globally on root (window)
  root.renderTimelineInputs = renderTimelineInputs;
  root.syncTimelineInputsToConfig = syncTimelineInputsToConfig;

})(typeof window !== "undefined" ? window : globalThis);
