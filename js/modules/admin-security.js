(function (root) {
  "use strict";

  function safeToast(msg) {
    const toastFn = root.showToast || (typeof showToast === "function" ? showToast : (m) => console.log(m));
    toastFn(msg);
  }

  function getEl(id) {
    if (root.DOM && typeof root.DOM.get === "function") return root.DOM.get(id);
    return document.getElementById(id);
  }

  async function getAdminPassword(forceRefresh = false) {
    if (root.PasswordService && typeof root.PasswordService.getPassword === "function") {
      return await root.PasswordService.getPassword(forceRefresh);
    }
    return null;
  }

  function clearSecurityInputs() {
    ["admin-login-pass", "admin-old-pass", "admin-new-pass", "admin-confirm-pass", "admin-reset-new-pass", "admin-reset-confirm-pass", "recovery-backup-input", "recovery-otp-input"].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ""; el.classList.remove("input-error"); }
    });
    ["admin-login-error", "admin-change-error", "email-otp-error", "backup-code-error", "admin-setnew-error"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
  }

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
    if (closeBtn) closeBtn.onclick = () => { clearSecurityInputs(); modal.classList.remove("open"); };
    modal.onclick = (e) => { if (e.target === modal) { clearSecurityInputs(); modal.classList.remove("open"); } };

    document.querySelectorAll(".pass-input-wrap .eye-toggle").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute("data-target") || btn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;
        const isPass = input.type === "password";
        input.type = isPass ? "text" : "password";
        const openSvg = btn.querySelector(".eye-open");
        const closedSvg = btn.querySelector(".eye-closed");
        if (openSvg && closedSvg) {
          openSvg.style.display = isPass ? "none" : "block";
          closedSvg.style.display = isPass ? "block" : "none";
        }
        btn.setAttribute("aria-label", isPass ? "Hide password" : "Show password");
      });
    });

    tabBtns.forEach(btn => {
      btn.onclick = () => {
        clearSecurityInputs();
        const tabName = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove("active"));
        tabContents.forEach(c => { c.classList.remove("active"); c.style.display = "none"; });

        btn.classList.add("active");
        const targetContent = document.getElementById(`admin-tab-${tabName}`);
        if (targetContent) {
          targetContent.classList.add("active");
          targetContent.style.display = "block";
        }
        if (tabName === "security") {
          const activeSub = document.querySelector(".security-subtab-btn.active")?.dataset.subtab || "change";
          const subContent = document.getElementById(`security-subtab-${activeSub}`);
          if (subContent) {
            subContent.classList.add("active");
            subContent.style.display = "block";
          }
          if (activeSub === "forgot" && typeof resetToMethods === "function") resetToMethods();
        }
      };
    });

    const subtabBtns = document.querySelectorAll(".security-subtab-btn");
    const subtabContents = document.querySelectorAll(".security-subtab-content");

    subtabBtns.forEach(btn => {
      btn.onclick = () => {
        clearSecurityInputs();
        const subName = btn.dataset.subtab;
        subtabBtns.forEach(b => b.classList.remove("active"));
        subtabContents.forEach(c => { c.classList.remove("active"); c.style.display = "none"; });

        btn.classList.add("active");
        const targetSub = document.getElementById(`security-subtab-${subName}`);
        if (targetSub) {
          targetSub.classList.add("active");
          targetSub.style.display = "block";
        }
        if (subName === "forgot" && typeof resetToMethods === "function") resetToMethods();
      };
    });

    let failedAttempts = 0;
    let cooldownRemaining = 0;
    let cooldownIntervalId = null;

    function triggerCooldown(seconds) {
      cooldownRemaining = seconds;
      if (cooldownIntervalId) clearInterval(cooldownIntervalId);

      const updateBtns = () => {
        const label = `Please wait (${cooldownRemaining}s)`;
        if (loginSubmitBtn) { loginSubmitBtn.disabled = true; loginSubmitBtn.textContent = label; }
        if (openDashboardBtn) { openDashboardBtn.disabled = true; openDashboardBtn.textContent = label; }
      };

      updateBtns();
      cooldownIntervalId = setInterval(() => {
        cooldownRemaining--;
        if (cooldownRemaining <= 0) {
          clearInterval(cooldownIntervalId);
          cooldownIntervalId = null;
          if (loginSubmitBtn) { loginSubmitBtn.disabled = false; loginSubmitBtn.textContent = "Unlock Quick Editor 🔓"; }
          if (openDashboardBtn) { openDashboardBtn.disabled = false; openDashboardBtn.textContent = "Open Admin Dashboard 🚀"; }
        } else {
          updateBtns();
        }
      }, 1000);
    }

    async function verifyPasswordSubmission(onSuccess) {
      if (cooldownRemaining > 0) {
        safeToast(`Too many attempts. Please wait ${cooldownRemaining}s ⏳`);
        return;
      }

      const entered = (loginPassInput?.value || "").trim();
      if (!entered) {
        safeToast("Please enter Admin Password 🔑");
        if (loginPassInput) { loginPassInput.classList.add("input-error"); loginPassInput.focus(); }
        return;
      }

      safeToast("⏳ Verifying Admin Password...");
      const isValid = root.PasswordService ? await root.PasswordService.verifyPassword(entered) : false;

      if (isValid) {
        failedAttempts = 0;
        if (cooldownIntervalId) { clearInterval(cooldownIntervalId); cooldownIntervalId = null; cooldownRemaining = 0; }
        sessionStorage.setItem("admin_authenticated", "true");
        sessionStorage.setItem("admin_auth_timestamp", String(Date.now()));
        if (root.AdminLogs?.log) root.AdminLogs.log("ADMIN_LOGIN", "Creator session authenticated successfully", "SUCCESS");
        if (loginPassInput) { loginPassInput.value = ""; loginPassInput.classList.remove("input-error"); }
        const errorMsgEl = document.getElementById("admin-login-error");
        if (errorMsgEl) errorMsgEl.style.display = "none";
        modal.classList.remove("open");
        const fab = document.getElementById("customizer-toggle-btn");
        if (fab) fab.classList.add("admin-visible");
        if (typeof onSuccess === "function") onSuccess();
      } else {
        failedAttempts++;
        if (root.AdminLogs?.log) root.AdminLogs.log("AUTH_FAILED", `Failed password attempt (Attempt ${failedAttempts})`, "WARNING");
        if (loginPassInput) { loginPassInput.value = ""; loginPassInput.classList.add("input-error"); loginPassInput.focus(); }

        const modalCard = modal.querySelector(".admin-modal-content") || modal.querySelector(".modal-card") || modal.querySelector(".modal-content") || modal;
        if (modalCard) {
          modalCard.classList.remove("shake-error");
          void modalCard.offsetWidth;
          modalCard.classList.add("shake-error");
        }

        const errorMsgEl = document.getElementById("admin-login-error");
        if (errorMsgEl) errorMsgEl.style.display = "flex";

        if (failedAttempts >= 8) {
          triggerCooldown(30);
          safeToast("Too many incorrect attempts. Cooldown: 30s ⏳");
        } else if (failedAttempts >= 5) {
          triggerCooldown(15);
          safeToast("Too many incorrect attempts. Cooldown: 15s ⏳");
        } else {
          safeToast("Incorrect Admin Password ❌");
        }
      }
    }

    async function handleUnlock() {
      await verifyPasswordSubmission(() => {
        safeToast("👑 Admin Mode Activated!");
        const customizerModal = document.getElementById("customizer-modal");
        if (customizerModal) customizerModal.classList.add("open");
      });
    }

    const openDashboardBtn = document.getElementById("admin-open-dashboard-btn");
    async function handleOpenDashboard() {
      await verifyPasswordSubmission(() => {
        safeToast("👑 Admin Mode Activated! Opening Dashboard...");
        window.location.href = "admin.html";
      });
    }

    if (loginSubmitBtn) loginSubmitBtn.onclick = handleUnlock;
    if (openDashboardBtn) openDashboardBtn.onclick = handleOpenDashboard;
    if (loginPassInput) {
      loginPassInput.onkeydown = (e) => { if (e.key === "Enter") handleUnlock(); };
      loginPassInput.addEventListener("input", () => {
        loginPassInput.classList.remove("input-error");
        const errorMsgEl = document.getElementById("admin-login-error");
        if (errorMsgEl) errorMsgEl.style.display = "none";
      });
    }

    if (changeSubmitBtn) {
      changeSubmitBtn.onclick = async () => {
        const oldVal = (oldPassInput?.value || "").trim();
        const newVal = (newPassInput?.value || "").trim();
        const confirmVal = (confirmPassInput?.value || "").trim();

        if (!oldVal) {
          safeToast("Please enter your Current Password! ⚠️");
          if (oldPassInput) oldPassInput.focus();
          return;
        }

        const isOldCorrect = root.PasswordService ? await root.PasswordService.verifyPassword(oldVal) : false;
        if (!isOldCorrect) {
          safeToast("Current Password is wrong ❌");
          if (oldPassInput) { oldPassInput.classList.add("input-error"); oldPassInput.focus(); }
          return;
        }
        if (!newVal || newVal.length < 4) {
          safeToast("Password must be at least 4 characters! ⚠️");
          if (newPassInput) newPassInput.focus();
          return;
        }
        if (newVal !== confirmVal) {
          safeToast("Passwords do not match! ❌");
          if (confirmPassInput) { confirmPassInput.classList.add("input-error"); confirmPassInput.focus(); }
          return;
        }

        safeToast("⏳ Syncing Admin Password to Supabase...");
        const success = root.PasswordService ? await root.PasswordService.updatePassword(newVal) : false;

        if (success) {
          if (oldPassInput) oldPassInput.value = "";
          if (newPassInput) newPassInput.value = "";
          if (confirmPassInput) confirmPassInput.value = "";
          safeToast("🔑 Admin Password updated successfully on Supabase! ✅");

          const loginTabBtn = document.querySelector('.admin-tab-btn[data-tab="admin"]') || document.querySelector('.admin-tab-btn[data-tab="login"]');
          if (loginTabBtn) loginTabBtn.click();
        } else {
          safeToast("Failed to update password on Supabase ❌");
        }
      };
    }

    const forgotTab = document.getElementById("security-subtab-forgot") || document.getElementById("admin-tab-forgot");
    let resetToMethods = () => {};

    if (forgotTab) {
      const stepChoose = document.getElementById("forgot-step-choose-method");
      const substepEmail = document.getElementById("forgot-substep-email");
      const substepBackup = document.getElementById("forgot-substep-backup");
      const stepNewPass = document.getElementById("forgot-step-newpass");

      const cardEmail = document.getElementById("card-method-email");
      const cardBackup = document.getElementById("card-method-backup");
      const backBtns = document.querySelectorAll(".btn-back-to-methods");

      const allSubsteps = [stepChoose, substepEmail, substepBackup, stepNewPass];
      const showSubstep = (activeSubstep) => {
        allSubsteps.forEach(el => { if (el) el.style.display = (el === activeSubstep ? "block" : "none"); });
      };
      resetToMethods = () => showSubstep(stepChoose);

      if (cardEmail) {
        cardEmail.addEventListener("click", async () => {
          showSubstep(substepEmail);
          const emailInput = document.getElementById("recovery-email-input");
          if (emailInput) {
            try {
              const dbSettings = root.DatabaseModule?.getSecuritySettings ? await root.DatabaseModule.getSecuritySettings() : null;
              if (dbSettings && dbSettings.admin_recovery_email) {
                emailInput.value = dbSettings.admin_recovery_email;
              }
            } catch (e) {}
          }
        });
      }

      function normalizeRecoveryTimestamp(timestamp) {
        if (!timestamp || (typeof timestamp !== "string" && typeof timestamp !== "number" && !(timestamp instanceof Date))) {
          return null;
        }
        const ms = new Date(timestamp).getTime();
        return Number.isFinite(ms) ? ms : null;
      }

      const getActiveRecoveryCode = () => {
        return (sessionStorage.getItem("bw_active_recovery_code") || document.getElementById("forgot-backup-code-display")?.textContent || "").trim();
      };

      const updateAllRecoveryCodeElements = (newCode) => {
        if (!newCode) return;
        document.querySelectorAll("#forgot-backup-code-display, #sec-code-display, .sec-backup-code-val").forEach(el => {
          el.textContent = newCode;
        });
      };

      if (cardBackup) {
        cardBackup.addEventListener("click", async () => {
          showSubstep(substepBackup);
          try {
            const dbSettings = root.DatabaseModule?.getSecuritySettings ? await root.DatabaseModule.getSecuritySettings() : null;
            const hasServerCode = !!dbSettings?.has_recovery_code;
            const serverCodeTime = dbSettings?.recovery_code_updated_at;
            const sessionCode = sessionStorage.getItem("bw_active_recovery_code");
            const sessionTime = sessionStorage.getItem("bw_active_recovery_code_time");

            const normSession = normalizeRecoveryTimestamp(sessionTime);
            const normServer = normalizeRecoveryTimestamp(serverCodeTime);

            if (hasServerCode && sessionCode && normSession !== null && normServer !== null && normSession === normServer) {
              updateAllRecoveryCodeElements(sessionCode);
            } else {
              sessionStorage.removeItem("bw_active_recovery_code");
              sessionStorage.removeItem("bw_active_recovery_code_time");
              updateAllRecoveryCodeElements("••••-••••-••••-••••");
            }
          } catch (e) {
            updateAllRecoveryCodeElements("••••-••••-••••-••••");
          }
        });
      }

      const qeCopyBtn = document.querySelector("#forgot-substep-backup .btn-copy-code-action");
      if (qeCopyBtn) {
        qeCopyBtn.onclick = async (e) => {
          e.preventDefault();
          const code = getActiveRecoveryCode();
          if (!code || code.includes("•")) {
            safeToast("No active code generated in this tab. Click Generate New Code ⚠️");
            return;
          }
          try {
            if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(code);
            const orig = qeCopyBtn.innerHTML;
            qeCopyBtn.innerHTML = "✓ Copied!";
            qeCopyBtn.style.borderColor = "#22c55e";
            setTimeout(() => { qeCopyBtn.innerHTML = orig; qeCopyBtn.style.borderColor = "rgba(255, 255, 255, 0.2)"; }, 1500);
            safeToast("📋 Backup code copied to clipboard!");
          } catch (err) { console.error("Copy error:", err); }
        };
      }

      const qeDlBtn = document.querySelector("#forgot-substep-backup .btn-download-code-action");
      if (qeDlBtn) {
        qeDlBtn.onclick = (e) => {
          e.preventDefault();
          const code = getActiveRecoveryCode();
          if (!code || code.includes("•")) {
            safeToast("No active code generated in this tab. Click Generate New Code ⚠️");
            return;
          }
          const txt = `Wish Studio - Emergency Backup Code\nGenerated: ${new Date().toLocaleString()}\nCode: ${code}\nKeep this code secure.`;
          const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
          const a = document.createElement("a");
          const dlUrl = URL.createObjectURL(blob);
          a.href = dlUrl;
          a.download = "WishStudio-Backup-Code.txt";
          a.click();
          setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);
          safeToast("📥 WishStudio-Backup-Code.txt downloaded!");
        };
      }

      const qePrintBtn = document.querySelector("#forgot-substep-backup .btn-print-code-action");
      if (qePrintBtn) {
        qePrintBtn.onclick = (e) => {
          e.preventDefault();
          const code = getActiveRecoveryCode();
          if (!code || code.includes("•")) {
            safeToast("No active code generated in this tab. Click Generate New Code ⚠️");
            return;
          }
          const pw = window.open ? window.open("", "_blank") : null;
          if (pw) {
            pw.document.write(`<!DOCTYPE html><html><head><title>Emergency Recovery Code</title><style>body{font-family:sans-serif;padding:24px;text-align:center;background:#0F0A1C;color:#fff;}.card{border:2px dashed #F7C94A;padding:20px;border-radius:12px;max-width:380px;margin:auto;background:#1B1530;}.code{font-family:monospace;font-size:24px;font-weight:bold;letter-spacing:3px;color:#F7C94A;margin:12px 0;padding:10px;background:#120D24;border-radius:8px;}</style></head><body><div class="card"><h2>👑 Wish Studio</h2><p>Emergency Recovery Code</p><div class="code">${code}</div><p style="font-size:12px;color:#CBD5E1;">Generated: ${new Date().toLocaleString()}</p></div><script>window.onload=function(){window.print();};<\/script></body></html>`);
            pw.document.close();
          }
        };
      }

      const qeRegenBtn = document.querySelector("#forgot-substep-backup .btn-regen-code-action");
      if (qeRegenBtn) {
        qeRegenBtn.onclick = async (e) => {
          e.preventDefault();
          const segment = () => Math.floor(0x1000 + Math.random() * 0xF000).toString(16).toUpperCase();
          const newCode = `WS-${segment()}-${segment()}-${segment()}`;
          safeToast("⏳ Hashing and persisting new Emergency Recovery Code...");
          try {
            const apiUrl = root.getApiUrl ? root.getApiUrl("/api/auth") : "/api/auth";
            const res = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "save-recovery-code", code: newCode })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              sessionStorage.setItem("bw_active_recovery_code", newCode);
              if (data.updatedAt) sessionStorage.setItem("bw_active_recovery_code_time", data.updatedAt);
              updateAllRecoveryCodeElements(newCode);

              const backupCard = document.getElementById("forgot-backup-card-wrapper");
              if (backupCard) {
                backupCard.style.transform = "scale(1.03)";
                backupCard.style.borderColor = "#22c55e";
                setTimeout(() => { backupCard.style.transform = "scale(1)"; backupCard.style.borderColor = "#F7C94A"; }, 1000);
              }
              safeToast("✓ New Emergency Recovery Code Generated & Hashed on Server! ✅");
            } else {
              safeToast(data.message || data.error || "Failed to persist recovery code on server ❌");
            }
          } catch (err) {
            safeToast("Network error saving recovery code ❌");
          }
        };
      }

      backBtns.forEach(btn => {
        btn.onclick = () => {
          clearSecurityInputs();
          resetToMethods();
        };
      });

      let emailCooldown = 0;
      let emailTimerId = null;
      const sendEmailOtpBtn = document.getElementById("btn-send-email-otp");
      const verifyOtpBtn = document.getElementById("btn-verify-email-otp");

      function startTimer(seconds) {
        emailCooldown = seconds;
        if (emailTimerId) clearInterval(emailTimerId);
        const updateBtn = () => {
          if (sendEmailOtpBtn) {
            sendEmailOtpBtn.disabled = true;
            sendEmailOtpBtn.textContent = `Resend OTP (${emailCooldown}s)`;
          }
        };
        updateBtn();
        emailTimerId = setInterval(() => {
          emailCooldown--;
          if (emailCooldown <= 0) {
            clearInterval(emailTimerId);
            emailTimerId = null;
            if (sendEmailOtpBtn) {
              sendEmailOtpBtn.disabled = false;
              sendEmailOtpBtn.textContent = "Send OTP 📧";
            }
          } else {
            updateBtn();
          }
        }, 1000);
      }

      if (sendEmailOtpBtn) {
        sendEmailOtpBtn.addEventListener("click", async () => {
          if (emailCooldown > 0) return;
          const emailInput = document.getElementById("recovery-email-input");
          const errEl = document.getElementById("email-otp-error");
          const email = (emailInput?.value || "").trim();

          if (!email || !email.includes("@")) {
            if (errEl) { errEl.textContent = "❌ Please enter a valid email address"; errEl.style.display = "flex"; }
            safeToast("Please enter a valid email address ⚠️");
            return;
          }

          safeToast("⏳ Sending Recovery OTP...");
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
              const group = document.getElementById("otp-enter-group");
              if (group) group.style.display = "none";
              if (otpInp) otpInp.value = "";
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

      const verifyBackupBtn = document.getElementById("btn-verify-backup-code");
      if (verifyBackupBtn) {
        verifyBackupBtn.addEventListener("click", async () => {
          const inp = document.getElementById("recovery-backup-input");
          const errEl = document.getElementById("backup-code-error");
          const code = (inp?.value || "").trim();

          if (!code || code.length < 8) {
            if (errEl) { errEl.textContent = "❌ Please enter your Emergency Recovery Code!"; errEl.style.display = "flex"; }
            safeToast("Please enter your Emergency Recovery Code ⚠️");
            return;
          }

          safeToast("⏳ Verifying Emergency Recovery Code...");
          try {
            const apiUrl = root.getApiUrl ? root.getApiUrl("/api/auth") : "/api/auth";
            const res = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "verify-recovery-code", code: code.toUpperCase() })
            });
            const data = await res.json();

            if (res.ok && (data.valid === true || data.valid === "true")) {
              if (errEl) errEl.style.display = "none";
              if (inp) inp.value = "";
              try {
                sessionStorage.removeItem("bw_active_recovery_code");
                sessionStorage.removeItem("bw_active_recovery_code_time");
                if (typeof updateAllRecoveryCodeElements === "function") {
                  updateAllRecoveryCodeElements("••••-••••-••••-••••");
                }
              } catch (e) {}
              safeToast("✓ Emergency Recovery Code Verified! Enter your new Admin password:");
              showSubstep(stepNewPass);
              return;
            }

            const errMsg = data.error || data.message || "Invalid Emergency Recovery Code!";
            if (errEl) { errEl.textContent = "❌ " + errMsg; errEl.style.display = "flex"; }
            safeToast(errMsg + " ❌");
          } catch (e) {
            if (errEl) { errEl.textContent = "❌ Invalid Emergency Recovery Code!"; errEl.style.display = "flex"; }
            safeToast("Invalid Emergency Recovery Code! ❌");
          }
        });
      }

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
            sessionStorage.setItem("admin_authenticated", "true");
            safeToast("🔑 New Admin Password Saved & Persisted on Supabase! ✅");
            if (modal) modal.classList.remove("open");

            const fab = document.getElementById("customizer-toggle-btn");
            if (fab) fab.classList.add("admin-visible");
            const customizerModal = document.getElementById("customizer-modal");
            if (customizerModal) customizerModal.classList.add("open");

            resetToMethods();
            if (newPassInput) newPassInput.value = "";
            if (confirmPassInput) confirmPassInput.value = "";
            if (errEl) errEl.style.display = "none";
          } else {
            safeToast("Failed to persist password to Supabase ❌");
            if (errEl) { errEl.textContent = "❌ Failed to update password on Supabase"; errEl.style.display = "flex"; }
          }
        });
      }
    }
  }

  function resetAdminSecurityDefaultTab() {
    document.querySelectorAll(".admin-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === "admin" || btn.dataset.tab === "login");
    });
    document.querySelectorAll(".admin-tab-content").forEach(content => {
      const isDefault = content.id === "admin-tab-admin" || content.id === "admin-tab-login";
      content.classList.toggle("active", isDefault);
      content.style.display = isDefault ? "block" : "none";
    });

    document.querySelectorAll(".security-subtab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.subtab === "change");
    });
    document.querySelectorAll(".security-subtab-content").forEach(c => {
      const isChange = c.id === "security-subtab-change";
      c.classList.toggle("active", isChange);
      c.style.display = isChange ? "block" : "none";
    });

    clearSecurityInputs();
  }

  function promptForAdminAccess() {
    const modal = document.getElementById("admin-login-modal");
    if (modal) {
      resetAdminSecurityDefaultTab();
      modal.classList.add("open");
      const loginInput = document.getElementById("admin-login-pass");
      if (loginInput) setTimeout(() => loginInput.focus(), 100);
    }
  }

  function checkAdminAccess() {
    initAdminSecurityModal();

    const footerLockBtn = document.getElementById("footer-admin-lock-btn");
    if (footerLockBtn) footerLockBtn.addEventListener("click", () => promptForAdminAccess());

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

    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        promptForAdminAccess();
      }
    });

    const lockLogo = document.getElementById("loading-logo-glow");
    if (lockLogo) {
      let tapCount = 0, tapTimer = null;
      lockLogo.addEventListener("click", () => {
        tapCount++;
        clearTimeout(tapTimer);
        if (tapCount >= 2) { tapCount = 0; promptForAdminAccess(); }
        else { tapTimer = setTimeout(() => { tapCount = 0; }, 400); }
      });
    }

    window.addEventListener("storage", (e) => {
      if (e.key === "bw_admin_auth_sync") {
        try {
          const syncData = JSON.parse(e.newValue);
          if (syncData && syncData.action === "logout") {
            sessionStorage.removeItem("admin_authenticated");
            sessionStorage.removeItem("admin_session_token");
            sessionStorage.removeItem("admin_auth_timestamp");
            if (fab) fab.classList.remove("admin-visible");
            const customizerModal = getEl("customizer-modal");
            if (customizerModal) customizerModal.classList.remove("open", "active");
          }
        } catch (err) {}
      }
    });
  }

  root.AdminSecurityModule = Object.freeze({
    checkAdminAccess,
    promptForAdminAccess,
    getAdminPassword
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkAdminAccess);
  } else {
    checkAdminAccess();
  }

})(window);
