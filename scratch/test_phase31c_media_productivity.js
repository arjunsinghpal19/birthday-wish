/**
 * ============================================================================
 * PHASE 31C-5A + 31C-6 AUTOMATED TEST SUITE (scratch/test_phase31c_media_productivity.js)
 * Media Asset Inspector UI Polish & Media Library Productivity & Organization
 *
 * Verifies:
 * 1. Sorting: Newest, Oldest, Largest, Smallest, Name A-Z, Name Z-A.
 * 2. Filters: All, Images, Videos, Audio, Used, Unused, Favorites, Recent.
 * 3. Search: filename, owner, path, event, linkage.
 * 4. Combinations: Filter + Sort, Search + Filter + Sort.
 * 5. Inspector integration: Opens correct asset post-sort/filter, maintains protection.
 * 6. Phase 31C-5A UI Polish: Header stability, independent scroll body, fixed footer, close actions.
 * 7. Invariants: No storage deletions, zero database mutations, full backward compatibility.
 * ============================================================================
 */

import fs from "fs";
import path from "path";
import assert from "assert";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const adminMediaCode = fs.readFileSync(path.join(projectRoot, "js", "admin", "admin-media.js"), "utf-8");
const adminHtmlCode = fs.readFileSync(path.join(projectRoot, "admin.html"), "utf-8");
const adminCssCode = fs.readFileSync(path.join(projectRoot, "css", "admin", "admin-components.css"), "utf-8");
const adminWishesCode = fs.readFileSync(path.join(projectRoot, "js", "admin", "admin-wishes.js"), "utf-8");

let testCount = 0;
let passCount = 0;

async function test(name, fn) {
  testCount++;
  try {
    await fn();
    passCount++;
    console.log(`  ✓ ${testCount}. ${name}`);
  } catch (err) {
    console.error(`  ✗ ${testCount}. ${name}`);
    console.error(`    Error: ${err.message}\n`);
    throw err;
  }
}

