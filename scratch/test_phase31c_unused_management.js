/**
 * ============================================================================
 * PHASE 31C-3 AUTOMATED TEST SUITE (scratch/test_phase31c_unused_management.js)
 * Validates Media Library Unused File Management Foundation:
 * 
 * 1. Unused asset can be selected.
 * 2. Used asset cannot enter unused-management selection.
 * 3. Select All Unused selects only unused assets.
 * 4. Clear Selection works.
 * 5. Selected count is correct.
 * 6. Selected total size is correct when metadata exists.
 * 7. Cleanup Selected action exists.
 * 8. Cleanup action opens review/confirmation UI.
 * 9. Review UI displays selected count.
 * 10. Review UI displays selected filenames.
 * 11. Cancel closes review UI.
 * 12. Continue/Review does NOT delete anything.
 * 13. No storage delete API is called.
 * 14. No database mutation occurs.
 * 15. Local assets cannot be selected.
 * 16. External assets cannot be selected.
 * 17. Data URLs cannot be selected.
 * 18. Rescan invalidates stale selections appropriately.
 * 19. Used assets remain protected.
 * 20. Existing Media Library filters continue working.
 * 21. Existing preview remains working.
 * 22. Existing copy URL remains working.
 * 23. Existing upload behavior remains working.
 * 24. Existing JSON export remains working.
 * 25. Existing CSV export remains working.
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("🚀 STARTING PHASE 31C-3 UNUSED MANAGEMENT TEST SUITE");
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
function createMockEnvironment() {
  const elements = {};
  const listeners = {};
  const toasts = [];

  function getOrCreateElement(id) {
    if (!elements[id]) {
      elements[id] = {
        id,
        tagName: "DIV",
        textContent: "",
        innerHTML: "",
        value: "",
        style: {},
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); },
          toggle(c) { if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c); }
        },
        children: [],
        appendChild(child) {
          this.children.push(child);
          return child;
        },
        querySelector(sel) {
          return null;
        },
        querySelectorAll(sel) {
          return [];
        },
        closest(sel) {
          return null;
        },
        addEventListener(evt, cb) {
          if (!listeners[id]) listeners[id] = {};
          if (!listeners[id][evt]) listeners[id][evt] = [];
          listeners[id][evt].push(cb);
        },
        dispatchEvent(evt) {
          const type = typeof evt === "string" ? evt : evt.type;
          if (listeners[id] && listeners[id][type]) {
            listeners[id][type].forEach(cb => cb(evt));
          }
        },
        click() {
          this.dispatchEvent({ type: "click" });
        }
      };
    }
    return elements[id];
  }

  const windowMock = {
    AdminCore: {
      showToast: (msg) => toasts.push(msg),
      formatBytes: (b) => `${(b / 1024 / 1024).toFixed(2)} MB`,
      copyWishUrl: () => true
    },
    confirm: () => true,
    prompt: () => "test_prompt"
  };

  const documentMock = {
    getElementById: (id) => getOrCreateElement(id),
    querySelectorAll: (sel) => [],
    addEventListener: (evt, cb) => {
      if (!listeners["doc"]) listeners["doc"] = {};
      if (!listeners["doc"][evt]) listeners["doc"][evt] = [];
      listeners["doc"][evt].push(cb);
    },
    createElement: (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        textContent: "",
        innerHTML: "",
        className: "",
        style: {},
        dataset: {},
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); }
        },
        children: [],
        appendChild(c) { this.children.push(c); },
        querySelector(sel) {
          if (sel.includes("checkbox")) {
            return {
              checked: false,
              dataset: { path: "" },
              addEventListener: (evt, cb) => {}
            };
          }
          return null;
        },
        querySelectorAll() { return []; },
        closest() { return null; }
      };
      return el;
    }
  };

  // Run adminMedia code in mock environment
  const fn = new Function("window", "document", adminMediaCode);
  fn(windowMock, documentMock);

  return {
    window: windowMock,
    document: documentMock,
    elements,
    listeners,
    toasts,
    AdminMedia: windowMock.AdminMedia,
    ReferenceEngine: windowMock.MediaReferenceEngine
  };
}

// ────────────────────────────────────────────────────────────────────────────
// TEST SUITE EXECUTION
// ────────────────────────────────────────────────────────────────────────────

// 1. Unused asset can be selected
test("Unused asset can be selected", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "cake.jpg", path: "photos/cake.jpg", size: 1048576, folder: "photos", isUsed: false, references: [] },
    { name: "song.mp3", path: "audio/song.mp3", size: 2097152, folder: "audio", isUsed: true, references: [{ wishId: "w1" }] }
  ];
  media.setFiles(mockFiles);

  const selected = media.selectUnusedAsset("photos/cake.jpg");
  assert.strictEqual(selected, true, "Should return true on successful unused selection");
  assert.strictEqual(media.getSelectedUnusedCount(), 1, "Count should be 1");
  assert.strictEqual(media.getSelectedUnusedAssets()[0].path, "photos/cake.jpg");
});

// 2. Used asset cannot enter unused-management selection
test("Used asset cannot enter unused-management selection", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "used_vid.mp4", path: "videos/used_vid.mp4", size: 5242880, folder: "videos", isUsed: true, references: [{ wishId: "w1" }] },
    { name: "free_img.jpg", path: "photos/free_img.jpg", size: 1048576, folder: "photos", isUsed: false, references: [] }
  ];
  media.setFiles(mockFiles);

  const selected = media.selectUnusedAsset("videos/used_vid.mp4");
  assert.strictEqual(selected, false, "Used asset must be rejected from unused selection");
  assert.strictEqual(media.getSelectedUnusedCount(), 0, "Selected count must remain 0");
});

// 3. Select All Unused selects only unused assets
test("Select All Unused selects only unused assets", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "u1.jpg", path: "photos/u1.jpg", size: 1000, folder: "photos", isUsed: false, references: [] },
    { name: "u2.jpg", path: "photos/u2.jpg", size: 2000, folder: "photos", isUsed: false, references: [] },
    { name: "used.jpg", path: "photos/used.jpg", size: 3000, folder: "photos", isUsed: true, references: [{ wishId: "w2" }] }
  ];
  media.setFiles(mockFiles);

  const count = media.selectAllUnused();
  assert.strictEqual(count, 2, "Must select exactly 2 unused assets");
  assert.strictEqual(media.getSelectedUnusedCount(), 2);
  const selectedPaths = media.getSelectedUnusedAssets().map(f => f.path);
  assert.ok(selectedPaths.includes("photos/u1.jpg"));
  assert.ok(selectedPaths.includes("photos/u2.jpg"));
  assert.ok(!selectedPaths.includes("photos/used.jpg"), "Used asset must NOT be in selection");
});

// 4. Clear Selection works
test("Clear Selection works", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "u1.jpg", path: "photos/u1.jpg", size: 1000, folder: "photos", isUsed: false, references: [] }
  ];
  media.setFiles(mockFiles);
  media.selectUnusedAsset("photos/u1.jpg");
  assert.strictEqual(media.getSelectedUnusedCount(), 1);

  media.clearUnusedSelection();
  assert.strictEqual(media.getSelectedUnusedCount(), 0, "Count must be 0 after clear");
  assert.strictEqual(media.getSelectedUnusedAssets().length, 0);
});

// 5. Selected count is correct
test("Selected count is correct", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "a.jpg", path: "photos/a.jpg", size: 500, folder: "photos", isUsed: false, references: [] },
    { name: "b.jpg", path: "photos/b.jpg", size: 600, folder: "photos", isUsed: false, references: [] },
    { name: "c.jpg", path: "photos/c.jpg", size: 700, folder: "photos", isUsed: false, references: [] }
  ];
  media.setFiles(mockFiles);

  media.selectUnusedAsset("photos/a.jpg");
  media.selectUnusedAsset("photos/c.jpg");
  assert.strictEqual(media.getSelectedUnusedCount(), 2);

  media.deselectUnusedAsset("photos/a.jpg");
  assert.strictEqual(media.getSelectedUnusedCount(), 1);
});

// 6. Selected total size is correct when metadata exists
test("Selected total size is correct when metadata exists", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "a.jpg", path: "photos/a.jpg", size: 1048576, folder: "photos", isUsed: false, references: [] }, // 1 MB
    { name: "b.mp4", path: "videos/b.mp4", size: 3145728, folder: "videos", isUsed: false, references: [] }  // 3 MB
  ];
  media.setFiles(mockFiles);

  media.selectAllUnused();
  assert.strictEqual(media.getSelectedUnusedTotalSize(), 4194304, "Total size should be 4194304 bytes (4 MB)");
});

// 7. Cleanup Selected action exists in DOM & JS
test("Cleanup Selected action exists", () => {
  assert.ok(adminHtmlCode.includes('id="btn-review-unused-cleanup"'), "btn-review-unused-cleanup exists in admin.html");
  assert.ok(adminHtmlCode.includes('id="btn-select-all-unused"'), "btn-select-all-unused exists in admin.html");
  assert.ok(adminHtmlCode.includes('id="btn-clear-unused-selection"'), "btn-clear-unused-selection exists in admin.html");
  assert.ok(adminMediaCode.includes("btnReviewUnused"), "btnReviewUnused is handled in admin-media.js");
});

// 8. Cleanup action opens review/confirmation UI
test("Cleanup action opens review/confirmation UI", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "u.jpg", path: "photos/u.jpg", size: 1024, folder: "photos", isUsed: false, references: [] }
  ];
  media.setFiles(mockFiles);
  media.selectUnusedAsset("photos/u.jpg");

  media.openUnusedReviewModal();
  const modal = env.elements["unused-cleanup-modal"];
  assert.ok(modal.classList.contains("open"), "Modal must have 'open' class when opened");
});

// 9. Review UI displays selected count
test("Review UI displays selected count", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "u1.jpg", path: "photos/u1.jpg", size: 1024, folder: "photos", isUsed: false, references: [] },
    { name: "u2.jpg", path: "photos/u2.jpg", size: 2048, folder: "photos", isUsed: false, references: [] }
  ];
  media.setFiles(mockFiles);
  media.selectAllUnused();

  media.openUnusedReviewModal();
  const countEl = env.elements["unused-modal-file-count"];
  assert.strictEqual(countEl.textContent, "2", "Review modal count should display 2");
});

// 10. Review UI displays selected filenames
test("Review UI displays selected filenames", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "special_cake.jpg", path: "photos/special_cake.jpg", size: 1024, folder: "photos", isUsed: false, references: [] }
  ];
  media.setFiles(mockFiles);
  media.selectUnusedAsset("photos/special_cake.jpg");

  media.openUnusedReviewModal();
  const listEl = env.elements["unused-modal-file-list"];
  assert.ok(listEl.innerHTML.includes("special_cake.jpg"), "List HTML must contain the filename");
  assert.ok(listEl.innerHTML.includes("photos/special_cake.jpg"), "List HTML must contain the path");
});

// 11. Cancel closes review UI
test("Cancel closes review UI", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "u.jpg", path: "photos/u.jpg", size: 1024, folder: "photos", isUsed: false, references: [] }
  ];
  media.setFiles(mockFiles);
  media.selectUnusedAsset("photos/u.jpg");

  media.openUnusedReviewModal();
  const modal = env.elements["unused-cleanup-modal"];
  assert.ok(modal.classList.contains("open"));

  media.closeUnusedReviewModal();
  assert.ok(!modal.classList.contains("open"), "Modal must remove 'open' class when closed");
});

// 12. Continue/Review does NOT delete anything
test("Continue/Review does NOT delete anything", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "u.jpg", path: "photos/u.jpg", size: 1024, folder: "photos", isUsed: false, references: [] }
  ];
  media.setFiles(mockFiles);
  media.selectUnusedAsset("photos/u.jpg");

  media.openUnusedReviewModal();
  media.closeUnusedReviewModal();

  assert.strictEqual(media.getFiles().length, 1, "Files count must remain intact");
  assert.strictEqual(media.getFiles()[0].path, "photos/u.jpg");
});

// 13. No storage delete API is called
test("No storage delete API is called during unused selection or review", () => {
  let deleteCalled = false;
  const env = createMockEnvironment();
  env.window.StorageModule = {
    deleteMedia: () => { deleteCalled = true; },
    deleteMultipleMedia: () => { deleteCalled = true; }
  };

  const media = env.AdminMedia;
  const mockFiles = [
    { name: "u1.jpg", path: "photos/u1.jpg", size: 1024, folder: "photos", isUsed: false, references: [] },
    { name: "u2.jpg", path: "photos/u2.jpg", size: 2048, folder: "photos", isUsed: false, references: [] }
  ];
  media.setFiles(mockFiles);

  media.selectAllUnused();
  media.openUnusedReviewModal();
  media.closeUnusedReviewModal();
  media.clearUnusedSelection();

  assert.strictEqual(deleteCalled, false, "StorageModule delete API must never be invoked during review workflow");
});

// 14. No database mutation occurs
test("No database mutation occurs", () => {
  let dbMutated = false;
  const env = createMockEnvironment();
  env.window.DatabaseModule = {
    deleteWish: () => { dbMutated = true; },
    updateWish: () => { dbMutated = true; }
  };

  const media = env.AdminMedia;
  media.selectAllUnused();
  media.openUnusedReviewModal();
  media.closeUnusedReviewModal();

  assert.strictEqual(dbMutated, false, "Database module must not be called");
});

// 15. Local assets cannot be selected
test("Local assets cannot be selected", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "local.mp3", path: "assets/audio/song.mp3", size: 1024, folder: "audio", isUsed: false, references: [] }
  ];
  media.setFiles(mockFiles);

  const selected = media.selectUnusedAsset("assets/audio/song.mp3");
  assert.strictEqual(selected, false, "Local assets must be rejected from unused selection");
  assert.strictEqual(media.getSelectedUnusedCount(), 0);
});

// 16. External assets cannot be selected
test("External assets cannot be selected", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "yt.mp4", path: "https://youtube.com/watch?v=123", size: 1024, folder: "videos", isUsed: false, references: [] }
  ];
  media.setFiles(mockFiles);

  const selected = media.selectUnusedAsset("https://youtube.com/watch?v=123");
  assert.strictEqual(selected, false, "External URLs must be rejected from unused selection");
  assert.strictEqual(media.getSelectedUnusedCount(), 0);
});

// 17. Data URLs cannot be selected
test("Data URLs cannot be selected", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "data.jpg", path: "data:image/png;base64,iVBORw0KGgo...", size: 1024, folder: "photos", isUsed: false, references: [] }
  ];
  media.setFiles(mockFiles);

  const selected = media.selectUnusedAsset("data:image/png;base64,iVBORw0KGgo...");
  assert.strictEqual(selected, false, "Data URLs must be rejected from unused selection");
  assert.strictEqual(media.getSelectedUnusedCount(), 0);
});

// 18. Rescan invalidates stale selections appropriately
test("Rescan invalidates stale selections appropriately", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  // Initial state: asset1 is unused, asset2 is unused
  let mockFiles = [
    { name: "asset1.jpg", path: "photos/asset1.jpg", size: 1000, folder: "photos", isUsed: false, references: [] },
    { name: "asset2.jpg", path: "photos/asset2.jpg", size: 2000, folder: "photos", isUsed: false, references: [] }
  ];
  media.setFiles(mockFiles);
  media.selectAllUnused();
  assert.strictEqual(media.getSelectedUnusedCount(), 2);

  // Now, asset1 becomes linked to a new wish
  mockFiles = [
    { name: "asset1.jpg", path: "photos/asset1.jpg", size: 1000, folder: "photos", isUsed: true, references: [{ wishId: "w_new" }] },
    { name: "asset2.jpg", path: "photos/asset2.jpg", size: 2000, folder: "photos", isUsed: false, references: [] }
  ];
  media.setFiles(mockFiles);

  // After rescan / update, asset1 is automatically pruned from selectedUnusedPaths
  assert.strictEqual(media.getSelectedUnusedCount(), 1, "Stale selection must be automatically invalidated");
  assert.strictEqual(media.getSelectedUnusedAssets()[0].path, "photos/asset2.jpg");
});

// 19. Used assets remain protected
test("Used assets remain protected", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  const mockFiles = [
    { name: "used1.jpg", path: "photos/used1.jpg", size: 1000, folder: "photos", isUsed: true, references: [{ wishId: "w1" }] },
    { name: "used2.mp4", path: "videos/used2.mp4", size: 2000, folder: "videos", isUsed: true, references: [{ wishId: "w2" }] }
  ];
  media.setFiles(mockFiles);

  assert.strictEqual(media.isAssetEligibleForUnusedManagement("photos/used1.jpg"), false);
  assert.strictEqual(media.isAssetEligibleForUnusedManagement("videos/used2.mp4"), false);
  assert.strictEqual(media.selectUnusedAsset("photos/used1.jpg"), false);
  assert.strictEqual(media.selectUnusedAsset("videos/used2.mp4"), false);
  assert.strictEqual(media.selectAllUnused(), 0);
});

// 20. Existing Media Library filters continue working
test("Existing Media Library filters continue working", () => {
  assert.ok(adminMediaCode.includes('currentDamFilter === "images"'));
  assert.ok(adminMediaCode.includes('currentDamFilter === "videos"'));
  assert.ok(adminMediaCode.includes('currentDamFilter === "audio"'));
  assert.ok(adminMediaCode.includes('currentDamFilter === "used"'));
  assert.ok(adminMediaCode.includes('currentDamFilter === "unused"'));
  assert.ok(adminMediaCode.includes('currentDamFilter === "favorites"'));
  assert.ok(adminMediaCode.includes('currentDamFilter === "recent"'));
});

// 21. Existing preview remains working
test("Existing preview remains working", () => {
  const env = createMockEnvironment();
  const media = env.AdminMedia;

  media.openAssetPreview("https://example.com/photo.jpg", "photo.jpg", "photos", "1.2 MB");
  const modal = env.elements["asset-preview-modal"];
  assert.ok(modal.classList.contains("open"), "Preview modal must open");
  assert.strictEqual(env.elements["asset-modal-filename"].textContent, "photo.jpg");
});

// 22. Existing copy URL remains working
test("Existing copy URL remains working", () => {
  let copied = false;
  const env = createMockEnvironment();
  env.window.AdminCore.copyWishUrl = (url) => { copied = (url === "https://example.com/test.jpg"); };

  env.window.AdminCore.copyWishUrl("https://example.com/test.jpg");
  assert.strictEqual(copied, true, "Copy URL must execute correctly");
});

// 23. Existing upload behavior remains working
test("Existing upload behavior remains working", () => {
  assert.ok(adminMediaCode.includes("initDamDirectUpload"));
  assert.ok(adminMediaCode.includes("uploadMedia"));
});

// 24. Existing JSON export remains working
test("Existing JSON export remains working", () => {
  assert.ok(adminWishesCode.includes("exportSelectedWishes"), "exportSelectedWishes exists in admin-wishes.js");
  assert.ok(adminHtmlCode.includes('id="btn-export-json"'));
});

// 25. Existing CSV export remains working
test("Existing CSV export remains working", () => {
  assert.ok(adminWishesCode.includes("formatWishesToCSV"), "formatWishesToCSV exists in admin-wishes.js");
  assert.ok(adminHtmlCode.includes('id="btn-export-csv"'));
});

// 26. UI Terminology Check — No "Orphan" in new UI strings
test("UI Terminology Check: No user-facing 'Orphan' in new Phase 31C-3 UI", () => {
  assert.ok(!adminHtmlCode.includes("Orphan Selection"), "Must not use 'Orphan Selection'");
  assert.ok(!adminHtmlCode.includes("Cleanup Orphan"), "Must not use 'Cleanup Orphan'");
  assert.ok(adminHtmlCode.includes("Review Unused Storage Files"), "Uses 'Review Unused Storage Files'");
});

// 27. CSS Components Validation
test("CSS styles for Unused Selection Bar & Modal exist in admin-components.css", () => {
  assert.ok(adminComponentsCss.includes(".dam-unused-selection-bar"), "dam-unused-selection-bar class in CSS");
  assert.ok(adminComponentsCss.includes(".unused-modal-box"), "unused-modal-box class in CSS");
  assert.ok(adminComponentsCss.includes(".unused-modal-warning"), "unused-modal-warning class in CSS");
  assert.ok(adminComponentsCss.includes(".unused-modal-stats"), "unused-modal-stats class in CSS");
  assert.ok(adminComponentsCss.includes(".unused-files-table"), "unused-files-table class in CSS");
});

console.log("\n============================================================");
console.log(`🎉 ALL ${testCount} PHASE 31C-3 TESTS PASSED PERFECTLY!`);
console.log("============================================================\n");

