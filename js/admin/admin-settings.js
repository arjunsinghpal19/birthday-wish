/**
 * ============================================================================
 * ADMIN STUDIO SETTINGS MODULE (js/admin/admin-settings.js)
 * Manages Global Admin Site Preferences, UI Customization, Table Densities,
 * Pagination, and Auto-Refresh Policies with localStorage Persistence.
 * ============================================================================
 */

(function (window) {
  "use strict";

  // Reusable core utilities
  const { showToast } = window.AdminCore || {};

  /* ============================================================
     1. CONSTANTS & SELECTORS
     ============================================================ */
  const STORAGE_KEY = "bw_admin_global_settings";

  const DEFAULT_ADMIN_SETTINGS = Object.freeze({
    siteName: "Birthday Surprise Wish Generator",
    shareBaseUrl: "https://birthday-wish-arjun.vercel.app/",
    defaultMusic: "assets/music/happy-birthday-song.mpeg",
    defaultPageSize: 10,
    tableDensity: "standard", // "standard" | "compact" | "spacious"
    confirmBeforeDelete: true,
    maxLogsRetained: 100,
    autoRefreshInterval: 0 // 0 = Off, 30 = 30s, 60 = 60s
  });

  const SELECTORS = {
    siteName: "set-site-name",
    shareUrl: "set-share-url",
    defaultMusic: "set-default-music",
    pageSize: "set-page-size",
    tableDensity: "set-table-density",
    confirmDelete: "set-confirm-delete",
    maxLogs: "set-max-logs",
    refreshInterval: "set-refresh-interval",
    saveBtn: "btn-save-settings",
    resetBtn: "btn-reset-settings"
  };

  /* ============================================================
     2. MODULE STATE & PERSISTENCE
     ============================================================ */
  let settingsState = loadSettingsFromStorage();
  let onSettingsChangeHook = null;
  let autoRefreshTimer = null;

  function deepClone(obj) {
    if (!obj) return obj;
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return obj;
    }
  }

  /**
   * Loads settings from localStorage merged with defaults.
   * @returns {Object} Settings object.
   */
  function loadSettingsFromStorage() {
    try {
      if (typeof window.localStorage !== "undefined") {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            return Object.assign({}, DEFAULT_ADMIN_SETTINGS, parsed);
          }
        }
      }
    } catch (e) {
      console.warn("⚠️ Failed to load settings from storage:", e);
    }
    return Object.assign({}, DEFAULT_ADMIN_SETTINGS);
  }

  /**
   * Persists settings state to localStorage.
   */
  function saveSettingsToStorage() {
    try {
      if (typeof window.localStorage !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsState));
      }
    } catch (e) {
      console.warn("⚠️ Failed to save settings to storage:", e);
    }
  }

  /* ============================================================
     3. SETTINGS GETTERS & SETTERS
     ============================================================ */
  /**
   * Returns a copy of the current global settings.
   * @returns {Object} Settings object.
   */
  function getSettings() {
    return deepClone(settingsState);
  }

  /**
   * Retrieves a specific setting value.
   * @param {string} key - Setting key.
   * @returns {*} Value.
   */
  function getSetting(key) {
    return settingsState[key] !== undefined ? settingsState[key] : DEFAULT_ADMIN_SETTINGS[key];
  }

  /**
   * Validates and updates settings.
   * @param {Object} newSettings - Partial or full settings object.
   * @param {boolean} [silent=false] - If true, skips toast and event logger.
   */
  function saveSettings(newSettings, silent = false) {
    if (!newSettings || typeof newSettings !== "object") return;

    // Validation & Normalization
    const validPageSizes = [10, 25, 50];
    const validDensities = ["standard", "compact", "spacious"];
    const validIntervals = [0, 30, 60];

    const pageSizeNum = parseInt(newSettings.defaultPageSize, 10);
    const refreshNum = parseInt(newSettings.autoRefreshInterval, 10);
    const maxLogsNum = parseInt(newSettings.maxLogsRetained, 10);

    const merged = Object.assign({}, settingsState, {
      siteName: String(newSettings.siteName || DEFAULT_ADMIN_SETTINGS.siteName).trim(),
      shareBaseUrl: String(newSettings.shareBaseUrl || DEFAULT_ADMIN_SETTINGS.shareBaseUrl).trim(),
      defaultMusic: String(newSettings.defaultMusic || DEFAULT_ADMIN_SETTINGS.defaultMusic).trim(),
      defaultPageSize: validPageSizes.includes(pageSizeNum) ? pageSizeNum : DEFAULT_ADMIN_SETTINGS.defaultPageSize,
      tableDensity: validDensities.includes(newSettings.tableDensity) ? newSettings.tableDensity : DEFAULT_ADMIN_SETTINGS.tableDensity,
      confirmBeforeDelete: typeof newSettings.confirmBeforeDelete === "boolean" ? newSettings.confirmBeforeDelete : Boolean(newSettings.confirmBeforeDelete),
      maxLogsRetained: !isNaN(maxLogsNum) && maxLogsNum >= 20 ? maxLogsNum : DEFAULT_ADMIN_SETTINGS.maxLogsRetained,
      autoRefreshInterval: validIntervals.includes(refreshNum) ? refreshNum : DEFAULT_ADMIN_SETTINGS.autoRefreshInterval
    });

    settingsState = merged;
    saveSettingsToStorage();
    setupAutoRefreshTimer();

    if (typeof onSettingsChangeHook === "function") {
      onSettingsChangeHook(deepClone(settingsState));
    }

    if (!silent) {
      if (window.AdminLogs && typeof window.AdminLogs.log === "function") {
        window.AdminLogs.log("SETTINGS_SAVED", `Updated global site settings (Page size: ${settingsState.defaultPageSize}, Density: ${settingsState.tableDensity})`);
      }
      if (typeof showToast === "function") {
        showToast("Global Site Settings Saved! ⚙️✨");
      }
    }
  }

  /**
   * Resets all settings to canonical defaults with user confirmation.
   */
  function resetSettings() {
    const confirmed = typeof window.confirm === "function"
      ? window.confirm("⚠️ Reset all site settings to defaults? This will not affect existing wishes, themes, or security credentials.")
      : true;

    if (!confirmed) return;

    settingsState = Object.assign({}, DEFAULT_ADMIN_SETTINGS);
    saveSettingsToStorage();
    populateSettingsForm();
    setupAutoRefreshTimer();

    if (typeof onSettingsChangeHook === "function") {
      onSettingsChangeHook(deepClone(settingsState));
    }

    if (window.AdminLogs && typeof window.AdminLogs.log === "function") {
      window.AdminLogs.log("SETTINGS_RESET", "Restored global site settings to canonical defaults");
    }

    if (typeof showToast === "function") {
      showToast("Restored Settings to Defaults ↺");
    }
  }

  /* ============================================================
     4. AUTO-REFRESH COORDINATOR
     ============================================================ */
  function setupAutoRefreshTimer() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }

    const intervalSec = settingsState.autoRefreshInterval;
    if (intervalSec > 0 && typeof window.setInterval === "function") {
      autoRefreshTimer = setInterval(() => {
        // Trigger dashboard reload if on Dashboard or Wishes view
        const activeTab = document.querySelector(".admin-tab-btn.active")?.dataset?.tab;
        if (activeTab === "dashboard" || activeTab === "wishes") {
          if (window.AdminDashboard && typeof window.AdminDashboard.fetchWishes === "function") {
            window.AdminDashboard.fetchWishes();
          }
        }
      }, intervalSec * 1000);
    }
  }

  /* ============================================================
     5. FORM POPULATION & UI BINDING
     ============================================================ */
  function populateSettingsForm() {
    const siteNameEl = document.getElementById(SELECTORS.siteName);
    const shareUrlEl = document.getElementById(SELECTORS.shareUrl);
    const defaultMusicEl = document.getElementById(SELECTORS.defaultMusic);
    const pageSizeEl = document.getElementById(SELECTORS.pageSize);
    const tableDensityEl = document.getElementById(SELECTORS.tableDensity);
    const confirmDeleteEl = document.getElementById(SELECTORS.confirmDelete);
    const maxLogsEl = document.getElementById(SELECTORS.maxLogs);
    const refreshIntervalEl = document.getElementById(SELECTORS.refreshInterval);

    if (siteNameEl) siteNameEl.value = settingsState.siteName;
    if (shareUrlEl) shareUrlEl.value = settingsState.shareBaseUrl;
    if (defaultMusicEl) defaultMusicEl.value = settingsState.defaultMusic;
    if (pageSizeEl) pageSizeEl.value = String(settingsState.defaultPageSize);
    if (tableDensityEl) tableDensityEl.value = settingsState.tableDensity;
    if (confirmDeleteEl) confirmDeleteEl.checked = Boolean(settingsState.confirmBeforeDelete);
    if (maxLogsEl) maxLogsEl.value = String(settingsState.maxLogsRetained);
    if (refreshIntervalEl) refreshIntervalEl.value = String(settingsState.autoRefreshInterval);
  }

  function readSettingsFromForm() {
    const siteNameEl = document.getElementById(SELECTORS.siteName);
    const shareUrlEl = document.getElementById(SELECTORS.shareUrl);
    const defaultMusicEl = document.getElementById(SELECTORS.defaultMusic);
    const pageSizeEl = document.getElementById(SELECTORS.pageSize);
    const tableDensityEl = document.getElementById(SELECTORS.tableDensity);
    const confirmDeleteEl = document.getElementById(SELECTORS.confirmDelete);
    const maxLogsEl = document.getElementById(SELECTORS.maxLogs);
    const refreshIntervalEl = document.getElementById(SELECTORS.refreshInterval);

    return {
      siteName: siteNameEl ? siteNameEl.value : settingsState.siteName,
      shareBaseUrl: shareUrlEl ? shareUrlEl.value : settingsState.shareBaseUrl,
      defaultMusic: defaultMusicEl ? defaultMusicEl.value : settingsState.defaultMusic,
      defaultPageSize: pageSizeEl ? pageSizeEl.value : settingsState.defaultPageSize,
      tableDensity: tableDensityEl ? tableDensityEl.value : settingsState.tableDensity,
      confirmBeforeDelete: confirmDeleteEl ? confirmDeleteEl.checked : settingsState.confirmBeforeDelete,
      maxLogsRetained: maxLogsEl ? maxLogsEl.value : settingsState.maxLogsRetained,
      autoRefreshInterval: refreshIntervalEl ? refreshIntervalEl.value : settingsState.autoRefreshInterval
    };
  }

  /* ============================================================
     6. INITIALIZATION
     ============================================================ */
  /**
   * Initializes the Settings module and binds form actions.
   * @param {Function} [onSettingsChangeCallback] - Callback when settings update.
   */
  function init(onSettingsChangeCallback) {
    if (typeof onSettingsChangeCallback === "function") {
      onSettingsChangeHook = onSettingsChangeCallback;
    }

    populateSettingsForm();
    setupAutoRefreshTimer();

    const saveBtn = document.getElementById(SELECTORS.saveBtn);
    if (saveBtn && !saveBtn.__settingsBound) {
      saveBtn.__settingsBound = true;
      saveBtn.addEventListener("click", () => {
        const currentFormData = readSettingsFromForm();
        saveSettings(currentFormData, false);
      });
    }

    const resetBtn = document.getElementById(SELECTORS.resetBtn);
    if (resetBtn && !resetBtn.__settingsBound) {
      resetBtn.__settingsBound = true;
      resetBtn.addEventListener("click", resetSettings);
    }
  }

  /* ============================================================
     7. AUTHORITATIVE PUBLIC API
     ============================================================ */
  window.AdminSettings = Object.freeze({
    init,
    getSettings,
    getSetting,
    saveSettings,
    resetSettings,
    populateForm: populateSettingsForm,
    DEFAULT_SETTINGS: DEFAULT_ADMIN_SETTINGS
  });

})(window);
