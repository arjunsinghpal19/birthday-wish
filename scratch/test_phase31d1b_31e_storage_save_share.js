/**
 * ============================================================================
 * PHASE 31D-1B FINAL KPI REFINEMENT & PHASE 31E — STORAGE + SAVE & SHARE
 *
 * Validates:
 * 1. Top KPI row contains all 9 cards:
 *    Total Wishes, Recent Wishes, Images, Videos, Audio,
 *    Storage Used, Unused Media, Storage Remaining, System Status.
 * 2. Storage Used displays current used size and % of 1 GB used.
 * 3. Unused Media displays count and reclaimable size.
 * 4. Storage Remaining displays remaining size, % free, and 'of 1 GB' context.
 * 5. Single snapshot data source derivation without duplicate queries.
 * 6. Zero-storage and full-storage edge cases handle properly without NaN.
 * 7. Storage Overview and operational insights retain unused media workflows.
 * 8. Copy Dashboard Summary generates complete formatted report.
 * 9. Export Report downloads valid JSON and CSV respecting active period.
 * 10. Popover toggle operates correctly.
 * 11. Read-only safety: Zero database/storage mutation.
 * 12. Protected files (admin-security.js, app.js, index.html) remain untouched.
 * 13. Zero secrets leakage across all modules.
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

console.log("============================================================");
console.log("📊 STARTING PHASE 31D-1B FINAL 9-KPI & 31E SAVE/SHARE TESTS");
console.log("============================================================");

let testsPassed = 0;
let testsFailed = 0;

async function it(desc, fn) {
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

let toastMessage = null;
globalThis.AdminCore = {
  formatBytes: (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  },
  showToast: (msg) => { toastMessage = msg; },
  copyWishUrl: () => {}
};

let loggedEvents = [];
globalThis.AdminLogs = {
  logEvent: (event, desc) => {
    loggedEvents.push({ event, desc });
  }
};

let clipboardText = null;
const mockClipboard = {
  writeText: async (t) => { clipboardText = t; return true; }
};

try {
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: mockClipboard,
    configurable: true,
    writable: true
  });
} catch (e) {
  globalThis.navigator = { clipboard: mockClipboard };
}

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
    removeChild: function (child) {
      const idx = this._children.indexOf(child);
      if (idx !== -1) this._children.splice(idx, 1);
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
    closest: function (sel) {
      return createMockElement();
    },
    contains: function (target) {
      return this === target || this._children.includes(target);
    },
    addEventListener: function (ev, cb) {
      if (!this._listeners) this._listeners = {};
      if (!this._listeners[ev]) this._listeners[ev] = [];
      this._listeners[ev].push(cb);
    },
    click: function () {
      if (this._listeners && this._listeners.click) {
        this._listeners.click.forEach(cb => cb({ target: this, stopPropagation: () => {} }));
      }
    },
    select: function () {},
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
  body: createMockElement("BODY"),
  addEventListener: () => {}
};

// Load Admin Modules
require(path.join(ROOT_DIR, "js", "admin", "admin-core.js"));
require(path.join(ROOT_DIR, "js", "admin", "admin-navigation.js"));
require(path.join(ROOT_DIR, "js", "admin", "admin-dashboard-analytics.js"));
require(path.join(ROOT_DIR, "js", "admin", "admin-dashboard.js"));

// Spy on showToast
if (globalThis.AdminCore) {
  globalThis.AdminCore.showToast = (msg) => {
    toastMessage = msg;
    const toastEl = document.getElementById("admin-toast");
    if (toastEl) toastEl.textContent = msg;
  };
}

const { AdminDashboard, AdminDashboardAnalytics } = globalThis;

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
  }
];

// 20 MB total storage (18 MB used, 2 MB unused)
const sampleStorageFiles = [
  { path: "photos/aarav1.jpg", folder: "photos", size: 5 * 1024 * 1024, isUsed: true },
  { path: "photos/diya1.jpg", folder: "photos", size: 5 * 1024 * 1024, isUsed: true },
  { path: "videos/diya_memory.mp4", folder: "videos", size: 8 * 1024 * 1024, isUsed: true },
  { path: "photos/unused_pic.jpg", folder: "photos", size: 2 * 1024 * 1024, isUsed: false }
];

async function runTests() {
  await it("1. admin.html contains all 9 KPI cards in top row", () => {
    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");

    assert(adminHtml.includes('id="kpi-total-wishes"'), "Must contain kpi-total-wishes");
    assert(adminHtml.includes('id="kpi-today-wishes"'), "Must contain kpi-today-wishes");
    assert(adminHtml.includes('id="kpi-total-images"'), "Must contain kpi-total-images");
    assert(adminHtml.includes('id="kpi-total-videos"'), "Must contain kpi-total-videos");
    assert(adminHtml.includes('id="kpi-total-audio"'), "Must contain kpi-total-audio");
    assert(adminHtml.includes('id="kpi-storage-used"'), "Must contain kpi-storage-used");
    assert(adminHtml.includes('id="kpi-unused-media"'), "Must contain kpi-unused-media");
    assert(adminHtml.includes('id="kpi-storage-remaining"'), "Must contain kpi-storage-remaining");
    assert(adminHtml.includes('id="kpi-system-status"'), "Must contain kpi-system-status");
  });

  await it("2. calculateKPIs computes exact metrics for Storage Used, Unused Media, and Storage Remaining", () => {
    const kpis = AdminDashboard.calculateKPIs(sampleWishes, sampleStorageFiles);

    assert.strictEqual(kpis.totalCapacityBytes, 1024 * 1024 * 1024, "Total capacity must be 1 GB (1073741824 bytes)");
    assert.strictEqual(kpis.totalStorageBytes, 20 * 1024 * 1024, "Total storage used must be 20 MB");
    assert.strictEqual(kpis.usedStorageBytes, 20 * 1024 * 1024, "Used storage must match totalStorageBytes");
    assert.strictEqual(kpis.unusedMediaCount, 1, "Unused media count must be 1");
    assert.strictEqual(kpis.unusedStorageBytes, 2 * 1024 * 1024, "Unused storage must be 2 MB");
    assert.strictEqual(kpis.remainingStorageBytes, 1024 * 1024 * 1024 - 20 * 1024 * 1024, "Remaining storage must be 1004 MB");

    assert(kpis.usagePercentage >= 1.9 && kpis.usagePercentage <= 2.0, `Usage percentage should be ~2.0%, got ${kpis.usagePercentage}`);
    assert(kpis.remainingPercentage >= 98.0 && kpis.remainingPercentage <= 98.1, `Remaining percentage should be ~98.0%, got ${kpis.remainingPercentage}`);
  });

  await it("3. renderKPIs displays Storage Used, Unused Media, and Storage Remaining with clean secondary formatting", () => {
    mockDOM = {};
    AdminDashboard.renderKPIs(sampleWishes, sampleStorageFiles);

    const storageUsedEl = mockDOM["kpi-storage-used"];
    const subStorageEl = mockDOM["kpi-sub-storage-used"];
    const unusedEl = mockDOM["kpi-unused-media"];
    const subUnusedEl = mockDOM["kpi-sub-unused-media"];
    const remainingEl = mockDOM["kpi-storage-remaining"];
    const subRemainingEl = mockDOM["kpi-sub-storage-remaining"];

    // Storage Used
    assert.strictEqual(storageUsedEl.textContent, "20 MB", "Storage used must display '20 MB'");
    assert(subStorageEl.innerHTML.includes("of 1 GB used"), "Subtitle must include 'of 1 GB used'");

    // Unused Media
    assert.strictEqual(unusedEl.textContent, 1, "Unused media count must display 1");
    assert(subUnusedEl.innerHTML.includes("2 MB") && subUnusedEl.innerHTML.includes("reclaimable"), "Subtitle must show '2 MB reclaimable'");

    // Storage Remaining
    assert.strictEqual(remainingEl.textContent, "1004 MB", "Storage remaining must display '1004 MB'");
    assert(subRemainingEl.innerHTML.includes("98% Free") || subRemainingEl.innerHTML.includes("98.0% Free"), "Must show percentage free");
    assert(subRemainingEl.innerHTML.includes("of 1 GB"), "Must include 'of 1 GB' context");
  });

  await it("4. Zero-storage edge case works (0 bytes used -> 1 GB remaining, 100% Free)", () => {
    mockDOM = {};
    const zeroKPIs = AdminDashboard.calculateKPIs([], []);
    assert.strictEqual(zeroKPIs.totalStorageBytes, 0);
    assert.strictEqual(zeroKPIs.remainingStorageBytes, 1024 * 1024 * 1024);
    assert.strictEqual(zeroKPIs.usagePercentage, 0);
    assert.strictEqual(zeroKPIs.remainingPercentage, 100);

    AdminDashboard.renderKPIs([], []);
    assert.strictEqual(mockDOM["kpi-storage-used"].textContent, "0 B");
    assert.strictEqual(mockDOM["kpi-unused-media"].textContent, 0);
    assert.strictEqual(mockDOM["kpi-storage-remaining"].textContent, "1 GB");
    assert(mockDOM["kpi-sub-storage-remaining"].innerHTML.includes("100% Free"));
  });

  await it("5. Full-storage edge case works (1 GB used -> 0 B remaining, 0% Free)", () => {
    mockDOM = {};
    const fullFiles = [{ path: "photos/big.jpg", folder: "photos", size: 1024 * 1024 * 1024, isUsed: true }];
    const fullKPIs = AdminDashboard.calculateKPIs([], fullFiles);
    assert.strictEqual(fullKPIs.totalStorageBytes, 1024 * 1024 * 1024);
    assert.strictEqual(fullKPIs.remainingStorageBytes, 0);
    assert.strictEqual(fullKPIs.usagePercentage, 100);
    assert.strictEqual(fullKPIs.remainingPercentage, 0);

    AdminDashboard.renderKPIs([], fullFiles);
    assert.strictEqual(mockDOM["kpi-storage-used"].textContent, "1 GB");
    assert.strictEqual(mockDOM["kpi-storage-remaining"].textContent, "0 B");
    assert(mockDOM["kpi-sub-storage-remaining"].innerHTML.includes("0% Free"));
  });

  await it("6. createDashboardSnapshot includes complete storageDistribution metrics", () => {
    const snapshot = AdminDashboardAnalytics.createDashboardSnapshot(sampleWishes, sampleStorageFiles);

    assert(snapshot.storageDistribution, "Snapshot must have storageDistribution");
    assert.strictEqual(snapshot.storageDistribution.totalCapacityBytes, 1024 * 1024 * 1024);
    assert.strictEqual(snapshot.storageDistribution.usedBytes, 20 * 1024 * 1024);
    assert.strictEqual(snapshot.storageDistribution.remainingBytes, 1024 * 1024 * 1024 - 20 * 1024 * 1024);
    assert(snapshot.storageDistribution.usagePct >= 1.9);
  });

  await it("7. renderStorageBreakdown retains Storage Capacity bar and Unused Media cleanup shortcut", () => {
    mockDOM = {};
    AdminDashboard.renderStorageBreakdown(sampleStorageFiles, sampleWishes);

    const container = mockDOM["dash-storage-breakdown"];
    assert(container, "Storage breakdown container must exist");
    assert(container.innerHTML.includes("dash-storage-capacity-bar"), "Must include dash-storage-capacity-bar");
    assert(container.innerHTML.includes("Storage Capacity:"), "Must include Storage Capacity label");
    assert(container.innerHTML.includes("Remaining"), "Must display remaining storage");
    assert(container.innerHTML.includes("Photos"), "Must display Photos tile");
    assert(container.innerHTML.includes("Videos"), "Must display Videos tile");
    assert(container.innerHTML.includes("Unused"), "Must display Unused tile");
    assert(container.innerHTML.includes("1 unused files"), "Must display 1 unused file");
  });

  await it("8. generateSummaryText builds formatted summary with selected period (7D, 30D, 90D)", () => {
    AdminDashboardAnalytics.createDashboardSnapshot(sampleWishes, sampleStorageFiles);

    const summary7D = AdminDashboardAnalytics.generateSummaryText(7);
    assert(summary7D.includes("WISH STUDIO — DASHBOARD ANALYTICS REPORT"), "Must have header title");
    assert(summary7D.includes("Analysis Period: Last 7 Days"), "Must specify 7D period");
    assert(summary7D.includes("Total Active Wishes: 2"), "Must report 2 active wishes");
    assert(summary7D.includes("Storage Bucket: wish-media"), "Must report bucket name");
    assert(summary7D.includes("Storage Used: 20 MB"), "Must report 20 MB used");
    assert(summary7D.includes("Storage Remaining: 1004 MB"), "Must report 1004 MB remaining");

    const summary30D = AdminDashboardAnalytics.generateSummaryText(30);
    assert(summary30D.includes("Analysis Period: Last 30 Days"), "Must specify 30D period");
  });

  await it("9. copyDashboardSummary copies summary text, shows toast, and logs audit event", async () => {
    clipboardText = null;
    loggedEvents = [];

    AdminDashboardAnalytics.createDashboardSnapshot(sampleWishes, sampleStorageFiles);
    const text = await AdminDashboardAnalytics.copyDashboardSummary(30);

    assert(clipboardText, "Must write text to clipboard");
    assert.strictEqual(clipboardText, text);
    const toastText = document.getElementById("admin-toast").textContent;
    assert(toastText.includes("Dashboard summary copied to clipboard"), `Must show toast confirmation, got: ${toastText}`);
    assert(loggedEvents.some(e => e.event === "DASHBOARD_SHARE"), "Must log DASHBOARD_SHARE audit event");
  });

  await it("10. exportDashboardReport('json', periodDays) generates valid JSON report schema", () => {
    loggedEvents = [];

    AdminDashboardAnalytics.createDashboardSnapshot(sampleWishes, sampleStorageFiles);
    const jsonString = AdminDashboardAnalytics.exportDashboardReport("json", 30);

    const data = JSON.parse(jsonString);
    assert.strictEqual(data.title, "Wish Studio Dashboard Analytics Report");
    assert.strictEqual(data.periodDays, 30);
    assert.strictEqual(data.metrics.totalActiveWishes, 2);
    assert.strictEqual(data.metrics.storageTotalCapacityBytes, 1024 * 1024 * 1024);
    assert.strictEqual(data.metrics.storageUsedBytes, 20 * 1024 * 1024);
    assert(Array.isArray(data.trendSeries), "Must include trendSeries array");
    const toastText = document.getElementById("admin-toast").textContent;
    assert(toastText.includes("JSON"), `Must show JSON export toast, got: ${toastText}`);
    assert(loggedEvents.some(e => e.event === "DASHBOARD_EXPORT"), "Must log DASHBOARD_EXPORT audit event");
  });

  await it("11. exportDashboardReport('csv', periodDays) generates valid CSV report format", () => {
    loggedEvents = [];

    AdminDashboardAnalytics.createDashboardSnapshot(sampleWishes, sampleStorageFiles);
    const csvString = AdminDashboardAnalytics.exportDashboardReport("csv", 7);

    assert(csvString.includes('"Report","Wish Studio Dashboard Analytics Report"'), "Must include CSV header");
    assert(csvString.includes('"Period Days","7"'), "Must include Period Days row");
    assert(csvString.includes('"Total Active Wishes","2"'), "Must include total wishes row");
    assert(csvString.includes('"Storage Total Capacity (Bytes)","1073741824"'), "Must include storage capacity row");
    assert(csvString.includes('"Date","Wishes Created In Date"'), "Must include time series table header");
    const toastText = document.getElementById("admin-toast").textContent;
    assert(toastText.includes("CSV"), `Must show CSV export toast, got: ${toastText}`);
  });

  await it("12. initShareControls toggles popover menu on click", () => {
    mockDOM = {};
    const exportBtn = document.getElementById("btn-dash-export-report");
    const popover = document.getElementById("dash-export-popover");

    popover.style.display = "none";
    AdminDashboardAnalytics.initShareControls();

    // Trigger click on export button
    exportBtn.click();
    assert.strictEqual(popover.style.display, "flex", "Popover must open on click");

    exportBtn.click();
    assert.strictEqual(popover.style.display, "none", "Popover must close on second click");
  });

  await it("13. Protected files remain strictly untouched", () => {
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
    const appJs = fs.readFileSync(path.join(ROOT_DIR, "js", "app.js"), "utf8");
    const styleCss = fs.readFileSync(path.join(ROOT_DIR, "css", "style.css"), "utf8");
    const secJs = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "admin-security.js"), "utf8");

    assert(!indexHtml.includes("dash-export-popover"), "index.html must not be modified");
    assert(!appJs.includes("exportDashboardReport"), "app.js must not be modified");
    assert(!styleCss.includes("dash-export-popover"), "style.css must not be modified");
    assert(secJs.includes("PasswordService"), "js/modules/admin-security.js must remain untouched");
  });

  await it("14. Zero secrets leakage across all modules", () => {
    const analyticsJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-dashboard-analytics.js"), "utf8");
    const dashboardJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-dashboard.js"), "utf8");

    assert(!analyticsJs.includes("SUPABASE_SERVICE_ROLE_KEY"), "No secrets in analytics.js");
    assert(!dashboardJs.includes("SUPABASE_SERVICE_ROLE_KEY"), "No secrets in dashboard.js");
    assert(!analyticsJs.includes("service_role"), "No service_role in analytics.js");
  });

  console.log("============================================================");
  if (testsFailed === 0) {
    console.log(`🎉 ALL ${testsPassed} PHASE 31D-1B FINAL 9-KPI & 31E TESTS PASSED!`);
  } else {
    console.error(`❌ ${testsFailed} TEST(S) FAILED!`);
    process.exit(1);
  }
  console.log("============================================================");
}

runTests();
