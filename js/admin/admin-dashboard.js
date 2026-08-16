/**
 * ============================================================================
 * ADMIN STUDIO DASHBOARD MODULE (js/admin/admin-dashboard.js)
 * Manages Dashboard Overview metrics, real Supabase KPI card calculations,
 * recent wishes table, session activity feed, and refresh coordinator.
 * ============================================================================
 */

(function (window) {
  "use strict";

  // Reusable core utilities
  const { showToast, formatBytes, copyWishUrl } = window.AdminCore || {};

  // Concurrency lock for refresh requests
  let isRefreshing = false;

  /* ============================================================
     ADMIN DASHBOARD — XSS & HTML SANITIZATION HELPER
     ============================================================ */
  /**
   * Sanitizes text strings to prevent HTML/script injection in dynamic DOM output.
   * @param {string|any} str - Input text or value.
   * @returns {string} Sanitized string safe for HTML interpolation.
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
     ADMIN DASHBOARD — DATA LOADERS (REAL SUPABASE & STORAGE)
     ============================================================ */
  /**
   * Updates the header status indicator to accurately reflect Supabase connectivity.
   * @param {boolean} isConnected - Connection status.
   */
  function updateConnectionStatus(isConnected) {
    const indicator = document.getElementById("admin-supabase-indicator") || document.querySelector(".status-indicator");
    if (!indicator) return;

    if (isConnected) {
      indicator.innerHTML = `<span class="status-dot"></span> Supabase Connected`;
      if (indicator.style) indicator.style.opacity = "1";
    } else {
      indicator.innerHTML = `<span class="status-dot" style="background:#ef4444;box-shadow:0 0 8px #ef4444;"></span> Database Offline`;
      if (indicator.style) indicator.style.opacity = "0.85";
    }
  }

  /**
   * Fetches live wish records from Supabase DB, strictly excluding system configuration row.
   * @returns {Promise<{success: boolean, data: Array, error?: string}>}
   */
  async function fetchWishes() {
    try {
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
    return { success: false, error: "Supabase client unavailable", data: [] };
  }

  /**
   * Fetches real media assets catalog from Supabase Cloud Storage bucket 'wish-media'.
   * @returns {Promise<{success: boolean, data: Array}>}
   */
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
     ADMIN DASHBOARD — KPI METRICS RENDERER
     ============================================================ */
  /**
   * Updates all 6 Dashboard KPI metric cards using live database & storage counts.
   * @param {Array} wishes - Live wishes record list.
   * @param {Array} [storageFiles] - Live storage files metadata list.
   */
  function renderKPIs(wishes = [], storageFiles = []) {
    // 1. Total Wishes KPI
    const totalWishesEl = document.getElementById("kpi-total-wishes");
    if (totalWishesEl) {
      totalWishesEl.textContent = Array.isArray(wishes) ? wishes.length : 0;
    }

    // 2. Today's Wishes KPI (Computed against today's ISO date string)
    const todayWishesEl = document.getElementById("kpi-today-wishes");
    if (todayWishesEl) {
      const todayStr = new Date().toISOString().split("T")[0];
      const todayCount = Array.isArray(wishes)
        ? wishes.filter(w => w.created_at && w.created_at.startsWith(todayStr)).length
        : 0;
      todayWishesEl.textContent = todayCount;
    }

    // 3. Cloud Storage & Media Counts KPI
    let usedBytes = 0;
    let imgCount = 0;
    let vidCount = 0;
    let audCount = 0;

    if (Array.isArray(storageFiles)) {
      storageFiles.forEach(f => {
        usedBytes += (f.size || 0);
        if (f.folder === "photos") imgCount++;
        if (f.folder === "videos") vidCount++;
        if (f.folder === "audio") audCount++;
      });
    }

    const kpiStorage = document.getElementById("kpi-storage-used");
    if (kpiStorage) {
      kpiStorage.textContent = typeof formatBytes === "function" ? formatBytes(usedBytes) : `${usedBytes} B`;
    }

    const kpiImg = document.getElementById("kpi-total-images");
    if (kpiImg) kpiImg.textContent = imgCount;

    const kpiVid = document.getElementById("kpi-total-videos");
    if (kpiVid) kpiVid.textContent = vidCount;

    const kpiAud = document.getElementById("kpi-total-audio");
    if (kpiAud) kpiAud.textContent = audCount;
  }

  /* ============================================================
     ADMIN DASHBOARD — RECENT WISHES TABLE
     ============================================================ */
  /**
   * Renders the top 4 recent wishes in the Dashboard summary panel with XSS safe escaping.
   * @param {Array} wishes - Wishes record list.
   * @param {boolean} [isError=false] - Flag indicating database query error.
   */
  function renderRecentWishes(wishes = [], isError = false) {
    const tbody = document.getElementById("dash-recent-wishes-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (isError) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;color:#ef4444;padding:24px;">
            ⚠️ Unable to load live wishes from Supabase. Check database connectivity.
          </td>
        </tr>
      `;
      return;
    }

    if (!Array.isArray(wishes) || wishes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">
            No wishes created yet. Create a wish using the public wish generator! ✨
          </td>
        </tr>
      `;
      return;
    }

    wishes.slice(0, 4).forEach(w => {
      const tr = document.createElement("tr");
      const shortUuid = w.id ? (w.id.substring(0, 8) + "...") : "N/A";
      const fullUrl = `${window.location.origin}/?w=${encodeURIComponent(w.id || "")}`;
      const recipientName = escapeHtml(w.recipient_name || "Friend");
      const senderName = escapeHtml(w.sender_name || "Friend");
      const avatarInitial = escapeHtml((w.recipient_name || "W").charAt(0).toUpperCase());
      const dateText = w.created_at ? new Date(w.created_at).toLocaleDateString() : "Recent";

      tr.innerHTML = `
        <td>
          <div class="user-cell">
            <div class="user-avatar">${avatarInitial}</div>
            <strong>${recipientName}</strong>
          </div>
        </td>
        <td>${senderName}</td>
        <td><code style="color:var(--purple-light);font-size:0.8rem;">${escapeHtml(shortUuid)}</code></td>
        <td>${escapeHtml(dateText)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" title="Copy Public URL" onclick="window.adminApp ? window.adminApp.copyWishUrl('${fullUrl}') : (window.AdminCore && window.AdminCore.copyWishUrl('${fullUrl}'))">🔗</button>
            <a class="btn-icon" href="${fullUrl}" target="_blank" title="Open Wish Page">👁️</a>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  /* ============================================================
     ADMIN DASHBOARD — RECENT ACTIVITY FEED
     ============================================================ */
  /**
   * Renders real in-memory session audit logs in the Dashboard right panel.
   * @param {Array} logs - Session audit logs array.
   */
  function renderActivityFeed(logs = []) {
    const actList = document.getElementById("dash-recent-activity-list");
    if (!actList) return;

    actList.innerHTML = "";

    if (!Array.isArray(logs) || logs.length === 0) {
      actList.innerHTML = `
        <li style="color:var(--text-muted);text-align:center;padding:16px 0;font-size:0.82rem;">
          No session activity recorded yet.
        </li>
      `;
      return;
    }

    logs.slice(0, 4).forEach(log => {
      const li = document.createElement("li");
      const timeStr = log.time ? (log.time.split(',')[1] || log.time) : "";
      li.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="color:var(--gold);">${escapeHtml(log.event || "LOG")}</strong>
          <span style="color:var(--text-dim);font-size:0.75rem;">${escapeHtml(timeStr)}</span>
        </div>
        <span style="color:var(--text-muted);">${escapeHtml(log.desc || "")}</span>
      `;
      actList.appendChild(li);
    });
  }

  /* ============================================================
     ADMIN DASHBOARD — INITIALIZATION & REFRESH COORDINATOR
     ============================================================ */
  /**
   * Initializes Dashboard Overview event handlers (e.g. Refresh Analytics button) with race-condition protection.
   * @param {Function} [onRefreshCallback] - Custom callback to trigger on refresh.
   */
  function init(onRefreshCallback) {
    const refreshBtn = document.getElementById("btn-refresh-dashboard");
    if (refreshBtn && !refreshBtn.__dashBound) {
      refreshBtn.__dashBound = true;
      refreshBtn.addEventListener("click", async () => {
        if (isRefreshing) return;
        if (typeof onRefreshCallback === "function") {
          await onRefreshCallback();
        } else {
          await refresh();
        }
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Dashboard analytics refreshed with live data 🔄");
        }
      });
    }
  }

  /**
   * Performs an asynchronous refresh of Dashboard data and UI views from live database and storage.
   * @param {Function} [onCompleteCallback] - Optional callback receiving refreshed data.
   * @returns {Promise<{wishes: Array, storageFiles: Array}>}
   */
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

      if (typeof onCompleteCallback === "function") {
        await onCompleteCallback(wishes, storageFiles);
      }

      return { wishes, storageFiles };
    } finally {
      isRefreshing = false;
    }
  }

  /* ============================================================
     EXPORT AUTHORITATIVE NAMESPACE
     ============================================================ */
  window.AdminDashboard = Object.freeze({
    init,
    fetchWishes,
    fetchStorage,
    renderKPIs,
    renderRecentWishes,
    renderActivityFeed,
    refresh,
    escapeHtml,
    updateConnectionStatus
  });

})(window);
