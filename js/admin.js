/**
 * ============================================================================
 * ADMIN DASHBOARD ENGINE (js/admin.js)
 * Thin Orchestration & Lifecycle Coordinator for Admin Studio subsystems:
 * Core, Navigation, Dashboard, Wishes, Media, Security, Backup, and Logs.
 * ============================================================================
 */

(function (window) {
  "use strict";

  // Authoritative Modular Subsystems (Phase 28B-9 Modular Architecture)
  const { showToast, formatBytes, copyWishUrl } = window.AdminCore || {};
  const { checkAdminAccessGate, initTabNavigation, initLogout } = window.AdminNavigation || {};
  const { init: initDashboard, renderKPIs, renderRecentWishes, renderActivityFeed, renderStorageBreakdown, fetchWishes } = window.AdminDashboard || {};
  const { init: initWishes, render: renderWishesTable, setWishes: setWishesState, getWishes: getWishesState, deleteWish: deleteWishItem, duplicateWish: duplicateWishItem } = window.AdminWishes || {};
  const { init: initCustomers, render: renderCustomersTable } = window.AdminCustomers || {};
  const { init: initWishEditor } = window.AdminWishEditor || {};
  const { init: initMedia, load: loadStorageMediaData, render: renderDamGrid, getFiles: getStorageFiles } = window.AdminMedia || {};
  const { init: initSecurityHandlers } = window.AdminSecurity || {};
  const { init: initBackupHandlers, exportBackup, importBackup } = window.AdminBackup || {};
  const { init: initLogs, log: logEvent, render: renderLogsTable, getLogs, setLogs } = window.AdminLogs || {};
  const { init: initSettings, getSettings } = window.AdminSettings || {};

  // Cached in-memory active wishes list
  let wishesList = [];

  /**
   * Coordinates live data loading from Supabase Database and Storage across all views.
   * Ensures Storage metadata is fully loaded before KPI metrics are rendered.
   */
  async function loadDashboardData() {
    let querySuccess = true;

    // 1. Fetch live wishes from Supabase DB
    if (typeof fetchWishes === "function") {
      const res = await fetchWishes();
      if (res && res.success) {
        wishesList = res.data || [];
      } else {
        querySuccess = false;
        wishesList = [];
      }
    }

    // 2. Fetch live storage media metadata before rendering KPIs
    let storageFiles = [];
    if (typeof loadStorageMediaData === "function") {
      storageFiles = await loadStorageMediaData(wishesList);
    } else if (typeof fetchStorage === "function") {
      const storageRes = await fetchStorage();
      storageFiles = (storageRes && storageRes.success) ? (storageRes.data || []) : [];
    } else if (typeof getStorageFiles === "function") {
      storageFiles = getStorageFiles();
    }

    const activeLogs = typeof getLogs === "function" ? getLogs() : [];

    // 3. Render all views with fully synchronized live data
    if (typeof setWishesState === "function") {
      setWishesState(wishesList, !querySuccess);
    }
    if (typeof renderKPIs === "function") {
      renderKPIs(wishesList, storageFiles);
    }
    if (typeof renderRecentWishes === "function") {
      renderRecentWishes(wishesList, !querySuccess);
    }
    if (typeof renderCustomersTable === "function") {
      renderCustomersTable(wishesList);
    } else if (window.AdminCustomers && typeof window.AdminCustomers.render === "function") {
      window.AdminCustomers.render(wishesList);
    }
    if (typeof renderStorageBreakdown === "function") {
      renderStorageBreakdown(storageFiles, wishesList);
    }
    if (typeof renderActivityFeed === "function") {
      renderActivityFeed(activeLogs);
    }
    if (typeof renderLogsTable === "function") {
      renderLogsTable(activeLogs);
    }
  }

  /**
   * Initialize Admin Studio App on DOM Ready
   */
  document.addEventListener("DOMContentLoaded", () => {
    // 1. Enforce Client-Side Authentication Gate
    if (typeof checkAdminAccessGate === "function" && !checkAdminAccessGate()) return;

    // 2. Initialize Navigation & Subsystem Handlers
    if (typeof initTabNavigation === "function") {
      initTabNavigation(async (targetTab) => {
        if (targetTab === "dashboard" || targetTab === "wishes" || targetTab === "customers" || targetTab === "themes") {
          await loadDashboardData();
        } else if (targetTab === "media") {
          if (typeof renderDamGrid === "function") {
            renderDamGrid();
          }
        }
      });
    }
    if (typeof initLogout === "function") initLogout();

    if (typeof initSecurityHandlers === "function") {
      initSecurityHandlers((event, desc) => {
        if (typeof logEvent === "function") logEvent(event, desc);
      });
    }

    if (typeof initCustomers === "function") {
      initCustomers();
    } else if (window.AdminCustomers && typeof window.AdminCustomers.init === "function") {
      window.AdminCustomers.init();
    }

    if (typeof initBackupHandlers === "function") {
      initBackupHandlers(
        () => ({
          wishes: wishesList,
          logs: typeof getLogs === "function" ? getLogs() : [],
          settings: typeof getSettings === "function" ? getSettings() : null
        }),
        (restoredWishes, restoredLogs, restoredSettings) => {
          wishesList = Array.isArray(restoredWishes) ? restoredWishes : [];
          if (typeof setLogs === "function") setLogs(restoredLogs);
          if (restoredSettings && window.AdminSettings && typeof window.AdminSettings.saveSettings === "function") {
            window.AdminSettings.saveSettings(restoredSettings, true);
            if (typeof window.AdminSettings.populateForm === "function") {
              window.AdminSettings.populateForm();
            }
          }
          loadDashboardData();
        },
        (event, desc) => {
          if (typeof logEvent === "function") logEvent(event, desc);
        }
      );
    }

    if (typeof initDashboard === "function") {
      initDashboard(async () => {
        await loadDashboardData();
      });
    }

    if (typeof initWishes === "function") {
      initWishes(async (event, desc) => {
        if (typeof logEvent === "function") logEvent(event, desc);
        await loadDashboardData();
      });
    }

    if (typeof initWishEditor === "function") {
      initWishEditor(async (event, desc) => {
        if (typeof logEvent === "function") logEvent(event, desc);
        await loadDashboardData();
      });
    }

    if (typeof initMedia === "function") {
      initMedia((event, desc) => {
        if (typeof logEvent === "function") logEvent(event, desc);
        const storageFiles = typeof getStorageFiles === "function" ? getStorageFiles() : [];
        if (typeof renderKPIs === "function") renderKPIs(wishesList, storageFiles);
      });
    }

    if (typeof initLogs === "function") {
      initLogs((logs) => {
        if (typeof renderActivityFeed === "function") renderActivityFeed(logs);
      });
    }

    if (typeof initSettings === "function") {
      initSettings();
    }

    if (window.AdminThemes && typeof window.AdminThemes.init === "function") {
      window.AdminThemes.init();
    }

    // 3. Initial Data Fetch & Render (Synchronized Wishes & Storage KPIs)
    loadDashboardData();

    // 4. Live Cross-Editor Synchronization Listeners (Window Focus & Visibility)
    // Ensures return from Quick Editor / external edits instantly updates Dashboard & Wishes table
    if (typeof window.addEventListener === "function") {
      window.addEventListener("focus", () => {
        loadDashboardData();
      });

      window.addEventListener("storage", (e) => {
        if (e.key === "bw_wish_sync_timestamp" || e.key === "bw_admin_default_theme") {
          loadDashboardData();
          if (window.AdminThemes && typeof window.AdminThemes.init === "function") {
            window.AdminThemes.init();
          }
        }
      });
    }

    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          loadDashboardData();
        }
      });
    }
  });

  // Export Global Facade for Backward Compatibility with Inline HTML Onclicks
  window.adminApp = {
    showToast,
    copyWishUrl,
    scanStorage: (...args) => (window.AdminMedia && window.AdminMedia.scanStorage) ? window.AdminMedia.scanStorage(...args) : null,
    deleteWish: (id) => (window.AdminWishes && window.AdminWishes.deleteWish) ? window.AdminWishes.deleteWish(id) : null,
    duplicateWish: (id) => (window.AdminWishes && window.AdminWishes.duplicateWish) ? window.AdminWishes.duplicateWish(id) : null,
    logEvent: (...args) => (window.AdminLogs && window.AdminLogs.log) ? window.AdminLogs.log(...args) : null,
    openAssetPreview: (...args) => (window.AdminMedia && window.AdminMedia.openAssetPreview) ? window.AdminMedia.openAssetPreview(...args) : null,
    openAssetInspector: (...args) => (window.AdminMedia && window.AdminMedia.openAssetInspector) ? window.AdminMedia.openAssetInspector(...args) : null,
    closeAssetInspector: (...args) => (window.AdminMedia && window.AdminMedia.closeAssetInspector) ? window.AdminMedia.closeAssetInspector(...args) : null,
    deleteSingleAsset: (...args) => (window.AdminMedia && window.AdminMedia.deleteSingleAsset) ? window.AdminMedia.deleteSingleAsset(...args) : null,
    renameAsset: (...args) => (window.AdminMedia && window.AdminMedia.renameAsset) ? window.AdminMedia.renameAsset(...args) : null,
    openThemePreview: (id) => (window.AdminThemes && window.AdminThemes.openThemePreview) ? window.AdminThemes.openThemePreview(id) : null,
    setDefaultTheme: (id) => (window.AdminThemes && window.AdminThemes.setDefaultTheme) ? window.AdminThemes.setDefaultTheme(id) : null
  };

})(window);
