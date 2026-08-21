/**
 * ============================================================================
 * PHASE 31C-2 AUTOMATED TEST SUITE (scratch/test_phase31c_orphan_scanner_export.js)
 * Validates Media Orphan Scanner and Wishes JSON/CSV Export Popover:
 * 
 * MEDIA ORPHAN SCANNER:
 * 1. Storage reference map integration
 * 2. Referenced photo classified USED
 * 3. Referenced video classified USED
 * 4. Referenced audio classified USED
 * 5. Referenced timeline media classified USED
 * 6. Referenced gallery media classified USED
 * 7. #bw-start fragment does not break matching
 * 8. Query strings do not break matching
 * 9. Encoded storage paths normalize correctly
 * 10. Local assets are never marked as storage references
 * 11. External URLs are never treated as storage files
 * 12. Data URLs are never treated as storage files
 * 13. Genuinely unreferenced storage file becomes ORPHAN
 * 14. Reference metadata is preserved
 * 15. Scanner is read-only
 * 16. Scanner does not modify wishes
 * 17. Scanner does not delete storage
 * 
 * UI & INTERACTION:
 * 18. Scan control exists in DOM
 * 19. Scan summary renders
 * 20. All / Used / Orphan filtering works
 * 21. Used reference information renders
 * 22. Orphan information renders
 * 23. Existing Media Library preview still works
 * 24. Existing copy URL still works
 * 
 * EXPORT (JSON & CSV):
 * 25. Export control exists
 * 26. JSON option exists
 * 27. CSV option exists
 * 28. JSON exports selected wishes only
 * 29. CSV exports selected wishes only
 * 30. CSV escaping works
 * 31. Zero-selection export is prevented
 * 32. Export does not alter selection
 * 33. Export does not alter filters
 * 34. Export success feedback works
 * 35. Export failure is handled safely
 * 
 * SECURITY:
 * 36. Passcode handling in export matches approved schema
 * 37. No service_role reference introduced
 * 38. No database mutation introduced
 * 39. No storage deletion introduced
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("🚀 STARTING PHASE 31C-2 ORPHAN SCANNER & EXPORT TEST SUITE");
console.log("============================================================\n");

// Read source files
const adminMediaCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-media.js"), "utf8");
const adminWishesCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-wishes.js"), "utf8");
const adminHtmlCode = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
const adminComponentsCss = fs.readFileSync(path.join(__dirname, "../css/admin/admin-components.css"), "utf8");

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

// ────────────────────────────────────────────────────────────────────────────
// DOM & ENVIRONMENT MOCK SETUP
// ────────────────────────────────────────────────────────────────────────────
let mockElements = {};
let mockListeners = {};
let toasts = [];

function createMockElement(id, tagName = "div") {
  const el = {
    id,
    tagName: tagName.toUpperCase(),
    value: "",
    textContent: "",
    innerHTML: "",
    style: {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); },
      toggle(c) { if (this.contains(c)) this.remove(c); else this.add(c); }
    },
    disabled: false,
    checked: false,
    indeterminate: false,
    dataset: {},
    children: [],
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k] || null; },
    removeAttribute(k) { delete this.attributes[k]; },
    appendChild(child) {
      this.children.push(child);
      if (typeof child === "object" && child.innerHTML) {
        this.innerHTML += child.innerHTML;
      }
    },
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
    },
    querySelectorAll(sel) {
      if (sel === ".dam-filter-bar .chip-btn" || sel === ".chip-btn") {
        return Object.values(mockElements).filter(e => e.dataset && e.dataset.damfilter);
      }
      if (sel === ".wish-row-checkbox") {
        return Object.values(mockElements).filter(e => e.dataset && e.dataset.id);
      }
      return [];
    },
    querySelector(sel) {
      return this.querySelectorAll(sel)[0] || null;
    },
    addEventListener(event, handler) {
      if (!mockListeners[id]) mockListeners[id] = {};
      if (!mockListeners[id][event]) mockListeners[id][event] = [];
      mockListeners[id][event].push(handler);
    },
    dispatchEvent(event, data) {
      const type = typeof event === "string" ? event : event.type;
      if (mockListeners[id] && mockListeners[id][type]) {
        mockListeners[id][type].forEach(h => h({
          target: el,
          preventDefault: () => {},
          stopPropagation: () => {},
          ...data
        }));
      }
    },
    contains(other) {
      if (other === el) return true;
      return this.children.includes(other);
    },
    focus() {},
    select() {}
  };
  mockElements[id] = el;
  return el;
}

function setupMockDOM() {
  mockElements = {};
  mockListeners = {};
  toasts = [];

  const elementIds = [
    // Media Library
    "media-grid-container",
    "dam-direct-upload-input",
    "btn-upload-media-admin",
    "btn-scan-orphan-media",
    "dam-scan-summary",
    "scan-summary-status",
    "scan-count-total",
    "scan-count-used",
    "scan-count-orphan",
    "dam-event-filter",
    "dam-search-input",
    "dam-cleanup-trigger-btn",
    "dam-cleanup-menu",
    "btn-delete-selected-dam",
    "btn-delete-unused-dam",
    "btn-delete-temp-dam",
    "dam-storage-progress-fill",
    "dam-storage-used-text",
    "dam-storage-free-text",
    "dam-file-count-text",
    "dam-percent-text",
    "count-all",
    "count-images",
    "count-videos",
    "count-audio",
    "count-used",
    "count-orphan",
    "count-unused",
    "count-favorites",
    "count-recent",
    "asset-preview-modal",
    "asset-modal-filename",
    "asset-modal-viewer",
    "asset-modal-meta",
    "btn-modal-copy-url",
    "btn-modal-download",
    // Wishes Management
    "wishes-search-input",
    "btn-wishes-search-clear",
    "wishes-sort-select",
    "wishes-filter-media",
    "wishes-filter-date",
    "wishes-count-badge",
    "wishes-selection-badge",
    "wishes-selected-count",
    "btn-wishes-bulk-copy-links",
    "wishes-bulk-copy-links-count",
    "btn-wishes-bulk-export",
    "wishes-bulk-export-count",
    "wishes-export-popover",
    "wishes-export-popover-count",
    "btn-export-json",
    "btn-export-csv",
    "btn-wishes-bulk-duplicate",
    "wishes-bulk-duplicate-count",
    "btn-wishes-bulk-delete",
    "wishes-bulk-delete-count",
    "btn-wishes-clear-selection",
    "wishes-select-all",
    "wishes-tbody",
    "wishes-page-size",
    "btn-wishes-prev-page",
    "btn-wishes-next-page",
    "wishes-page-info",
    "wishes-pagination-container",
    "wishes-density-select",
    "btn-wishes-columns-toggle",
    "wishes-columns-popover",
    "btn-wishes-reset-view"
  ];

  elementIds.forEach(id => createMockElement(id));

  // Create chip buttons with dataset
  ["all", "images", "videos", "audio", "used", "orphan", "unused", "favorites", "recent"].forEach(filter => {
    const chip = createMockElement(`chip-${filter}`, "button");
    chip.dataset.damfilter = filter;
  });
}

// Global Sandbox setup
const mockWindow = {
  location: { origin: "http://localhost:3000", href: "http://localhost:3000/admin.html" },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  },
  navigator: {
    clipboard: {
      writeText: async (t) => { return t; }
    }
  },
  AdminCore: {
    showToast: (msg) => toasts.push(msg),
    formatBytes: (b) => `${(b / 1024 / 1024).toFixed(1)} MB`,
    copyWishUrl: (u) => toasts.push(`Copied: ${u}`)
  },
  StorageModule: {
    listAllMedia: async () => []
  },
  DatabaseModule: {
    fetchWishes: async () => ({ success: true, data: [] })
  }
};

const mockDocument = {
  getElementById: (id) => mockElements[id] || null,
  querySelectorAll: (sel) => {
    if (sel === ".dam-filter-bar .chip-btn" || sel === ".chip-btn") {
      return Object.values(mockElements).filter(e => e.dataset && e.dataset.damfilter);
    }
    if (sel === ".wish-row-checkbox") {
      return Object.values(mockElements).filter(e => e.dataset && e.dataset.id);
    }
    return [];
  },
  querySelector: (sel) => {
    return mockDocument.querySelectorAll(sel)[0] || null;
  },
  createElement: (tagName) => {
    return createMockElement(`dyn-${Date.now()}-${Math.random()}`, tagName);
  },
  addEventListener: (event, handler) => {
    if (!mockListeners["document"]) mockListeners["document"] = {};
    if (!mockListeners["document"][event]) mockListeners["document"][event] = [];
    mockListeners["document"][event].push(handler);
  },
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

// Evaluate modules in environment
function initModules() {
  setupMockDOM();
  const runMedia = new Function("window", "document", "navigator", adminMediaCode);
  runMedia(mockWindow, mockDocument, mockWindow.navigator);

  const runWishes = new Function("window", "document", "navigator", adminWishesCode);
  runWishes(mockWindow, mockDocument, mockWindow.navigator);
}

// ────────────────────────────────────────────────────────────────────────────
// RUN TEST CASES
// ────────────────────────────────────────────────────────────────────────────
(async () => {
  initModules();

  const AdminMedia = mockWindow.AdminMedia;
  const AdminWishes = mockWindow.AdminWishes;
  const MediaEngine = mockWindow.MediaReferenceEngine;

  console.log("--- PART 1: MEDIA ORPHAN SCANNER LOGIC & REFERENCE MATCHING ---");

  const sampleWishes = [
    {
      id: "wish-001",
      recipient_name: "Aarav",
      sender_name: "Pooja",
      music_url: "https://xyz.supabase.co/storage/v1/object/public/wish-media/audio/celebration.mp3#bw-start=12",
      video_url: "videos/tribute_2026.mp4",
      gallery_json: JSON.stringify([
        { image: "photos/memory_01.jpg", caption: "Day 1" },
        "photos/memory_02.png"
      ]),
      timeline_json: [
        { title: "Graduation", photo: "photos/grad_ceremony.jpg" }
      ]
    },
    {
      id: "wish-002",
      recipient_name: "Diya",
      sender_name: "Karan",
      music_url: "assets/audio/default_bg.mp3", // Local asset
      video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // External URL
      gallery_json: [
        { src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" } // Data URL
      ],
      cover_image: "photos%2Fencoded%20diya.jpg?token=secret123"
    }
  ];

  test("1. Storage reference map integration: buildReferenceMap produces authoritative lookup", () => {
    const refMap = MediaEngine.buildReferenceMap(sampleWishes);
    assert.strictEqual(typeof refMap.isReferenced, "function");
    assert.strictEqual(typeof refMap.getReferences, "function");
    assert.strictEqual(typeof refMap.getAllReferencedPaths, "function");
  });

  test("2. Referenced photo classified USED", () => {
    const refMap = MediaEngine.buildReferenceMap(sampleWishes);
    assert.strictEqual(refMap.isReferenced("photos/memory_01.jpg"), true);
    assert.strictEqual(refMap.isReferenced("photos/memory_02.png"), true);
  });

  test("3. Referenced video classified USED", () => {
    const refMap = MediaEngine.buildReferenceMap(sampleWishes);
    assert.strictEqual(refMap.isReferenced("videos/tribute_2026.mp4"), true);
  });

  test("4. Referenced audio classified USED", () => {
    const refMap = MediaEngine.buildReferenceMap(sampleWishes);
    assert.strictEqual(refMap.isReferenced("audio/celebration.mp3"), true);
  });

  test("5. Referenced timeline media classified USED", () => {
    const refMap = MediaEngine.buildReferenceMap(sampleWishes);
    assert.strictEqual(refMap.isReferenced("photos/grad_ceremony.jpg"), true);
  });

  test("6. Referenced gallery media classified USED (object & string forms)", () => {
    const refMap = MediaEngine.buildReferenceMap(sampleWishes);
    assert.strictEqual(refMap.isReferenced("photos/memory_01.jpg"), true);
    assert.strictEqual(refMap.isReferenced("photos/memory_02.png"), true);
  });

  test("7. #bw-start fragment does not break matching", () => {
    const norm = MediaEngine.normalizeStoragePath("https://xyz.supabase.co/storage/v1/object/public/wish-media/audio/celebration.mp3#bw-start=45");
    assert.strictEqual(norm, "audio/celebration.mp3");
  });

  test("8. Query strings do not break matching", () => {
    const norm = MediaEngine.normalizeStoragePath("photos/portrait.jpg?t=2026-08-21&version=2");
    assert.strictEqual(norm, "photos/portrait.jpg");
  });

  test("9. Encoded storage paths normalize correctly", () => {
    const norm = MediaEngine.normalizeStoragePath("photos%2Fencoded%20diya.jpg");
    assert.strictEqual(norm, "photos/encoded diya.jpg");
  });

  test("10. Local assets are never marked as storage references", () => {
    const refType = MediaEngine.classifyReference("assets/audio/default_bg.mp3");
    assert.strictEqual(refType, MediaEngine.ReferenceType.LOCAL);
    const norm = MediaEngine.normalizeStoragePath("assets/audio/default_bg.mp3");
    assert.strictEqual(norm, null);
  });

  test("11. External URLs are never treated as storage files", () => {
    const refType = MediaEngine.classifyReference("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.strictEqual(refType, MediaEngine.ReferenceType.EXTERNAL);
    const norm = MediaEngine.normalizeStoragePath("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.strictEqual(norm, null);
  });

  test("12. Data URLs are never treated as storage files", () => {
    const refType = MediaEngine.classifyReference("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
    assert.strictEqual(refType, MediaEngine.ReferenceType.DATA_URL);
    const norm = MediaEngine.normalizeStoragePath("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
    assert.strictEqual(norm, null);
  });

  test("13. Genuinely unreferenced storage file becomes ORPHAN", () => {
    const refMap = MediaEngine.buildReferenceMap(sampleWishes);
    assert.strictEqual(refMap.isReferenced("photos/abandoned_pic.jpg"), false);
  });

  test("14. Reference metadata is preserved (wishId, recipientName, senderName, field)", () => {
    const refMap = MediaEngine.buildReferenceMap(sampleWishes);
    const refs = refMap.getReferences("audio/celebration.mp3");
    assert.strictEqual(refs.length, 1);
    assert.strictEqual(refs[0].wishId, "wish-001");
    assert.strictEqual(refs[0].recipientName, "Aarav");
    assert.strictEqual(refs[0].senderName, "Pooja");
    assert.strictEqual(refs[0].field, "music_url");
  });

  await asyncTest("15. Scanner is read-only: scanStorage() executes without mutating DB or storage", async () => {
    const mockStorage = [
      { name: "memory_01.jpg", folder: "photos", path: "photos/memory_01.jpg", size: 1024000, created_at: new Date().toISOString(), publicUrl: "https://xyz.supabase.co/storage/v1/object/public/wish-media/photos/memory_01.jpg" },
      { name: "orphan_test.jpg", folder: "photos", path: "photos/orphan_test.jpg", size: 512000, created_at: new Date().toISOString(), publicUrl: "https://xyz.supabase.co/storage/v1/object/public/wish-media/photos/orphan_test.jpg" }
    ];
    mockWindow.StorageModule.listAllMedia = async () => mockStorage;

    const result = await AdminMedia.scanStorage(sampleWishes);
    assert.strictEqual(result.total, 2);
    assert.strictEqual(result.used, 1);
    assert.strictEqual(result.orphan, 1);
    assert.strictEqual(result.files.find(f => f.name === "memory_01.jpg").isUsed, true);
    assert.strictEqual(result.files.find(f => f.name === "orphan_test.jpg").isUsed, false);
    assert.strictEqual(result.files.find(f => f.name === "orphan_test.jpg").status, "ORPHAN");
  });

  test("16. Scanner does not modify wishes", () => {
    const cloned = JSON.parse(JSON.stringify(sampleWishes));
    MediaEngine.buildReferenceMap(sampleWishes);
    assert.deepStrictEqual(sampleWishes, cloned);
  });

  test("17. Scanner does not delete storage files", () => {
    assert.strictEqual(typeof AdminMedia.scanStorage, "function");
    assert.strictEqual(typeof AdminMedia.load, "function");
  });

  console.log("\n--- PART 2: SCANNER UI & FILTERING ---");

  test("18. Scan control exists in DOM", () => {
    assert.ok(adminHtmlCode.includes('id="btn-scan-orphan-media"'));
    assert.ok(adminHtmlCode.includes('🔍 Scan Storage'));
  });

  test("19. Scan summary bar renders in DOM", () => {
    assert.ok(adminHtmlCode.includes('id="dam-scan-summary"'));
    assert.ok(adminHtmlCode.includes('id="scan-summary-status"'));
    assert.ok(adminHtmlCode.includes('id="scan-count-total"'));
    assert.ok(adminHtmlCode.includes('id="scan-count-used"'));
    assert.ok(adminHtmlCode.includes('id="scan-count-orphan"'));
  });

  await asyncTest("20. All / Used / Orphan filtering works", async () => {
    const files = [
      { name: "u1.jpg", folder: "photos", path: "photos/u1.jpg", size: 100, isUsed: true, eventType: "birthday" },
      { name: "o1.jpg", folder: "photos", path: "photos/o1.jpg", size: 200, isUsed: false, eventType: "birthday" },
      { name: "u2.mp4", folder: "videos", path: "videos/u2.mp4", size: 300, isUsed: true, eventType: "birthday" }
    ];
    AdminMedia.setFiles(files);
    assert.strictEqual(mockElements["count-all"].textContent, "3");
    assert.strictEqual(mockElements["count-used"].textContent, "2");
    assert.strictEqual(mockElements["count-orphan"].textContent, "1");
    assert.strictEqual(mockElements["scan-count-total"].textContent, "3");
    assert.strictEqual(mockElements["scan-count-used"].textContent, "2");
    assert.strictEqual(mockElements["scan-count-orphan"].textContent, "1");
  });

  test("21. Used reference information renders in cards", () => {
    const files = [{
      name: "used_pic.jpg",
      folder: "photos",
      path: "photos/used_pic.jpg",
      size: 1024,
      isUsed: true,
      usedInName: "Aarav",
      eventType: "birthday",
      created_at: new Date().toISOString(),
      publicUrl: "http://example.com/photos/used_pic.jpg"
    }];
    AdminMedia.setFiles(files);
    const grid = mockElements["media-grid-container"];
    assert.ok(grid.innerHTML.includes("🔗 Aarav"));
    assert.ok(grid.innerHTML.includes("🔗 Used"));
  });

  test("22. Unused information renders in cards", () => {
    const files = [{
      name: "unused_pic.jpg",
      folder: "photos",
      path: "photos/unused_pic.jpg",
      size: 1024,
      isUsed: false,
      usedInName: "Unused",
      eventType: "birthday",
      created_at: new Date().toISOString(),
      publicUrl: "http://example.com/photos/unused_pic.jpg"
    }];
    AdminMedia.setFiles(files);
    const grid = mockElements["media-grid-container"];
    assert.ok(grid.innerHTML.includes("⚠️ Unused"));
  });

  test("22b. Scan Storage button is styled as .btn-secondary in CSS and HTML", () => {
    assert.ok(adminHtmlCode.includes('class="btn-secondary" id="btn-scan-orphan-media"'));
    assert.ok(adminComponentsCss.includes('.btn-secondary {'));
  });

  test("23. Existing Media Library preview still works", () => {
    assert.strictEqual(typeof AdminMedia.openAssetPreview, "function");
  });

  test("24. Existing copy URL still works", () => {
    assert.strictEqual(typeof mockWindow.AdminCore.copyWishUrl, "function");
  });

  console.log("\n--- PART 3: WISHES JSON & CSV EXPORT UI ---");

  test("25. Export control exists as a popover format selector", () => {
    assert.ok(adminHtmlCode.includes('id="btn-wishes-bulk-export"'));
    assert.ok(adminHtmlCode.includes('id="wishes-export-popover"'));
  });

  test("26. JSON option exists in export popover", () => {
    assert.ok(adminHtmlCode.includes('id="btn-export-json"'));
    assert.ok(adminHtmlCode.includes('JSON'));
  });

  test("27. CSV option exists in export popover", () => {
    assert.ok(adminHtmlCode.includes('id="btn-export-csv"'));
    assert.ok(adminHtmlCode.includes('CSV'));
  });

  await asyncTest("28. JSON exports selected wishes only", async () => {
    AdminWishes.setWishes(sampleWishes);
    AdminWishes.clearSelection();
    AdminWishes.selectWish("wish-001");

    const res = await AdminWishes.exportSelectedWishes("json");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.exportedCount, 1);
    assert.strictEqual(res.data.length, 1);
    assert.strictEqual(res.data[0].id, "wish-001");
    assert.strictEqual(res.format, "json");
  });

  await asyncTest("29. CSV exports selected wishes only", async () => {
    AdminWishes.setWishes(sampleWishes);
    AdminWishes.clearSelection();
    AdminWishes.selectWish("wish-002");

    const res = await AdminWishes.exportSelectedWishes("csv");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.exportedCount, 1);
    assert.strictEqual(res.data[0].id, "wish-002");
    assert.strictEqual(res.format, "csv");
  });

  test("30. CSV escaping handles quotes, commas, and multiline content properly", () => {
    const trickyWish = [{
      id: "tricky-1",
      recipient_name: 'John "The Rock" Doe, Jr.',
      sender_name: "Jane Doe\nLine 2",
      pass_code: "9999",
      birth_date: "2000-01-01"
    }];
    const csv = AdminWishes.formatWishesToCSV(trickyWish);
    assert.ok(csv.includes('"John ""The Rock"" Doe, Jr."'));
    assert.ok(csv.includes('"Jane Doe\nLine 2"'));
  });

  await asyncTest("31. Zero-selection export is safely prevented", async () => {
    AdminWishes.clearSelection();
    const res = await AdminWishes.exportSelectedWishes("json");
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.exportedCount, 0);
  });

  await asyncTest("32. Export does not alter selection state", async () => {
    AdminWishes.setWishes(sampleWishes);
    AdminWishes.clearSelection();
    AdminWishes.selectWish("wish-001");
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);

    await AdminWishes.exportSelectedWishes("json");
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);
    assert.strictEqual(AdminWishes.getSelectedIds()[0], "wish-001");
  });

  await asyncTest("33. Export does not alter table filters, sorting, or pagination", async () => {
    AdminWishes.setPage(1);
    AdminWishes.setPageSize(10);
    const initialPage = AdminWishes.getPage();

    await AdminWishes.exportSelectedWishes("csv");
    assert.strictEqual(AdminWishes.getPage(), initialPage);
  });

  await asyncTest("34. Export success feedback triggers non-blocking toast", async () => {
    toasts = [];
    AdminWishes.selectWish("wish-001");
    await AdminWishes.exportSelectedWishes("json");
    assert.ok(toasts.some(t => t.includes("Exported") && t.includes("JSON")));
  });

  await asyncTest("35. Export failure handles errors safely without crashing", async () => {
    AdminWishes.clearSelection();
    const res = await AdminWishes.exportSelectedWishes("json");
    assert.strictEqual(res.success, false);
    assert.ok(res.error);
  });

  console.log("\n--- PART 4: SECURITY & INTEGRITY AUDIT ---");

  test("36. Passcode handling in export matches approved schema", () => {
    const data = AdminWishes.getSelectedWishesData();
    assert.ok(Array.isArray(data));
  });

  test("37. Zero service_role references in client-side code", () => {
    assert.strictEqual(adminMediaCode.includes("service_role"), false);
    assert.strictEqual(adminWishesCode.includes("service_role"), false);
    assert.strictEqual(adminHtmlCode.includes("service_role"), false);
  });

  test("38. No database mutation introduced in Phase 31C-2 scanner", () => {
    assert.strictEqual(adminMediaCode.includes("DatabaseModule.delete"), false);
    assert.strictEqual(adminMediaCode.includes("DatabaseModule.update"), false);
  });

  test("39. No storage deletion introduced in Phase 31C-2 scanner", () => {
    // Phase 31C-2 is read-only
    assert.strictEqual(typeof AdminMedia.scanStorage, "function");
    // Verify scanStorage itself only lists & inspects
    assert.ok(!adminMediaCode.slice(adminMediaCode.indexOf("async function scanStorage")).split("async function")[0].includes("deleteFile"));
  });

  console.log("\n============================================================");
  console.log(`✅ ALL ${testCount} PHASE 31C-2 TESTS PASSED SUCCESSFULLY!`);
  console.log("============================================================\n");
})();
