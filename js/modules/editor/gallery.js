/**
 * ============================================================================
 * MODULE: Customizer Gallery Editor (js/modules/editor/gallery.js)
 * Phase 9 Extraction
 *
 * Purpose:
 * Owns Customizer Gallery Editor UI rendering, photo tile field generation,
 * image file compression and background Cloud upload, image URL attachments,
 * photo removal, item deletion within the Gallery editor, and real-time
 * synchronization of edited Gallery cards into CONFIG state.
 *
 * Owns:
 * - compressImageFile()
 * - renderGalleryInputs()
 * - syncGalleryInputsToConfig()
 *
 * Relationship with other modules:
 * - renderers.js owns renderGalleryDeck() (CONFIG -> visible birthday page polaroid deck)
 * - app.js orchestrates customizer modal boot, add-gallery button, save/apply, and reset flows
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
  // IMAGE FILE COMPRESSION HELPER
  // ============================================================

  /**
   * Asynchronously compresses an image file using HTML5 canvas before storage/upload.
   * Delegates to shared MediaService.compressImageFile with robust fallback.
   * @param {File} file - User-selected image file.
   * @param {number} maxSide - Maximum dimension for scaling down image width/height.
   * @param {number} quality - Compression quality factor (0.0 to 1.0).
   * @returns {Promise<string|null>} Data URL string of compressed image.
   */
  function compressImageFile(file, maxSide = 350, quality = 0.5) {
    if (root.MediaService && typeof root.MediaService.compressImageFile === "function") {
      return root.MediaService.compressImageFile(file, maxSide, quality);
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxSide || h > maxSide) {
            if (w > h) {
              h = Math.round((h * maxSide) / w);
              w = maxSide;
            } else {
              w = Math.round((w * maxSide) / h);
              h = maxSide;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  // ============================================================
  // GALLERY EDITOR RENDERING
  // ============================================================

  /**
   * Builds and populates Gallery card input fields inside #gallery-inputs-container
   * based on current CONFIG.gallery array.
   */
  function renderGalleryInputs() {
    const container = document.getElementById("gallery-inputs-container");
    if (!container) return;
    container.innerHTML = "";
    const cfg = getConfig();
    const gallery = Array.isArray(cfg.gallery) ? cfg.gallery : [];
    gallery.forEach((g, i) => {
      const group = document.createElement("div");
      group.className = "editor-item-group";
      group.innerHTML = `
        <div class="item-header">
          <span class="item-label">Photo Tile ${i + 1}</span>
          <button type="button" class="item-delete-btn" data-type="gallery" data-index="${i}" title="Delete">✕</button>
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label style="font-size:0.75rem;opacity:0.85;">Photo Image (Upload photo or paste online Image URL)</label>
          <div class="gallery-photo-row" style="display:flex;align-items:center;gap:10px;margin-top:6px;flex-wrap:wrap;">
            ${g.image ? `
              <div style="position:relative;width:50px;height:50px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,215,0,0.6);flex-shrink:0;">
                <img src="${g.image}" style="width:100%;height:100%;object-fit:cover;">
              </div>
              <button type="button" class="btn-remove-gallery-photo" data-index="${i}" style="background:rgba(255,0,80,0.2);border:1px solid rgba(255,0,80,0.4);color:#ff6b9d;padding:6px 12px;border-radius:6px;font-size:0.75rem;cursor:pointer;">✕ Remove Photo</button>
            ` : `
              <label style="background:rgba(255,215,0,0.1);border:1px dashed var(--gold, #ffd700);color:var(--gold,#ffd700);padding:8px 14px;border-radius:8px;font-size:0.8rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                📷 Select Photo from Device
                <input type="file" class="gallery-file-input" accept="image/*" data-index="${i}" style="display:none;">
              </label>
              <span style="font-size:0.75rem;opacity:0.6;">or</span>
              <input type="url" class="gallery-url-input" placeholder="Paste Image Link (https://...)" value="${g.image && g.image.startsWith('http') ? g.image : ''}" data-index="${i}" style="flex:1;min-width:180px;font-size:0.8rem;padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.2);color:#fff;">
            `}
          </div>
        </div>
        <div class="form-group">
          <div class="emoji-text-row">
            <div>
              <label>Emoji Icon</label>
              <input type="text" class="emoji-input gallery-emoji" value="${g.emoji || '🎈'}" data-index="${i}" maxlength="4">
            </div>
            <div class="text-input">
              <label>Caption</label>
              <input type="text" class="gallery-cap" value="${g.cap || ''}" data-index="${i}">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Secret Note (back of card)</label>
          <input type="text" class="gallery-note" value="${g.secretNote || ""}" data-index="${i}">
        </div>
      `;
      container.appendChild(group);
    });

    const toastFn = root.showToast || (typeof showToast === "function" ? showToast : null);
    const renderDeckFn = root.renderGalleryDeck || (typeof renderGalleryDeck === "function" ? renderGalleryDeck : null);

    // Bind file inputs
    container.querySelectorAll(".gallery-file-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const idx = parseInt(input.dataset.index, 10);
        const currentGallery = getConfig().gallery;
        if (!currentGallery[idx]) return;

        // 1. INSTANT LOCAL PREVIEW (0ms latency)
        const localBlobUrl = URL.createObjectURL(file);
        currentGallery[idx].image = localBlobUrl;
        renderGalleryInputs();
        if (renderDeckFn) renderDeckFn();
        if (toastFn) toastFn(`📸 Photo attached to Tile ${idx + 1}! Optimizing in background... ☁️`);

        // 2. BACKGROUND NON-BLOCKING ASYNC COMPRESSION & CLOUD UPLOAD
        (async () => {
          try {
            const dataUrl = await compressImageFile(file, 400, 0.7);
            if (dataUrl) {
              if (currentGallery[idx]) {
                currentGallery[idx]._localDraft = dataUrl;
              }
              try {
                const formData = new FormData();
                formData.append("image", dataUrl.split(",")[1]);
                const res = await fetch("https://api.imgbb.com/1/upload?key=6d0276711900d7966f1632f457bc6716", {
                  method: "POST",
                  body: formData,
                });
                const json = await res.json();
                if (json && json.data && json.data.url) {
                  if (currentGallery[idx]) {
                    try { URL.revokeObjectURL(localBlobUrl); } catch (err) {}
                    currentGallery[idx].image = json.data.url;
                    delete currentGallery[idx]._localDraft;
                    renderGalleryInputs();
                    if (renderDeckFn) renderDeckFn();
                    if (toastFn) toastFn(`☁️ Tile ${idx + 1} synced to Cloud! ✨`);
                  }
                }
              } catch (err) {
                if (currentGallery[idx]) {
                  currentGallery[idx].image = dataUrl;
                  delete currentGallery[idx]._localDraft;
                }
              }
            }
          } catch (err) {
            // Quiet non-blocking fallback
          }
        })();

        e.target.value = "";
      });
    });

    // Bind direct URL inputs
    container.querySelectorAll(".gallery-url-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const idx = parseInt(input.dataset.index, 10);
        const url = e.target.value.trim();
        const currentGallery = getConfig().gallery;
        if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
          if (currentGallery[idx]) {
            currentGallery[idx].image = url;
            renderGalleryInputs();
            if (renderDeckFn) renderDeckFn();
            if (toastFn) toastFn(`Photo link set for Tile ${idx + 1}! 📸`);
          }
        }
      });
    });

    // Bind remove photo buttons
    container.querySelectorAll(".btn-remove-gallery-photo").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index, 10);
        const currentGallery = getConfig().gallery;
        if (currentGallery[idx]) {
          currentGallery[idx].image = null;
          renderGalleryInputs();
          if (renderDeckFn) renderDeckFn();
          if (toastFn) toastFn("Photo removed — Emoji tile restored ✨");
        }
      });
    });

    // Bind delete item
    container.querySelectorAll(".item-delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        // Sync live input edits into CONFIG.gallery before item removal
        // Required because editor DOM contains unsaved live edits that must be copied into CONFIG before the selected item is removed.
        syncGalleryInputsToConfig();
        const idx = parseInt(btn.dataset.index, 10);
        const currentGallery = getConfig().gallery;
        if (currentGallery && currentGallery.length > 1) {
          currentGallery.splice(idx, 1);
          renderGalleryInputs();
          if (renderDeckFn) renderDeckFn();
        } else {
          if (toastFn) toastFn("At least 1 gallery item required 📸");
        }
      });
    });
  }

  // ============================================================
  // GALLERY STATE SYNCHRONIZATION
  // ============================================================

  /**
   * Reads values from all .gallery-emoji, .gallery-cap, and .gallery-note inputs
   * and syncs them into CONFIG.gallery.
   */
  function syncGalleryInputsToConfig() {
    const cfg = getConfig();
    if (!Array.isArray(cfg.gallery)) return;
    const galleryEmojis = document.querySelectorAll(".gallery-emoji");
    const galleryCaps = document.querySelectorAll(".gallery-cap");
    const galleryNotes = document.querySelectorAll(".gallery-note");
    if (galleryEmojis.length > 0) {
      galleryEmojis.forEach((el, i) => {
        if (!cfg.gallery[i]) {
          cfg.gallery[i] = { image: null, emoji: "🎈", rot: 0, cap: "", secretNote: "" };
        }
        cfg.gallery[i].emoji = el.value;
        if (galleryCaps[i]) cfg.gallery[i].cap = galleryCaps[i].value;
        if (galleryNotes[i]) cfg.gallery[i].secretNote = galleryNotes[i].value;
      });
    }
  }

  // Export public symbols globally on root (window)
  root.compressImageFile = compressImageFile;
  root.renderGalleryInputs = renderGalleryInputs;
  root.syncGalleryInputsToConfig = syncGalleryInputsToConfig;

})(typeof window !== "undefined" ? window : globalThis);
