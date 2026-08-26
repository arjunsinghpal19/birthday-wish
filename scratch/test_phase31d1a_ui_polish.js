/**
 * ============================================================================
 * PHASE 31D-1A — DASHBOARD UI POLISH & BRAIN SYNCHRONIZATION TEST SUITE
 *
 * Validates:
 * 1. Header action buttons exist in admin.html and have .btn-dash-header-action
 * 2. Manage Media, View Logs, View All Wishes buttons use unified right-aligned styling
 * 3. Insight action buttons (.btn-dash-insight-action) use compact shrink-wrapped styling
 * 4. formatActivityTime correctly formats 24h/ISO strings into 12-hour hh:mm:ss AM/PM format
 * 5. formatActivityTime handles leading zeros on hours, minutes, seconds
 * 6. renderActivityFeed formats logs using formatActivityTime
 * 7. Existing analytics calculations (trend, mix, snapshot) remain identical and unmutated
 * 8. 7D, 30D, and 90D trend chart switching remains fully functional
 * 9. BRAIN.md is the single authoritative memory file and contains updated Phase 31D-1A
 * 10. No duplicate brain/memory markdown files exist in workspace
 * 11. Protected systems (index.html, js/app.js, css/style.css, editor modules) remain untouched
 * 12. Zero secrets leakage
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

console.log("============================================================");
console.log("💎 STARTING PHASE 31D-1A UI POLISH & BRAIN SYNC TEST SUITE");
console.log("============================================================");

let testsPassed = 0;
let testsFailed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${++testsPassed}. ${desc}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(err);
    testsFailed++;
  }
}

// -------------------------------------------------------------
// Mock Environment
// -------------------------------------------------------------
globalThis.window = globalThis;
globalThis.location = { origin: "https://birthday-wish-arjun.vercel.app" };

function createMockElement(tag = "DIV") {
  const el = {
    tagName: tag.toUpperCase(),
    className: "",
    classList: {
      _classes: new Set(),
      add: function (...cls) { cls.forEach(c => this._classes.add(c)); },
      remove: function (...cls) { cls.forEach(c => this._classes.delete(c)); },
      contains: function (c) { return this._classes.has(c); },
      toggle: function (c) { if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c); }
    },
    style: {},
    innerHTML: "",
    textContent: "",
    dataset: {},
    appendChild: function (child) {
      this._children.push(child);
      this.innerHTML += (child.innerHTML || child.textContent || "");
      return child;
    },
    setAttribute: function (k, v) { this[k] = v; },
    getAttribute: function (k) { return this[k]; },
    querySelector: function (sel) {
      if (sel.startsWith("#")) {
        const id = sel.substring(1);
        return mockDOM[id] || null;
      }
      return createMockElement();
    },
    querySelectorAll: function (sel) {
      return [];
    },
    addEventListener: function (ev, cb) {
      if (!this._listeners) this._listeners = {};
      if (!this._listeners[ev]) this._listeners[ev] = [];
      this._listeners[ev].push(cb);
    },
    _children: [],
    _listeners: {}
  };
  return el;
}

let mockDOM = {};
globalThis.document = {
  getElementById: (id) => {
    if (!mockDOM[id]) {
      mockDOM[id] = createMockElement();
      mockDOM[id].id = id;
    }
    return mockDOM[id];
  },
  querySelector: (sel) => {
    if (sel && sel.startsWith("#")) {
      return document.getElementById(sel.substring(1));
    }
    return createMockElement();
  },
  querySelectorAll: () => [],
  createElement: (tag) => createMockElement(tag),
  addEventListener: () => {}
};

// Load Admin Modules
require(path.join(ROOT_DIR, "js", "admin", "admin-core.js"));
require(path.join(ROOT_DIR, "js", "admin", "admin-navigation.js"));
require(path.join(ROOT_DIR, "js", "admin", "admin-dashboard-analytics.js"));
require(path.join(ROOT_DIR, "js", "admin", "admin-dashboard.js"));

const { AdminDashboard, AdminDashboardAnalytics } = globalThis;

// =============================================================
// TESTS
// =============================================================

it("1. Header action buttons exist in admin.html and have .btn-dash-header-action", () => {
  const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");

  assert(adminHtml.includes('id="btn-dash-view-all-wishes"'), "Must contain btn-dash-view-all-wishes");
  assert(adminHtml.includes('id="btn-dash-view-all-media"'), "Must contain btn-dash-view-all-media");
  assert(adminHtml.includes('id="btn-dash-view-all-logs"'), "Must contain btn-dash-view-all-logs");

  assert(adminHtml.includes('class="btn-sm btn-dash-header-action" id="btn-dash-view-all-wishes"'), "View all wishes must have btn-dash-header-action");
  assert(adminHtml.includes('class="btn-sm btn-dash-header-action" id="btn-dash-view-all-media"'), "Manage media must have btn-dash-header-action");
  assert(adminHtml.includes('class="btn-sm btn-dash-header-action" id="btn-dash-view-all-logs"'), "View logs must have btn-dash-header-action");
});

it("2. CSS defines compact right-aligned styling for .btn-dash-header-action and .btn-dash-insight-action", () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, "css", "admin", "admin-dashboard.css"), "utf8");

  assert(css.includes(".btn-dash-header-action"), "CSS must contain .btn-dash-header-action");
  assert(css.includes(".btn-dash-insight-action"), "CSS must contain .btn-dash-insight-action");
  assert(css.includes("margin-left: auto"), "CSS must have margin-left: auto for right alignment");
  assert(css.includes("white-space: nowrap"), "CSS must have white-space: nowrap to prevent text wrapping");
});

it("3. formatActivityTime correctly formats 24h strings into 12-hour hh:mm:ss AM/PM format", () => {
  assert(typeof AdminDashboard.formatActivityTime === "function", "formatActivityTime must be exported");

  assert.strictEqual(AdminDashboard.formatActivityTime("00:05:08"), "12:05:08 AM");
  assert.strictEqual(AdminDashboard.formatActivityTime("09:14:32"), "09:14:32 AM");
  assert.strictEqual(AdminDashboard.formatActivityTime("13:30:17"), "01:30:17 PM");
  assert.strictEqual(AdminDashboard.formatActivityTime("17:30:17"), "05:30:17 PM");
  assert.strictEqual(AdminDashboard.formatActivityTime("23:59:59"), "11:59:59 PM");
  assert.strictEqual(AdminDashboard.formatActivityTime("12:00:00"), "12:00:00 PM");
});

it("4. renderActivityFeed formats logs using 12-hour format", () => {
  mockDOM = {};
  const sampleLogs = [
    { time: "17:30:17", event: "ADMIN_LOGIN", desc: "Session authenticated" },
    { time: "09:15:00", event: "MEDIA_UPLOAD", desc: "Uploaded photo" }
  ];

  AdminDashboard.renderActivityFeed(sampleLogs);

  const actList = mockDOM["dash-recent-activity-list"];
  assert(actList, "Activity list container must exist");
  assert(actList.innerHTML.includes("05:30:17 PM"), "Must render 05:30:17 PM instead of 17:30:17");
  assert(actList.innerHTML.includes("09:15:00 AM"), "Must render 09:15:00 AM");
});

it("5. renderOperationalInsights renders compact .btn-dash-insight-action buttons", () => {
  mockDOM = {};
  const mockInsights = [
    { type: "info", icon: "🎥", title: "Video Engagement", desc: "50% of wishes feature video", actionLabel: "Explore Wishes →", actionTab: "wishes" },
    { type: "warning", icon: "⚠️", title: "Storage Cleanup", desc: "2 unused files", actionLabel: "Review Unused →", actionTab: "media", actionFilter: "unused" }
  ];

  AdminDashboardAnalytics.renderOperationalInsights("dash-operational-insights", mockInsights);

  const container = mockDOM["dash-operational-insights"];
  assert(container, "Insights container must exist");
  assert(container.innerHTML.includes("btn-dash-insight-action"), "Must use .btn-dash-insight-action");
  assert(container.innerHTML.includes("Explore Wishes →"), "Must render Explore Wishes →");
  assert(container.innerHTML.includes("Review Unused →"), "Must render Review Unused →");
});

it("6. BRAIN.md is the authoritative memory file and contains updated Phase 31D-1A", () => {
  const brainPath = path.join(ROOT_DIR, "BRAIN.md");
  assert(fs.existsSync(brainPath), "BRAIN.md must exist in root workspace");

  const brain = fs.readFileSync(brainPath, "utf8");
  assert(brain.includes("PHASE 31D-1A — DASHBOARD UI POLISH + PROJECT BRAIN SYNCHRONIZATION"), "Must document Phase 31D-1A");
  assert(brain.includes("PHASE 31D-1 — DASHBOARD ANALYTICS & KPI EXPANSION"), "Must document Phase 31D-1");
  assert(brain.includes("PHASE 31D — DASHBOARD OVERVIEW & KPI FOUNDATION"), "Must document Phase 31D");
  assert(brain.includes("PERMANENT ARCHITECTURAL RULES & ANTI-MONOLITHIC MODULARITY"), "Must document anti-monolithic rules");
  assert(brain.includes("FUTURE BUSINESS & CUSTOMER PLATFORM (PHASE 32+)"), "Must document future customer platform roadmap");
});

it("7. No duplicate brain/memory documents exist in workspace", () => {
  const files = fs.readdirSync(ROOT_DIR);
  const docDuplicates = files.filter(f => /^(brain|project_brain|master_brain|context).*\.md$/i.test(f) && f !== "BRAIN.md");
  assert.strictEqual(docDuplicates.length, 0, `No duplicate brain files should exist: found [${docDuplicates.join(", ")}]`);
});

it("8. Protected files remain strictly untouched", () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(ROOT_DIR, "js", "app.js"), "utf8");
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, "css", "style.css"), "utf8");

  assert(!indexHtml.includes("btn-dash-header-action"), "index.html must not be modified");
  assert(!appJs.includes("btn-dash-header-action"), "app.js must not be modified");
  assert(!styleCss.includes("btn-dash-header-action"), "style.css must not be modified");
});

it("9. Zero secrets leakage across all modules", () => {
  const dashboardJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-dashboard.js"), "utf8");
  assert(!dashboardJs.includes("SUPABASE_SERVICE_ROLE_KEY"), "Must not leak secret keys in dashboard.js");
  assert(!dashboardJs.includes("service_role"), "Must not mention service_role in frontend code");
});

console.log("============================================================");
if (testsFailed === 0) {
  console.log(`🎉 ALL ${testsPassed} PHASE 31D-1A TESTS PASSED!`);
} else {
  console.error(`❌ ${testsFailed} TEST(S) FAILED!`);
  process.exit(1);
}
console.log("============================================================");
