/**
 * ============================================================================
 * ADMIN STUDIO SECURITY MODULE (js/admin/admin-security.js)
 * Manages Admin Studio security settings and recovery channels:
 * - Credentials & Settings (Master Password changes, Email OTP configuration,
 *   Emergency Recovery Code management & Passkey WebAuthn foundation)
 * - Dedicated Interactive Emergency Recovery Channel Journey
 * - Canonical SVG Password Visibility Controls
 * ============================================================================
 */

(function (window) {
  "use strict";

  function safeToast(msg) {
    const fn = (window.AdminCore && window.AdminCore.showToast) || window.showToast || console.log;
    fn(msg);
  }

  const SELECTORS = {
    recoveryEmail: "sec-recovery-email",
    codeDisplay: "sec-code-display",
    savePassBtn: "sec-save-pass-btn",
    oldPass: "sec-old-pass",
    newPass: "sec-new-pass",
    confirmPass: "sec-confirm-pass",
    saveEmailBtn: "sec-save-email-btn",
    emailOtpBox: "sec-email-otp-box",
    emailOtpInput: "sec-email-otp-input",
    verifyEmailOtpBtn: "sec-verify-email-otp-btn",
    regenModal: "regen-confirm-modal"
  };

  let currentSettings = {
    admin_recovery_email: "",
    admin_recovery_code: "",
    recovery_email_verified: false
  };
  let cooldownInterval = null;
  let onEventHook = null;

  function generateBackupCode() {
    const segment = () => Math.floor(0x1000 + Math.random() * 0xF000).toString(16).toUpperCase();
    return `WS-${segment()}-${segment()}-${segment()}`;
  }

  function normalizeRecoveryTimestamp(timestamp) {
    if (!timestamp || (typeof timestamp !== "string" && typeof timestamp !== "number" && !(timestamp instanceof Date))) {
      return null;
    }
    const ms = new Date(timestamp).getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  function updateAllBackupCodeDisplays(code) {
    if (code && code !== "••••-••••-••••-••••") {
      currentSettings.admin_recovery_code = code;
      try { sessionStorage.setItem("bw_active_recovery_code", code); } catch (e) {}
    }
    const selectors = ["#sec-code-display", "#sec-backup-code-display", "#forgot-backup-code-display", ".sec-backup-code-val"];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.textContent = code || "••••-••••-••••-••••";
      });
    });
  }

  function startCooldownTimer(seconds, btn) {
    if (!btn) return;
    let left = seconds;
    btn.disabled = true;
    btn.textContent = `Resend OTP (${left}s)`;
    if (cooldownInterval) clearInterval(cooldownInterval);
    cooldownInterval = setInterval(() => {
      left--;
      if (left <= 0) {
        clearInterval(cooldownInterval);
        btn.disabled = false;
        btn.textContent = "📧 Send Verification OTP";
      } else {
        btn.textContent = `Resend OTP (${left}s)`;
      }
    }, 1000);
  }

  function initEyeToggles() {
    document.querySelectorAll(".pass-input-wrap .eye-toggle").forEach(btn => {
      if (btn.__eyeBound) return;
      btn.__eyeBound = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute("data-target");
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
  }

  function initSubnavTabs() {
    const tabBtns = document.querySelectorAll(".sec-tab-btn");
    tabBtns.forEach(btn => {
      if (btn.__tabBound) return;
      btn.__tabBound = true;
      btn.addEventListener("click", () => {
        const targetPaneId = btn.getAttribute("data-sec-pane");
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".sec-pane").forEach(p => {
          if (p.id === targetPaneId) {
            p.style.display = "block";
            p.classList.add("active");
          } else {
            p.style.display = "none";
            p.classList.remove("active");
          }
        });

        if (targetPaneId === "sec-pane-recovery") {
          const recTarget = document.getElementById("sec-rec-email-target");
          if (recTarget) {
            recTarget.textContent = currentSettings.admin_recovery_email || "admin@example.com";
          }
        }
      });
    });
  }

  function revealResetPasswordStep(channelName) {
    const stepEl = document.getElementById("sec-rec-step-resetpass");
    const msgEl = document.getElementById("sec-rec-verified-msg");
    if (msgEl) msgEl.textContent = `Identity Verified via ${channelName}`;
    if (stepEl) {
      stepEl.style.display = "block";
      stepEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    safeToast(`✓ ${channelName}! Please enter your new Admin password.`);
  }

  function initRecoveryJourney() {
    const methodCards = document.querySelectorAll(".recovery-channel-selector .recovery-method-card");
    methodCards.forEach(card => {
      if (card.__methodBound) return;
      card.__methodBound = true;
      card.addEventListener("click", () => {
        const method = card.getAttribute("data-method");
        methodCards.forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        const panels = { email: "sec-rec-panel-email", code: "sec-rec-panel-code" };
        Object.entries(panels).forEach(([m, panelId]) => {
          const el = document.getElementById(panelId);
          if (el) {
            el.style.display = m === method ? "block" : "none";
            el.classList.toggle("active", m === method);
          }
        });
      });
    });

    const recSendOtpBtn = document.getElementById("btn-sec-rec-send-otp");
    if (recSendOtpBtn && !recSendOtpBtn.__bound) {
      recSendOtpBtn.__bound = true;
      recSendOtpBtn.addEventListener("click", async () => {
        const email = currentSettings.admin_recovery_email || "admin@example.com";
        recSendOtpBtn.disabled = true;
        recSendOtpBtn.textContent = "⏳ Sending Recovery OTP...";
        safeToast("⏳ Sending Recovery OTP to " + email + "...");
        try {
          const apiUrl = window.getApiUrl ? window.getApiUrl("/api/send-otp") : "/api/send-otp";
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "request-otp", email, purpose: "RECOVERY" })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            safeToast("📨 Recovery OTP sent to " + email + "! Check inbox.");
            const otpBox = document.getElementById("sec-rec-email-otp-box");
            if (otpBox) otpBox.style.display = "flex";
            const otpInp = document.getElementById("sec-rec-email-otp-input");
            if (otpInp) { otpInp.value = ""; otpInp.focus(); }
          } else {
            safeToast(data.error || "Failed to send recovery OTP ❌");
          }
        } catch (e) {
          safeToast("Network error sending recovery OTP ❌");
        } finally {
          recSendOtpBtn.disabled = false;
          recSendOtpBtn.textContent = "📨 Send Recovery OTP";
        }
      });
    }

    const recVerifyOtpBtn = document.getElementById("btn-sec-rec-verify-otp");
    if (recVerifyOtpBtn && !recVerifyOtpBtn.__bound) {
      recVerifyOtpBtn.__bound = true;
      recVerifyOtpBtn.addEventListener("click", async () => {
        const email = currentSettings.admin_recovery_email || "admin@example.com";
        const code = (document.getElementById("sec-rec-email-otp-input")?.value || "").trim();
        if (!code || code.length !== 6) {
          safeToast("Please enter 6-digit OTP code ⚠️");
          return;
        }
        recVerifyOtpBtn.disabled = true;
        recVerifyOtpBtn.textContent = "⏳ Verifying...";
        safeToast("⏳ Verifying Recovery OTP...");
        try {
          const apiUrl = window.getApiUrl ? window.getApiUrl("/api/send-otp") : "/api/send-otp";
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "verify-otp", email, otpCode: code })
          });
          const data = await res.json();
          if (res.ok && (data.valid === true || data.valid === "true" || data.success === true)) {
            if (data.token && typeof sessionStorage !== "undefined") {
              sessionStorage.setItem("admin_session_token", data.token);
              sessionStorage.setItem("admin_authenticated", "true");
              sessionStorage.setItem("admin_auth_timestamp", String(Date.now()));
            }
            const otpBox = document.getElementById("sec-rec-email-otp-box");
            if (otpBox) otpBox.style.display = "none";
            const otpInp = document.getElementById("sec-rec-email-otp-input");
            if (otpInp) otpInp.value = "";
            revealResetPasswordStep("Recovery Email OTP");
          } else {
            safeToast(data.error || "Invalid Recovery OTP Code ❌");
          }
        } catch (e) {
          safeToast("Network error verifying OTP ❌");
        } finally {
          recVerifyOtpBtn.disabled = false;
          recVerifyOtpBtn.textContent = "✓ Verify OTP";
        }
      });
    }

    const recVerifyCodeBtn = document.getElementById("btn-sec-rec-verify-code");
    if (recVerifyCodeBtn && !recVerifyCodeBtn.__bound) {
      recVerifyCodeBtn.__bound = true;
      recVerifyCodeBtn.addEventListener("click", async () => {
        const code = (document.getElementById("sec-rec-code-input")?.value || "").trim();
        if (!code || code.length < 8) {
          safeToast("Please enter your Emergency Recovery Code ⚠️");
          return;
        }
        recVerifyCodeBtn.disabled = true;
        recVerifyCodeBtn.textContent = "⏳ Verifying...";
        safeToast("⏳ Verifying Emergency Recovery Code...");
        try {
          const apiUrl = window.getApiUrl ? window.getApiUrl("/api/auth") : "/api/auth";
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "verify-recovery-code", code: code.toUpperCase() })
          });
          const data = await res.json();
          if (res.ok && (data.valid === true || data.valid === "true")) {
            if (data.token && typeof sessionStorage !== "undefined") {
              sessionStorage.setItem("admin_session_token", data.token);
              sessionStorage.setItem("admin_authenticated", "true");
              sessionStorage.setItem("admin_auth_timestamp", String(Date.now()));
            }
            const codeInp = document.getElementById("sec-rec-code-input");
            if (codeInp) codeInp.value = "";
            try {
              sessionStorage.removeItem("bw_active_recovery_code");
              sessionStorage.removeItem("bw_active_recovery_code_time");
              const codeDisplay = document.getElementById("sec-code-display");
              if (codeDisplay) codeDisplay.textContent = "••••-••••-••••-••••";
            } catch (e) {}
            revealResetPasswordStep("Emergency Recovery Code");
          } else {
            safeToast(data.error || "Invalid Emergency Recovery Code ❌");
          }
        } catch (e) {
          safeToast("Network error verifying Recovery Code ❌");
        } finally {
          recVerifyCodeBtn.disabled = false;
          recVerifyCodeBtn.textContent = "🔑 Verify Recovery Code & Proceed";
        }
      });
    }

    const recSavePassBtn = document.getElementById("btn-sec-rec-save-newpass");
    if (recSavePassBtn && !recSavePassBtn.__bound) {
      recSavePassBtn.__bound = true;
      recSavePassBtn.addEventListener("click", async () => {
        const newPass = (document.getElementById("sec-rec-new-pass")?.value || "").trim();
        const confirmPass = (document.getElementById("sec-rec-confirm-pass")?.value || "").trim();
        if (!newPass || newPass.length < 4) {
          safeToast("New password must be at least 4 characters ⚠️");
          return;
        }
        if (newPass !== confirmPass) {
          safeToast("Passwords do not match ❌");
          return;
        }
        recSavePassBtn.disabled = true;
        recSavePassBtn.textContent = "⏳ Saving...";
        safeToast("⏳ Resetting Master Admin Password...");
        const success = window.PasswordService ? await window.PasswordService.updatePassword(newPass) : false;
        recSavePassBtn.disabled = false;
        recSavePassBtn.textContent = "🔒 Save New Master Password & Complete Recovery";
        if (success) {
          safeToast("🔑 Master Admin Password reset & saved successfully! ✅");
          const p1 = document.getElementById("sec-rec-new-pass");
          const p2 = document.getElementById("sec-rec-confirm-pass");
          if (p1) p1.value = "";
          if (p2) p2.value = "";
          const stepEl = document.getElementById("sec-rec-step-resetpass");
          if (stepEl) stepEl.style.display = "none";
          const otpBox = document.getElementById("sec-rec-email-otp-box");
          if (otpBox) otpBox.style.display = "none";
          const otpInp = document.getElementById("sec-rec-email-otp-input");
          if (otpInp) otpInp.value = "";
          const codeInp = document.getElementById("sec-rec-code-input");
          if (codeInp) codeInp.value = "";
          if (typeof onEventHook === "function") {
            onEventHook("PASSWORD_RESET_RECOVERY", "Master Admin Password reset via Recovery Channel");
          }
        } else {
          safeToast("Failed to reset password on Supabase ❌");
        }
      });
    }
  }

  async function initSecurityHandlers(onEventCallback) {
    if (typeof onEventCallback === "function") {
      onEventHook = onEventCallback;
    }

    // Initialize UI interaction controls
    initEyeToggles();
    initSubnavTabs();
    initRecoveryJourney();

    let hasServerCode = false;
    let serverCodeTime = null;
    if (window.DatabaseModule && typeof window.DatabaseModule.getSecuritySettings === "function") {
      try {
        const dbSettings = await window.DatabaseModule.getSecuritySettings();
        if (dbSettings && typeof dbSettings === "object") {
          currentSettings = { ...currentSettings, ...dbSettings };
          hasServerCode = !!dbSettings.has_recovery_code;
          serverCodeTime = dbSettings.recovery_code_updated_at;
        }
      } catch (e) {
        console.warn("AdminSecurity: Error fetching settings from DB:", e);
      }
    }

    const savedSessionCode = sessionStorage.getItem("bw_active_recovery_code");
    const savedSessionTime = sessionStorage.getItem("bw_active_recovery_code_time");

    const normSession = normalizeRecoveryTimestamp(savedSessionTime);
    const normServer = normalizeRecoveryTimestamp(serverCodeTime);

    if (hasServerCode && savedSessionCode && normSession !== null && normServer !== null && normSession === normServer) {
      currentSettings.admin_recovery_code = savedSessionCode;
      updateAllBackupCodeDisplays(savedSessionCode);
    } else {
      sessionStorage.removeItem("bw_active_recovery_code");
      sessionStorage.removeItem("bw_active_recovery_code_time");
      currentSettings.admin_recovery_code = "";
      updateAllBackupCodeDisplays("••••-••••-••••-••••");
    }

    const emailInput = document.getElementById(SELECTORS.recoveryEmail);
    if (emailInput) emailInput.value = currentSettings.admin_recovery_email || "";

    const recTarget = document.getElementById("sec-rec-email-target");
    if (recTarget) recTarget.textContent = currentSettings.admin_recovery_email || "admin@example.com";

    const savePassBtn = document.getElementById(SELECTORS.savePassBtn);
    if (savePassBtn && !savePassBtn.__secBound) {
      savePassBtn.__secBound = true;
      savePassBtn.addEventListener("click", async () => {
        const oldVal = (document.getElementById(SELECTORS.oldPass)?.value || "").trim();
        const newVal = (document.getElementById(SELECTORS.newPass)?.value || "").trim();
        const confirmVal = (document.getElementById(SELECTORS.confirmPass)?.value || "").trim();

        if (!oldVal) {
          safeToast("Please enter your current password ⚠️");
          return;
        }

        savePassBtn.disabled = true;
        safeToast("⏳ Verifying Current Master Password...");
        const isOldValid = window.PasswordService ? await window.PasswordService.verifyPassword(oldVal) : false;
        if (!isOldValid) {
          savePassBtn.disabled = false;
          safeToast("Current password is incorrect ❌");
          return;
        }

        if (!newVal || newVal.length < 4) {
          savePassBtn.disabled = false;
          safeToast("New password must be at least 4 characters ⚠️");
          return;
        }
        if (newVal !== confirmVal) {
          savePassBtn.disabled = false;
          safeToast("Passwords do not match ❌");
          return;
        }

        safeToast("⏳ Updating Master Password...");
        const success = window.PasswordService ? await window.PasswordService.updatePassword(newVal) : false;
        savePassBtn.disabled = false;

        if (success) {
          const oldInput = document.getElementById(SELECTORS.oldPass);
          const newInput = document.getElementById(SELECTORS.newPass);
          const confirmInput = document.getElementById(SELECTORS.confirmPass);
          if (oldInput) { oldInput.value = ""; oldInput.type = "password"; }
          if (newInput) { newInput.value = ""; newInput.type = "password"; }
          if (confirmInput) { confirmInput.value = ""; confirmInput.type = "password"; }
          document.querySelectorAll(".pass-input-wrap .eye-toggle").forEach(b => {
            const op = b.querySelector(".eye-open");
            const cl = b.querySelector(".eye-closed");
            if (op) op.style.display = "block";
            if (cl) cl.style.display = "none";
          });

          safeToast("🔑 Master Password updated successfully on Supabase! ✅");
          if (typeof onEventHook === "function") {
            onEventHook("PASSWORD_CHANGED", "Master Admin Password changed & persisted");
          }
        } else {
          safeToast("Failed to update password on Supabase ❌");
        }
      });
    }

    const saveEmailBtn = document.getElementById(SELECTORS.saveEmailBtn);
    const verifyEmailOtpBtn = document.getElementById(SELECTORS.verifyEmailOtpBtn);
    const otpBox = document.getElementById(SELECTORS.emailOtpBox);
    const otpInput = document.getElementById(SELECTORS.emailOtpInput);
    let isVerifyingOtp = false;
    let isSendingOtp = false;

    async function handleVerifyOtpAndSave() {
      if (isVerifyingOtp) return;
      const email = (document.getElementById(SELECTORS.recoveryEmail)?.value || "").trim();
      const code = (otpInput?.value || "").trim();

      if (!email || !email.includes("@")) {
        safeToast("Please enter a valid email address ⚠️");
        return;
      }
      if (!code || code.length !== 6) {
        safeToast("Please enter the 6-digit OTP code ⚠️");
        return;
      }

      isVerifyingOtp = true;
      if (verifyEmailOtpBtn) {
        verifyEmailOtpBtn.disabled = true;
        verifyEmailOtpBtn.textContent = "⏳ Verifying...";
      }

      safeToast("⏳ Verifying OTP...");
      try {
        const apiUrl = window.getApiUrl ? window.getApiUrl("/api/send-otp") : "/api/send-otp";
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save-recovery-email", email, otpCode: code })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          currentSettings.admin_recovery_email = email;
          currentSettings.recovery_email_verified = true;
          safeToast("✓ Recovery email verified and saved successfully! ✅");
          if (otpBox) otpBox.style.display = "none";
          if (otpInput) otpInput.value = "";
          if (saveEmailBtn) {
            saveEmailBtn.textContent = "✓ Email Verified & Saved";
            saveEmailBtn.disabled = false;
          }
          const recTargetEl = document.getElementById("sec-rec-email-target");
          if (recTargetEl) recTargetEl.textContent = email;

          if (typeof onEventHook === "function") {
            onEventHook("RECOVERY_EMAIL_UPDATED", "Recovery email updated to " + email);
          }
        } else {
          safeToast(data.error || "Invalid OTP code ❌");
        }
      } catch (err) {
        safeToast("Network error verifying OTP ❌");
      } finally {
        isVerifyingOtp = false;
        if (verifyEmailOtpBtn) {
          verifyEmailOtpBtn.disabled = false;
          verifyEmailOtpBtn.textContent = "✓ Verify & Save";
        }
      }
    }

    if (verifyEmailOtpBtn && !verifyEmailOtpBtn.__secBound) {
      verifyEmailOtpBtn.__secBound = true;
      verifyEmailOtpBtn.addEventListener("click", handleVerifyOtpAndSave);
    }

    if (otpInput && !otpInput.__secBound) {
      otpInput.__secBound = true;
      otpInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleVerifyOtpAndSave();
        }
      });
    }

    if (saveEmailBtn && !saveEmailBtn.__secBound) {
      saveEmailBtn.__secBound = true;
      saveEmailBtn.addEventListener("click", async () => {
        if (isSendingOtp) return;
        const email = (document.getElementById(SELECTORS.recoveryEmail)?.value || "").trim();
        if (!email || !email.includes("@")) {
          safeToast("Please enter a valid email address ⚠️");
          return;
        }

        isSendingOtp = true;
        saveEmailBtn.disabled = true;
        saveEmailBtn.textContent = "⏳ Sending OTP...";
        safeToast("⏳ Sending verification OTP to " + email + "...");

        try {
          const apiUrl = window.getApiUrl ? window.getApiUrl("/api/send-otp") : "/api/send-otp";
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "request-otp", email, purpose: "CONFIG" })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            safeToast("📨 Verification OTP sent to " + email + "! Please enter it below.");
            if (otpBox) otpBox.style.display = "flex";
            if (otpInput) { otpInput.value = ""; otpInput.focus(); }
            startCooldownTimer(60, saveEmailBtn);
          } else {
            safeToast(data.error || "Failed to send OTP ❌");
            saveEmailBtn.disabled = false;
            saveEmailBtn.textContent = "📧 Send Verification OTP";
          }
        } catch (err) {
          safeToast("Network error sending OTP ❌");
          saveEmailBtn.disabled = false;
          saveEmailBtn.textContent = "📧 Send Verification OTP";
        } finally {
          isSendingOtp = false;
        }
      });
    }

    // Global document event listener for Emergency Recovery Code buttons
    if (!document.__secGlobalBound) {
      document.__secGlobalBound = true;
      document.addEventListener("click", async (e) => {
        const copyBtn = e.target.closest("#btn-copy-recovery-code, .btn-copy-code-action");
        if (copyBtn) {
          e.preventDefault();
          const activeCode = currentSettings.admin_recovery_code || sessionStorage.getItem("bw_active_recovery_code");
          if (!activeCode || activeCode.includes("••")) {
            safeToast("No plaintext code in memory. Regenerate a new code first ⚠️");
            return;
          }
          try {
            await navigator.clipboard.writeText(activeCode);
            safeToast("📋 Emergency Recovery Code copied to clipboard! ✅");
          } catch (err) {
            safeToast("Failed to copy to clipboard ❌");
          }
          return;
        }

        const dlBtn = e.target.closest("#btn-download-recovery-code, .btn-download-code-action");
        if (dlBtn) {
          e.preventDefault();
          const activeCode = currentSettings.admin_recovery_code || sessionStorage.getItem("bw_active_recovery_code");
          if (!activeCode || activeCode.includes("••")) {
            safeToast("No plaintext code in memory. Regenerate a new code first ⚠️");
            return;
          }
          const content = `=================================================\n` +
            `WISH STUDIO - EMERGENCY RECOVERY CODE\n` +
            `=================================================\n` +
            `Generated: ${new Date().toLocaleString()}\n\n` +
            `Your Emergency Recovery Code is:\n` +
            `-------------------------------------------------\n` +
            `  ${activeCode}\n` +
            `-------------------------------------------------\n\n` +
            `IMPORTANT SECURITY INSTRUCTIONS:\n` +
            `1. Store this file in an offline encrypted vault or secure drive.\n` +
            `2. Use this code ONLY if you lose access to your Master Password\n` +
            `   and cannot receive Email OTPs.\n` +
            `3. Each time a new code is generated, old codes are permanently\n` +
            `   invalidated on the server.\n` +
            `=================================================\n`;
          const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `wish-studio-recovery-code-${Date.now()}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          safeToast("📥 Recovery Code TXT file downloaded! ✅");
          return;
        }

        const printBtn = e.target.closest("#btn-print-recovery-code, .btn-print-code-action");
        if (printBtn) {
          e.preventDefault();
          const activeCode = currentSettings.admin_recovery_code || sessionStorage.getItem("bw_active_recovery_code");
          if (!activeCode || activeCode.includes("••")) {
            safeToast("No plaintext code in memory. Regenerate a new code first ⚠️");
            return;
          }
          const printWindow = window.open("", "_blank");
          if (printWindow) {
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Wish Studio - Emergency Recovery Code</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; }
                  .card { border: 2px dashed #9333ea; border-radius: 12px; padding: 30px; max-width: 500px; margin: 0 auto; text-align: center; }
                  h2 { margin-top: 0; color: #6b21a8; font-size: 1.4rem; }
                  .code { font-family: monospace; font-size: 1.8rem; letter-spacing: 3px; font-weight: bold; background: #f3e8ff; padding: 15px; border-radius: 8px; margin: 20px 0; display: inline-block; color: #581c87; }
                  .warning { font-size: 0.85rem; color: #666; line-height: 1.5; text-align: left; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h2>🛡️ Wish Studio Admin Recovery Card</h2>
                  <p>Store this emergency keycard in a secure, offline physical location.</p>
                  <div class="code">${activeCode}</div>
                  <div class="warning">
                    <strong>Instructions:</strong><br>
                    • Keep this offline. Never share with anyone.<br>
                    • Use this code to unlock emergency access to Master Admin Studio.<br>
                    • Printed: ${new Date().toLocaleString()}
                  </div>
                </div>
                <script>
                  window.onload = function() { window.print(); window.close(); }
                </script>
              </body>
              </html>
            `);
            printWindow.document.close();
          }
          return;
        }

        const regenBtn = e.target.closest("#btn-regen-recovery-code, .btn-regen-code-action");
        if (regenBtn) {
          e.preventDefault();
          const regenModal = document.getElementById(SELECTORS.regenModal);
          if (regenModal) {
            regenModal.classList.add("open");
            regenModal.style.display = "flex";
          }
          return;
        }

        const regenCancel = e.target.closest("#btn-regen-cancel");
        if (regenCancel) {
          e.preventDefault();
          const regenModal = document.getElementById(SELECTORS.regenModal);
          if (regenModal) {
            regenModal.classList.remove("open");
            regenModal.style.display = "none";
          }
          return;
        }

        const regenConfirm = e.target.closest("#btn-regen-confirm");
        if (regenConfirm) {
          e.preventDefault();
          const regenModal = document.getElementById(SELECTORS.regenModal);
          if (regenModal) {
            regenModal.classList.remove("open");
            regenModal.style.display = "none";
          }

          const newCode = generateBackupCode();
          safeToast("⏳ Hashing and persisting new Emergency Recovery Code...");
          try {
            const apiUrl = window.getApiUrl ? window.getApiUrl("/api/auth") : "/api/auth";
            const res = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "save-recovery-code", code: newCode })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              sessionStorage.setItem("bw_active_recovery_code", newCode);
              if (data.updatedAt) sessionStorage.setItem("bw_active_recovery_code_time", data.updatedAt);
              currentSettings.admin_recovery_code = newCode;
              updateAllBackupCodeDisplays(newCode);

              const backupWrappers = document.querySelectorAll("#sec-backup-card-wrapper, #forgot-backup-card-wrapper");
              backupWrappers.forEach(bw => {
                bw.style.transform = "scale(1.03)";
                bw.style.boxShadow = "0 0 30px rgba(247, 201, 74, 0.6), 0 0 15px rgba(168, 85, 247, 0.4)";
                bw.style.borderColor = "#22c55e";
                setTimeout(() => {
                  bw.style.transform = "scale(1)";
                  bw.style.boxShadow = "0 0 20px rgba(247, 201, 74, 0.15)";
                  bw.style.borderColor = "var(--border-gold)";
                }, 1000);
              });

              safeToast("✓ New Emergency Recovery Code Generated & Hashed on Server! ✅");
              if (typeof onEventHook === "function") {
                onEventHook("BACKUP_CODE_REGENERATED", "Emergency Recovery Code regenerated");
              }
            } else {
              safeToast(data.message || data.error || "Failed to persist recovery code on server ❌");
            }
          } catch (err) {
            safeToast("Network error saving recovery code ❌");
          }
          return;
        }

        // Close on backdrop overlay click
        const regenModal = document.getElementById(SELECTORS.regenModal);
        if (regenModal && e.target === regenModal) {
          regenModal.classList.remove("open");
          regenModal.style.display = "none";
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          const regenModal = document.getElementById(SELECTORS.regenModal);
          if (regenModal && (regenModal.classList.contains("open") || regenModal.style.display === "flex")) {
            regenModal.classList.remove("open");
            regenModal.style.display = "none";
          }
        }
      });
    }
  }

  window.AdminSecurity = Object.freeze({
    init: initSecurityHandlers,
    generateBackupCode,
    updateAllBackupCodeDisplays,
    getSettings: () => ({ ...currentSettings })
  });

})(window);
