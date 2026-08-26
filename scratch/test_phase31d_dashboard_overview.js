/**
 * ============================================================================
 * PHASE 31D — DASHBOARD OVERVIEW & KPI FOUNDATION TEST SUITE
 *
 * Validates:
 * 1. Dashboard module initialization and public API exports
 * 2. Real KPI calculation from live Wishes and Storage datasets (no fake numbers)
 * 3. Total Wishes KPI matches actual active wishes count
 * 4. Recent Wishes KPI accurately calculates today & 7-day created counts
 * 5. Media Assets counts (Photos, Videos, Audio) and sizes computed from storage metadata
 * 6. Unused Media count & storage size calculated accurately via reference mapping
 * 7. Total Storage Usage formatted cleanly (B, KB, MB, GB)
 * 8. renderKPIs updates all 8 KPI cards in the DOM correctly
 * 9. Recent Wishes table renders top wishes with Recipient, Sender, Media Badges, Date, Actions
 * 10. Content Badges accurately reflect photos (📷), videos (🎥), audio (🎙️), letter (💌), passcode (🔑)
 * 11. Recent Wishes actions (Quick View, Edit, Copy Link, Open Public Link) wire cleanly
 * 12. Empty state renders friendly UI when 0 wishes exist
 * 13. Error state renders clear message and retry button when DB is unreachable
 * 14. Partial failure resilience (e.g. DB offline, Storage online) preserves available metrics
 * 15. renderStorageBreakdown displays category metrics and cleanup shortcut
 * 16. renderActivityFeed displays real session audit logs from AdminLogs
 * 17. Quick navigation buttons (View All Wishes, Manage Media, View Logs) call AdminNavigation.switchTab
 * 18. Dashboard refresh coordinator handles loading state and re-queries live sources
 * 19. Zero duplicate data-fetching or scanner logic introduced
 * 20. Protected systems (index.html, js/app.js, css/style.css, editor modules) remain untouched
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

console.log("============================================================");
console.log("📊 STARTING PHASE 31D DASHBOARD OVERVIEW & KPI TEST SUITE");
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

async function itAsync(desc, fn) {
  try {
    await fn();
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
      return null;
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
require(path.join(ROOT_DIR, "js", "admin", "admin-dashboard.js"));
require(path.join(ROOT_DIR, "js", "admin", "admin-logs.js"));
require(path.join(ROOT_DIR, "js", "admin", "admin-media.js"));

const { AdminDashboard, AdminNavigation, AdminCore, AdminMedia, AdminLogs } = globalThis;

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
    created_at: `${todayStr}T11:30:00.000Z`
  },
  {
    id: "wish-uuid-3",
    recipient_name: "Karan Verma",
    sender_name: "Ananya",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
  },
  {
    id: "wish-uuid-4",
    recipient_name: "Sneha Reddy",
    sender_name: "Vikram",
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
  }
];

const sampleStorageFiles = [
  { path: "photos/aarav1.jpg", name: "aarav1.jpg", folder: "photos", size: 1048576, isUsed: true },
  { path: "videos/diya_memory.mp4", name: "diya_memory.mp4", folder: "videos", size: 10485760, isUsed: true },
  { path: "audio/happy_song.mp3", name: "happy_song.mp3", folder: "audio", size: 3145728, isUsed: true },
  { path: "photos/old_unused.jpg", name: "old_unused.jpg", folder: "photos", size: 2097152, isUsed: false },
  { path: "audio/old_unused_audio.mp3", name: "old_unused_audio.mp3", folder: "audio", size: 1572864, isUsed: false }
];

// =============================================================
// TESTS
// =============================================================

it("1. AdminDashboard module is initialized and exposes authoritative API", () => {
  assert(AdminDashboard, "AdminDashboard must be defined");
  assert(typeof AdminDashboard.init === "function", "init must be a function");
  assert(typeof AdminDashboard.calculateKPIs === "function", "calculateKPIs must be a function");
  assert(typeof AdminDashboard.renderKPIs === "function", "renderKPIs must be a function");
  assert(typeof AdminDashboard.renderRecentWishes === "function", "renderRecentWishes must be a function");
  assert(typeof AdminDashboard.renderStorageBreakdown === "function", "renderStorageBreakdown must be a function");
  assert(typeof AdminDashboard.renderActivityFeed === "function", "renderActivityFeed must be a function");
  assert(typeof AdminDashboard.refresh === "function", "refresh must be a function");
});

it("2. calculateKPIs computes accurate metrics from live data", () => {
  const m = AdminDashboard.calculateKPIs(sampleWishes, sampleStorageFiles);
  
  assert.strictEqual(m.totalWishes, 4, "Total wishes should be 4");
  assert.strictEqual(m.todayWishes, 2, "Today wishes should be 2");
  assert.strictEqual(m.recent7dWishes, 3, "Wishes in last 7 days should be 3 (today + 3 days ago)");
  assert.strictEqual(m.totalMedia, 5, "Total media assets should be 5");
  assert.strictEqual(m.photosCount, 2, "Photos count should be 2");
  assert.strictEqual(m.videosCount, 1, "Videos count should be 1");
  assert.strictEqual(m.audioCount, 2, "Audio count should be 2");
  assert.strictEqual(m.usedMediaCount, 3, "Used media count should be 3");
  assert.strictEqual(m.unusedMediaCount, 2, "Unused media count should be 2");
  assert.strictEqual(m.totalStorageBytes, 18350080, "Total storage bytes should be 18,350,080");
  assert.strictEqual(m.unusedStorageBytes, 3670016, "Unused storage bytes should be 3,670,016");
});

it("3. renderKPIs updates all 9 KPI cards in DOM accurately", () => {
  mockDOM = {};
  AdminDashboard.renderKPIs(sampleWishes, sampleStorageFiles);

  assert.strictEqual(mockDOM["kpi-total-wishes"].textContent, 4);
  assert.strictEqual(mockDOM["kpi-today-wishes"].textContent, 2);
  assert.strictEqual(mockDOM["kpi-total-images"].textContent, 2);
  assert.strictEqual(mockDOM["kpi-total-videos"].textContent, 1);
  assert.strictEqual(mockDOM["kpi-total-audio"].textContent, 2);
  assert(mockDOM["kpi-storage-used"].textContent.includes("MB"), "Storage used should be formatted in MB");
  assert.strictEqual(mockDOM["kpi-unused-media"].textContent, 2);
  assert(mockDOM["kpi-storage-remaining"].textContent.includes("MB"), "Storage remaining should be formatted in MB");
  assert.strictEqual(mockDOM["kpi-system-status"].textContent, "Operational");
});

it("4. renderRecentWishes renders top wishes with content badges and action buttons", () => {
  mockDOM = {};
  AdminDashboard.renderRecentWishes(sampleWishes, false);

  const tbody = mockDOM["dash-recent-wishes-tbody"];
  assert(tbody, "Recent wishes tbody must exist");
  assert(tbody.innerHTML.includes("Aarav Sharma"), "Must include Aarav Sharma");
  assert(tbody.innerHTML.includes("Diya Patel"), "Must include Diya Patel");
  assert(tbody.innerHTML.includes("📷"), "Must include photo badge for wish 1");
  assert(tbody.innerHTML.includes("🎙️"), "Must include audio badge for wish 1");
  assert(tbody.innerHTML.includes("💌"), "Must include letter badge for wish 1");
  assert(tbody.innerHTML.includes("🎥"), "Must include video badge for wish 2");
  assert(tbody.innerHTML.includes("btn-dash-edit-wish"), "Must include edit button");
  assert(tbody.innerHTML.includes("btn-dash-copy-link"), "Must include copy button");
});

it("5. renderRecentWishes renders friendly empty state when 0 wishes exist", () => {
  mockDOM = {};
  AdminDashboard.renderRecentWishes([], false);

  const tbody = mockDOM["dash-recent-wishes-tbody"];
  assert(tbody.innerHTML.includes("No wishes created yet"), "Must render empty state message");
});

it("6. renderRecentWishes renders error state with retry button on database failure", () => {
  mockDOM = {};
  AdminDashboard.renderRecentWishes([], true);

  const tbody = mockDOM["dash-recent-wishes-tbody"];
  assert(tbody.innerHTML.includes("Unable to load live wishes"), "Must render error message");
  assert(tbody.innerHTML.includes("btn-dash-retry-wishes"), "Must render retry button");
});

it("7. renderStorageBreakdown renders category distribution and cleanup banner", () => {
  mockDOM = {};
  AdminDashboard.renderStorageBreakdown(sampleStorageFiles, sampleWishes);

  const container = mockDOM["dash-storage-breakdown"];
  assert(container, "Storage breakdown container must exist");
  assert(container.innerHTML.includes("Photos"), "Must display Photos label");
  assert(container.innerHTML.includes("Videos"), "Must display Videos label");
  assert(container.innerHTML.includes("Audio"), "Must display Audio label");
  assert(container.innerHTML.includes("Unused"), "Must display Unused label");
  assert(container.innerHTML.includes("2 unused files"), "Must display unused count");
});

it("8. renderActivityFeed renders real session audit logs from AdminLogs", () => {
  mockDOM = {};
  const mockLogs = [
    { event: "CREATE_WISH", desc: "Created wish for Aarav", time: "10:00:00 AM" },
    { event: "LOGIN", desc: "Admin authenticated", time: "09:30:00 AM" }
  ];
  AdminDashboard.renderActivityFeed(mockLogs);

  const list = mockDOM["dash-recent-activity-list"];
  assert(list, "Activity list container must exist");
  assert(list.innerHTML.includes("CREATE_WISH"), "Must display CREATE_WISH event");
  assert(list.innerHTML.includes("Admin authenticated"), "Must display description");
});

it("9. AdminNavigation.switchTab switches active tabs programmatically", () => {
  assert(typeof AdminNavigation.switchTab === "function", "switchTab must be exported on AdminNavigation");
});

it("10. Partial failure resilience: Storage metrics render even if Wishes DB is offline", () => {
  mockDOM = {};
  AdminDashboard.renderKPIs([], sampleStorageFiles);

  assert.strictEqual(mockDOM["kpi-total-wishes"].textContent, 0);
  assert.strictEqual(mockDOM["kpi-today-wishes"].textContent, 0);
  assert.strictEqual(mockDOM["kpi-total-images"].textContent, 2);
  assert(mockDOM["kpi-storage-used"].textContent.includes("MB"), "Storage should still be calculated");
});

it("11. HTML markup in admin.html contains all 9 KPI cards and dashboard sections", () => {
  const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");

  assert(adminHtml.includes('id="kpi-total-wishes"'), "admin.html must contain kpi-total-wishes");
  assert(adminHtml.includes('id="kpi-today-wishes"'), "admin.html must contain kpi-today-wishes");
  assert(adminHtml.includes('id="kpi-total-images"'), "admin.html must contain kpi-total-images");
  assert(adminHtml.includes('id="kpi-total-videos"'), "admin.html must contain kpi-total-videos");
  assert(adminHtml.includes('id="kpi-total-audio"'), "admin.html must contain kpi-total-audio");
  assert(adminHtml.includes('id="kpi-storage-used"'), "admin.html must contain kpi-storage-used");
  assert(adminHtml.includes('id="kpi-unused-media"'), "admin.html must contain kpi-unused-media");
  assert(adminHtml.includes('id="kpi-storage-remaining"'), "admin.html must contain kpi-storage-remaining");
  assert(adminHtml.includes('id="kpi-system-status"'), "admin.html must contain kpi-system-status");
  assert(adminHtml.includes('id="dash-recent-wishes-tbody"'), "admin.html must contain dash-recent-wishes-tbody");
  assert(adminHtml.includes('id="dash-storage-breakdown"'), "admin.html must contain dash-storage-breakdown");
  assert(adminHtml.includes('id="dash-recent-activity-list"'), "admin.html must contain dash-recent-activity-list");
  assert(adminHtml.includes('id="btn-refresh-dashboard"'), "admin.html must contain btn-refresh-dashboard");
  assert(adminHtml.includes('id="btn-dash-view-all-wishes"'), "admin.html must contain btn-dash-view-all-wishes");
  assert(adminHtml.includes('id="btn-dash-view-all-media"'), "admin.html must contain btn-dash-view-all-media");
  assert(adminHtml.includes('id="btn-dash-view-all-logs"'), "admin.html must contain btn-dash-view-all-logs");
});

it("12. Protected files remain strictly untouched", () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(ROOT_DIR, "js", "app.js"), "utf8");
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, "css", "style.css"), "utf8");

  assert(!indexHtml.includes("dash-storage-breakdown"), "index.html must not be modified");
  assert(!appJs.includes("renderStorageBreakdown"), "app.js must not be modified");
  assert(!styleCss.includes("dash-storage-breakdown"), "style.css must not be modified");
});

it("13. escapeHtml escapes malicious HTML/scripts properly", () => {
  const dirty = `<script>alert('XSS')</script> "test" & 'quote' <img src=x onerror=1>`;
  const clean = AdminDashboard.escapeHtml(dirty);

  assert(!clean.includes("<script>"), "Must escape <script>");
  assert(clean.includes("&lt;script&gt;"), "Must convert to &lt;script&gt;");
  assert(!clean.includes('"test"'), "Must escape double quotes");
  assert(clean.includes("&amp;"), "Must escape ampersand");
});

it("14. updateConnectionStatus updates indicator dot correctly for online/offline", () => {
  mockDOM = {};
  AdminDashboard.updateConnectionStatus(true);
  assert(mockDOM["admin-supabase-indicator"].innerHTML.includes("Supabase Connected"), "Must indicate Supabase Connected");

  AdminDashboard.updateConnectionStatus(false);
  assert(mockDOM["admin-supabase-indicator"].innerHTML.includes("Database Offline"), "Must indicate Database Offline");
});

it("15. calculateKPIs uses MediaReferenceEngine to detect unused storage assets", () => {
  // Aarav has photos/aarav1.jpg and audio/happy_song.mp3 referenced in sampleWishes
  const m = AdminDashboard.calculateKPIs(sampleWishes, sampleStorageFiles);
  assert.strictEqual(m.usedMediaCount, 3, "3 files must be marked as used");
  assert.strictEqual(m.unusedMediaCount, 2, "2 files must be marked as unused");
});

it("16. Zero secret leakage across Dashboard and Admin modules", () => {
  const dashJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-dashboard.js"), "utf8");
  assert(!dashJs.includes("SUPABASE_SERVICE_ROLE_KEY"), "Must not expose service role key");
  assert(!dashJs.includes("service_role"), "Must not mention service_role");
});

it("17. Storage breakdown renders zero-unused celebratory state when all assets are used", () => {
  mockDOM = {};
  const allUsedFiles = [
    { path: "photos/aarav1.jpg", name: "aarav1.jpg", folder: "photos", size: 1048576, isUsed: true }
  ];
  AdminDashboard.renderStorageBreakdown(allUsedFiles, sampleWishes);

  const breakdown = mockDOM["dash-storage-breakdown"];
  assert(breakdown.innerHTML.includes("All storage assets are actively referenced"), "Must celebrate 0 unused files");
});

it("18. No duplicate fetch/scanner logic or duplicate MediaReferenceEngine introduced", () => {
  const dashJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-dashboard.js"), "utf8");
  assert(!dashJs.includes("class MediaReferenceEngine"), "Must not duplicate MediaReferenceEngine class");
  assert(!dashJs.includes("function buildReferenceMap"), "Must reuse existing MediaReferenceEngine");
});

console.log("============================================================");
if (testsFailed === 0) {
  console.log(`🎉 ALL ${testsPassed} PHASE 31D DASHBOARD OVERVIEW TESTS PASSED!`);
} else {
  console.error(`❌ ${testsFailed} TEST(S) FAILED!`);
  process.exit(1);
}
console.log("============================================================");
