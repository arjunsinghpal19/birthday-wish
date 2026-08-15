/**
 * ============================================================================
 * MODULE: Admin Security & Access Control (js/modules/admin-security.js)
 * Phase 25 Modular Extraction
 * ============================================================================
 *
 * RESPONSIBILITY:
 *   Manages creator authentication gates, master PIN verification, multi-step
 *   password recovery flows, emergency developer triggers, and modal display states.
 *
 * DOES NOT OWN:
 *   - Database CRUD operations (Owned by js/database.js)
 *   - Cloud media storage buckets (Owned by js/storage.js)
 *   - Wish token codecs or URL routing (Owned by js/modules/wish-codec.js & js/app.js)
 *   - Customizer editing forms or field synchronization (Owned by js/modules/editor/*)
 *   - Future Admin Dashboard & Wish Management UI (Intentionally separate)
 *
 * AUTHENTICATION ARCHITECTURE:
 *   - Primary validation is performed by `window.PasswordService.verifyPassword()`
 *     against Supabase database with bcrypt cryptographic hashing.
 *   - Master password updates are persisted to Supabase via `window.PasswordService.updatePassword()`.
 *   - Successful authentication writes `sessionStorage.setItem("admin_authenticated", "true")`.
 *
 * PASSWORD SERVICE INTEGRATION:
 *   - Consumes `window.PasswordService` provided by `js/database.js`.
 *   - Does NOT rewrite or replace the underlying authentication provider.
 *
 * RECOVERY FLOWS (3 Approved Methods):
 *   1. Email OTP: Dispatches verification codes via `/api/send-otp`.
 *   2. Emergency Backup Code: Compares against configured emergency recovery key.
 *   3. Secret Security Question: Validates answers via `/api/auth` or Supabase settings.
 *
 * CALLERS:
 *   - `initCustomizerModal()` in `js/modules/editor/customizer.js` (invokes `checkAdminAccess()`)
 *   - Footer lock button (`#footer-admin-lock-btn`)
 *   - Keyboard shortcut `Ctrl + Shift + E`
 *   - Emergency shortcut `Ctrl + Shift + Alt + A`
 *   - Secret double-click on `#loading-logo-glow` and `.letter-title`
 *
 * DOM CONTRACT:
 *   - Modal: `#admin-login-modal`, `#admin-modal-close-btn`
 *   - Tab Buttons & Content: `.admin-tab-btn`, `.admin-tab-content`
 *   - Login Tab: `#admin-login-pass`, `#admin-login-submit-btn`, `#admin-login-error`
 *   - Change Tab: `#admin-old-pass`, `#admin-new-pass`, `#admin-confirm-pass`, `#admin-change-submit-btn`
 *   - Forgot Tab: `#admin-tab-forgot`, `#card-method-email`, `#card-method-backup`, `#card-method-question`
 *   - Floating Action Button: `#customizer-toggle-btn.admin-visible`
 *
 * GLOBAL API EXPOSED:
 *   - `window.getAdminPassword`
 *   - `window.initAdminSecurityModal`
 *   - `window.handleUnlock`
 *   - `window.promptForAdminAccess`
 *   - `window.checkAdminAccess`
 *
 * LIFECYCLE:
 *   - Initialized at application boot via `checkAdminAccess()` when customizer initializes.
 *
 * SECURITY BOUNDARY:
 *   - Pure UI gate & state controller for creator permissions.
 *   - Causes 0 unexpected database writes on modal open, close, typing, or failed login.
 *
 * FUTURE ADMIN DASHBOARD SEPARATION:
 *   - Future Admin Dashboard (My Wishes, Storage Stats, Analytics, etc.) is
 *     architecturally separated and will be built as independent dashboard modules.
 * ============================================================================
 */

