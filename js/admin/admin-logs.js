/**
 * ============================================================================
 * ADMIN STUDIO LOGS MODULE (js/admin/admin-logs.js)
 * Manages System Audit Logs array, action tracking, logs table rendering,
 * and live dashboard activity feed synchronization.
 * ============================================================================
 */

(function (window) {
  "use strict";

  /* ============================================================
     1. CONSTANTS & SELECTORS
     ============================================================ */
  const SELECTORS = {
    tbody: "logs-tbody"
  };

  /* ============================================================
     2. MODULE STATE
     ============================================================ */
  const systemLogs = [
    { time: new Date().toLocaleString(), event: "ADMIN_LOGIN", desc: "Admin session authenticated successfully", status: "SUCCESS" }
  ];
  let onActivityFeedHook = null;

  /* ============================================================
     3. LOG RECORDING & SYNCHRONIZATION
     ============================================================ */
  /**
   * Records a new system audit log entry and updates the table/activity feed.
   * @param {string} event - Action tag (e.g. 'PASSWORD_CHANGED', 'MEDIA_DELETE').
   * @param {string} desc - Action description.
   * @param {string} [status='SUCCESS'] - Status string.
   */
  function logEvent(event, desc, status = "SUCCESS") {
    systemLogs.unshift({
      time: new Date().toLocaleString(),
      event: String(event || "EVENT"),
      desc: String(desc || ""),
      status: String(status || "SUCCESS")
    });

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
      newLogs.forEach(l => systemLogs.push(l));
      renderLogsTable();
      if (typeof onActivityFeedHook === "function") {
        onActivityFeedHook([...systemLogs]);
      } else if (window.AdminDashboard && typeof window.AdminDashboard.renderActivityFeed === "function") {
        window.AdminDashboard.renderActivityFeed([...systemLogs]);
      }
    }
  }

  /* ============================================================
     4. TABLE RENDERING
     ============================================================ */
  /**
   * Renders the System Audit Logs table into #logs-tbody.
   * @param {Array} [logs] - Optional override dataset.
   */
  function renderLogsTable(logs) {
    const tbody = document.getElementById(SELECTORS.tbody);
    if (!tbody) return;

    const data = Array.isArray(logs) ? logs : systemLogs;

    tbody.innerHTML = "";

    if (data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;color:var(--text-muted);padding:32px;">
            No audit logs recorded in this session. ✨
          </td>
        </tr>
      `;
      return;
    }

    data.forEach(log => {
      const tr = document.createElement("tr");
      const statusColor = log.status === "ERROR" || log.status === "FAILED" ? "#ef4444" : "#2ecc71";

      tr.innerHTML = `
        <td style="color:var(--text-dim);font-size:0.8rem;">${log.time || "Recent"}</td>
        <td><span class="status-badge active">${log.event || "EVENT"}</span></td>
        <td>${log.desc || ""}</td>
        <td><strong style="color:${statusColor};">${log.status || "SUCCESS"}</strong></td>
      `;
      tbody.appendChild(tr);
    });
  }

  /* ============================================================
     5. INITIALIZATION
     ============================================================ */
  /**
   * Initializes the Logs module and registers optional activity feed hook.
   * @param {Function} [activityFeedCallback] - Callback triggered when logs mutate.
   */
  function init(activityFeedCallback) {
    if (typeof activityFeedCallback === "function") {
      onActivityFeedHook = activityFeedCallback;
    }
    renderLogsTable();
  }

  /* ============================================================
     6. AUTHORITATIVE PUBLIC API
     ============================================================ */
  window.AdminLogs = Object.freeze({
    init,
    log: logEvent,
    render: renderLogsTable,
    getLogs,
    setLogs
  });

})(window);
