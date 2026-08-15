/**
 * ============================================================================
 * CONTENT RENDERER & INITIAL DOM HYDRATION ENGINE (js/modules/content-renderer.js)
 * ============================================================================
 *
 * FILE:
 *   js/modules/content-renderer.js
 *
 * RESPONSIBILITY:
 *   Initial public DOM hydration and content population coordination from CONFIG.
 *   Seeds initial text slots, document title, letter paragraphs, memory text,
 *   reasons cards, polaroid deck, and timeline layout during startup and resets.
 *
 * DATA SOURCE:
 *   CONFIG (Global in-memory application state hydrated by parseQueryParams / ShareModule)
 *
 * CALLERS:
 *   - js/app.js → boot() (Cold application startup)
 *   - js/app.js → startNewWish() (Template reset flow)
 *
 * COMPLETE DATA FLOW:
 *
 *   URL Route / Share Payload / Template Default
 *                 │
 *                 ▼
 *           Hydrated [CONFIG]
 *                 │
 *                 ▼
 *         populateContent() (js/modules/content-renderer.js)
 *                 │
 *                 ├─ formatName() (js/modules/utils.js)
 *                 ├─ updateBirthdayCard() (js/modules/renderers.js)
 *                 ├─ renderTimelineSection() (js/modules/renderers.js)
 *                 ├─ updateTimelineLine() (js/modules/renderers.js)
 *                 ├─ showRandomWish() (js/modules/renderers.js)
 *                 ├─ buildCountdown() (js/modules/renderers.js)
 *                 ├─ buildDynamicGreeting() (js/modules/renderers.js)
 *                 ├─ openPhotoLightbox() (js/app.js)
 *                 └─ playPaperRustle() (js/modules/audio-fx.js)
 *                 │
 *                 ▼
 *            Public DOM
 *
 * IMPORTANT ARCHITECTURE & ISOLATION CONTRACT:
 *   This module is strictly a VIEW / DOM ORCHESTRATION layer.
 *   - Does NOT own application state or CONFIG mutation (CONFIG is read-only).
 *   - Does NOT own URL routing or Base64 decoding (Owned by wish-codec.js / share.js).
 *   - Does NOT own database operations or UUID resolution (Owned by database.js / share.js).
 *   - Does NOT own Share UI or link generation (Owned by share.js / app.js).
 *   - Does NOT own media playback orchestration (Owned by audio-fx.js / video.js).
 *   - Does NOT own editor input state or Save & Apply (Owned by editor/* & customizer.js).
 *   - Does NOT own admin security (Owned by admin.js / app.js).
 *
 * DEPENDENCIES:
 *   - CONFIG (Global configuration object)
 *   - formatName() (from js/modules/utils.js)
 *   - updateBirthdayCard() (from js/modules/renderers.js)
 *   - renderTimelineSection() (from js/modules/renderers.js)
 *   - updateTimelineLine() (from js/modules/renderers.js)
 *   - showRandomWish() (from js/modules/renderers.js)
 *   - buildCountdown() (from js/modules/renderers.js)
 *   - buildDynamicGreeting() (from js/modules/renderers.js)
 *   - isWishCustomized() (from js/modules/renderers.js)
 *   - openPhotoLightbox() (from js/app.js)
 *   - playPaperRustle() (from js/modules/audio-fx.js)
 *
 * PUBLIC API:
 *   - window.populateContent
 * ============================================================================
 */

