/**
 * ============================================================================
 * ADMIN STUDIO LOGS MODULE (js/admin/admin-logs.js)
 * Manages System Audit Logs array, persistent storage, action tracking,
 * 12-hour timestamp formatting, search & category filtering, CSV/JSON export,
 * and live activity synchronization.
 * ============================================================================
 */

(function (window) {
  "use strict";

  // Reusable core utilities
  const { showToast } = window.AdminCore || {};

  /* ============================================================
     1. CONSTANTS & SELECTORS
     ============================================================ */
  const STORAGE_KEY = "bw_admin_audit_logs";
  const DEFAULT_MAX_LOGS = 100;

  const SELECTORS = {
    tbody: "logs-tbody",
    searchInput: "logs-search-input",
    categoryFilter: "logs-category-filter",
    clearBtn: "btn-clear-logs",
    exportCsvBtn: "btn-export-logs-csv",
    exportJsonBtn: "btn-export-logs-json",
    countBadge: "logs-count-badge"
  };

  /* ============================================================
     2. TIMESTAMP FORMATTING (12-Hour Format: DD/MM/YYYY, hh:mm:ss AM/PM)
     ============================================================ */
  /**
   * Formats a Date object, ISO string, or timestamp into canonical 12-hour format:
   * 'DD/MM/YYYY, hh:mm:ss AM/PM'
   * @param {Date|string|number} [input] - Date instance or timestamp.
   * @returns {string} Formatted 12-hour timestamp string.
   */
  function formatLogTimestamp(input) {
    let date;
    if (!input) {
      date = new Date();
    } else if (input instanceof Date) {
      date = isNaN(input.getTime()) ? new Date() : input;
    } else if (typeof input === "number") {
      date = new Date(input);
    } else if (typeof input === "string") {
      // 1. Check if it already matches DD/MM/YYYY, hh:mm:ss AM/PM
      const match12 = input.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})[,\s]+(\d{1,2}):(\d{1,2}):(\d{1,2})\s*(AM|PM)$/i);
      if (match12) {
        const [_, d, m, y, h, min, s, mer] = match12;
        const pad = (n) => String(n).padStart(2, "0");
        return `${pad(d)}/${pad(m)}/${y}, ${pad(h)}:${pad(min)}:${pad(s)} ${mer.toUpperCase()}`;
      }

      // 2. Check if 24-hour format: DD/MM/YYYY, HH:mm:ss
      const match24 = input.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})[,\s]+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
      if (match24) {
        const [_, d, m, y, h24, min, s] = match24;
        let h = parseInt(h24, 10);
        const mer = h >= 12 ? "PM" : "AM";
        h = h % 12;
        if (h === 0) h = 12;
        const pad = (n) => String(n).padStart(2, "0");
        return `${pad(d)}/${pad(m)}/${y}, ${pad(h)}:${pad(min)}:${pad(s)} ${mer}`;
      }

      // 3. Parse generic ISO or date string
      const parsed = new Date(input);
      date = isNaN(parsed.getTime()) ? new Date() : parsed;
    } else {
      date = new Date();
    }

    const pad = (n) => String(n).padStart(2, "0");
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const meridian = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    if (hours === 0) hours = 12;
    const formattedHours = pad(hours);

    return `${day}/${month}/${year}, ${formattedHours}:${minutes}:${seconds} ${meridian}`;
  }

  /**
   * Escapes untrusted HTML characters to neutralize Stored XSS in audit log tables.
   * @param {any} str - Input text.
   * @returns {string} Sanitized string.
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    if (window.AdminDashboard && typeof window.AdminDashboard.escapeHtml === "function") {
      return window.AdminDashboard.escapeHtml(str);
    }
    if (window.AdminCore && typeof window.AdminCore.escapeHtml === "function") {
      return window.AdminCore.escapeHtml(str);
    }
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ============================================================
     3. MODULE STATE & PERSISTENCE
     ============================================================ */
  let onActivityFeedHook = null;
  let activeFilter = { category: "ALL", search: "" };

  /**
   * Loads logs from localStorage or initializes with default session start.
   * @returns {Array} Logs array.
   */
  function loadLogsFromStorage() {
    try {
      if (typeof window.localStorage !== "undefined") {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(item => Object.assign({}, item, {
              time: formatLogTimestamp(item.time || item.iso)
            }));
          }
        }
      }
    } catch (e) {
      console.warn("⚠️ Failed to load audit logs from storage:", e);
    }

    const now = new Date();
    return [
      {
        time: formatLogTimestamp(now),
        iso: now.toISOString(),
        event: "ADMIN_LOGIN",
        desc: "Admin session authenticated successfully",
        status: "SUCCESS"
      }
    ];
  }

  const systemLogs = loadLogsFromStorage();

  /**
   * Persists current audit logs to localStorage (capped at max entries).
   */
  function saveLogsToStorage() {
    try {
      if (typeof window.localStorage !== "undefined") {
        const maxLogs = (window.AdminSettings && typeof window.AdminSettings.getSetting === "function")
          ? (window.AdminSettings.getSetting("maxLogsRetained") || DEFAULT_MAX_LOGS)
          : DEFAULT_MAX_LOGS;

        if (systemLogs.length > maxLogs) {
          systemLogs.length = maxLogs;
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(systemLogs));
      }
    } catch (e) {
      console.warn("⚠️ Failed to save audit logs to storage:", e);
    }
  }

  /* ============================================================
     4. SENSITIVE DATA REDACTION & CATEGORIES
     ============================================================ */
  /**
   * Strips sensitive passwords, passcodes, recovery codes, and tokens from log strings.
   * @param {string} text - Raw log text.
   * @returns {string} Sanitized text.
   */
  function sanitizeLogText(text) {
    if (typeof text !== "string") return String(text || "");
    return text
      .replace(/(password|passcode|token|secret|recovery[_\-\s]?code|api[_\-\s]?key|otp|otpCode|secret_answer|security_answer)\s*[:=]?\s*(to|is|as)?\s*([^\s,;]+)/gi, "$1: [REDACTED]")
      .replace(/WS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/gi, "WS-****-****-****");
  }

  /**
   * Categorizes an event tag into a standard category.
   * @param {string} event - Event tag.
   * @returns {string} Category string.
   */
  function getCategoryFromEvent(event) {
    const ev = String(event || "").toUpperCase();
    if (ev.includes("LOGIN") || ev.includes("LOGOUT") || ev.includes("AUTH") || ev.includes("SESSION")) return "AUTH";
    if (ev.includes("WISH")) return "WISH";
    if (ev.includes("MEDIA") || ev.includes("STORAGE") || ev.includes("ASSET")) return "MEDIA";
    if (ev.includes("BACKUP")) return "BACKUP";
    if (ev.includes("SETTING") || ev.includes("THEME")) return "SETTINGS";
    if (ev.includes("PASSWORD") || ev.includes("SECURITY") || ev.includes("RECOVERY")) return "SECURITY";
    return "SYSTEM";
  }

  /* ============================================================
     5. LOG RECORDING & SYNCHRONIZATION
     ============================================================ */
  /**
   * Records a new system audit log entry and updates the table/activity feed.
   * @param {string} event - Action tag (e.g. 'PASSWORD_CHANGED', 'WISH_CREATED').
   * @param {string} desc - Action description.
   * @param {string} [status='SUCCESS'] - Status string ('SUCCESS', 'WARNING', 'ERROR', 'FAILED').
   */
  function logEvent(event, desc, status = "SUCCESS") {
    const cleanEvent = String(event || "EVENT").trim();
    const cleanDesc = sanitizeLogText(desc || "");
    const cleanStatus = String(status || "SUCCESS").toUpperCase().trim();
    const now = new Date();

    systemLogs.unshift({
      time: formatLogTimestamp(now),
      iso: now.toISOString(),
      event: cleanEvent,
      desc: cleanDesc,
      status: cleanStatus
    });

    saveLogsToStorage();
    renderLogsTable();

    if (typeof onActivityFeedHook === "function") {
      onActivityFeedHook([...systemLogs]);
    } else if (window.AdminDashboard && typeof window.AdminDashboard.renderActivityFeed === "function") {
      window.AdminDashboard.renderActivityFeed([...systemLogs]);
    }
  }

  /**
   * Returns a copy of the current audit logs array.
   * @returns {Array} Logs array.
   */
  function getLogs() {
    return [...systemLogs];
  }

  /**
   * Overwrites the system logs array (used for backup restore operations).
   * @param {Array} newLogs - Restored logs array.
   */
  function setLogs(newLogs) {
    if (Array.isArray(newLogs)) {
      systemLogs.length = 0;
      newLogs.forEach(l => {
        if (l && typeof l === "object") {
          systemLogs.push({
            time: formatLogTimestamp(l.time || l.iso),
            iso: l.iso || new Date().toISOString(),
            event: String(l.event || "RESTORED_EVENT"),
            desc: sanitizeLogText(l.desc || ""),
            status: String(l.status || "SUCCESS")
          });
        }
      });
      saveLogsToStorage();
      renderLogsTable();
      if (typeof onActivityFeedHook === "function") {
        onActivityFeedHook([...systemLogs]);
      } else if (window.AdminDashboard && typeof window.AdminDashboard.renderActivityFeed === "function") {
        window.AdminDashboard.renderActivityFeed([...systemLogs]);
      }
    }
  }

  /* ============================================================
     6. TABLE RENDERING & FILTERING
     ============================================================ */
  function filterLogs(logs, category, search) {
    const cat = String(category || "ALL").toUpperCase();
    const q = String(search || "").toLowerCase().trim();

    return logs.filter(item => {
      // Category match
      if (cat !== "ALL") {
        const itemCat = getCategoryFromEvent(item.event);
        if (itemCat !== cat) return false;
      }
      // Search match
      if (q) {
        const ev = String(item.event || "").toLowerCase();
        const desc = String(item.desc || "").toLowerCase();
        const time = String(item.time || "").toLowerCase();
        if (!ev.includes(q) && !desc.includes(q) && !time.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Renders the System Audit Logs table into #logs-tbody.
   * @param {Array} [logsOverride] - Optional override dataset.
   */
  function renderLogsTable(logsOverride) {
    const tbody = document.getElementById(SELECTORS.tbody);
    if (!tbody) return;

    const sourceData = Array.isArray(logsOverride) ? logsOverride : systemLogs;
    const filtered = filterLogs(sourceData, activeFilter.category, activeFilter.search);

    const countBadge = document.getElementById(SELECTORS.countBadge);
    if (countBadge) {
      countBadge.textContent = `${filtered.length} of ${sourceData.length} entries`;
    }

    tbody.innerHTML = "";

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;color:var(--text-muted);padding:36px;">
            ${sourceData.length === 0 ? "No audit logs recorded yet. ✨" : "No logs match your search/filter criteria. 🔍"}
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(log => {
      const tr = document.createElement("tr");
      const statusUpper = (log.status || "SUCCESS").toUpperCase();

      let statusColor = "#2ecc71";
      if (statusUpper === "ERROR" || statusUpper === "FAILED") statusColor = "#ef4444";
      if (statusUpper === "WARNING" || statusUpper === "WARN") statusColor = "#f59e0b";

      const category = getCategoryFromEvent(log.event);
      const catClass = `status-badge ${category.toLowerCase()}`;
      const formattedTimestamp = formatLogTimestamp(log.time || log.iso);

      tr.innerHTML = `
        <td style="color:var(--text-dim);font-size:0.8rem;white-space:nowrap;font-family:monospace,sans-serif;letter-spacing:0.3px;">${escapeHtml(formattedTimestamp)}</td>
        <td><span class="${catClass}" style="font-size:0.75rem;padding:3px 8px;border-radius:6px;font-weight:600;">${escapeHtml(log.event || "EVENT")}</span></td>
        <td style="font-size:0.85rem;color:#e2e8f0;line-height:1.45;">${escapeHtml(log.desc || "")}</td>
        <td style="white-space:nowrap;text-align:center;"><strong style="color:${statusColor};font-size:0.8rem;">${escapeHtml(statusUpper)}</strong></td>
      `;
      tbody.appendChild(tr);
    });
  }

  /* ============================================================
     7. LOG EXPORTING & CLEARING
     ============================================================ */
  /**
   * Exports audit logs as a downloadable CSV file.
   */
  function exportLogsCSV() {
    if (systemLogs.length === 0) {
      if (typeof showToast === "function") showToast("No audit logs to export ℹ️");
      return;
    }

    const headers = ["Timestamp", "Category", "Event", "Description", "Status"];
    const rows = systemLogs.map(l => [
      `"${String(formatLogTimestamp(l.time || l.iso)).replace(/"/g, '""')}"`,
      `"${getCategoryFromEvent(l.event)}"`,
      `"${String(l.event || "").replace(/"/g, '""')}"`,
      `"${String(l.desc || "").replace(/"/g, '""')}"`,
      `"${String(l.status || "SUCCESS").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dlUrl;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);

    if (typeof showToast === "function") showToast("📥 Audit Logs CSV Exported! ✨");
  }

  /**
   * Exports audit logs as a downloadable JSON file.
   */
  function exportLogsJSON() {
    if (systemLogs.length === 0) {
      if (typeof showToast === "function") showToast("No audit logs to export ℹ️");
      return;
    }

    const exportData = systemLogs.map(l => ({
      time: formatLogTimestamp(l.time || l.iso),
      iso: l.iso || (typeof l.time === "string" ? l.time : new Date().toISOString()),
      category: getCategoryFromEvent(l.event),
      event: l.event,
      desc: l.desc,
      status: l.status
    }));

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dlUrl;
    a.download = `audit-logs-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);

    if (typeof showToast === "function") showToast("📥 Audit Logs JSON Exported! ✨");
  }

  /**
   * Clears audit logs with user confirmation.
   */
  function clearLogs() {
    const confirmed = typeof window.confirm === "function"
      ? window.confirm("⚠️ Are you sure you want to clear all system audit logs? This action cannot be undone.")
      : true;

    if (!confirmed) return;

    systemLogs.length = 0;
    saveLogsToStorage();
    renderLogsTable();

    if (typeof onActivityFeedHook === "function") {
      onActivityFeedHook([]);
    } else if (window.AdminDashboard && typeof window.AdminDashboard.renderActivityFeed === "function") {
      window.AdminDashboard.renderActivityFeed([]);
    }

    if (typeof showToast === "function") {
      showToast("Audit logs cleared 🗑️");
    }
  }

  /* ============================================================
     8. INITIALIZATION
     ============================================================ */
  /**
   * Initializes the Logs module, binds UI toolbar listeners, and registers activity feed hook.
   * @param {Function} [activityFeedCallback] - Callback triggered when logs mutate.
   */
  function init(activityFeedCallback) {
    if (typeof activityFeedCallback === "function") {
      onActivityFeedHook = activityFeedCallback;
    }

    const clearBtn = document.getElementById(SELECTORS.clearBtn);
    if (clearBtn && !clearBtn.__logsBound) {
      clearBtn.__logsBound = true;
      clearBtn.addEventListener("click", clearLogs);
    }

    const exportCsvBtn = document.getElementById(SELECTORS.exportCsvBtn);
    if (exportCsvBtn && !exportCsvBtn.__logsBound) {
      exportCsvBtn.__logsBound = true;
      exportCsvBtn.addEventListener("click", exportLogsCSV);
    }

    const exportJsonBtn = document.getElementById(SELECTORS.exportJsonBtn);
    if (exportJsonBtn && !exportJsonBtn.__logsBound) {
      exportJsonBtn.__logsBound = true;
      exportJsonBtn.addEventListener("click", exportLogsJSON);
    }

    const searchInput = document.getElementById(SELECTORS.searchInput);
    if (searchInput && !searchInput.__logsBound) {
      searchInput.__logsBound = true;
      searchInput.addEventListener("input", () => {
        activeFilter.search = searchInput.value;
        renderLogsTable();
      });
    }

    const categoryFilter = document.getElementById(SELECTORS.categoryFilter);
    if (categoryFilter && !categoryFilter.__logsBound) {
      categoryFilter.__logsBound = true;
      categoryFilter.addEventListener("change", () => {
        activeFilter.category = categoryFilter.value;
        renderLogsTable();
      });
    }

    renderLogsTable();
  }

  /* ============================================================
     9. AUTHORITATIVE PUBLIC API
     ============================================================ */
  window.AdminLogs = Object.freeze({
    init,
    log: logEvent,
    render: renderLogsTable,
    getLogs,
    setLogs,
    clearLogs,
    exportLogsCSV,
    exportLogsJSON,
    sanitizeLogText,
    getCategoryFromEvent,
    formatLogTimestamp
  });

})(window);
