/**
 * ============================================================================
 * MODULE: Scroll Reveal & Sky Gradient Transition (js/modules/scroll-reveal.js)
 * Phase 23B-1 Modular Extraction
 *
 * Responsibility:
 * 1. IntersectionObserver scroll reveals for all `.reveal` DOM cards and elements.
 * 2. Final scene trigger observer for `#final-scene` invoking `triggerFinalScene()`.
 * 3. Authoritative, rAF-throttled window scroll listener interpolating the dawn
 *    sky gradient CSS variables (`--sky-bot` and `--sky-mid`) using `mixColor()`.
 *
 * Owns:
 * - initReveal()
 *
 * Callers:
 * - boot() in js/app.js (initial page setup)
 * - enterIntro() in js/modules/interactive.js (intro gate completion)
 * - renderSections() in js/modules/renderers.js (dynamic card re-rendering)
 *
 * Architecture & Data Flow:
 * Page Boot / Section Render
 *        │
 *        ▼
 * initReveal() (js/modules/scroll-reveal.js)
 *        ├─ IntersectionObserver (threshold: 0.18) ──> adds `.in-view` to `.reveal` elements
 *        ├─ IntersectionObserver (threshold: 0.5)  ──> triggers `triggerFinalScene()` on `#final-scene`
 *        └─ Window Scroll Listener (rAF throttled) ──> interpolates `--sky-bot` & `--sky-mid`
 *
 * Single Ownership & Deduplication:
 * - Phase 23B-1 consolidated sky-gradient scroll handling into this module as the
 *   single authoritative owner with `requestAnimationFrame` + `isScrollTicking` throttling.
 * - Duplicate unthrottled scroll listeners in `loading.js` and `app.js` have been removed.
 *
 * State & Database Safety:
 * - Performs 0 database writes (pure client-side visual effect).
 * - Does not mutate CONFIG state.
 *
 * Dependencies:
 * - `mixColor()` (defined in js/modules/loading.js, exposed on window.mixColor)
 * - `triggerFinalScene()` (defined in js/modules/interactive.js)
 *
 * Rollback Instructions:
 * - In case of rollback, remove <script src="js/modules/scroll-reveal.js"></script>
 *   from index.html, delete this file, and restore initReveal() in js/app.js.
 * ============================================================================
 */

(function (root) {
  "use strict";

  /**
   * Safe helper resolving mixColor color math across modules.
   * @param {string} a - Starting hex color.
   * @param {string} b - Ending hex color.
   * @param {number} t - Interpolation ratio (0 to 1).
   * @returns {string} Interpolated rgb color string.
   */
  function safeMixColor(a, b, t) {
    if (typeof root.mixColor === "function") return root.mixColor(a, b, t);
    if (typeof mixColor === "function") return mixColor(a, b, t);
    // Standalone fallback
    const ah = a.replace("#", "").match(/.{2}/g).map((x) => parseInt(x, 16));
    const bh = b.replace("#", "").match(/.{2}/g).map((x) => parseInt(x, 16));
    const rc = ah.map((v, i) => Math.round(v + (bh[i] - v) * t));
    return `rgb(${rc.join(",")})`;
  }

  /**
   * Tracks whether the window scroll listener has already been attached to prevent
   * duplicate listener accumulation on repeated re-render calls.
   */
  let isSkyScrollBound = false;

  /**
   * Initializes IntersectionObserver scroll reveal observers and triggers final scene animations.
   * Also binds the single authoritative rAF-throttled dawn sky scroll transition.
   * @returns {void}
   */
  function initReveal() {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) en.target.classList.add("in-view");
        });
      },
      { threshold: 0.18 },
    );

    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    // Final scene trigger observer
    const finalSceneEl = document.getElementById("final-scene");
    if (finalSceneEl) {
      const finalIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              const triggerFn = root.triggerFinalScene || (typeof triggerFinalScene === "function" ? triggerFinalScene : null);
              if (triggerFn) triggerFn();
              finalIO.disconnect();
            }
          });
        },
        { threshold: 0.5 },
      );

      finalIO.observe(finalSceneEl);
    }

    // Single authoritative dawn transition: interpolate sky colors with scroll progress
    if (!isSkyScrollBound) {
      let isScrollTicking = false;

      window.addEventListener(
        "scroll",
        () => {
          if (!isScrollTicking) {
            requestAnimationFrame(() => {
              const doc = document.documentElement;
              const progress = doc.scrollTop / (doc.scrollHeight - doc.clientHeight || 1);
              const rootStyle = document.documentElement.style;

              if (progress > 0.55) {
                const t = Math.min((progress - 0.55) / 0.45, 1);
                rootStyle.setProperty("--sky-bot", safeMixColor("#170b30", "#2a0f3d", t));
                rootStyle.setProperty(
                  "--sky-mid",
                  safeMixColor("#0a0618", "#170b30", Math.min(t * 1.3, 1)),
                );
              }

              isScrollTicking = false;
            });
            isScrollTicking = true;
          }
        },
        { passive: true },
      );

      isSkyScrollBound = true;
    }
  }

  // Expose on root (window) for app.js, renderers.js, and interactive.js callers
  root.initReveal = initReveal;

})(typeof window !== "undefined" ? window : this);
