/**
 * ============================================================================
 * ADMIN STUDIO NAVIGATION & ACCESS GATE (js/admin/admin-navigation.js)
 * Manages client-side access gating, sidebar tab switching, mobile drawer,
 * and authenticated session logout.
 * ============================================================================
 */

(function (window) {
  "use strict";

  /* ============================================================
     ADMIN NAVIGATION — ACCESS GATE
     ============================================================ */
  /**
   * Verifies that the current browser session has completed Admin Security authentication.
   * If unauthenticated, safely redirects back to index.html with an admin entry prompt.
   * Only activates when running on the Admin Dashboard (admin.html or #view-dashboard present).
   * @returns {boolean}
   */
  function checkAdminAccessGate() {
    // Only enforce access gate on the Admin Dashboard interface
    const isDashboardPage = (typeof window !== "undefined" && window.location && window.location.pathname.toLowerCase().endsWith("admin.html")) ||
                            (typeof document !== "undefined" && !!document.getElementById("view-dashboard"));
    if (!isDashboardPage) return true;

    const isAuth = sessionStorage.getItem("admin_authenticated") === "true";
    if (!isAuth) {
      console.warn("🔒 Admin session unauthenticated. Redirecting to Birthday Wish...");
      window.location.href = "index.html";
      return false;
    }

    // UX Expiration check (24 hours max session duration)
    const authTimestamp = parseInt(sessionStorage.getItem("admin_auth_timestamp"), 10);
    const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;
    if (!isNaN(authTimestamp) && (Date.now() - authTimestamp > MAX_SESSION_AGE_MS)) {
      console.warn("🔒 Admin session expired after 24h. Redirecting...");
      sessionStorage.removeItem("admin_authenticated");
      sessionStorage.removeItem("admin_session_token");
      sessionStorage.removeItem("admin_auth_timestamp");
      window.location.href = "index.html";
      return false;
    }

    return true;
  }

  /* ============================================================
     ADMIN NAVIGATION — SIDEBAR & TABS
     ============================================================ */
  /**
   * Initializes sidebar tab switching, active view toggling, and mobile sidebar drawer.
   * @param {Function} [onTabSwitchCallback] - Optional callback triggered when an active tab view changes.
   */
  function initTabNavigation(onTabSwitchCallback) {
    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
    const views = document.querySelectorAll(".tab-view");

    navItems.forEach(item => {
      item.addEventListener("click", () => {
        const targetTab = item.dataset.tab;
        if (!targetTab) return;

        navItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        views.forEach(v => {
          if (v.id === `view-${targetTab}`) {
            v.classList.add("active");
          } else {
            v.classList.remove("active");
          }
        });

        // Close mobile drawer on item select
        const sidebar = document.getElementById("admin-sidebar");
        if (sidebar) sidebar.classList.remove("open");

        if (typeof onTabSwitchCallback === "function") {
          try {
            onTabSwitchCallback(targetTab);
          } catch (err) {
            console.warn("⚠️ Navigation tab switch callback notice:", err);
          }
        }
      });
    });

    /* ============================================================
       ADMIN NAVIGATION — MOBILE DRAWER
       ============================================================ */
    const mobileToggle = document.getElementById("mobile-sidebar-toggle");
    const sidebar = document.getElementById("admin-sidebar");
    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        sidebar.classList.toggle("open");
      });

      document.addEventListener("click", (e) => {
        if (window.innerWidth <= 1024 && sidebar.classList.contains("open")) {
          if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
            sidebar.classList.remove("open");
          }
        }
      });
    }
  }

  /* ============================================================
     ADMIN NAVIGATION — LOGOUT
     ============================================================ */
  /**
   * Initializes Admin Logout button handler (Consolidated single authoritative definition).
   */
  function initLogout() {
    const logoutBtn = document.getElementById("admin-logout-btn");
    if (logoutBtn && !logoutBtn.__logoutBound) {
      logoutBtn.__logoutBound = true;
      logoutBtn.addEventListener("click", () => {
        sessionStorage.removeItem("admin_authenticated");
        sessionStorage.removeItem("admin_session_token");
        sessionStorage.removeItem("admin_auth_timestamp");

        try {
          localStorage.setItem("bw_admin_auth_sync", JSON.stringify({ action: "logout", time: Date.now() }));
        } catch (e) {}

        if (window.AdminLogs && typeof window.AdminLogs.log === "function") {
          window.AdminLogs.log("ADMIN_LOGOUT", "Admin logged out from dashboard session", "SUCCESS");
        }

        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Logged out successfully 🚪");
        }
        setTimeout(() => {
          window.location.href = "index.html";
        }, 300);
      });
    }

    // Cross-tab logout synchronization listener
    if (typeof window !== "undefined" && typeof window.addEventListener === "function" && !window.__authSyncBound) {
      window.__authSyncBound = true;
      window.addEventListener("storage", (e) => {
        if (e.key === "bw_admin_auth_sync") {
          try {
            const payload = JSON.parse(e.newValue);
            if (payload && payload.action === "logout") {
              sessionStorage.removeItem("admin_authenticated");
              sessionStorage.removeItem("admin_session_token");
              sessionStorage.removeItem("admin_auth_timestamp");
              window.location.href = "index.html";
            }
          } catch (err) {}
        }
      });
    }
  }

  /**
   * Programmatically switches the active sidebar tab and main viewport view.
   * @param {string} tabName - Target tab identifier (e.g. 'wishes', 'media', 'dashboard', 'logs').
   */
  function switchTab(tabName) {
    if (!tabName || typeof document === "undefined") return;

    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
    const views = document.querySelectorAll(".tab-view");

    navItems.forEach(item => {
      if (item.dataset && item.dataset.tab === tabName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    views.forEach(v => {
      if (v.id === `view-${tabName}`) {
        v.classList.add("active");
      } else {
        v.classList.remove("active");
      }
    });

    const sidebar = document.getElementById("admin-sidebar");
    if (sidebar) sidebar.classList.remove("open");
  }

  /* ============================================================
     EXPORT AUTHORITATIVE NAMESPACE
     ============================================================ */
  window.AdminNavigation = Object.freeze({
    checkAdminAccessGate,
    initTabNavigation,
    switchTab,
    initLogout
  });

})(window);