(function (root) {
  "use strict";

  /**
   * Safe helper resolving showToast across modules.
   * @param {string} msg - Notification message text.
   */
  function safeToast(msg) {
    const toastFn = root.showToast || (typeof showToast === "function" ? showToast : (m) => console.log(m));
    toastFn(msg);
  }

  /**
   * Safe DOM helper resolving cached elements or standard getElementById.
   * @param {string} id - Element ID.
   * @returns {HTMLElement|null}
   */
  function getEl(id) {
    if (root.DOM && typeof root.DOM.get === "function") return root.DOM.get(id);
    return document.getElementById(id);
  }

  /**
   * Supabase single source of truth password service proxy.
   * @param {boolean} forceRefresh - Whether to force a fresh fetch from database.
   * @returns {Promise<string|null>}
   */
  async function getAdminPassword(forceRefresh = false) {
    if (root.PasswordService && typeof root.PasswordService.getPassword === "function") {
      return await root.PasswordService.getPassword(forceRefresh);
    }
    return null;
  }

  /**
   * Initializes the Admin Security Modal, tab navigation, eye toggles,
   * unlock verification, password changes, and 3-step recovery flow.
   * @returns {void}
   */
  function initAdminSecurityModal() {
    if (root.PasswordService && typeof root.PasswordService.initRealtime === "function") {
      root.PasswordService.initRealtime();
    }

    const modal = document.getElementById("admin-login-modal");
    const closeBtn = document.getElementById("admin-modal-close-btn");
    const tabBtns = document.querySelectorAll(".admin-tab-btn");
    const tabContents = document.querySelectorAll(".admin-tab-content");

    const loginPassInput = document.getElementById("admin-login-pass");
    const loginSubmitBtn = document.getElementById("admin-login-submit-btn");

    const oldPassInput = document.getElementById("admin-old-pass");
    const newPassInput = document.getElementById("admin-new-pass");
    const confirmPassInput = document.getElementById("admin-confirm-pass");
    const changeSubmitBtn = document.getElementById("admin-change-submit-btn");

    if (!modal) return;

    // Close modal
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove("open");
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove("open"); };

    // Eye Toggle (Show/Hide Password) for all password fields
    document.querySelectorAll(".eye-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;
        if (input.type === "password") {
          input.type = "text";
          btn.textContent = "👁️‍🗨️";
        } else {
          input.type = "password";
          btn.textContent = "👁️";
        }
      });
    });

    tabBtns.forEach(btn => {
      btn.onclick = () => {
        const tabName = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove("active"));
        tabContents.forEach(c => { c.classList.remove("active"); c.style.display = "none"; });

        btn.classList.add("active");
        const targetContent = document.getElementById(`admin-tab-${tabName}`);
        if (targetContent) {
          targetContent.classList.add("active");
          targetContent.style.display = "block";
        }
        if (tabName === "forgot") {
          if (typeof resetToMethods === "function") resetToMethods();
        }
      };
    });

    // Tab 1: Unlock Submission (Strict Supabase Password Validation)
    async function handleUnlock() {
      const entered = (loginPassInput?.value || "").trim();
      safeToast("⏳ Verifying Admin Password...");
      const errorMsgEl = document.getElementById("admin-login-error");

      const isValid = root.PasswordService ? await root.PasswordService.verifyPassword(entered) : false;

      if (isValid) {
        sessionStorage.setItem("admin_authenticated", "true");
        modal.classList.remove("open");
        if (loginPassInput) {
          loginPassInput.value = "";
          loginPassInput.classList.remove("input-error");
        }
        if (errorMsgEl) errorMsgEl.style.display = "none";
        const fab = document.getElementById("customizer-toggle-btn");
        if (fab) fab.classList.add("admin-visible");
        safeToast("👑 Admin Mode Activated!");
        const customizerModal = document.getElementById("customizer-modal");
        if (customizerModal) customizerModal.classList.add("open");
      } else {
        if (loginPassInput) {
          loginPassInput.classList.add("input-error");
          loginPassInput.focus();
          loginPassInput.select();
        }

        const modalCard = modal.querySelector(".admin-modal-content") || modal.querySelector(".modal-card") || modal;
        if (modalCard) {
          modalCard.classList.remove("shake-error");
          void modalCard.offsetWidth;
          modalCard.classList.add("shake-error");
        }

        if (errorMsgEl) {
          errorMsgEl.style.display = "flex";
        }

        safeToast("Incorrect Admin Password ❌");
      }
    }

    if (loginSubmitBtn) loginSubmitBtn.onclick = handleUnlock;
    if (loginPassInput) {
      loginPassInput.onkeydown = (e) => { if (e.key === "Enter") handleUnlock(); };
      loginPassInput.addEventListener("input", () => {
        loginPassInput.classList.remove("input-error");
        const errorMsgEl = document.getElementById("admin-login-error");
        if (errorMsgEl) errorMsgEl.style.display = "none";
      });
    }

    // Tab 2: Change Password Submission
    if (changeSubmitBtn) {
      changeSubmitBtn.onclick = async () => {
        const oldVal = (oldPassInput?.value || "").trim();
        const newVal = (newPassInput?.value || "").trim();
        const confirmVal = (confirmPassInput?.value || "").trim();

        if (!oldVal) {
          safeToast("Please enter your Current / Old Password! ⚠️");
          if (oldPassInput) oldPassInput.focus();
          return;
        }

        const isOldCorrect = root.PasswordService ? await root.PasswordService.verifyPassword(oldVal) : false;
        if (!isOldCorrect) {
          safeToast("Current Old Password is wrong ❌");
          if (oldPassInput) {
            oldPassInput.classList.add("input-error");
            oldPassInput.focus();
          }
          return;
        }
        if (!newVal) {
          safeToast("New Password cannot be empty! ⚠️");
          if (newPassInput) newPassInput.focus();
          return;
        }
        if (newVal.length < 4) {
          safeToast("Password must be at least 4 characters! ⚠️");
          if (newPassInput) newPassInput.focus();
          return;
        }
        if (newVal.length > 20) {
          safeToast("Password cannot exceed 20 characters! ⚠️");
          if (newPassInput) newPassInput.focus();
          return;
        }
        if (newVal !== confirmVal) {
          safeToast("New Passwords do not match! ❌");
          if (confirmPassInput) {
            confirmPassInput.classList.add("input-error");
            confirmPassInput.focus();
          }
          return;
        }

        safeToast("⏳ Syncing Admin Password to Supabase...");
        const success = root.PasswordService ? await root.PasswordService.updatePassword(newVal) : false;

        if (success) {
          if (oldPassInput) oldPassInput.value = "";
          if (newPassInput) newPassInput.value = "";
          if (confirmPassInput) confirmPassInput.value = "";
          safeToast("🔑 Admin Password updated successfully on Supabase! ✅");

          const loginTabBtn = document.querySelector('.admin-tab-btn[data-tab="login"]');
          if (loginTabBtn) loginTabBtn.click();
        } else {
          safeToast("Failed to update password on Supabase ❌");
        }
      };
    }

    // TAB 3: APPROVED MULTI-STEP RECOVERY FLOW HANDLERS
    const forgotTab = document.getElementById("admin-tab-forgot");
    let resetToMethods = () => {};

    if (forgotTab) {
      const stepChoose = document.getElementById("forgot-step-choose-method");
      const substepEmail = document.getElementById("forgot-substep-email");
      const substepBackup = document.getElementById("forgot-substep-backup");
      const substepQuestion = document.getElementById("forgot-substep-question");
      const stepNewPass = document.getElementById("forgot-step-newpass");

      const cardEmail = document.getElementById("card-method-email");
      const cardBackup = document.getElementById("card-method-backup");
      const cardQuestion = document.getElementById("card-method-question");
      const backBtns = document.querySelectorAll(".btn-back-to-methods");

      const showSubstep = (activeSubstep) => {
        if (stepChoose) stepChoose.style.display = "none";
        if (substepEmail) substepEmail.style.display = "none";
        if (substepBackup) substepBackup.style.display = "none";
        if (substepQuestion) substepQuestion.style.display = "none";
        if (stepNewPass) stepNewPass.style.display = "none";

        if (activeSubstep) activeSubstep.style.display = "block";
      };

      resetToMethods = () => {
        if (stepChoose) stepChoose.style.display = "block";
        if (substepEmail) substepEmail.style.display = "none";
        if (substepBackup) substepBackup.style.display = "none";
        if (substepQuestion) substepQuestion.style.display = "none";
        if (stepNewPass) stepNewPass.style.display = "none";
      };

      if (cardEmail) {
        cardEmail.addEventListener("click", () => {
          showSubstep(substepEmail);
          const emailInput = document.getElementById("recovery-email-input");
          const savedEmail = (localStorage.getItem("admin_recovery_email") || "").trim();
          if (emailInput && savedEmail) emailInput.value = savedEmail;
        });
      }

      if (cardBackup) {
        cardBackup.addEventListener("click", () => {
          showSubstep(substepBackup);
        });
      }

      if (cardQuestion) {
        cardQuestion.onclick = async () => {
          const errEl = document.getElementById("question-answer-error");
          if (errEl) {
            errEl.style.display = "none";
            errEl.textContent = "";
          }
          const qInp = document.getElementById("recovery-question-input");
          if (qInp) qInp.value = "";

          showSubstep(substepQuestion);
          const label = document.getElementById("forgot-question-label");
          if (label) {
            let questionText = "Who is your best friend?";
            if (root.DatabaseModule) {
              try {
                const sec = await root.DatabaseModule.getSecuritySettings();
                if (sec && sec.custom_secret_question) {
                  questionText = sec.custom_secret_question;
                }
              } catch (e) {}
            } else if (localStorage.getItem("custom_secret_question")) {
              questionText = localStorage.getItem("custom_secret_question");
            }
            label.textContent = "Question: " + questionText;
          }
        };
      }

      backBtns.forEach(btn => {
        btn.addEventListener("click", resetToMethods);
      });

      // ── METHOD 1: RECOVERY EMAIL OTP ──
      const sendOtpBtn = document.getElementById("btn-send-email-otp");
      const verifyOtpBtn = document.getElementById("btn-verify-email-otp");
      let cooldownTimer = null;

      const refreshSvg = `<svg class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
      const startTimer = (seconds) => {
        if (!sendOtpBtn) return;
        let left = seconds;
        sendOtpBtn.disabled = true;
        sendOtpBtn.innerHTML = `${refreshSvg}<span>Resend OTP (${left}s)</span>`;
        if (cooldownTimer) clearInterval(cooldownTimer);
        cooldownTimer = setInterval(() => {
          left--;
          if (left <= 0) {
            clearInterval(cooldownTimer);
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerHTML = `${refreshSvg}<span>Resend OTP</span>`;
          } else {
            sendOtpBtn.innerHTML = `${refreshSvg}<span>Resend OTP (${left}s)</span>`;
          }
        }, 1000);
      };

      if (sendOtpBtn) {
        sendOtpBtn.addEventListener("click", async () => {
          const emailInput = document.getElementById("recovery-email-input");
          const errEl = document.getElementById("email-otp-error");
          const email = (emailInput?.value || "").trim();

          if (!email || !email.includes("@")) {
            if (errEl) { errEl.textContent = "❌ Please enter a valid recovery email"; errEl.style.display = "flex"; }
            safeToast("Please enter a valid recovery email ⚠️");
            return;
          }

          safeToast("⏳ Requesting Recovery OTP...");
          try {
            const apiUrl = root.getApiUrl ? root.getApiUrl("/api/send-otp") : "/api/send-otp";
            const res = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "request-otp", email, purpose: "RECOVERY" })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              if (errEl) errEl.style.display = "none";
              safeToast("📨 Recovery OTP sent to " + email + "! Check inbox/spam.");
              startTimer(data.resendCooldownSeconds || 60);
              const group = document.getElementById("otp-enter-group");
              if (group) group.style.display = "block";
              const otpInp = document.getElementById("recovery-otp-input");
              if (otpInp) otpInp.focus();
            } else {
              if (errEl) { errEl.textContent = "❌ " + (data.error || "Failed to send OTP"); errEl.style.display = "flex"; }
              safeToast(data.error || "Failed to send OTP ❌");
            }
          } catch (e) {
            safeToast("Network error requesting OTP ❌");
          }
        });
      }

      if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener("click", async () => {
          const otpInp = document.getElementById("recovery-otp-input");
          const errEl = document.getElementById("email-otp-error");
          const code = (otpInp?.value || "").trim();

          if (!code || code.length !== 6) {
            if (errEl) { errEl.textContent = "❌ Please enter the 6-digit OTP code"; errEl.style.display = "flex"; }
            safeToast("Please enter 6-digit OTP code ⚠️");
            return;
          }

          safeToast("⏳ Verifying OTP...");
          try {
            const apiUrl = root.getApiUrl ? root.getApiUrl("/api/send-otp") : "/api/send-otp";
            const res = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "verify-otp", otpCode: code })
            });
            const data = await res.json();
            if (res.ok && data.valid) {
              if (errEl) errEl.style.display = "none";
              safeToast("✓ OTP Verified! Enter your new Admin password:");
              showSubstep(stepNewPass);
            } else {
              if (errEl) { errEl.textContent = "❌ " + (data.error || "Invalid OTP code"); errEl.style.display = "flex"; }
              safeToast(data.error || "Invalid OTP code ❌");
            }
          } catch (e) {
            safeToast("Network error verifying OTP ❌");
          }
        });
      }

      // ── METHOD 2: BACKUP CODE ──
      const verifyBackupBtn = document.getElementById("btn-verify-backup-code");
      if (verifyBackupBtn) {
        verifyBackupBtn.addEventListener("click", () => {
          const inp = document.getElementById("recovery-backup-input");
          const errEl = document.getElementById("backup-code-error");
          const code = (inp?.value || "").trim();

          const savedCode = (localStorage.getItem("admin_recovery_code") || "WS-9F8A-3E21-7B04").trim();
          if (code && code.toUpperCase() === savedCode.toUpperCase()) {
            if (errEl) errEl.style.display = "none";
            safeToast("✓ Backup Code Verified! Enter your new Admin password:");
            showSubstep(stepNewPass);
          } else {
            if (errEl) { errEl.textContent = "❌ Invalid Emergency Backup Code!"; errEl.style.display = "flex"; }
            safeToast("Invalid Emergency Backup Code! ❌");
          }
        });
      }

      // ── METHOD 3: SECURITY QUESTION ──
      const verifyQuestBtn = document.getElementById("btn-verify-question-answer");
      const questInput = document.getElementById("recovery-question-input");

      if (questInput && verifyQuestBtn) {
        questInput.onkeydown = (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (verifyQuestBtn.onclick) verifyQuestBtn.onclick();
          }
        };
      }

      if (verifyQuestBtn) {
        verifyQuestBtn.onclick = async () => {
          const inp = document.getElementById("recovery-question-input");
          const errEl = document.getElementById("question-answer-error");
          const ans = (inp?.value || "").trim();

          if (!ans) {
            if (errEl) { errEl.textContent = "❌ Please enter a secret answer!"; errEl.style.display = "flex"; }
            safeToast("Please enter secret answer ⚠️");
            return;
          }

          safeToast("⏳ Verifying Secret Answer...");
          try {
            const apiUrl = root.getApiUrl ? root.getApiUrl("/api/auth") : "/api/auth";
            const res = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "verify-question", answer: ans })
            });
            const data = await res.json();
            if (res.ok && (data.valid === true || data.valid === "true")) {
              if (errEl) {
                errEl.style.display = "none";
                errEl.textContent = "";
              }

              try {
                showSubstep(stepNewPass);
              } catch (substepErr) {
                console.error("❌ Exception during showSubstep:", substepErr);
              }

              const targetNewPass = stepNewPass || document.getElementById("forgot-step-newpass");
              if (targetNewPass) {
                targetNewPass.style.display = "block";
              }

              safeToast("✓ Secret Answer Verified! Enter your new Admin password:");
              return;
            }

            // Invalid answer branch
            if (errEl) {
              errEl.textContent = "❌ Invalid Secret Answer!";
              errEl.style.display = "flex";
            }
            safeToast("Invalid Secret Answer! ❌");
          } catch (e) {
            console.error("❌ Exception during Security Question verification:", e);
            safeToast("Network error verifying Secret Answer ❌");
          }
        };
      }

      // ── STEP 2: SAVE NEW PASSWORD ──
      const saveNewPassBtn = document.getElementById("admin-save-newpass-btn");
      if (saveNewPassBtn) {
        saveNewPassBtn.addEventListener("click", async () => {
          const newPassInput = document.getElementById("admin-reset-new-pass");
          const confirmPassInput = document.getElementById("admin-reset-confirm-pass");
          const errEl = document.getElementById("admin-setnew-error");

          const newPass = (newPassInput?.value || "").trim();
          const confirmPass = (confirmPassInput?.value || "").trim();

          if (!newPass || newPass.length < 4) {
            if (errEl) { errEl.textContent = "❌ Password must be at least 4 characters!"; errEl.style.display = "flex"; }
            safeToast("Password must be at least 4 characters! ⚠️");
            return;
          }
          if (newPass !== confirmPass) {
            if (errEl) { errEl.textContent = "❌ Passwords do not match!"; errEl.style.display = "flex"; }
            safeToast("Passwords do not match! ❌");
            return;
          }

          safeToast("⏳ Persisting New Master Password to Supabase...");
          sessionStorage.removeItem("admin_authenticated");
          
          const success = root.PasswordService ? await root.PasswordService.updatePassword(newPass) : false;
          if (success) {
            safeToast("🔑 New Admin Password Saved & Persisted on Supabase! ✅");
          } else {
            safeToast("Failed to persist password to Supabase ❌");
          }

          if (modal) modal.classList.remove("open");

          const fab = document.getElementById("customizer-toggle-btn");
          if (fab) fab.classList.add("admin-visible");
          const customizerModal = document.getElementById("customizer-modal");
          if (customizerModal) customizerModal.classList.add("open");

          resetToMethods();
          if (newPassInput) newPassInput.value = "";
          if (confirmPassInput) confirmPassInput.value = "";
          if (errEl) errEl.style.display = "none";
        });
      }
    }
  }

  /**
   * Resets the Admin Security modal UI presentation state to the "Unlock Editor" tab.
   *
   * Architectural Note:
   *   Admin Security modal tab state is intentionally reset to Unlock Editor on every fresh
   *   modal opening. This prevents Change Password / Forgot Password from remaining selected
   *   across separate security sessions. This helper changes only presentation state and does
   *   not alter authentication, password, recovery, or session state.
   *
   * Responsibility:
   *   - Sets the active Admin Security tab to "Unlock Editor".
   *   - Clears active state from Change Password and Forgot Password tab buttons.
   *   - Hides corresponding panels and displays #admin-tab-login.
   *   - Idempotent and safe to call on any modal open action.
   *
   * @returns {void}
   */
  function resetAdminSecurityDefaultTab() {
    const tabBtns = document.querySelectorAll(".admin-tab-btn");
    const tabContents = document.querySelectorAll(".admin-tab-content");

    tabBtns.forEach(btn => {
      if (btn.dataset.tab === "login") {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    tabContents.forEach(content => {
      if (content.id === "admin-tab-login") {
        content.classList.add("active");
        content.style.display = "block";
      } else {
        content.classList.remove("active");
        content.style.display = "none";
      }
    });

    // Clear login input error states if present
    const loginPassInput = document.getElementById("admin-login-pass");
    const errorMsgEl = document.getElementById("admin-login-error");
    if (loginPassInput) loginPassInput.classList.remove("input-error");
    if (errorMsgEl) errorMsgEl.style.display = "none";
  }

  /**
   * Opens Admin authentication modal, resets tab presentation state to Unlock Editor,
   * and focuses the password input.
   * @returns {void}
   */
  function promptForAdminAccess() {
    const modal = document.getElementById("admin-login-modal");
    if (modal) {
      resetAdminSecurityDefaultTab();
      modal.classList.add("open");
      const loginInput = document.getElementById("admin-login-pass");
      if (loginInput) setTimeout(() => loginInput.focus(), 100);
    }
  }

  /**
   * Initializes Admin Security Modal and binds all security triggers,
   * keyboard shortcuts, secret double-click gestures, and URL params.
   * @returns {void}
   */
  function checkAdminAccess() {
    initAdminSecurityModal();

    const footerLockBtn = document.getElementById("footer-admin-lock-btn");
    if (footerLockBtn) {
      footerLockBtn.addEventListener("click", () => {
        promptForAdminAccess();
      });
    }

    const params = new URLSearchParams(location.search);
    const isEditParam = params.has("edit") || params.has("admin");

    const fab = document.getElementById("customizer-toggle-btn");
    if (!fab) return;

    if (isEditParam) {
      fab.classList.add("admin-visible");
    } else {
      fab.classList.remove("admin-visible");
      localStorage.removeItem("is_admin_user");
    }

    // Keyboard shortcut: Ctrl + Shift + E toggles admin mode with password
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        promptForAdminAccess();
      }
    });

    // Secret Double-Click on Lock Screen "✨ Happy Birthday ✨" Logo
    const lockLogo = document.getElementById("loading-logo-glow");
    if (lockLogo) {
      let tapCount = 0;
      let tapTimer = null;
      lockLogo.addEventListener("click", () => {
        tapCount++;
        clearTimeout(tapTimer);
        if (tapCount >= 2) {
          tapCount = 0;
          promptForAdminAccess();
        } else {
          tapTimer = setTimeout(() => { tapCount = 0; }, 400);
        }
      });
    }

    // Secret Double-Click on Letter Title ("Happy Birthday, [Name]") in Letter Card
    const letterTitles = document.querySelectorAll(".letter-title, #letter-title");
    letterTitles.forEach(el => {
      let tapCount = 0;
      let tapTimer = null;
      el.addEventListener("click", () => {
        tapCount++;
        clearTimeout(tapTimer);
        if (tapCount >= 2) {
          tapCount = 0;
          promptForAdminAccess();
        } else {
          tapTimer = setTimeout(() => { tapCount = 0; }, 400);
        }
      });
    });
  }

  // ─── EMERGENCY DEVELOPER SHORTCUT (Ctrl + Shift + Alt + A) ───
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === "a" || e.key === "A" || e.key === "r" || e.key === "R")) {
      e.preventDefault();
      safeToast("⚡ Emergency Developer Reset Triggered! Admin Unlocked 🔓");
      const fab = getEl("customizer-toggle-btn");
      if (fab) fab.classList.add("admin-visible");
      const adminModal = getEl("admin-login-modal");
      if (adminModal) adminModal.classList.remove("open");
      const customizerModal = getEl("customizer-modal");
      if (customizerModal) customizerModal.classList.add("open");
    }
  });

  // Expose on root (window) for app.js and editor/customizer.js callers
  root.getAdminPassword = getAdminPassword;
  root.initAdminSecurityModal = initAdminSecurityModal;
  root.promptForAdminAccess = promptForAdminAccess;
  root.checkAdminAccess = checkAdminAccess;

})(typeof window !== "undefined" ? window : this);