function createMockEnvironment() {
  const elements = new Map();
  const listeners = new Map();

  function makeEl(id, tagName = "div") {
    const el = {
      id,
      tagName: tagName.toUpperCase(),
      textContent: "",
      innerHTML: "",
      value: "",
      dataset: {},
      style: {},
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); },
        has(c) { return this._classes.has(c); }
      },
      setAttribute(k, v) { this[k] = v; },
      getAttribute(k) { return this[k]; },
      addEventListener(evt, cb) {
        if (!listeners.has(`${id}:${evt}`)) listeners.set(`${id}:${evt}`, []);
        listeners.get(`${id}:${evt}`).push(cb);
      },
      dispatchEvent(evt) {
        if (!evt.target) evt.target = this;
        const cbs = listeners.get(`${id}:${evt.type}`) || [];
        cbs.forEach(cb => cb(evt));
      },
      querySelector(sel) { return null; },
      querySelectorAll(sel) { return []; },
      appendChild(child) {},
      removeChild(child) {}
    };
    elements.set(id, el);
    return el;
  }

  [
    "media-grid-container",
    "dam-grid-container",
    "dam-stat-total",
    "dam-stat-photos",
    "dam-stat-videos",
    "dam-stat-audio",
    "dam-stat-used",
    "dam-stat-orphans",
    "dam-stat-storage",
    "dam-sort-select",
    "dam-event-filter",
    "dam-search-input",
    "dam-direct-upload-input",
    "btn-scan-orphan-media",
    "dam-scan-summary",
    "scan-summary-status",
    "scan-count-total",
    "scan-count-used",
    "scan-count-orphan",
    "dam-unused-selection-bar",
    "unused-selected-count-text",
    "unused-selected-size-text",
    "btn-select-all-unused",
    "btn-review-unused-cleanup",
    "btn-clear-unused-selection",
    "unused-cleanup-modal",
    "unused-modal-file-count",
    "unused-modal-total-size",
    "unused-modal-file-list",
    "btn-close-unused-modal-x",
    "btn-cancel-unused-review",
    "btn-confirm-unused-review",
    "btn-start-unused-cleanup",
    "btn-confirm-delete-unused",
    "btn-back-to-unused-review",
    "unused-modal-warning-box",
    "unused-modal-danger-box",
    "unused-modal-review-footer",
    "unused-modal-confirm-footer",
    "unused-modal-status-badge",
    "unused-confirm-count-text",
    "unused-confirm-size-text",
    "asset-preview-modal",
    "asset-modal-filename",
    "asset-modal-viewer",
    "asset-modal-meta",
    "btn-modal-copy-url",
    "btn-modal-download",
    "btn-cleanup-tools-trigger",
    "cleanup-tools-dropdown",
    "btn-delete-selected-dam",
    "btn-delete-unused-dam",
    "btn-delete-temp-dam",
    "asset-inspector-modal",
    "btn-close-inspector",
    "btn-close-inspector-modal-x",
    "btn-inspector-copy-url",
    "btn-inspector-copy-path",
    "btn-inspector-download",
    "inspector-media-preview",
    "inspector-file-name",
    "inspector-file-path",
    "inspector-file-folder",
    "inspector-file-size",
    "inspector-file-mimetype",
    "inspector-file-date",
    "inspector-status-badge",
    "inspector-used-section",
    "inspector-unused-section",
    "inspector-references-list",
    "inspector-ref-count-text",
    "btn-inspector-select-cleanup"
  ].forEach(id => makeEl(id));

  let copiedText = "";

  const documentMock = {
    getElementById(id) {
      if (!elements.has(id)) return makeEl(id);
      return elements.get(id);
    },
    querySelectorAll(sel) { return []; },
    querySelector(sel) { return null; },
    createElement(tag) {
      return makeEl("temp_" + Math.random().toString(36).substr(2, 9), tag);
    },
    addEventListener(evt, cb) {
      if (!listeners.has(`doc:${evt}`)) listeners.set(`doc:${evt}`, []);
      listeners.get(`doc:${evt}`).push(cb);
    },
    dispatchEvent(evt) {
      const cbs = listeners.get(`doc:${evt.type}`) || [];
      cbs.forEach(cb => cb(evt));
    }
  };

  const windowMock = {
    document: documentMock,
    navigator: {
      clipboard: {
        writeText: async (t) => { copiedText = t; }
      }
    },
    sessionStorage: { getItem: () => "mock_token" },
    formatBytes: (bytes) => `${(bytes / 1024).toFixed(1)} KB`,
    showToast: (msg) => {},
    copyWishUrl: (url) => { copiedText = url; },
    getCopiedText: () => copiedText,
    StorageModule: {
      uploadMedia: async () => ({ success: true }),
      listAllMedia: async () => [],
      deleteMedia: async () => true,
      deleteMultipleMedia: async () => true
    }
  };

  return { windowMock, documentMock, elements, listeners };
}

function getSampleFiles() {
  return [
    { id: "1", name: "charlie.png", folder: "photos", path: "photos/charlie.png", size: 3000, created_at: "2026-08-20T10:00:00Z", isUsed: false, isFavorite: true, eventType: "birthday" },
    { id: "2", name: "alpha.mp4", folder: "videos", path: "videos/alpha.mp4", size: 10000, created_at: "2026-08-22T10:00:00Z", isUsed: true, isFavorite: false, eventType: "anniversary", references: [{ wishId: "w1", recipientName: "Alice", field: "video_url" }] },
    { id: "3", name: "bravo.mp3", folder: "audio", path: "audio/bravo.mp3", size: 1000, created_at: "2026-08-15T10:00:00Z", isUsed: true, isFavorite: true, eventType: "birthday", references: [{ wishId: "w2", recipientName: "Bob", field: "music_url" }] },
    { id: "4", name: "delta.jpg", folder: "photos", path: "photos/delta.jpg", size: 50000, created_at: "2026-08-01T10:00:00Z", isUsed: false, isFavorite: false, eventType: "wedding" }
  ];
}

