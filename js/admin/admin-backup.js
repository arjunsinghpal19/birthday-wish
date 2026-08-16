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

  /* ============================================================
     2. BACKUP EXPORT LOGIC
     ============================================================ */
  /**
   * Generates and downloads a structured JSON file containing active wishes and system logs.
   * @param {Array} wishes - Wishes array to back up.
   * @param {Array} logs - System audit logs array to back up.
   * @param {Function} [onEventCallback] - Action logger callback.
   */
  function exportBackup(wishes = [], logs = [], onEventCallback) {
    const backupData = {
      export_date: new Date().toISOString(),
      version: "2.5",
      wishes: Array.isArray(wishes) ? wishes : [],
      logs: Array.isArray(logs) ? logs : []
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const a = document.createElement("a");
    const dlUrl = URL.createObjectURL(blob);
    a.href = dlUrl;
    a.download = `birthday-suite-backup-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);

    if (typeof onEventCallback === "function") {
      onEventCallback("BACKUP_EXPORT", "Exported JSON backup file");
    }
    if (typeof showToast === "function") {
      showToast("💾 Backup JSON File Exported! 📥");
    }
  }

  /* ============================================================
     3. BACKUP IMPORT & RESTORE LOGIC
     ============================================================ */
  /**
   * Parses and validates uploaded backup JSON file, restoring wishes and logs.
   * @param {File} file - Selected JSON file.
   * @param {Function} onRestoreCallback - Callback invoked with { wishes, logs } on success.
   * @param {Function} [onEventCallback] - Action logger callback.
   */
  function importBackup(file, onRestoreCallback, onEventCallback) {
    if (!file) return;
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data && data.wishes && Array.isArray(data.wishes)) {
          if (typeof onRestoreCallback === "function") {
            onRestoreCallback(data.wishes, data.logs || []);
          }
          if (typeof onEventCallback === "function") {
            onEventCallback("BACKUP_IMPORT", `Restored ${data.wishes.length} wishes from JSON backup`);
          }
          if (typeof showToast === "function") {
            showToast(`📥 Successfully Restored ${data.wishes.length} Wishes from Backup! 🎉`);
          }
        } else {
          if (typeof showToast === "function") {
            showToast("Invalid Backup JSON structure ❌");
          }
        }
      } catch (err) {
        if (typeof showToast === "function") {
          showToast("Invalid Backup JSON file ❌");
        }
      }
    };

    reader.readAsText(file);
  }

  /* ============================================================
     4. EVENT HANDLERS & INITIALIZATION
     ============================================================ */
  /**
   * Initializes backup export and import event listeners.
   * @param {Function} getBackupData - Function returning { wishes, logs }.
   * @param {Function} onRestoreCallback - Function invoked on successful restore.
   * @param {Function} [onEventCallback] - Action logger callback.
   */
  function init(getBackupData, onRestoreCallback, onEventCallback) {
    const exportBtn = document.getElementById(SELECTORS.exportBtn);
    if (exportBtn && !exportBtn.__backupBound) {
      exportBtn.__backupBound = true;
      exportBtn.addEventListener("click", () => {
        const { wishes = [], logs = [] } = (typeof getBackupData === "function" ? getBackupData() : {});
        exportBackup(wishes, logs, onEventCallback);
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
     5. AUTHORITATIVE PUBLIC API
     ============================================================ */
  window.AdminBackup = Object.freeze({
    init,
    exportBackup,
    importBackup
  });

})(window);
