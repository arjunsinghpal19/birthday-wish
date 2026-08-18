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
  const { init: initDashboard, renderKPIs, renderRecentWishes, renderActivityFeed, fetchWishes } = window.AdminDashboard || {};
  const { init: initWishes, render: renderWishesTable, setWishes: setWishesState, getWishes: getWishesState, deleteWish: deleteWishItem, duplicateWish: duplicateWishItem } = window.AdminWishes || {};
  const { init: initWishEditor } = window.AdminWishEditor || {};
  const { init: initMedia, load: loadStorageMediaData, render: renderDamGrid, getFiles: getStorageFiles } = window.AdminMedia || {};
  const { init: initSecurityHandlers } = window.AdminSecurity || {};
  const { init: initBackupHandlers, exportBackup, importBackup } = window.AdminBackup || {};
  const { init: initLogs, log: logEvent, render: renderLogsTable, getLogs, setLogs } = window.AdminLogs || {};

  // Cached in-memory active wishes list
  let wishesList = [];

  /**
   * Coordinates live data loading from Supabase Database and Storage across all views.
   */
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

    const storageFiles = typeof getStorageFiles === "function" ? getStorageFiles() : [];
    const activeLogs = typeof getLogs === "function" ? getLogs() : [];

    if (typeof setWishesState === "function") {
      setWishesState(wishesList, !querySuccess);
    }
    if (typeof renderKPIs === "function") {
      renderKPIs(wishesList, storageFiles);
    }
    if (typeof renderRecentWishes === "function") {
      renderRecentWishes(wishesList, !querySuccess);
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
    if (typeof initTabNavigation === "function") initTabNavigation();
    if (typeof initLogout === "function") initLogout();

    if (typeof initSecurityHandlers === "function") {
      initSecurityHandlers((event, desc) => {
        if (typeof logEvent === "function") logEvent(event, desc);
      });
    }

    if (typeof initBackupHandlers === "function") {
      initBackupHandlers(
        () => ({
          wishes: wishesList,
          logs: typeof getLogs === "function" ? getLogs() : []
        }),
        (restoredWishes, restoredLogs) => {
          wishesList = Array.isArray(restoredWishes) ? restoredWishes : [];
          if (typeof setLogs === "function") setLogs(restoredLogs);
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
        if (typeof loadStorageMediaData === "function") {
          await loadStorageMediaData(wishesList);
        }
      });
    }

    if (typeof initWishes === "function") {
      initWishes((event, desc, updatedWishes) => {
        wishesList = updatedWishes || [];
        if (typeof logEvent === "function") logEvent(event, desc);
        const storageFiles = typeof getStorageFiles === "function" ? getStorageFiles() : [];
        if (typeof renderKPIs === "function") renderKPIs(wishesList, storageFiles);
        if (typeof renderRecentWishes === "function") renderRecentWishes(wishesList);
      });
    }

    if (typeof initWishEditor === "function") {
      initWishEditor(async (event, desc) => {
        if (typeof logEvent === "function") logEvent(event, desc);
        await loadDashboardData();
        if (typeof loadStorageMediaData === "function") {
          await loadStorageMediaData(wishesList);
        }
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

    // 3. Initial Data Fetch & Render
    loadDashboardData();
    if (typeof loadStorageMediaData === "function") {
      loadStorageMediaData(wishesList);
    }
  });

  // Export Global Facade for Backward Compatibility with Inline HTML Onclicks
  window.adminApp = {
    showToast,
    copyWishUrl,
    deleteWish: (id) => (window.AdminWishes && window.AdminWishes.deleteWish) ? window.AdminWishes.deleteWish(id) : null,
    duplicateWish: (id) => (window.AdminWishes && window.AdminWishes.duplicateWish) ? window.AdminWishes.duplicateWish(id) : null,
    logEvent: (...args) => (window.AdminLogs && window.AdminLogs.log) ? window.AdminLogs.log(...args) : null,
    openAssetPreview: (...args) => (window.AdminMedia && window.AdminMedia.openAssetPreview) ? window.AdminMedia.openAssetPreview(...args) : null,
    deleteSingleAsset: (...args) => (window.AdminMedia && window.AdminMedia.deleteSingleAsset) ? window.AdminMedia.deleteSingleAsset(...args) : null,
    renameAsset: (...args) => (window.AdminMedia && window.AdminMedia.renameAsset) ? window.AdminMedia.renameAsset(...args) : null
  };

})(window);
