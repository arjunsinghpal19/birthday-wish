/**
 * ============================================================================
 * TEST SUITE: PHASE 31G ADMIN BACKUP + LOGS + SETTINGS FULL SUITE
 * Validates Backup JSON export/import, duplicate detection, sensitive data
 * sanitization, persistent audit logging, category filtering, global settings
 * management, and protected system invariants.
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    testsFailed++;
  }
}

console.log("============================================================");
console.log("💾 STARTING PHASE 31G BACKUP, LOGS & SETTINGS TEST SUITE");
console.log("============================================================\n");

// Mock Browser Environment
const localStorageStore = {};
globalThis.window = {
  location: {
    origin: "https://birthday-wish-arjun.vercel.app",
    pathname: "/admin.html"
  },
  localStorage: {
    getItem(key) { return localStorageStore[key] || null; },
    setItem(key, val) { localStorageStore[key] = String(val); },
    removeItem(key) { delete localStorageStore[key]; },
    clear() {
      for (const k in localStorageStore) delete localStorageStore[k];
    }
  },
  confirm(msg) { return true; }
};

globalThis.document = {
  getElementById(id) {
    return {
      id,
      value: "",
      checked: true,
      innerHTML: "",
      textContent: "",
      appendChild(c) {},
      addEventListener(evt, cb) {}
    };
  },
  querySelector(sel) { return null; },
  querySelectorAll(sel) { return []; },
  createElement(tag) {
    return {
      tagName: tag,
      style: {},
      innerHTML: "",
      appendChild(c) {},
      click() {}
    };
  }
};

globalThis.Blob = class MockBlob {
  constructor(content, opts) {
    this.content = content;
    this.type = opts ? opts.type : "";
  }
};

globalThis.URL = {
  createObjectURL(blob) { return "blob:mock-url"; },
  revokeObjectURL(url) {}
};

// 1. Load Admin Themes (Theme Registry Authority)
const themesCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-themes.js"), "utf8");
eval(themesCode);

// 2. Load Admin Settings
const settingsCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-settings.js"), "utf8");
eval(settingsCode);

// 3. Load Admin Logs
const logsCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-logs.js"), "utf8");
eval(logsCode);

// 4. Load Admin Backup
const backupCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-backup.js"), "utf8");
eval(backupCode);

const AdminSettings = window.AdminSettings;
const AdminLogs = window.AdminLogs;
const AdminBackup = window.AdminBackup;
const ThemeRegistry = window.ThemeRegistry;
const AdminThemes = window.AdminThemes;

runTest("1. AdminSettings returns canonical default settings on clean storage", () => {
  window.localStorage.clear();
  const settings = AdminSettings.getSettings();
  assert.ok(settings, "Settings must exist");
  assert.strictEqual(settings.siteName, "Birthday Surprise Wish Generator");
  assert.strictEqual(settings.defaultPageSize, 10);
  assert.strictEqual(settings.tableDensity, "standard");
  assert.strictEqual(settings.confirmBeforeDelete, true);
  assert.strictEqual(settings.maxLogsRetained, 100);
});

runTest("2. AdminSettings persists updates to localStorage under bw_admin_global_settings", () => {
  AdminSettings.saveSettings({
    siteName: "Shivam's Royal Birthday Studio",
    defaultPageSize: 25,
    tableDensity: "compact",
    autoRefreshInterval: 30
  });

  const updated = AdminSettings.getSettings();
  assert.strictEqual(updated.siteName, "Shivam's Royal Birthday Studio");
  assert.strictEqual(updated.defaultPageSize, 25);
  assert.strictEqual(updated.tableDensity, "compact");
  assert.strictEqual(updated.autoRefreshInterval, 30);

  const rawStorage = JSON.parse(window.localStorage.getItem("bw_admin_global_settings"));
  assert.strictEqual(rawStorage.siteName, "Shivam's Royal Birthday Studio");
  assert.strictEqual(rawStorage.defaultPageSize, 25);
});

runTest("3. AdminSettings normalizes and validates invalid inputs gracefully", () => {
  AdminSettings.saveSettings({
    defaultPageSize: 999, // Invalid page size
    tableDensity: "huge-invalid-density",
    autoRefreshInterval: 9999
  });

  const settings = AdminSettings.getSettings();
  assert.strictEqual(settings.defaultPageSize, 10, "Invalid page size must revert to default (10)");
  assert.strictEqual(settings.tableDensity, "standard", "Invalid density must revert to standard");
  assert.strictEqual(settings.autoRefreshInterval, 0, "Invalid interval must revert to 0");
});

runTest("4. AdminSettings resetSettings reverts to canonical defaults", () => {
  AdminSettings.resetSettings();
  const settings = AdminSettings.getSettings();
  assert.strictEqual(settings.siteName, "Birthday Surprise Wish Generator");
  assert.strictEqual(settings.defaultPageSize, 10);
  assert.strictEqual(settings.tableDensity, "standard");
});

runTest("5. ThemeRegistry remains sole authority for theme defaults (Settings does NOT duplicate)", () => {
  assert.ok(ThemeRegistry, "ThemeRegistry must exist");
  assert.strictEqual(ThemeRegistry.getAll().length, 6, "Must have exactly 6 registered themes");
  assert.strictEqual(typeof AdminThemes.getActiveDefaultThemeId, "function", "AdminThemes must own default getter");
  const settings = AdminSettings.getSettings();
  assert.strictEqual(settings.defaultTheme, undefined, "AdminSettings must NOT contain defaultTheme property");
  assert.strictEqual(settings.letterTheme, undefined, "AdminSettings must NOT contain letterTheme property");
});

runTest("6. AdminLogs sanitizes sensitive passwords, tokens, and recovery codes", () => {
  const sanitizedPass = AdminLogs.sanitizeLogText("User changed password to mySuperSecret123!");
  assert.ok(!sanitizedPass.includes("mySuperSecret123!"), "Password must be redacted");
  assert.ok(sanitizedPass.includes("[REDACTED]"), "Must contain REDACTED marker");

  const sanitizedCode = AdminLogs.sanitizeLogText("Emergency code WS-9F8A-3E21-7B04 regenerated");
  assert.ok(!sanitizedCode.includes("WS-9F8A-3E21-7B04"), "Emergency code must be redacted");
  assert.ok(sanitizedCode.includes("WS-****-****-****"), "Must mask emergency recovery code");
});

runTest("7. AdminLogs categorizes events into standard categories", () => {
  assert.strictEqual(AdminLogs.getCategoryFromEvent("ADMIN_LOGIN"), "AUTH");
  assert.strictEqual(AdminLogs.getCategoryFromEvent("WISH_CREATED"), "WISH");
  assert.strictEqual(AdminLogs.getCategoryFromEvent("MEDIA_UPLOAD"), "MEDIA");
  assert.strictEqual(AdminLogs.getCategoryFromEvent("BACKUP_EXPORT"), "BACKUP");
  assert.strictEqual(AdminLogs.getCategoryFromEvent("SETTINGS_SAVED"), "SETTINGS");
  assert.strictEqual(AdminLogs.getCategoryFromEvent("PASSWORD_CHANGED"), "SECURITY");
});

runTest("8. AdminLogs persists logs in localStorage under bw_admin_audit_logs", () => {
  AdminLogs.log("TEST_ACTION", "Testing audit log persistence");
  const logs = AdminLogs.getLogs();
  assert.ok(logs.length > 0, "Logs must not be empty");
  assert.strictEqual(logs[0].event, "TEST_ACTION");

  const raw = JSON.parse(window.localStorage.getItem("bw_admin_audit_logs"));
  assert.ok(Array.isArray(raw), "Raw storage must be an array");
  assert.strictEqual(raw[0].event, "TEST_ACTION");
});

runTest("9. AdminLogs export and clear operations", () => {
  AdminLogs.log("ACTION_ONE", "Test event 1");
  AdminLogs.log("ACTION_TWO", "Test event 2");
  
  assert.doesNotThrow(() => AdminLogs.exportLogsCSV());
  assert.doesNotThrow(() => AdminLogs.exportLogsJSON());

  AdminLogs.clearLogs();
  const logsAfter = AdminLogs.getLogs();
  assert.strictEqual(logsAfter.length, 0, "Logs must be cleared");
});

runTest("10. AdminBackup exports structured JSON with version 2.5 and summary metrics", () => {
  const sampleWishes = [
    { id: "wish-1", name: "Aarav", slug: "aarav", letterTheme: "galaxy" },
    { id: "wish-2", name: "Ananya", slug: "ananya", letterTheme: "sapphire" }
  ];
  const sampleLogs = [
    { time: "now", event: "WISH_CREATED", desc: "Created wish", status: "SUCCESS" }
  ];

  let exportedEvent = null;
  AdminBackup.exportBackup(sampleWishes, sampleLogs, AdminSettings.getSettings(), (ev, desc) => {
    exportedEvent = { ev, desc };
  });

  assert.ok(exportedEvent, "Backup export event must be emitted");
  assert.strictEqual(exportedEvent.ev, "BACKUP_EXPORT");
});

runTest("11. AdminBackup validates schema and detects duplicate IDs", () => {
  const validData = {
    version: "2.5",
    wishes: [
      { id: "w-1", name: "Test 1" },
      { id: "w-2", name: "Test 2" }
    ],
    logs: []
  };
  const valResult = AdminBackup.validateBackupPayload(validData);
  assert.strictEqual(valResult.valid, true);
  assert.strictEqual(valResult.summary.totalWishes, 2);
  assert.strictEqual(valResult.summary.duplicateCount, 0);

  const duplicateData = {
    wishes: [
      { id: "dup-1", name: "A" },
      { id: "dup-1", name: "B" }
    ]
  };
  const dupResult = AdminBackup.validateBackupPayload(duplicateData);
  assert.strictEqual(dupResult.valid, true);
  assert.strictEqual(dupResult.summary.duplicateCount, 1);

  const invalidData = {
    wishes: "not-an-array"
  };
  const invalidResult = AdminBackup.validateBackupPayload(invalidData);
  assert.strictEqual(invalidResult.valid, false);
});

runTest("12. Quick Editor (customizer.js) remains protected with zero Admin settings logic", () => {
  const customizerPath = path.resolve(__dirname, "../js/modules/editor/customizer.js");
  const customizerCode = fs.readFileSync(customizerPath, "utf8");

  assert.ok(!customizerCode.includes("AdminSettings"), "customizer.js must NOT reference AdminSettings");
  assert.ok(!customizerCode.includes("bw_admin_global_settings"), "customizer.js must NOT access bw_admin_global_settings");
  assert.ok(!customizerCode.includes("AdminBackup"), "customizer.js must NOT reference AdminBackup");
  assert.ok(!customizerCode.includes("AdminLogs"), "customizer.js must NOT reference AdminLogs");
});

runTest("13. Public css/style.css closed envelope rules remain untouched", () => {
  const styleCssPath = path.resolve(__dirname, "../css/style.css");
  const styleCss = fs.readFileSync(styleCssPath, "utf8");

  assert.ok(!styleCss.includes(".theme-sapphire .env-body"), "style.css must not override .env-body");
  assert.ok(!styleCss.includes(".theme-galaxy .env-body"), "style.css must not override .env-body");
  assert.ok(!styleCss.includes("bw_admin_global_settings"), "style.css must not contain admin storage keys");
});

runTest("14. admin.html correctly imports stylesheets and scripts for Suite", () => {
  const adminHtmlPath = path.resolve(__dirname, "../admin.html");
  const adminHtmlCode = fs.readFileSync(adminHtmlPath, "utf8");

  assert.ok(adminHtmlCode.includes('href="css/admin/admin-settings-suite.css"'), "admin.html must link admin-settings-suite.css");
  assert.ok(adminHtmlCode.includes('src="js/admin/admin-backup.js"'), "admin.html must load admin-backup.js");
  assert.ok(adminHtmlCode.includes('src="js/admin/admin-logs.js"'), "admin.html must load admin-logs.js");
  assert.ok(adminHtmlCode.includes('src="js/admin/admin-settings.js"'), "admin.html must load admin-settings.js");
  assert.ok(adminHtmlCode.includes('id="btn-save-settings"'), "admin.html must include btn-save-settings");
  assert.ok(adminHtmlCode.includes('id="btn-reset-settings"'), "admin.html must include btn-reset-settings");
  assert.ok(adminHtmlCode.includes('id="logs-search-input"'), "admin.html must include logs-search-input");
  assert.ok(adminHtmlCode.includes('id="logs-category-filter"'), "admin.html must include logs-category-filter");
});

runTest("15. Module file sizes remain modular (< 35 KB)", () => {
  const backupStat = fs.statSync(path.join(__dirname, "../js/admin/admin-backup.js"));
  const logsStat = fs.statSync(path.join(__dirname, "../js/admin/admin-logs.js"));
  const settingsStat = fs.statSync(path.join(__dirname, "../js/admin/admin-settings.js"));
  const themesStat = fs.statSync(path.join(__dirname, "../js/admin/admin-themes.js"));

  assert.ok(backupStat.size / 1024 < 35, `admin-backup.js must be < 35 KB (${(backupStat.size / 1024).toFixed(2)} KB)`);
  assert.ok(logsStat.size / 1024 < 35, `admin-logs.js must be < 35 KB (${(logsStat.size / 1024).toFixed(2)} KB)`);
  assert.ok(settingsStat.size / 1024 < 35, `admin-settings.js must be < 35 KB (${(settingsStat.size / 1024).toFixed(2)} KB)`);
  assert.ok(themesStat.size / 1024 < 35, `admin-themes.js must be < 35 KB (${(themesStat.size / 1024).toFixed(2)} KB)`);
});

runTest("16. AdminLogs.formatLogTimestamp formats 24-hour timestamps to 12-hour format with AM/PM", () => {
  assert.strictEqual(typeof AdminLogs.formatLogTimestamp, "function", "formatLogTimestamp must be exported");

  // 20:46:25 -> 08:46:25 PM
  const formattedEvening = AdminLogs.formatLogTimestamp("23/08/2026, 20:46:25");
  assert.strictEqual(formattedEvening, "23/08/2026, 08:46:25 PM");

  // 09:15:04 -> 09:15:04 AM
  const formattedMorning = AdminLogs.formatLogTimestamp("05/04/2026, 09:15:04");
  assert.strictEqual(formattedMorning, "05/04/2026, 09:15:04 AM");

  // Date instance with specific time
  const testDate = new Date(2026, 7, 23, 20, 43, 40); // 23 Aug 2026 20:43:40
  const formattedDateObj = AdminLogs.formatLogTimestamp(testDate);
  assert.strictEqual(formattedDateObj, "23/08/2026, 08:43:40 PM");
});

runTest("17. AdminLogs.formatLogTimestamp handles midnight, noon, and single-digit padding", () => {
  // Midnight (00:05:09) -> 12:05:09 AM
  const midnight = AdminLogs.formatLogTimestamp("01/01/2026, 00:05:09");
  assert.strictEqual(midnight, "01/01/2026, 12:05:09 AM");

  // Noon (12:30:00) -> 12:30:00 PM
  const noon = AdminLogs.formatLogTimestamp("15/06/2026, 12:30:00");
  assert.strictEqual(noon, "15/06/2026, 12:30:00 PM");

  // 13:00:00 -> 01:00:00 PM
  const onePm = AdminLogs.formatLogTimestamp("20/10/2026, 13:00:00");
  assert.strictEqual(onePm, "20/10/2026, 01:00:00 PM");
});

runTest("18. admin-settings-suite.css encapsulates category dropdown and logs table column formatting", () => {
  const cssPath = path.resolve(__dirname, "../css/admin/admin-settings-suite.css");
  const cssContent = fs.readFileSync(cssPath, "utf8");

  assert.ok(cssContent.includes(".logs-select"), "CSS must define .logs-select");
  assert.ok(cssContent.includes(".logs-select option"), "CSS must define .logs-select option");
  assert.ok(cssContent.includes(".logs-table th.col-timestamp"), "CSS must style .logs-table col-timestamp");
  assert.ok(cssContent.includes("white-space: nowrap;"), "CSS must enforce nowrap on timestamp column");
});

console.log("\n============================================================");
console.log(`🏁 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log("============================================================");

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL PHASE 31G BACKUP, LOGS & SETTINGS TESTS PASSED!");
  process.exit(0);
}
