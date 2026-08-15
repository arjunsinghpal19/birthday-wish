/**
 * ============================================================================
 * PHOTO LIGHTBOX MODULE (js/modules/photo-lightbox.js)
 * ============================================================================
 *
 * FILE:
 *   js/modules/photo-lightbox.js
 *
 * RESPONSIBILITY:
 *   Manages full-screen HD photo zoom viewing, overlay rendering, image caption
 *   display, backdrop click-to-close dismissals, and close button interaction.
 *
 * DATA FLOW:
 *
 *   User clicks Polaroid photo or Zoom HD button in Gallery
 *                       │
 *                       ▼
 *         openPhotoLightbox(src, caption) (js/modules/photo-lightbox.js)
 *                       │
 *                       ▼
 *         #photo-lightbox DOM modal receives image source, caption & `.show` class
 *                       │
 *                       ▼
 *         User clicks ✕ button or backdrop ──> modal removes `.show` class
 *
 * DOES NOT OWN:
 *   - Gallery DOM deck rendering or polaroid construction (Owned by renderers.js / content-renderer.js)
 *   - CONFIG state hydration or photo image decoding (Owned by wish-codec.js / share.js)
 *   - Database CRUD or UUID resolution (Owned by database.js / share.js)
 *   - Editor customizer gallery uploads (Owned by editor/gallery.js)
 *   - Audio / Video playback (Owned by audio-fx.js / video.js)
 *   - Canvas export (Owned by canvas-export.js)
 *
 * DEPENDENCIES:
 *   - #photo-lightbox (Modal container DOM element)
 *   - #photo-lightbox-img (Full-size image element)
 *   - #photo-lightbox-caption (Image caption text element)
 *   - #photo-lightbox-close (Close button element)
 *
 * CALLERS:
 *   - js/modules/renderers.js → renderGalleryDeck() (Photo click / Zoom button click)
 *   - js/modules/content-renderer.js → populateContent() (Photo click / Zoom button click)
 *   - js/app.js → boot() (Initializes event listeners via initPhotoLightbox())
 *
 * PUBLIC API:
 *   - window.openPhotoLightbox
 *   - window.initPhotoLightbox
 * ============================================================================
 */

(function (root) {
  "use strict";

  /**
   * Safe helper to query DOM element by ID.
   * @param {string} id - Element ID.
   * @returns {HTMLElement|null}
   */
  function getEl(id) {
    if (typeof DOM !== "undefined" && DOM && typeof DOM.get === "function") {
      return DOM.get(id);
    }
    return document.getElementById(id);
  }

  /**
   * Opens full-screen photo lightbox view with HD image source and caption overlay.
   * @param {string} src - Image URL string.
   * @param {string} [caption] - Image caption text.
   * @returns {void}
   */
  function openPhotoLightbox(src, caption) {
    const modal = getEl("photo-lightbox");
    const img = getEl("photo-lightbox-img");
    const cap = getEl("photo-lightbox-caption");
    if (!modal || !img) return;

    img.src = src;
    if (cap) cap.textContent = caption || "";
    modal.classList.add("show");
  }

  /**
   * Binds close button and background backdrop click listeners for the photo lightbox modal.
   * @returns {void}
   */
  function initPhotoLightbox() {
    const modal = getEl("photo-lightbox");
    const closeBtn = getEl("photo-lightbox-close");

    if (closeBtn && modal) {
      closeBtn.addEventListener("click", () => modal.classList.remove("show"));
    }
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("show");
      });
    }
  }

  // ============================================================
  // PUBLIC API EXPOSURE ON ROOT / WINDOW
  // ============================================================

  root.openPhotoLightbox = openPhotoLightbox;
  root.initPhotoLightbox = initPhotoLightbox;

})(typeof window !== "undefined" ? window : globalThis);
