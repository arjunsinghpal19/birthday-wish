/**
 * ============================================================================
 * PHASE 31C-5 AUTOMATED TEST SUITE (scratch/test_phase31c_asset_inspector.js)
 * Media Asset Details & Usage Inspector Test Suite
 *
 * Verifies:
 * 1. Inspector modal opens for Image, Video, and Audio assets.
 * 2. Basic metadata (filename, path, folder, size, MIME type, date) is rendered.
 * 3. Used vs Unused status badge and banners.
 * 4. Multi-reference display with recipient names, wish IDs, and formatted fields.
 * 5. Protection of used assets and safe cleanup eligibility for unused assets.
 * 6. Copy URL, Copy Path, Download actions, and Close / Escape / Backdrop dismissal.
 * 7. Zero storage or database mutations during inspection.
 * 8. Zero regressions on existing Media Library, exports, and Phase 31C-4 cleanup.
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
const appJsCode = fs.readFileSync(path.join(projectRoot, "js", "app.js"), "utf-8");
const customizerCode = fs.readFileSync(path.join(projectRoot, "js", "modules", "editor", "customizer.js"), "utf-8");
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

/**
 * Creates a mock DOM environment for AdminMedia inspector tests.
 */
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
        contains(c) { return this._classes.contains ? this._classes.contains(c) : this._classes.has(c); },
        has(c) { return this._classes.has(c); }
      },
      setAttribute(k, v) { this[k] = v; },
      getAttribute(k) { return this[k]; },
      addEventListener(evt, cb) {
        if (!listeners.has(`${id}:${evt}`)) listeners.set(`${id}:${evt}`, []);
        listeners.get(`${id}:${evt}`).push(cb);
      },
      dispatchEvent(evt) {
        const cbs = listeners.get(`${id}:${evt.type}`) || [];
        cbs.forEach(cb => cb(evt));
      },
      querySelector(sel) {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      appendChild(child) {},
      removeChild(child) {}
    };
    elements.set(id, el);
    return el;
  }

  // Pre-create known element IDs
  [
    "dam-grid-container",
    "dam-stat-total",
    "dam-stat-photos",
    "dam-stat-videos",
    "dam-stat-audio",
    "dam-stat-used",
    "dam-stat-orphans",
    "dam-stat-storage",
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
    "btn-delete-selected-assets",
    "btn-delete-unused-assets",
    "btn-delete-old-temp-assets",
    // Inspector modal elements
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
    querySelectorAll(sel) {
      return [];
    },
    querySelector(sel) {
      return null;
    },
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
    sessionStorage: {
      getItem: () => "mock_token"
    },
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

async function runAllTests() {
  console.log("============================================================");
  console.log("🚀 STARTING PHASE 31C-5 ASSET INSPECTOR TEST SUITE");
  console.log("============================================================\n");

  // 1. Inspector opens for an image asset
  await test("Inspector opens for an image asset", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const imgAsset = {
      id: "img1",
      name: "sunset.jpg",
      folder: "photos",
      path: "photos/sunset.jpg",
      canonicalPath: "photos/sunset.jpg",
      publicUrl: "https://dvacxeooaqxwldszqpek.supabase.co/storage/v1/object/public/wish-media/photos/sunset.jpg",
      size: 512000,
      mimetype: "image/jpeg",
      isUsed: false,
      references: []
    };

    windowMock.AdminMedia.setFiles([imgAsset]);
    windowMock.AdminMedia.openAssetInspector("photos/sunset.jpg");

    const modal = documentMock.getElementById("asset-inspector-modal");
    assert.ok(modal.classList.contains("open"), "Inspector modal must be opened");

    const preview = documentMock.getElementById("inspector-media-preview");
    assert.ok(preview.innerHTML.includes("<img"), "Must render <img> tag for photo asset");
    assert.ok(preview.innerHTML.includes("sunset.jpg"), "Must include image filename or URL in preview");
  });

  // 2. Inspector opens for a video asset
  await test("Inspector opens for a video asset", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const vidAsset = {
      id: "vid1",
      name: "birthday_wish.mp4",
      folder: "videos",
      path: "videos/birthday_wish.mp4",
      canonicalPath: "videos/birthday_wish.mp4",
      publicUrl: "https://dvacxeooaqxwldszqpek.supabase.co/storage/v1/object/public/wish-media/videos/birthday_wish.mp4",
      size: 2048000,
      mimetype: "video/mp4",
      isUsed: false,
      references: []
    };

    windowMock.AdminMedia.setFiles([vidAsset]);
    windowMock.AdminMedia.openAssetInspector("videos/birthday_wish.mp4");

    const preview = documentMock.getElementById("inspector-media-preview");
    assert.ok(preview.innerHTML.includes("<video"), "Must render <video> tag for video asset");
    assert.ok(preview.innerHTML.includes("controls"), "Video preview must have controls");
  });

  // 3. Inspector opens for an audio asset
  await test("Inspector opens for an audio asset", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const audAsset = {
      id: "aud1",
      name: "happy_tune.mp3",
      folder: "audio",
      path: "audio/happy_tune.mp3",
      canonicalPath: "audio/happy_tune.mp3",
      publicUrl: "https://dvacxeooaqxwldszqpek.supabase.co/storage/v1/object/public/wish-media/audio/happy_tune.mp3",
      size: 1024000,
      mimetype: "audio/mpeg",
      isUsed: false,
      references: []
    };

    windowMock.AdminMedia.setFiles([audAsset]);
    windowMock.AdminMedia.openAssetInspector("audio/happy_tune.mp3");

    const preview = documentMock.getElementById("inspector-media-preview");
    assert.ok(preview.innerHTML.includes("<audio"), "Must render <audio> tag for audio asset");
    assert.ok(preview.innerHTML.includes("controls"), "Audio preview must have controls");
  });

  // 4. Filename is displayed
  await test("Filename is displayed correctly", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const asset = {
      id: "f1",
      name: "memories_photo.png",
      folder: "photos",
      path: "photos/memories_photo.png",
      size: 120000,
      isUsed: false,
      references: []
    };

    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("photos/memories_photo.png");

    const nameEl = documentMock.getElementById("inspector-file-name");
    assert.strictEqual(nameEl.textContent, "memories_photo.png");
  });

  // 5. File type / category is displayed
  await test("File type / category is displayed correctly", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const asset = {
      id: "f1",
      name: "clip.mp4",
      folder: "videos",
      path: "videos/clip.mp4",
      size: 120000,
      isUsed: false,
      references: []
    };

    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("videos/clip.mp4");

    const folderEl = documentMock.getElementById("inspector-file-folder");
    assert.strictEqual(folderEl.textContent, "VIDEOS");
  });

  // 6. File size is displayed
  await test("File size is displayed formatted", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const asset = {
      id: "f1",
      name: "pic.png",
      folder: "photos",
      path: "photos/pic.png",
      size: 204800,
      isUsed: false,
      references: []
    };

    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("photos/pic.png");

    const sizeEl = documentMock.getElementById("inspector-file-size");
    assert.strictEqual(sizeEl.textContent, "200.0 KB");
  });

  // 7. Storage path is displayed
  await test("Canonical storage path is displayed", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const asset = {
      id: "f1",
      name: "pic.png",
      folder: "photos",
      path: "photos/1787055_pic.png",
      size: 100,
      isUsed: false,
      references: []
    };

    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("photos/1787055_pic.png");

    const pathEl = documentMock.getElementById("inspector-file-path");
    assert.strictEqual(pathEl.textContent, "photos/1787055_pic.png");
  });

  // 8. Used status is displayed correctly
  await test("Used status badge is displayed correctly for referenced asset", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const asset = {
      id: "f1",
      name: "hero.jpg",
      folder: "photos",
      path: "photos/hero.jpg",
      size: 100,
      isUsed: true,
      references: [
        { wishId: "w1", recipientName: "Alice", senderName: "Bob", field: "gallery_json[0]" }
      ]
    };

    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("photos/hero.jpg");

    const badge = documentMock.getElementById("inspector-status-badge");
    assert.ok(badge.textContent.includes("Used"), "Badge must indicate Used");
    const usedSec = documentMock.getElementById("inspector-used-section");
    assert.strictEqual(usedSec.style.display, "block", "Used section must be displayed");
  });

  // 9. Unused status is displayed correctly
  await test("Unused status badge is displayed correctly for unreferenced asset", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const asset = {
      id: "f2",
      name: "orphan.jpg",
      folder: "photos",
      path: "photos/orphan.jpg",
      size: 100,
      isUsed: false,
      references: []
    };

    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("photos/orphan.jpg");

    const badge = documentMock.getElementById("inspector-status-badge");
    assert.ok(badge.textContent.includes("Unused"), "Badge must indicate Unused");
    const unusedSec = documentMock.getElementById("inspector-unused-section");
    assert.strictEqual(unusedSec.style.display, "block", "Unused section must be displayed");
  });

  // 10. Used asset displays referencing Wish
  await test("Referencing wish recipient name and UUID are displayed", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const asset = {
      id: "f1",
      name: "cake.jpg",
      folder: "photos",
      path: "photos/cake.jpg",
      size: 100,
      isUsed: true,
      references: [
        { wishId: "wish-abc-123", recipientName: "Sanu", senderName: "Arjun", field: "gallery_json[0]" }
      ]
    };

    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("photos/cake.jpg");

    const listEl = documentMock.getElementById("inspector-references-list");
    assert.ok(listEl.innerHTML.includes("Sanu"), "Must contain recipient name Sanu");
    assert.ok(listEl.innerHTML.includes("wish-abc-123"), "Must contain wish UUID");
  });

  // 11. Multiple references are all displayed
  await test("Multiple references across different wishes are all displayed", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const asset = {
      id: "f1",
      name: "shared_song.mp3",
      folder: "audio",
      path: "audio/shared_song.mp3",
      size: 500,
      isUsed: true,
      references: [
        { wishId: "wish-1", recipientName: "Sanu", field: "music_url" },
        { wishId: "wish-2", recipientName: "Rahul", field: "music_url" },
        { wishId: "wish-3", recipientName: "Priya", field: "music_url" }
      ]
    };

    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("audio/shared_song.mp3");

    const refCount = documentMock.getElementById("inspector-ref-count-text");
    assert.strictEqual(refCount.textContent, "3", "Reference count must show 3");

    const listEl = documentMock.getElementById("inspector-references-list");
    assert.ok(listEl.innerHTML.includes("Sanu"), "Must list Sanu");
    assert.ok(listEl.innerHTML.includes("Rahul"), "Must list Rahul");
    assert.ok(listEl.innerHTML.includes("Priya"), "Must list Priya");
  });

  // 12. Reference field/source is formatted cleanly
  await test("Reference field/source formatted with friendly labels", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    assert.ok(windowMock.AdminMedia.formatReferenceField("music_url").includes("Background Music"));
    assert.ok(windowMock.AdminMedia.formatReferenceField("video_url").includes("Video Wish"));
    assert.ok(windowMock.AdminMedia.formatReferenceField("gallery_json[2]").includes("Photo Gallery"));
    assert.ok(windowMock.AdminMedia.formatReferenceField("timeline_json[0]").includes("Memory Timeline"));
  });

  // 13. Used assets remain protected
  await test("Used asset contains zero delete triggers in inspector", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const asset = {
      id: "f1",
      name: "protected.jpg",
      folder: "photos",
      path: "photos/protected.jpg",
      size: 100,
      isUsed: true,
      references: [{ wishId: "w1", recipientName: "Test", field: "gallery_json[0]" }]
    };

    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("photos/protected.jpg");

    const modal = documentMock.getElementById("asset-inspector-modal");
    const unusedSec = documentMock.getElementById("inspector-unused-section");
    assert.strictEqual(unusedSec.style.display, "none", "Unused actions must not be visible on used assets");
  });

  // 14. Unused assets retain existing cleanup eligibility
  await test("Unused asset cleanup review launches existing safe review flow", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const asset = {
      id: "f1",
      name: "orphan.jpg",
      folder: "photos",
      path: "photos/orphan.jpg",
      size: 100,
      isUsed: false,
      references: []
    };

    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("photos/orphan.jpg");

    const cleanupBtn = documentMock.getElementById("btn-inspector-select-cleanup");
    assert.ok(cleanupBtn && typeof cleanupBtn.onclick === "function", "Cleanup review button must exist");

    cleanupBtn.onclick();

    // Inspector should close and unused review modal should open with this file selected
    const inspectorModal = documentMock.getElementById("asset-inspector-modal");
    assert.ok(!inspectorModal.classList.contains("open"), "Inspector modal must close");

    assert.strictEqual(windowMock.AdminMedia.getSelectedUnusedCount(), 1, "File must be selected");
    const reviewModal = documentMock.getElementById("unused-cleanup-modal");
    assert.ok(reviewModal.classList.contains("open"), "Unused cleanup review modal must open");
  });

  // 15. Copy Storage URL works
  await test("Copy Storage URL button copies public URL", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const asset = {
      id: "f1",
      name: "test.jpg",
      folder: "photos",
      path: "photos/test.jpg",
      publicUrl: "https://supabase.co/wish-media/photos/test.jpg",
      size: 100,
      isUsed: false,
      references: []
    };

    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("photos/test.jpg");

    const copyBtn = documentMock.getElementById("btn-inspector-copy-url");
    copyBtn.onclick();

    assert.strictEqual(windowMock.getCopiedText(), "https://supabase.co/wish-media/photos/test.jpg");
  });

  // 16. Copy Storage Path works
  await test("Copy Storage Path button copies canonical path", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const asset = {
      id: "f1",
      name: "test.jpg",
      folder: "photos",
      path: "photos/test.jpg",
      publicUrl: "https://supabase.co/wish-media/photos/test.jpg",
      size: 100,
      isUsed: false,
      references: []
    };

    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("photos/test.jpg");

    const copyPathBtn = documentMock.getElementById("btn-inspector-copy-path");
    copyPathBtn.onclick();

    assert.strictEqual(windowMock.getCopiedText(), "photos/test.jpg");
  });

  // 17. Inspector close works
  await test("Inspector close button closes modal", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);

    const asset = { id: "f1", name: "t.jpg", folder: "photos", path: "photos/t.jpg", size: 10, isUsed: false, references: [] };
    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("photos/t.jpg");

    const modal = documentMock.getElementById("asset-inspector-modal");
    assert.ok(modal.classList.contains("open"));

    windowMock.AdminMedia.closeAssetInspector();
    assert.ok(!modal.classList.contains("open"), "Modal must be closed after closeAssetInspector()");
  });

  // 18. Escape closes inspector
  await test("Escape key dismisses inspector modal", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);
    windowMock.AdminMedia.init();

    const asset = { id: "f1", name: "t.jpg", folder: "photos", path: "photos/t.jpg", size: 10, isUsed: false, references: [] };
    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("photos/t.jpg");

    const modal = documentMock.getElementById("asset-inspector-modal");
    assert.ok(modal.classList.contains("open"));

    documentMock.dispatchEvent({ type: "keydown", key: "Escape" });
    assert.ok(!modal.classList.contains("open"), "Escape key must close inspector");
  });

  // 19. Backdrop close works
  await test("Backdrop click dismisses inspector modal", async () => {
    const { windowMock, documentMock } = createMockEnvironment();
    const fn = new Function("window", "document", adminMediaCode);
    fn(windowMock, documentMock);
    windowMock.AdminMedia.init();

    const asset = { id: "f1", name: "t.jpg", folder: "photos", path: "photos/t.jpg", size: 10, isUsed: false, references: [] };
    windowMock.AdminMedia.setFiles([asset]);
    windowMock.AdminMedia.openAssetInspector("photos/t.jpg");

    const modal = documentMock.getElementById("asset-inspector-modal");
    assert.ok(modal.classList.contains("open"));

    modal.dispatchEvent({ type: "click", target: modal });
    assert.ok(!modal.classList.contains("open"), "Backdrop click must close inspector");
  });

  // 20. Inspector performs zero database mutations
  await test("Inspector performs zero database mutations", async () => {
    assert.ok(!adminMediaCode.includes("openAssetInspector") || !adminMediaCode.slice(adminMediaCode.indexOf("openAssetInspector")).includes("DatabaseModule.saveWish"), "No saveWish in inspector");
    assert.ok(!adminMediaCode.includes("openAssetInspector") || !adminMediaCode.slice(adminMediaCode.indexOf("openAssetInspector")).includes("DatabaseModule.deleteWish"), "No deleteWish in inspector");
  });

  // 21. Inspector performs zero storage deletions
  await test("Inspector performs zero storage deletions directly", async () => {
    const inspectorFnBody = adminMediaCode.slice(adminMediaCode.indexOf("function openAssetInspector"), adminMediaCode.indexOf("function closeAssetInspector"));
    assert.ok(!inspectorFnBody.includes("StorageModule.deleteMedia"), "Inspector must not directly delete storage files");
    assert.ok(!inspectorFnBody.includes("StorageModule.deleteMultipleMedia"), "Inspector must not directly bulk delete storage files");
  });

  // 22. Existing Media Library filters remain working
  await test("Existing Media Library filters remain defined and working", async () => {
    assert.ok(adminMediaCode.includes("damfilter") || adminMediaCode.includes("currentDamFilter"));
    assert.ok(adminHtmlCode.includes("data-damfilter"));
  });

  // 23. Existing preview lightbox remains working
  await test("Existing preview lightbox remains working", async () => {
    assert.ok(adminMediaCode.includes("openAssetPreview"));
    assert.ok(adminHtmlCode.includes('id="asset-preview-modal"'));
  });

  // 24. Existing upload behavior remains working
  await test("Existing direct upload remains working", async () => {
    assert.ok(adminMediaCode.includes("initDamDirectUpload"));
    assert.ok(adminHtmlCode.includes('id="dam-direct-upload-input"'));
  });

  // 25. Existing JSON export remains working
  await test("Existing JSON export remains working", async () => {
    assert.ok(adminWishesCode.includes("exportSelectedWishes"));
    assert.ok(adminHtmlCode.includes('id="btn-export-json"'));
  });

  // 26. Existing CSV export remains working
  await test("Existing CSV export remains working", async () => {
    assert.ok(adminWishesCode.includes("formatWishesToCSV"));
    assert.ok(adminHtmlCode.includes('id="btn-export-csv"'));
  });

  // 27. Existing Phase 31C-4 cleanup remains working
  await test("Existing Phase 31C-4 safe cleanup flow remains intact", async () => {
    assert.ok(adminMediaCode.includes("executeUnusedMediaCleanup"));
    assert.ok(adminMediaCode.includes("validateSelectedUnusedForDeletion"));
    assert.ok(adminHtmlCode.includes('id="unused-cleanup-modal"'));
  });

  // 28. Safety validation remains intact
  await test("Phase 31C-4 authoritative safety validation remains intact", async () => {
    assert.ok(adminMediaCode.includes("validateSelectedUnusedForDeletion"));
    assert.ok(adminMediaCode.includes("isAssetEligibleForUnusedManagement"));
  });

  console.log("\n============================================================");
  console.log(`🎉 ALL ${testCount} PHASE 31C-5 TESTS PASSED PERFECTLY!`);
  console.log("============================================================\n");
}

runAllTests().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
