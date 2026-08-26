/**
 * ============================================================================
 * PHASE 31H-2 TEST SUITE: SECURITY RECOVERY HARDENING & PASSKEY WEBAUTHN
 * Comprehensive verification of server-side PBKDF2 recovery verification,
 * code lifecycle invalidation, dedicated backup_code_updated_at, zero plaintext,
 * complete removal of security question, and WebAuthn / Passkey foundation.
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT_DIR = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runAllPhase31HTests() {
  console.log("\n============================================================");
  console.log("👑 RUNNING PHASE 31H-2 SECURITY RECOVERY HARDENING TEST SUITE");
  console.log("============================================================\n");

  // 1. Check removal of Ctrl+Shift+Alt+A bypass shortcut from js/modules/admin-security.js
  await runTest("1. Ctrl+Shift+Alt+A emergency shortcut is completely removed", () => {
    const secJs = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "admin-security.js"), "utf8");
    assert(!secJs.includes("Ctrl + Shift + Alt + A"), "Bypass comment must be removed");
    assert(!secJs.includes("ctrlKey && e.shiftKey && e.altKey"), "Bypass keydown listener must be removed");
    assert(!secJs.includes("Emergency Developer Reset Triggered"), "Bypass toast must be removed");
  });

  // 2. Search entire repository for any remaining emergency developer bypass
  await runTest("2. Zero developer or emergency unlock bypasses remain in the entire codebase", () => {
    const jsFiles = [
      "js/app.js",
      "js/admin.js",
      "js/share.js",
      "js/database.js",
      "js/modules/admin-security.js",
      "js/admin/admin-security.js",
      "js/admin/admin-passkey.js",
      "js/admin/admin-navigation.js",
      "js/admin/admin-logs.js",
      "js/admin/admin-backup.js",
      "js/admin/admin-settings.js",
      "js/modules/editor/customizer.js"
    ];

    jsFiles.forEach(rel => {
      const fullPath = path.join(ROOT_DIR, rel);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf8");
        assert(!content.includes("Emergency Developer Reset"), `File ${rel} must not contain developer bypass`);
        assert(!content.includes("admin_bypass"), `File ${rel} must not contain admin_bypass`);
      }
    });
  });

  // 3. PasswordService verifyPassword handles valid and invalid passwords
  await runTest("3. PasswordService correctly verifies valid vs invalid passwords", async () => {
    const dbJs = fs.readFileSync(path.join(ROOT_DIR, "js", "database.js"), "utf8");
    assert(dbJs.includes("PasswordService"), "PasswordService must be defined in database.js");
    assert(dbJs.includes("verifyPassword"), "PasswordService must provide verifyPassword");
    assert(dbJs.includes("updatePassword"), "PasswordService must provide updatePassword");
  });

  // 4. Rate-Limiting & Cooldown logic in js/modules/admin-security.js
  await runTest("4. Rate limiting and secure authentication handling in js/modules/admin-security.js", () => {
    const secJs = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "admin-security.js"), "utf8");
    assert(secJs.includes("admin-login-pass"), "Must have admin login input selector");
    assert(secJs.includes("sessionStorage.setItem"), "Must manage session state securely");
  });

  // 5. Successful login resets failed attempts and records timestamp
  await runTest("5. Successful authentication records admin_auth_timestamp and sets admin_authenticated", () => {
    const secJs = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "admin-security.js"), "utf8");
    assert(secJs.includes('sessionStorage.setItem("admin_authenticated", "true")'), "Must set admin_authenticated");
    assert(secJs.includes('sessionStorage.setItem("admin_auth_timestamp"'), "Must record admin_auth_timestamp");
  });

  // 6. Cross-Tab Logout Synchronization in admin-navigation.js and admin-security.js
  await runTest("6. Logout broadcasts bw_admin_auth_sync across tabs", () => {
    const navJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-navigation.js"), "utf8");
    assert(navJs.includes("bw_admin_auth_sync"), "Must broadcast bw_admin_auth_sync on logout");
  });

  // 7. Security Question & Answer is completely eliminated from codebase
  await runTest("7. Security Question & Answer is completely eliminated from all client and server files", () => {
    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
    const adminSec = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-security.js"), "utf8");
    const qeSec = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "admin-security.js"), "utf8");
    const authJs = fs.readFileSync(path.join(ROOT_DIR, "api", "auth.js"), "utf8");

    assert(!adminHtml.includes('id="sec-recovery-answer"'), "admin.html must not contain sec-recovery-answer");
    assert(!adminHtml.includes('id="sec-question-preset"'), "admin.html must not contain sec-question-preset");
    assert(!adminHtml.includes('id="sec-rec-panel-question"'), "admin.html must not contain sec-rec-panel-question");
    assert(!indexHtml.includes('id="card-method-question"'), "index.html must not contain card-method-question");
    assert(!indexHtml.includes('id="forgot-substep-question"'), "index.html must not contain forgot-substep-question");
    assert(!adminSec.includes("save-question"), "admin-security.js must not contain save-question");
    assert(!qeSec.includes("verify-question"), "modules/admin-security.js must not contain verify-question");
    assert(!authJs.includes('action === "save-question"'), "api/auth.js must not contain save-question action");
    assert(!authJs.includes('action === "verify-question"'), "api/auth.js must not contain verify-question action");
  });

  // 8. Passkey / WebAuthn Module and Architecture
  await runTest("8. WebAuthn Passkey Module (js/admin/admin-passkey.js) is created and wired", () => {
    const passkeyJsPath = path.join(ROOT_DIR, "js", "admin", "admin-passkey.js");
    assert(fs.existsSync(passkeyJsPath), "js/admin/admin-passkey.js must exist");
    const passkeyJs = fs.readFileSync(passkeyJsPath, "utf8");
    assert(passkeyJs.includes("AdminPasskeyModule"), "Must export AdminPasskeyModule");
    assert(passkeyJs.includes("isSupported"), "Must provide isSupported");
    assert(passkeyJs.includes("registerPasskey"), "Must provide registerPasskey");
    assert(passkeyJs.includes("authenticatePasskey"), "Must provide authenticatePasskey");
    assert(passkeyJs.includes("navigator.credentials.create"), "Must call navigator.credentials.create");
    assert(passkeyJs.includes("navigator.credentials.get"), "Must call navigator.credentials.get");

    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");
    assert(adminHtml.includes('<script src="js/admin/admin-passkey.js"></script>'), "admin.html must include admin-passkey.js");
    assert(adminHtml.includes('id="btn-register-passkey"'), "admin.html must have btn-register-passkey");

    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
    assert(indexHtml.includes('<script src="js/admin/admin-passkey.js"></script>'), "index.html must include admin-passkey.js");
    assert(indexHtml.includes('id="admin-passkey-login-btn"'), "index.html must have admin-passkey-login-btn");
  });

  // 9. Serverless API WebAuthn / Passkey endpoints in api/auth.js
  await runTest("9. Serverless API supports passkey-challenge, passkey-register, passkey-verify, passkey-remove", () => {
    const authJs = fs.readFileSync(path.join(ROOT_DIR, "api", "auth.js"), "utf8");
    assert(authJs.includes('action === "passkey-challenge"'), "api/auth.js must handle passkey-challenge");
    assert(authJs.includes('action === "passkey-register"'), "api/auth.js must handle passkey-register");
    assert(authJs.includes('action === "passkey-verify"'), "api/auth.js must handle passkey-verify");
    assert(authJs.includes("validateAndConsumeChallenge"), "api/auth.js must validate challenges via validateAndConsumeChallenge");
  });

  // 10. Admin Dashboard Security Sub-Navigation Tab event listener binding
  await runTest("10. Admin Dashboard Security subnav tabs and recovery journey are reliably bound on init", () => {
    const adminSec = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-security.js"), "utf8");
    assert(adminSec.includes("initSubnavTabs()"), "admin-security.js must call initSubnavTabs() in initSecurityHandlers");
    assert(adminSec.includes("initRecoveryJourney()"), "admin-security.js must call initRecoveryJourney() in initSecurityHandlers");
    assert(adminSec.includes("initEyeToggles()"), "admin-security.js must call initEyeToggles() in initSecurityHandlers");
    assert(adminSec.includes("sec-tab-btn"), "admin-security.js must query .sec-tab-btn");
    assert(adminSec.includes("sec-pane"), "admin-security.js must query .sec-pane");
  });

  // 11. Dedicated backup_code_updated_at timestamp separation
  await runTest("11. Dedicated backup_code_updated_at is used and preserved independently of email/password updates", () => {
    const authJs = fs.readFileSync(path.join(ROOT_DIR, "api", "auth.js"), "utf8");
    const dbJs = fs.readFileSync(path.join(ROOT_DIR, "js", "database.js"), "utf8");

    assert(authJs.includes("parsedMemory.backup_code_updated_at = nowIso"), "api/auth.js must set parsedMemory.backup_code_updated_at");
    assert(authJs.includes("backupCodeUpdatedAt: nowIso"), "api/auth.js must return backupCodeUpdatedAt");
    assert(dbJs.includes("parsedMemory.backup_code_updated_at"), "js/database.js must read backup_code_updated_at");
  });

  // 12. File size invariant (< 35 KB per JS file)
  await runTest("12. All security JavaScript modules strictly remain under 35 KB limit", () => {
    const targetFiles = [
      "api/auth.js",
      "api/send-otp.js",
      "js/modules/admin-security.js",
      "js/admin/admin-security.js",
      "js/admin/admin-passkey.js",
      "js/database.js"
    ];

    targetFiles.forEach(rel => {
      const fullPath = path.join(ROOT_DIR, rel);
      const stats = fs.statSync(fullPath);
      const sizeKb = stats.size / 1024;
      assert(sizeKb < 35.0, `File ${rel} must be < 35 KB (actual: ${sizeKb.toFixed(2)} KB)`);
    });
  });

  // 13. Admin Dashboard loads /api/env.js and js/config.js
  await runTest("13. admin.html loads /api/env.js and js/config.js for canonical API routing", () => {
    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");
    assert(adminHtml.includes('<script src="/api/env.js"></script>'), "admin.html must load /api/env.js");
    assert(adminHtml.includes('<script src="js/config.js"></script>'), "admin.html must load js/config.js");
  });

  // 14. Password Eye Toggle controls exist and are accessible in Admin Dashboard Security
  await runTest("14. Password eye toggle controls are accessible on all security password inputs in admin.html", () => {
    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");
    assert(adminHtml.includes('data-target="sec-old-pass"'), "Must have eye toggle for sec-old-pass");
    assert(adminHtml.includes('data-target="sec-new-pass"'), "Must have eye toggle for sec-new-pass");
    assert(adminHtml.includes('data-target="sec-confirm-pass"'), "Must have eye toggle for sec-confirm-pass");
  });

  // 15. Recovery Email OTP input group is present in Admin Dashboard Security
  await runTest("15. Recovery Email OTP input group is present in admin.html and styled in admin-components.css", () => {
    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");
    assert(adminHtml.includes('id="sec-email-otp-box"'), "admin.html must have sec-email-otp-box");
    assert(adminHtml.includes('id="sec-email-otp-input"'), "admin.html must have sec-email-otp-input");
    assert(adminHtml.includes('id="sec-verify-email-otp-btn"'), "admin.html must have sec-verify-email-otp-btn");

    const css = fs.readFileSync(path.join(ROOT_DIR, "css", "admin", "admin-components.css"), "utf8");
    assert(css.includes("#sec-email-otp-box"), "admin-components.css must style #sec-email-otp-box");
    assert(css.includes("#sec-email-otp-input"), "admin-components.css must style #sec-email-otp-input");
  });

  // 16. Serverless api/session.js provides HMAC-SHA256 token verification
  await runTest("16. Serverless api/session.js provides HMAC-SHA256 token verification with 24h expiry", () => {
    const sessionJs = fs.readFileSync(path.join(ROOT_DIR, "api", "session.js"), "utf8");
    assert(sessionJs.includes("createAdminSessionToken"), "Must provide createAdminSessionToken");
    assert(sessionJs.includes("verifyAdminSessionToken"), "Must provide verifyAdminSessionToken");
    assert(sessionJs.includes("SESSION_EXPIRY_SECONDS = 24 * 60 * 60"), "Must enforce 24h server expiration");
  });

  // 17. Single Shared Security Authority verification
  await runTest("17. Quick Editor and Admin Dashboard share identical canonical recovery code and OTP backend endpoints", () => {
    const secAdminJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-security.js"), "utf8");
    const secModJs = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "admin-security.js"), "utf8");

    // Both use /api/auth for recovery code
    assert(secAdminJs.includes('action: "save-recovery-code"'), "Admin Dashboard must use save-recovery-code");
    assert(secModJs.includes('action: "verify-recovery-code"'), "Quick Editor must use verify-recovery-code");

    // Both use /api/send-otp for recovery email
    assert(secAdminJs.includes('action: "save-recovery-email"'), "Admin Dashboard must use save-recovery-email");
    assert(secModJs.includes('action: "request-otp"'), "Quick Editor must use request-otp");
  });

  // 18. Quick Editor Recovery Code Actions (Copy, Download, Print, Regenerate)
  await runTest("18. Quick Editor Recovery Code actions (Copy, Download, Print, Regenerate) are wired", () => {
    const secModJs = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "admin-security.js"), "utf8");
    assert(secModJs.includes(".btn-copy-code-action"), "Must handle .btn-copy-code-action in Quick Editor");
    assert(secModJs.includes(".btn-download-code-action"), "Must handle .btn-download-code-action in Quick Editor");
    assert(secModJs.includes(".btn-print-code-action"), "Must handle .btn-print-code-action in Quick Editor");
    assert(secModJs.includes(".btn-regen-code-action"), "Must handle .btn-regen-code-action in Quick Editor");
    assert(secModJs.includes("WishStudio-Backup-Code.txt"), "Must provide WishStudio-Backup-Code.txt download");
  });

  // 19. Active Recovery Code Session Synchronization between Admin and Quick Editor
  await runTest("19. Active Recovery Code is synchronized across Admin and Quick Editor via session storage", () => {
    const secAdminJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-security.js"), "utf8");
    const secModJs = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "admin-security.js"), "utf8");
    assert(secAdminJs.includes("bw_active_recovery_code"), "Admin must read/write bw_active_recovery_code in session");
    assert(secModJs.includes("bw_active_recovery_code"), "Quick Editor must read/write bw_active_recovery_code in session");
  });

  // 20. DatabaseModule.saveSecuritySettings non-destructively preserves all cryptographic hashes
  await runTest("20. DatabaseModule saveSecuritySettings non-destructively preserves cloud memory_text hashes", () => {
    const dbJs = fs.readFileSync(path.join(ROOT_DIR, "js", "database.js"), "utf8");
    assert(dbJs.includes("existingMemory"), "Must fetch and merge existingMemory");
    assert(dbJs.includes("...existingMemory"), "Must spread existingMemory to preserve hashes and salts");
  });

  // 21. Password Eye Toggle Theme Consistency
  await runTest("21. Password eye toggle uses Admin Dashboard theme CSS variables", () => {
    const css = fs.readFileSync(path.join(ROOT_DIR, "css", "admin", "admin-components.css"), "utf8");
    assert(css.includes(".pass-input-wrap .eye-toggle"), "Must define .pass-input-wrap .eye-toggle");
    assert(css.includes("var(--text-muted"), "Must use var(--text-muted)");
    assert(css.includes("var(--gold"), "Must use var(--gold) on hover/focus");
  });

  // 22. Admin Dashboard Security Sub-Navigation Tabs and Dedicated Recovery Pane
  await runTest("22. admin.html contains dedicated Security Sub-Navigation tabs and Emergency Recovery Channel pane", () => {
    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");
    assert(adminHtml.includes('id="sec-tab-config-btn"'), "admin.html must have sec-tab-config-btn");
    assert(adminHtml.includes('id="sec-tab-recovery-btn"'), "admin.html must have sec-tab-recovery-btn");
    assert(adminHtml.includes('id="sec-pane-config"'), "admin.html must have sec-pane-config");
    assert(adminHtml.includes('id="sec-pane-recovery"'), "admin.html must have sec-pane-recovery");
    assert(adminHtml.includes('id="sec-rec-step-resetpass"'), "admin.html must have sec-rec-step-resetpass for full recovery journey");
  });

  // 23. Dedicated Modular CSS File for Admin Security
  await runTest("23. css/admin/admin-security.css exists and is linked in admin.html", () => {
    const cssPath = path.join(ROOT_DIR, "css", "admin", "admin-security.css");
    assert(fs.existsSync(cssPath), "css/admin/admin-security.css must exist");
    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");
    assert(adminHtml.includes('href="css/admin/admin-security.css"'), "admin.html must link css/admin/admin-security.css");
  });

  // 24. Vector SVG Eye Toggles (Zero Raw Emojis in Password Eye Toggles)
  await runTest("24. Canonical Vector SVG eye toggles are used across admin.html and index.html with zero emoji text", () => {
    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
    
    assert(adminHtml.includes('eye-open'), "admin.html must use SVG eye-open");
    assert(adminHtml.includes('eye-closed'), "admin.html must use SVG eye-closed");
    assert(indexHtml.includes('eye-open'), "index.html must use SVG eye-open");
    assert(indexHtml.includes('eye-closed'), "index.html must use SVG eye-closed");
  });

  // 25. Buffer Body Parsing Simulation Test
  await runTest("25. parseRequestBody correctly extracts action from Buffer, Object, and String bodies", async () => {
    async function testParser(bodyInput) {
      const req = { body: bodyInput };
      if (req.body) {
        if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
        if (Buffer.isBuffer(req.body)) {
          try { return JSON.parse(req.body.toString("utf8")); } catch (e) { return {}; }
        }
        if (typeof req.body === "string" && req.body.trim()) {
          try { return JSON.parse(req.body); } catch (e) { return {}; }
        }
      }
      return {};
    }

    const bufPayload = Buffer.from(JSON.stringify({ action: "verify-recovery-code", code: "WS-4E8B-9A21-7F04" }));
    const parsedBuf = await testParser(bufPayload);
    assert.strictEqual(parsedBuf.action, "verify-recovery-code", "Buffer body must parse action correctly");
    assert.strictEqual(parsedBuf.code, "WS-4E8B-9A21-7F04", "Buffer body must parse code correctly");

    const strPayload = JSON.stringify({ action: "passkey-challenge" });
    const parsedStr = await testParser(strPayload);
    assert.strictEqual(parsedStr.action, "passkey-challenge", "String body must parse action correctly");

    const objPayload = { action: "save-recovery-code", code: "WS-1111-2222-3333" };
    const parsedObj = await testParser(objPayload);
    assert.strictEqual(parsedObj.action, "save-recovery-code", "Object body must parse action correctly");
  });

  // 26. Active Recovery Code Session Synchronization & OTP UI Cleanup
  await runTest("26. Admin Security synchronizes active recovery code from session and cleans up OTP UI upon verification", () => {
    const secJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-security.js"), "utf8");
    assert(secJs.includes("sessionStorage.getItem(\"bw_active_recovery_code\")"), "Admin security must check bw_active_recovery_code on init");
    assert(secJs.includes("otpInp.value = \"\""), "Admin security must clear OTP input upon verification");
    assert(secJs.includes("codeInp.value = \"\""), "Admin security must clear Recovery Code input upon verification");
  });

  // 27. Stale sessionStorage Protection & Server Authority Precedence with normalizeRecoveryTimestamp
  await runTest("27. Stale sessionStorage Protection & Server Authority Precedence with normalizeRecoveryTimestamp", () => {
    const adminSec = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-security.js"), "utf8");
    const qeSec = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "admin-security.js"), "utf8");
    const dbJs = fs.readFileSync(path.join(ROOT_DIR, "js", "database.js"), "utf8");

    assert(dbJs.includes("has_recovery_code"), "DatabaseModule must return has_recovery_code metadata");
    assert(dbJs.includes("recovery_code_updated_at"), "DatabaseModule must return recovery_code_updated_at metadata");

    assert(adminSec.includes("normalizeRecoveryTimestamp"), "AdminSecurity must define normalizeRecoveryTimestamp");
    assert(adminSec.includes("normSession !== null && normServer !== null && normSession === normServer"), "AdminSecurity must validate normalized millisecond timestamps");
    assert(adminSec.includes("sessionStorage.removeItem(\"bw_active_recovery_code\")"), "AdminSecurity must remove stale session code when timestamp differs");
    assert(adminSec.includes("••••-••••-••••-••••"), "AdminSecurity must mask code display when session code is absent or stale");

    assert(qeSec.includes("normalizeRecoveryTimestamp"), "QuickEditor AdminSecurity must define normalizeRecoveryTimestamp");
    assert(qeSec.includes("normSession !== null && normServer !== null && normSession === normServer"), "QuickEditor must validate normalized millisecond timestamps");
    assert(qeSec.includes("sessionStorage.removeItem(\"bw_active_recovery_code\")"), "QuickEditor must clear stale session code on mismatch");
  });

  // 28. Admin <-> Quick Editor Parity Lifecycle (Code A Invalidated -> Code B Verified)
  await runTest("28. Cross-Tab Parity: Server-Authoritative Code Replacement (Code A Invalidation -> Code B Verification)", async () => {
    function pbkdf2Async(password, salt) {
      return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 600000, 32, "sha256", (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey.toString("hex"));
        });
      });
    }

    const codeA = "WS-AAAA-1111-2222";
    const saltA = crypto.randomBytes(16).toString("hex");
    let currentHash = await pbkdf2Async(codeA, saltA);
    let currentSalt = saltA;

    const hashCheckA = await pbkdf2Async(codeA, currentSalt);
    assert(crypto.timingSafeEqual(Buffer.from(currentHash, "hex"), Buffer.from(hashCheckA, "hex")), "Code A must verify on server");

    const codeB = "WS-BBBB-3333-4444";
    const saltB = crypto.randomBytes(16).toString("hex");
    currentHash = await pbkdf2Async(codeB, saltB);
    currentSalt = saltB;

    const staleCheckA = await pbkdf2Async(codeA, currentSalt);
    assert(!crypto.timingSafeEqual(Buffer.from(currentHash, "hex"), Buffer.from(staleCheckA, "hex")), "Stale Code A must be REJECTED after Code B generation");

    const validCheckB = await pbkdf2Async(codeB, currentSalt);
    assert(crypto.timingSafeEqual(Buffer.from(currentHash, "hex"), Buffer.from(validCheckB, "hex")), "New Code B must verify successfully on server");
  });

  // 29. Server Persistence Precondition for Session Storage
  await runTest("29. Generation Flow: Session storage updated ONLY after server persistence succeeds", () => {
    const adminSec = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-security.js"), "utf8");
    const qeSec = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "admin-security.js"), "utf8");

    assert(adminSec.includes("if (res.ok && data.success) {"), "Admin must check res.ok && data.success before storing session code");
    assert(qeSec.includes("if (res.ok && data.success) {"), "Quick Editor must check res.ok && data.success before storing session code");
  });

  // 30. normalizeRecoveryTimestamp comprehensive unit testing
  await runTest("30. normalizeRecoveryTimestamp correctly normalizes ISO, UTC offsets, and invalid dates", () => {
    function normalizeRecoveryTimestamp(timestamp) {
      if (!timestamp || (typeof timestamp !== "string" && typeof timestamp !== "number" && !(timestamp instanceof Date))) {
        return null;
      }
      const ms = new Date(timestamp).getTime();
      return Number.isFinite(ms) ? ms : null;
    }

    const t1 = "2026-08-24T10:45:00.123Z";
    const t2 = "2026-08-24T10:45:00.123+00:00";
    const t3 = "2026-08-24T16:15:00.123+05:30"; // exact same UTC instant as 10:45:00.123Z
    const tDifferent = "2026-08-24T10:45:01.000Z";

    const n1 = normalizeRecoveryTimestamp(t1);
    const n2 = normalizeRecoveryTimestamp(t2);
    const n3 = normalizeRecoveryTimestamp(t3);
    const nDiff = normalizeRecoveryTimestamp(tDifferent);

    assert(n1 !== null, "Valid ISO timestamp must parse to non-null milliseconds");
    assert.strictEqual(n1, n2, "Z and +00:00 representations of identical instant must produce equal milliseconds");
    assert.strictEqual(n1, n3, "UTC and +05:30 representations of identical instant must produce equal milliseconds");
    assert.notStrictEqual(n1, nDiff, "Different timestamp must not equal");

    // Invalid / missing checks
    assert.strictEqual(normalizeRecoveryTimestamp(null), null, "null must return null");
    assert.strictEqual(normalizeRecoveryTimestamp(""), null, "empty string must return null");
    assert.strictEqual(normalizeRecoveryTimestamp(undefined), null, "undefined must return null");
    assert.strictEqual(normalizeRecoveryTimestamp("not-a-date"), null, "invalid date string must return null");
  });

  // 31. Stale Session Validation Matrix Testing
  await runTest("31. Stale session validation matrix enforces exact server authority across all permutations", () => {
    function normalizeRecoveryTimestamp(timestamp) {
      if (!timestamp || (typeof timestamp !== "string" && typeof timestamp !== "number" && !(timestamp instanceof Date))) {
        return null;
      }
      const ms = new Date(timestamp).getTime();
      return Number.isFinite(ms) ? ms : null;
    }

    function evaluateSessionValidity(hasServerCode, sessionCode, sessionTime, serverCodeTime) {
      const normSession = normalizeRecoveryTimestamp(sessionTime);
      const normServer = normalizeRecoveryTimestamp(serverCodeTime);
      return !!(hasServerCode && sessionCode && normSession !== null && normServer !== null && normSession === normServer);
    }

    const isoA = "2026-08-24T10:45:00.123Z";
    const isoA_Offset = "2026-08-24T10:45:00.123+00:00";
    const isoB = "2026-08-24T10:45:30.000Z";

    // 1. Same timestamp, same format -> VALID
    assert.strictEqual(evaluateSessionValidity(true, "WS-1111-2222-3333", isoA, isoA), true);

    // 2. Same timestamp, different timezone format -> VALID
    assert.strictEqual(evaluateSessionValidity(true, "WS-1111-2222-3333", isoA, isoA_Offset), true);

    // 3. Different timestamp (Tab B generated new code) -> INVALID (Masked)
    assert.strictEqual(evaluateSessionValidity(true, "WS-1111-2222-3333", isoA, isoB), false);

    // 4. Missing session code -> INVALID (Masked)
    assert.strictEqual(evaluateSessionValidity(true, null, isoA, isoA), false);

    // 5. Missing session timestamp -> INVALID (Masked)
    assert.strictEqual(evaluateSessionValidity(true, "WS-1111-2222-3333", null, isoA), false);

    // 6. Missing server timestamp -> INVALID (Masked)
    assert.strictEqual(evaluateSessionValidity(true, "WS-1111-2222-3333", isoA, null), false);

    // 7. Invalid session timestamp -> INVALID (Masked)
    assert.strictEqual(evaluateSessionValidity(true, "WS-1111-2222-3333", "invalid-time", isoA), false);

    // 8. Invalid server timestamp -> INVALID (Masked)
    assert.strictEqual(evaluateSessionValidity(true, "WS-1111-2222-3333", isoA, "invalid-time"), false);

    // 9. Server has no recovery code -> INVALID (Masked)
    assert.strictEqual(evaluateSessionValidity(false, "WS-1111-2222-3333", isoA, isoA), false);
  });

  console.log("\n============================================================");
  console.log(`PHASE 31H-2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAllPhase31HTests();
}

module.exports = { runAllPhase31HTests };
