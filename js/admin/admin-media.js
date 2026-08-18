/**
 * ============================================================================
 * ADMIN STUDIO MEDIA MODULE (js/admin/admin-media.js)
 * Manages Digital Asset Management (DAM), Supabase Storage bucket 'wish-media',
 * storage capacity analytics & progress bar, asset filtering, search, direct
 * uploads, asset preview lightbox, and safe cleanup operations.
 * ============================================================================
 */

(function (window) {
  "use strict";

  // Reusable core utilities
  const { showToast, formatBytes, copyWishUrl } = window.AdminCore || {};

  /* ============================================================
     1. CONSTANTS & SELECTORS
     ============================================================ */
  const BASE_TOTAL_BYTES = 1073741824; // 1 GB Base Cloud Storage Tier

  const SELECTORS = {
    gridContainer: "media-grid-container",
    directUploadInput: "dam-direct-upload-input",
    directUploadBtn: "btn-upload-media-admin",
    eventFilter: "dam-event-filter",
    searchInput: "dam-search-input",
    cleanupTrigger: "dam-cleanup-trigger-btn",
    cleanupMenu: "dam-cleanup-menu",
    delSelectedBtn: "btn-delete-selected-dam",
    delUnusedBtn: "btn-delete-unused-dam",
    delTempBtn: "btn-delete-temp-dam",
    storageProgressFill: "dam-storage-progress-fill",
    storageUsedText: "dam-storage-used-text",
    storageFreeText: "dam-storage-free-text",
    fileCountText: "dam-file-count-text",
    percentText: "dam-percent-text",
    kpiStorage: "kpi-storage-used",
    previewModal: "asset-preview-modal",
    modalFilename: "asset-modal-filename",
    modalViewer: "asset-modal-viewer",
    modalMeta: "asset-modal-meta",
    modalCopyBtn: "btn-modal-copy-url",
    modalDownloadBtn: "btn-modal-download"
  };

  /* ============================================================
     2. MODULE STATE
     ============================================================ */
  let realStorageFiles = [];
  let currentDamFilter = "all";
  let currentDamEventFilter = "all";
  let damSearchQuery = "";
  let selectedFilePaths = new Set();
  let onEventHook = null;

  /* ============================================================
     3. STORAGE DATA LOADING & ANALYTICS
     ============================================================ */
  /**
   * Fetches real assets list from Supabase Storage and maps metadata with wish linkages.
   * @param {Array} [activeWishes=[]] - Active wishes list to determine asset usage.
   * @returns {Promise<Array>} Resolved files metadata array.
   */
  async function loadStorageMediaData(activeWishes = []) {
    try {
      if (window.StorageModule && typeof window.StorageModule.listAllMedia === "function") {
        const files = await window.StorageModule.listAllMedia();
        if (Array.isArray(files)) {
          realStorageFiles = files.map((f, i) => {
            let isUsed = false;
            let usedInName = "Unused";
            let usedInUuid = null;

            if (Array.isArray(activeWishes) && activeWishes.length > 0) {
              activeWishes.forEach(w => {
                if (w.music_url === f.publicUrl || w.video_url === f.publicUrl) {
                  isUsed = true;
                  usedInName = w.recipient_name || "Wish";
                  usedInUuid = w.id;
                }
                if (Array.isArray(w.gallery_json)) {
                  w.gallery_json.forEach(g => {
                    if (g.image === f.publicUrl) {
                      isUsed = true;
                      usedInName = w.recipient_name || "Gallery";
                      usedInUuid = w.id;
                    }
                  });
                }
              });
            }

            const eventType = f.name.includes("anniversary") ? "anniversary"
                            : f.name.includes("wedding") ? "wedding"
                            : f.name.includes("engagement") ? "engagement"
                            : f.name.includes("proposal") ? "proposal"
                            : f.name.includes("baby") ? "baby_shower"
                            : f.name.includes("farewell") ? "farewell"
                            : f.name.includes("grad") ? "graduation"
                            : "birthday";

            return {
              ...f,
              owner: f.owner || "Admin",
              eventType: eventType,
              isUsed: isUsed,
              usedInName: usedInName,
              usedInUuid: usedInUuid,
              isFavorite: i % 5 === 0
            };
          });
        }
      }
    } catch (e) {
      console.warn("AdminMedia: Using fallback local asset data:", e);
    }

    updateStorageAnalytics();
    renderDamGrid();
    return realStorageFiles;
  }

  /**
   * Recalculates storage capacity, progress bar width, and filter count badges.
   */
  function updateStorageAnalytics() {
    let usedBytes = 0;
    let imagesCount = 0;
    let videosCount = 0;
    let audioCount = 0;
    let usedCount = 0;
    let unusedCount = 0;
    let favCount = 0;
    let recentCount = 0;

    const oneWeekAgo = Date.now() - 7 * 86400000;
    const format = typeof formatBytes === "function" ? formatBytes : (b => `${b} B`);

    realStorageFiles.forEach(f => {
      usedBytes += (f.size || 0);
      if (f.folder === "photos") imagesCount++;
      if (f.folder === "videos") videosCount++;
      if (f.folder === "audio") audioCount++;
      if (f.isUsed) usedCount++;
      else unusedCount++;
      if (f.isFavorite) favCount++;
      if (new Date(f.created_at).getTime() > oneWeekAgo) recentCount++;
    });

    const percentUsed = Math.min(100, Math.max(0.5, ((usedBytes / BASE_TOTAL_BYTES) * 100))).toFixed(1);
    const freeBytes = Math.max(0, BASE_TOTAL_BYTES - usedBytes);

    // Update Progress Bar
    const progressFill = document.getElementById(SELECTORS.storageProgressFill);
    if (progressFill) progressFill.style.width = `${percentUsed}%`;

    const usedText = document.getElementById(SELECTORS.storageUsedText);
    if (usedText) usedText.textContent = `${format(usedBytes)} / 1 GB`;

    const freeText = document.getElementById(SELECTORS.storageFreeText);
    if (freeText) freeText.textContent = `${format(freeBytes)} Remaining`;

    const countText = document.getElementById(SELECTORS.fileCountText);
    if (countText) countText.textContent = `Total Files: ${realStorageFiles.length} (${imagesCount} Photos, ${videosCount} Videos, ${audioCount} Audio)`;

    const percentText = document.getElementById(SELECTORS.percentText);
    if (percentText) percentText.textContent = `${percentUsed}% Capacity Used`;

    // Update KPI Card on Dashboard
    const kpiStorage = document.getElementById(SELECTORS.kpiStorage);
    if (kpiStorage) kpiStorage.textContent = format(usedBytes);

    // Update Filter Chip Counter Badges
    const elAll = document.getElementById("count-all"); if (elAll) elAll.textContent = realStorageFiles.length;
    const elImg = document.getElementById("count-images"); if (elImg) elImg.textContent = imagesCount;
    const elVid = document.getElementById("count-videos"); if (elVid) elVid.textContent = videosCount;
    const elAud = document.getElementById("count-audio"); if (elAud) elAud.textContent = audioCount;
    const elUsed = document.getElementById("count-used"); if (elUsed) elUsed.textContent = usedCount;
    const elUnused = document.getElementById("count-unused"); if (elUnused) elUnused.textContent = unusedCount;
    const elFav = document.getElementById("count-favorites"); if (elFav) elFav.textContent = favCount;
    const elRec = document.getElementById("count-recent"); if (elRec) elRec.textContent = recentCount;
  }

  /* ============================================================
     4. FILTERING & SEARCH
     ============================================================ */
  /**
   * Filters the media items array according to current chip filter, event tag, and search query.
   * @returns {Array} Filtered list of files.
   */
  function getFilteredFiles() {
    let items = realStorageFiles;

    // 1. Chip Category Filter
    if (currentDamFilter === "images") items = items.filter(f => f.folder === "photos");
    else if (currentDamFilter === "videos") items = items.filter(f => f.folder === "videos");
    else if (currentDamFilter === "audio") items = items.filter(f => f.folder === "audio");
    else if (currentDamFilter === "used") items = items.filter(f => f.isUsed);
    else if (currentDamFilter === "unused") items = items.filter(f => !f.isUsed);
    else if (currentDamFilter === "favorites") items = items.filter(f => f.isFavorite);
    else if (currentDamFilter === "recent") {
      const weekAgo = Date.now() - 7 * 86400000;
      items = items.filter(f => new Date(f.created_at).getTime() > weekAgo);
    }

    // 2. Event Tag Filter
    if (currentDamEventFilter !== "all") {
      items = items.filter(f => f.eventType === currentDamEventFilter);
    }

    // 3. Search Query Matching
    if (damSearchQuery) {
      const q = damSearchQuery.toLowerCase();
      items = items.filter(f =>
        (f.name || "").toLowerCase().includes(q) ||
        (f.owner || "").toLowerCase().includes(q) ||
        (f.usedInName || "").toLowerCase().includes(q) ||
        (f.eventType || "").toLowerCase().includes(q) ||
        (f.path || "").toLowerCase().includes(q)
      );
    }

    return items;
  }

  /* ============================================================
     5. DAM GRID & PREVIEW RENDERING
     ============================================================ */
  /**
   * Renders the Digital Asset Management grid cards into #media-grid-container.
   */
  function renderDamGrid() {
    const container = document.getElementById(SELECTORS.gridContainer);
    if (!container) return;

    const items = getFilteredFiles();
    const format = typeof formatBytes === "function" ? formatBytes : (b => `${b} B`);

    container.innerHTML = "";

    if (items.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:48px;background:rgba(255,255,255,0.03);border:1px dashed var(--border-glass);border-radius:16px;">
          <span style="font-size:3rem;">🖼</span>
          <h4 style="font-family:var(--font-heading);font-size:1.2rem;margin:12px 0 6px 0;color:var(--gold);">No Media Assets Found</h4>
          <p style="color:var(--text-muted);font-size:0.85rem;">Upload new images, videos or audio files to your Supabase Storage bucket.</p>
        </div>
      `;
      return;
    }

    items.forEach(file => {
      const card = document.createElement("div");
      card.className = "glass-card dam-asset-card";

      let previewHtml = "";
      if (file.folder === "photos") {
        previewHtml = `<img src="${file.publicUrl}" alt="${file.name}" onerror="this.style.display='none'; this.parentElement.insertAdjacentHTML('beforeend', '<div class=\\'gallery-emoji-tile\\'>📷</div>');">`;
      } else if (file.folder === "videos") {
        previewHtml = `<video src="${file.publicUrl}" preload="metadata" muted></video>`;
      } else {
        previewHtml = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><span style="font-size:3.2rem;color:var(--gold);">🎙</span><span style="font-size:0.75rem;color:var(--text-muted);">${file.name}</span></div>`;
      }

      const isChecked = selectedFilePaths.has(file.path);
      const usedBadgeHtml = file.isUsed 
        ? `<span class="used-badge" title="Linked to Wish: ${file.usedInName}">🔗 ${file.usedInName}</span>` 
        : `<span class="used-badge unused">⭕ Unused</span>`;

      card.innerHTML = `
        <div class="dam-preview-box">
          <div class="badge-row">
            <span class="event-tag">${file.eventType}</span>
            ${usedBadgeHtml}
          </div>

          ${previewHtml}

          <!-- Hover Action Overlay -->
          <div class="hover-actions-overlay">
            <button class="overlay-btn" title="👁️ Preview" onclick="window.adminApp ? window.adminApp.openAssetPreview('${file.publicUrl}', '${file.name}', '${file.folder}', '${format(file.size)}') : (window.AdminMedia && window.AdminMedia.openAssetPreview('${file.publicUrl}', '${file.name}', '${file.folder}', '${format(file.size)}'))">👁️</button>
            <a class="overlay-btn" title="📥 Download" href="${file.publicUrl}" download target="_blank" style="text-decoration:none;">📥</a>
            <button class="overlay-btn" title="📋 Copy URL" onclick="window.adminApp ? window.adminApp.copyWishUrl('${file.publicUrl}') : (window.AdminCore && window.AdminCore.copyWishUrl('${file.publicUrl}'))">📋</button>
            <button class="overlay-btn" title="✏️ Rename" onclick="window.adminApp ? window.adminApp.renameAsset('${file.path}', '${file.name}') : (window.AdminMedia && window.AdminMedia.renameAsset('${file.path}', '${file.name}'))">✏️</button>
            <button class="overlay-btn danger" title="🗑 Delete" onclick="window.adminApp ? window.adminApp.deleteSingleAsset('${file.path}') : (window.AdminMedia && window.AdminMedia.deleteSingleAsset('${file.path}'))">🗑️</button>
          </div>
        </div>

        <div class="asset-info-box">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <input type="checkbox" class="dam-file-checkbox" data-path="${file.path}" ${isChecked ? "checked" : ""} style="cursor:pointer;">
            <div class="asset-title" title="${file.name}">${file.name}</div>
          </div>
          <div class="asset-owner-row">
            <span>Owner: <strong>${file.owner}</strong></span>
            <span style="color:var(--gold);">${file.folder.toUpperCase()}</span>
          </div>
          <div class="asset-meta-row">
            <span>${format(file.size)}</span>
            <span>${new Date(file.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      `;

      const chk = card.querySelector(".dam-file-checkbox");
      if (chk) {
        chk.addEventListener("change", (e) => {
          if (e.target.checked) selectedFilePaths.add(file.path);
          else selectedFilePaths.delete(file.path);
        });
      }

      container.appendChild(card);
    });
  }

  /**
   * Opens the asset preview lightbox modal.
   * @param {string} url - Public asset URL.
   * @param {string} filename - Display filename.
   * @param {string} folder - Asset folder category (photos, videos, audio).
   * @param {string} size - Formatted size string.
   */
  function openAssetPreview(url, filename, folder, size) {
    const modal = document.getElementById(SELECTORS.previewModal);
    const nameEl = document.getElementById(SELECTORS.modalFilename);
    const viewerEl = document.getElementById(SELECTORS.modalViewer);
    const metaEl = document.getElementById(SELECTORS.modalMeta);
    const copyBtn = document.getElementById(SELECTORS.modalCopyBtn);
    const dlBtn = document.getElementById(SELECTORS.modalDownloadBtn);

    if (!modal || !viewerEl) return;

    if (nameEl) nameEl.textContent = filename;
    if (metaEl) metaEl.textContent = `Size: ${size} | URL: ${url}`;
    if (dlBtn) dlBtn.href = url;
    if (copyBtn) {
      copyBtn.onclick = () => {
        if (typeof copyWishUrl === "function") copyWishUrl(url);
      };
    }

    if (folder === "photos") {
      viewerEl.innerHTML = `<img src="${url}" style="max-width:100%;max-height:55vh;object-fit:contain;">`;
    } else if (folder === "videos") {
      viewerEl.innerHTML = `<video src="${url}" controls autoplay style="max-width:100%;max-height:55vh;"></video>`;
    } else {
      viewerEl.innerHTML = `<audio src="${url}" controls autoplay style="width:80%;margin:20px;"></audio>`;
    }

    modal.classList.add("open");
  }

  /* ============================================================
     6. ASSET ACTIONS & CLEANUP TOOLS
     ============================================================ */
  /**
   * Deletes a single media file from cloud storage and state.
   * @param {string} path - Cloud file path.
   */
  async function deleteSingleAsset(path) {
    if (typeof window.confirm === "function" && !window.confirm("Are you sure you want to delete this media asset from Supabase Storage?")) return;
    if (typeof showToast === "function") showToast("Deleting asset... ⏳");

    if (window.StorageModule && typeof window.StorageModule.deleteMedia === "function") {
      const ok = await window.StorageModule.deleteMedia(path);
      if (ok) {
        realStorageFiles = realStorageFiles.filter(f => f.path !== path);
        updateStorageAnalytics();
        renderDamGrid();
        if (typeof onEventHook === "function") onEventHook("MEDIA_DELETE", `Deleted cloud asset: ${path}`);
        if (typeof showToast === "function") showToast("Asset deleted from Supabase Storage 🗑️");
        return;
      }
    }

    realStorageFiles = realStorageFiles.filter(f => f.path !== path);
    updateStorageAnalytics();
    renderDamGrid();
    if (typeof showToast === "function") showToast("Asset removed from library 🗑️");
  }

  /**
   * Prompts to rename a media asset in the catalog.
   * @param {string} path - Cloud file path.
   * @param {string} currentName - Current filename.
   */
  function renameAsset(path, currentName) {
    if (typeof window.prompt !== "function") return;
    const newName = window.prompt("Enter new filename for asset:", currentName);
    if (!newName || newName === currentName) return;

    const file = realStorageFiles.find(f => f.path === path);
    if (file) {
      file.name = newName;
      renderDamGrid();
      if (typeof onEventHook === "function") onEventHook("MEDIA_RENAME", `Renamed asset ${currentName} to ${newName}`);
      if (typeof showToast === "function") showToast("Asset renamed! ✏️");
    }
  }

  /**
   * Deletes all currently selected checkbox assets in bulk.
   */
  async function deleteSelectedAssets() {
    if (selectedFilePaths.size === 0) {
      if (typeof showToast === "function") showToast("No media files selected for deletion ⚠️");
      return;
    }
    if (typeof window.confirm === "function" && !window.confirm(`Delete ${selectedFilePaths.size} selected file(s) from Supabase Storage?`)) return;

    if (typeof showToast === "function") showToast(`Deleting ${selectedFilePaths.size} files... ⏳`);
    const pathsArray = Array.from(selectedFilePaths);

    if (window.StorageModule && typeof window.StorageModule.deleteMultipleMedia === "function") {
      await window.StorageModule.deleteMultipleMedia(pathsArray);
    }

    realStorageFiles = realStorageFiles.filter(f => !selectedFilePaths.has(f.path));
    selectedFilePaths.clear();
    updateStorageAnalytics();
    renderDamGrid();

    if (typeof onEventHook === "function") onEventHook("MEDIA_CLEANUP", `Bulk deleted ${pathsArray.length} assets`);
    if (typeof showToast === "function") showToast("Selected files deleted 🗑️");
  }

  /**
   * Deletes all unlinked media files in bulk.
   */
  async function deleteUnusedAssets() {
    const unusedFiles = realStorageFiles.filter(f => !f.isUsed);
    if (unusedFiles.length === 0) {
      if (typeof showToast === "function") showToast("Zero unused files found — All assets are currently linked! ✨");
      return;
    }

    if (typeof window.confirm === "function" && !window.confirm(`Clean up ${unusedFiles.length} unused media file(s) not linked to any wish?`)) return;

    if (typeof showToast === "function") showToast(`Cleaning up ${unusedFiles.length} unused files... ⏳`);
    const pathsArray = unusedFiles.map(f => f.path);

    if (window.StorageModule && typeof window.StorageModule.deleteMultipleMedia === "function") {
      await window.StorageModule.deleteMultipleMedia(pathsArray);
    }

    realStorageFiles = realStorageFiles.filter(f => f.isUsed);
    updateStorageAnalytics();
    renderDamGrid();

    if (typeof onEventHook === "function") onEventHook("MEDIA_CLEANUP", `Safe cleanup removed ${unusedFiles.length} unlinked files`);
    if (typeof showToast === "function") showToast(`🧹 Successfully cleaned up ${unusedFiles.length} unused files! ✨`);
  }

  /**
   * Deletes old temporary unlinked files created over 7 days ago.
   */
  async function deleteOldTempAssets() {
    const weekAgo = Date.now() - 7 * 86400000;
    const tempFiles = realStorageFiles.filter(f => !f.isUsed && new Date(f.created_at).getTime() < weekAgo);

    if (tempFiles.length === 0) {
      if (typeof showToast === "function") showToast("No old temporary files found (> 7 days unlinked) ✨");
      return;
    }

    if (typeof window.confirm === "function" && !window.confirm(`Delete ${tempFiles.length} old temporary file(s) created over 7 days ago?`)) return;

    if (typeof showToast === "function") showToast(`Deleting ${tempFiles.length} temp files... ⏳`);
    const pathsArray = tempFiles.map(f => f.path);

    if (window.StorageModule && typeof window.StorageModule.deleteMultipleMedia === "function") {
      await window.StorageModule.deleteMultipleMedia(pathsArray);
    }

    realStorageFiles = realStorageFiles.filter(f => !pathsArray.includes(f.path));
    updateStorageAnalytics();
    renderDamGrid();

    if (typeof onEventHook === "function") onEventHook("MEDIA_CLEANUP", `Deleted ${tempFiles.length} old temp files`);
    if (typeof showToast === "function") showToast(`⏳ Cleaned up ${tempFiles.length} old temp files! ✨`);
  }

  /* ============================================================
     7. DIRECT UPLOAD
     ============================================================ */
  /**
   * Initializes direct file upload to bucket 'wish-media'.
   */
  function initDamDirectUpload() {
    const input = document.getElementById(SELECTORS.directUploadInput);
    if (!input || input.__damBound) return;
    input.__damBound = true;

    input.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      if (typeof showToast === "function") showToast(`Uploading ${files.length} asset(s) to Supabase Storage... ☁️`);
      for (const file of files) {
        const folder = file.type.startsWith("image/") ? "photos"
                     : file.type.startsWith("video/") ? "videos"
                     : "audio";

        if (window.StorageModule && typeof window.StorageModule.uploadMedia === "function") {
          await window.StorageModule.uploadMedia(file, folder);
        }
      }

      await loadStorageMediaData();
      if (typeof onEventHook === "function") onEventHook("MEDIA_UPLOAD", `Uploaded ${files.length} new asset(s) to wish-media`);
      if (typeof showToast === "function") showToast(`☁️ ${files.length} asset(s) uploaded to Cloud Storage! ✨`);
      input.value = "";
    });
  }

  /* ============================================================
     8. EVENT HANDLERS & INITIALIZATION
     ============================================================ */
  /**
   * Initializes DAM filter chips, search input, event filter dropdown, and cleanup tools.
   * @param {Function} [onEventCallback] - Callback triggered when media mutations occur.
   */
  function init(onEventCallback) {
    if (typeof onEventCallback === "function") {
      onEventHook = onEventCallback;
    }

    initDamDirectUpload();

    // DAM Filter Chips Listeners
    const chipBtns = document.querySelectorAll(".dam-filter-bar .chip-btn");
    chipBtns.forEach(btn => {
      if (!btn.__damBound) {
        btn.__damBound = true;
        btn.addEventListener("click", () => {
          chipBtns.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          currentDamFilter = btn.dataset.damfilter || "all";
          renderDamGrid();
        });
      }
    });

    // DAM Event Filter Dropdown
    const eventSelect = document.getElementById(SELECTORS.eventFilter);
    if (eventSelect && !eventSelect.__damBound) {
      eventSelect.__damBound = true;
      eventSelect.addEventListener("change", (e) => {
        currentDamEventFilter = e.target.value;
        renderDamGrid();
      });
    }

    // DAM Live Search Input
    const damSearchInput = document.getElementById(SELECTORS.searchInput);
    if (damSearchInput && !damSearchInput.__damBound) {
      damSearchInput.__damBound = true;
      damSearchInput.addEventListener("input", (e) => {
        damSearchQuery = e.target.value.trim();
        renderDamGrid();
      });
    }

    // Cleanup Tools Dropdown Menu & Button Listeners
    const cleanupTrigger = document.getElementById(SELECTORS.cleanupTrigger);
    const cleanupMenu = document.getElementById(SELECTORS.cleanupMenu);
    if (cleanupTrigger && cleanupMenu && !cleanupTrigger.__damBound) {
      cleanupTrigger.__damBound = true;
      cleanupTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        cleanupMenu.style.display = cleanupMenu.style.display === "block" ? "none" : "block";
      });
      if (typeof document.addEventListener === "function") {
        document.addEventListener("click", () => { cleanupMenu.style.display = "none"; });
      }
    }

    const delSelectedBtn = document.getElementById(SELECTORS.delSelectedBtn);
    if (delSelectedBtn && !delSelectedBtn.__damBound) {
      delSelectedBtn.__damBound = true;
      delSelectedBtn.addEventListener("click", deleteSelectedAssets);
    }

    const delUnusedBtn = document.getElementById(SELECTORS.delUnusedBtn);
    if (delUnusedBtn && !delUnusedBtn.__damBound) {
      delUnusedBtn.__damBound = true;
      delUnusedBtn.addEventListener("click", deleteUnusedAssets);
    }

    const delTempBtn = document.getElementById(SELECTORS.delTempBtn);
    if (delTempBtn && !delTempBtn.__damBound) {
      delTempBtn.__damBound = true;
      delTempBtn.addEventListener("click", deleteOldTempAssets);
    }
  }

  /* ============================================================
     9. AUTHORITATIVE PUBLIC API
     ============================================================ */
  window.AdminMedia = Object.freeze({
    init,
    load: loadStorageMediaData,
    render: renderDamGrid,
    getFiles: () => [...realStorageFiles],
    setFiles: (files) => { realStorageFiles = Array.isArray(files) ? files : []; updateStorageAnalytics(); renderDamGrid(); },
    openAssetPreview,
    deleteSingleAsset,
    renameAsset,
    deleteSelectedAssets,
    deleteUnusedAssets,
    deleteOldTempAssets,
    updateStorageAnalytics
  });

})(window);
