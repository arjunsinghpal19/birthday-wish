/**
 * ============================================================================
 * MODULE: Customizer Accordion & Navigation (js/modules/editor/accordion.js)
 *
 * Purpose:
 * Owns Customizer editor accordion navigation, section expansion/collapse,
 * active section tab state management, and section header auto-scrolling.
 *
 * Owns:
 * - initAccordion()
 * - closeAllAccordionSections()
 * - openAccordionSection()
 * - scrollAccordionSectionToTop()
 *
 * Existing Stability Fix:
 * - Editor Auto-Scroll Fix: Uses offset-based targetScrollTop calculation relative to #editor-body
 *   to ensure when opening any accordion section (Reasons, Wishes, Gallery, Timeline, etc.),
 *   the section header is positioned near the top of #editor-body with Item 1 clearly visible.
 *
 * Dependencies:
 * - syncDOMToConfig() (from app.js or global root fallback)
 * - DOM elements: .editor-section-header, .editor-section-body, #editor-body
 *
 * Does NOT Own:
 * - Save & Apply logic
 * - + New Wish workflow
 * - Restore Default Messages
 * - Customizer field input builders (renderReasonsInputs, renderWishInputs, etc.)
 * - Datepicker / Wish Studio Calendar
 * - Admin security / Dashboard
 * ============================================================================
 */

(function (root) {
  "use strict";

  // ============================================================
  // EDITOR AUTO-SCROLL STABILITY FIX
  // ============================================================

  let activeScrollTimerToken = 0;

  /**
   * Positions an opened accordion section header near the top of #editor-body
   * using deterministic steady-state calculation so that the section aligns immediately
   * on the first click without delayed jumping or CSS transition race conditions.
   * @param {HTMLElement} header - The accordion header element that was opened.
   */
  function scrollAccordionSectionToTop(header) {
    if (!header) return;
    activeScrollTimerToken++;
    const currentToken = activeScrollTimerToken;

    const editorBody = document.getElementById("editor-body");
    if (!editorBody) return;

    const section = header.closest(".editor-section");
    if (!section) return;

    // Deterministic steady-state target calculation:
    // When preceding sections are closed, the exact top offset of this section within #editor-body
    // is the sum of all preceding closed section header heights and their margins.
    let targetScrollTop = 0;
    let prev = section.previousElementSibling;
    while (prev) {
      if (prev.classList && prev.classList.contains("editor-section")) {
        const prevHeader = prev.querySelector(".editor-section-header");
        const prevHeight = prevHeader ? prevHeader.offsetHeight : 48;
        const prevMargin = parseFloat(getComputedStyle(prev).marginBottom) || 0;
        targetScrollTop += prevHeight + prevMargin;
      }
      prev = prev.previousElementSibling;
    }

    // Scroll immediately with smooth animation
    editorBody.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: "smooth"
    });
  }

  // ============================================================
  // ACCORDION NAVIGATION CONTROLLER
  // ============================================================

  /**
   * Collapses all open editor accordion sections and removes active header styles.
   */
  function closeAllAccordionSections() {
    document.querySelectorAll(".editor-section-header").forEach((h) => {
      h.classList.remove("active");
      if (h.nextElementSibling) {
        h.nextElementSibling.classList.remove("open");
      }
    });
  }

  /**
   * Opens a specific accordion section by section key or header element ID.
   * @param {string|HTMLElement} target - Section key (e.g. "basic") or element/header.
   */
  function openAccordionSection(target) {
    closeAllAccordionSections();

    let header = null;
    if (typeof target === "string") {
      header = document.querySelector(`.editor-section[data-section="${target}"] .editor-section-header`);
      if (!header) {
        header = document.getElementById(target);
      }
    } else if (target && target.nodeType === 1) {
      header = target;
    }

    if (header) {
      header.classList.add("active");
      const body = header.nextElementSibling;
      if (body) {
        body.classList.add("open");
      }
      scrollAccordionSectionToTop(header);
    }
  }

  /**
   * Binds click event handlers to all editor accordion section headers.
   * Synchronizes current form input state before switching sections and applies
   * auto-scroll stability positioning.
   */
  function initAccordion() {
    document.querySelectorAll(".editor-section-header").forEach((header) => {
      if (header.dataset.accordionBound === "true") return;
      header.dataset.accordionBound = "true";

      header.addEventListener("click", () => {
        const syncFn = root.syncDOMToConfig || (typeof syncDOMToConfig === "function" ? syncDOMToConfig : null);
        if (syncFn) {
          syncFn();
        }

        const body = header.nextElementSibling;
        const wasOpen = header.classList.contains("active");

        // Close all sections
        closeAllAccordionSections();

        // Toggle clicked section
        if (!wasOpen) {
          header.classList.add("active");
          if (body) {
            body.classList.add("open");
          }
          scrollAccordionSectionToTop(header);
        }
      });
    });
  }

  // Export public symbols to global root (window)
  root.scrollAccordionSectionToTop = scrollAccordionSectionToTop;
  root.closeAllAccordionSections = closeAllAccordionSections;
  root.openAccordionSection = openAccordionSection;
  root.initAccordion = initAccordion;

})(typeof window !== "undefined" ? window : globalThis);
