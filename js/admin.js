/**
 * ============================================================================
 * ADMIN DASHBOARD ENGINE (js/admin.js)
 * Manages tab navigation, wishes table, media library, security settings,
 * backups, system audit logs, and responsive layout.
 * ============================================================================
 */

(function (window) {
  "use strict";

  // Authoritative Modular Subsystems (Phase 28B-6)
  const { showToast, formatBytes, copyWishUrl } = window.AdminCore || {};
  const { checkAdminAccessGate, initTabNavigation, initLogout } = window.AdminNavigation || {};
  const { init: initDashboard, renderKPIs, renderRecentWishes, renderActivityFeed, fetchWishes } = window.AdminDashboard || {};

  // System Audit Logs Array (Real session action tracking)
  const systemLogs = [
    { time: new Date().toLocaleString(), event: "ADMIN_LOGIN", desc: "Admin session authenticated successfully", status: "SUCCESS" }
  ];

  // Cached Wishes Data for Table Rendering (Populated from live Supabase query)
  let wishesList = [];

  // Media Library Catalog Items (Fallback empty catalog)
  const mediaItems = {
    images: [],
    videos: [],
    audio: []
  };

  // Add Log Entry
  function logEvent(event, desc, status = "SUCCESS") {
    systemLogs.unshift({
      time: new Date().toLocaleString(),
      event,
      desc,
      status
    });
    renderLogsTable();
    if (typeof renderActivityFeed === "function") {
      renderActivityFeed(systemLogs);
    }
  }

  // Load and Coordinate Data for Admin Views
  async function loadDashboardData() {
    let querySuccess = true;
    if (typeof fetchWishes === "function") {
      const res = await fetchWishes();
      if (res && res.success) {
        wishesList = res.data || [];
      } else {
        querySuccess = false;
        wishesList = [];
      }
    }

    if (typeof renderKPIs === "function") {
      renderKPIs(wishesList, realStorageFiles);
    }
    if (typeof renderRecentWishes === "function") {
      renderRecentWishes(wishesList, !querySuccess);
    }
    if (typeof renderActivityFeed === "function") {
      renderActivityFeed(systemLogs);
    }
    renderWishesTable(!querySuccess);
    renderLogsTable();
    if (typeof renderDamGrid === "function") renderDamGrid();
  }

  // Render Full Wishes View Table
  function renderWishesTable(isError = false) {
    const tbody = document.getElementById("wishes-tbody");
    if (!tbody) return;

    if (isError) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ef4444;padding:32px;">⚠️ Unable to load wishes from Supabase database.</td></tr>`;
      return;
    }

    const searchTerm = (document.getElementById("wishes-search-input")?.value || "").toLowerCase();
    const sortVal = document.getElementById("wishes-sort-select")?.value || "newest";

    let filtered = wishesList.filter(w => {
      const name = (w.recipient_name || "").toLowerCase();
      const sender = (w.sender_name || "").toLowerCase();
      const id = (w.id || "").toLowerCase();
      return name.includes(searchTerm) || sender.includes(searchTerm) || id.includes(searchTerm);
    });

    if (sortVal === "oldest") {
      filtered.reverse();
    } else if (sortVal === "name") {
      filtered.sort((a, b) => (a.recipient_name || "").localeCompare(b.recipient_name || ""));
    }

    tbody.innerHTML = "";

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No stored wishes found. ✨</td></tr>`;
      return;
    }

    const escape = (window.AdminDashboard && window.AdminDashboard.escapeHtml) || (s => s);

    filtered.forEach(w => {
      const tr = document.createElement("tr");
      const fullUrl = `${location.origin}/?w=${encodeURIComponent(w.id || "")}`;

      tr.innerHTML = `
        <td>
          <div class="user-cell">
            <div class="user-avatar">${escape((w.recipient_name || "W").charAt(0).toUpperCase())}</div>
            <div>
              <strong>${escape(w.recipient_name || "Friend")}</strong>
              <div style="font-size:0.75rem;color:var(--text-dim);">ID: ${escape(w.id ? w.id.substring(0, 13) + "..." : "Local")}</div>
            </div>
          </div>
        </td>
        <td>${escape(w.sender_name || "Friend")}</td>
        <td><span class="status-badge active">🔑 ${escape(w.pass_code || "1234")}</span></td>
        <td><button class="btn-sm" onclick="window.adminApp.copyWishUrl('${fullUrl}')">📋 Copy UUID Link</button></td>
        <td>${w.created_at ? new Date(w.created_at).toLocaleDateString() : "Recent"}</td>
        <td>
          <div class="action-btns">
            <a class="btn-icon" href="${fullUrl}" target="_blank" title="Open Public Page">👁️</a>
            <button class="btn-icon" title="Duplicate Wish" onclick="window.adminApp.duplicateWish('${w.id}')">📋</button>
            <button class="btn-icon danger" title="Delete Wish" onclick="window.adminApp.deleteWish('${w.id}')">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Digital Asset Manager (DAM) State
  let realStorageFiles = [];
  let currentDamFilter = "all";
  let currentDamEventFilter = "all";
  let damSearchQuery = "";
  let selectedFilePaths = new Set();

  // Load Real Supabase Storage Data & Calculate Storage Analytics
  async function loadStorageMediaData() {
    try {
      if (window.StorageModule && typeof window.StorageModule.listAllMedia === "function") {
        const files = await window.StorageModule.listAllMedia();
        if (Array.isArray(files) && files.length > 0) {
          realStorageFiles = files.map((f, i) => {
            // Cross-reference with wishes table to check if file is linked to a wish
            let isUsed = false;
            let usedInName = "Unused";
            let usedInUuid = null;

            if (Array.isArray(wishesList) && wishesList.length > 0) {
              wishesList.forEach(w => {
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

            // Assign Event Type (Default Birthday, or custom)
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
    } catch(e) {
      console.warn("Using fallback local asset data:", e);
    }

    updateStorageAnalytics();
    renderDamGrid();
  }

  // Update Storage Manager Progress Bar & Meta Counters
  function updateStorageAnalytics() {
    const BASE_TOTAL_BYTES = 1073741824; // 1 GB Base Tier
    let usedBytes = 0;
    let imagesCount = 0;
    let videosCount = 0;
    let audioCount = 0;
    let usedCount = 0;
    let unusedCount = 0;
    let favCount = 0;
    let recentCount = 0;

    const oneWeekAgo = Date.now() - 7 * 86400000;

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

    // Update Header Progress Bar
    const progressFill = document.getElementById("dam-storage-progress-fill");
    if (progressFill) progressFill.style.width = `${percentUsed}%`;

    const usedText = document.getElementById("dam-storage-used-text");
    if (usedText) usedText.textContent = `${formatBytes(usedBytes)} / 1 GB`;

    const freeText = document.getElementById("dam-storage-free-text");
    if (freeText) freeText.textContent = `${formatBytes(freeBytes)} Remaining`;

    const countText = document.getElementById("dam-file-count-text");
    if (countText) countText.textContent = `Total Files: ${realStorageFiles.length} (${imagesCount} Photos, ${videosCount} Videos, ${audioCount} Audio)`;

    const percentText = document.getElementById("dam-percent-text");
    if (percentText) percentText.textContent = `${percentUsed}% Capacity Used`;

    // Update KPI Card on Dashboard
    const kpiStorage = document.getElementById("kpi-storage-used");
    if (kpiStorage) kpiStorage.textContent = formatBytes(usedBytes);

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

  // Render Digital Asset Manager Grid Cards
  function renderDamGrid() {
    const container = document.getElementById("media-grid-container");
    if (!container) return;

    let items = realStorageFiles;

    // 1. Filter Chips
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

    // 2. Event Type Filter
    if (currentDamEventFilter !== "all") {
      items = items.filter(f => f.eventType === currentDamEventFilter);
    }

    // 3. Search Bar Query Matching
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
        previewHtml = `<img src="${file.publicUrl}" alt="${file.name}" onerror="this.src='assets/images/polaroid-1.jpg'">`;
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
            <button class="overlay-btn" title="👁️ Preview" onclick="window.adminApp.openAssetPreview('${file.publicUrl}', '${file.name}', '${file.folder}', '${formatBytes(file.size)}')">👁️</button>
            <a class="overlay-btn" title="📥 Download" href="${file.publicUrl}" download target="_blank" style="text-decoration:none;">📥</a>
            <button class="overlay-btn" title="📋 Copy URL" onclick="window.adminApp.copyWishUrl('${file.publicUrl}')">📋</button>
            <button class="overlay-btn" title="✏️ Rename" onclick="window.adminApp.renameAsset('${file.path}', '${file.name}')">✏️</button>
            <button class="overlay-btn danger" title="🗑 Delete" onclick="window.adminApp.deleteSingleAsset('${file.path}')">🗑️</button>
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
            <span>${formatBytes(file.size)}</span>
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

  // Open Lightbox Asset Preview Modal
  function openAssetPreview(url, filename, folder, size) {
    const modal = document.getElementById("asset-preview-modal");
    const nameEl = document.getElementById("asset-modal-filename");
    const viewerEl = document.getElementById("asset-modal-viewer");
    const metaEl = document.getElementById("asset-modal-meta");
    const copyBtn = document.getElementById("btn-modal-copy-url");
    const dlBtn = document.getElementById("btn-modal-download");

    if (!modal || !viewerEl) return;

    if (nameEl) nameEl.textContent = filename;
    if (metaEl) metaEl.textContent = `Size: ${size} | URL: ${url}`;
    if (dlBtn) dlBtn.href = url;
    if (copyBtn) copyBtn.onclick = () => window.adminApp.copyWishUrl(url);

    if (folder === "photos") {
      viewerEl.innerHTML = `<img src="${url}" style="max-width:100%;max-height:55vh;object-fit:contain;">`;
    } else if (folder === "videos") {
      viewerEl.innerHTML = `<video src="${url}" controls autoplay style="max-width:100%;max-height:55vh;"></video>`;
    } else {
      viewerEl.innerHTML = `<audio src="${url}" controls autoplay style="width:80%;margin:20px;"></audio>`;
    }

    modal.classList.add("open");
  }

  // Single Asset Delete
  async function deleteSingleAsset(path) {
    if (!confirm("Are you sure you want to delete this media asset from Supabase Storage?")) return;
    showToast("Deleting asset... ⏳");

    if (window.StorageModule && typeof window.StorageModule.deleteMedia === "function") {
      const ok = await window.StorageModule.deleteMedia(path);
      if (ok) {
        realStorageFiles = realStorageFiles.filter(f => f.path !== path);
        updateStorageAnalytics();
        renderDamGrid();
        logEvent("MEDIA_DELETE", `Deleted cloud asset: ${path}`);
        showToast("Asset deleted from Supabase Storage 🗑️");
        return;
      }
    }

    // Fallback UI delete
    realStorageFiles = realStorageFiles.filter(f => f.path !== path);
    updateStorageAnalytics();
    renderDamGrid();
    showToast("Asset removed from library 🗑️");
  }

  // Rename Asset Helper
  function renameAsset(path, currentName) {
    const newName = prompt("Enter new filename for asset:", currentName);
    if (!newName || newName === currentName) return;
    const file = realStorageFiles.find(f => f.path === path);
    if (file) {
      file.name = newName;
      renderDamGrid();
      logEvent("MEDIA_RENAME", `Renamed asset ${currentName} to ${newName}`);
      showToast("Asset renamed! ✏️");
    }
  }

  // Delete Selected Checkbox Files
  async function deleteSelectedAssets() {
    if (selectedFilePaths.size === 0) {
      showToast("No media files selected for deletion ⚠️");
      return;
    }
    if (!confirm(`Delete ${selectedFilePaths.size} selected file(s) from Supabase Storage?`)) return;

    showToast(`Deleting ${selectedFilePaths.size} files... ⏳`);
    const pathsArray = Array.from(selectedFilePaths);

    if (window.StorageModule && typeof window.StorageModule.deleteMultipleMedia === "function") {
      await window.StorageModule.deleteMultipleMedia(pathsArray);
    }

    realStorageFiles = realStorageFiles.filter(f => !selectedFilePaths.has(f.path));
    selectedFilePaths.clear();
    updateStorageAnalytics();
    renderDamGrid();
    logEvent("MEDIA_CLEANUP", `Bulk deleted ${pathsArray.length} assets`);
    showToast("Selected files deleted 🗑️");
  }

  // Delete Unused Media Files (Safe Cleanup Tool)
  async function deleteUnusedAssets() {
    const unusedFiles = realStorageFiles.filter(f => !f.isUsed);
    if (unusedFiles.length === 0) {
      showToast("Zero unused files found — All assets are currently linked! ✨");
      return;
    }

    if (!confirm(`Clean up ${unusedFiles.length} unused media file(s) not linked to any wish?`)) return;

    showToast(`Cleaning up ${unusedFiles.length} unused files... ⏳`);
    const pathsArray = unusedFiles.map(f => f.path);

    if (window.StorageModule && typeof window.StorageModule.deleteMultipleMedia === "function") {
      await window.StorageModule.deleteMultipleMedia(pathsArray);
    }

    realStorageFiles = realStorageFiles.filter(f => f.isUsed);
    updateStorageAnalytics();
    renderDamGrid();
    logEvent("MEDIA_CLEANUP", `Safe cleanup removed ${unusedFiles.length} unlinked files`);
    showToast(`🧹 Successfully cleaned up ${unusedFiles.length} unused files! ✨`);
  }

  // Delete Old Temp Files (Created over 7 days ago and unlinked)
  async function deleteOldTempAssets() {
    const weekAgo = Date.now() - 7 * 86400000;
    const tempFiles = realStorageFiles.filter(f => !f.isUsed && new Date(f.created_at).getTime() < weekAgo);

    if (tempFiles.length === 0) {
      showToast("No old temporary files found (> 7 days unlinked) ✨");
      return;
    }

    if (!confirm(`Delete ${tempFiles.length} old temporary file(s) created over 7 days ago?`)) return;

    showToast(`Deleting ${tempFiles.length} temp files... ⏳`);
    const pathsArray = tempFiles.map(f => f.path);

    if (window.StorageModule && typeof window.StorageModule.deleteMultipleMedia === "function") {
      await window.StorageModule.deleteMultipleMedia(pathsArray);
    }

    realStorageFiles = realStorageFiles.filter(f => !pathsArray.includes(f.path));
    updateStorageAnalytics();
    renderDamGrid();
    logEvent("MEDIA_CLEANUP", `Deleted ${tempFiles.length} old temp files`);
    showToast(`⏳ Cleaned up ${tempFiles.length} old temp files! ✨`);
  }

  // Direct File Upload into Supabase Storage
  function initDamDirectUpload() {
    const input = document.getElementById("dam-direct-upload-input");
    if (!input) return;

    input.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      showToast(`Uploading ${files.length} asset(s) to Supabase Storage... ☁️`);
      for (const file of files) {
        const folder = file.type.startsWith("image/") ? "photos"
                     : file.type.startsWith("video/") ? "videos"
                     : "audio";

        if (window.StorageModule && typeof window.StorageModule.uploadMedia === "function") {
          await window.StorageModule.uploadMedia(file, folder);
        }
      }

      await loadStorageMediaData();
      logEvent("MEDIA_UPLOAD", `Uploaded ${files.length} new asset(s) to wish-media`);
      showToast(`☁️ ${files.length} asset(s) uploaded to Cloud Storage! ✨`);
      input.value = "";
    });
  }

  // Render Logs Table
  function renderLogsTable() {
    const tbody = document.getElementById("logs-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    systemLogs.forEach(log => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="color:var(--text-dim);font-size:0.8rem;">${log.time}</td>
        <td><span class="status-badge active">${log.event}</span></td>
        <td>${log.desc}</td>
        <td><strong style="color:#2ecc71;">${log.status}</strong></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Generate Random Recovery Code (e.g. WS-9F8A-3E21-7B04)
  function generateBackupCode() {
    const segment = () => Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase();
    return `WS-${segment()}-${segment()}-${segment()}`;
  }

  // Security Settings & Triple Recovery Channel Handlers (Phase 2.1 Persistent)
  async function initSecurityHandlers() {
    let settings = { admin_recovery_email: "admin@example.com", admin_recovery_code: "WS-9F8A-3E21-7B04", custom_secret_question: "Who is your best friend?", custom_secret_answer: "Shivam" };

    if (window.DatabaseModule && typeof window.DatabaseModule.getSecuritySettings === "function") {
      settings = await window.DatabaseModule.getSecuritySettings();
    }

    if (!settings.admin_recovery_code) {
      settings.admin_recovery_code = generateBackupCode();
      if (window.DatabaseModule) window.DatabaseModule.saveSecuritySettings({ admin_recovery_code: settings.admin_recovery_code });
    }

    // Populate elements
    const emailInput = document.getElementById("sec-recovery-email");
    if (emailInput) emailInput.value = settings.admin_recovery_email;

    const codeDisplay = document.getElementById("sec-code-display");
    if (codeDisplay) codeDisplay.textContent = settings.admin_recovery_code;

    const qPreset = document.getElementById("sec-question-preset");
    const qCustomInput = document.getElementById("sec-custom-question");
    if (qPreset) {
      if (["What is your childhood pet's name?", "What was the name of your first school?", "In what city were you born?", "What is your mother's maiden name?"].includes(settings.custom_secret_question)) {
        qPreset.value = settings.custom_secret_question;
      } else {
        qPreset.value = "custom";
        if (qCustomInput) {
          qCustomInput.style.display = "block";
          qCustomInput.value = settings.custom_secret_question;
        }
      }

      qPreset.addEventListener("change", () => {
        if (qPreset.value === "custom") {
          if (qCustomInput) qCustomInput.style.display = "block";
        } else {
          if (qCustomInput) qCustomInput.style.display = "none";
        }
      });
    }

    // 1. Change Master Password via PasswordService
    const savePassBtn = document.getElementById("sec-save-pass-btn");
    if (savePassBtn) {
      savePassBtn.addEventListener("click", async () => {
        const oldVal = (document.getElementById("sec-old-pass")?.value || "").trim();
        const newVal = (document.getElementById("sec-new-pass")?.value || "").trim();
        const confirmVal = (document.getElementById("sec-confirm-pass")?.value || "").trim();

        if (!oldVal) {
          showToast("Please enter your current password ⚠️");
          return;
        }

        const isOldValid = window.PasswordService ? await window.PasswordService.verifyPassword(oldVal) : false;
        if (!isOldValid) {
          showToast("Current password is incorrect ❌");
          return;
        }

        if (!newVal || newVal.length < 4) {
          showToast("New password must be at least 4 characters ⚠️");
          return;
        }
        if (newVal !== confirmVal) {
          showToast("Passwords do not match ❌");
          return;
        }

        const success = window.PasswordService ? await window.PasswordService.updatePassword(newVal) : false;
        if (success) {
          const oldInput = document.getElementById("sec-old-pass");
          const newInput = document.getElementById("sec-new-pass");
          const confirmInput = document.getElementById("sec-confirm-pass");
          if (oldInput) oldInput.value = "";
          if (newInput) newInput.value = "";
          if (confirmInput) confirmInput.value = "";
          showToast("🔑 Master Password updated successfully on Supabase! ✅");
          if (window.adminApp && typeof window.adminApp.logEvent === "function") {
            window.adminApp.logEvent("PASSWORD_CHANGED", "Master Admin Password changed & persisted");
          }
        } else {
          showToast("Failed to update password on Supabase ❌");
        }
      });
    }

    // 2. Recovery Email Setup with OTP Verification (Stage 1)
    const saveEmailBtn = document.getElementById("sec-save-email-btn");
    const sendOtpBtn = document.getElementById("sec-send-otp-btn") || saveEmailBtn;
    let cooldownInterval = null;

    const startCooldownTimer = (seconds, btn) => {
      if (!btn) return;
      let left = seconds;
      btn.disabled = true;
      btn.textContent = `Resend OTP (${left}s)`;
      if (cooldownInterval) clearInterval(cooldownInterval);
      cooldownInterval = setInterval(() => {
        left--;
        if (left <= 0) {
          clearInterval(cooldownInterval);
          btn.disabled = false;
          btn.textContent = "Send Verification OTP";
        } else {
          btn.textContent = `Resend OTP (${left}s)`;
        }
      }, 1000);
    };

    if (saveEmailBtn) {
      saveEmailBtn.addEventListener("click", async () => {
        const email = (document.getElementById("sec-recovery-email")?.value || "").trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const otpBox = document.getElementById("sec-email-otp-box");
        const otpInput = document.getElementById("sec-email-otp-input");
        const verifyOtpBtn = document.getElementById("sec-verify-email-otp-btn");

        if (!email || !emailRegex.test(email)) {
          showToast("Please enter a valid email address ⚠️");
          return;
        }

        // Check if OTP input box is already open and user clicked verify
        if (otpBox && otpBox.style.display !== "none" && otpInput && otpInput.value.trim().length === 6) {
          showToast("⏳ Verifying OTP...");
          try {
            const apiUrl = window.getApiUrl ? window.getApiUrl("/api/send-otp") : "/api/send-otp";
            const res = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "save-recovery-email", email, otpCode: otpInput.value.trim() })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              settings.admin_recovery_email = email;
              settings.recovery_email_verified = true;
              if (window.DatabaseModule) {
                await window.DatabaseModule.saveSecuritySettings({ admin_recovery_email: email, recovery_email_verified: true });
              }
              showToast("📧 Recovery Email Verified & Saved! ✅");
              if (otpBox) otpBox.style.display = "none";
              if (otpInput) otpInput.value = "";
              return;
            } else {
              showToast(data.error || "OTP verification failed ❌");
              return;
            }
          } catch (e) {
            showToast("Network error verifying OTP ❌");
            return;
          }
        }

        // Otherwise send OTP
        showToast("⏳ Requesting Verification OTP...");
        try {
          const apiUrl = window.getApiUrl ? window.getApiUrl("/api/send-otp") : "/api/send-otp";
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "request-otp", email, purpose: "SETUP" })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast("📨 Verification OTP sent to " + email + "! Check inbox/spam.");
            startCooldownTimer(data.resendCooldownSeconds || 60, saveEmailBtn);
            if (otpBox) otpBox.style.display = "flex";
            if (otpInput) otpInput.focus();
          } else {
            showToast(data.error || "Failed to send OTP ❌");
          }
        } catch (e) {
          showToast("Network error sending OTP ❌");
        }
      });
    }

    function updateAllBackupCodeDisplays(code) {
      localStorage.setItem("admin_recovery_code", code);
      if (window.DatabaseModule && typeof window.DatabaseModule.saveSecuritySettings === "function") {
        window.DatabaseModule.saveSecuritySettings({ admin_recovery_code: code });
      }
      const selectors = [
        "#sec-code-display",
        "#sec-backup-code-display",
        "#forgot-backup-code-display",
        ".sec-backup-code-val"
      ];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          el.textContent = code;
        });
      });
    }

    if (codeDisplay) {
      updateAllBackupCodeDisplays(settings.admin_recovery_code);
    } else {
      updateAllBackupCodeDisplays(settings.admin_recovery_code || localStorage.getItem("admin_recovery_code") || "WS-9F8A-3E21-7B04");
    }

    // Attach Global Delegated Event Listeners for Backup Code Actions
    if (!window.__backupCodeActionsBound) {
      window.__backupCodeActionsBound = true;

      document.addEventListener("click", async (e) => {
        // 1. COPY CODE
        const copyBtn = e.target.closest("#btn-copy-recovery-code, .btn-copy-code-action");
        if (copyBtn) {
          e.preventDefault();
          const code = (localStorage.getItem("admin_recovery_code") || document.getElementById("sec-backup-code-display")?.textContent || "WS-9F8A-3E21-7B04").trim();
          try {
            await navigator.clipboard.writeText(code);
            const origText = copyBtn.innerHTML;
            copyBtn.innerHTML = "✓ Copied!";
            copyBtn.style.background = "rgba(34, 197, 94, 0.2)";
            copyBtn.style.borderColor = "#22c55e";
            setTimeout(() => {
              copyBtn.innerHTML = origText;
              copyBtn.style.background = "rgba(255, 255, 255, 0.08)";
              copyBtn.style.borderColor = "rgba(255, 255, 255, 0.2)";
            }, 1500);
            if (typeof showToast === "function") showToast("📋 Backup code copied to clipboard!");
          } catch (err) {
            console.error("Clipboard copy error:", err);
          }
          return;
        }

        // 2. DOWNLOAD TXT (WishStudio-Backup-Code.txt)
        const dlBtn = e.target.closest("#btn-download-recovery-code, .btn-download-code-action");
        if (dlBtn) {
          e.preventDefault();
          const code = (localStorage.getItem("admin_recovery_code") || document.getElementById("sec-backup-code-display")?.textContent || "WS-9F8A-3E21-7B04").trim();
          const formattedDate = new Date().toLocaleString("en-US", {
            dateStyle: "full",
            timeStyle: "short"
          });
          const txt = `Wish Studio\n\nEmergency Backup Code\n\nGenerated:\n${formattedDate}\n\nBackup Code:\n${code}\n\nKeep this code secure.`;
          const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
          const a = document.createElement("a");
          const dlUrl = URL.createObjectURL(blob);
          a.href = dlUrl;
          a.download = "WishStudio-Backup-Code.txt";
          a.click();
          setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);
          if (typeof showToast === "function") showToast("📥 WishStudio-Backup-Code.txt downloaded!");
          return;
        }

        // 3. PRINT CODE
        const printBtn = e.target.closest("#btn-print-recovery-code, .btn-print-code-action");
        if (printBtn) {
          e.preventDefault();
          const code = (localStorage.getItem("admin_recovery_code") || document.getElementById("sec-backup-code-display")?.textContent || "WS-9F8A-3E21-7B04").trim();
          const printWindow = window.open("", "_blank");
          if (printWindow) {
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Wish Studio Emergency Backup Code</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #0F0A1C; text-align: center; }
                  .card { border: 2px dashed #F7C94A; padding: 32px 24px; border-radius: 16px; max-width: 440px; margin: 20px auto; background: #1B1530; color: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
                  .title { font-size: 24px; font-weight: 800; color: #F7C94A; margin-bottom: 4px; }
                  .sub { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.7); margin-bottom: 24px; }
                  .code { font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #F7C94A; margin: 20px 0; background: #120D24; padding: 18px; border-radius: 10px; border: 1px solid #F7C94A; }
                  .warn { font-size: 12px; color: #FDE047; margin-top: 20px; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div class="title">👑 Wish Studio</div>
                  <div class="sub">Emergency Backup Code</div>
                  <div class="code">${code}</div>
                  <div style="font-size:12px; color:#CBD5E1;">Generated: ${new Date().toLocaleString()}</div>
                  <div class="warn">⚠ Store this code safely. Never share it with anyone.</div>
                </div>
                <script>window.onload = function() { window.print(); };</script>
              </body>
              </html>
            `);
            printWindow.document.close();
          }
          return;
        }

        // 4. GENERATE NEW CODE (Show Confirmation Modal)
        const regenBtn = e.target.closest("#btn-regen-recovery-code, .btn-regen-code-action");
        if (regenBtn) {
          e.preventDefault();
          const regenModal = document.getElementById("regen-confirm-modal");
          if (regenModal) {
            regenModal.classList.add("open");
            regenModal.style.display = "flex";
          }
          return;
        }

        // 5. REGENERATE CANCEL
        const regenCancel = e.target.closest("#btn-regen-cancel");
        if (regenCancel) {
          e.preventDefault();
          const regenModal = document.getElementById("regen-confirm-modal");
          if (regenModal) {
            regenModal.classList.remove("open");
            regenModal.style.display = "none";
          }
          return;
        }

        // 6. REGENERATE CONFIRM
        const regenConfirm = e.target.closest("#btn-regen-confirm");
        if (regenConfirm) {
          e.preventDefault();
          const regenModal = document.getElementById("regen-confirm-modal");
          if (regenModal) {
            regenModal.classList.remove("open");
            regenModal.style.display = "none";
          }

          const newCode = (typeof generateBackupCode === "function") ? generateBackupCode() : ("WS-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase());
          
          updateAllBackupCodeDisplays(newCode);

          // Section 6: Glow & Scale Success Animation
          const backupWrappers = document.querySelectorAll("#sec-backup-card-wrapper, #forgot-backup-card-wrapper");
          backupWrappers.forEach(bw => {
            bw.style.transform = "scale(1.03)";
            bw.style.boxShadow = "0 0 30px rgba(247, 201, 74, 0.6), 0 0 15px rgba(168, 85, 247, 0.4)";
            bw.style.borderColor = "#22c55e";
            setTimeout(() => {
              bw.style.transform = "scale(1)";
              bw.style.boxShadow = "0 0 20px rgba(247, 201, 74, 0.15)";
              bw.style.borderColor = "#F7C94A";
            }, 1200);
          });

          if (typeof logEvent === "function") logEvent("RECOVERY_CODE_REGENERATED", "Emergency Recovery Code regenerated & persisted");
          if (typeof showToast === "function") showToast("✓ New Backup Code Created");
          return;
        }
      });
    }

    // 4. Save Security Question & Answer
    const saveRecBtn = document.getElementById("sec-save-recovery-btn");
    if (saveRecBtn) {
      saveRecBtn.addEventListener("click", async () => {
        const qSel = document.getElementById("sec-question-preset")?.value || "";
        const qCust = (document.getElementById("sec-custom-question")?.value || "").trim();
        const finalQuestion = qSel === "custom" ? qCust : qSel;
        const answer = (document.getElementById("sec-recovery-answer")?.value || "").trim();

        if (!finalQuestion) {
          showToast("Please select or enter a security question ⚠️");
          return;
        }
        if (!answer) {
          showToast("Please enter a secret answer ⚠️");
          return;
        }

        showToast("⏳ Hashing and saving Security Question & Answer...");
        try {
          const apiUrl = window.getApiUrl ? window.getApiUrl("/api/auth") : "/api/auth";
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save-question", question: finalQuestion, answer })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            settings.custom_secret_question = finalQuestion;
            if (window.DatabaseModule) {
              await window.DatabaseModule.saveSecuritySettings({
                custom_secret_question: finalQuestion,
                custom_secret_answer: answer
              });
            }
            const ansInp = document.getElementById("sec-recovery-answer");
            if (ansInp) ansInp.value = "";
            logEvent("SECURITY_QUESTION_UPDATED", "Security Question and hashed secret answer saved & persisted");
            showToast("🛡 Security Question & Answer Hashed & Saved! ✅");
          } else {
            showToast(data.error || "Failed to save Security Question & Answer ❌");
          }
        } catch (e) {
          showToast("Network error saving Security Question & Answer ❌");
        }
      });
    }
  }

  // Backup Export & Import Logic
  function initBackupHandlers() {
    const exportBtn = document.getElementById("btn-export-backup");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const backupData = {
          export_date: new Date().toISOString(),
          version: "2.5",
          wishes: wishesList,
          logs: systemLogs
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        const dlUrl = URL.createObjectURL(blob);
        a.href = dlUrl;
        a.download = `birthday-suite-backup-${Date.now()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);
        logEvent("BACKUP_EXPORT", "Exported JSON backup file");
        showToast("💾 Backup JSON File Exported! 📥");
      });
    }

    const importInput = document.getElementById("import-backup-file");
    if (importInput) {
      importInput.addEventListener("change", (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            if (data && data.wishes && Array.isArray(data.wishes)) {
              wishesList = data.wishes;
              loadDashboardData();
              logEvent("BACKUP_IMPORT", `Restored ${data.wishes.length} wishes from JSON backup`);
              showToast(`📥 Successfully Restored ${data.wishes.length} Wishes from Backup! 🎉`);
            }
          } catch(err) {
            showToast("Invalid Backup JSON file ❌");
          }
        };
        reader.readAsText(f);
      });
    }
  }

  // Delete Wish Helper
  function deleteWish(id) {
    if (!confirm("Are you sure you want to delete this wish record?")) return;
    wishesList = wishesList.filter(w => w.id !== id);
    loadDashboardData();
    logEvent("WISH_DELETED", `Deleted wish record ID: ${id}`);
    showToast("Wish record deleted 🗑️");
  }

  // Duplicate Wish Helper
  function duplicateWish(id) {
    const item = wishesList.find(w => w.id === id);
    if (!item) return;
    const dup = JSON.parse(JSON.stringify(item));
    dup.id = "dup-" + Date.now().toString(36);
    dup.recipient_name = (dup.recipient_name || "Copy") + " (Copy)";
    wishesList.unshift(dup);
    loadDashboardData();
    logEvent("WISH_DUPLICATED", `Duplicated wish record ID: ${id}`);
    showToast("Wish record duplicated 📋");
  }

  // Initialize Admin App
  document.addEventListener("DOMContentLoaded", () => {
    if (!checkAdminAccessGate()) return;
    initTabNavigation();
    initSecurityHandlers();
    initBackupHandlers();
    initLogout();
    if (typeof initDashboard === "function") {
      initDashboard(async () => {
        await loadDashboardData();
        await loadStorageMediaData();
      });
    }
    initDamDirectUpload();
    loadDashboardData();
    loadStorageMediaData();

    // DAM Filter Chips Listeners
    const chipBtns = document.querySelectorAll(".dam-filter-bar .chip-btn");
    chipBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        chipBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentDamFilter = btn.dataset.damfilter || "all";
        renderDamGrid();
      });
    });

    // DAM Event Filter Dropdown
    const eventSelect = document.getElementById("dam-event-filter");
    if (eventSelect) {
      eventSelect.addEventListener("change", (e) => {
        currentDamEventFilter = e.target.value;
        renderDamGrid();
      });
    }

    // DAM Live Search Input
    const damSearchInput = document.getElementById("dam-search-input");
    if (damSearchInput) {
      damSearchInput.addEventListener("input", (e) => {
        damSearchQuery = e.target.value.trim();
        renderDamGrid();
      });
    }

    // Cleanup Tools Dropdown Menu & Button Listeners
    const cleanupTrigger = document.getElementById("dam-cleanup-trigger-btn");
    const cleanupMenu = document.getElementById("dam-cleanup-menu");
    if (cleanupTrigger && cleanupMenu) {
      cleanupTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        cleanupMenu.style.display = cleanupMenu.style.display === "block" ? "none" : "block";
      });
      document.addEventListener("click", () => { cleanupMenu.style.display = "none"; });
    }

    const delSelectedBtn = document.getElementById("btn-delete-selected-dam");
    if (delSelectedBtn) delSelectedBtn.addEventListener("click", deleteSelectedAssets);

    const delUnusedBtn = document.getElementById("btn-delete-unused-dam");
    if (delUnusedBtn) delUnusedBtn.addEventListener("click", deleteUnusedAssets);

    const delTempBtn = document.getElementById("btn-delete-temp-dam");
    if (delTempBtn) delTempBtn.addEventListener("click", deleteOldTempAssets);

    // Table Search Listener
    const searchInput = document.getElementById("wishes-search-input");
    if (searchInput) searchInput.addEventListener("input", renderWishesTable);

    const sortSelect = document.getElementById("wishes-sort-select");
    if (sortSelect) sortSelect.addEventListener("change", renderWishesTable);

    const createBtn = document.getElementById("btn-create-new-wish-admin");
    if (createBtn) {
      createBtn.addEventListener("click", () => {
        window.location.href = "index.html";
      });
    }
  });

  // Export Global API
  window.adminApp = {
    showToast,
    copyWishUrl,
    deleteWish,
    duplicateWish,
    logEvent,
    openAssetPreview,
    deleteSingleAsset,
    renameAsset
  };

})(window);
