/**
 * ============================================================================
 * ADMIN STUDIO DASHBOARD MODULE (js/admin/admin-dashboard.js)
 * Manages Dashboard Overview metrics, real Supabase KPI calculations,
 * recent wishes table, storage breakdown overview, session activity feed,
 * and refresh coordinator.
 * ============================================================================
 */

(function (window) {
  "use strict";

  // Reusable core utilities
  const { showToast, formatBytes, copyWishUrl } = window.AdminCore || {};

  // Concurrency lock for refresh requests
  let isRefreshing = false;

  /* ============================================================
     1. CONSTANTS & SELECTORS
     ============================================================ */
  const SELECTORS = {
    totalWishes: "kpi-total-wishes",
    todayWishes: "kpi-today-wishes",
    totalImages: "kpi-total-images",
    totalVideos: "kpi-total-videos",
    totalAudio: "kpi-total-audio",
    storageUsed: "kpi-storage-used",
    storageRemaining: "kpi-storage-remaining",
    unusedMedia: "kpi-unused-media",
    systemStatus: "kpi-system-status",
    subTotalWishes: "kpi-sub-total-wishes",
    subTodayWishes: "kpi-sub-today-wishes",
    subTotalImages: "kpi-sub-total-images",
    subTotalVideos: "kpi-sub-total-videos",
    subTotalAudio: "kpi-sub-total-audio",
    subStorageUsed: "kpi-sub-storage-used",
    subStorageRemaining: "kpi-sub-storage-remaining",
    subUnusedMedia: "kpi-sub-unused-media",
    subSystemStatus: "kpi-sub-system-status",
    recentWishesTbody: "dash-recent-wishes-tbody",
    storageBreakdown: "dash-storage-breakdown",
    activityList: "dash-recent-activity-list",
    refreshBtn: "btn-refresh-dashboard",
    viewAllWishesBtn: "btn-dash-view-all-wishes",
    viewAllMediaBtn: "btn-dash-view-all-media",
    viewAllLogsBtn: "btn-dash-view-all-logs",
    cleanupUnusedBtn: "btn-dash-cleanup-unused",
    supabaseIndicator: "admin-supabase-indicator"
  };

  /* ============================================================
     2. XSS & TIME FORMATTING HELPERS
     ============================================================ */
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
   * Formats an ISO string, Date object, or time string into localized 12-hour 'hh:mm:ss A' format.
   * e.g., '05:30:17 PM', '09:14:32 AM'.
   * @param {string|Date} timeVal - Input time or date.
   * @returns {string} Formatted 12-hour time string with leading zeros.
   */
  function formatActivityTime(timeVal) {
    if (!timeVal) return "Just now";

    // If timeVal contains a time string like "17:30:17" or "5:30:17 PM"
    const rawTimeMatch = String(timeVal).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (rawTimeMatch) {
      let h = parseInt(rawTimeMatch[1], 10);
      const m = String(rawTimeMatch[2]).padStart(2, "0");
      const s = rawTimeMatch[3] ? String(rawTimeMatch[3]).padStart(2, "0") : "00";
      let mer = rawTimeMatch[4] ? rawTimeMatch[4].toUpperCase() : null;

      if (!mer) {
        mer = h >= 12 ? "PM" : "AM";
        h = h % 12;
        h = h ? h : 12;
      }
      const hourStr = String(h).padStart(2, "0");
      return `${hourStr}:${m}:${s} ${mer}`;
    }

    const date = new Date(timeVal);
    if (!isNaN(date.getTime())) {
      try {
        const parts = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        }).formatToParts(date);

        let h = "", m = "", s = "", dayPeriod = "";
        parts.forEach(p => {
          if (p.type === "hour") h = p.value.padStart(2, "0");
          if (p.type === "minute") m = p.value.padStart(2, "0");
          if (p.type === "second") s = p.value.padStart(2, "0");
          if (p.type === "dayPeriod") dayPeriod = p.value.toUpperCase();
        });

        if (h && m && s && dayPeriod) {
          return `${h}:${m}:${s} ${dayPeriod}`;
        }
      } catch (e) {
        // Fallback
      }

      const pad = (n) => String(n).padStart(2, "0");
      let hours = date.getHours();
      const minutes = pad(date.getMinutes());
      const seconds = pad(date.getSeconds());
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${pad(hours)}:${minutes}:${seconds} ${ampm}`;
    }

    return String(timeVal);
  }

  /* ============================================================
     3. DATA LOADERS (SUPABASE DB & CLOUD STORAGE)
     ============================================================ */
  function updateConnectionStatus(isConnected) {
    const indicator = document.getElementById(SELECTORS.supabaseIndicator) || (typeof document !== "undefined" ? document.querySelector(".status-indicator") : null);
    if (!indicator) return;

    if (isConnected) {
      indicator.innerHTML = `<span class="status-dot"></span> Supabase Connected`;
      if (indicator.style) indicator.style.opacity = "1";
    } else {
      indicator.innerHTML = `<span class="status-dot" style="background:#ef4444;box-shadow:0 0 8px #ef4444;"></span> Database Offline`;
      if (indicator.style) indicator.style.opacity = "0.85";
    }
  }

  async function fetchWishes() {
    try {
      const token = (typeof sessionStorage !== "undefined" && sessionStorage.getItem("admin_session_token")) || "";
      const apiUrl = (typeof window !== "undefined" && typeof window.getApiUrl === "function")
        ? window.getApiUrl("/api/admin-wishes")
        : "/api/admin-wishes";

      // 1. Primary Privileged Read Path (/api/admin-wishes via Service Role)
      try {
        const res = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : "",
            "x-admin-token": token
          }
        });

        if (res.ok) {
          const result = await res.json();
          if (result && result.success && Array.isArray(result.data)) {
            updateConnectionStatus(true);
            return { success: true, data: result.data };
          }
        }
      } catch (apiErr) {
        console.warn("⚠️ AdminDashboard: Privileged API fetch notice:", apiErr.message || apiErr);
      }

      // 2. Safe Fallback Path (during transitional mocks / offline client fallback)
      if (window.SupabaseModule) {
        const client = window.SupabaseModule.getClient();
        if (client) {
          const { data, error } = await client
            .from("wishes")
            .select("*")
            .neq("id", "00000000-0000-0000-0000-000000000001")
            .order("created_at", { ascending: false });

          if (!error && Array.isArray(data)) {
            updateConnectionStatus(true);
            return { success: true, data };
          }
          if (error) {
            console.warn("⚠️ AdminDashboard: Supabase wishes fetch notice:", error.message);
            updateConnectionStatus(false);
            return { success: false, error: error.message, data: [] };
          }
        }
      }
    } catch (e) {
      console.warn("⚠️ AdminDashboard: Supabase wishes fetch exception:", e);
      updateConnectionStatus(false);
      return { success: false, error: e.message, data: [] };
    }
    updateConnectionStatus(false);
    return { success: false, error: "Admin wishes API unavailable", data: [] };
  }

  async function fetchStorage() {
    try {
      if (window.StorageModule && typeof window.StorageModule.listAllMedia === "function") {
        const files = await window.StorageModule.listAllMedia();
        if (Array.isArray(files)) {
          return { success: true, data: files };
        }
      }
    } catch (e) {
      console.warn("⚠️ AdminDashboard: Storage list exception:", e);
    }
    return { success: false, data: [] };
  }

  /* ============================================================
     4. KPI CALCULATION ENGINE
     ============================================================ */
  function calculateKPIs(wishes = [], storageFiles = []) {
    const safeWishes = Array.isArray(wishes) ? wishes : [];
    const safeFiles = Array.isArray(storageFiles) ? storageFiles : [];

    const totalWishes = safeWishes.length;

    const todayStr = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    let todayWishes = 0;
    let recent7dWishes = 0;

    safeWishes.forEach(w => {
      if (w && w.created_at) {
        if (w.created_at.startsWith(todayStr)) todayWishes++;
        const createdMs = new Date(w.created_at).getTime();
        if (!isNaN(createdMs) && createdMs >= sevenDaysAgo) recent7dWishes++;
      }
    });

    let totalStorageBytes = 0;
    let photosCount = 0;
    let photosBytes = 0;
    let videosCount = 0;
    let videosBytes = 0;
    let audioCount = 0;
    let audioBytes = 0;
    let usedMediaCount = 0;
    let unusedMediaCount = 0;
    let unusedStorageBytes = 0;

    const refEngine = (typeof MediaReferenceEngine !== "undefined" && MediaReferenceEngine) ||
                      (window.MediaReferenceEngine || (window.AdminMedia && window.AdminMedia.ReferenceEngine));
    const refMap = (refEngine && typeof refEngine.buildReferenceMap === "function" && safeWishes.length > 0)
      ? refEngine.buildReferenceMap(safeWishes)
      : null;

    safeFiles.forEach(f => {
      const size = f.size || 0;
      totalStorageBytes += size;

      if (f.folder === "photos") {
        photosCount++;
        photosBytes += size;
      } else if (f.folder === "videos") {
        videosCount++;
        videosBytes += size;
      } else if (f.folder === "audio") {
        audioCount++;
        audioBytes += size;
      }

      let isReferenced = !!f.isUsed;
      if (refMap) {
        const refs = refMap.getReferences(f.path || f.canonicalPath);
        if (refs && refs.length > 0) isReferenced = true;
      } else if (Array.isArray(f.references) && f.references.length > 0) {
        isReferenced = true;
      }

      if (isReferenced) {
        usedMediaCount++;
      } else {
        unusedMediaCount++;
        unusedStorageBytes += size;
      }
    });

    const totalCapacityBytes = 1024 * 1024 * 1024; // 1 GB standard Supabase bucket allocation
    const usedStorageBytes = totalStorageBytes;
    const remainingStorageBytes = Math.max(0, totalCapacityBytes - usedStorageBytes);
    const usagePercentage = totalCapacityBytes > 0 ? parseFloat(Math.min(100, Math.max(0, (usedStorageBytes / totalCapacityBytes) * 100)).toFixed(1)) : 0;
    const remainingPercentage = totalCapacityBytes > 0 ? parseFloat(Math.min(100, Math.max(0, (remainingStorageBytes / totalCapacityBytes) * 100)).toFixed(1)) : 100;

    return {
      totalWishes,
      todayWishes,
      recent7dWishes,
      totalMedia: safeFiles.length,
      photosCount,
      photosBytes,
      videosCount,
      videosBytes,
      audioCount,
      audioBytes,
      totalStorageBytes,
      totalCapacityBytes,
      usedStorageBytes,
      remainingStorageBytes,
      usagePercentage,
      remainingPercentage,
      usedMediaCount,
      unusedMediaCount,
      unusedStorageBytes
    };
  }

  /* ============================================================
     5. KPI METRICS RENDERER
     ============================================================ */
  function renderKPIs(wishes = [], storageFiles = []) {
    const m = calculateKPIs(wishes, storageFiles);
    const format = typeof formatBytes === "function" ? formatBytes : (b) => `${b} B`;

    // 1. Total Wishes
    const totalEl = document.getElementById(SELECTORS.totalWishes);
    if (totalEl) totalEl.textContent = m.totalWishes;

    const subTotalEl = document.getElementById(SELECTORS.subTotalWishes);
    if (subTotalEl) subTotalEl.innerHTML = `<span class="trend">Active</span> database records`;

    // 2. Recent Wishes
    const todayEl = document.getElementById(SELECTORS.todayWishes);
    if (todayEl) todayEl.textContent = m.todayWishes;

    const subTodayEl = document.getElementById(SELECTORS.subTodayWishes);
    if (subTodayEl) {
      subTodayEl.textContent = m.todayWishes === 1 ? `1 created today` : `${m.todayWishes} created today`;
    }

    // 3. Photos / Images
    const imgEl = document.getElementById(SELECTORS.totalImages);
    if (imgEl) imgEl.textContent = m.photosCount;

    const subImgEl = document.getElementById(SELECTORS.subTotalImages);
    if (subImgEl) subImgEl.textContent = format(m.photosBytes);

    // 4. Videos
    const vidEl = document.getElementById(SELECTORS.totalVideos);
    if (vidEl) vidEl.textContent = m.videosCount;

    const subVidEl = document.getElementById(SELECTORS.subTotalVideos);
    if (subVidEl) subVidEl.textContent = format(m.videosBytes);

    // 5. Audio Notes
    const audEl = document.getElementById(SELECTORS.totalAudio);
    if (audEl) audEl.textContent = m.audioCount;

    const subAudEl = document.getElementById(SELECTORS.subTotalAudio);
    if (subAudEl) subAudEl.textContent = format(m.audioBytes);

    // 6. Total Storage Used
    const storageEl = document.getElementById(SELECTORS.storageUsed);
    if (storageEl) storageEl.textContent = format(m.totalStorageBytes);

    const subStorageEl = document.getElementById(SELECTORS.subStorageUsed);
    if (subStorageEl) {
      subStorageEl.innerHTML = `<span class="trend">${m.usagePercentage}%</span> of 1 GB used`;
    }

    // 7. Unused Media
    const unusedEl = document.getElementById(SELECTORS.unusedMedia);
    if (unusedEl) unusedEl.textContent = m.unusedMediaCount;

    const subUnusedEl = document.getElementById(SELECTORS.subUnusedMedia);
    if (subUnusedEl) {
      subUnusedEl.innerHTML = m.unusedMediaCount > 0
        ? `<span style="color:#fca5a5;font-weight:600;">${format(m.unusedStorageBytes)}</span> reclaimable`
        : `<span style="color:#86efac;font-weight:600;">All assets in use</span>`;
    }

    // 8. Storage Remaining
    const remainingEl = document.getElementById(SELECTORS.storageRemaining);
    if (remainingEl) remainingEl.textContent = format(m.remainingStorageBytes);

    const subRemainingEl = document.getElementById(SELECTORS.subStorageRemaining);
    if (subRemainingEl) {
      subRemainingEl.innerHTML = `
        <span style="color:${m.remainingPercentage < 15 ? '#fca5a5' : '#86efac'};font-weight:600;">${m.remainingPercentage}% Free</span> <span style="color:var(--text-dim);font-size:0.75rem;margin-left:auto;">of 1 GB</span>
      `;
    }

    // 9. System Status
    const statusEl = document.getElementById(SELECTORS.systemStatus);
    if (statusEl) {
      statusEl.textContent = "Operational";
      statusEl.style.color = "var(--gold, #fbbf24)";
    }

    const subStatusEl = document.getElementById(SELECTORS.subSystemStatus);
    if (subStatusEl) {
      subStatusEl.innerHTML = `<span class="trend">● Online</span> Supabase Pipeline`;
    }

    // 9. Delegate comprehensive Analytics & Chart rendering
    if (window.AdminDashboardAnalytics && typeof window.AdminDashboardAnalytics.createDashboardSnapshot === "function") {
      const snapshot = window.AdminDashboardAnalytics.createDashboardSnapshot(wishes, storageFiles);
      window.AdminDashboardAnalytics.renderAllAnalytics(snapshot);
    }
  }

  /* ============================================================
     6. RECENT WISHES TABLE RENDERER
     ============================================================ */
  function renderWishContentBadges(w) {
    if (!w) return "—";
    const badges = [];

    const hasPhoto = (function () {
      let g = w.gallery_json !== undefined ? w.gallery_json : (w.gallery || w.photos || w.media_photos || w.photo);
      if (!g) return false;
      if (typeof g === "string") {
        const t = g.trim();
        if (!t || t === "[]" || t === "{}" || t === "null") return false;
        try { g = JSON.parse(t); } catch (e) { return t.length > 0; }
      }
      return Array.isArray(g) ? g.length > 0 : (typeof g === "object" && Object.keys(g).length > 0);
    })();

    const hasVideo = !!(w.video_url || w.video || w.youtube_url || w.videoWish?.url);
    const hasAudio = !!(w.music_url || w.audio_url || w.music || w.music?.file);
    const hasLetter = (function () {
      let l = w.letter_lines !== undefined ? w.letter_lines : (w.letterLines || w.letter_body || w.message || w.custom_message);
      if (!l) return false;
      if (typeof l === "string") {
        const t = l.trim();
        if (!t || t === "[]" || t === "{}") return false;
        try { l = JSON.parse(t); } catch (e) { return t.length > 0; }
      }
      return Array.isArray(l) ? l.length > 0 : false;
    })();
    const hasPasscode = !!(w.pass_code || (w.passcode?.code !== undefined ? w.passcode.code : w.passcode));

    if (hasPhoto) badges.push(`<span class="dash-media-badge" title="Has Photos">📷</span>`);
    if (hasVideo) badges.push(`<span class="dash-media-badge" title="Has Video">🎥</span>`);
    if (hasAudio) badges.push(`<span class="dash-media-badge" title="Has Audio/Music">🎙️</span>`);
    if (hasLetter) badges.push(`<span class="dash-media-badge" title="Has Birthday Letter">💌</span>`);
    if (hasPasscode) badges.push(`<span class="dash-media-badge" title="Custom Passcode Protected">🔑</span>`);

    return badges.length > 0 ? `<div class="dash-media-badges">${badges.join("")}</div>` : `<span style="color:var(--text-dim);font-size:0.75rem;">Standard</span>`;
  }

  function renderRecentWishes(wishes = [], isError = false) {
    const tbody = document.getElementById(SELECTORS.recentWishesTbody);
    if (!tbody) return;

    tbody.innerHTML = "";

    if (isError) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="dash-empty-container">
            <div style="color:#ef4444;font-size:1.6rem;margin-bottom:6px;">⚠️</div>
            <div style="font-weight:600;color:#fca5a5;margin-bottom:4px;">Unable to load live wishes</div>
            <p style="color:var(--text-muted);font-size:0.82rem;margin:0 0 12px 0;">Database connection error. Other dashboard metrics remain available.</p>
            <button type="button" class="btn-sm btn-filter-toggle" id="btn-dash-retry-wishes">🔄 Retry</button>
          </td>
        </tr>
      `;
      const retryBtn = tbody.querySelector("#btn-dash-retry-wishes");
      if (retryBtn) {
        retryBtn.onclick = () => refresh();
      }
      return;
    }

    if (!Array.isArray(wishes) || wishes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="dash-empty-container">
            <div style="font-size:2rem;margin-bottom:8px;">🎂</div>
            <div style="font-weight:600;color:#fff;margin-bottom:4px;">No wishes created yet</div>
            <p style="color:var(--text-muted);font-size:0.82rem;margin:0 0 16px 0;">Create a new personalized birthday wish to see it here.</p>
            <button type="button" class="btn-primary btn-gold" id="btn-dash-create-first-wish" style="font-size:0.85rem;padding:8px 18px;">➕ Create New Wish</button>
          </td>
        </tr>
      `;
      const createBtn = tbody.querySelector("#btn-dash-create-first-wish");
      if (createBtn) {
        createBtn.onclick = () => {
          if (window.AdminWishes && typeof window.AdminWishes.openWishEditor === "function") {
            window.AdminWishes.openWishEditor(null);
          } else if (window.AdminNavigation && typeof window.AdminNavigation.switchTab === "function") {
            window.AdminNavigation.switchTab("wishes");
          }
        };
      }
      return;
    }

    wishes.slice(0, 5).forEach(w => {
      const tr = document.createElement("tr");
      const fullUrl = `${window.location.origin}/?w=${encodeURIComponent(w.id || "")}`;
      const recipientName = escapeHtml(w.recipient_name || "Friend");
      const senderName = escapeHtml(w.sender_name || "—");
      const avatarInitial = escapeHtml((w.recipient_name || "W").charAt(0).toUpperCase());

      let dateText = "Recent";
      if (w.created_at) {
        if (window.AdminWishes && typeof window.AdminWishes.formatIndianDateTime === "function") {
          dateText = window.AdminWishes.formatIndianDateTime(w.created_at);
        } else {
          dateText = new Date(w.created_at).toLocaleDateString();
        }
      }

      const contentBadges = renderWishContentBadges(w);

      tr.innerHTML = `
        <td>
          <div class="user-cell">
            <div class="user-avatar">${avatarInitial}</div>
            <strong style="color:#fff;">${recipientName}</strong>
          </div>
        </td>
        <td style="color:var(--text-dim);font-size:0.84rem;">${senderName}</td>
        <td>${contentBadges}</td>
        <td style="color:var(--text-dim);font-size:0.80rem;">${escapeHtml(dateText)}</td>
        <td>
          <div class="action-btns">
            <button type="button" class="btn-icon btn-dash-quick-view" data-wish-id="${w.id || ""}" title="Quick View Wish" aria-label="Quick View Wish">👁️</button>
            <button type="button" class="btn-icon btn-dash-edit-wish" data-wish-id="${w.id || ""}" title="Edit Wish in Wish Editor" aria-label="Edit Wish">✏️</button>
            <button type="button" class="btn-icon btn-dash-copy-link" data-url="${fullUrl}" title="Copy Public Wish URL" aria-label="Copy Public Wish URL">🔗</button>
            <a class="btn-icon" href="${fullUrl}" target="_blank" title="Open Public Wish Page ↗" aria-label="Open Public Wish Page">↗</a>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".btn-dash-quick-view").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.wishId;
        if (id && window.AdminWishes && typeof window.AdminWishes.openQuickView === "function") {
          window.AdminWishes.openQuickView(id);
        }
      };
    });

    tbody.querySelectorAll(".btn-dash-edit-wish").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.wishId;
        if (window.AdminWishes && typeof window.AdminWishes.openWishEditor === "function") {
          window.AdminWishes.openWishEditor(id);
        } else if (window.AdminNavigation && typeof window.AdminNavigation.switchTab === "function") {
          window.AdminNavigation.switchTab("wishes");
        }
      };
    });

    tbody.querySelectorAll(".btn-dash-copy-link").forEach(btn => {
      btn.onclick = () => {
        const url = btn.dataset.url;
        if (url) {
          if (typeof copyWishUrl === "function") copyWishUrl(url);
          else if (window.AdminCore && typeof window.AdminCore.copyWishUrl === "function") window.AdminCore.copyWishUrl(url);
        }
      };
    });
  }

  /* ============================================================
     7. STORAGE OVERVIEW BREAKDOWN RENDERER
     ============================================================ */
  function renderStorageBreakdown(storageFiles = [], wishes = []) {
    const container = document.getElementById(SELECTORS.storageBreakdown);
    if (!container) return;

    const m = calculateKPIs(wishes, storageFiles);
    const format = typeof formatBytes === "function" ? formatBytes : (b) => `${b} B`;

    container.innerHTML = `
      <div class="dash-storage-capacity-bar" style="margin-bottom:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px 12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.80rem;margin-bottom:6px;">
          <span style="color:#fff;font-weight:600;">Storage Capacity: <strong style="color:var(--gold);">${format(m.totalStorageBytes)} / ${format(m.totalCapacityBytes)}</strong></span>
          <span style="color:${m.usagePercentage > 85 ? '#fca5a5' : '#86efac'};font-weight:600;">${format(m.remainingStorageBytes)} Remaining</span>
        </div>
        <div style="width:100%;height:6px;background:rgba(255,255,255,0.08);border-radius:99px;overflow:hidden;margin-bottom:4px;">
          <div style="width:${Math.max(1, m.usagePercentage)}%;height:100%;background:${m.usagePercentage > 85 ? '#ef4444' : 'linear-gradient(90deg, #a855f7, #ffd700)'};border-radius:99px;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text-dim);">
          <span>${m.usagePercentage}% Used</span>
          <span>Bucket: wish-media</span>
        </div>
      </div>
      <div class="dash-storage-grid">
        <div class="dash-storage-card">
          <span class="dash-storage-label">🖼 Photos</span>
          <span class="dash-storage-val">${m.photosCount} <span class="dash-storage-sub">(${format(m.photosBytes)})</span></span>
        </div>
        <div class="dash-storage-card">
          <span class="dash-storage-label">📹 Videos</span>
          <span class="dash-storage-val">${m.videosCount} <span class="dash-storage-sub">(${format(m.videosBytes)})</span></span>
        </div>
        <div class="dash-storage-card">
          <span class="dash-storage-label">🎙 Audio</span>
          <span class="dash-storage-val">${m.audioCount} <span class="dash-storage-sub">(${format(m.audioBytes)})</span></span>
        </div>
        <div class="dash-storage-card">
          <span class="dash-storage-label">⚠️ Unused</span>
          <span class="dash-storage-val" style="color:${m.unusedMediaCount > 0 ? '#fca5a5' : '#86efac'};">
            ${m.unusedMediaCount} <span class="dash-storage-sub">(${format(m.unusedStorageBytes)})</span>
          </span>
        </div>
      </div>
      ${m.unusedMediaCount > 0 ? `
        <div class="dash-cleanup-banner">
          <span>🧹 <strong>${m.unusedMediaCount} unused files</strong> can be cleaned up</span>
          <button type="button" class="btn-sm btn-dash-insight-action" id="${SELECTORS.cleanupUnusedBtn}" style="background:rgba(239,68,68,0.25) !important;color:#fca5a5 !important;border-color:rgba(239,68,68,0.4) !important;">Review →</button>
        </div>
      ` : `
        <div style="font-size:0.78rem;color:#86efac;text-align:center;padding:6px;background:rgba(74,222,128,0.08);border-radius:6px;border:1px solid rgba(74,222,128,0.2);">
          ✓ All storage assets are actively referenced
        </div>
      `}
    `;

    const cleanupBtn = container.querySelector(`#${SELECTORS.cleanupUnusedBtn}`);
    if (cleanupBtn) {
      cleanupBtn.onclick = () => {
        if (window.AdminNavigation && typeof window.AdminNavigation.switchTab === "function") {
          window.AdminNavigation.switchTab("media");
        }
        if (window.AdminMedia && typeof window.AdminMedia.setFilter === "function") {
          window.AdminMedia.setFilter("unused");
        }
      };
    }
  }

  /* ============================================================
     8. RECENT ACTIVITY FEED
     ============================================================ */
  function renderActivityFeed(logs = []) {
    const actList = document.getElementById(SELECTORS.activityList);
    if (!actList) return;

    actList.innerHTML = "";

    if (!Array.isArray(logs) || logs.length === 0) {
      actList.innerHTML = `
        <li style="color:var(--text-muted);text-align:center;padding:16px 0;font-size:0.82rem;">
          No session activity recorded yet. ✨
        </li>
      `;
      return;
    }

    logs.slice(0, 4).forEach(log => {
      const li = document.createElement("li");
      const timeStr = formatActivityTime(log.time);
      li.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="color:var(--gold);font-size:0.82rem;">${escapeHtml(log.event || "LOG")}</strong>
          <span style="color:var(--text-dim);font-size:0.74rem;">${escapeHtml(timeStr)}</span>
        </div>
        <span style="color:var(--text-muted);font-size:0.80rem;">${escapeHtml(log.desc || "")}</span>
      `;
      actList.appendChild(li);
    });
  }

  /* ============================================================
     9. INITIALIZATION & REFRESH COORDINATOR
     ============================================================ */
  function init(onRefreshCallback) {
    const refreshBtn = document.getElementById(SELECTORS.refreshBtn);
    if (refreshBtn && !refreshBtn.__dashBound) {
      refreshBtn.__dashBound = true;
      refreshBtn.addEventListener("click", async () => {
        if (isRefreshing) return;
        refreshBtn.disabled = true;
        refreshBtn.textContent = "⏳ Refreshing...";
        try {
          if (typeof onRefreshCallback === "function") {
            await onRefreshCallback();
          } else {
            await refresh();
          }
          if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
            window.AdminCore.showToast("Dashboard analytics refreshed with live data 🔄");
          }
        } finally {
          refreshBtn.disabled = false;
          refreshBtn.textContent = "🔄 Refresh Analytics";
        }
      });
    }

    const viewWishesBtn = document.getElementById(SELECTORS.viewAllWishesBtn);
    if (viewWishesBtn && !viewWishesBtn.__dashBound) {
      viewWishesBtn.__dashBound = true;
      viewWishesBtn.addEventListener("click", () => {
        if (window.AdminNavigation && typeof window.AdminNavigation.switchTab === "function") {
          window.AdminNavigation.switchTab("wishes");
        }
      });
    }

    const viewMediaBtn = document.getElementById(SELECTORS.viewAllMediaBtn);
    if (viewMediaBtn && !viewMediaBtn.__dashBound) {
      viewMediaBtn.__dashBound = true;
      viewMediaBtn.addEventListener("click", () => {
        if (window.AdminNavigation && typeof window.AdminNavigation.switchTab === "function") {
          window.AdminNavigation.switchTab("media");
        }
      });
    }

    const viewLogsBtn = document.getElementById(SELECTORS.viewAllLogsBtn);
    if (viewLogsBtn && !viewLogsBtn.__dashBound) {
      viewLogsBtn.__dashBound = true;
      viewLogsBtn.addEventListener("click", () => {
        if (window.AdminNavigation && typeof window.AdminNavigation.switchTab === "function") {
          window.AdminNavigation.switchTab("logs");
        }
      });
    }

    const unusedEl = document.getElementById(SELECTORS.unusedMedia);
    const unusedCard = unusedEl && typeof unusedEl.closest === "function" ? unusedEl.closest(".metric-card") : null;
    if (unusedCard && !unusedCard.__dashBound) {
      unusedCard.__dashBound = true;
      unusedCard.style.cursor = "pointer";
      unusedCard.title = "View Unused Media in Media Library";
      if (typeof unusedCard.addEventListener === "function") {
        unusedCard.addEventListener("click", () => {
          if (window.AdminNavigation && typeof window.AdminNavigation.switchTab === "function") {
            window.AdminNavigation.switchTab("media");
          }
          if (window.AdminMedia && typeof window.AdminMedia.setFilter === "function") {
            window.AdminMedia.setFilter("unused");
          }
        });
      }
    }

    // Initialize Save & Share controls
    if (window.AdminDashboardAnalytics && typeof window.AdminDashboardAnalytics.initShareControls === "function") {
      window.AdminDashboardAnalytics.initShareControls();
    }
  }

  async function refresh(onCompleteCallback) {
    if (isRefreshing) return;
    isRefreshing = true;
    try {
      const wishesRes = await fetchWishes();
      const storageRes = await fetchStorage();

      const wishes = wishesRes.success ? wishesRes.data : [];
      const storageFiles = storageRes.success ? storageRes.data : [];

      renderKPIs(wishes, storageFiles);
      renderRecentWishes(wishes, !wishesRes.success);
      renderStorageBreakdown(storageFiles, wishes);

      if (typeof onCompleteCallback === "function") {
        await onCompleteCallback(wishes, storageFiles);
      }

      return { wishes, storageFiles };
    } finally {
      isRefreshing = false;
    }
  }

  /* ============================================================
     10. AUTHORITATIVE PUBLIC API
     ============================================================ */
  window.AdminDashboard = Object.freeze({
    init,
    calculateKPIs,
    renderKPIs,
    renderRecentWishes,
    renderStorageBreakdown,
    renderActivityFeed,
    fetchWishes,
    fetchStorage,
    refresh,
    escapeHtml,
    formatActivityTime,
    updateConnectionStatus
  });

})(window);
