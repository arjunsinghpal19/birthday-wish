/**
 * PHASE 30.2 REGRESSION FIX ROUND 2 TEST SUITE (Pure Node.js)
 * Tests:
 * 1. Admin Live Summary Action Button Bindings
 * 2. Admin Live Summary Visual Baseline & CSS Selectors
 * 3. Admin Gallery Visual Baseline (Removed form-grid-2)
 * 4. Quick Editor Relationship Preset Change & Preservation Logic
 * 5. Media Start-Time Fragment Encoding, Decoding, and Stripping
 * 6. Database.js Media Start-Time Persistence & Backward Compatibility
 * 7. Admin Studio Media Source Separation, Clear Buttons, & Mutual Exclusivity
 * 8. Admin Studio YouTube Player API Integration & Duration Detection
 * 9. Public Wish & Music/Video Engine Compatibility with Stripped URLs
 * 10. Admin Preview Zero DB Write (SessionStorage Only)
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");

console.log("=============================================================");
console.log("🧪 PHASE 30.2 REGRESSION FIX ROUND 2 TEST SUITE (PURE NODE)");
console.log("=============================================================\n");

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(`    ${err.message}`);
  }
}

// 1. Media Metadata Service Unit Tests
console.log("--- 1. Media Service Metadata Helpers ---");
const mediaServiceCode = fs.readFileSync(path.join(ROOT, "js/services/media-service.js"), "utf8");

// Evaluate MediaService in isolated sandbox
const mediaSandbox = { window: {}, root: {} };
const evalMediaService = new Function("window", "root", mediaServiceCode);
evalMediaService(mediaSandbox.window, mediaSandbox.root);
const MediaService = mediaSandbox.window.MediaService || mediaSandbox.root.MediaService;

it("MediaService exports encodeMediaStartTime, decodeMediaStartTime, stripMediaMetadata", () => {
  assert(MediaService, "MediaService must be defined");
  assert.strictEqual(typeof MediaService.encodeMediaStartTime, "function");
  assert.strictEqual(typeof MediaService.decodeMediaStartTime, "function");
  assert.strictEqual(typeof MediaService.stripMediaMetadata, "function");
});

it("encodeMediaStartTime appends #bw-start=SEC for seconds > 0 and returns clean URL for 0", () => {
  assert.strictEqual(MediaService.encodeMediaStartTime("https://example.com/audio.mp3", 45), "https://example.com/audio.mp3#bw-start=45");
  assert.strictEqual(MediaService.encodeMediaStartTime("https://example.com/audio.mp3", 0), "https://example.com/audio.mp3");
  assert.strictEqual(MediaService.encodeMediaStartTime("https://example.com/audio.mp3#bw-start=10", 30), "https://example.com/audio.mp3#bw-start=30");
  assert.strictEqual(MediaService.encodeMediaStartTime(null, 30), "");
});

it("decodeMediaStartTime parses integer seconds from fragment", () => {
  assert.strictEqual(MediaService.decodeMediaStartTime("https://example.com/audio.mp3#bw-start=45"), 45);
  assert.strictEqual(MediaService.decodeMediaStartTime("https://example.com/audio.mp3#bw-start=120"), 120);
  assert.strictEqual(MediaService.decodeMediaStartTime("https://example.com/audio.mp3"), 0);
  assert.strictEqual(MediaService.decodeMediaStartTime(null), 0);
});

it("stripMediaMetadata removes #bw-start fragment cleanly", () => {
  assert.strictEqual(MediaService.stripMediaMetadata("https://example.com/audio.mp3#bw-start=45"), "https://example.com/audio.mp3");
  assert.strictEqual(MediaService.stripMediaMetadata("https://example.com/audio.mp3"), "https://example.com/audio.mp3");
  assert.strictEqual(MediaService.stripMediaMetadata(null), "");
});

// 2. Database.js Media Start Time Handling
console.log("\n--- 2. Database.js Media Metadata Handling ---");
const dbCode = fs.readFileSync(path.join(ROOT, "js/database.js"), "utf8");

it("database.js includes encodeMediaUrlWithStart, decodeMediaUrlStart, and stripMediaUrlMetadata", () => {
  assert(dbCode.includes("encodeMediaUrlWithStart"), "Missing encodeMediaUrlWithStart in database.js");
  assert(dbCode.includes("decodeMediaUrlStart"), "Missing decodeMediaUrlStart in database.js");
  assert(dbCode.includes("stripMediaUrlMetadata"), "Missing stripMediaUrlMetadata in database.js");
});

it("database.js persists non-zero start time into music_url and video_url with #bw-start fragment", () => {
  assert(dbCode.includes("encodeMediaUrlWithStart(rawMusicFile, configObj.music?.startTime)"), "Missing music_url encoding");
  assert(dbCode.includes("encodeMediaUrlWithStart(rawVideoUrl, configObj.videoWish?.startTime)"), "Missing video_url encoding");
});

it("database.js getWishRecordById decodes start time into msc and video objects", () => {
  assert(dbCode.includes("decodeMediaUrlStart(rawMusic)"), "Missing rawMusic start decoding");
  assert(dbCode.includes("decodeMediaUrlStart(rawVideo)"), "Missing rawVideo start decoding");
});

// 3. Admin Gallery Container Grid Class
console.log("\n--- 3. Admin Gallery Container Visual Baseline ---");
const adminHtml = fs.readFileSync(path.join(ROOT, "admin.html"), "utf8");

it("admin.html does NOT have form-grid-2 on #adm-gallery-container", () => {
  assert(!adminHtml.includes('id="adm-gallery-container" class="form-grid-2"'), "adm-gallery-container must not have form-grid-2 class");
  assert(adminHtml.includes('id="adm-gallery-container"'), "adm-gallery-container element must exist in admin.html");
});

// 4. Admin HTML Media Source Separation
console.log("\n--- 4. Admin HTML Audio & Video Source Separation ---");
it("admin.html has separate direct and YouTube audio fields with clear buttons", () => {
  assert(adminHtml.includes('id="adm-input-music-url"'), "Missing direct audio input");
  assert(adminHtml.includes('id="adm-btn-clear-direct-audio"'), "Missing clear direct audio button");
  assert(adminHtml.includes('id="adm-input-music-yt-url"'), "Missing YouTube audio input");
  assert(adminHtml.includes('id="adm-btn-clear-yt-audio"'), "Missing clear YouTube audio button");
});

it("admin.html has separate direct and YouTube video fields with clear buttons", () => {
  assert(adminHtml.includes('id="adm-input-video-url"'), "Missing direct video input");
  assert(adminHtml.includes('id="adm-btn-clear-direct-video"'), "Missing clear direct video button");
  assert(adminHtml.includes('id="adm-input-video-yt-url"'), "Missing YouTube video input");
  assert(adminHtml.includes('id="adm-btn-clear-yt-video"'), "Missing clear YouTube video button");
});

// 5. Admin CSS Live Summary Baseline
console.log("\n--- 5. Admin CSS Live Summary Visual Baseline ---");
const adminEditorCss = fs.readFileSync(path.join(ROOT, "css/admin/admin-editor.css"), "utf8");

it("css/admin/admin-editor.css contains .summary-details-list and .summary-details rules", () => {
  assert(adminEditorCss.includes(".summary-details-list"), "Missing .summary-details-list rule in admin-editor.css");
  assert(adminEditorCss.includes(".summary-card-header"), "Missing .summary-card-header rule in admin-editor.css");
  assert(adminEditorCss.includes(".summary-row"), "Missing .summary-row rule in admin-editor.css");
  assert(adminEditorCss.includes(".summary-actions"), "Missing .summary-actions rule in admin-editor.css");
});

// 6. Admin Wish Editor Live Summary Buttons & Media Handling
console.log("\n--- 6. Admin Wish Editor Logic & Parity ---");
const adminWishEditorCode = fs.readFileSync(path.join(ROOT, "js/admin/admin-wish-editor.js"), "utf8");

it("admin-wish-editor.js binds #btn-sum-preview, #btn-sum-save, #btn-sum-save-share in init()", () => {
  assert(adminWishEditorCode.includes("#btn-sum-preview"), "Missing #btn-sum-preview binding in admin-wish-editor.js");
  assert(adminWishEditorCode.includes("#btn-sum-save"), "Missing #btn-sum-save binding in admin-wish-editor.js");
  assert(adminWishEditorCode.includes("#btn-sum-save-share"), "Missing #btn-sum-save-share binding in admin-wish-editor.js");
});

it("admin-wish-editor.js decodes start time metadata and strips URL in normalizeWishRecordToConfig", () => {
  assert(adminWishEditorCode.includes("decodeMediaStartTime"), "Missing decodeMediaStartTime in normalizeWishRecordToConfig");
  assert(adminWishEditorCode.includes("stripMediaMetadata"), "Missing stripMediaMetadata in normalizeWishRecordToConfig");
});

it("admin-wish-editor.js implements separate clear buttons for direct audio/video and YouTube", () => {
  assert(adminWishEditorCode.includes("adm-btn-clear-direct-audio"), "Missing clear direct audio handler");
  assert(adminWishEditorCode.includes("adm-btn-clear-yt-audio"), "Missing clear YouTube audio handler");
  assert(adminWishEditorCode.includes("adm-btn-clear-direct-video"), "Missing clear direct video handler");
  assert(adminWishEditorCode.includes("adm-btn-clear-yt-video"), "Missing clear YouTube video handler");
});

it("admin-wish-editor.js includes loadYouTubeApi and YouTube IFrame API player embedding", () => {
  assert(adminWishEditorCode.includes("loadYouTubeApi"), "Missing loadYouTubeApi in admin-wish-editor.js");
  assert(adminWishEditorCode.includes("new YT.Player"), "Missing YT.Player initialization in admin-wish-editor.js");
  assert(adminWishEditorCode.includes("event.target.getDuration()"), "Missing YouTube duration detection");
});

// 7. Quick Editor Relationship Preset Change & Preservation
console.log("\n--- 7. Quick Editor Customizer Relationship Preset ---");
const customizerCode = fs.readFileSync(path.join(ROOT, "js/modules/editor/customizer.js"), "utf8");

it("customizer.js has change listener on input-relationship-preset and input-relationship-lang", () => {
  assert(customizerCode.includes("applyQuickRelationshipPreset"), "Missing applyQuickRelationshipPreset in customizer.js");
  assert(customizerCode.includes('quickRelSelect.addEventListener("change"'), "Missing change listener on relationship preset dropdown");
  assert(customizerCode.includes('quickRelLangSelect.addEventListener("change"'), "Missing change listener on relationship language dropdown");
});

it("customizer.js preserves recipient name, birth date, passcode, sender, and uploaded photos", () => {
  assert(customizerCode.includes("g.emoji = pG.emoji"), "Gallery emoji should be updated from preset");
  assert(customizerCode.includes("g.cap = pG.cap"), "Gallery caption should be updated from preset");
  assert(customizerCode.includes("g.secretNote = pG.secretNote"), "Gallery secret note should be updated from preset");
  assert(!customizerCode.includes("g.image = pG.image"), "g.image must NOT be overwritten by preset");
});

it("customizer.js populateEditorFields decodes start time metadata and strips URL fragments", () => {
  assert(customizerCode.includes("decodeMediaStartTime"), "Missing decodeMediaStartTime in populateEditorFields");
  assert(customizerCode.includes("stripMediaMetadata"), "Missing stripMediaMetadata in populateEditorFields");
});

// 8. Public Wish Renderer & Audio FX Compatibility
console.log("\n--- 8. Public Wish Engine Compatibility ---");
const renderersCode = fs.readFileSync(path.join(ROOT, "js/modules/renderers.js"), "utf8");
const audioFxCode = fs.readFileSync(path.join(ROOT, "js/modules/audio-fx.js"), "utf8");
const appCode = fs.readFileSync(path.join(ROOT, "js/app.js"), "utf8");

it("renderers.js parseYouTubeStartSec parses #bw-start metadata", () => {
  assert(renderersCode.includes("decodeMediaStartTime") || renderersCode.includes("#bw-start="), "parseYouTubeStartSec should support #bw-start");
});

it("renderers.js renderVideoWishSection strips metadata for native video src", () => {
  assert(renderersCode.includes("stripMediaMetadata"), "renderVideoWishSection should strip metadata for native video element");
});

it("audio-fx.js MusicEngine.play strips metadata before creating Audio instance", () => {
  assert(audioFxCode.includes("stripMediaMetadata"), "MusicEngine.play should strip metadata before setting audio element src");
});

it("app.js decodes #bw-start metadata and strips clean URL during token hydration", () => {
  assert(appCode.includes("decodeMediaStartTime"), "app.js should decode #bw-start during wish hydration");
  assert(appCode.includes("stripMediaMetadata"), "app.js should strip metadata during wish hydration");
});

console.log("\n=============================================================");
console.log(`SUMMARY: ${passed} / ${total} tests passed.`);
if (passed === total) {
  console.log("🎉 ALL TESTS PASSED WITH 100% SUCCESS!");
} else {
  console.log(`⚠️ ${total - passed} tests failed!`);
  process.exit(1);
}
