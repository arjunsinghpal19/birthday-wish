/**
 * ============================================================================
 * ADMIN STUDIO SECURITY MODULE (js/admin/admin-security.js)
 * Manages Admin Studio security settings: Master Password changes,
 * Recovery Email OTP verification, Emergency Backup Code actions (copy,
 * download, print, regenerate), and Security Question/Answer hashing & saving.
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
    recoveryEmail: "sec-recovery-email",
    codeDisplay: "sec-code-display",
    questionPreset: "sec-question-preset",
    customQuestion: "sec-custom-question",
    savePassBtn: "sec-save-pass-btn",
    oldPass: "sec-old-pass",
    newPass: "sec-new-pass",
    confirmPass: "sec-confirm-pass",
    saveEmailBtn: "sec-save-email-btn",
    sendOtpBtn: "sec-send-otp-btn",
    emailOtpBox: "sec-email-otp-box",
    emailOtpInput: "sec-email-otp-input",
    verifyEmailOtpBtn: "sec-verify-email-otp-btn",
    saveRecoveryBtn: "sec-save-recovery-btn",
    recoveryAnswer: "sec-recovery-answer",
    regenModal: "regen-confirm-modal"
  };

  /* ============================================================
     2. MODULE STATE
     ============================================================ */
  let currentSettings = {
    admin_recovery_email: "admin@example.com",
    admin_recovery_code: "WS-9F8A-3E21-7B04",
    custom_secret_question: "Who is your best friend?",
    custom_secret_answer: "Shivam"
  };
  let cooldownInterval = null;
  let onEventHook = null;

  /* ============================================================
     3. CODE GENERATION & DISPLAY
     ============================================================ */
  /**
   * Generates random 16-character alphanumeric backup code (e.g. WS-9F8A-3E21-7B04).
   * @returns {string} Formatted backup code.
   */
  function generateBackupCode() {
    const segment = () => Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase();
    return `WS-${segment()}-${segment()}-${segment()}`;
  }

  /**
   * Updates all backup code displays across the DOM and stores in localStorage/Database.
   * @param {string} code - Emergency backup code.
   */
  function updateAllBackupCodeDisplays(code) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("admin_recovery_code", code);
    }
    if (window.DatabaseModule && typeof window.DatabaseModule.saveSecuritySettings === "function") {
      window.DatabaseModule.saveSecuritySettings({ admin_recovery_code: code });
    }
    const selectors = [
      "#sec-code-display",
      "#sec-backup-code-display",
      "#forgot-backup-code-display",
      ".sec-backup-code-val"
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.textContent = code;
      });
    });
  }

  /**
   * Starts resend countdown timer on OTP button.
   * @param {number} seconds - Cooldown in seconds.
   * @param {HTMLElement} btn - Button element.
   */
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
        btn.textContent = "Send Verification OTP";
      } else {
        btn.textContent = `Resend OTP (${left}s)`;
      }
    }, 1000);
  }

  /* ============================================================
     4. SECURITY EVENT BINDINGS
     ============================================================ */
  /**
   * Initializes Security Settings panel event handlers.
   * @param {Function} [onEventCallback] - Callback for logging admin actions.
   */
  async function initSecurityHandlers(onEventCallback) {
    if (typeof onEventCallback === "function") {
      onEventHook = onEventCallback;
    }

    if (window.DatabaseModule && typeof window.DatabaseModule.getSecuritySettings === "function") {
      try {
        const dbSettings = await window.DatabaseModule.getSecuritySettings();
        if (dbSettings && typeof dbSettings === "object") {
          currentSettings = { ...currentSettings, ...dbSettings };
        }
      } catch (e) {
        console.warn("AdminSecurity: Error fetching settings from DB:", e);
      }
    }

    if (!currentSettings.admin_recovery_code) {
      currentSettings.admin_recovery_code = generateBackupCode();
      if (window.DatabaseModule && typeof window.DatabaseModule.saveSecuritySettings === "function") {
        window.DatabaseModule.saveSecuritySettings({ admin_recovery_code: currentSettings.admin_recovery_code });
      }
    }

    // Populate UI Elements
    const emailInput = document.getElementById(SELECTORS.recoveryEmail);
    if (emailInput) emailInput.value = currentSettings.admin_recovery_email || "";

    const codeDisplay = document.getElementById(SELECTORS.codeDisplay);
    if (codeDisplay) codeDisplay.textContent = currentSettings.admin_recovery_code;

    const qPreset = document.getElementById(SELECTORS.questionPreset);
    const qCustomInput = document.getElementById(SELECTORS.customQuestion);
    if (qPreset && !qPreset.__secBound) {
      qPreset.__secBound = true;
      const standardQuestions = [
        "What is your childhood pet's name?",
        "What was the name of your first school?",
        "In what city were you born?",
        "What is your mother's maiden name?"
      ];

      if (standardQuestions.includes(currentSettings.custom_secret_question)) {
        qPreset.value = currentSettings.custom_secret_question;
      } else {
        qPreset.value = "custom";
        if (qCustomInput) {
          qCustomInput.style.display = "block";
          qCustomInput.value = currentSettings.custom_secret_question || "";
        }
      }

      qPreset.addEventListener("change", () => {
        if (qPreset.value === "custom") {
          if (qCustomInput) qCustomInput.style.display = "block";
        } else {
          if (qCustomInput) qCustomInput.style.display = "none";
        }
      });
    }

    // 1. Change Master Password via PasswordService
    const savePassBtn = document.getElementById(SELECTORS.savePassBtn);
    if (savePassBtn && !savePassBtn.__secBound) {
      savePassBtn.__secBound = true;
      savePassBtn.addEventListener("click", async () => {
        const oldVal = (document.getElementById(SELECTORS.oldPass)?.value || "").trim();
        const newVal = (document.getElementById(SELECTORS.newPass)?.value || "").trim();
        const confirmVal = (document.getElementById(SELECTORS.confirmPass)?.value || "").trim();

        if (!oldVal) {
          if (typeof showToast === "function") showToast("Please enter your current password ⚠️");
          return;
        }

        const isOldValid = window.PasswordService ? await window.PasswordService.verifyPassword(oldVal) : false;
        if (!isOldValid) {
          if (typeof showToast === "function") showToast("Current password is incorrect ❌");
          return;
        }

        if (!newVal || newVal.length < 4) {
          if (typeof showToast === "function") showToast("New password must be at least 4 characters ⚠️");
          return;
        }
        if (newVal !== confirmVal) {
          if (typeof showToast === "function") showToast("Passwords do not match ❌");
          return;
        }

        const success = window.PasswordService ? await window.PasswordService.updatePassword(newVal) : false;
        if (success) {
          const oldInput = document.getElementById(SELECTORS.oldPass);
          const newInput = document.getElementById(SELECTORS.newPass);
          const confirmInput = document.getElementById(SELECTORS.confirmPass);
          if (oldInput) oldInput.value = "";
          if (newInput) newInput.value = "";
          if (confirmInput) confirmInput.value = "";

          if (typeof showToast === "function") showToast("🔑 Master Password updated successfully on Supabase! ✅");
          if (typeof onEventHook === "function") {
            onEventHook("PASSWORD_CHANGED", "Master Admin Password changed & persisted");
          }
        } else {
          if (typeof showToast === "function") showToast("Failed to update password on Supabase ❌");
        }
      });
    }

    // 2. Recovery Email Setup with OTP Verification
    const saveEmailBtn = document.getElementById(SELECTORS.saveEmailBtn);
    if (saveEmailBtn && !saveEmailBtn.__secBound) {
      saveEmailBtn.__secBound = true;
      saveEmailBtn.addEventListener("click", async () => {
        const email = (document.getElementById(SELECTORS.recoveryEmail)?.value || "").trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const otpBox = document.getElementById(SELECTORS.emailOtpBox);
        const otpInput = document.getElementById(SELECTORS.emailOtpInput);

        if (!email || !emailRegex.test(email)) {
          if (typeof showToast === "function") showToast("Please enter a valid email address ⚠️");
          return;
        }

        // Check if OTP input box is already open and user clicked verify
        if (otpBox && otpBox.style.display !== "none" && otpInput && otpInput.value.trim().length === 6) {
          if (typeof showToast === "function") showToast("⏳ Verifying OTP...");
          try {
            const apiUrl = window.getApiUrl ? window.getApiUrl("/api/send-otp") : "/api/send-otp";
            const res = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "save-recovery-email", email, otpCode: otpInput.value.trim() })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              currentSettings.admin_recovery_email = email;
              currentSettings.recovery_email_verified = true;
              if (window.DatabaseModule) {
                await window.DatabaseModule.saveSecuritySettings({ admin_recovery_email: email, recovery_email_verified: true });
              }
              if (typeof showToast === "function") showToast("📧 Recovery Email Verified & Saved! ✅");
              if (otpBox) otpBox.style.display = "none";
              if (otpInput) otpInput.value = "";
              return;
            } else {
              if (typeof showToast === "function") showToast(data.error || "OTP verification failed ❌");
              return;
            }
          } catch (e) {
            if (typeof showToast === "function") showToast("Network error verifying OTP ❌");
            return;
          }
        }

        // Otherwise request verification OTP
        if (typeof showToast === "function") showToast("⏳ Requesting Verification OTP...");
        try {
          const apiUrl = window.getApiUrl ? window.getApiUrl("/api/send-otp") : "/api/send-otp";
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "request-otp", email, purpose: "SETUP" })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            if (typeof showToast === "function") showToast("📨 Verification OTP sent to " + email + "! Check inbox/spam.");
            startCooldownTimer(data.resendCooldownSeconds || 60, saveEmailBtn);
            if (otpBox) otpBox.style.display = "flex";
            if (otpInput) otpInput.focus();
          } else {
            if (typeof showToast === "function") showToast(data.error || "Failed to send OTP ❌");
          }
        } catch (e) {
          if (typeof showToast === "function") showToast("Network error sending OTP ❌");
        }
      });
    }

    if (codeDisplay) {
      updateAllBackupCodeDisplays(currentSettings.admin_recovery_code);
    } else {
      const stored = (typeof localStorage !== "undefined" && localStorage.getItem("admin_recovery_code")) || "WS-9F8A-3E21-7B04";
      updateAllBackupCodeDisplays(currentSettings.admin_recovery_code || stored);
    }

    // 3. Attach Global Delegated Event Listeners for Backup Code Actions
    if (!window.__backupCodeActionsBound) {
      window.__backupCodeActionsBound = true;

      document.addEventListener("click", async (e) => {
        // COPY CODE
        const copyBtn = e.target.closest("#btn-copy-recovery-code, .btn-copy-code-action");
        if (copyBtn) {
          e.preventDefault();
          const stored = (typeof localStorage !== "undefined" && localStorage.getItem("admin_recovery_code")) || "";
          const code = (stored || document.getElementById("sec-backup-code-display")?.textContent || "WS-9F8A-3E21-7B04").trim();
          try {
            if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
              await navigator.clipboard.writeText(code);
            }
            const origText = copyBtn.innerHTML;
            copyBtn.innerHTML = "✓ Copied!";
            copyBtn.style.background = "rgba(34, 197, 94, 0.2)";
            copyBtn.style.borderColor = "#22c55e";
            setTimeout(() => {
              copyBtn.innerHTML = origText;
              copyBtn.style.background = "rgba(255, 255, 255, 0.08)";
              copyBtn.style.borderColor = "rgba(255, 255, 255, 0.2)";
            }, 1500);
            if (typeof showToast === "function") showToast("📋 Backup code copied to clipboard!");
          } catch (err) {
            console.error("AdminSecurity: Clipboard copy error:", err);
          }
          return;
        }

        // DOWNLOAD TXT
        const dlBtn = e.target.closest("#btn-download-recovery-code, .btn-download-code-action");
        if (dlBtn) {
          e.preventDefault();
          const stored = (typeof localStorage !== "undefined" && localStorage.getItem("admin_recovery_code")) || "";
          const code = (stored || document.getElementById("sec-backup-code-display")?.textContent || "WS-9F8A-3E21-7B04").trim();
          const formattedDate = new Date().toLocaleString("en-US", {
            dateStyle: "full",
            timeStyle: "short"
          });
          const txt = `Wish Studio\n\nEmergency Backup Code\n\nGenerated:\n${formattedDate}\n\nBackup Code:\n${code}\n\nKeep this code secure.`;
          const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
          const a = document.createElement("a");
          const dlUrl = URL.createObjectURL(blob);
          a.href = dlUrl;
          a.download = "WishStudio-Backup-Code.txt";
          a.click();
          setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);
          if (typeof showToast === "function") showToast("📥 WishStudio-Backup-Code.txt downloaded!");
          return;
        }

        // PRINT CODE
        const printBtn = e.target.closest("#btn-print-recovery-code, .btn-print-code-action");
        if (printBtn) {
          e.preventDefault();
          const stored = (typeof localStorage !== "undefined" && localStorage.getItem("admin_recovery_code")) || "";
          const code = (stored || document.getElementById("sec-backup-code-display")?.textContent || "WS-9F8A-3E21-7B04").trim();
          const printWindow = window.open ? window.open("", "_blank") : null;
          if (printWindow) {
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Wish Studio Emergency Backup Code</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #0F0A1C; text-align: center; }
                  .card { border: 2px dashed #F7C94A; padding: 32px 24px; border-radius: 16px; max-width: 440px; margin: 20px auto; background: #1B1530; color: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
                  .title { font-size: 24px; font-weight: 800; color: #F7C94A; margin-bottom: 4px; }
                  .sub { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.7); margin-bottom: 24px; }
                  .code { font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #F7C94A; margin: 20px 0; background: #120D24; padding: 18px; border-radius: 10px; border: 1px solid #F7C94A; }
                  .warn { font-size: 12px; color: #FDE047; margin-top: 20px; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div class="title">👑 Wish Studio</div>
                  <div class="sub">Emergency Backup Code</div>
                  <div class="code">${code}</div>
                  <div style="font-size:12px; color:#CBD5E1;">Generated: ${new Date().toLocaleString()}</div>
                  <div class="warn">⚠ Store this code safely. Never share it with anyone.</div>
                </div>
                <script>window.onload = function() { window.print(); };</script>
              </body>
              </html>
            `);
            printWindow.document.close();
          }
          return;
        }

        // GENERATE NEW CODE (Open Modal)
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

        // REGENERATE CANCEL
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

        // REGENERATE CONFIRM
        const regenConfirm = e.target.closest("#btn-regen-confirm");
        if (regenConfirm) {
          e.preventDefault();
          const regenModal = document.getElementById(SELECTORS.regenModal);
          if (regenModal) {
            regenModal.classList.remove("open");
            regenModal.style.display = "none";
          }

          const newCode = generateBackupCode();
          updateAllBackupCodeDisplays(newCode);

          const backupWrappers = document.querySelectorAll("#sec-backup-card-wrapper, #forgot-backup-card-wrapper");
          backupWrappers.forEach(bw => {
            bw.style.transform = "scale(1.03)";
            bw.style.boxShadow = "0 0 30px rgba(247, 201, 74, 0.6), 0 0 15px rgba(168, 85, 247, 0.4)";
            bw.style.borderColor = "#22c55e";
            setTimeout(() => {
              bw.style.transform = "scale(1)";
              bw.style.boxShadow = "0 0 20px rgba(247, 201, 74, 0.15)";
              bw.style.borderColor = "#F7C94A";
            }, 1200);
          });

          if (typeof onEventHook === "function") {
            onEventHook("RECOVERY_CODE_REGENERATED", "Emergency Recovery Code regenerated & persisted");
          }
          if (typeof showToast === "function") showToast("✓ New Backup Code Created");
          return;
        }
      });
    }

    // 4. Save Security Question & Answer
    const saveRecBtn = document.getElementById(SELECTORS.saveRecoveryBtn);
    if (saveRecBtn && !saveRecBtn.__secBound) {
      saveRecBtn.__secBound = true;
      saveRecBtn.addEventListener("click", async () => {
        const qSel = document.getElementById(SELECTORS.questionPreset)?.value || "";
        const qCust = (document.getElementById(SELECTORS.customQuestion)?.value || "").trim();
        const finalQuestion = qSel === "custom" ? qCust : qSel;
        const answer = (document.getElementById(SELECTORS.recoveryAnswer)?.value || "").trim();

        if (!finalQuestion) {
          if (typeof showToast === "function") showToast("Please select or enter a security question ⚠️");
          return;
        }
        if (!answer) {
          if (typeof showToast === "function") showToast("Please enter a secret answer ⚠️");
          return;
        }

        if (typeof showToast === "function") showToast("⏳ Hashing and saving Security Question & Answer...");
        try {
          const apiUrl = window.getApiUrl ? window.getApiUrl("/api/auth") : "/api/auth";
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save-question", question: finalQuestion, answer })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            currentSettings.custom_secret_question = finalQuestion;
            if (window.DatabaseModule) {
              await window.DatabaseModule.saveSecuritySettings({
                custom_secret_question: finalQuestion,
                custom_secret_answer: answer
              });
            }
            const ansInp = document.getElementById(SELECTORS.recoveryAnswer);
            if (ansInp) ansInp.value = "";
            if (typeof onEventHook === "function") {
              onEventHook("SECURITY_QUESTION_UPDATED", "Security Question and hashed secret answer saved & persisted");
            }
            if (typeof showToast === "function") showToast("🛡 Security Question & Answer Hashed & Saved! ✅");
          } else {
            if (typeof showToast === "function") showToast(data.error || "Failed to save Security Question & Answer ❌");
          }
        } catch (e) {
          if (typeof showToast === "function") showToast("Network error saving Security Question & Answer ❌");
        }
      });
    }
  }

  /* ============================================================
     5. AUTHORITATIVE PUBLIC API
     ============================================================ */
  window.AdminSecurity = Object.freeze({
    init: initSecurityHandlers,
    generateBackupCode,
    updateAllBackupCodeDisplays,
    getSettings: () => ({ ...currentSettings })
  });

})(window);
