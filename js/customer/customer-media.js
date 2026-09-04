/**
 * ============================================================================
 * CUSTOMER MEDIA LIBRARY CONTROLLER (js/customer/customer-media.js)
 * Architecture: Phase 32F Customer Platform Foundation
 *
 * Dedicated controller for the Customer Dashboard My Media section.
 * Scans, indexes, searches, sorts, previews, and calculates storage quota
 * for photos, music, and videos across customer-owned wishes.
 *
 * CRITICAL ARCHITECTURAL INVARIANTS:
 * 1. Strictly customer-scoped (only examines wishes owned by the customer).
 * 2. Admin Media Library remains 100% untouched and isolated.
 * 3. File size strictly under 35.00 KB ceiling.
 * ============================================================================
 */

(function (root) {
  "use strict";

  const BUCKET_NAME = "wish-media";

  let activeMediaFilter = "all";
  let activeSortOption = "newest";
  let mediaSearchQuery = "";
  let currentPreviewItem = null;

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Classifies a media reference into its storage source category.
   * @param {string} url
   * @returns {"storage"|"local"|"external"|"data_url"|"unknown"}
   */
  function classifyMediaSource(url) {
    if (!url || typeof url !== "string") return "unknown";
    const u = url.trim();
    if (!u) return "unknown";
    if (u.startsWith("data:") || u.startsWith("blob:")) return "data_url";
    if (u.startsWith("assets/") || u.startsWith("./assets/") || u.startsWith("/assets/")) return "local";
    if (u.includes("wish-media") || u.includes("/storage/v1/object/") || u.startsWith("photos/") || u.startsWith("videos/") || u.startsWith("audio/")) {
      return "storage";
    }
    if (u.startsWith("http://") || u.startsWith("https://")) return "external";
    return "unknown";
  }

  /**
   * Extracts all media items from customer wishes.
   * @param {Array} [wishesArray=null]
   * @returns {Array<Object>}
   */
  function extractCustomerMedia(wishesArray = null) {
    let wishes = wishesArray;
    if (!Array.isArray(wishes)) {
      if (root.CustomerWishes && typeof root.CustomerWishes.getWishes === "function") {
        wishes = root.CustomerWishes.getWishes();
      } else {
        wishes = [];
      }
    }

    const mediaList = [];

    wishes.forEach((w) => {
      const recipient = w.recipient_name || w.name || "Celebration";
      const wishId = w.id || "";
      const createdAt = w.created_at || new Date().toISOString();

      // 1. Photos from Gallery
      let gallery = [];
      if (Array.isArray(w.gallery_json)) {
        gallery = w.gallery_json;
      } else if (typeof w.gallery_json === "string") {
        try { gallery = JSON.parse(w.gallery_json) || []; } catch (_) {}
      }

      gallery.forEach((g, idx) => {
        if (g && g.image && typeof g.image === "string" && g.image.trim() !== "") {
          const imgUrl = g.image.trim();
          const source = classifyMediaSource(imgUrl);
          mediaList.push({
            id: `${wishId}-photo-${idx}`,
            type: "photo",
            url: imgUrl,
            caption: g.cap || "Polaroid Photo",
            emoji: g.emoji || "📸",
            secretNote: g.secretNote || "",
            wishId,
            recipient,
            createdAt,
            source,
            isCloudStorage: source === "storage"
          });
        }
      });

      // 2. Audio Track
      const rawMusic = w.music_url || (w.music && w.music.file) || null;
      if (rawMusic && typeof rawMusic === "string" && rawMusic.trim() !== "") {
        const musicUrl = rawMusic.trim();
        const source = classifyMediaSource(musicUrl);
        mediaList.push({
          id: `${wishId}-audio`,
          type: "audio",
          url: musicUrl,
          caption: "Celebration Audio Track",
          wishId,
          recipient,
          createdAt,
          source,
          isCloudStorage: source === "storage"
        });
      }

      // 3. Video Wish
      const rawVideo = w.video_url || (w.videoWish && (w.videoWish.url || w.videoWish.file)) || null;
      if (rawVideo && typeof rawVideo === "string" && rawVideo.trim() !== "") {
        const videoUrl = rawVideo.trim();
        const source = classifyMediaSource(videoUrl);
        mediaList.push({
          id: `${wishId}-video`,
          type: "video",
          url: videoUrl,
          caption: "Personal Video Wish",
          wishId,
          recipient,
          createdAt,
          source,
          isCloudStorage: source === "storage"
        });
      }
    });

    return mediaList;
  }

  /**
   * Calculates total customer cloud storage usage and updates dashboard meters.
   * @param {Array} [wishes=null]
   * @param {number} [quotaMb=25]
   * @returns {{ usedBytes: number, usedMb: number, quotaMb: number, percentUsed: number }}
   */
  function calculateCustomerStorage(wishes = null, quotaMb = 25) {
    const allMedia = extractCustomerMedia(wishes);
    let usedBytes = 0;

    allMedia.forEach((m) => {
      if (m.isCloudStorage) {
        // Standardized cloud asset byte estimates if exact metadata is unindexed
        if (m.type === "photo") usedBytes += 350 * 1024;       // ~350 KB
        else if (m.type === "audio") usedBytes += 3500 * 1024;   // ~3.5 MB
        else if (m.type === "video") usedBytes += 8000 * 1024;   // ~8.0 MB
      }
    });

    const usedMb = usedBytes / (1024 * 1024);
    const quota = Number(quotaMb) || 25;
    const percentUsed = Math.min(100, Math.max(0, (usedMb / quota) * 100)).toFixed(1);

    // Synchronize Overview KPI Card
    const kpiStorage = el("kpi-storage-quota");
    if (kpiStorage) kpiStorage.textContent = `${usedMb.toFixed(2)} MB / ${quota} MB`;

    const quotaFill = el("quota-progress-fill");
    if (quotaFill) quotaFill.style.width = `${percentUsed}%`;

    // Synchronize Plan & Usage View
    const viewStorageText = el("view-plan-storage-text");
    if (viewStorageText) viewStorageText.textContent = `${usedMb.toFixed(2)} / ${quota} MB`;

    const viewStorageFill = el("view-plan-storage-fill");
    if (viewStorageFill) viewStorageFill.style.width = `${percentUsed}%`;

    const viewStoragePercent = el("view-plan-storage-percent");
    if (viewStoragePercent) viewStoragePercent.textContent = `${percentUsed}% utilized of ${quota} MB allocation`;

    // Synchronize Plan & Usage Modal (if present)
    const modalStorageText = el("modal-plan-storage-text");
    if (modalStorageText) modalStorageText.textContent = `${usedMb.toFixed(2)} / ${quota} MB`;

    const modalStorageFill = el("modal-plan-storage-fill");
    if (modalStorageFill) modalStorageFill.style.width = `${percentUsed}%`;

    return { usedBytes, usedMb, quotaMb: quota, percentUsed: parseFloat(percentUsed) };
  }

  /**
   * Copies media URL to clipboard with toast notification.
   * @param {string} url
   */
  async function copyMediaUrl(url) {
    if (!url) return;
    const notify = (msg, type) => {
      if (typeof root.showCustomerToast === "function") return root.showCustomerToast(msg, type);
      if (typeof root.CustomerDashboard?.showToast === "function") return root.CustomerDashboard.showToast(msg, type);
      if (typeof root.showToast === "function") return root.showToast(msg, type);
    };

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(url);
      } else {
        const temp = document.createElement("input");
        temp.value = url;
        document.body.appendChild(temp);
        temp.select();
        const success = document.execCommand("copy");
        document.body.removeChild(temp);
        if (!success) throw new Error("Copy command failed");
      }
      notify("Media URL copied to clipboard! 📋", "success");
    } catch (_) {
      notify("Failed to copy URL.", "error");
    }
  }

  /**
   * Opens the Customer Asset Preview Lightbox Modal.
   * @param {Object} item - Media item object.
   */
  function openPreviewModal(item) {
    if (!item) return;
    currentPreviewItem = item;

    const modal = el("cust-media-preview-modal");
    const viewer = el("cust-preview-viewer");
    const titleEl = el("cust-preview-title");
    const typeBadge = el("cust-preview-type-badge");
    const recipientEl = el("cust-preview-recipient");
    const typeEl = el("cust-preview-type");
    const sourceEl = el("cust-preview-source");
    const viewWishBtn = el("btn-cust-preview-view-wish");
    const copyUrlBtn = el("btn-cust-preview-copy-url");

    if (!modal || !viewer) return;

    if (titleEl) titleEl.textContent = item.caption || "Asset Preview";
    if (recipientEl) recipientEl.textContent = item.recipient || "Celebration";
    if (typeEl) typeEl.textContent = item.type.toUpperCase();
    if (sourceEl) {
      sourceEl.textContent = item.source === "storage" ? "Cloud Storage (Supabase)" : (item.source === "local" ? "Local Application Asset" : "External Web Link");
    }

    if (typeBadge) {
      if (item.type === "photo") {
        typeBadge.className = "status-badge violet";
        typeBadge.textContent = "📸 Photo";
      } else if (item.type === "audio") {
        typeBadge.className = "status-badge gold";
        typeBadge.textContent = "🎵 Audio Track";
      } else if (item.type === "video") {
        typeBadge.className = "status-badge emerald";
        typeBadge.textContent = "🎥 Video";
      }
    }

    if (viewWishBtn) {
      viewWishBtn.href = item.wishId ? `/?w=${encodeURIComponent(item.wishId)}` : "#";
      viewWishBtn.style.display = item.wishId ? "inline-flex" : "none";
    }

    if (copyUrlBtn) {
      copyUrlBtn.onclick = () => copyMediaUrl(item.url);
    }

    // Populate media viewer element
    if (item.type === "photo") {
      viewer.innerHTML = `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.caption)}" style="max-width:100%; max-height:400px; object-fit:contain; border-radius:8px;">`;
    } else if (item.type === "audio") {
      viewer.innerHTML = `
        <div style="width:100%; height:100%; min-height:220px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:24px; background:rgba(20,10,34,0.9);">
          <span style="font-size:3.5rem;">🎧</span>
          <audio src="${escapeHtml(item.url)}" controls autoplay style="width:90%; max-width:480px; border-radius:8px;"></audio>
        </div>
      `;
    } else if (item.type === "video") {
      viewer.innerHTML = `
        <video src="${escapeHtml(item.url)}" controls autoplay playsinline style="max-width:100%; max-height:400px; width:100%; object-fit:contain; border-radius:8px; background:#000;"></video>
      `;
    }

    modal.style.display = "flex";
    modal.classList.add("active");
  }

  /**
   * Closes the Customer Asset Preview Lightbox Modal and stops media playback.
   */
  function closePreviewModal() {
    const modal = el("cust-media-preview-modal");
    const viewer = el("cust-preview-viewer");
    if (viewer) {
      const audio = viewer.querySelector("audio");
      const video = viewer.querySelector("video");
      if (audio) { try { audio.pause(); audio.src = ""; } catch (_) {} }
      if (video) { try { video.pause(); video.src = ""; } catch (_) {} }
      viewer.innerHTML = "";
    }
    if (modal) {
      modal.style.display = "none";
      modal.classList.remove("active");
    }
    currentPreviewItem = null;
  }

  /**
   * Renders media items, filters, search, sorting, and metrics.
   */
  function renderMediaLibrary() {
    const grid = el("customer-media-grid");
    if (!grid) return;

    const allMedia = extractCustomerMedia();

    // 1. Update KPI counters
    const photoCount = allMedia.filter(m => m.type === "photo").length;
    const audioCount = allMedia.filter(m => m.type === "audio").length;
    const videoCount = allMedia.filter(m => m.type === "video").length;

    const photoKpi = el("cust-media-kpi-photos");
    if (photoKpi) photoKpi.textContent = photoCount;

    const audioKpi = el("cust-media-kpi-audio");
    if (audioKpi) audioKpi.textContent = audioCount;

    const videoKpi = el("cust-media-kpi-video");
    if (videoKpi) videoKpi.textContent = videoCount;

    const totalKpi = el("cust-media-kpi-total");
    if (totalKpi) totalKpi.textContent = allMedia.length;

    // 2. Filter by Category
    let filtered = allMedia;
    if (activeMediaFilter === "photos") {
      filtered = allMedia.filter(m => m.type === "photo");
    } else if (activeMediaFilter === "audio") {
      filtered = allMedia.filter(m => m.type === "audio");
    } else if (activeMediaFilter === "video") {
      filtered = allMedia.filter(m => m.type === "video");
    }

    // 3. Filter by Search Query
    if (mediaSearchQuery && mediaSearchQuery.trim() !== "") {
      const q = mediaSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(m => {
        return (
          (m.caption && m.caption.toLowerCase().includes(q)) ||
          (m.recipient && m.recipient.toLowerCase().includes(q)) ||
          (m.type && m.type.toLowerCase().includes(q)) ||
          (m.url && m.url.toLowerCase().includes(q))
        );
      });
    }

    // 4. Sort Items
    filtered.sort((a, b) => {
      if (activeSortOption === "oldest") {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (activeSortOption === "name-asc") {
        return (a.recipient || "").localeCompare(b.recipient || "");
      }
      if (activeSortOption === "type") {
        return (a.type || "").localeCompare(b.type || "");
      }
      // Default: "newest"
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    // Update results counter badge
    const resultsCountEl = el("cust-media-results-count");
    if (resultsCountEl) {
      resultsCountEl.textContent = `${filtered.length} ${filtered.length === 1 ? "item" : "items"}`;
    }

    // 5. Render Grid or Empty State
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state-card full-span" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center; background: rgba(20, 10, 34, 0.5); border: 1px dashed var(--customer-border-glass); border-radius: 16px;">
          <div class="empty-state-icon" style="font-size: 3rem; margin-bottom: 12px;">📁</div>
          <h4 style="font-size: 1.2rem; color: #fff; margin: 0 0 8px 0;">No Media Found</h4>
          <p style="color: var(--customer-text-muted); font-size: 0.88rem; max-width: 440px; margin: 0 auto 20px auto;">
            ${mediaSearchQuery ? "No media matches your search term. Try a different query or reset filters." : "No photos, songs, or videos attached to your celebrations yet."}
          </p>
          <button type="button" class="btn-primary btn-gold" id="btn-media-create-wish" style="display:inline-flex; align-items:center; gap:8px; margin:auto;">
            <span>✨</span> Create New Celebration
          </button>
        </div>
      `;

      const btn = el("btn-media-create-wish");
      if (btn) {
        btn.addEventListener("click", () => {
          if (root.CustomerWishEditor && typeof root.CustomerWishEditor.openNew === "function") {
            root.CustomerWishEditor.openNew();
          }
        });
      }
      return;
    }

    let html = "";
    filtered.forEach((m, index) => {
      let previewHtml = "";
      let typeBadge = "";

      if (m.type === "photo") {
        typeBadge = `<span style="font-size:0.72rem;padding:2px 8px;border-radius:10px;background:rgba(168,85,247,0.2);color:var(--customer-purple-light);font-weight:600;">📸 Photo</span>`;
        previewHtml = `
          <div class="media-thumb-container" data-index="${index}" style="width:100%;height:150px;border-radius:10px;overflow:hidden;position:relative;cursor:pointer;background:#000;">
            <img src="${escapeHtml(m.url)}" alt="${escapeHtml(m.caption)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s ease;">
            <div class="media-preview-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,0.4);opacity:0;display:flex;align-items:center;justify-content:center;transition:opacity 0.2s ease;">
              <span style="background:rgba(0,0,0,0.7);color:#fff;padding:6px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;">🔍 Preview</span>
            </div>
          </div>
        `;
      } else if (m.type === "audio") {
        typeBadge = `<span style="font-size:0.72rem;padding:2px 8px;border-radius:10px;background:rgba(255,215,0,0.15);color:var(--customer-gold);font-weight:600;">🎵 Audio</span>`;
        previewHtml = `
          <div class="media-thumb-container" data-index="${index}" style="height:150px;background:linear-gradient(135deg,rgba(30,15,45,0.9),rgba(20,10,34,0.95));border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px;cursor:pointer;position:relative;">
            <span style="font-size:2.4rem;">🎧</span>
            <span style="font-size:0.78rem;color:var(--customer-gold);font-weight:600;">Click to Play Track</span>
            <div class="media-preview-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,0.3);opacity:0;display:flex;align-items:center;justify-content:center;transition:opacity 0.2s ease;border-radius:10px;">
              <span style="background:rgba(0,0,0,0.7);color:#fff;padding:6px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;">▶️ Play</span>
            </div>
          </div>
        `;
      } else if (m.type === "video") {
        typeBadge = `<span style="font-size:0.72rem;padding:2px 8px;border-radius:10px;background:rgba(46,204,113,0.15);color:var(--customer-emerald);font-weight:600;">🎥 Video</span>`;
        previewHtml = `
          <div class="media-thumb-container" data-index="${index}" style="height:150px;background:#000;border-radius:10px;overflow:hidden;position:relative;cursor:pointer;display:flex;align-items:center;justify-content:center;">
            <video src="${escapeHtml(m.url)}" preload="metadata" playsinline muted style="width:100%;height:100%;object-fit:cover;"></video>
            <div style="position:absolute;font-size:2.2rem;background:rgba(0,0,0,0.5);border-radius:50%;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">▶️</div>
          </div>
        `;
      }

      html += `
        <div class="customer-media-card" style="background:rgba(20,10,34,0.7);border:1px solid var(--customer-border-glass);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;transition:all 0.2s ease;">
          ${previewHtml}
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:0.85rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;" title="${escapeHtml(m.caption)}">${escapeHtml(m.caption)}</span>
              ${typeBadge}
            </div>
            <div style="font-size:0.76rem;color:var(--customer-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Used in: <strong>${escapeHtml(m.recipient)}</strong></div>
          </div>
          <div style="display:flex;gap:6px;margin-top:auto;">
            <button type="button" class="btn-quick-action secondary" data-action="copy-media-url" data-url="${escapeHtml(m.url)}" style="flex:1;padding:6px 10px;font-size:0.78rem;justify-content:center;cursor:pointer;">
              📋 Copy Link
            </button>
            <a href="/?w=${encodeURIComponent(m.wishId)}" target="_blank" rel="noopener noreferrer" class="btn-quick-action secondary" style="padding:6px 10px;font-size:0.78rem;justify-content:center;text-decoration:none;display:inline-flex;align-items:center;" title="View Celebration">
              👁️
            </a>
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;

    // Attach click events on thumbnails for Lightbox Preview
    grid.querySelectorAll(".media-thumb-container").forEach((thumb) => {
      const idx = parseInt(thumb.getAttribute("data-index"), 10);
      if (!isNaN(idx) && filtered[idx]) {
        thumb.addEventListener("click", () => openPreviewModal(filtered[idx]));
        thumb.addEventListener("mouseenter", () => {
          const over = thumb.querySelector(".media-preview-overlay");
          if (over) over.style.opacity = "1";
        });
        thumb.addEventListener("mouseleave", () => {
          const over = thumb.querySelector(".media-preview-overlay");
          if (over) over.style.opacity = "0";
        });
      }
    });

    // Attach copy button events
    grid.querySelectorAll("[data-action='copy-media-url']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const url = btn.getAttribute("data-url");
        copyMediaUrl(url);
      });
    });

    // Recalculate storage on render
    calculateCustomerStorage(allMedia);
  }

  /**
   * Initializes media filter pills, search input, sort select, and lightbox listeners.
   */
  function bindEvents() {
    // 1. Category Filter Pills
    document.querySelectorAll(".media-filter-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".media-filter-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        activeMediaFilter = pill.getAttribute("data-filter") || "all";
        renderMediaLibrary();
      });
    });

    // 2. Search Input (Debounced)
    const searchInp = el("cust-media-search-input");
    if (searchInp) {
      let searchTimer = null;
      searchInp.addEventListener("input", (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          mediaSearchQuery = e.target.value || "";
          renderMediaLibrary();
        }, 150);
      });
    }

    // 3. Sort Select
    const sortSelect = el("cust-media-sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        activeSortOption = e.target.value || "newest";
        renderMediaLibrary();
      });
    }

    // 4. Modal Close Listeners
    const btnCloseX = el("btn-close-cust-preview-modal-x");
    if (btnCloseX) btnCloseX.addEventListener("click", closePreviewModal);

    const btnClose = el("btn-close-cust-preview-modal");
    if (btnClose) btnClose.addEventListener("click", closePreviewModal);

    const backdrop = el("cust-media-preview-backdrop");
    if (backdrop) backdrop.addEventListener("click", closePreviewModal);

    // Global Escape Key Listener
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && currentPreviewItem) {
        closePreviewModal();
      }
    });
  }

  function init() {
    bindEvents();
    renderMediaLibrary();
  }

  root.CustomerMedia = Object.freeze({
    init,
    renderMediaLibrary,
    extractCustomerMedia,
    calculateCustomerStorage,
    updateStorageUsage: (wishes, quota) => calculateCustomerStorage(wishes, quota),
    openPreviewModal,
    closePreviewModal,
    copyMediaUrl
  });

})(typeof window !== "undefined" ? window : globalThis);
