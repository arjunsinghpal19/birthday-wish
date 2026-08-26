/**
 * ============================================================================
 * ADMIN STUDIO BACKUP MODULE (js/admin/admin-backup.js)
 * Manages Full System Backup JSON Export and Safe Restore/Import Operations.
 * ============================================================================
 */

(function (window) {
  "use strict";

  // Reusable core utilities
  const { showToast } = window.AdminCore || {};

  /* ============================================================
     1. CONSTANTS & SELECTORS
     ============================================================ */
  const SELECTORS = {
    exportBtn: "btn-export-backup",
    importInput: "import-backup-file"
  };

  const BACKUP_VERSION = "2.5";
  const APP_IDENTIFIER = "Birthday Surprise Wish Studio";

  /* ============================================================
     2. HELPER UTILITIES
     ============================================================ */
  function deepClone(obj) {
    if (!obj) return obj;
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return obj;
    }
  }

  const FORBIDDEN_CRED_KEYS = [
    "admin_master_password",
    "admin_password_hash",
    "admin_password_salt",
    "admin_session_token",
    "admin_recovery_code",
    "admin_recovery_email",
    "security_answer_hash",
    "security_answer_salt",
    "custom_secret_answer",
    "pass_code"
  ];

  /**
   * Validates a parsed backup payload structure.
   * @param {Object} data - Parsed JSON object.
   * @returns {{ valid: boolean, error?: string, summary?: Object }}
   */
  function validateBackupPayload(data) {
    if (!data || typeof data !== "object") {
      return { valid: false, error: "Backup file is empty or not a valid JSON object." };
    }

    if (!Array.isArray(data.wishes)) {
      return { valid: false, error: "Missing or invalid 'wishes' array in backup payload." };
    }

    // Security Gate: Strip any root or settings level credential injection attempts
    FORBIDDEN_CRED_KEYS.forEach(key => {
      if (data[key] !== undefined) delete data[key];
      if (data.settings && data.settings[key] !== undefined) delete data.settings[key];
    });

    // Check for duplicate IDs inside wishes array and disallow system row 00000000-0000-0000-0000-000000000001
    const seenIds = new Set();
    let duplicateCount = 0;
    const sanitizedWishes = [];

    for (const w of data.wishes) {
      if (w && w.id) {
        // Disallow system config row injection
        if (w.id === "00000000-0000-0000-0000-000000000001") continue;

        // Strip credential keys from wish objects
        FORBIDDEN_CRED_KEYS.forEach(key => {
          if (w[key] !== undefined) delete w[key];
        });

        if (seenIds.has(w.id)) {
          duplicateCount++;
        } else {
          seenIds.add(w.id);
        }
        sanitizedWishes.push(w);
      }
    }
    data.wishes = sanitizedWishes;

    const totalWishes = data.wishes.length;
    const totalLogs = Array.isArray(data.logs) ? data.logs.length : 0;
    const hasSettings = Boolean(data.settings && typeof data.settings === "object");

    return {
      valid: true,
      summary: {
        totalWishes,
        totalLogs,
        hasSettings,
        duplicateCount,
        version: data.version || "legacy",
        exportDate: data.export_date || data.exportDate || "unknown"
      }
    };
  }

  /* ============================================================
     3. BACKUP EXPORT LOGIC
     ============================================================ */
  /**
   * Generates and downloads a structured JSON file containing active wishes, logs, and settings.
   * @param {Array} wishes - Wishes array to back up.
   * @param {Array} logs - System audit logs array to back up.
   * @param {Object} [settings] - Optional global settings object.
   * @param {Function} [onEventCallback] - Action logger callback.
   */
  function exportBackup(wishes = [], logs = [], settings = null, onEventCallback) {
    const activeTheme = (window.ThemeRegistry && typeof window.ThemeRegistry.getActiveDefaultThemeId === "function")
      ? window.ThemeRegistry.getActiveDefaultThemeId()
      : (window.AdminThemes && typeof window.AdminThemes.getActiveDefaultThemeId === "function")
        ? window.AdminThemes.getActiveDefaultThemeId()
        : "default";

    // Deep clone and strictly sanitize any credential keys from exported wishes
    const rawWishes = Array.isArray(wishes) ? deepClone(wishes) : [];
    const cleanWishes = rawWishes
      .filter(w => w && w.id !== "00000000-0000-0000-0000-000000000001")
      .map(w => {
        FORBIDDEN_CRED_KEYS.forEach(k => { if (w[k] !== undefined) delete w[k]; });
        return w;
      });

    const cleanLogs = Array.isArray(logs) ? deepClone(logs) : [];
    const cleanSettings = settings && typeof settings === "object" ? deepClone(settings) : null;
    if (cleanSettings) {
      FORBIDDEN_CRED_KEYS.forEach(k => { if (cleanSettings[k] !== undefined) delete cleanSettings[k]; });
    }

    const backupData = {
      app: APP_IDENTIFIER,
      version: BACKUP_VERSION,
      export_date: new Date().toISOString(),
      summary: {
        totalWishes: cleanWishes.length,
        totalLogs: cleanLogs.length,
        hasSettings: Boolean(cleanSettings),
        activeDefaultTheme: activeTheme
      },
      wishes: cleanWishes,
      logs: cleanLogs,
      settings: cleanSettings
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const a = document.createElement("a");
    const dlUrl = URL.createObjectURL(blob);
    a.href = dlUrl;
    a.download = `birthday-suite-backup-v${BACKUP_VERSION}-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);

    if (typeof onEventCallback === "function") {
      onEventCallback("BACKUP_EXPORT", `Exported backup with ${cleanWishes.length} wishes and ${cleanLogs.length} audit logs`);
    }
    if (typeof showToast === "function") {
      showToast(`💾 Backup JSON Exported (${cleanWishes.length} wishes)! 📥`);
    }
  }

  /* ============================================================
     4. BACKUP IMPORT & RESTORE LOGIC
     ============================================================ */
  /**
   * Parses and validates uploaded backup JSON file, restoring wishes, logs, and settings.
   * @param {File} file - Selected JSON file.
   * @param {Function} onRestoreCallback - Callback invoked with (wishes, logs, settings) on success.
   * @param {Function} [onEventCallback] - Action logger callback.
   */
  function importBackup(file, onRestoreCallback, onEventCallback) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
      if (typeof showToast === "function") {
        showToast("Please select a valid .json backup file ❌");
      }
      return;
    }

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const rawContent = evt.target.result;
        const data = JSON.parse(rawContent);

        const validation = validateBackupPayload(data);
        if (!validation.valid) {
          if (typeof showToast === "function") {
            showToast(`Invalid Backup File: ${validation.error} ❌`);
          }
          if (typeof onEventCallback === "function") {
            onEventCallback("BACKUP_IMPORT_FAILED", validation.error || "Validation failed", "ERROR");
          }
          return;
        }

        const { totalWishes, totalLogs, hasSettings, duplicateCount, version } = validation.summary;

        // Explicit Confirmation Guard
        const confirmMsg = `⚠️ RESTORE BACKUP CONFIRMATION:\n\n` +
          `• Backup Version: ${version}\n` +
          `• Wishes to Restore: ${totalWishes}\n` +
          `• Audit Logs: ${totalLogs}\n` +
          `• Settings: ${hasSettings ? "Included" : "None"}\n` +
          (duplicateCount > 0 ? `• ⚠️ Note: ${duplicateCount} duplicate ID(s) detected\n` : "") +
          `\nAre you sure you want to restore this backup into your current session?`;

        const confirmed = typeof window.confirm === "function" ? window.confirm(confirmMsg) : true;
        if (!confirmed) {
          if (typeof showToast === "function") {
            showToast("Backup restore cancelled ℹ️");
          }
          return;
        }

        if (typeof onRestoreCallback === "function") {
          onRestoreCallback(data.wishes, data.logs || [], data.settings || null);
        }

        if (typeof onEventCallback === "function") {
          onEventCallback("BACKUP_IMPORT", `Restored ${totalWishes} wishes and ${totalLogs} logs from backup (v${version})`);
        }

        if (typeof showToast === "function") {
          showToast(`📥 Successfully Restored ${totalWishes} Wishes from Backup! 🎉`);
        }
      } catch (err) {
        console.warn("⚠️ Backup parse error:", err);
        if (typeof showToast === "function") {
          showToast("Failed to parse Backup JSON file (Malformed format) ❌");
        }
        if (typeof onEventCallback === "function") {
          onEventCallback("BACKUP_IMPORT_FAILED", err.message || "Parse error", "ERROR");
        }
      }
    };

    reader.onerror = () => {
      if (typeof showToast === "function") {
        showToast("Error reading selected file ❌");
      }
    };

    reader.readAsText(file);
  }

  /* ============================================================
     5. EVENT HANDLERS & INITIALIZATION
     ============================================================ */
  /**
   * Initializes backup export and import event listeners.
   * @param {Function} getBackupData - Function returning { wishes, logs, settings }.
   * @param {Function} onRestoreCallback - Function invoked on successful restore (wishes, logs, settings).
   * @param {Function} [onEventCallback] - Action logger callback.
   */
  function init(getBackupData, onRestoreCallback, onEventCallback) {
    const exportBtn = document.getElementById(SELECTORS.exportBtn);
    if (exportBtn && !exportBtn.__backupBound) {
      exportBtn.__backupBound = true;
      exportBtn.addEventListener("click", () => {
        const { wishes = [], logs = [], settings = null } = (typeof getBackupData === "function" ? getBackupData() : {});
        exportBackup(wishes, logs, settings, onEventCallback);
      });
    }

    const importInput = document.getElementById(SELECTORS.importInput);
    if (importInput && !importInput.__backupBound) {
      importInput.__backupBound = true;
      importInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          importBackup(file, onRestoreCallback, onEventCallback);
          importInput.value = "";
        }
      });
    }
  }

  /* ============================================================
     6. AUTHORITATIVE PUBLIC API
     ============================================================ */
  window.AdminBackup = Object.freeze({
    init,
    exportBackup,
    importBackup,
    validateBackupPayload
  });

})(window);
