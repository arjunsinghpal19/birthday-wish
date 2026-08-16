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
    return true;
  }

  /* ============================================================
     ADMIN NAVIGATION — SIDEBAR & TABS
     ============================================================ */
  /**
   * Initializes sidebar tab switching, active view toggling, and mobile sidebar drawer.
   */
  function initTabNavigation() {
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
      });
    });

    /* ============================================================
       ADMIN NAVIGATION — MOBILE DRAWER
       ============================================================ */
    const mobileToggle = document.getElementById("mobile-sidebar-toggle");
    const sidebar = document.getElementById("admin-sidebar");
    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener("click", () => {
        sidebar.classList.toggle("open");
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
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        sessionStorage.removeItem("admin_authenticated");
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Logged out successfully 🚪");
        }
        setTimeout(() => {
          window.location.href = "index.html";
        }, 300);
      });
    }
  }

  /* ============================================================
     EXPORT AUTHORITATIVE NAMESPACE
     ============================================================ */
  window.AdminNavigation = Object.freeze({
    checkAdminAccessGate,
    initTabNavigation,
    initLogout
  });

})(window);
