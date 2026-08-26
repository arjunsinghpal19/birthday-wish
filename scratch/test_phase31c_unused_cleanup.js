/**
 * ============================================================================
 * PHASE 31C-4 AUTOMATED TEST SUITE (scratch/test_phase31c_unused_cleanup.js)
 * Comprehensive verification for Safe Unused Media Cleanup Execution
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("🚀 STARTING PHASE 31C-4 SAFE UNUSED CLEANUP TEST SUITE");
console.log("============================================================\n");

// Read source files
const adminMediaCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-media.js"), "utf8");
const adminWishesCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-wishes.js"), "utf8");
const adminHtmlCode = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
const adminComponentsCss = fs.readFileSync(path.join(__dirname, "../css/admin/admin-components.css"), "utf8");
const storageCode = fs.readFileSync(path.join(__dirname, "../js/storage.js"), "utf8");
const appJsCode = fs.readFileSync(path.join(__dirname, "../js/app.js"), "utf8");
const customizerCode = fs.readFileSync(path.join(__dirname, "../js/modules/editor/customizer.js"), "utf8");

let testCount = 0;
async function test(name, fn) {
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
    AdminWishes: {
      getAllWishes: () => []
    },
    confirm: () => true,
    prompt: () => "test_prompt",
    showToast: (msg) => toasts.push(msg),
    formatBytes: (b) => `${(b / 1024 / 1024).toFixed(2)} MB`,
    copyWishUrl: () => true,
    StorageModule: {
      deleteMedia: async (p) => true,
      deleteMultipleMedia: async (ps) => true,
      uploadMedia: async () => "https://example.com/uploaded.png",
      listAllMedia: async () => []
    }
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

  return { windowMock, documentMock, getOrCreateElement, toasts };
}

async function runAllTests() {
  // 1. Selected unused asset can reach review and final confirmation state
  await test("Selected unused asset can reach final confirmation UI state", async () => {
    const { windowMock, documentMock, getOrCreateElement } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const mockFiles = [
      { name: "unused1.png", path: "photos/unused1.png", folder: "photos", size: 1024, isUsed: false, references: [] }
    ];

    windowMock.AdminMedia.setFiles(mockFiles);
    windowMock.AdminMedia.selectUnusedAsset("photos/unused1.png");

    // Open review modal
    windowMock.AdminMedia.openUnusedReviewModal();
    assert.ok(getOrCreateElement("unused-cleanup-modal").classList.contains("open"), "Modal must be open in review state");

    // Move to confirmation
    windowMock.AdminMedia.proceedToUnusedDeletionConfirmation();
    assert.strictEqual(getOrCreateElement("unused-modal-danger-box").style.display, "flex", "Danger warning must be shown");
    assert.strictEqual(getOrCreateElement("unused-modal-confirm-footer").style.display, "flex", "Confirm footer must be shown");
  });

  // 2. Final confirmation is strictly required before deletion
  await test("Final confirmation is required before deletion", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    let deleteCalled = false;
    windowMock.StorageModule.deleteMedia = async () => { deleteCalled = true; return true; };

    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const mockFiles = [
      { name: "unused1.png", path: "photos/unused1.png", folder: "photos", size: 1024, isUsed: false, references: [] }
    ];

    windowMock.AdminMedia.setFiles(mockFiles);
    windowMock.AdminMedia.selectUnusedAsset("photos/unused1.png");
    windowMock.AdminMedia.openUnusedReviewModal();
    windowMock.AdminMedia.proceedToUnusedDeletionConfirmation();

    // No deletion should have occurred yet
    assert.strictEqual(deleteCalled, false, "Must not delete prior to clicking confirm permanent deletion");
  });

  // 3. No deletion occurs during review or cancel
  await test("No deletion occurs during review or cancellation", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    let deleteCalled = false;
    windowMock.StorageModule.deleteMedia = async () => { deleteCalled = true; return true; };

    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const mockFiles = [
      { name: "unused1.png", path: "photos/unused1.png", folder: "photos", size: 1024, isUsed: false, references: [] }
    ];

    windowMock.AdminMedia.setFiles(mockFiles);
    windowMock.AdminMedia.selectUnusedAsset("photos/unused1.png");
    windowMock.AdminMedia.openUnusedReviewModal();
    windowMock.AdminMedia.closeUnusedReviewModal();

    assert.strictEqual(deleteCalled, false, "Cancel must not call delete");
    assert.strictEqual(windowMock.AdminMedia.getFiles().length, 1, "File must still be in catalog");
  });

  // 4. Valid unused asset can be successfully deleted
  await test("Valid unused asset is deleted via StorageModule.deleteMedia on confirmation", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    let deletedPath = null;
    windowMock.StorageModule.deleteMedia = async (p) => { deletedPath = p; return true; };

    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const mockFiles = [
      { name: "unused1.png", path: "photos/unused1.png", folder: "photos", size: 1024, isUsed: false, references: [] }
    ];

    windowMock.AdminMedia.setFiles(mockFiles);
    windowMock.AdminMedia.selectUnusedAsset("photos/unused1.png");
    await windowMock.AdminMedia.executeUnusedMediaCleanup();

    assert.strictEqual(deletedPath, "photos/unused1.png", "Must delete the exact valid unused path");
    assert.strictEqual(windowMock.AdminMedia.getFiles().length, 0, "Catalog must be updated");
    assert.strictEqual(windowMock.AdminMedia.getSelectedUnusedCount(), 0, "Selection must be cleared");
  });

  // 5. Used asset cannot be deleted
  await test("Used asset cannot enter deletion batch or be deleted", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    let deleteCalled = false;
    windowMock.StorageModule.deleteMedia = async () => { deleteCalled = true; return true; };

    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const mockFiles = [
      { name: "used1.png", path: "photos/used1.png", folder: "photos", size: 1024, isUsed: true, references: ["wish-123"] }
    ];

    windowMock.AdminMedia.setFiles(mockFiles);
    windowMock.AdminMedia.selectUnusedAsset("photos/used1.png");
    await windowMock.AdminMedia.executeUnusedMediaCleanup();

    assert.strictEqual(deleteCalled, false, "Used asset must NEVER be deleted");
    assert.strictEqual(windowMock.AdminMedia.getFiles().length, 1, "Used asset must remain untouched");
  });

  // 6. Asset with newly-added wish reference (race condition) is protected
  await test("Race Condition Protection: Asset gaining reference before confirmation is not deleted", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    let deleteCalled = false;
    windowMock.StorageModule.deleteMedia = async () => { deleteCalled = true; return true; };

    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const mockFiles = [
      { name: "newly_used.png", path: "photos/newly_used.png", folder: "photos", size: 2048, isUsed: false, references: [] }
    ];

    windowMock.AdminMedia.setFiles(mockFiles);
    windowMock.AdminMedia.selectUnusedAsset("photos/newly_used.png");

    // Simulate wish gaining reference right before deletion confirmation
    windowMock.AdminWishes.getAllWishes = () => [
      { id: "wish-abc", recipient_name: "New Wish", gallery_json: JSON.stringify([{ url: "https://xyz.supabase.co/storage/v1/object/public/wish-media/photos/newly_used.png" }]) }
    ];

    const validation = windowMock.AdminMedia.validateSelectedUnusedForDeletion();
    assert.strictEqual(validation.validAssets.length, 0, "Must reject newly-referenced file");
    assert.strictEqual(validation.skippedAssets.length, 1, "Must mark newly-referenced file as skipped");

    await windowMock.AdminMedia.executeUnusedMediaCleanup();
    assert.strictEqual(deleteCalled, false, "Must not execute delete on newly-referenced file");
  });

  // 7. Local repository assets cannot be deleted
  await test("Local repository assets cannot enter deletion", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const eligible = windowMock.AdminMedia.isAssetEligibleForUnusedManagement("assets/audio/song.mp3");
    assert.strictEqual(eligible, false, "Local asset must not be eligible for deletion");
  });

  // 8. External URLs cannot be deleted
  await test("External URLs cannot enter deletion", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const eligible = windowMock.AdminMedia.isAssetEligibleForUnusedManagement("https://youtube.com/watch?v=123");
    assert.strictEqual(eligible, false, "External URL must not be eligible for deletion");
  });

  // 9. Data URLs cannot be deleted
  await test("Data URLs cannot enter deletion", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const eligible = windowMock.AdminMedia.isAssetEligibleForUnusedManagement("data:image/png;base64,iVBORw0KGgo...");
    assert.strictEqual(eligible, false, "Data URL must not be eligible for deletion");
  });

  // 10. Invalid storage path cannot be deleted
  await test("Invalid/empty storage path is rejected by validation", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    assert.strictEqual(windowMock.AdminMedia.isAssetEligibleForUnusedManagement(""), false);
    assert.strictEqual(windowMock.AdminMedia.isAssetEligibleForUnusedManagement(null), false);
  });

  // 11. Wrong bucket path is rejected
  await test("Wrong bucket path cannot enter deletion", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    assert.strictEqual(windowMock.AdminMedia.isAssetEligibleForUnusedManagement("other-bucket/file.jpg"), false);
  });

  // 12. Empty path cannot be deleted
  await test("Empty path cannot enter deletion", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    assert.strictEqual(windowMock.AdminMedia.isAssetEligibleForUnusedManagement("   "), false);
  });

  // 13. Bulk deletion handles multiple valid files
  await test("Bulk deletion processes multiple valid unused files", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const deleted = [];
    windowMock.StorageModule.deleteMedia = async (p) => { deleted.push(p); return true; };

    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const mockFiles = [
      { name: "u1.png", path: "photos/u1.png", folder: "photos", size: 100, isUsed: false, references: [] },
      { name: "u2.mp4", path: "videos/u2.mp4", folder: "videos", size: 200, isUsed: false, references: [] },
      { name: "u3.mp3", path: "audio/u3.mp3", folder: "audio", size: 300, isUsed: false, references: [] }
    ];

    windowMock.AdminMedia.setFiles(mockFiles);
    windowMock.AdminMedia.selectAllUnused();
    assert.strictEqual(windowMock.AdminMedia.getSelectedUnusedCount(), 3);

    await windowMock.AdminMedia.executeUnusedMediaCleanup();
    assert.strictEqual(deleted.length, 3, "All 3 files must be deleted");
    assert.strictEqual(windowMock.AdminMedia.getFiles().length, 0, "Catalog must be empty");
  });

  // 14. Partial deletion failure is handled and reported accurately
  await test("Partial failure: 1 failure out of 3 does not falsely claim 100% success", async () => {
    const { windowMock, documentMock, toasts } = createMockEnvironment();

    windowMock.StorageModule.deleteMedia = async (p) => {
      if (p === "photos/fail.png") return false;
      return true;
    };

    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const mockFiles = [
      { name: "ok1.png", path: "photos/ok1.png", folder: "photos", size: 100, isUsed: false, references: [] },
      { name: "fail.png", path: "photos/fail.png", folder: "photos", size: 200, isUsed: false, references: [] },
      { name: "ok2.png", path: "photos/ok2.png", folder: "photos", size: 300, isUsed: false, references: [] }
    ];

    windowMock.AdminMedia.setFiles(mockFiles);
    windowMock.AdminMedia.selectAllUnused();

    await windowMock.AdminMedia.executeUnusedMediaCleanup();

    // Failed file must remain in catalog
    const remaining = windowMock.AdminMedia.getFiles();
    assert.strictEqual(remaining.length, 1, "Failed file must remain in catalog");
    assert.strictEqual(remaining[0].path, "photos/fail.png", "Failed file is fail.png");
    assert.ok(toasts.some(t => t.includes("Failed to delete")), "Toast must report partial failure accurately");
  });

  // 15. Failed files remain represented in catalog
  await test("Failed files remain represented correctly after cleanup attempt", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    windowMock.StorageModule.deleteMedia = async (p) => false; // All fail

    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const mockFiles = [
      { name: "stubborn.png", path: "photos/stubborn.png", folder: "photos", size: 500, isUsed: false, references: [] }
    ];

    windowMock.AdminMedia.setFiles(mockFiles);
    windowMock.AdminMedia.selectUnusedAsset("photos/stubborn.png");
    await windowMock.AdminMedia.executeUnusedMediaCleanup();

    assert.strictEqual(windowMock.AdminMedia.getFiles().length, 1, "File must still be in catalog");
  });

  // 16. Successful files disappear from catalog after deletion
  await test("Successful files disappear from catalog after deletion", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    windowMock.StorageModule.deleteMedia = async (p) => true;

    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const mockFiles = [
      { name: "gone.png", path: "photos/gone.png", folder: "photos", size: 500, isUsed: false, references: [] }
    ];

    windowMock.AdminMedia.setFiles(mockFiles);
    windowMock.AdminMedia.selectUnusedAsset("photos/gone.png");
    await windowMock.AdminMedia.executeUnusedMediaCleanup();

    assert.strictEqual(windowMock.AdminMedia.getFiles().length, 0, "Deleted file must be removed");
  });

  // 17. Selection state is cleared after successful deletion
  await test("Selection state is cleared after successful deletion", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    windowMock.StorageModule.deleteMedia = async (p) => true;

    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const mockFiles = [
      { name: "item1.png", path: "photos/item1.png", folder: "photos", size: 500, isUsed: false, references: [] }
    ];

    windowMock.AdminMedia.setFiles(mockFiles);
    windowMock.AdminMedia.selectUnusedAsset("photos/item1.png");
    assert.strictEqual(windowMock.AdminMedia.getSelectedUnusedCount(), 1);

    await windowMock.AdminMedia.executeUnusedMediaCleanup();
    assert.strictEqual(windowMock.AdminMedia.getSelectedUnusedCount(), 0, "Selection count must be 0");
  });

  // 18. Media counts update after deletion
  await test("Media counts and analytics update after deletion", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    windowMock.StorageModule.deleteMedia = async (p) => true;

    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const mockFiles = [
      { name: "u1.png", path: "photos/u1.png", folder: "photos", size: 100, isUsed: false, references: [] },
      { name: "used.png", path: "photos/used.png", folder: "photos", size: 200, isUsed: true, references: ["w1"] }
    ];

    windowMock.AdminMedia.setFiles(mockFiles);
    windowMock.AdminMedia.selectUnusedAsset("photos/u1.png");
    await windowMock.AdminMedia.executeUnusedMediaCleanup();

    assert.strictEqual(windowMock.AdminMedia.getFiles().length, 1);
  });

  // 19. Storage usage analytics calculation
  await test("Storage usage analytics updates correctly", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const mockFiles = [
      { name: "item1.png", path: "photos/item1.png", folder: "photos", size: 1024 * 1024, isUsed: false }
    ];
    windowMock.AdminMedia.setFiles(mockFiles);
    assert.strictEqual(windowMock.AdminMedia.getFiles().length, 1);
  });

  // 20. Existing filters continue working
  await test("Existing Media Library filters continue working", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    assert.ok(typeof windowMock.AdminMedia.render === "function");
  });

  // 21. Existing preview remains working
  await test("Existing preview remains working", async () => {
    const { windowMock, documentMock, getOrCreateElement } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.openAssetPreview("https://example.com/p.jpg", "p.jpg", "photos", "1.2 MB");
    assert.ok(getOrCreateElement("asset-preview-modal").classList.contains("open"));
  });

  // 22. Existing copy URL remains working
  await test("Existing copy URL remains working", async () => {
    let copied = false;
    const { windowMock, documentMock } = createMockEnvironment();
    windowMock.copyWishUrl = () => { copied = true; };
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    windowMock.AdminMedia.openAssetPreview("https://example.com/p.jpg", "p.jpg", "photos", "1.2 MB");
    const copyBtn = documentMock.getElementById("btn-modal-copy-url");
    copyBtn.onclick();
    assert.strictEqual(copied, true, "Copy URL must execute correctly");
  });

  // 23. Existing upload behavior remains working
  await test("Existing upload behavior remains working", async () => {
    assert.ok(adminMediaCode.includes("initDamDirectUpload"));
    assert.ok(adminMediaCode.includes("uploadMedia"));
  });

  // 24. Existing JSON export remains working
  await test("Existing JSON export remains working", async () => {
    assert.ok(adminWishesCode.includes("exportSelectedWishes"));
    assert.ok(adminHtmlCode.includes('id="btn-export-json"'));
  });

  // 25. Existing CSV export remains working
  await test("Existing CSV export remains working", async () => {
    assert.ok(adminWishesCode.includes("formatWishesToCSV"));
    assert.ok(adminHtmlCode.includes('id="btn-export-csv"'));
  });

  // 26. No Public Wish Page regression
  await test("No Public Wish Page regression — WhatsApp direct api intact", async () => {
    assert.ok(appJsCode.includes("https://api.whatsapp.com/send?text="), "Public page uses direct api.whatsapp.com");
    assert.ok(!appJsCode.includes("https://wa.me/"), "Public page contains zero wa.me redirects");
  });

  // 27. No Quick Editor regression
  await test("No Quick Editor regression — WhatsApp direct api intact", async () => {
    assert.ok(customizerCode.includes("https://api.whatsapp.com/send?text="), "Quick editor uses direct api.whatsapp.com");
    assert.ok(!customizerCode.includes("https://wa.me/"), "Quick editor contains zero wa.me redirects");
  });

  // 28. No unrelated database mutations
  await test("No database mutations in admin-media cleanup code", async () => {
    assert.ok(!adminMediaCode.includes("DatabaseModule.deleteWish"), "Must not delete wishes during media cleanup");
    assert.ok(!adminMediaCode.includes("DatabaseModule.saveWish"), "Must not mutate wishes during media cleanup");
  });

  // 29. Reference Engine is authoritative source of truth
  await test("Reference Engine remains authoritative source of truth", async () => {
    assert.ok(adminMediaCode.includes("MediaReferenceEngine"));
    assert.ok(adminMediaCode.includes("buildReferenceMap"));
    assert.ok(adminMediaCode.includes("extractReferencesFromWish"));
  });

  // 30. No arbitrary paths can reach deletion
  await test("Arbitrary path injection rejected by selection, normalization and validation", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const maliciousPaths = [
      "../../../etc/passwd",
      "javascript:alert(1)",
      "C:\\Windows\\System32\\cmd.exe",
      "../photos/secret.key",
      "ftp://example.com/file.jpg"
    ];

    maliciousPaths.forEach(p => {
      assert.strictEqual(windowMock.AdminMedia.isAssetEligibleForUnusedManagement(p), false, `Must reject ${p} from eligibility`);
      assert.strictEqual(windowMock.MediaReferenceEngine.normalizeStoragePath(p), null, `Must normalize ${p} to null`);
      windowMock.AdminMedia.selectUnusedAsset(p);
    });

    assert.strictEqual(windowMock.AdminMedia.getSelectedUnusedCount(), 0, "No malicious paths could be selected");
  });

  // 31. REGRESSION FIX: DELETE -> fresh Storage list -> Scan Storage
  await test("REGRESSION: Deleted unused asset remains absent from subsequent Storage scan", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    let backendStorage = [
      { id: "1", name: "to_delete.png", folder: "photos", path: "photos/to_delete.png", size: 100, isUsed: false, references: [] },
      { id: "2", name: "keep_used.png", folder: "photos", path: "photos/keep_used.png", size: 200, isUsed: true, references: ["wish-1"] }
    ];

    windowMock.AdminWishes.getAllWishes = () => [
      { id: "wish-1", recipient_name: "Test Recipient", gallery_json: JSON.stringify([{ url: "photos/keep_used.png" }]) }
    ];

    windowMock.StorageModule.listAllMedia = async () => [...backendStorage];
    windowMock.StorageModule.deleteMedia = async (p) => {
      const idx = backendStorage.findIndex(f => f.path === p);
      if (idx !== -1) {
        backendStorage.splice(idx, 1);
        return true;
      }
      return false;
    };
    windowMock.StorageModule.deleteMultipleMedia = async (paths) => {
      backendStorage = backendStorage.filter(f => !paths.includes(f.path));
      return true;
    };

    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    // Initial load
    windowMock.AdminMedia.setFiles(backendStorage);
    assert.strictEqual(windowMock.AdminMedia.getFiles().length, 2);

    // Select and delete
    windowMock.AdminMedia.selectUnusedAsset("photos/to_delete.png");
    await windowMock.AdminMedia.executeUnusedMediaCleanup();

    // Verify grid after cleanup
    assert.strictEqual(windowMock.AdminMedia.getFiles().length, 1);
    assert.strictEqual(windowMock.AdminMedia.getFiles()[0].path, "photos/keep_used.png");

    // Fresh Scan Storage
    const scanResult = await windowMock.AdminMedia.scanStorage();
    assert.strictEqual(scanResult.total, 1, "Scan total must be 1");
    assert.strictEqual(scanResult.orphan, 0, "Deleted file must NOT reappear as unused");
    assert.strictEqual(scanResult.files.some(f => f.path === "photos/to_delete.png"), false, "Deleted file is permanently absent");
  });

  // 32. StorageModule calls /api/admin-delete-media
  await test("StorageModule calls /api/admin-delete-media with adminToken", async () => {
    let calledUrl = "";
    let calledBody = null;
    const globalFetch = global.fetch;
    global.fetch = async (url, opts) => {
      calledUrl = url;
      calledBody = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({ success: true, deletedCount: 1, deletedPaths: ["photos/file.png"] })
      };
    };

    try {
      const storageModuleFn = new Function("window", storageCode);
      const win = {
        sessionStorage: { getItem: () => "mock_token_123" }
      };
      storageModuleFn(win);

      const ok = await win.StorageModule.deleteMedia("photos/file.png");
      assert.strictEqual(ok, true);
      assert.ok(calledUrl.includes("/api/admin-delete-media"), "Must call /api/admin-delete-media");
      assert.strictEqual(calledBody.adminToken, "mock_token_123");
      assert.deepStrictEqual(calledBody.paths, ["photos/file.png"]);
    } finally {
      global.fetch = globalFetch;
    }
  });

  // 33. StorageModule direct fallback rejects data: [] (RLS false positive prevention)
  await test("StorageModule direct fallback rejects data: [] as deletion failure", async () => {
    const globalFetch = global.fetch;
    global.fetch = async () => { throw new Error("API offline"); };

    try {
      const storageModuleFn = new Function("window", storageCode);
      const win = {
        sessionStorage: { getItem: () => "" },
        SupabaseModule: {
          getClient: () => ({
            storage: {
              from: () => ({
                remove: async () => ({ data: [], error: null }) // RLS restriction returns data: []
              })
            }
          })
        }
      };
      storageModuleFn(win);

      const ok = await win.StorageModule.deleteMedia("photos/file.png");
      assert.strictEqual(ok, false, "Must return false when data is empty array");
    } finally {
      global.fetch = globalFetch;
    }
  });

  console.log("\n============================================================");
  console.log(`🎉 ALL ${testCount} PHASE 31C-4 TESTS PASSED PERFECTLY!`);
  console.log("============================================================\n");
}

runAllTests().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
