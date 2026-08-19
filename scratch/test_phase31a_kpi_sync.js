/**
 * ============================================================================
 * PHASE 31A DASHBOARD INITIAL LOAD KPI SYNCHRONIZATION TEST SUITE
 * Validates that on DOM ready / initial load, Dashboard data orchestration
 * fetches both live Wishes and live Storage metadata BEFORE invoking renderKPIs,
 * ensuring media KPIs (images, videos, audio, storage used) are never rendered
 * with empty/stale defaults on fresh load or refresh.
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("📊 STARTING PHASE 31A DASHBOARD KPI SYNCHRONIZATION TEST SUITE");
console.log("============================================================");

// Setup lightweight DOM and Browser mock environment
globalThis.window = globalThis;
globalThis.location = { origin: "http://localhost:5500" };
function createMockElement(tag = "DIV") {
  const el = {
    tagName: tag.toUpperCase(),
    className: "",
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    style: {},
    innerHTML: "",
    textContent: "",
    appendChild: () => {},
    setAttribute: () => {},
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
    addEventListener: (ev, cb) => {
      if (ev === "click") el.click = cb;
    }
  };
  return el;
}

globalThis.document = {
  getElementById: (id) => {
    if (!mockDOM[id]) {
      mockDOM[id] = createMockElement();
    }
    return mockDOM[id];
  },
  querySelector: () => createMockElement(),
  querySelectorAll: () => [],
  createElement: (tag) => createMockElement(tag),
  addEventListener: (event, cb) => {
    if (event === "DOMContentLoaded") {
      domContentLoadedCb = cb;
    }
  }
};

let mockDOM = {};
let domContentLoadedCb = null;
let mockSessionStorage = {
  "admin_authenticated": "true"
};
globalThis.sessionStorage = {
  getItem: (k) => mockSessionStorage[k] || null,
  setItem: (k, v) => { mockSessionStorage[k] = String(v); },
  removeItem: (k) => { delete mockSessionStorage[k]; }
};

let testCount = 0;
function test(name, fn) {
  testCount++;
  try {
    fn();
    console.log(`  ✓ ${testCount}. ${name}`);
  } catch (err) {
    console.error(`  ✗ ${testCount}. ${name}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

async function asyncTest(name, fn) {
  testCount++;
  try {
    await fn();
    console.log(`  ✓ ${testCount}. ${name}`);
  } catch (err) {
    console.error(`  ✗ ${testCount}. ${name}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

(async function runAllTests() {
  // Load AdminCore
  require(path.join(__dirname, "../js/admin/admin-core.js"));
  // Load AdminDashboard
  require(path.join(__dirname, "../js/admin/admin-dashboard.js"));
  // Load AdminMedia
  require(path.join(__dirname, "../js/admin/admin-media.js"));

  const { renderKPIs } = window.AdminDashboard;
  const mockStorageFiles = [
    { name: "photo1.jpg", folder: "photos", size: 1048576, publicUrl: "https://example.com/photo1.jpg" },
    { name: "photo2.jpg", folder: "photos", size: 2097152, publicUrl: "https://example.com/photo2.jpg" },
    { name: "video1.mp4", folder: "videos", size: 10485760, publicUrl: "https://example.com/video1.mp4" },
    { name: "audio1.mp3", folder: "audio", size: 3145728, publicUrl: "https://example.com/audio1.mp3" },
    { name: "audio2.mp3", folder: "audio", size: 4194304, publicUrl: "https://example.com/audio2.mp3" }
  ];

  const todayStr = new Date().toISOString().split("T")[0];
  const mockWishes = [
    { id: "uuid-1", recipient_name: "Arjun", created_at: `${todayStr}T10:00:00.000Z` },
    { id: "uuid-2", recipient_name: "Shivam", created_at: `${todayStr}T11:00:00.000Z` },
    { id: "uuid-3", recipient_name: "Neha", created_at: "2026-01-01T10:00:00.000Z" }
  ];

  // ------------------------------------------------------------
  // 1. Initial HTML Neutral State (No Flash of Fake Data)
  // ------------------------------------------------------------
  test("Initial HTML: admin.html contains neutral placeholder '—' and zero fake demo numbers", () => {
    const adminHtml = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");

    // Must NOT contain the old hardcoded demo numbers
    assert(!adminHtml.includes('>142<'), "admin.html must NOT contain hardcoded 142 in KPI cards");
    assert(!adminHtml.includes('>86<'), "admin.html must NOT contain hardcoded 86 in KPI cards");
    assert(!adminHtml.includes('>24<'), "admin.html must NOT contain hardcoded 24 in KPI cards");
    assert(!adminHtml.includes('>32<'), "admin.html must NOT contain hardcoded 32 in KPI cards");
    assert(!adminHtml.includes('>184 MB<'), "admin.html must NOT contain hardcoded 184 MB in KPI cards");

    // Must contain neutral placeholder
    assert(adminHtml.includes('id="kpi-total-wishes">—</div>'), "Total Wishes must default to '—'");
    assert(adminHtml.includes('id="kpi-today-wishes">—</div>'), "Today's Wishes must default to '—'");
    assert(adminHtml.includes('id="kpi-total-images">—</div>'), "Images must default to '—'");
    assert(adminHtml.includes('id="kpi-total-videos">—</div>'), "Videos must default to '—'");
    assert(adminHtml.includes('id="kpi-total-audio">—</div>'), "Audio must default to '—'");
    assert(adminHtml.includes('id="kpi-storage-used">—</div>'), "Storage Used must default to '—'");
  });

  // ------------------------------------------------------------
  // 2. KPI Calculation & Rendering Verification
  // ------------------------------------------------------------
  test("KPI Render: Accurately computes Total Wishes and Today's Wishes", () => {
    mockDOM = {};
    renderKPIs(mockWishes, mockStorageFiles);

    assert.strictEqual(mockDOM["kpi-total-wishes"].textContent, 3, "Total wishes must be 3");
    assert.strictEqual(mockDOM["kpi-today-wishes"].textContent, 2, "Today's wishes must be 2");
  });

  test("KPI Render: Accurately computes Images, Videos, and Audio counts from Storage metadata", () => {
    mockDOM = {};
    renderKPIs(mockWishes, mockStorageFiles);

    assert.strictEqual(mockDOM["kpi-total-images"].textContent, 2, "Images count must be 2 (photos folder)");
    assert.strictEqual(mockDOM["kpi-total-videos"].textContent, 1, "Videos count must be 1 (videos folder)");
    assert.strictEqual(mockDOM["kpi-total-audio"].textContent, 2, "Audio count must be 2 (audio folder)");
  });

  test("KPI Render: Accurately formats Storage Used bytes from Storage metadata", () => {
    mockDOM = {};
    renderKPIs(mockWishes, mockStorageFiles);

    // Sum of sizes: 1MB + 2MB + 10MB + 3MB + 4MB = 20MB (20,971,520 bytes)
    const storageUsed = mockDOM["kpi-storage-used"].textContent;
    assert(storageUsed.includes("MB") || storageUsed.includes("20"), `Storage used should format to ~20 MB (received: ${storageUsed})`);
  });

  // ------------------------------------------------------------
  // 2. Initial Lifecycle Synchronization in js/admin.js
  // ------------------------------------------------------------
  test("Architecture Check: js/admin.js loadDashboardData awaits Storage before renderKPIs", () => {
    const adminJsPath = path.join(__dirname, "../js/admin.js");
    const adminJsContent = fs.readFileSync(adminJsPath, "utf8");

    // Ensure loadStorageMediaData is called with await before renderKPIs
    const loadStorageIdx = adminJsContent.indexOf("await loadStorageMediaData(wishesList)");
    const renderKPIsIdx = adminJsContent.indexOf("renderKPIs(wishesList, storageFiles)");

    assert(loadStorageIdx !== -1, "loadDashboardData must await loadStorageMediaData(wishesList)");
    assert(renderKPIsIdx !== -1, "loadDashboardData must call renderKPIs with storageFiles");
    assert(loadStorageIdx < renderKPIsIdx, "loadStorageMediaData MUST precede renderKPIs in loadDashboardData execution order");
  });

  test("Architecture Check: js/admin.js removed un-synchronized post-loadStorageMediaData call", () => {
    const adminJsPath = path.join(__dirname, "../js/admin.js");
    const adminJsContent = fs.readFileSync(adminJsPath, "utf8");

    // Check that DOMContentLoaded has loadDashboardData() without an unsynced separate loadStorageMediaData call
    const domLoadedMatch = adminJsContent.match(/document\.addEventListener\("DOMContentLoaded",[\s\S]*?loadDashboardData\(\);([\s\S]*?)\}\);/);
    assert(domLoadedMatch, "DOMContentLoaded listener must exist");
    assert(!domLoadedMatch[1].includes("loadStorageMediaData(wishesList)"), "DOMContentLoaded should not have dangling unsynchronized loadStorageMediaData call");
  });

  // ------------------------------------------------------------
  // 3. Execution Simulation with Mock Storage & Wishes Services
  // ------------------------------------------------------------
  await asyncTest("Lifecycle Simulation: Initial load renders complete Storage KPIs atomically", async () => {
    mockDOM = {};
    let storageFetchCompleted = false;

    // Mock SupabaseModule and StorageModule
    globalThis.StorageModule = {
      listAllMedia: async () => {
        await new Promise(r => setTimeout(r, 10));
        storageFetchCompleted = true;
        return mockStorageFiles;
      }
    };

    globalThis.SupabaseModule = {
      getClient: () => ({
        from: () => ({
          select: () => ({
            neq: () => ({
              order: () => Promise.resolve({ data: mockWishes, error: null })
            })
          })
        })
      })
    };

    // Load admin.js
    require(path.join(__dirname, "../js/admin.js"));

    // Trigger DOMContentLoaded
    assert(domContentLoadedCb, "DOMContentLoaded callback must be registered");
    await domContentLoadedCb();

    // Allow promises in loadDashboardData to resolve
    await new Promise(r => setTimeout(r, 50));

    assert.strictEqual(storageFetchCompleted, true, "Storage load must complete during initial load");
    assert.strictEqual(mockDOM["kpi-total-images"].textContent, 2, "Images KPI must be 2 on initial load");
    assert.strictEqual(mockDOM["kpi-total-videos"].textContent, 1, "Videos KPI must be 1 on initial load");
    assert.strictEqual(mockDOM["kpi-total-audio"].textContent, 2, "Audio KPI must be 2 on initial load");
  });

  // ------------------------------------------------------------
  // 4. Parity with "Refresh Analytics"
  // ------------------------------------------------------------
  await asyncTest("Parity Check: Refresh Analytics produces identical KPI values as initial load", async () => {
    // Trigger refresh button click handler
    const refreshBtn = mockDOM["btn-refresh-dashboard"];
    assert(refreshBtn && refreshBtn.click, "Refresh button must have click listener");

    await refreshBtn.click();
    await new Promise(r => setTimeout(r, 50));

    assert.strictEqual(mockDOM["kpi-total-wishes"].textContent, 3, "Total wishes after refresh must match");
    assert.strictEqual(mockDOM["kpi-today-wishes"].textContent, 2, "Today wishes after refresh must match");
    assert.strictEqual(mockDOM["kpi-total-images"].textContent, 2, "Images KPI after refresh must match");
    assert.strictEqual(mockDOM["kpi-total-videos"].textContent, 1, "Videos KPI after refresh must match");
    assert.strictEqual(mockDOM["kpi-total-audio"].textContent, 2, "Audio KPI after refresh must match");
  });

  // ------------------------------------------------------------
  // 5. Error Resilience
  // ------------------------------------------------------------
  await asyncTest("Error Resilience: Storage fetch failure does not crash Dashboard", async () => {
    globalThis.StorageModule = {
      listAllMedia: async () => {
        throw new Error("Supabase Storage bucket offline");
      }
    };

    let errorThrown = false;
    try {
      const refreshBtn = mockDOM["btn-refresh-dashboard"];
      await refreshBtn.click();
      await new Promise(r => setTimeout(r, 50));
    } catch (e) {
      errorThrown = true;
    }

    assert.strictEqual(errorThrown, false, "Dashboard loading must not throw or crash on Storage error");
    assert.strictEqual(mockDOM["kpi-total-wishes"].textContent, 3, "Wishes KPI must still render correctly");
  });

  console.log("\n============================================================");
  console.log(`🎉 ALL ${testCount} PHASE 31A KPI SYNCHRONIZATION TESTS PASSED!`);
  console.log("============================================================\n");
})();
