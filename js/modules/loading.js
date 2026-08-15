/**
 * ============================================================================
 * LOADING LIFECYCLE MODULE (js/modules/loading.js)
 * ============================================================================
 *
 * FILE:
 *   js/modules/loading.js
 *
 * RESPONSIBILITY:
 *   Manages the initial boot loading progress bar, percentage increment simulation,
 *   background dawn-sky color interpolation on scroll, and loading completion
 *   scene transitions (displaying passcode gate or tap-to-enter button).
 *
 * DATA FLOW:
 *
 *   Application Boot (`boot()` in js/app.js)
 *         │
 *         ▼
 *   runLoadingSequence() (js/modules/loading.js)
 *         │ (Animates progress bar from 0% to 100%)
 *         ▼
 *   onLoadComplete() (js/modules/loading.js)
 *         │
 *         ├─ If CONFIG.passcode.enabled === true  ──> initPasscode() (js/modules/interactive.js)
 *         └─ If CONFIG.passcode.enabled === false ──> enterIntro() on click (js/modules/interactive.js)
 *         │
 *         ▼
 *   Interactive Birthday Experience
 *
 * DOES NOT OWN:
 *   - URL query routing or Base64 decoding (Owned by wish-codec.js / share.js)
 *   - Database CRUD or UUID resolution (Owned by database.js / share.js)
 *   - Public DOM section rendering (Owned by content-renderer.js / renderers.js)
 *   - Editor state or customizer modal (Owned by editor/* & customizer.js)
 *   - Audio engine or sound effects playback (Owned by audio-fx.js)
 *   - Canvas export (Owned by canvas-export.js)
 *   - Admin security verification (Owned by admin.js / app.js)
 *
 * DEPENDENCIES:
 *   - CONFIG (Global configuration object, specifically CONFIG.passcode.enabled)
 *   - initPasscode() (from js/modules/interactive.js)
 *   - enterIntro() (from js/modules/interactive.js)
 *   - mixColor() (Color interpolation helper)
 *
 * CALLERS:
 *   - js/app.js → boot()
 *
 * PUBLIC API:
 *   - window.runLoadingSequence
 *   - window.onLoadComplete
 *   - window.mixColor
 * ============================================================================
 */

(function (root) {
  "use strict";

  /**
   * Linear interpolation between two hex color codes.
   * @param {string} a - Starting hex color (e.g. "#170b30").
   * @param {string} b - Ending hex color (e.g. "#2a0f3d").
   * @param {number} t - Interpolation fraction between 0 and 1.
   * @returns {string} Interpolated rgb color string.
   */
  function mixColor(a, b, t) {
    const ah = a
      .replace("#", "")
      .match(/.{2}/g)
      .map((x) => parseInt(x, 16));
    const bh = b
      .replace("#", "")
      .match(/.{2}/g)
      .map((x) => parseInt(x, 16));
    const rc = ah.map((v, i) => Math.round(v + (bh[i] - v) * t));
    return `rgb(${rc.join(",")})`;
  }

  /**
   * Initializes the loading progress animation simulation and triggers onLoadComplete.
   * Note: Dawn sky gradient scroll transition is owned by js/modules/scroll-reveal.js.
   * @returns {void}
   */
  function runLoadingSequence() {
    const fill = document.getElementById("loader-fill");
    const pct = document.getElementById("loader-pct");
    let p = 0;

    const timer = setInterval(() => {
      p += 12;
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
        onLoadComplete();
      }
      if (fill) fill.style.width = p + "%";
      if (pct) pct.textContent = `Loading memories... ${Math.floor(p)}%`;
    }, 140);
  }

  /**
   * Completes the loading sequence, hides loader UI, and transitions to passcode gate or intro.
   * @returns {void}
   */
  function onLoadComplete() {
    const track = document.getElementById("loader-track");
    if (track) track.style.display = "none";

    const pct = document.getElementById("loader-pct");
    if (pct) pct.style.display = "none";

    const cfg = (typeof CONFIG !== "undefined" && CONFIG) ? CONFIG : (root.CONFIG || {});
    const isPasscodeEnabled = Boolean(cfg.passcode && cfg.passcode.enabled);

    if (isPasscodeEnabled) {
      const pcWrap = document.getElementById("passcode-wrap");
      if (pcWrap) pcWrap.classList.add("show");

      const initPass = root.initPasscode || (typeof initPasscode === "function" ? initPasscode : null);
      if (initPass) initPass();
    } else {
      const tapEnter = document.getElementById("tap-enter");
      if (tapEnter) tapEnter.classList.add("show");

      const loadingScreen = document.getElementById("loading-screen");
      const enter = root.enterIntro || (typeof enterIntro === "function" ? enterIntro : null);
      if (loadingScreen && enter) {
        loadingScreen.addEventListener("click", enter, { once: true });
      }
    }
  }

  // ============================================================
  // PUBLIC API EXPOSURE
  // ============================================================

  root.mixColor = mixColor;
  root.runLoadingSequence = runLoadingSequence;
  root.onLoadComplete = onLoadComplete;

})(typeof window !== "undefined" ? window : globalThis);
