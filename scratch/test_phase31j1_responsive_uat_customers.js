/**
 * ============================================================================
 * PHASE 31J-1: RESPONSIVE UAT POLISH & CUSTOMER TAB TEST SUITE
 * (scratch/test_phase31j1_responsive_uat_customers.js)
 * Tests:
 * 1. Regenerate Emergency Code Centered Modal & Backdrop
 * 2. Dashboard Mobile Actions Responsive Stacking
 * 3. Mobile Top Navbar Presentation
 * 4. Wishes Manager Contained Table Scroller
 * 5. DAM Mobile Filter Chips Single Strip Scroll
 * 6. Security Recovery Cards Normalization
 * 7. Audit Logs Result Count Placement
 * 8. Coupons Navigation Item Removal
 * 9. Customers Navigation & DOM Section Presence
 * 10. Customers Analytics & Profile Derivation (Zero Fake DB)
 * 11. Quick Editor 12-Section Order & Letter Theme Preservation
 * 12. Locked ShareModule WhatsApp & Native Share Contracts
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
console.log("🧪 RUNNING PHASE 31J-1 RESPONSIVE UAT & CUSTOMER TAB TESTS");
console.log("============================================================\n");

// Read files
const adminHtml = fs.readFileSync(path.join(ROOT, "admin.html"), "utf8");
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const adminResponsiveCss = fs.readFileSync(path.join(ROOT, "css/admin/admin-responsive.css"), "utf8");
const adminComponentsCss = fs.readFileSync(path.join(ROOT, "css/admin/admin-components.css"), "utf8");
const adminSecurityJs = fs.readFileSync(path.join(ROOT, "js/admin/admin-security.js"), "utf8");
const adminCustomersJs = fs.readFileSync(path.join(ROOT, "js/admin/admin-customers.js"), "utf8");
const shareJs = fs.readFileSync(path.join(ROOT, "js/share.js"), "utf8");

// TEST 1: Regenerate Emergency Code Confirmation Modal
test("1. Regenerate Emergency Code confirmation modal is a centered overlay with backdrop", () => {
  assert.ok(adminHtml.includes('id="regen-confirm-modal"'), "admin.html must contain #regen-confirm-modal");
  assert.ok(adminHtml.includes('class="admin-modal-overlay"'), "admin.html must assign .admin-modal-overlay to modal");
  assert.ok(adminResponsiveCss.includes(".admin-modal-overlay") || adminComponentsCss.includes(".admin-modal-overlay"), "CSS must define .admin-modal-overlay");
  assert.ok(adminResponsiveCss.includes("position: fixed") || adminComponentsCss.includes("position: fixed"), "Overlay must be position: fixed");
  assert.ok(adminResponsiveCss.includes("justify-content: center") || adminComponentsCss.includes("justify-content: center"), "Overlay must center dialog");
  assert.ok(adminSecurityJs.includes("Escape"), "admin-security.js must handle Escape key closing");
});

// TEST 2: Dashboard Mobile Actions
test("2. Dashboard header actions have responsive stacking class and rules", () => {
  assert.ok(adminHtml.includes('class="dash-header-actions"'), "admin.html must contain .dash-header-actions");
  assert.ok(adminResponsiveCss.includes(".dash-header-actions"), "admin-responsive.css must define .dash-header-actions");
  assert.ok(adminResponsiveCss.includes("flex-direction: column"), "Actions must stack vertically on mobile");
});

// TEST 3: Mobile Top Navbar
test("3. Mobile navbar has compact status text and clean action spacing", () => {
  assert.ok(adminHtml.includes('id="admin-supabase-indicator"'), "admin.html must have #admin-supabase-indicator");
  assert.ok(adminHtml.includes('class="status-text"'), "admin.html must wrap status text in .status-text");
  assert.ok(adminResponsiveCss.includes(".status-indicator"), "admin-responsive.css must style .status-indicator");
  assert.ok(adminResponsiveCss.includes(".public-site-link"), "admin-responsive.css must style .public-site-link");
});

// TEST 4: Contained Table Scroller
test("4. Wishes and Logs tables are wrapped in .table-responsive-wrapper", () => {
  assert.ok(adminHtml.includes('class="table-responsive-wrapper"'), "admin.html must contain .table-responsive-wrapper");
  assert.ok(adminResponsiveCss.includes(".table-responsive-wrapper") || adminComponentsCss.includes(".table-responsive-wrapper"), "CSS must style .table-responsive-wrapper");
  assert.ok(adminResponsiveCss.includes("overflow-x: auto") || adminComponentsCss.includes("overflow-x: auto"), "Wrapper must have overflow-x: auto");
  assert.ok(adminResponsiveCss.includes("-webkit-overflow-scrolling: touch") || adminComponentsCss.includes("-webkit-overflow-scrolling: touch"), "Wrapper must support smooth touch scrolling");
});

// TEST 5: DAM Mobile Filter Chips 3-Column Grid (Phase 31J Pass #2)
test("5. DAM filter chips use responsive 3-column multi-row grid on mobile", () => {
  assert.ok(adminResponsiveCss.includes(".filter-chips-group"), "admin-responsive.css must style .filter-chips-group");
  assert.ok(adminResponsiveCss.includes("grid-template-columns: repeat(3, minmax(0, 1fr)) !important"), "Chips group must use 3-column grid on mobile");
  assert.ok(adminResponsiveCss.includes("display: grid !important"), "Chips group must have display: grid on mobile");
});

// TEST 6: Security Recovery Detail Cards Normalization
test("6. Security recovery detail cards have normalized mobile width and padding", () => {
  assert.ok(adminResponsiveCss.includes(".recovery-journey-box"), "admin-responsive.css must style .recovery-journey-box");
  assert.ok(adminResponsiveCss.includes(".recovery-step-panel > div"), "admin-responsive.css must normalize recovery panel cards");
});

// TEST 7: Audit Logs Result Count Placement
test("7. Audit logs toolbar stacks cleanly with count badge on mobile", () => {
  assert.ok(adminResponsiveCss.includes(".logs-toolbar"), "admin-responsive.css must style .logs-toolbar");
  assert.ok(adminResponsiveCss.includes(".logs-filter-group"), "admin-responsive.css must style .logs-filter-group");
  assert.ok(adminResponsiveCss.includes("#logs-count-badge"), "admin-responsive.css must style #logs-count-badge");
});

// TEST 8: Coupons Removed from Navigation
test("8. Coupons is completely removed from sidebar navigation", () => {
  const sidebarNavMatch = adminHtml.match(/<nav class="sidebar-nav">([\s\S]*?)<\/nav>/);
  assert.ok(sidebarNavMatch, "admin.html must contain .sidebar-nav");
  const sidebarNavContent = sidebarNavMatch[1];
  assert.ok(!sidebarNavContent.includes('data-tab="coupons"'), "Sidebar must NOT contain data-tab='coupons'");
  assert.ok(!sidebarNavContent.toLowerCase().includes("coupons"), "Sidebar must NOT contain Coupons text");
});

// TEST 9: Customers Navigation & Coming Soon DOM Section Presence
test("9. Customers tab exists in navigation, DOM view section, and script imports", () => {
  assert.ok(adminHtml.includes('data-tab="customers"'), "Sidebar must contain data-tab='customers'");
  assert.ok(adminHtml.includes('id="view-customers"'), "admin.html must contain section#view-customers");
  assert.ok(adminHtml.includes("Customer Management"), "Customers view must contain Customer Management header");
  assert.ok(adminHtml.includes("Coming Soon"), "Customers view must contain Coming Soon badge");
  assert.ok(adminHtml.includes('src="js/admin/admin-customers.js"'), "admin.html must import admin-customers.js");
});

// TEST 10: Customers Placeholder State & Zero Pseudo-Customer Rows
test("10. Customers tab displays Coming Soon state and does NOT show sender_name pseudo-customers", () => {
  assert.ok(!adminHtml.includes('id="kpi-total-customers"'), "Must NOT contain old pseudo-customer KPI #kpi-total-customers");
  assert.ok(!adminHtml.includes('id="customers-tbody"'), "Must NOT contain old pseudo-customer table #customers-tbody");
  assert.ok(adminHtml.includes("coming-soon-banner"), "Must contain .coming-soon-banner");
  assert.ok(adminHtml.includes("Customer accounts, profiles, wish ownership"), "Must explain upcoming Phase 32 Customer Dashboard");
});

// TEST 11: Quick Editor 12-Section Order & Letter Theme Preservation
test("11. Quick Editor 12 sections in verified order & Letter Theme copy preserved", () => {
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

// TEST 12: Locked ShareModule WhatsApp & Native Share Contracts
test("12. ShareModule locked WhatsApp contract and Native Share payload preserved", () => {
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

console.log("\n============================================================");
console.log(`🏁 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log("============================================================\n");

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