(function (root) {
  "use strict";

  /**
   * Helper to safely access global CONFIG in browser or test environments.
   * @returns {Object} Application configuration object.
   */
  function getConfig() {
    return (typeof CONFIG !== "undefined" && CONFIG) ? CONFIG : (root.CONFIG || {});
  }

  /**
   * --------------------------------------------------------------------------
   * populateContent()
   * --------------------------------------------------------------------------
   * PURPOSE:
   *   Coordinates the initial population and hydration of all public DOM sections
   *   from the active in-memory CONFIG state.
   *
   * INPUT:
   *   Reads global CONFIG (name, from, birthDate, passcode, letterLines, memory,
   *   reasons, wishes, gallery, timeline, gift).
   *
   * OUTPUT:
   *   @returns {void}
   *
   * CALLERS:
   *   - js/app.js → boot()
   *   - js/app.js → startNewWish()
   *
   * WHEN IT RUNS:
   *   - Cold boot after URL parameter routing and state hydration
   *   - Fresh wish template reset
   *
   * SIDE EFFECTS:
   *   - Updates document.title and multiple name/sender/hint DOM slots
   *   - Clears and rebuilds paragraphs in #letter-body (idempotent)
   *   - Clears and rebuilds reason cards in #reasons-grid (idempotent)
   *   - Clears and rebuilds polaroids in #gallery-deck (idempotent)
   *   - Delegates timeline rendering and registers window resize & ResizeObserver listeners
   *   - Updates countdown and dynamic greetings
   */
  function populateContent() {
    const cfg = getConfig();
    const nameVal = (cfg.name || "").trim();
    const fmt = root.formatName || (typeof formatName === "function" ? formatName : (s) => s);
    const displayName = nameVal ? fmt(nameVal) : "";

    // 1. Page Title & Meta Slots
    document.title = displayName ? `Happy Birthday, ${displayName}! ❤️` : "Happy Birthday! ❤️";

    const slot1 = document.getElementById("name-slot-1");
    if (slot1) slot1.textContent = displayName ? `, ${displayName}` : "";

    const slot2 = document.getElementById("name-slot-2");
    if (slot2) slot2.textContent = displayName || "You";

    const fromSlot = document.getElementById("from-slot");
    if (fromSlot) fromSlot.textContent = cfg.from || "your friends";

    const logoEl = document.getElementById("loading-logo-glow") || document.querySelector(".logo-glow");
    if (logoEl) {
      logoEl.textContent = displayName ? `✨ Happy Birthday ${displayName} ✨` : "✨ Happy Birthday ✨";
    }

    const pcTitle = document.querySelector(".pc-title");
    if (pcTitle) {
      pcTitle.textContent = displayName ? `Secret Code for ${displayName}` : "Secret Birthday Code";
    }

    const sealEl = document.getElementById("seal-initial");
    if (sealEl) sealEl.textContent = displayName ? displayName.charAt(0).toUpperCase() : "❤️";

    const peekEl = document.getElementById("letter-peek-text");
    if (peekEl) peekEl.textContent = displayName ? `For ${displayName} ❤️` : "For You ❤️";

    const hintEl = document.getElementById("pc-hint");
    if (hintEl) {
      const isCust = typeof isWishCustomized === "function" ? isWishCustomized : (root.isWishCustomized || (() => false));
      if (isCust()) {
        hintEl.textContent = cfg.passcode?.customHint || "Hint: think of a date that matters 💕";
      } else {
        hintEl.textContent = cfg.passcode?.defaultHint || "Hint: 1234 💕";
      }
    }

    // 2. Birthday Card & Date/Age
    if (typeof updateBirthdayCard === "function") {
      updateBirthdayCard();
    } else if (typeof root.updateBirthdayCard === "function") {
      root.updateBirthdayCard();
    }

    // 3. Letter Body Paragraphs (Idempotent: clears before seeding)
    const letterBody = document.getElementById("letter-body");
    if (letterBody) {
      letterBody.innerHTML = "";
      if (Array.isArray(cfg.letterLines)) {
        cfg.letterLines.forEach(() => {
          const p = document.createElement("p");
          letterBody.appendChild(p);
        });
      }
    }

    // 4. Memory Paragraph Text
    const memoryEl = document.getElementById("memory-text");
    if (memoryEl) memoryEl.textContent = cfg.memory || "";

    // 5. Reasons Grid Cards (Idempotent: clears before seeding)
    const reasonsGrid = document.getElementById("reasons-grid");
    if (reasonsGrid) {
      reasonsGrid.innerHTML = "";
      if (Array.isArray(cfg.reasons)) {
        cfg.reasons.forEach((r, i) => {
          const el = document.createElement("div");
          el.className = "info-card glass reveal";
          el.style.setProperty("--i", i);
          el.innerHTML = `<span class="icon">${r.icon || "💖"}</span><h3>${r.title || ""}</h3><p>${r.text || ""}</p>`;
          reasonsGrid.appendChild(el);
        });
      }
    }

    // 6. Inspirational Wish Quote
    if (typeof showRandomWish === "function") {
      showRandomWish();
    } else if (typeof root.showRandomWish === "function") {
      root.showRandomWish();
    }

    // 7. Gallery Polaroid Deck (Idempotent: clears before seeding)
    const deck = document.getElementById("gallery-deck");
    if (deck) {
      deck.innerHTML = "";
      if (Array.isArray(cfg.gallery)) {
        cfg.gallery.forEach((g, i) => {
          const el = document.createElement("div");
          el.className = "polaroid reveal";
          el.style.setProperty("--rot", (g.rot || 0) + "deg");
          el.style.setProperty("--i", i);
          const bg = `hsl(${(i * 47) % 360} 70% 75%)`;

          const zoomSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
          const zoomBtnHtml = g.image ? `<button class="photo-zoom-btn" type="button" title="Expand Photo HD">${zoomSvg}</button>` : "";
          const frontContent = g.image
            ? `<div class="frame"><img src="${g.image}" alt="${g.cap || ''}">${zoomBtnHtml}</div><div class="cap">${g.cap || ''}</div>`
            : `<div class="frame" style="background:linear-gradient(135deg,${bg},#fff0f6);">${g.emoji || '📸'}</div><div class="cap">${g.cap || ''}</div>`;

          const backContent = `<div class="polaroid-back"><p>${g.secretNote || "A special memory ❤️"}</p><span class="tap-hint">Tap to flip back</span></div>`;

          el.innerHTML = `<div class="polaroid-inner"><div class="polaroid-front">${frontContent}</div>${backContent}</div>`;

          if (g.image) {
            const img = el.querySelector("img");
            const openLightbox = root.openPhotoLightbox || (typeof openPhotoLightbox === "function" ? openPhotoLightbox : null);
            if (img) {
              img.addEventListener("error", () => {
                const front = el.querySelector(".polaroid-front");
                if (front) front.innerHTML = `<div class="frame" style="background:linear-gradient(135deg,${bg},#fff0f6);">${g.emoji || '📸'}</div><div class="cap">${g.cap || ''}</div>`;
              });
              img.addEventListener("click", (e) => {
                e.stopPropagation();
                if (openLightbox) openLightbox(g.image, g.cap);
              });
            }
            const zoomBtn = el.querySelector(".photo-zoom-btn");
            if (zoomBtn) {
              zoomBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (openLightbox) openLightbox(g.image, g.cap);
              });
            }
          }

          el.addEventListener("click", () => {
            el.classList.toggle("flipped");
            const playRustle = root.playPaperRustle || (typeof playPaperRustle === "function" ? playPaperRustle : null);
            if (playRustle) playRustle();
          });

          deck.appendChild(el);
        });
      }
    }

    // 8. Milestone Timeline Section
    const tl = document.getElementById("timeline-wrap");
    if (typeof renderTimelineSection === "function") {
      renderTimelineSection();
    } else if (typeof root.renderTimelineSection === "function") {
      root.renderTimelineSection();
    }

    const updateTlLine = root.updateTimelineLine || (typeof updateTimelineLine === "function" ? updateTimelineLine : null);
    if (updateTlLine) {
      updateTlLine();
      setTimeout(updateTlLine, 300);
      setTimeout(updateTlLine, 1000);
      window.addEventListener("resize", updateTlLine);
      window.addEventListener("load", updateTlLine);

      if (window.ResizeObserver && !window.__timelineROInitialized) {
        window.__timelineROInitialized = true;
        const ro = new ResizeObserver(() => {
          updateTlLine();
        });
        if (tl) ro.observe(tl);
      }
    }

    // 9. Gift Section Message & Coupon
    const giftMsg = document.getElementById("gift-message");
    if (giftMsg) giftMsg.textContent = cfg.gift?.message || "";

    const giftCpn = document.getElementById("gift-coupon");
    if (giftCpn) giftCpn.textContent = cfg.gift?.coupon || "";

    // 10. Countdown Grid & Dynamic Greeting
    if (typeof buildCountdown === "function") {
      buildCountdown();
    } else if (typeof root.buildCountdown === "function") {
      root.buildCountdown();
    }

    if (typeof buildDynamicGreeting === "function") {
      buildDynamicGreeting();
    } else if (typeof root.buildDynamicGreeting === "function") {
      root.buildDynamicGreeting();
    }
  }

  // ============================================================
  // PUBLIC API EXPOSURE ON ROOT / WINDOW
  // ============================================================

  root.populateContent = populateContent;

})(typeof window !== "undefined" ? window : globalThis);
