/**
 * ============================================================================
 * TEST SUITE: PHASE 31J RESPONSIVE DEFECT FIXES PASS #2
 * (scratch/test_phase31j_defect_fixes.js)
 * Tests:
 * 1. Security: Re-Register & Remove Passkey Balanced Buttons (42px Height & Mobile 100% Stack)
 * 2. Dashboard Actions: Row 1 (Copy Summary + Export Report 50% Split) & Row 2 (Refresh Analytics 100%)
 * 3. Dashboard Overview: Recent Wishes Contained Table, Storage 1-Col Collapse, Activity Word Wrap
 * 4. Media Library: 3-Column Responsive Mobile Grid (All 8 Categories Visible & Reachable)
 * 5. Backup: Secondary Dark-Purple Theme Style for Select Backup File (.json)
 * 6. Preservation: Quick Editor 12-Section Order & Locked ShareModule Contracts
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ ${name}:`, err.message);
    failCount++;
  }
}

console.log("\n============================================================");
console.log("🧪 RUNNING PHASE 31J RESPONSIVE DEFECT FIXES PASS #2 TESTS");
console.log("============================================================\n");

// Read files
const adminHtml = fs.readFileSync(path.join(ROOT, "admin.html"), "utf8");
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const adminResponsiveCss = fs.readFileSync(path.join(ROOT, "css/admin/admin-responsive.css"), "utf8");
const adminMediaCss = fs.readFileSync(path.join(ROOT, "css/admin/admin-media.css"), "utf8");
const adminSecurityCss = fs.readFileSync(path.join(ROOT, "css/admin/admin-security.css"), "utf8");
const adminDashboardCss = fs.readFileSync(path.join(ROOT, "css/admin/admin-dashboard.css"), "utf8");
const adminSettingsSuiteCss = fs.readFileSync(path.join(ROOT, "css/admin/admin-settings-suite.css"), "utf8");
const shareJs = fs.readFileSync(path.join(ROOT, "js/share.js"), "utf8");

// TEST 1: Security Passkey Action Buttons (Issue 1)
test("1. Security: Remove Passkey & Re-Register Passkey have balanced 42px height and 100% mobile stacking", () => {
  assert.ok(adminHtml.includes('class="passkey-actions-row"'), "admin.html must contain .passkey-actions-row");
  assert.ok(adminHtml.includes('id="btn-register-passkey"'), "admin.html must contain #btn-register-passkey");
  assert.ok(adminHtml.includes('id="btn-remove-passkey"'), "admin.html must contain #btn-remove-passkey");
  assert.ok(!adminHtml.includes('class="btn-sm btn-remove-passkey"'), "Remove passkey must not be assigned btn-sm class");
  
  assert.ok(adminSecurityCss.includes("#btn-register-passkey"), "admin-security.css must style #btn-register-passkey");
  assert.ok(adminSecurityCss.includes("#btn-remove-passkey"), "admin-security.css must style #btn-remove-passkey");
  assert.ok(adminSecurityCss.includes("height: 42px !important"), "Buttons must have matching 42px height");
  assert.ok(adminSecurityCss.includes("min-height: 42px !important"), "Buttons must have min-height 42px");
  assert.ok(adminSecurityCss.includes("rgba(239, 68, 68"), "Remove passkey must have destructive red styling");

  assert.ok(adminResponsiveCss.includes(".passkey-actions-row"), "admin-responsive.css must style .passkey-actions-row");
  assert.ok(adminResponsiveCss.includes("flex-direction: column"), "Passkey actions must stack vertically on mobile");
  assert.ok(adminResponsiveCss.includes("width: 100% !important"), "Passkey action buttons must be full-width on mobile");
});

// TEST 2: Dashboard Overview Header Actions (Issue 2)
test("2. Dashboard Actions: Row 1 (Copy Summary + Export Report) & Row 2 (Refresh Analytics full-width)", () => {
  assert.ok(adminHtml.includes('id="btn-dash-copy-summary"'), "admin.html must contain #btn-dash-copy-summary");
  assert.ok(adminHtml.includes('id="btn-dash-export-report"'), "admin.html must contain #btn-dash-export-report");
  assert.ok(adminHtml.includes('id="btn-refresh-dashboard"'), "admin.html must contain #btn-refresh-dashboard");
  
  assert.ok(adminResponsiveCss.includes(".dash-header-actions #btn-dash-copy-summary"), "admin-responsive.css must style copy summary button");
  assert.ok(adminResponsiveCss.includes("calc(50% - 4px)"), "Copy summary and export report must share Row 1 with 50% split");
  assert.ok(adminResponsiveCss.includes(".dash-header-actions #btn-refresh-dashboard"), "admin-responsive.css must style refresh dashboard button");
  assert.ok(adminResponsiveCss.includes("flex: 1 1 100% !important"), "Refresh dashboard must be 100% full width on Row 2");
});

// TEST 3: Dashboard Overview Sections Containment (Issue 3)
test("3. Dashboard Overview: Recent Wishes contained table, Storage 1-col mobile collapse, Activity word-wrap", () => {
  // Recent Wishes Table
  const recentWishesSection = adminHtml.substring(adminHtml.indexOf('Recent Wishes'), adminHtml.indexOf('Storage Overview'));
  assert.ok(recentWishesSection.includes('class="table-responsive-wrapper"'), "Recent Wishes table must be wrapped in .table-responsive-wrapper");

  // Storage Overview Collapse
  assert.ok(adminResponsiveCss.includes(".dash-storage-grid"), "admin-responsive.css must style .dash-storage-grid");
  assert.ok(adminResponsiveCss.includes("grid-template-columns: 1fr !important"), "Storage grid must collapse to 1 column on mobile");
  assert.ok(adminResponsiveCss.includes(".dash-storage-capacity-bar"), "Storage capacity bar must be responsive");

  // System Activity
  assert.ok(adminResponsiveCss.includes("#dash-recent-activity-list"), "admin-responsive.css must style #dash-recent-activity-list");
  assert.ok(adminResponsiveCss.includes("overflow-wrap: anywhere !important") || adminResponsiveCss.includes("word-break: break-word !important"), "Activity list must have natural word wrap");
});

// TEST 4: Media Library 3-Column Mobile Grid (Issue 4)
test("4. Media Library: Configured as responsive 3-column multi-row grid on mobile (All 8 categories reachable)", () => {
  const categories = ["all", "images", "videos", "audio", "used", "unused", "favorites", "recent"];
  categories.forEach(cat => {
    assert.ok(adminHtml.includes(`data-damfilter="${cat}"`), `Media Library must contain filter chip data-damfilter="${cat}"`);
  });

  assert.ok(adminResponsiveCss.includes("grid-template-columns: repeat(3, minmax(0, 1fr)) !important"), "Filter chips group must use 3-column grid on mobile");
  assert.ok(adminResponsiveCss.includes("display: grid !important"), "Filter chips group must have display: grid on mobile");
  assert.ok(adminResponsiveCss.includes("overflow-x: visible !important"), "Filter chips group must not have horizontal scroller on mobile");
});

// TEST 5: Backup File Selection Secondary Theme Styling
test("5. Backup: Select Backup File button uses secondary dark-purple theme style with folder icon", () => {
  assert.ok(adminHtml.includes('id="btn-select-backup-file"'), "admin.html must contain #btn-select-backup-file");
  assert.ok(adminHtml.includes('class="btn-secondary btn-select-backup"'), "admin.html must assign btn-secondary btn-select-backup");
  assert.ok(adminHtml.includes("📁 Select Backup File (.json)"), "Button text must use crisp folder icon 📁");
  
  assert.ok(adminSettingsSuiteCss.includes(".btn-select-backup"), "admin-settings-suite.css must define .btn-select-backup");
  assert.ok(adminSettingsSuiteCss.includes("rgba(168, 85, 247"), "btn-select-backup must use secondary dark purple styling");
});

// TEST 6: Quick Editor 12-Section Order & Letter Theme Copy
test("6. Quick Editor: 12 sections in verified order & Letter Theme copy preserved", () => {
  const sectionIds = [];
  const regex = /<div\s+class="editor-section"\s+data-section="([^"]+)"/g;
  let match;
  while ((match = regex.exec(indexHtml)) !== null) {
    sectionIds.push(match[1]);
  }

  const EXPECTED_SECTIONS = [
    "basic", "sender", "relationship", "letter",
    "memory", "reasons", "wishes", "gallery",
    "timeline", "gift", "music", "videowish"
  ];

  assert.deepStrictEqual(sectionIds, EXPECTED_SECTIONS, "Quick Editor section order must match exactly");
  assert.ok(indexHtml.includes("💌 Letter Theme"), "Letter Theme header copy must be preserved");
  assert.ok(indexHtml.includes("Letter ka luxury color theme chuney"), "Letter Theme subtitle copy must be preserved");
});

// TEST 7: ShareModule Locked WhatsApp & Native Share Contracts
test("7. ShareModule: Locked WhatsApp contract and Native Share payload preserved", () => {
  const vm = require("vm");
  const context = { window: {}, encodeURIComponent: encodeURIComponent };
  vm.createContext(context);
  vm.runInContext(shareJs, context);

  const ShareModule = context.window.ShareModule;
  assert.ok(ShareModule, "ShareModule must be defined on window");

  const waMsg = ShareModule.buildWhatsAppMessage("https://example.com/?w=123&name=Pooja", "Pooja");
  const expectedWa = "Hey Pooja! 🎂✨\n\nMaine tumhare liye ek special Birthday Surprise banaya hai! 🎁💖\n\nKhol kar dekho 🎁:\nhttps://example.com/?w=123&name=Pooja";
  assert.strictEqual(waMsg, expectedWa, "WhatsApp message contract must match byte-for-byte");

  const nativePayload = ShareModule.buildNativeSharePayload("https://example.com/?w=123&name=Pooja", "Pooja");
  assert.strictEqual(nativePayload.title, "🎁 Birthday Surprise for Pooja", "Native share title must match exact contract");
  assert.ok(nativePayload.text.includes("Ek chhota sa surprise tumhara wait kar raha hai… 💝"), "Native share text must match exact contract");
  assert.strictEqual(nativePayload.url, "https://example.com/?w=123&name=Pooja", "Native share URL must match canonical URL");
});

// TEST 8: Header Action Buttons Right Alignment & Compact Width
test("8. Dashboard Overview: Header action buttons aligned to RIGHT and remain compact without stretching", () => {
  assert.ok(adminHtml.includes('id="btn-dash-view-all-wishes"'), "admin.html must contain #btn-dash-view-all-wishes");
  assert.ok(adminHtml.includes('id="btn-dash-view-all-media"'), "admin.html must contain #btn-dash-view-all-media");
  assert.ok(adminHtml.includes('id="btn-dash-view-all-logs"'), "admin.html must contain #btn-dash-view-all-logs");
  
  assert.ok(adminDashboardCss.includes(".dash-panel-header"), "admin-dashboard.css must define .dash-panel-header");
  assert.ok(adminDashboardCss.includes(".dash-panel-title"), "admin-dashboard.css must define .dash-panel-title");
  assert.ok(adminDashboardCss.includes("margin-left: auto"), "Header action buttons must have margin-left: auto");
  assert.ok(adminDashboardCss.includes("max-width: max-content"), "Header action buttons must have max-width: max-content");
  assert.ok(adminResponsiveCss.includes(".dash-panel-header .btn-dash-header-action"), "admin-responsive.css must style .dash-panel-header .btn-dash-header-action");
  assert.ok(adminResponsiveCss.includes("flex: 0 0 auto !important"), "Header action buttons must have flex: 0 0 auto !important");
});

// TEST 9: Audit Logs Mobile Action Buttons Layout (Row 1: CSV + JSON 50%, Row 2: Clear Logs 100%)
test("9. Audit Logs Actions: Row 1 (Export CSV + Export JSON 50%) & Row 2 (Clear Logs 100% full-width)", () => {
  assert.ok(adminHtml.includes('id="btn-export-logs-csv"'), "admin.html must contain #btn-export-logs-csv");
  assert.ok(adminHtml.includes('id="btn-export-logs-json"'), "admin.html must contain #btn-export-logs-json");
  assert.ok(adminHtml.includes('id="btn-clear-logs"'), "admin.html must contain #btn-clear-logs");
  
  assert.ok(adminResponsiveCss.includes("#view-logs .view-actions") || adminResponsiveCss.includes(".logs-actions-group"), "admin-responsive.css must style Audit Logs action container");
  assert.ok(adminResponsiveCss.includes("#btn-export-logs-csv"), "admin-responsive.css must style #btn-export-logs-csv");
  assert.ok(adminResponsiveCss.includes("#btn-export-logs-json"), "admin-responsive.css must style #btn-export-logs-json");
  assert.ok(adminResponsiveCss.includes("#btn-clear-logs"), "admin-responsive.css must style #btn-clear-logs");
  assert.ok(adminResponsiveCss.includes("calc(50% - 4px)"), "CSV and JSON export buttons must share row 1 with 50% width split");
  assert.ok(adminResponsiveCss.includes("flex: 1 1 100% !important"), "Clear Logs button must occupy 100% full-width on row 2");
});

console.log("\n============================================================");
console.log(`🏁 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log("============================================================\n");

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
