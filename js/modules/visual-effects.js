/**
 * ============================================================================
 * VISUAL EFFECTS & SENSOR INTERACTION MODULE (js/modules/visual-effects.js)
 * ============================================================================
 *
 * Responsibility:
 *   Owns pure client-side visual interactions and sensor-based physical motion:
 *   - Custom desktop mouse cursor with lag/easing ring and sparkle particle trails.
 *   - Magnetic physical pull on interactive buttons (.magnetic).
 *   - 3D perspective tilt effect on cards (.info-card, .polaroid, .letter-paper).
 *   - Gyroscope / device orientation parallax shift on ambient background blobs (.blob).
 *
 * Does NOT own:
 *   - IntersectionObserver scroll reveal & dawn color mixing (owned by js/app.js)
 *   - Preloader and loading screen transitions (owned by js/app.js)
 *   - Interactive envelope opening & cake interaction flows (owned by js/modules/interactive.js)
 *   - Application data flow, CONFIG mutation, or routing (owned by js/app.js)
 *
 * Dependencies:
 *   - Native Browser APIs: requestAnimationFrame, matchMedia, DeviceOrientationEvent
 *   - DOM Selectors: #cursor-dot, #cursor-ring, .magnetic, .tilt-card, .polaroid, .blob, #envelope
 *
 * Public API Exposed on root (window):
 *   - window.initCursor
 *   - window.initMagnetic
 *   - window.initTilt
 *   - window.initGyro
 *
 * Initialization:
 *   Loaded in index.html before js/modules/canvas-export.js and js/app.js.
 *   Invoked by js/modules/interactive.js upon experience start, and by js/app.js during boot().
 * ============================================================================
 */

(function (root) {
  "use strict";

  // ============================================================
  // 1. CUSTOM DESKTOP CURSOR WITH SPARKLE TRAILS & RIPPLES
  // ============================================================

  /**
   * Initializes custom desktop mouse cursor, trailing lag ring, sparkle particle emitter,
   * element hover class toggles, and click ripple effects.
   */
  function initCursor() {
    if (window.matchMedia("(hover:none), (pointer:coarse)").matches) return;

    const dot = document.getElementById("cursor-dot");
    const ring = document.getElementById("cursor-ring");

    let mx = innerWidth / 2,
      my = innerHeight / 2,
      rx = mx,
      ry = my;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (dot) dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;

      if (Math.random() < 0.12) {
        const s = document.createElement("div");
        s.className = "sparkle-trail";
        const size = 3 + Math.random() * 4;
        s.style.width = size + "px";
        s.style.height = size + "px";
        s.style.left = mx + "px";
        s.style.top = my + "px";
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 850);
      }
    });

    (function raf() {
      if (Math.abs(mx - rx) > 0.05 || Math.abs(my - ry) > 0.05) {
        rx += (mx - rx) * 0.48;
        ry += (my - ry) * 0.48;
        if (ring) ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      }
      requestAnimationFrame(raf);
    })();

    document
      .querySelectorAll("a,button,.tilt-card,.polaroid,.envelope,.giftbox")
      .forEach((el) => {
        el.addEventListener("mouseenter", () =>
          document.body.classList.add("cursor-hover"),
        );
        el.addEventListener("mouseleave", () =>
          document.body.classList.remove("cursor-hover"),
        );
      });

    document.addEventListener("click", (e) => {
      const r = document.createElement("div");
      r.className = "click-ripple";
      r.style.left = e.clientX + "px";
      r.style.top = e.clientY + "px";
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 650);
    });
  }

  // ============================================================
  // 2. MAGNETIC BUTTON PULL EFFECT
  // ============================================================

  /**
   * Initializes magnetic attraction effect on elements with the .magnetic class.
   */
  function initMagnetic() {
    document.querySelectorAll(".magnetic").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2,
          y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.28}px, ${y * 0.35}px)`;
      });

      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "translate(0,0)";
      });
    });
  }

  // ============================================================
  // 3. 3D CARD PERSPECTIVE TILT
  // ============================================================

  /**
   * Initializes 3D card tilt perspective animations on hover.
   */
  function initTilt() {
    document
      .querySelectorAll(".info-card, .polaroid, .letter-paper")
      .forEach((card) => {
        card.classList.add("tilt-card");
        card.addEventListener("mousemove", (e) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5,
            py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `perspective(700px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg)`;
        });

        card.addEventListener("mouseleave", () => {
          card.style.transform = "perspective(700px) rotateY(0) rotateX(0)";
        });
      });
  }

  // ============================================================
  // 4. GYROSCOPE AMBIENT PARALLAX (MOBILE / SENSOR MOTION)
  // ============================================================

  /**
   * Initializes device orientation event listener for background blob parallax shifts.
   * Handles iOS permission request when envelope is clicked.
   */
  function initGyro() {
    if (!window.DeviceOrientationEvent) return;

    function handle(e) {
      const beta = e.beta || 0,
        gamma = e.gamma || 0;
      document.querySelectorAll(".blob").forEach((b) => {
        b.style.transform = `translate(${gamma * 0.6}px, ${beta * 0.4}px)`;
      });
    }

    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const env = document.getElementById("envelope");
      if (env) {
        env.addEventListener(
          "click",
          () => {
            DeviceOrientationEvent.requestPermission()
              .then((res) => {
                if (res === "granted")
                  window.addEventListener("deviceorientation", handle);
              })
              .catch(() => {});
          },
          { once: true },
        );
      }
    } else {
      window.addEventListener("deviceorientation", handle);
    }
  }

  // ============================================================
  // 5. PUBLIC API EXPOSURE
  // ============================================================

  root.initCursor = initCursor;
  root.initMagnetic = initMagnetic;
  root.initTilt = initTilt;
  root.initGyro = initGyro;

})(typeof window !== "undefined" ? window : globalThis);