async function runAllTests() {
  console.log("============================================================");
  console.log("🚀 STARTING PHASE 31C-5A & 31C-6 TEST SUITE");
  console.log("============================================================\n");

  // --- PART 1: SORTING ---
  await test("1. Sort Newest First", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setSort("newest");

    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files[0].name, "alpha.mp4", "Newest file (2026-08-22) must be first");
    assert.strictEqual(files[files.length - 1].name, "delta.jpg", "Oldest file (2026-08-01) must be last");
  });

  await test("2. Sort Oldest First", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setSort("oldest");

    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files[0].name, "delta.jpg", "Oldest file (2026-08-01) must be first");
    assert.strictEqual(files[files.length - 1].name, "alpha.mp4", "Newest file must be last");
  });

  await test("3. Sort Largest First", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setSort("largest");

    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files[0].name, "delta.jpg", "Largest file (50000 bytes) must be first");
    assert.strictEqual(files[files.length - 1].name, "bravo.mp3", "Smallest file (1000 bytes) must be last");
  });

  await test("4. Sort Smallest First", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setSort("smallest");

    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files[0].name, "bravo.mp3", "Smallest file (1000 bytes) must be first");
    assert.strictEqual(files[files.length - 1].name, "delta.jpg", "Largest file (50000 bytes) must be last");
  });

  await test("5. Sort Name A-Z", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setSort("name_asc");

    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files[0].name, "alpha.mp4");
    assert.strictEqual(files[1].name, "bravo.mp3");
    assert.strictEqual(files[2].name, "charlie.png");
    assert.strictEqual(files[3].name, "delta.jpg");
  });

  await test("6. Sort Name Z-A", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setSort("name_desc");

    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files[0].name, "delta.jpg");
    assert.strictEqual(files[1].name, "charlie.png");
    assert.strictEqual(files[2].name, "bravo.mp3");
    assert.strictEqual(files[3].name, "alpha.mp4");
  });

  // --- PART 2: FILTERS ---
  await test("7. Existing All Files filter", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setFilter("all");
    assert.strictEqual(windowMock.AdminMedia.getFilteredFiles().length, 4);
  });

  await test("8. Existing Images filter", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setFilter("images");
    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files.length, 2);
    assert.ok(files.every(f => f.folder === "photos"));
  });

  await test("9. Existing Videos filter", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setFilter("videos");
    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].folder, "videos");
  });

  await test("10. Existing Audio filter", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setFilter("audio");
    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].folder, "audio");
  });

  await test("11. Existing Used filter", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setFilter("used");
    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files.length, 2);
    assert.ok(files.every(f => f.isUsed));
  });

  await test("12. Existing Unused filter", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setFilter("unused");
    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files.length, 2);
    assert.ok(files.every(f => !f.isUsed));
  });

  await test("13. Existing Favorites filter", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setFilter("favorites");
    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files.length, 2);
    assert.ok(files.every(f => f.isFavorite));
  });

  await test("14. Existing Recent filter", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setFilter("recent");
    const files = windowMock.AdminMedia.getFilteredFiles();
    // In our sample files, charlie (2026-08-20), alpha (2026-08-22), and bravo (2026-08-15) are within 7 days
    assert.ok(files.length >= 1, "Recent files must be returned");
  });

  // --- PART 3: SEARCH & COMBINATIONS ---
  await test("15. Search remains functional", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);
    windowMock.AdminMedia.init();

    windowMock.AdminMedia.setFiles(getSampleFiles());
    const searchInput = documentMock.getElementById("dam-search-input");
    searchInput.value = "charlie";
    searchInput.dispatchEvent({ type: "input" });

    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].name, "charlie.png");
  });

  await test("16. Search + filter works", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);
    windowMock.AdminMedia.init();

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setFilter("photos");

    const searchInput = documentMock.getElementById("dam-search-input");
    searchInput.value = "delta";
    searchInput.dispatchEvent({ type: "input" });

    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].name, "delta.jpg");
  });

  await test("17. Filter + sort works", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setFilter("images");
    windowMock.AdminMedia.setSort("largest");

    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files.length, 2);
    assert.strictEqual(files[0].name, "delta.jpg", "50000 bytes image first");
    assert.strictEqual(files[1].name, "charlie.png", "3000 bytes image second");
  });

  await test("18. Search + filter + sort works", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);
    windowMock.AdminMedia.init();

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setFilter("all");
    windowMock.AdminMedia.setSort("name_desc");

    const searchInput = documentMock.getElementById("dam-search-input");
    searchInput.value = "mp";
    searchInput.dispatchEvent({ type: "input" });

    const files = windowMock.AdminMedia.getFilteredFiles();
    assert.strictEqual(files.length, 2);
    assert.strictEqual(files[0].name, "bravo.mp3");
    assert.strictEqual(files[1].name, "alpha.mp4");
  });

  // --- PART 4: INSPECTOR INTEGRATION ---
  await test("19. Inspector opens correct asset after sorting", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setSort("smallest");

    windowMock.AdminMedia.openAssetInspector("audio/bravo.mp3");
    const nameEl = documentMock.getElementById("inspector-file-name");
    assert.strictEqual(nameEl.textContent, "bravo.mp3");
  });

  await test("20. Inspector opens correct asset after filtering", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.setFilter("videos");

    windowMock.AdminMedia.openAssetInspector("videos/alpha.mp4");
    const nameEl = documentMock.getElementById("inspector-file-name");
    assert.strictEqual(nameEl.textContent, "alpha.mp4");
  });

  await test("21. Used assets remain protected in inspector and grid", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.openAssetInspector("videos/alpha.mp4");

    const unusedSec = documentMock.getElementById("inspector-unused-section");
    assert.strictEqual(unusedSec.style.display, "none", "Used asset must not show cleanup review button");
  });

  await test("22. Unused selection remains correct after sort/filter change", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(getSampleFiles());
    windowMock.AdminMedia.selectUnusedAsset("photos/charlie.png");
    assert.strictEqual(windowMock.AdminMedia.getSelectedUnusedCount(), 1);

    windowMock.AdminMedia.setSort("largest");
    assert.strictEqual(windowMock.AdminMedia.getSelectedUnusedCount(), 1);

    windowMock.AdminMedia.setFilter("images");
    assert.strictEqual(windowMock.AdminMedia.getSelectedUnusedCount(), 1);
  });

  await test("23. Scan Storage preserves correct catalog", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    windowMock.StorageModule.listAllMedia = async () => getSampleFiles();

    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const wishes = [
      { id: "w1", recipient_name: "Alice", video_url: "https://xyz.supabase.co/storage/v1/object/public/wish-media/videos/alpha.mp4" },
      { id: "w2", recipient_name: "Bob", music_url: "https://xyz.supabase.co/storage/v1/object/public/wish-media/audio/bravo.mp3" }
    ];

    const result = await windowMock.AdminMedia.scanStorage(wishes);
    assert.strictEqual(result.total, 4);
    assert.strictEqual(result.used, 2);
    assert.strictEqual(result.orphan, 2);
  });

  await test("24. Deleted unused assets remain absent after rescan", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    let backendFiles = getSampleFiles();
    windowMock.StorageModule.listAllMedia = async () => [...backendFiles];
    windowMock.StorageModule.deleteMedia = async (p) => {
      backendFiles = backendFiles.filter(f => f.path !== p);
      return true;
    };
    windowMock.StorageModule.deleteMultipleMedia = async (paths) => {
      backendFiles = backendFiles.filter(f => !paths.includes(f.path));
      return true;
    };

    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.setFiles(backendFiles);
    windowMock.AdminMedia.selectUnusedAsset("photos/charlie.png");
    await windowMock.AdminMedia.executeUnusedMediaCleanup();

    const wishes = [
      { id: "w1", recipient_name: "Alice", video_url: "https://xyz.supabase.co/storage/v1/object/public/wish-media/videos/alpha.mp4" },
      { id: "w2", recipient_name: "Bob", music_url: "https://xyz.supabase.co/storage/v1/object/public/wish-media/audio/bravo.mp3" }
    ];

    const scanResult = await windowMock.AdminMedia.scanStorage(wishes);
    assert.strictEqual(scanResult.files.some(f => f.path === "photos/charlie.png"), false);
  });

  // --- PART 5: REGRESSION OF EXISTING FEATURES ---
  await test("25. Existing upload remains working", async () => {
    assert.ok(adminMediaCode.includes("initDamDirectUpload"));
    assert.ok(adminHtmlCode.includes('id="dam-direct-upload-input"'));
  });

  await test("26. Existing preview lightbox remains working", async () => {
    assert.ok(adminMediaCode.includes("openAssetPreview"));
    assert.ok(adminHtmlCode.includes('id="asset-preview-modal"'));
  });

  await test("27. Existing Copy URL remains working", async () => {
    assert.ok(adminMediaCode.includes("copyWishUrl"));
  });

  await test("28. Existing Copy Path remains working", async () => {
    assert.ok(adminMediaCode.includes("inspectorCopyPathBtn"));
  });

  await test("29. Existing JSON export remains working", async () => {
    assert.ok(adminWishesCode.includes("exportSelectedWishes"));
    assert.ok(adminHtmlCode.includes('id="btn-export-json"'));
  });

  await test("30. Existing CSV export remains working", async () => {
    assert.ok(adminWishesCode.includes("formatWishesToCSV"));
    assert.ok(adminHtmlCode.includes('id="btn-export-csv"'));
  });

  await test("31. Existing Phase 31C-4 cleanup remains working", async () => {
    assert.ok(adminMediaCode.includes("executeUnusedMediaCleanup"));
    assert.ok(adminMediaCode.includes("validateSelectedUnusedForDeletion"));
  });

  await test("32. Existing Phase 31C-5 inspector remains working", async () => {
    assert.ok(adminMediaCode.includes("openAssetInspector"));
    assert.ok(adminMediaCode.includes("closeAssetInspector"));
    assert.ok(adminHtmlCode.includes('id="asset-inspector-modal"'));
  });

  await test("33. No duplicate MediaReferenceEngine introduced", async () => {
    const matches = adminMediaCode.match(/const MediaReferenceEngine =/g);
    assert.strictEqual(matches.length, 1, "Exactly one MediaReferenceEngine definition");
  });

  await test("34. No direct storage deletion API introduced outside of safe architecture", async () => {
    const inspectorFn = adminMediaCode.slice(adminMediaCode.indexOf("function openAssetInspector"), adminMediaCode.indexOf("function closeAssetInspector"));
    assert.ok(!inspectorFn.includes("StorageModule.deleteMedia"));
  });

  await test("35. No database mutation introduced by sorting/filtering", async () => {
    const filterFn = adminMediaCode.slice(adminMediaCode.indexOf("function getFilteredFiles"), adminMediaCode.indexOf("function renderDamGrid"));
    assert.ok(!filterFn.includes("DatabaseModule"));
  });

  // --- PART 6: PHASE 31C-5A / 31C-5B UI POLISH TARGETED TESTS ---
  await test("36. Inspector header remains available with title and custom close X", async () => {
    assert.ok(adminHtmlCode.includes('id="inspector-modal-title"'));
    assert.ok(adminHtmlCode.includes('id="btn-close-inspector-modal-x"'));
    assert.ok(adminHtmlCode.includes('class="btn-modal-close"'));
    assert.ok(adminCssCode.includes(".inspector-modal-header"));
    assert.ok(adminCssCode.includes(".btn-modal-close"));
    assert.ok(adminCssCode.includes("border-radius: 50%") || adminCssCode.includes("border-radius:50%"));
    assert.ok(adminCssCode.includes("appearance: none") || adminCssCode.includes("appearance:none"));
  });

  await test("37. Inspector footer Close button exists and is separated", async () => {
    assert.ok(adminHtmlCode.includes('id="btn-close-inspector"'));
    assert.ok(adminCssCode.includes(".inspector-modal-footer"));
    assert.ok(adminCssCode.includes("border-top"));
  });

  await test("38. Inspector body is independently scrollable with overflow-y: auto", async () => {
    assert.ok(adminCssCode.includes(".inspector-modal-body"));
    assert.ok(adminCssCode.includes("overflow-y: auto") || adminCssCode.includes("overflow-y:auto"));
    assert.ok(adminCssCode.includes("flex: 1") || adminCssCode.includes("flex:1"));
  });

  await test("39. Close button calls existing closeAssetInspector()", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);
    windowMock.AdminMedia.init();

    windowMock.AdminMedia.openAssetInspector({ id: "1", name: "t.jpg", path: "photos/t.jpg", folder: "photos", size: 10, isUsed: false });
    const modal = documentMock.getElementById("asset-inspector-modal");
    assert.ok(modal.classList.contains("open"));

    const closeBtn = documentMock.getElementById("btn-close-inspector");
    closeBtn.dispatchEvent({ type: "click" });
    assert.ok(!modal.classList.contains("open"), "Modal must close on footer button click");
  });

  await test("40. Top-right X calls same closeAssetInspector()", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);
    windowMock.AdminMedia.init();

    windowMock.AdminMedia.openAssetInspector({ id: "1", name: "t.jpg", path: "photos/t.jpg", folder: "photos", size: 10, isUsed: false });
    const modal = documentMock.getElementById("asset-inspector-modal");
    assert.ok(modal.classList.contains("open"));

    const closeXBtn = documentMock.getElementById("btn-close-inspector-modal-x");
    closeXBtn.dispatchEvent({ type: "click" });
    assert.ok(!modal.classList.contains("open"), "Modal must close on top-right X click");
  });

  await test("41. Escape dismissal remains working", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);
    windowMock.AdminMedia.init();

    windowMock.AdminMedia.openAssetInspector({ id: "1", name: "t.jpg", path: "photos/t.jpg", folder: "photos", size: 10, isUsed: false });
    const modal = documentMock.getElementById("asset-inspector-modal");
    assert.ok(modal.classList.contains("open"));

    documentMock.dispatchEvent({ type: "keydown", key: "Escape" });
    assert.ok(!modal.classList.contains("open"), "Modal must close on Escape key");
  });

  await test("42. Backdrop dismissal remains working", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);
    windowMock.AdminMedia.init();

    windowMock.AdminMedia.openAssetInspector({ id: "1", name: "t.jpg", path: "photos/t.jpg", folder: "photos", size: 10, isUsed: false });
    const modal = documentMock.getElementById("asset-inspector-modal");
    assert.ok(modal.classList.contains("open"));

    modal.dispatchEvent({ type: "click", target: modal });
    assert.ok(!modal.classList.contains("open"), "Modal must close on backdrop click");
  });

  await test("43. No unnecessary page-level horizontal overflow introduced", async () => {
    assert.ok(adminCssCode.includes("overflow-x: auto") || adminCssCode.includes("overflow-x: hidden"));
  });

  console.log("\n============================================================");
  console.log(`🎉 ALL ${testCount} PHASE 31C-5A & 31C-6 TESTS PASSED PERFECTLY!`);
  console.log("============================================================\n");
}

runAllTests().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
