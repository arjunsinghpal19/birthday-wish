/**
 * ============================================================================
 * CUSTOMER DASHBOARD SHELL CONTROLLER (js/customer/customer-dashboard.js)
 * Architecture: Phase 32E-1 Customer Platform Foundation
 *
 * Dedicated client-side controller managing the Customer Portal lifecycle,
 * sidebar navigation, tab routing, responsive mobile drawer, profile hydration,
 * and RLS-scoped wish metrics.
 *
 * NAVIGATION LIFECYCLE INVARIANTS:
 * 1. Fresh Sign In / Sign Up ALWAYS activates the Overview tab.
 * 2. Active session page refreshes restore the currently selected tab.
 * 3. Sign Out explicitly clears stored customer navigation tab state.
 * 4. 100% Isolated from Master Admin Authentication.
 * 5. File size strictly under 35 KB ceiling.
 * ============================================================================
 */

(function (root) {
  "use strict";

  const STORAGE_TAB_KEY = "customer_active_tab";

  let currentUser = null;
  let currentProfile = null;
  let customerWishes = [];
  let activeTab = "overview";

  const el = (id) => document.getElementById(id);

  function showToast(message, type = "info") {
    const toast = el("customer-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `customer-toast active ${type}`;
    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.classList.remove("active"); }, 4000);
  }

  // Canonical Public Customer Toast API
  root.showCustomerToast = showToast;
  if (typeof window !== "undefined") {
    window.showCustomerToast = showToast;
  }

  function showAuthError(msg) {
    const box = el("auth-error-box");
    if (!box) return;
    if (msg) { box.textContent = msg; box.style.display = "block"; }
    else { box.style.display = "none"; box.textContent = ""; }
  }

  function showAuthStatus(msg, type = "success") {
    const box = el("auth-status-box");
    if (!box) return;
    if (msg) { box.className = `auth-status-box ${type}`; box.textContent = msg; box.style.display = "block"; }
    else { box.style.display = "none"; box.textContent = ""; }
  }

  function closeMobileSidebar() {
    el("customer-sidebar")?.classList.remove("open");
    el("customer-sidebar-backdrop")?.classList.remove("active");
  }

  function openMobileSidebar() {
    el("customer-sidebar")?.classList.add("open");
    el("customer-sidebar-backdrop")?.classList.add("active");
  }

  /**
   * Switches the active dashboard view tab.
   * @param {string} tabName
   * @param {boolean} [persistState=true]
   */
  function switchTab(tabName, persistState = true) {
    activeTab = tabName || "overview";

    if (persistState) {
      try {
        sessionStorage.setItem(STORAGE_TAB_KEY, activeTab);
      } catch (_) {}
    }

    document.querySelectorAll(".nav-item[data-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === activeTab);
    });

    document.querySelectorAll(".customer-tab-view, .tab-view").forEach((view) => {
      view.classList.toggle("active", view.id === `view-${activeTab}`);
    });

    closeMobileSidebar();

    if (activeTab === "overview") {
      revalidateCustomerWishes();
      root.CustomerWishes?.renderRecentOverviewList?.();
      root.CustomerMedia?.updateStorageUsage?.(customerWishes, currentProfile?.storage_quota_mb || 25);
    } else if (activeTab === "wishes") {
      revalidateCustomerWishes();
      root.CustomerWishes?.renderMyWishesHub?.();
    } else if (activeTab === "create") {
      if (!root.CustomerWishEditor?.getState?.().config) {
        root.CustomerWishEditor?.openNew?.();
      }
    } else if (activeTab === "media") {
      root.CustomerMedia?.renderMediaLibrary?.();
      root.CustomerMedia?.updateStorageUsage?.(customerWishes, currentProfile?.storage_quota_mb || 25);
    } else if (activeTab === "themes") {
      root.CustomerThemes?.renderThemes?.();
    } else if (["profile", "settings", "security", "plan"].includes(activeTab)) {
      renderCustomerProfile(currentProfile);
      root.CustomerMedia?.updateStorageUsage?.(customerWishes, currentProfile?.storage_quota_mb || 25);
    }
  }

  function toggleModal(modalId, open) {
    const m = el(modalId);
    if (!m) return;
    m.classList.toggle("active", open);
    m.classList.toggle("open", open);
  }

  function formatExactDate(isoString) {
    if (!isoString) return "Active Member";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "Active Member";
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch (_) {
      return "Active Member";
    }
  }

  function renderCustomerProfile(profile) {
    if (!profile) return;
    currentProfile = profile;

    const name = profile.full_name || (currentUser?.email ? currentUser.email.split("@")[0] : "Customer");
    const email = profile.email || currentUser?.email || "";
    const tier = profile.plan_tier ? `${profile.plan_tier.charAt(0).toUpperCase() + profile.plan_tier.slice(1)} Tier` : "Free Tier";
    const initial = (name.charAt(0) || "U").toUpperCase();
    const joined = formatExactDate(profile.created_at || currentUser?.created_at);
    const uid = profile.id || currentUser?.id || "";
    const maskedUid = uid ? `${uid.slice(0, 8)}...${uid.slice(-4)}` : "—";
    const quotaMb = profile.storage_quota_mb || 25;

    const setTxt = (id, val) => { const x = el(id); if (x) x.textContent = val; };
    const setVal = (id, val) => { const x = el(id); if (x) x.value = val; };

    setTxt("profile-pill-name", name);
    setTxt("profile-avatar-initials", initial);
    setTxt("profile-menu-email", email);
    setTxt("profile-menu-plan", tier);
    setTxt("welcome-heading", `Welcome back, ${name} 👋`);

    setTxt("modal-profile-avatar", initial);
    setTxt("modal-profile-display-name", name);
    setTxt("modal-profile-display-email", email);
    setTxt("modal-profile-plan-badge", `✨ ${tier}`);
    setVal("modal-profile-name", name);
    setVal("modal-profile-email", email);
    setTxt("modal-profile-joined", joined);
    setTxt("modal-profile-id", maskedUid);

    setTxt("view-profile-avatar", initial);
    setTxt("view-profile-display-name", name);
    setTxt("view-profile-display-email", email);
    setVal("view-profile-name-input", name);
    setVal("view-profile-email-input", email);
    setTxt("view-profile-joined", joined);
    setTxt("view-profile-id", maskedUid);

    setTxt("modal-plan-hero-tier", `🎁 ${tier}`);
    setTxt("modal-plan-wishes-count", `${customerWishes.length} Wishes`);
    setTxt("view-plan-hero-tier", `🎁 ${tier}`);
    setTxt("view-plan-wishes-count", `${customerWishes.length} Wishes`);

    setTxt("view-security-email", email);
    setTxt("view-security-id", maskedUid);

    root.CustomerMedia?.updateStorageUsage?.(customerWishes, quotaMb);
  }

  const REVALIDATION_THROTTLE_MS = 5000;
  let lastRevalidateTime = 0;
  let isRevalidating = false;

  async function loadCustomerWishes() {
    if (root.CustomerWishes?.loadWishes) {
      customerWishes = await root.CustomerWishes.loadWishes(true);
      lastRevalidateTime = Date.now();
      root.CustomerWishes.renderRecentOverviewList?.();
      root.CustomerWishes.renderMyWishesHub?.();
      root.CustomerMedia?.updateStorageUsage?.(customerWishes, currentProfile?.storage_quota_mb || 25);
    }
  }

  /**
   * Background throttled revalidation of customer wishes.
   * Purges externally deleted wishes and refreshes UI if throttled interval (>=5s) has passed.
   * Prevents concurrent fetches via isRevalidating lock.
   */
  async function revalidateCustomerWishes() {
    if (!currentUser) {
      if (root.CustomerAuth?.getCurrentUser) {
        try {
          const u = await root.CustomerAuth.getCurrentUser();
          if (u && u.id) currentUser = u;
        } catch (_) {}
      }
      if (!currentUser) return;
    }

    const now = Date.now();
    if (now - lastRevalidateTime < REVALIDATION_THROTTLE_MS || isRevalidating) {
      return;
    }

    isRevalidating = true;
    lastRevalidateTime = now;

    try {
      await loadCustomerWishes();
      const modalPlan = el("modal-plan-wishes-count");
      if (modalPlan) modalPlan.textContent = `${customerWishes.length} Wishes`;
      const viewPlan = el("view-plan-wishes-count");
      if (viewPlan) viewPlan.textContent = `${customerWishes.length} Wishes`;
    } catch (err) {
      console.warn("⚠️ CustomerDashboard: Background revalidation error:", err);
    } finally {
      isRevalidating = false;
    }
  }

  /**
   * Initializes the Authenticated Dashboard view.
   * @param {boolean} [isFreshLogin=false] - When true, forces Overview tab.
   */
  async function showAuthenticatedDashboard(isFreshLogin = false) {
    const authGate = el("customer-auth-gate");
    if (authGate) authGate.style.display = "none";

    const app = el("customer-app");
    if (app) app.style.display = "flex";

    const shell = el("customer-dashboard-shell");
    if (shell) shell.style.display = "flex";

    if (root.CustomerAuth?.getCustomerProfile) {
      const res = await root.CustomerAuth.getCustomerProfile();
      if (res?.success && res.profile) currentProfile = res.profile;
    }

    renderCustomerProfile(currentProfile);

    root.CustomerWishes?.init?.();
    root.CustomerWishEditor?.init?.();
    root.CustomerMedia?.init?.();
    root.CustomerThemes?.init?.();

    await loadCustomerWishes();

    if (isFreshLogin) {
      try { sessionStorage.setItem(STORAGE_TAB_KEY, "overview"); } catch (_) {}
      switchTab("overview", false);
    } else {
      let savedTab = "overview";
      try { savedTab = sessionStorage.getItem(STORAGE_TAB_KEY) || "overview"; } catch (_) {}
      switchTab(savedTab, false);
    }
  }

  function showUnauthenticatedGate() {
    currentUser = null;
    currentProfile = null;
    customerWishes = [];

    try { sessionStorage.removeItem(STORAGE_TAB_KEY); } catch (_) {}

    const authGate = el("customer-auth-gate");
    if (authGate) authGate.style.display = "block";

    const app = el("customer-app");
    if (app) app.style.display = "none";

    const shell = el("customer-dashboard-shell");
    if (shell) shell.style.display = "none";

    closeMobileSidebar();
  }

  function bindEvents() {
    // 1. Auth Gate Tabs
    const tabSignIn = el("btn-tab-signin");
    const tabSignUp = el("btn-tab-signup");
    const formSignIn = el("form-customer-signin");
    const formSignUp = el("form-customer-signup");

    if (tabSignIn && tabSignUp && formSignIn && formSignUp) {
      tabSignIn.addEventListener("click", () => {
        tabSignIn.classList.add("active");
        tabSignUp.classList.remove("active");
        formSignIn.style.display = "block";
        formSignUp.style.display = "none";
        showAuthError(null);
        showAuthStatus(null);
      });

      tabSignUp.addEventListener("click", () => {
        tabSignUp.classList.add("active");
        tabSignIn.classList.remove("active");
        formSignUp.style.display = "block";
        formSignIn.style.display = "none";
        showAuthError(null);
        showAuthStatus(null);
      });
    }

    // 1B. Password Visibility Toggles
    const SVG_EYE_OPEN = `<svg class="pwd-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const SVG_EYE_OFF = `<svg class="pwd-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    document.querySelectorAll(".btn-pwd-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const inp = el(btn.getAttribute("data-target"));
        if (inp) {
          const isPwd = inp.type === "password";
          inp.type = isPwd ? "text" : "password";
          btn.innerHTML = isPwd ? SVG_EYE_OFF : SVG_EYE_OPEN;
        }
      });
    });

    // 2. Sign In Form Submission
    if (formSignIn) {
      formSignIn.addEventListener("submit", async (e) => {
        e.preventDefault();
        showAuthError(null);
        showAuthStatus(null);

        const email = el("signin-email")?.value.trim() || "";
        const password = el("signin-password")?.value || "";
        const btnSubmit = el("btn-signin-submit");

        if (!email || !password) { showAuthError("Please provide both email and password."); return; }

        if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = "Signing in..."; }

        try {
          const res = await root.CustomerAuth.signIn(email, password);
          if (!res.success) {
            showAuthError(res.error || "Invalid email or password.");
          } else {
            currentUser = res.user;
            showToast("Signed in successfully!", "success");
            await showAuthenticatedDashboard(true);
          }
        } catch (err) {
          showAuthError(err.message || "An unexpected error occurred during sign in.");
        } finally {
          if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = "Sign In"; }
        }
      });
    }

    // 3. Sign Up Form Submission
    if (formSignUp) {
      formSignUp.addEventListener("submit", async (e) => {
        e.preventDefault();
        showAuthError(null);
        showAuthStatus(null);

        const fullName = el("signup-fullname")?.value.trim() || "";
        const email = el("signup-email")?.value.trim() || "";
        const password = el("signup-password")?.value || "";
        const btnSubmit = el("btn-signup-submit");

        if (!email || !password) { showAuthError("Please fill out all required fields."); return; }

        if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = "Creating account..."; }

        try {
          const res = await root.CustomerAuth.signUp(email, password, fullName);
          if (!res.success) {
            showAuthError(res.error || "Sign up failed.");
          } else {
            if (res.needsEmailConfirmation) {
              showToast("Account created! Check your email to confirm registration.", "info");
              showAuthStatus("✉️ Verification link sent to your email. Confirm before signing in.", "success");
              if (tabSignIn && tabSignUp && formSignIn && formSignUp) {
                tabSignIn.classList.add("active");
                tabSignUp.classList.remove("active");
                formSignIn.style.display = "block";
                formSignUp.style.display = "none";
              }
            } else {
              currentUser = res.user;
              showToast("Account created! Welcome to Birthday Wish.", "success");
              await showAuthenticatedDashboard(true);
            }
          }
        } catch (err) {
          showAuthError(err.message || "An error occurred during sign up.");
        } finally {
          if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = "Create Free Account"; }
        }
      });
    }

    // 4. Mobile Drawer Toggle
    el("mobile-sidebar-toggle")?.addEventListener("click", () => {
      const s = el("customer-sidebar");
      if (s?.classList.contains("open")) closeMobileSidebar();
      else openMobileSidebar();
    });

    el("customer-sidebar-backdrop")?.addEventListener("click", closeMobileSidebar);

    // 5. Sidebar Navigation Links
    document.querySelectorAll(".nav-item[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.getAttribute("data-tab"), true));
    });

    // 6. Action Triggers
    const openCreateTab = (e) => {
      e?.preventDefault();
      if (root.CustomerWishEditor?.openNew) root.CustomerWishEditor.openNew();
      else switchTab("create", true);
    };

    el("btn-banner-create")?.addEventListener("click", openCreateTab);
    el("btn-quick-create")?.addEventListener("click", openCreateTab);
    el("btn-hub-create-wish")?.addEventListener("click", openCreateTab);
    el("btn-quick-manage")?.addEventListener("click", () => switchTab("wishes", true));

    // 7. Sign Out Triggers
    const handleSignOut = async () => {
      el("customer-profile-container")?.classList.remove("open");
      await root.CustomerAuth?.signOut?.();
      showToast("Signed out successfully.", "info");
      showUnauthenticatedGate();
    };

    el("customer-logout-btn")?.addEventListener("click", handleSignOut);
    el("menu-action-signout")?.addEventListener("click", handleSignOut);

    // 8. Profile Dropdown Toggle
    const profileBtn = el("customer-profile-dropdown-btn");
    const profileContainer = el("customer-profile-container");

    if (profileBtn && profileContainer) {
      profileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        profileContainer.classList.toggle("open");
      });

      document.addEventListener("click", (e) => {
        if (!profileContainer.contains(e.target)) profileContainer.classList.remove("open");
      });
    }

    // 9. Profile Menu Tab Links
    el("menu-action-profile")?.addEventListener("click", () => { profileContainer?.classList.remove("open"); switchTab("profile", true); });
    el("menu-action-plan")?.addEventListener("click", () => { profileContainer?.classList.remove("open"); switchTab("plan", true); });
    el("menu-action-settings")?.addEventListener("click", () => { profileContainer?.classList.remove("open"); switchTab("settings", true); });

    // 10. Profile Update Form
    const handleProfileSubmit = async (e, nameInputId, btnId) => {
      e.preventDefault();
      const newName = el(nameInputId)?.value.trim() || "";
      const btnSave = el(btnId);

      if (!newName) { showToast("Please enter a valid full name.", "error"); return; }
      if (btnSave) { btnSave.disabled = true; btnSave.textContent = "Saving..."; }

      try {
        const res = await root.CustomerAuth.updateCustomerProfile({ full_name: newName });
        if (!res.success) {
          showToast(res.error || "Failed to update profile name.", "error");
        } else {
          if (res.profile) currentProfile = res.profile;
          else if (currentProfile) currentProfile.full_name = newName;
          renderCustomerProfile(currentProfile || { full_name: newName });
          showToast("Profile name updated!", "success");
        }
      } catch (err) {
        showToast(err.message || "Failed to save profile.", "error");
      } finally {
        if (btnSave) { btnSave.disabled = false; btnSave.textContent = "Save Profile Changes"; }
      }
    };

    el("form-update-customer-profile")?.addEventListener("submit", (e) => handleProfileSubmit(e, "modal-profile-name", "btn-save-profile"));
    el("form-view-update-profile")?.addEventListener("submit", (e) => handleProfileSubmit(e, "view-profile-name-input", "btn-view-save-profile"));

    // 11. Settings Studio Toggles
    const bindSetting = (id, key, label) => {
      const toggle = el(id);
      if (toggle) {
        toggle.checked = localStorage.getItem(key) !== "false";
        toggle.addEventListener("change", (e) => {
          localStorage.setItem(key, String(e.target.checked));
          showToast(`${label} ${e.target.checked ? "enabled" : "disabled"}.`, "info");
        });
      }
    };
    bindSetting("setting-autosave", "customer_pref_autosave", "Draft auto-save");
    bindSetting("setting-autoplay", "customer_pref_audio_autoplay", "Audio autoplay");
    bindSetting("view-setting-autosave", "customer_pref_autosave", "Draft auto-save");
    bindSetting("view-setting-autoplay", "customer_pref_audio_autoplay", "Audio autoplay");

    // 12. Password Reset
    const handlePasswordReset = async (btn) => {
      const userEmail = currentUser?.email || currentProfile?.email;
      if (!userEmail) { showToast("Unable to resolve email address.", "error"); return; }

      btn.disabled = true;
      const origText = btn.textContent;
      btn.textContent = "Sending...";

      try {
        const res = await root.CustomerAuth.sendPasswordResetEmail(userEmail);
        if (!res.success) showToast(res.error || "Failed to send reset email.", "error");
        else showToast(`Password reset link sent to ${userEmail}!`, "success");
      } catch (err) {
        showToast(err.message || "Failed to trigger password reset.", "error");
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    };

    ["btn-send-password-reset", "btn-view-password-reset", "btn-security-reset-pass"].forEach((id) => {
      const b = el(id);
      if (b) b.addEventListener("click", () => handlePasswordReset(b));
    });

    // 13. Delete Account
    const openDeleteModal = () => {
      toggleModal("modal-profile", false);
      toggleModal("modal-settings", false);
      toggleModal("modal-delete-confirm", true);
    };

    ["btn-open-delete-account", "btn-settings-delete-account", "btn-view-open-delete", "btn-view-settings-delete"].forEach((id) => {
      el(id)?.addEventListener("click", openDeleteModal);
    });

    const btnConfirmDelete = el("btn-confirm-delete-account");
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener("click", async () => {
        btnConfirmDelete.disabled = true;
        const originalText = btnConfirmDelete.textContent;
        btnConfirmDelete.textContent = "Deleting account...";

        try {
          const res = await root.CustomerAuth.deleteAccount();
          if (!res.success) {
            showToast(res.error || "Failed to delete account.", "error");
            btnConfirmDelete.disabled = false;
            btnConfirmDelete.textContent = originalText;
          } else {
            toggleModal("modal-delete-confirm", false);
            await root.CustomerAuth?.signOut?.();
            showToast("Account deleted permanently.", "info");
            showUnauthenticatedGate();
          }
        } catch (err) {
          showToast(err.message || "Error deleting account.", "error");
          btnConfirmDelete.disabled = false;
          btnConfirmDelete.textContent = originalText;
        }
      });
    }

    // 14. Modal Close Handlers
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => toggleModal(btn.getAttribute("data-close-modal"), false));
    });

    document.querySelectorAll(".customer-modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.classList.remove("open");
          overlay.classList.remove("active");
        }
      });
    });

    // 15. Global Escape Key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMobileSidebar();
        profileContainer?.classList.remove("open");
        document.querySelectorAll(".customer-modal-overlay.open, .customer-modal-overlay.active").forEach((m) => {
          m.classList.remove("open");
          m.classList.remove("active");
        });
      }
    });

    // 16. Window focus & Visibility change background revalidation
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        revalidateCustomerWishes();
      }
    });

    window.addEventListener("focus", () => {
      revalidateCustomerWishes();
    });
  }

  async function initCustomerPortal() {
    bindEvents();

    if (root.CustomerAuth?.getCurrentUser) {
      try {
        const user = await root.CustomerAuth.getCurrentUser();
        if (user && user.id) {
          currentUser = user;
          await showAuthenticatedDashboard(false);
        } else {
          showUnauthenticatedGate();
        }
      } catch (e) {
        showUnauthenticatedGate();
      }

      root.CustomerAuth.onAuthStateChange?.(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          if (!currentUser || currentUser.id !== session.user.id) {
            currentUser = session.user;
            await showAuthenticatedDashboard(true);
          }
        } else if (event === "SIGNED_OUT") {
          showUnauthenticatedGate();
        }
      });
    } else {
      showUnauthenticatedGate();
    }
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initCustomerPortal);
    } else {
      initCustomerPortal();
    }
  }

  root.CustomerDashboard = {
    init: initCustomerPortal,
    renderCustomerProfile,
    loadCustomerWishes,
    revalidateCustomerWishes,
    switchTab,
    showAuthenticatedDashboard,
    showUnauthenticatedGate,
    showToast,
    getCurrentProfile: () => currentProfile,
    getCurrentUser: () => currentUser,
    getActiveTab: () => activeTab
  };

})(typeof window !== "undefined" ? window : globalThis);
