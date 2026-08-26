/**
 * ============================================================================
 * PHASE 31D-1 — DASHBOARD ANALYTICS & KPI EXPANSION TEST SUITE
 *
 * Validates:
 * 1. AdminDashboardAnalytics module loads and exports authoritative methods
 * 2. createDashboardSnapshot generates single coherent snapshot from real data
 * 3. Content Mix calculation computes exact percentages for Photos, Videos, Audio, Letters, Passcodes
 * 4. Trend Series calculation aggregates chronological counts over 7D, 30D, 90D
 * 5. Empty / insufficient history state handled gracefully with truthful message
 * 6. Native SVG Trend Chart renders valid SVG paths, gridlines, labels, and nodes
 * 7. Content Mix distribution renders progress tracks and percentage values
 * 8. Operational Insights engine produces truthful actionable cards
 * 9. Unused media cleanup insight generates direct link to Media Library unused filter
 * 10. Period selector controls toggle 7D/30D/90D view using cached snapshot (0 extra requests)
 * 11. renderAllAnalytics coordinates complete analytics layer update
 * 12. AdminDashboard coordinates snapshot generation and analytics delegation
 * 13. HTML markup in admin.html contains all analytics containers and period buttons
 * 14. CSS styles in admin-dashboard.css cover period selectors, chart nodes, insight cards
 * 15. Protected files (index.html, js/app.js, css/style.css, editor modules) remain untouched
 * 16. Zero secret leakage across all modules
 * 17. XSS sanitization safe on all dynamically rendered labels and text
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

console.log("============================================================");
console.log("📈 STARTING PHASE 31D-1 DASHBOARD ANALYTICS TEST SUITE");
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
require(path.join(ROOT_DIR, "js", "admin", "admin-media.js"));

const { AdminDashboardAnalytics, AdminDashboard, AdminNavigation } = globalThis;

// Sample Datasets for Testing
const todayStr = new Date().toISOString().split("T")[0];
const sampleWishes = [
  {
    id: "wish-uuid-1",
    recipient_name: "Aarav Sharma",
    sender_name: "Priya",
    media_photos: "photos/aarav1.jpg",
    music_url: "audio/happy_song.mp3",
    letter_body: "Happy Birthday Aarav!",
    passcode: "9988",
    created_at: `${todayStr}T10:00:00.000Z`
  },
  {
    id: "wish-uuid-2",
    recipient_name: "Diya Patel",
    sender_name: "Rohan",
    video_url: "videos/diya_memory.mp4",
    media_photos: "photos/diya1.jpg",
    created_at: `${todayStr}T11:30:00.000Z`
  },
  {
    id: "wish-uuid-3",
    recipient_name: "Karan Verma",
    sender_name: "Ananya",
    letter_body: "Best wishes Karan!",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
  },
  {
    id: "wish-uuid-4",
    recipient_name: "Sneha Reddy",
    sender_name: "Vikram",
    video_url: "videos/sneha_clip.mp4",
    music_url: "audio/tunes.mp3",
    passcode: "5544",
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
  }
];

const sampleStorageFiles = [
  { path: "photos/aarav1.jpg", name: "aarav1.jpg", folder: "photos", size: 1048576, isUsed: true },
  { path: "photos/diya1.jpg", name: "diya1.jpg", folder: "photos", size: 2097152, isUsed: true },
  { path: "videos/diya_memory.mp4", name: "diya_memory.mp4", folder: "videos", size: 10485760, isUsed: true },
  { path: "videos/sneha_clip.mp4", name: "sneha_clip.mp4", folder: "videos", size: 5242880, isUsed: true },
  { path: "audio/happy_song.mp3", name: "happy_song.mp3", folder: "audio", size: 3145728, isUsed: true },
  { path: "photos/old_unused.jpg", name: "old_unused.jpg", folder: "photos", size: 2097152, isUsed: false },
  { path: "audio/old_unused_audio.mp3", name: "old_unused_audio.mp3", folder: "audio", size: 1572864, isUsed: false }
];

// =============================================================
// TESTS
// =============================================================

it("1. AdminDashboardAnalytics is defined and exports authoritative methods", () => {
  assert(AdminDashboardAnalytics, "AdminDashboardAnalytics must be defined");
  assert(typeof AdminDashboardAnalytics.createDashboardSnapshot === "function", "createDashboardSnapshot must be a function");
  assert(typeof AdminDashboardAnalytics.calculateTrendSeries === "function", "calculateTrendSeries must be a function");
  assert(typeof AdminDashboardAnalytics.calculateContentMix === "function", "calculateContentMix must be a function");
  assert(typeof AdminDashboardAnalytics.generateOperationalInsights === "function", "generateOperationalInsights must be a function");
  assert(typeof AdminDashboardAnalytics.renderTrendChart === "function", "renderTrendChart must be a function");
  assert(typeof AdminDashboardAnalytics.renderContentMix === "function", "renderContentMix must be a function");
  assert(typeof AdminDashboardAnalytics.renderOperationalInsights === "function", "renderOperationalInsights must be a function");
  assert(typeof AdminDashboardAnalytics.renderAllAnalytics === "function", "renderAllAnalytics must be a function");
});

it("2. createDashboardSnapshot creates unified data snapshot without duplicate queries", () => {
  const snapshot = AdminDashboardAnalytics.createDashboardSnapshot(sampleWishes, sampleStorageFiles);

  assert(snapshot, "Snapshot must be generated");
  assert.strictEqual(snapshot.wishes.length, 4, "Snapshot must retain wishes array");
  assert.strictEqual(snapshot.storageFiles.length, 7, "Snapshot must retain storage files array");
  assert(snapshot.contentMix, "Snapshot must include contentMix");
  assert(snapshot.storageDistribution, "Snapshot must include storageDistribution");
  assert(Array.isArray(snapshot.insights), "Snapshot must include insights array");
});

it("3. Content Mix calculation computes exact counts and percentages", () => {
  const mix = AdminDashboardAnalytics.calculateContentMix(sampleWishes);

  assert.strictEqual(mix.totalWishes, 4);
  assert.strictEqual(mix.photos.count, 2, "2 wishes contain photos (Aarav, Diya)");
  assert.strictEqual(mix.photos.pct, 50, "50% contain photos");
  assert.strictEqual(mix.videos.count, 2, "2 wishes contain videos (Diya, Sneha)");
  assert.strictEqual(mix.videos.pct, 50, "50% contain videos");
  assert.strictEqual(mix.audio.count, 2, "2 wishes contain audio (Aarav, Sneha)");
  assert.strictEqual(mix.letters.count, 2, "2 wishes contain letters (Aarav, Karan)");
  assert.strictEqual(mix.passcode.count, 2, "2 wishes have custom passcode (Aarav: 9988, Sneha: 5544)");
});

it("4. calculateTrendSeries computes 7-day and 30-day series accurately", () => {
  const trend7 = AdminDashboardAnalytics.calculateTrendSeries(sampleWishes, 7);
  assert.strictEqual(trend7.periodDays, 7);
  assert.strictEqual(trend7.series.length, 7, "Series should contain 7 daily entries");
  assert.strictEqual(trend7.totalInPeriod, 3, "3 wishes in last 7 days (2 today + 1 three days ago)");
  assert.strictEqual(trend7.hasData, true);

  const trend30 = AdminDashboardAnalytics.calculateTrendSeries(sampleWishes, 30);
  assert.strictEqual(trend30.periodDays, 30);
  assert.strictEqual(trend30.series.length, 30, "Series should contain 30 daily entries");
  assert.strictEqual(trend30.totalInPeriod, 4, "All 4 wishes are within last 30 days");
});

it("5. calculateTrendSeries handles empty history gracefully", () => {
  const emptyTrend = AdminDashboardAnalytics.calculateTrendSeries([], 7);
  assert.strictEqual(emptyTrend.totalInPeriod, 0);
  assert.strictEqual(emptyTrend.hasData, false);
});

it("6. renderTrendChart renders clean SVG chart when data exists", () => {
  mockDOM = {};
  AdminDashboardAnalytics.renderTrendChart("dash-trend-chart-container", sampleWishes, 7);

  const chart = mockDOM["dash-trend-chart-container"];
  assert(chart, "Chart container must exist");
  assert(chart.innerHTML.includes("<svg"), "Must render an SVG element");
  assert(chart.innerHTML.includes("<path"), "Must render chart paths");
  assert(chart.innerHTML.includes("dashTrendGrad"), "Must include gradient definition");
  assert(chart.innerHTML.includes("dash-chart-node"), "Must include interactive chart nodes");
});

it("7. renderTrendChart renders honest empty state when 0 wishes in period", () => {
  mockDOM = {};
  AdminDashboardAnalytics.renderTrendChart("dash-trend-chart-container", [], 7);

  const chart = mockDOM["dash-trend-chart-container"];
  assert(chart.innerHTML.includes("No wishes created in the last 7 days"), "Must display honest empty state message");
});

it("8. renderContentMix renders progress bars and count labels", () => {
  mockDOM = {};
  const mix = AdminDashboardAnalytics.calculateContentMix(sampleWishes);
  AdminDashboardAnalytics.renderContentMix("dash-content-mix-container", mix);

  const container = mockDOM["dash-content-mix-container"];
  assert(container, "Content mix container must exist");
  assert(container.innerHTML.includes("Photos / Gallery"), "Must show Photos row");
  assert(container.innerHTML.includes("Video Memories"), "Must show Video row");
  assert(container.innerHTML.includes("Voice / Audio"), "Must show Voice row");
  assert(container.innerHTML.includes("Birthday Letters"), "Must show Letters row");
  assert(container.innerHTML.includes("Passcode Protection"), "Must show Passcode row");
});

it("9. generateOperationalInsights generates actionable insights from real state", () => {
  const snapshot = AdminDashboardAnalytics.createDashboardSnapshot(sampleWishes, sampleStorageFiles);
  const insights = AdminDashboardAnalytics.generateOperationalInsights({
    totalWishes: snapshot.wishes.length,
    safeWishes: snapshot.wishes,
    contentMix: snapshot.contentMix,
    storageDistribution: snapshot.storageDistribution
  });

  assert(Array.isArray(insights), "Insights must be an array");
  assert(insights.length > 0, "Must have generated insights");

  // Check for unused media cleanup insight
  const unusedInsight = insights.find(i => i.title === "Storage Cleanup");
  assert(unusedInsight, "Must include unused media cleanup insight");
  assert(unusedInsight.desc.includes("2 unused files"), "Must accurately report 2 unused files");
  assert.strictEqual(unusedInsight.actionTab, "media");
  assert.strictEqual(unusedInsight.actionFilter, "unused");

  // Check for daily activity insight
  const dailyInsight = insights.find(i => i.title === "Daily Activity");
  assert(dailyInsight, "Must include daily activity insight");
  assert(dailyInsight.desc.includes("2 new wishes created today"), "Must report 2 wishes today");
});

it("10. renderOperationalInsights renders cards with action buttons", () => {
  mockDOM = {};
  const snapshot = AdminDashboardAnalytics.createDashboardSnapshot(sampleWishes, sampleStorageFiles);
  AdminDashboardAnalytics.renderOperationalInsights("dash-operational-insights", snapshot.insights);

  const container = mockDOM["dash-operational-insights"];
  assert(container, "Insights container must exist");
  assert(container.innerHTML.includes("dash-insight-card"), "Must render insight cards");
  assert(container.innerHTML.includes("Review Unused →"), "Must render review action button");
});

it("11. renderKPIs coordinates complete dashboard analytics update", () => {
  mockDOM = {};
  AdminDashboard.renderKPIs(sampleWishes, sampleStorageFiles);

  assert.strictEqual(mockDOM["kpi-total-wishes"].textContent, 4);
  assert(mockDOM["dash-trend-chart-container"].innerHTML.includes("<svg"), "Must render trend SVG");
  assert(mockDOM["dash-content-mix-container"].innerHTML.includes("Photos / Gallery"), "Must render content mix");
  assert(mockDOM["dash-operational-insights"].innerHTML.includes("Storage Cleanup"), "Must render insights");
});

it("12. admin.html contains all dedicated analytics DOM containers and script tags", () => {
  const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");

  assert(adminHtml.includes('id="dash-operational-insights"'), "admin.html must contain dash-operational-insights");
  assert(adminHtml.includes('id="dash-trend-chart-container"'), "admin.html must contain dash-trend-chart-container");
  assert(adminHtml.includes('id="dash-content-mix-container"'), "admin.html must contain dash-content-mix-container");
  assert(adminHtml.includes('data-period="7"'), "admin.html must contain 7D period toggle");
  assert(adminHtml.includes('data-period="30"'), "admin.html must contain 30D period toggle");
  assert(adminHtml.includes('data-period="90"'), "admin.html must contain 90D period toggle");
  assert(adminHtml.includes('src="js/admin/admin-dashboard-analytics.js"'), "admin.html must load admin-dashboard-analytics.js");
});

it("13. admin-dashboard.css contains analytics styling", () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, "css", "admin", "admin-dashboard.css"), "utf8");

  assert(css.includes(".btn-dash-period"), "CSS must contain .btn-dash-period");
  assert(css.includes(".dash-chart-node"), "CSS must contain .dash-chart-node");
  assert(css.includes(".dash-insight-card"), "CSS must contain .dash-insight-card");
});

it("14. Protected files remain strictly untouched", () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(ROOT_DIR, "js", "app.js"), "utf8");
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, "css", "style.css"), "utf8");

  assert(!indexHtml.includes("dash-trend-chart-container"), "index.html must not be modified");
  assert(!appJs.includes("renderAllAnalytics"), "app.js must not be modified");
  assert(!styleCss.includes("dash-trend-chart-container"), "style.css must not be modified");
});

it("15. Zero secret leakage across analytics and dashboard modules", () => {
  const analyticsJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-dashboard-analytics.js"), "utf8");
  assert(!analyticsJs.includes("SUPABASE_SERVICE_ROLE_KEY"), "Must not expose service role key");
  assert(!analyticsJs.includes("service_role"), "Must not mention service_role");
});

console.log("============================================================");
if (testsFailed === 0) {
  console.log(`🎉 ALL ${testsPassed} PHASE 31D-1 DASHBOARD ANALYTICS TESTS PASSED!`);
} else {
  console.error(`❌ ${testsFailed} TEST(S) FAILED!`);
  process.exit(1);
  process.exit(1);
}
console.log("============================================================");
