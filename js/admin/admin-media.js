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
    btnClosePreviewX: "btn-close-preview-modal-x",
    modalFilename: "asset-modal-filename",
    modalViewer: "asset-modal-viewer",
    modalMeta: "asset-modal-meta",
    modalCopyBtn: "btn-modal-copy-url",
    modalDownloadBtn: "btn-modal-download",
    scanOrphanBtn: "btn-scan-orphan-media",
    scanSummary: "dam-scan-summary",
    scanStatus: "scan-summary-status",
    scanCountTotal: "scan-count-total",
    scanCountUsed: "scan-count-used",
    scanCountOrphan: "scan-count-orphan",
    unusedSelectionBar: "dam-unused-selection-bar",
    unusedCountText: "unused-selected-count-text",
    unusedSizeText: "unused-selected-size-text",
    btnSelectAllUnused: "btn-select-all-unused",
    btnReviewUnused: "btn-review-unused-cleanup",
    btnClearUnusedSelection: "btn-clear-unused-selection",
    unusedCleanupModal: "unused-cleanup-modal",
    unusedModalCount: "unused-modal-file-count",
    unusedModalSize: "unused-modal-total-size",
    unusedModalList: "unused-modal-file-list",
    btnCloseUnusedX: "btn-close-unused-modal-x",
    btnCancelUnused: "btn-cancel-unused-review",
    btnConfirmUnused: "btn-confirm-unused-review",
    btnStartUnusedCleanup: "btn-start-unused-cleanup",
    btnConfirmDeleteUnused: "btn-confirm-delete-unused",
    btnBackToUnusedReview: "btn-back-to-unused-review",
    unusedModalWarningBox: "unused-modal-warning-box",
    unusedModalDangerBox: "unused-modal-danger-box",
    unusedModalReviewFooter: "unused-modal-review-footer",
    unusedModalConfirmFooter: "unused-modal-confirm-footer",
    unusedModalStatusBadge: "unused-modal-status-badge",
    unusedConfirmCountText: "unused-confirm-count-text",
    unusedConfirmSizeText: "unused-confirm-size-text",
    inspectorModal: "asset-inspector-modal",
    inspectorCloseBtn: "btn-close-inspector",
    inspectorCloseXBtn: "btn-close-inspector-modal-x",
    inspectorCopyUrlBtn: "btn-inspector-copy-url",
    inspectorCopyPathBtn: "btn-inspector-copy-path",
    inspectorDownloadBtn: "btn-inspector-download",
    inspectorMediaPreview: "inspector-media-preview",
    inspectorFileName: "inspector-file-name",
    inspectorFilePath: "inspector-file-path",
    inspectorFileFolder: "inspector-file-folder",
    inspectorFileSize: "inspector-file-size",
    inspectorFileMime: "inspector-file-mimetype",
    inspectorFileDate: "inspector-file-date",
    inspectorStatusBadge: "inspector-status-badge",
    inspectorUsedSection: "inspector-used-section",
    inspectorUnusedSection: "inspector-unused-section",
    inspectorReferencesList: "inspector-references-list",
    inspectorRefCountText: "inspector-ref-count-text",
    inspectorSelectCleanupBtn: "btn-inspector-select-cleanup",
    sortSelect: "dam-sort-select"
  };

  /* ============================================================
     2. MODULE STATE
     ============================================================ */
  let realStorageFiles = [];
  let cachedActiveWishes = [];
  let currentDamFilter = "all";
  let currentDamSort = "newest";
  let currentDamEventFilter = "all";
  let damSearchQuery = "";
  let selectedFilePaths = new Set();
  let selectedUnusedPaths = new Set();
  let onEventHook = null;

  /**
   * Safe HTML escaping utility to prevent XSS.
   * @param {string} str - Raw string.
   * @returns {string} Escaped HTML string.
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ============================================================
     2.5. MEDIA REFERENCE EXTRACTION ENGINE (Phase 31C-1)
     Deeply inspects active wish records to extract and map all
     referenced cloud storage assets in bucket 'wish-media'.
     ============================================================ */
  const BUCKET_NAME = "wish-media";

  /**
   * Reference type classification enum.
   */
  const ReferenceType = Object.freeze({
    STORAGE: "STORAGE",       // Supabase Storage asset in wish-media bucket
    LOCAL: "LOCAL",           // Local/default repository asset (e.g. assets/audio/...)
    DATA_URL: "DATA_URL",     // Inline Base64 image payload (data:image/...)
    EXTERNAL: "EXTERNAL",     // External HTTP/HTTPS URL (YouTube, Vimeo, CDN)
    UNKNOWN: "UNKNOWN"        // Malformed, empty, or unresolvable path
  });

  /**
   * Formats byte size into human readable string.
   * @param {number} bytes
   * @returns {string} Formatted size (e.g. "1.2 MB", "200.0 KB").
   */
  function formatSize(bytes) {
    if (typeof formatBytes === "function") return formatBytes(bytes);
    if (typeof window !== "undefined" && typeof window.formatBytes === "function") return window.formatBytes(bytes);
    const b = Number(bytes) || 0;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Classifies a media reference string into its architectural category.
   * @param {*} ref - Raw reference value to inspect.
   * @returns {string} ReferenceType value.
   */
  function classifyReference(ref) {
    if (!ref || typeof ref !== "string") return ReferenceType.INVALID;
    const clean = ref.trim();
    if (!clean) return ReferenceType.INVALID;

    // 1. Data URLs
    if (clean.startsWith("data:")) return ReferenceType.DATA_URL;

    // 2. Local repository assets
    if (
      clean.startsWith("assets/") ||
      clean.startsWith("./assets/") ||
      clean.startsWith("/assets/") ||
      clean.startsWith("images/") ||
      clean.startsWith("./images/") ||
      clean.startsWith("/images/")
    ) {
      return ReferenceType.LOCAL;
    }

    // 3. Supabase Storage URLs or relative bucket paths
    if (
      clean.includes("wish-media") ||
      clean.includes("/storage/v1/object/public/") ||
      clean.includes("/storage/v1/object/sign/") ||
      clean.startsWith("photos/") ||
      clean.startsWith("videos/") ||
      (clean.startsWith("audio/") && !clean.includes("assets/"))
    ) {
      return ReferenceType.STORAGE;
    }

    // 4. External HTTP/HTTPS URLs
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return ReferenceType.EXTERNAL;
    }

    return ReferenceType.INVALID;
  }

  /**
   * Canonicalizes any Storage URL, relative path, or metadata-encoded string
   * into a standardized relative storage path: "${folder}/${filename}".
   * Strips query parameters, #bw-start metadata, URL encoding, and bucket prefixes.
   * @param {string} urlOrPath - Storage URL or path.
   * @param {string} [bucket="wish-media"] - Target storage bucket name.
   * @returns {string|null} Canonical storage path (e.g. "photos/1724234567_abc.jpg") or null.
   */
  function normalizeStoragePath(urlOrPath, bucket = BUCKET_NAME) {
    if (!urlOrPath || typeof urlOrPath !== "string") return null;
    let str = urlOrPath.trim();
    if (!str) return null;

    // Quick reject for data URLs and local assets
    if (
      str.startsWith("data:") ||
      str.startsWith("assets/") ||
      str.startsWith("./assets/") ||
      str.startsWith("/assets/") ||
      str.startsWith("images/") ||
      str.startsWith("./images/") ||
      str.startsWith("/images/")
    ) {
      return null;
    }

    // 1. Strip #bw-start=N and any URL fragments/hashes
    str = str.replace(/#.*$/, "");

    // 2. Strip query string ?...
    str = str.replace(/\?.*$/, "");

    // 3. Decode URI components (e.g. %20, %2F)
    try {
      str = decodeURIComponent(str);
    } catch (e) {
      // Fallback if malformed % sequence
    }

    // 4. If full URL, extract the path after bucket name
    const bucketPattern = new RegExp(`(?:/storage/v1/object/(?:public|sign)/|/)?${bucket}/([^?#]+)`, "i");
    const bucketMatch = str.match(bucketPattern);
    if (bucketMatch && bucketMatch[1]) {
      str = bucketMatch[1];
    } else if (str.startsWith("http://") || str.startsWith("https://")) {
      // External URL not belonging to wish-media bucket
      return null;
    }

    // 5. Clean leading/trailing slashes and normalize separators
    str = str.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "").trim();

    // 6. Validate that it matches a recognized folder prefix: photos/, videos/, or audio/
    const validFolderMatch = str.match(/^(photos|videos|audio)\/(.+)$/i);
    if (validFolderMatch) {
      const folder = validFolderMatch[1].toLowerCase();
      const filename = validFolderMatch[2].trim();
      if (filename && filename !== ".emptyFolderPlaceholder") {
        return `${folder}/${filename}`;
      }
    }

    return null;
  }

  /**
   * Safely parses JSON string or returns raw data without throwing errors.
   * @param {*} val - Value to parse.
   * @returns {*} Parsed value or null if malformed.
   */
  function safeParseJson(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === "object") return val;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          return JSON.parse(trimmed);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Extracts all cloud storage references from a single active wish record.
   * @param {Object} wish - Active wish database record.
   * @returns {Array<Object>} Array of reference metadata objects.
   */
  function extractReferencesFromWish(wish) {
    if (!wish || typeof wish !== "object") return [];

    const wishId = wish.id || "unknown";
    const recipientName = wish.recipient_name || wish.name || "Wish";
    const senderName = wish.sender_name || wish.from || "";
    const references = [];

    function addRef(rawVal, field) {
      if (!rawVal || typeof rawVal !== "string") return;
      const canonicalPath = normalizeStoragePath(rawVal);
      if (canonicalPath) {
        references.push({
          wishId,
          recipientName,
          senderName,
          field,
          rawReference: rawVal,
          canonicalPath
        });
      }
    }

    // 1. Music URL
    if (typeof wish.music_url === "string") {
      addRef(wish.music_url, "music_url");
    } else if (wish.music && typeof wish.music === "object" && typeof wish.music.file === "string") {
      addRef(wish.music.file, "music_url");
    }

    // 2. Video URL
    if (typeof wish.video_url === "string") {
      addRef(wish.video_url, "video_url");
    } else if (wish.videoWish && typeof wish.videoWish === "object") {
      const vidVal = wish.videoWish.url || wish.videoWish.file;
      if (typeof vidVal === "string") addRef(vidVal, "video_url");
    }

    // 3. Gallery Items (gallery_json)
    const galleryData = safeParseJson(wish.gallery_json) || (Array.isArray(wish.gallery) ? wish.gallery : null);
    if (Array.isArray(galleryData)) {
      galleryData.forEach((item, idx) => {
        if (typeof item === "string") {
          addRef(item, `gallery_json[${idx}]`);
        } else if (item && typeof item === "object") {
          const imgVal = item.image || item.url || item.src || item.file;
          if (typeof imgVal === "string") {
            addRef(imgVal, `gallery_json[${idx}]`);
          }
        }
      });
    }

    // 4. Timeline Items (timeline_json / memory_timeline_json)
    const timelineData = safeParseJson(wish.timeline_json) || safeParseJson(wish.memory_timeline_json) || (Array.isArray(wish.timeline) ? wish.timeline : null);
    if (Array.isArray(timelineData)) {
      timelineData.forEach((item, idx) => {
        if (typeof item === "string") {
          addRef(item, `timeline_json[${idx}]`);
        } else if (item && typeof item === "object") {
          const imgVal = item.image || item.url || item.src || item.photo;
          if (typeof imgVal === "string") {
            addRef(imgVal, `timeline_json[${idx}]`);
          }
        }
      });
    }

    // 5. Optional cover/avatar/cake image references if present
    if (typeof wish.cover_image === "string") addRef(wish.cover_image, "cover_image");
    if (typeof wish.avatar === "string") addRef(wish.avatar, "avatar");

    return references;
  }

  /**
   * Extracts references across an array of wish records.
   * @param {Array<Object>} wishes - Array of wish records.
   * @returns {Array<Object>} Flattened array of all reference objects.
   */
  function extractReferencesFromWishes(wishes) {
    if (!Array.isArray(wishes) || wishes.length === 0) return [];
    const allRefs = [];
    wishes.forEach(w => {
      try {
        const refs = extractReferencesFromWish(w);
        allRefs.push(...refs);
      } catch (e) {
        console.warn("MediaReferenceEngine: Error extracting references from wish:", w?.id, e);
      }
    });
    return allRefs;
  }

  /**
   * Builds an authoritative Reference Map indexed by canonical storage path.
   * @param {Array<Object>} wishes - Active wishes list.
   * @returns {Object} Reference Map interface with query utilities.
   */
  function buildReferenceMap(wishes) {
    const map = new Map(); // canonicalPath -> Array<ReferenceRecord>
    const references = extractReferencesFromWishes(wishes);

    references.forEach(ref => {
      if (!map.has(ref.canonicalPath)) {
        map.set(ref.canonicalPath, []);
      }
      map.get(ref.canonicalPath).push(ref);
    });

    return {
      /**
       * Checks whether a given storage URL or path is referenced by any active wish.
       */
      isReferenced: (urlOrPath) => {
        const canonical = normalizeStoragePath(urlOrPath);
        return canonical ? (map.has(canonical) && map.get(canonical).length > 0) : false;
      },

      /**
       * Gets all reference records for a given storage URL or path.
       */
      getReferences: (urlOrPath) => {
        const canonical = normalizeStoragePath(urlOrPath);
        return canonical && map.has(canonical) ? [...map.get(canonical)] : [];
      },

      /**
       * Returns all canonical paths that are actively referenced.
       */
      getAllReferencedPaths: () => new Set(map.keys()),

      /**
       * Returns total number of unique referenced storage assets.
       */
      getReferencedCount: () => map.size,

      /**
       * Returns all reference records flattened.
       */
      getAllReferences: () => [...references],

      /**
       * Raw internal map representation.
       */
      _map: map
    };
  }

  const MediaReferenceEngine = Object.freeze({
    ReferenceType,
    classifyReference,
    normalizeStoragePath,
    safeParseJson,
    extractReferencesFromWish,
    extractReferencesFromWishes,
    buildReferenceMap
  });

  /* ============================================================
     3. STORAGE DATA LOADING & ANALYTICS
     ============================================================ */
  /**
   * Fetches real assets list from Supabase Storage and maps metadata with wish linkages.
   * Uses the Deep Media Reference Extraction Engine for robust, multi-source reference mapping.
   * @param {Array} [activeWishes=[]] - Active wishes list to determine asset usage.
   * @returns {Promise<Array>} Resolved files metadata array.
   */
  async function loadStorageMediaData(activeWishes = []) {
    cachedActiveWishes = Array.isArray(activeWishes) ? [...activeWishes] : [];
    try {
      if (window.StorageModule && typeof window.StorageModule.listAllMedia === "function") {
        const files = await window.StorageModule.listAllMedia();
        if (Array.isArray(files)) {
          // Build authoritative reference map from active wishes using deep extraction engine
          const refMap = buildReferenceMap(activeWishes);

          realStorageFiles = files.map((f, i) => {
            const canonicalPath = normalizeStoragePath(f.path || f.publicUrl);
            const references = canonicalPath ? refMap.getReferences(canonicalPath) : [];
            const isUsed = references.length > 0;
            const primaryRef = references[0] || null;
            const usedInName = primaryRef ? primaryRef.recipientName : "Unused";
            const usedInUuid = primaryRef ? primaryRef.wishId : null;

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
              canonicalPath: canonicalPath || f.path,
              references: references,
              status: isUsed ? "USED" : "ORPHAN",
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
    const mediaView = typeof document !== "undefined" ? document.getElementById("view-media") : null;
    if (!mediaView || mediaView.classList.contains("active")) {
      renderDamGrid();
    }
    return realStorageFiles;
  }

  /**
   * Scans Supabase Storage against active wishes using MediaReferenceEngine.
   * Read-only operation: calculates Used vs Orphan assets and updates UI summary.
   * @param {Array} [activeWishes=null] - Optional wishes array. If null, uses cached or fetched wishes.
   * @returns {Promise<{total: number, used: number, orphan: number, files: Array}>}
   */
  async function scanStorage(activeWishes = null) {
    const btn = document.getElementById(SELECTORS.scanOrphanBtn);
    const statusEl = document.getElementById(SELECTORS.scanStatus);
    let origText = "";
    if (btn) {
      origText = btn.textContent;
      btn.disabled = true;
      btn.style.opacity = "0.6";
      btn.textContent = "⏳ Scanning...";
    }
    if (statusEl) {
      statusEl.textContent = "⏳ Scanning Storage...";
    }

    try {
      let wishes = activeWishes;
      if (!Array.isArray(wishes)) {
        if (window.AdminWishes && typeof window.AdminWishes.getAllWishes === "function") {
          wishes = window.AdminWishes.getAllWishes();
        } else if (window.AdminCore && Array.isArray(window.AdminCore.wishes)) {
          wishes = window.AdminCore.wishes;
        } else if (cachedActiveWishes && cachedActiveWishes.length > 0) {
          wishes = cachedActiveWishes;
        } else if (window.AdminDashboard && typeof window.AdminDashboard.fetchWishes === "function") {
          const res = await window.AdminDashboard.fetchWishes();
          wishes = (res && res.success) ? (res.data || []) : [];
        } else {
          wishes = [];
        }
      }

      await loadStorageMediaData(wishes);

      // Rescan Safety (Phase 31C-3): Invalidate/prune stale unused selections
      const validUnusedSet = new Set(realStorageFiles.filter(f => isAssetEligibleForUnusedManagement(f)).map(f => f.path));
      selectedUnusedPaths = new Set([...selectedUnusedPaths].filter(p => validUnusedSet.has(p)));
      updateUnusedSelectionUI();

      let usedCount = 0;
      let orphanCount = 0;
      realStorageFiles.forEach(f => {
        if (f.isUsed) usedCount++;
        else orphanCount++;
      });

      if (statusEl) {
        statusEl.textContent = "✅ Scan Complete";
      }

      if (typeof showToast === "function") {
        showToast(`Storage scan complete: ${usedCount} used, ${orphanCount} unused file(s) found 🔍`);
      }

      return {
        total: realStorageFiles.length,
        used: usedCount,
        orphan: orphanCount,
        files: [...realStorageFiles]
      };
    } catch (e) {
      console.error("AdminMedia: Scan error:", e);
      if (statusEl) statusEl.textContent = "⚠️ Scan Error";
      if (typeof showToast === "function") showToast(`Scan error: ${e.message || "Failed to scan"} ⚠️`);
      return { total: 0, used: 0, orphan: 0, files: [] };
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.textContent = origText || "🔍 Scan Storage";
      }
    }
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
    const elAll = document.getElementById("count-all"); if (elAll) elAll.textContent = String(realStorageFiles.length);
    const elImg = document.getElementById("count-images"); if (elImg) elImg.textContent = String(imagesCount);
    const elVid = document.getElementById("count-videos"); if (elVid) elVid.textContent = String(videosCount);
    const elAud = document.getElementById("count-audio"); if (elAud) elAud.textContent = String(audioCount);
    const elUsed = document.getElementById("count-used"); if (elUsed) elUsed.textContent = String(usedCount);
    const elOrphan = document.getElementById("count-orphan"); if (elOrphan) elOrphan.textContent = String(unusedCount);
    const elUnused = document.getElementById("count-unused"); if (elUnused) elUnused.textContent = String(unusedCount);
    const elFav = document.getElementById("count-favorites"); if (elFav) elFav.textContent = String(favCount);
    const elRec = document.getElementById("count-recent"); if (elRec) elRec.textContent = String(recentCount);

    // Update Scanner Summary Bar
    const scanTotal = document.getElementById(SELECTORS.scanCountTotal); if (scanTotal) scanTotal.textContent = String(realStorageFiles.length);
    const scanUsed = document.getElementById(SELECTORS.scanCountUsed); if (scanUsed) scanUsed.textContent = String(usedCount);
    const scanOrphan = document.getElementById(SELECTORS.scanCountOrphan); if (scanOrphan) scanOrphan.textContent = String(unusedCount);

    // Synchronize unused selection UI
    updateUnusedSelectionUI();
  }

  /* ============================================================
     3.5. UNUSED ASSET MANAGEMENT & SELECTION (Phase 31C-3)
     Guarded, read-only selection and inspection engine for unlinked
     Supabase Storage assets. Strictly protects used assets and
     local/external URLs from cleanup selection.
     ============================================================ */

  /**
   * Safety guardrail: checks if a file is strictly eligible for unused management.
   * @param {Object|string} fileOrPath - File object or storage path.
   * @returns {boolean} True if strictly unreferenced Supabase storage file.
   */
  function isAssetEligibleForUnusedManagement(fileOrPath) {
    if (!fileOrPath) return false;
    let file = typeof fileOrPath === "string"
      ? realStorageFiles.find(f => f.path === fileOrPath || f.canonicalPath === fileOrPath)
      : fileOrPath;

    if (!file || typeof file !== "object") return false;

    // 1. Must be strictly classified as NOT used
    if (file.isUsed === true) return false;

    // 2. Must have zero active references
    if (Array.isArray(file.references) && file.references.length > 0) return false;

    // 3. Must have a valid canonical storage path
    const canonical = normalizeStoragePath(file.path || file.canonicalPath || file.publicUrl);
    if (!canonical) return false;

    // 4. Must NOT be local, external, or data URL
    const refType = classifyReference(file.path || file.publicUrl || "");
    if (refType === ReferenceType.LOCAL || refType === ReferenceType.EXTERNAL || refType === ReferenceType.DATA_URL) {
      return false;
    }

    return true;
  }

  /**
   * Selects an individual unused asset for cleanup review after validating guardrails.
   * @param {string} path - Storage path.
   * @returns {boolean} True if successfully selected.
   */
  function selectUnusedAsset(path) {
    if (!path || typeof path !== "string") return false;
    const file = realStorageFiles.find(f => f.path === path || f.canonicalPath === path);
    if (!isAssetEligibleForUnusedManagement(file)) {
      console.warn("AdminMedia: Asset not eligible for unused management:", path);
      return false;
    }
    selectedUnusedPaths.add(file.path);
    updateUnusedSelectionUI();
    return true;
  }

  /**
   * Deselects an unused asset from cleanup review.
   * @param {string} path - Storage path.
   * @returns {boolean} True if removed.
   */
  function deselectUnusedAsset(path) {
    if (!path) return false;
    const removed = selectedUnusedPaths.delete(path);
    updateUnusedSelectionUI();
    return removed;
  }

  /**
   * Toggles selection of an unused asset.
   * @param {string} path - Storage path.
   * @returns {boolean} True if selected after toggle, false if deselected or rejected.
   */
  function toggleUnusedAsset(path) {
    if (selectedUnusedPaths.has(path)) {
      deselectUnusedAsset(path);
      return false;
    } else {
      return selectUnusedAsset(path);
    }
  }

  /**
   * Selects all eligible unused assets in storage.
   * @returns {number} Total number of selected unused assets.
   */
  function selectAllUnused() {
    const eligible = realStorageFiles.filter(f => isAssetEligibleForUnusedManagement(f));
    eligible.forEach(f => selectedUnusedPaths.add(f.path));
    updateUnusedSelectionUI();
    renderDamGrid();
    return selectedUnusedPaths.size;
  }

  /**
   * Clears the current unused asset selection.
   */
  function clearUnusedSelection() {
    selectedUnusedPaths.clear();
    updateUnusedSelectionUI();
    renderDamGrid();
  }

  /**
   * Returns array of currently selected unused file objects.
   * @returns {Array<Object>}
   */
  function getSelectedUnusedAssets() {
    return realStorageFiles.filter(f => selectedUnusedPaths.has(f.path) && isAssetEligibleForUnusedManagement(f));
  }

  /**
   * Returns count of currently selected unused file objects.
   * @returns {number}
   */
  function getSelectedUnusedCount() {
    return getSelectedUnusedAssets().length;
  }

  /**
   * Returns sum of sizes (in bytes) of all currently selected unused files.
   * @returns {number}
   */
  function getSelectedUnusedTotalSize() {
    return getSelectedUnusedAssets().reduce((sum, f) => sum + (Number(f.size) || 0), 0);
  }

  /**
   * Synchronizes the Unused Files Selection Bar and button counts in DOM.
   */
  function updateUnusedSelectionUI() {
    const selectedAssets = getSelectedUnusedAssets();
    const count = selectedAssets.length;
    const totalSize = getSelectedUnusedTotalSize();
    const format = typeof formatBytes === "function" ? formatBytes : (b => `${b} B`);

    const selectionBar = document.getElementById(SELECTORS.unusedSelectionBar);
    const countText = document.getElementById(SELECTORS.unusedCountText);
    const sizeText = document.getElementById(SELECTORS.unusedSizeText);
    const btnCount = document.getElementById("unused-cleanup-btn-count");

    if (selectionBar) {
      selectionBar.style.display = count > 0 ? "flex" : "none";
    }
    if (countText) {
      countText.textContent = `${count} unused file${count === 1 ? "" : "s"} selected`;
    }
    if (sizeText) {
      sizeText.textContent = `(Total: ${format(totalSize)})`;
    }
    if (btnCount) {
      btnCount.textContent = String(count);
    }

    // Update checkboxes on rendered cards
    const checkboxes = document.querySelectorAll(".dam-unused-checkbox");
    checkboxes.forEach(cb => {
      const p = cb.dataset.path;
      cb.checked = selectedUnusedPaths.has(p);
      const card = cb.closest(".dam-asset-card");
      if (card) {
        if (selectedUnusedPaths.has(p)) card.classList.add("selected-unused");
        else card.classList.remove("selected-unused");
      }
    });
  }

  /**
   * Authoritative, fresh pre-deletion safety validation.
   * Cross-references active wishes and MediaReferenceEngine to protect against race conditions and invalid paths.
   * @returns {{ validAssets: Array<Object>, skippedAssets: Array<{ path: string, reason: string }> }}
   */
  function validateSelectedUnusedForDeletion() {
    const validAssets = [];
    const skippedAssets = [];

    let wishes = [];
    if (window.AdminWishes && typeof window.AdminWishes.getAllWishes === "function") {
      wishes = window.AdminWishes.getAllWishes();
    } else if (window.AdminCore && Array.isArray(window.AdminCore.wishes)) {
      wishes = window.AdminCore.wishes;
    } else if (Array.isArray(cachedActiveWishes)) {
      wishes = cachedActiveWishes;
    }

    let refMap = null;
    const refEngine = (typeof MediaReferenceEngine !== "undefined" && MediaReferenceEngine) || (window.MediaReferenceEngine || (window.AdminMedia && window.AdminMedia.ReferenceEngine));
    if (refEngine && typeof refEngine.buildReferenceMap === "function") {
      refMap = refEngine.buildReferenceMap(wishes);
    }

    selectedUnusedPaths.forEach(path => {
      // 1. Path must be non-empty string
      if (!path || typeof path !== "string" || path.trim() === "") {
        skippedAssets.push({ path, reason: "Empty or invalid path" });
        return;
      }

      // 2. Reject local assets
      if (path.startsWith("assets/") || path.startsWith("./assets/") || path.startsWith("images/")) {
        skippedAssets.push({ path, reason: "Local repository asset — protected from deletion" });
        return;
      }

      // 3. Reject external URLs
      if (path.startsWith("http://") || path.startsWith("https://")) {
        skippedAssets.push({ path, reason: "External URL — protected from storage deletion" });
        return;
      }

      // 4. Reject Data URLs
      if (path.startsWith("data:")) {
        skippedAssets.push({ path, reason: "Inline Data URL — protected" });
        return;
      }

      // 5. Must belong to wish-media bucket folder
      const isValidBucketFolder = path.startsWith("photos/") || path.startsWith("videos/") || path.startsWith("audio/");
      if (!isValidBucketFolder) {
        skippedAssets.push({ path, reason: "Path outside wish-media bucket folder structure" });
        return;
      }

      // 6. Must exist in current storage catalog
      const fileObj = realStorageFiles.find(f => f.path === path || f.canonicalPath === path);
      if (!fileObj) {
        skippedAssets.push({ path, reason: "File not found in current storage catalog" });
        return;
      }

      // 7. Must have ZERO references in fresh reference scan and not marked isUsed
      const isRef = refMap ? refMap.isReferenced(path) : false;
      const refs = refMap ? refMap.getReferences(path) : (fileObj.references || []);
      if (isRef || refs.length > 0 || fileObj.isUsed) {
        const refNames = refs.map(r => r.recipientName || r.wishId).filter(Boolean).join(", ");
        skippedAssets.push({ path, reason: `Asset is referenced by active wish: ${refNames || fileObj.usedInName}` });
        return;
      }

      // Passed all safety validation checks
      validAssets.push(fileObj);
    });

    return { validAssets, skippedAssets };
  }

  /**
   * Sets the modal view state: "review" (inspection) or "confirm" (final confirmation).
   * @param {"review"|"confirm"|"deleting"} state
   * @param {Object} [customData]
   */
  function setUnusedModalState(state, customData = {}) {
    const warningBox = document.getElementById(SELECTORS.unusedModalWarningBox);
    const dangerBox = document.getElementById(SELECTORS.unusedModalDangerBox);
    const reviewFooter = document.getElementById(SELECTORS.unusedModalReviewFooter);
    const confirmFooter = document.getElementById(SELECTORS.unusedModalConfirmFooter);
    const statusBadge = document.getElementById(SELECTORS.unusedModalStatusBadge);
    const countConfirm = document.getElementById(SELECTORS.unusedConfirmCountText);
    const sizeConfirm = document.getElementById(SELECTORS.unusedConfirmSizeText);
    const btnConfirmDelete = document.getElementById(SELECTORS.btnConfirmDeleteUnused);
    const btnBack = document.getElementById(SELECTORS.btnBackToUnusedReview);
    const format = typeof formatBytes === "function" ? formatBytes : (b => `${b} B`);

    if (state === "review") {
      if (warningBox) warningBox.style.display = "flex";
      if (dangerBox) dangerBox.style.display = "none";
      if (reviewFooter) reviewFooter.style.display = "flex";
      if (confirmFooter) confirmFooter.style.display = "none";
      if (statusBadge) {
        statusBadge.textContent = "Verified Unused";
        statusBadge.className = "stat-val status-safe";
        statusBadge.style.color = "";
      }
      if (btnConfirmDelete) {
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.textContent = "⚠️ Confirm Permanent Deletion";
      }
      if (btnBack) btnBack.disabled = false;
    } else if (state === "confirm") {
      if (warningBox) warningBox.style.display = "none";
      if (dangerBox) dangerBox.style.display = "flex";
      if (reviewFooter) reviewFooter.style.display = "none";
      if (confirmFooter) confirmFooter.style.display = "flex";
      if (statusBadge) {
        statusBadge.textContent = "Pending Deletion";
        statusBadge.className = "stat-val";
        statusBadge.style.color = "#f87171";
      }
      const count = customData.count !== undefined ? customData.count : getSelectedUnusedCount();
      const size = customData.size !== undefined ? customData.size : getSelectedUnusedTotalSize();
      if (countConfirm) countConfirm.textContent = String(count);
      if (sizeConfirm) sizeConfirm.textContent = format(size);
      if (btnConfirmDelete) {
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.textContent = `⚠️ Confirm Permanent Deletion (${count} ${count === 1 ? 'File' : 'Files'})`;
      }
      if (btnBack) btnBack.disabled = false;
    } else if (state === "deleting") {
      if (btnConfirmDelete) {
        btnConfirmDelete.disabled = true;
        btnConfirmDelete.textContent = "Deleting Storage Files... ⏳";
      }
      if (btnBack) btnBack.disabled = true;
    }
  }

  /**
   * Opens the Unused Files Review / Inspection modal.
   * Safe inspection workflow: displays file list and size breakdown without mutating storage.
   */
  function openUnusedReviewModal() {
    const selectedAssets = getSelectedUnusedAssets();
    if (selectedAssets.length === 0) {
      if (typeof showToast === "function") {
        showToast("No unused files selected for review ⚠️");
      }
      return;
    }

    const modal = document.getElementById(SELECTORS.unusedCleanupModal);
    const countEl = document.getElementById(SELECTORS.unusedModalCount);
    const sizeEl = document.getElementById(SELECTORS.unusedModalSize);
    const listEl = document.getElementById(SELECTORS.unusedModalList);
    const format = typeof formatBytes === "function" ? formatBytes : (b => `${b} B`);

    const totalSize = getSelectedUnusedTotalSize();

    if (countEl) countEl.textContent = String(selectedAssets.length);
    if (sizeEl) sizeEl.textContent = format(totalSize);

    if (listEl) {
      listEl.innerHTML = selectedAssets.map(f => {
        const dateStr = f.created_at ? new Date(f.created_at).toLocaleDateString() : "—";
        const icon = f.folder === "photos" ? "📸" : f.folder === "videos" ? "🎥" : "🎙";
        return `
          <tr>
            <td class="unused-file-name" title="${f.name || f.path}">
              <span class="file-icon">${icon}</span>
              <strong>${f.name || f.path}</strong>
            </td>
            <td class="unused-file-path"><code>${f.path || f.canonicalPath}</code></td>
            <td class="unused-file-size">${format(f.size || 0)}</td>
            <td class="unused-file-date">${dateStr}</td>
          </tr>
        `;
      }).join("");
    }

    setUnusedModalState("review");

    if (modal) {
      modal.classList.add("open");
    }
  }

  /**
   * Moves from review state to final deletion confirmation state after running pre-validation.
   */
  function proceedToUnusedDeletionConfirmation() {
    const { validAssets, skippedAssets } = validateSelectedUnusedForDeletion();

    if (validAssets.length === 0) {
      if (typeof showToast === "function") {
        showToast("No selected files are eligible for safe deletion (protected or invalid) ⚠️");
      }
      clearUnusedSelection();
      closeUnusedReviewModal();
      return;
    }

    if (skippedAssets.length > 0) {
      if (typeof showToast === "function") {
        showToast(`⚠️ ${skippedAssets.length} file(s) skipped (referenced or protected)`);
      }
      skippedAssets.forEach(sa => deselectUnusedAsset(sa.path));
    }

    const validSize = validAssets.reduce((acc, f) => acc + (Number(f.size) || 0), 0);
    setUnusedModalState("confirm", { count: validAssets.length, size: validSize });
  }

  /**
   * Executes the validated permanent deletion of selected unused files from Supabase Storage.
   * Tracks per-file success/failure to handle partial failures accurately.
   */
  async function executeUnusedMediaCleanup() {
    const { validAssets, skippedAssets } = validateSelectedUnusedForDeletion();

    if (validAssets.length === 0) {
      if (typeof showToast === "function") {
        showToast("No files eligible for deletion ⚠️");
      }
      closeUnusedReviewModal();
      return;
    }

    setUnusedModalState("deleting");

    const succeededPaths = [];
    const failedPaths = [];

    for (const file of validAssets) {
      try {
        let ok = false;
        if (window.StorageModule && typeof window.StorageModule.deleteMedia === "function") {
          ok = await window.StorageModule.deleteMedia(file.path);
        } else if (window.StorageModule && typeof window.StorageModule.deleteMultipleMedia === "function") {
          ok = await window.StorageModule.deleteMultipleMedia([file.path]);
        }
        if (ok) {
          succeededPaths.push(file.path);
        } else {
          failedPaths.push({ path: file.path, name: file.name, reason: "Storage API returned false" });
        }
      } catch (err) {
        failedPaths.push({ path: file.path, name: file.name, reason: err.message || "Exception during delete" });
      }
    }

    // Update state: remove succeeded files
    if (succeededPaths.length > 0) {
      realStorageFiles = realStorageFiles.filter(f => !succeededPaths.includes(f.path));
      succeededPaths.forEach(p => selectedUnusedPaths.delete(p));
      updateStorageAnalytics();
      renderDamGrid();

      if (typeof onEventHook === "function") {
        onEventHook("MEDIA_CLEANUP_EXECUTE", `Deleted ${succeededPaths.length} unused asset(s) from Supabase Storage`);
      }
    }

    // Feedback and modal closing
    if (failedPaths.length === 0) {
      closeUnusedReviewModal();
      if (typeof showToast === "function") {
        showToast(`Successfully deleted ${succeededPaths.length} unused storage file${succeededPaths.length === 1 ? "" : "s"} 🗑️✨`);
      }
    } else {
      setUnusedModalState("review");
      closeUnusedReviewModal();
      const failMsg = failedPaths.map(f => f.name || f.path).join(", ");
      if (succeededPaths.length > 0) {
        if (typeof showToast === "function") {
          showToast(`Deleted ${succeededPaths.length} file(s). Failed to delete ${failedPaths.length}: ${failMsg} ⚠️`);
        }
      } else {
        if (typeof showToast === "function") {
          showToast(`Failed to delete selected files: ${failMsg} ❌`);
        }
      }
    }
  }

  /**
   * Closes the Unused Files Review modal.
   */
  function closeUnusedReviewModal() {
    const modal = document.getElementById(SELECTORS.unusedCleanupModal);
    if (modal) {
      modal.classList.remove("open");
    }
    setUnusedModalState("review");
  }

  /* ============================================================
     4. FILTERING & SEARCH
     ============================================================ */
  /**
   * Filters and sorts the media items array according to current chip filter, event tag, search query, and sort order.
   * @returns {Array} Filtered and sorted list of files.
   */
  function getFilteredFiles() {
    let items = realStorageFiles;

    // 1. Chip Category Filter
    if (currentDamFilter === "images") items = items.filter(f => f.folder === "photos");
    else if (currentDamFilter === "videos") items = items.filter(f => f.folder === "videos");
    else if (currentDamFilter === "audio") items = items.filter(f => f.folder === "audio");
    else if (currentDamFilter === "used") items = items.filter(f => f.isUsed);
    else if (currentDamFilter === "orphan" || currentDamFilter === "unused") items = items.filter(f => !f.isUsed);
    else if (currentDamFilter === "favorites") items = items.filter(f => !!f.isFavorite);
    else if (currentDamFilter === "recent") {
      const weekAgo = Date.now() - 7 * 86400000;
      items = items.filter(f => new Date(f.created_at || 0).getTime() > weekAgo);
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

    // 4. Sorting (Non-destructive, creates a shallow copy)
    const sorted = [...items];
    if (currentDamSort === "newest") {
      sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (currentDamSort === "oldest") {
      sorted.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    } else if (currentDamSort === "largest") {
      sorted.sort((a, b) => (Number(b.size) || 0) - (Number(a.size) || 0));
    } else if (currentDamSort === "smallest") {
      sorted.sort((a, b) => (Number(a.size) || 0) - (Number(b.size) || 0));
    } else if (currentDamSort === "name_asc") {
      sorted.sort((a, b) => (a.name || a.path || "").localeCompare(b.name || b.path || "", undefined, { sensitivity: "base", numeric: true }));
    } else if (currentDamSort === "name_desc") {
      sorted.sort((a, b) => (b.name || b.path || "").localeCompare(a.name || a.path || "", undefined, { sensitivity: "base", numeric: true }));
    }

    return sorted;
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
      const isUnused = !file.isUsed;
      const isSelectedUnused = isUnused && selectedUnusedPaths.has(file.path);
      card.className = `glass-card dam-asset-card ${isUnused ? "unused-card" : ""} ${isSelectedUnused ? "selected-unused" : ""}`;

      let previewHtml = "";
      if (file.folder === "photos") {
        previewHtml = `<img src="${file.publicUrl}" alt="${file.name}" onerror="this.style.display='none'; this.parentElement.insertAdjacentHTML('beforeend', '<div class=\\'gallery-emoji-tile\\'>📷</div>');">`;
      } else if (file.folder === "videos") {
        previewHtml = `<video src="${file.publicUrl}#t=0.001" preload="metadata" muted playsinline></video>`;
      } else {
        previewHtml = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><span style="font-size:3.2rem;color:var(--gold);">🎙</span><span style="font-size:0.75rem;color:var(--text-muted);">${file.name}</span></div>`;
      }

      const usedBadgeHtml = file.isUsed 
        ? `<span class="used-badge" title="Linked to Wish: ${file.usedInName}">🔗 ${file.usedInName}</span>` 
        : `<span class="used-badge unused" title="No active wish references this storage file">⚠️ Unused</span>`;

      const checkboxHtml = isUnused
        ? `<input type="checkbox" class="dam-file-checkbox dam-unused-checkbox" data-path="${file.path}" ${isSelectedUnused ? "checked" : ""} style="cursor:pointer;" title="Select unused file for cleanup">`
        : `<input type="checkbox" class="dam-file-checkbox" data-path="${file.path}" disabled title="Linked to Wish: ${file.usedInName} — Protected from Cleanup" style="opacity:0.25;cursor:not-allowed;">`;

      card.innerHTML = `
        <div class="dam-preview-box">
          <div class="badge-row">
            <span class="event-tag">${file.eventType}</span>
            ${usedBadgeHtml}
          </div>

          ${previewHtml}

          <!-- Hover Action Overlay -->
          <div class="hover-actions-overlay">
            <button class="overlay-btn" title="ℹ️ Details & Usage" onclick="window.adminApp ? window.adminApp.openAssetInspector('${file.path}') : (window.AdminMedia && window.AdminMedia.openAssetInspector('${file.path}'))">ℹ️</button>
            <button class="overlay-btn" title="👁️ Preview" onclick="window.adminApp ? window.adminApp.openAssetPreview('${file.publicUrl}', '${file.name}', '${file.folder}', '${format(file.size)}') : (window.AdminMedia && window.AdminMedia.openAssetPreview('${file.publicUrl}', '${file.name}', '${file.folder}', '${format(file.size)}'))">👁️</button>
            <a class="overlay-btn" title="📥 Download" href="${file.publicUrl}" download target="_blank" style="text-decoration:none;">📥</a>
            <button class="overlay-btn" title="📋 Copy URL" onclick="window.adminApp ? window.adminApp.copyWishUrl('${file.publicUrl}') : (window.AdminCore && window.AdminCore.copyWishUrl('${file.publicUrl}'))">📋</button>
            <button class="overlay-btn" title="✏️ Rename" onclick="window.adminApp ? window.adminApp.renameAsset('${file.path}', '${file.name}') : (window.AdminMedia && window.AdminMedia.renameAsset('${file.path}', '${file.name}'))">✏️</button>
            <button class="overlay-btn danger" title="🗑 Delete" onclick="window.adminApp ? window.adminApp.deleteSingleAsset('${file.path}') : (window.AdminMedia && window.AdminMedia.deleteSingleAsset('${file.path}'))">🗑️</button>
          </div>
        </div>

        <div class="asset-info-box">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            ${checkboxHtml}
            <div class="asset-title" title="Click to inspect: ${file.name}" style="cursor:pointer;" onclick="window.adminApp ? window.adminApp.openAssetInspector('${file.path}') : (window.AdminMedia && window.AdminMedia.openAssetInspector('${file.path}'))">${file.name}</div>
          </div>
          <div class="asset-owner-row">
            <span>Owner: <strong>${file.owner}</strong></span>
            <span style="color:var(--gold);">${file.folder.toUpperCase()}</span>
          </div>
          <div class="asset-meta-row">
            <span>${format(file.size)}</span>
            <span style="color:${file.isUsed ? '#4ade80' : '#f87171'};font-size:0.75rem;font-weight:600;cursor:pointer;" onclick="window.adminApp ? window.adminApp.openAssetInspector('${file.path}') : (window.AdminMedia && window.AdminMedia.openAssetInspector('${file.path}'))" title="Click to view references">${file.isUsed ? '🔗 Used' : '⚠️ Unused'}</span>
            <span>${new Date(file.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      `;

      const chk = card.querySelector(".dam-unused-checkbox");
      if (chk) {
        chk.addEventListener("change", (e) => {
          if (e.target.checked) selectUnusedAsset(file.path);
          else deselectUnusedAsset(file.path);
        });
      }

      container.appendChild(card);
    });

    updateUnusedSelectionUI();
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
        if (typeof window.copyWishUrl === "function") window.copyWishUrl(url);
        else if (window.AdminCore && typeof window.AdminCore.copyWishUrl === "function") window.AdminCore.copyWishUrl(url);
        else if (typeof copyWishUrl === "function") copyWishUrl(url);
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

  /**
   * Closes the Asset Preview lightbox modal and safely terminates active media playback.
   */
  function closeAssetPreview() {
    const viewerEl = document.getElementById(SELECTORS.modalViewer);
    if (viewerEl) {
      const mediaElements = viewerEl.querySelectorAll("video, audio");
      mediaElements.forEach(media => {
        try {
          media.pause();
          media.currentTime = 0;
          media.removeAttribute("src");
          media.src = "";
          if (typeof media.load === "function") media.load();
        } catch (e) {}
      });
      viewerEl.innerHTML = "";
    }
    const modal = document.getElementById(SELECTORS.previewModal);
    if (modal) {
      modal.classList.remove("open");
    }
  }

  /**
   * Helper to format a wish reference field name into user-friendly display text.
   * @param {string} field - Raw field identifier (e.g. "gallery_json[0]", "music_url").
   * @returns {string} User-friendly formatted label.
   */
  function formatReferenceField(field) {
    if (!field || typeof field !== "string") return "General Reference";
    if (field === "music_url") return "🎵 Background Music";
    if (field === "video_url") return "🎥 Video Wish";
    if (field.startsWith("gallery_json") || field.startsWith("gallery")) return "🖼️ Photo Gallery";
    if (field.startsWith("timeline_json") || field.startsWith("timeline") || field.startsWith("memory_timeline")) return "⏳ Memory Timeline";
    if (field === "cover_image") return "✨ Cover Image";
    if (field === "avatar") return "👤 Recipient Avatar";
    return `🔗 ${field}`;
  }

  let activeInspectorAudio = null;
  let activeInspectorAudioCleanup = null;

  /**
   * Safely pauses and releases any active inspector audio instance.
   */
  function cleanupActiveInspectorAudio() {
    if (typeof activeInspectorAudioCleanup === "function") {
      try { activeInspectorAudioCleanup(); } catch (e) {}
      activeInspectorAudioCleanup = null;
    }
    if (activeInspectorAudio) {
      try {
        activeInspectorAudio.pause();
        activeInspectorAudio.src = "";
        if (typeof activeInspectorAudio.load === "function") {
          activeInspectorAudio.load();
        }
      } catch (e) {}
      activeInspectorAudio = null;
    }
  }

  /**
   * Formats seconds into MM:SS display format.
   * @param {number} seconds
   * @returns {string}
   */
  function formatAudioTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  /**
   * Renders the custom luxury dark-themed audio player inside the inspector preview box.
   * @param {HTMLElement} container - Inspector preview container.
   * @param {Object} file - Media asset record.
   */
  function renderCustomAudioPlayer(container, file) {
    if (!container || !file) return;

    cleanupActiveInspectorAudio();

    const safeName = escapeHtml(file.name || "audio.mp3");
    const safeUrl = escapeHtml(file.publicUrl || "");
    const sizeStr = formatSize(file.size || 0);

    container.innerHTML = `
      <div class="inspector-audio-player" id="inspector-custom-audio-player">
        <div class="inspector-audio-header">
          <div class="inspector-audio-waveform-icon">
            <span>🎙️</span>
          </div>
          <div class="inspector-audio-track-details">
            <div class="inspector-audio-name" title="${safeName}">${safeName}</div>
            <div class="inspector-audio-badge">Audio Clip • ${sizeStr}</div>
          </div>
        </div>

        <audio id="inspector-audio-element" src="${safeUrl}" preload="metadata" style="display:none;"></audio>

        <div class="inspector-audio-timeline">
          <span class="inspector-audio-time-label" id="inspector-audio-cur-time">0:00</span>
          <div class="inspector-audio-seekbar-wrapper">
            <input type="range" class="inspector-audio-seekbar" id="inspector-audio-seekbar" min="0" max="100" value="0" step="0.1" aria-label="Playback progress">
          </div>
          <span class="inspector-audio-time-label" id="inspector-audio-total-time">0:00</span>
        </div>

        <div class="inspector-audio-controls">
          <button type="button" class="inspector-audio-btn-play" id="inspector-audio-play-btn" title="Play audio" aria-label="Play audio">
            <span class="play-icon" id="inspector-audio-play-icon">▶</span>
          </button>
          <div class="inspector-audio-volume-control">
            <button type="button" class="inspector-audio-btn-mute" id="inspector-audio-mute-btn" title="Mute / Unmute" aria-label="Mute or unmute">🔊</button>
            <input type="range" class="inspector-audio-volume-slider" id="inspector-audio-volume-slider" min="0" max="1" step="0.05" value="1" aria-label="Volume">
          </div>
        </div>

        <div class="inspector-audio-error-banner" id="inspector-audio-error-banner" style="display:none;">
          <span>⚠️ Audio could not be loaded</span>
        </div>
      </div>
    `;

    const audio = container.querySelector("#inspector-audio-element");
    const playBtn = container.querySelector("#inspector-audio-play-btn");
    const playIcon = container.querySelector("#inspector-audio-play-icon");
    const seekbar = container.querySelector("#inspector-audio-seekbar");
    const curTimeEl = container.querySelector("#inspector-audio-cur-time");
    const totalTimeEl = container.querySelector("#inspector-audio-total-time");
    const muteBtn = container.querySelector("#inspector-audio-mute-btn");
    const volSlider = container.querySelector("#inspector-audio-volume-slider");
    const errBanner = container.querySelector("#inspector-audio-error-banner");

    if (!audio) return;
    activeInspectorAudio = audio;

    let isDraggingSeekbar = false;
    let previousVolume = 1;

    function updateSeekbarVisual(pct) {
      if (seekbar) {
        const p = Math.max(0, Math.min(100, pct));
        seekbar.style.background = `linear-gradient(to right, var(--gold, #fbbf24) ${p}%, rgba(255, 255, 255, 0.15) ${p}%)`;
      }
    }

    function updateVolumeIcon(vol, isMuted) {
      if (!muteBtn) return;
      if (isMuted || vol === 0) {
        muteBtn.textContent = "🔇";
      } else if (vol < 0.5) {
        muteBtn.textContent = "🔉";
      } else {
        muteBtn.textContent = "🔊";
      }
    }

    // 1. Play / Pause
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        if (audio.paused || audio.ended) {
          if (audio.ended) {
            audio.currentTime = 0;
          }
          const playPromise = audio.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(err => {
              console.warn("Inspector audio playback error:", err);
              if (errBanner) errBanner.style.display = "flex";
            });
          }
        } else {
          audio.pause();
        }
      });
    }

    // 2. Audio State Listeners
    audio.addEventListener("play", () => {
      if (playBtn) playBtn.classList.add("playing");
      if (playIcon) playIcon.textContent = "⏸";
      if (playBtn) {
        playBtn.title = "Pause audio";
        playBtn.setAttribute("aria-label", "Pause audio");
      }
    });

    audio.addEventListener("pause", () => {
      if (playBtn) playBtn.classList.remove("playing");
      if (playIcon) playIcon.textContent = "▶";
      if (playBtn) {
        playBtn.title = "Play audio";
        playBtn.setAttribute("aria-label", "Play audio");
      }
    });

    const onMeta = () => {
      if (isFinite(audio.duration) && audio.duration > 0 && totalTimeEl) {
        totalTimeEl.textContent = formatAudioTime(audio.duration);
      }
    };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("canplay", onMeta);

    audio.addEventListener("timeupdate", () => {
      if (!isDraggingSeekbar && isFinite(audio.duration) && audio.duration > 0) {
        const pct = (audio.currentTime / audio.duration) * 100;
        if (seekbar) seekbar.value = pct;
        updateSeekbarVisual(pct);
        if (curTimeEl) curTimeEl.textContent = formatAudioTime(audio.currentTime);
      }
    });

    audio.addEventListener("ended", () => {
      if (playBtn) playBtn.classList.remove("playing");
      if (playIcon) playIcon.textContent = "▶";
      if (playBtn) {
        playBtn.title = "Replay audio";
        playBtn.setAttribute("aria-label", "Replay audio");
      }
      if (seekbar) {
        seekbar.value = 0;
        updateSeekbarVisual(0);
      }
      if (curTimeEl) curTimeEl.textContent = formatAudioTime(0);
    });

    audio.addEventListener("error", () => {
      if (errBanner) errBanner.style.display = "flex";
      if (playBtn) {
        playBtn.disabled = true;
        playBtn.style.opacity = "0.5";
      }
    });

    // 3. Seeking Interaction
    if (seekbar) {
      seekbar.addEventListener("input", () => {
        isDraggingSeekbar = true;
        const pct = parseFloat(seekbar.value) || 0;
        updateSeekbarVisual(pct);
        if (isFinite(audio.duration) && audio.duration > 0 && curTimeEl) {
          const previewSec = (pct / 100) * audio.duration;
          curTimeEl.textContent = formatAudioTime(previewSec);
        }
      });

      seekbar.addEventListener("change", () => {
        isDraggingSeekbar = false;
        const pct = parseFloat(seekbar.value) || 0;
        if (isFinite(audio.duration) && audio.duration > 0) {
          audio.currentTime = (pct / 100) * audio.duration;
        }
      });
    }

    // 4. Volume / Mute Interaction
    if (volSlider) {
      volSlider.addEventListener("input", () => {
        const val = parseFloat(volSlider.value) || 0;
        audio.volume = val;
        audio.muted = (val === 0);
        if (val > 0) previousVolume = val;
        updateVolumeIcon(val, audio.muted);
      });
    }

    if (muteBtn) {
      muteBtn.addEventListener("click", () => {
        audio.muted = !audio.muted;
        if (audio.muted) {
          if (volSlider) volSlider.value = 0;
          updateVolumeIcon(0, true);
        } else {
          const restoreVal = previousVolume > 0 ? previousVolume : 1;
          audio.volume = restoreVal;
          if (volSlider) volSlider.value = restoreVal;
          updateVolumeIcon(restoreVal, false);
        }
      });
    }

    activeInspectorAudioCleanup = () => {
      // Clean up scoped listeners if needed
    };
  }

  /**
   * Opens the Media Asset Details & Usage Inspector modal.
   * Read-only modal displaying metadata, preview, and all referencing wishes.
   * @param {string|Object} fileOrPath - File object or storage path.
   */
  function openAssetInspector(fileOrPath) {
    cleanupActiveInspectorAudio();

    const path = typeof fileOrPath === "string" ? fileOrPath : (fileOrPath && (fileOrPath.path || fileOrPath.canonicalPath));
    let file = typeof fileOrPath === "object" && fileOrPath !== null
      ? fileOrPath
      : realStorageFiles.find(f => f.path === path || f.canonicalPath === path || f.id === path);

    if (!file) {
      if (typeof showToast === "function") showToast("Asset details not found ⚠️");
      return;
    }

    const modal = document.getElementById(SELECTORS.inspectorModal);
    if (!modal) return;

    const format = formatSize;

    // Ensure references are populated
    let refs = Array.isArray(file.references) ? [...file.references] : [];
    if (refs.length === 0 && file.usedInUuid) {
      refs = [{
        wishId: file.usedInUuid,
        recipientName: file.usedInName || "Wish",
        field: "general"
      }];
    }

    // Safety live check with MediaReferenceEngine if available
    let wishes = [];
    if (window.AdminWishes && typeof window.AdminWishes.getAllWishes === "function") {
      wishes = window.AdminWishes.getAllWishes();
    } else if (window.AdminCore && Array.isArray(window.AdminCore.wishes)) {
      wishes = window.AdminCore.wishes;
    } else if (Array.isArray(cachedActiveWishes)) {
      wishes = cachedActiveWishes;
    }

    const refEngine = (typeof MediaReferenceEngine !== "undefined" && MediaReferenceEngine) ||
                      (window.MediaReferenceEngine || (window.AdminMedia && window.AdminMedia.ReferenceEngine));
    if (refEngine && typeof refEngine.buildReferenceMap === "function" && wishes.length > 0) {
      const refMap = refEngine.buildReferenceMap(wishes);
      const liveRefs = refMap.getReferences(file.path || file.canonicalPath);
      if (liveRefs.length > 0) {
        refs = liveRefs;
      }
    }

    const isUsed = refs.length > 0 || !!file.isUsed;

    // 1. Preview
    const previewEl = document.getElementById(SELECTORS.inspectorMediaPreview);
    if (previewEl) {
      if (file.folder === "photos") {
        previewEl.innerHTML = `<img src="${file.publicUrl}" alt="${file.name}" style="max-width:100%;max-height:260px;object-fit:contain;border-radius:8px;">`;
      } else if (file.folder === "videos") {
        previewEl.innerHTML = `<video src="${file.publicUrl}" controls style="max-width:100%;max-height:260px;border-radius:8px;"></video>`;
      } else if (file.folder === "audio") {
        renderCustomAudioPlayer(previewEl, file);
      } else {
        previewEl.innerHTML = `<div style="text-align:center;padding:24px;"><span style="font-size:3rem;">📁</span><p style="color:var(--text-muted);font-size:0.82rem;margin-top:8px;">${file.name}</p></div>`;
      }
    }

    // 2. Metadata
    const nameEl = document.getElementById(SELECTORS.inspectorFileName);
    const pathEl = document.getElementById(SELECTORS.inspectorFilePath);
    const folderEl = document.getElementById(SELECTORS.inspectorFileFolder);
    const sizeEl = document.getElementById(SELECTORS.inspectorFileSize);
    const mimeEl = document.getElementById(SELECTORS.inspectorFileMime);
    const dateEl = document.getElementById(SELECTORS.inspectorFileDate);
    const statusBadge = document.getElementById(SELECTORS.inspectorStatusBadge);

    if (nameEl) nameEl.textContent = file.name || "—";
    if (pathEl) pathEl.textContent = file.path || file.canonicalPath || "—";
    if (folderEl) folderEl.textContent = (file.folder || "general").toUpperCase();
    if (sizeEl) sizeEl.textContent = format(file.size || 0);
    if (mimeEl) mimeEl.textContent = file.mimetype || (file.folder === "photos" ? "image/jpeg" : file.folder === "videos" ? "video/mp4" : "audio/mpeg");
    if (dateEl) dateEl.textContent = file.created_at ? new Date(file.created_at).toLocaleString() : "—";

    // 3. Usage Linkage
    const usedSec = document.getElementById(SELECTORS.inspectorUsedSection);
    const unusedSec = document.getElementById(SELECTORS.inspectorUnusedSection);
    const refCountText = document.getElementById(SELECTORS.inspectorRefCountText);
    const refsList = document.getElementById(SELECTORS.inspectorReferencesList);

    if (statusBadge) {
      if (isUsed) {
        statusBadge.className = "used-badge";
        statusBadge.textContent = `🔗 Used (${refs.length || 1})`;
        statusBadge.style.background = "rgba(74, 222, 128, 0.15)";
        statusBadge.style.color = "#86efac";
      } else {
        statusBadge.className = "used-badge unused";
        statusBadge.textContent = "⚠️ Unused";
        statusBadge.style.background = "rgba(239, 68, 68, 0.15)";
        statusBadge.style.color = "#fca5a5";
      }
    }

    if (isUsed) {
      if (usedSec) usedSec.style.display = "block";
      if (unusedSec) unusedSec.style.display = "none";
      if (refCountText) refCountText.textContent = String(refs.length || 1);
      if (refsList) {
        refsList.innerHTML = refs.map(r => `
          <tr>
            <td><strong>${r.recipientName || file.usedInName || "Wish"}</strong></td>
            <td><code style="font-size:0.75rem;color:var(--gold);">${r.wishId || "—"}</code></td>
            <td><span style="color:#c084fc;font-size:0.78rem;">${formatReferenceField(r.field)}</span></td>
          </tr>
        `).join("");
      }
    } else {
      if (usedSec) usedSec.style.display = "none";
      if (unusedSec) unusedSec.style.display = "block";
    }

    // 4. Copy & Action Buttons
    const copyUrlBtn = document.getElementById(SELECTORS.inspectorCopyUrlBtn);
    const copyPathBtn = document.getElementById(SELECTORS.inspectorCopyPathBtn);
    const dlBtn = document.getElementById(SELECTORS.inspectorDownloadBtn);
    const cleanupBtn = document.getElementById(SELECTORS.inspectorSelectCleanupBtn);

    if (copyUrlBtn) {
      copyUrlBtn.onclick = () => {
        if (typeof window.copyWishUrl === "function") window.copyWishUrl(file.publicUrl);
        else if (window.AdminCore && typeof window.AdminCore.copyWishUrl === "function") window.AdminCore.copyWishUrl(file.publicUrl);
        else if (typeof copyWishUrl === "function") copyWishUrl(file.publicUrl);
      };
    }

    if (copyPathBtn) {
      copyPathBtn.onclick = () => {
        if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard.writeText(file.path || file.canonicalPath);
          if (typeof showToast === "function") showToast("Storage path copied to clipboard! 📌");
        } else if (typeof window.copyWishUrl === "function") {
          window.copyWishUrl(file.path || file.canonicalPath);
        }
      };
    }

    if (dlBtn) dlBtn.href = file.publicUrl;

    if (cleanupBtn) {
      cleanupBtn.onclick = () => {
        closeAssetInspector();
        selectUnusedAsset(file.path);
        openUnusedReviewModal();
      };
    }

    modal.classList.add("open");
  }

  /**
   * Closes the Media Asset Details & Usage Inspector modal.
   */
  function closeAssetInspector() {
    cleanupActiveInspectorAudio();
    const modal = document.getElementById(SELECTORS.inspectorModal);
    if (modal) {
      modal.classList.remove("open");
    }
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

    let ok = false;
    if (window.StorageModule && typeof window.StorageModule.deleteMedia === "function") {
      ok = await window.StorageModule.deleteMedia(path);
    }

    if (ok) {
      realStorageFiles = realStorageFiles.filter(f => f.path !== path);
      deselectUnusedAsset(path);
      updateStorageAnalytics();
      renderDamGrid();
      if (typeof onEventHook === "function") onEventHook("MEDIA_DELETE", `Deleted cloud asset: ${path}`);
      if (typeof showToast === "function") showToast("Asset deleted from Supabase Storage 🗑️");
    } else {
      if (typeof showToast === "function") showToast("Failed to delete asset from Supabase Storage ❌");
    }
  }

  /**
   * Prompts to rename a media asset in the catalog.
   * @param {string} path - Cloud file path.
   * @param {string} currentName - Existing display name.
   */
  function renameAsset(path, currentName) {
    const newName = typeof window.prompt === "function" ? window.prompt("Rename media asset:", currentName) : null;
    if (!newName || newName.trim() === "" || newName === currentName) return;

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

    let ok = false;
    if (window.StorageModule && typeof window.StorageModule.deleteMultipleMedia === "function") {
      ok = await window.StorageModule.deleteMultipleMedia(pathsArray);
    }

    if (ok) {
      realStorageFiles = realStorageFiles.filter(f => !selectedFilePaths.has(f.path));
      selectedFilePaths.clear();
      updateStorageAnalytics();
      renderDamGrid();
      if (typeof onEventHook === "function") onEventHook("MEDIA_CLEANUP", `Bulk deleted ${pathsArray.length} assets`);
      if (typeof showToast === "function") showToast("Selected files deleted from Supabase Storage 🗑️");
    } else {
      if (typeof showToast === "function") showToast("Failed to delete selected files from Supabase Storage ❌");
    }
  }

  /**
   * Triggers review of all unused media files in bulk.
   */
  async function deleteUnusedAssets() {
    selectAllUnused();
    openUnusedReviewModal();
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

    let ok = false;
    if (window.StorageModule && typeof window.StorageModule.deleteMultipleMedia === "function") {
      ok = await window.StorageModule.deleteMultipleMedia(pathsArray);
    }

    if (ok) {
      realStorageFiles = realStorageFiles.filter(f => !pathsArray.includes(f.path));
      updateStorageAnalytics();
      renderDamGrid();
      if (typeof onEventHook === "function") onEventHook("MEDIA_CLEANUP", `Deleted ${tempFiles.length} old temp files`);
      if (typeof showToast === "function") showToast(`⏳ Cleaned up ${tempFiles.length} old temp files! ✨`);
    } else {
      if (typeof showToast === "function") showToast("Failed to delete old temporary files from Supabase Storage ❌");
    }
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
   * Initializes DAM filter chips, search input, event filter dropdown, unused toolbar, and cleanup tools.
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

    // DAM Sort Dropdown
    const sortSelect = document.getElementById(SELECTORS.sortSelect);
    if (sortSelect && !sortSelect.__damBound) {
      sortSelect.__damBound = true;
      sortSelect.addEventListener("change", (e) => {
        currentDamSort = (e && e.target && e.target.value) || (sortSelect ? sortSelect.value : "newest");
        renderDamGrid();
      });
    }

    // DAM Event Filter Dropdown
    const eventSelect = document.getElementById(SELECTORS.eventFilter);
    if (eventSelect && !eventSelect.__damBound) {
      eventSelect.__damBound = true;
      eventSelect.addEventListener("change", (e) => {
        currentDamEventFilter = (e && e.target && e.target.value) || (eventSelect ? eventSelect.value : "all");
        renderDamGrid();
      });
    }

    // DAM Live Search Input
    const damSearchInput = document.getElementById(SELECTORS.searchInput);
    if (damSearchInput && !damSearchInput.__damBound) {
      damSearchInput.__damBound = true;
      damSearchInput.addEventListener("input", (e) => {
        damSearchQuery = ((e && e.target && typeof e.target.value === "string") ? e.target.value : (damSearchInput ? damSearchInput.value : "")).trim();
        renderDamGrid();
      });
    }

    // DAM Scanner Button Listener
    const scanBtn = document.getElementById(SELECTORS.scanOrphanBtn);
    if (scanBtn && !scanBtn.__damBound) {
      scanBtn.__damBound = true;
      scanBtn.addEventListener("click", () => {
        scanStorage();
      });
    }

    // Phase 31C-3: Unused Files Selection Bar Buttons
    const btnSelectAllUnused = document.getElementById(SELECTORS.btnSelectAllUnused);
    if (btnSelectAllUnused && !btnSelectAllUnused.__damBound) {
      btnSelectAllUnused.__damBound = true;
      btnSelectAllUnused.addEventListener("click", () => {
        selectAllUnused();
      });
    }

    const btnReviewUnused = document.getElementById(SELECTORS.btnReviewUnused);
    if (btnReviewUnused && !btnReviewUnused.__damBound) {
      btnReviewUnused.__damBound = true;
      btnReviewUnused.addEventListener("click", () => {
        openUnusedReviewModal();
      });
    }

    const btnClearUnused = document.getElementById(SELECTORS.btnClearUnusedSelection);
    if (btnClearUnused && !btnClearUnused.__damBound) {
      btnClearUnused.__damBound = true;
      btnClearUnused.addEventListener("click", () => {
        clearUnusedSelection();
      });
    }

    // Phase 31C-3 / 31C-4: Unused Review & Cleanup Modal Controls
    const btnCloseX = document.getElementById(SELECTORS.btnCloseUnusedX);
    if (btnCloseX && !btnCloseX.__damBound) {
      btnCloseX.__damBound = true;
      btnCloseX.addEventListener("click", closeUnusedReviewModal);
    }

    const btnCancel = document.getElementById(SELECTORS.btnCancelUnused);
    if (btnCancel && !btnCancel.__damBound) {
      btnCancel.__damBound = true;
      btnCancel.addEventListener("click", closeUnusedReviewModal);
    }

    const btnStartCleanup = document.getElementById(SELECTORS.btnStartUnusedCleanup);
    if (btnStartCleanup && !btnStartCleanup.__damBound) {
      btnStartCleanup.__damBound = true;
      btnStartCleanup.addEventListener("click", proceedToUnusedDeletionConfirmation);
    }

    const btnBackToReview = document.getElementById(SELECTORS.btnBackToUnusedReview);
    if (btnBackToReview && !btnBackToReview.__damBound) {
      btnBackToReview.__damBound = true;
      btnBackToReview.addEventListener("click", () => {
        setUnusedModalState("review");
      });
    }

    const btnConfirmDelete = document.getElementById(SELECTORS.btnConfirmDeleteUnused);
    if (btnConfirmDelete && !btnConfirmDelete.__damBound) {
      btnConfirmDelete.__damBound = true;
      btnConfirmDelete.addEventListener("click", executeUnusedMediaCleanup);
    }

    const unusedModal = document.getElementById(SELECTORS.unusedCleanupModal);
    if (unusedModal && !unusedModal.__damBound) {
      unusedModal.__damBound = true;
      unusedModal.addEventListener("click", (e) => {
        if (e.target === unusedModal) closeUnusedReviewModal();
      });
    }

    if (typeof document.addEventListener === "function" && !document.__unusedModalEscBound) {
      document.__unusedModalEscBound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeUnusedReviewModal();
      });
    }

    // Phase 31C-5: Asset Details & Usage Inspector Modal Controls
    const btnCloseInspector = document.getElementById(SELECTORS.inspectorCloseBtn);
    if (btnCloseInspector && !btnCloseInspector.__damBound) {
      btnCloseInspector.__damBound = true;
      btnCloseInspector.addEventListener("click", closeAssetInspector);
    }

    const btnCloseInspectorX = document.getElementById(SELECTORS.inspectorCloseXBtn);
    if (btnCloseInspectorX && !btnCloseInspectorX.__damBound) {
      btnCloseInspectorX.__damBound = true;
      btnCloseInspectorX.addEventListener("click", closeAssetInspector);
    }

    const inspectorModal = document.getElementById(SELECTORS.inspectorModal);
    if (inspectorModal && !inspectorModal.__damBound) {
      inspectorModal.__damBound = true;
      inspectorModal.addEventListener("click", (e) => {
        if (e.target === inspectorModal) closeAssetInspector();
      });
    }

    if (typeof document.addEventListener === "function" && !document.__inspectorModalEscBound) {
      document.__inspectorModalEscBound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeAssetInspector();
      });
    }

    // Asset Preview Lightbox Modal Controls
    const btnClosePreviewX = document.getElementById(SELECTORS.btnClosePreviewX);
    if (btnClosePreviewX && !btnClosePreviewX.__damBound) {
      btnClosePreviewX.__damBound = true;
      btnClosePreviewX.addEventListener("click", closeAssetPreview);
    }

    const previewModal = document.getElementById(SELECTORS.previewModal);
    if (previewModal && !previewModal.__damBound) {
      previewModal.__damBound = true;
      previewModal.addEventListener("click", (e) => {
        if (e.target === previewModal) closeAssetPreview();
      });
    }

    if (typeof document.addEventListener === "function" && !document.__previewModalEscBound) {
      document.__previewModalEscBound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          const pModal = document.getElementById(SELECTORS.previewModal);
          if (pModal && pModal.classList.contains("open")) {
            closeAssetPreview();
          }
        }
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
    scanStorage,
    render: renderDamGrid,
    getFiles: () => [...realStorageFiles],
    setFiles: (files) => {
      realStorageFiles = Array.isArray(files) ? files : [];
      const validUnusedSet = new Set(realStorageFiles.filter(f => isAssetEligibleForUnusedManagement(f)).map(f => f.path));
      selectedUnusedPaths = new Set([...selectedUnusedPaths].filter(p => validUnusedSet.has(p)));
      updateStorageAnalytics();
      renderDamGrid();
    },
    openAssetPreview,
    closeAssetPreview,
    openAssetInspector,
    closeAssetInspector,
    renderCustomAudioPlayer,
    cleanupActiveInspectorAudio,
    formatAudioTime,
    formatReferenceField,
    deleteSingleAsset,
    renameAsset,
    deleteSelectedAssets,
    deleteUnusedAssets,
    deleteOldTempAssets,
    updateStorageAnalytics,
    selectUnusedAsset,
    deselectUnusedAsset,
    toggleUnusedAsset,
    selectAllUnused,
    clearUnusedSelection,
    getSelectedUnusedAssets,
    getSelectedUnusedCount,
    getSelectedUnusedTotalSize,
    openUnusedReviewModal,
    closeUnusedReviewModal,
    setUnusedModalState,
    proceedToUnusedDeletionConfirmation,
    validateSelectedUnusedForDeletion,
    executeUnusedMediaCleanup,
    getFilteredFiles,
    setSort: (s) => {
      currentDamSort = s || "newest";
      const el = typeof document !== "undefined" ? document.getElementById(SELECTORS.sortSelect) : null;
      if (el) el.value = currentDamSort;
      renderDamGrid();
    },
    getSort: () => currentDamSort,
    setFilter: (f) => {
      currentDamFilter = f || "all";
      if (typeof document !== "undefined") {
        const chipBtns = document.querySelectorAll(".dam-filter-bar .chip-btn");
        chipBtns.forEach(btn => {
          if (btn.dataset && btn.dataset.damfilter === currentDamFilter) btn.classList.add("active");
          else if (btn.classList) btn.classList.remove("active");
        });
      }
      renderDamGrid();
    },
    getFilter: () => currentDamFilter,
    toggleFavorite: (path) => {
      const file = realStorageFiles.find(f => f.path === path || f.canonicalPath === path);
      if (file) {
        file.isFavorite = !file.isFavorite;
        updateStorageAnalytics();
        renderDamGrid();
      }
    },
    isAssetEligibleForUnusedManagement,
    ReferenceEngine: MediaReferenceEngine
  });

  // Global access for shared utility use and testing
  window.MediaReferenceEngine = MediaReferenceEngine;

})(window);
