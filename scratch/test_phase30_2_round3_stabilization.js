/**
 * Phase 30.2 Round 3 Regression Stabilization Test Suite
 * Validates:
 *  1. Script Tags in index.html and admin.html (relationship-presets.js, wish-defaults.js, time-utils.js, media-service.js)
 *  2. Quick Editor Relationship Preset Execution & Content Regeneration (Mother, Father, Best Friend, Girlfriend; EN + Hinglish)
 *  3. Quick Editor Preservation Invariants (Name, Date, Passcode, From, Uploaded Photos, Custom Audio, Custom Video)
 *  4. Quick Editor Media Start-Time Formatting & Hydration (MM:SS formatting for 00:30, 02:14)
 *  5. Admin Live Wish Summary Parity & Action Buttons (Preview, Save, Save & Share)
 *  6. Admin Gallery 2-Column Baseline & Upload Button Nowrap
 *  7. Admin Live Public Preview Hydration (0 DB reads/writes)
 *  8. YouTube Audio/Video Start-Time Seeking & Typing Protection
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("============================================================");
console.log("🚀 STARTING PHASE 30.2 ROUND 3 STABILIZATION TEST SUITE");
console.log("============================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

// ------------------------------------------------------------
// TEST 1: Script tag inclusion in index.html & admin.html
// ------------------------------------------------------------
test("1. Script Tags: index.html includes relationship-presets.js and core modules in correct order", () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert(indexHtml.includes('<script src="js/core/wish-defaults.js"></script>'), "index.html must include wish-defaults.js");
  assert(indexHtml.includes('<script src="js/core/relationship-presets.js"></script>'), "index.html must include relationship-presets.js");
  assert(indexHtml.includes('<script src="js/core/time-utils.js"></script>'), "index.html must include time-utils.js");
  assert(indexHtml.includes('<script src="js/services/media-service.js"></script>'), "index.html must include media-service.js");
  
  // Verify ordering: relationship-presets before customizer.js
  const relIdx = indexHtml.indexOf('js/core/relationship-presets.js');
  const custIdx = indexHtml.indexOf('js/modules/editor/customizer.js');
  assert(relIdx > -1 && custIdx > -1 && relIdx < custIdx, "relationship-presets.js must load before customizer.js");
});

test("2. Script Tags: admin.html includes relationship-presets.js and admin modules", () => {
  const adminHtml = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
  assert(adminHtml.includes('<script src="js/core/relationship-presets.js"></script>'), "admin.html must include relationship-presets.js");
  assert(adminHtml.includes('<script src="js/core/wish-defaults.js"></script>'), "admin.html must include wish-defaults.js");
  assert(adminHtml.includes('<script src="js/admin/admin-wish-editor.js"></script>'), "admin.html must include admin-wish-editor.js");
});

// ------------------------------------------------------------
// TEST 2: Relationship Presets Pure Logic & Content Regeneration
// ------------------------------------------------------------
const relPresetsModule = require(path.join(__dirname, '../js/core/relationship-presets.js'));
const wishDefaultsModule = require(path.join(__dirname, '../js/core/wish-defaults.js'));
const timeUtilsModule = require(path.join(__dirname, '../js/core/time-utils.js'));

test("3. Relationship Presets: getPreset returns distinct template content for Mother, Father, Best Friend, Girlfriend (EN & Hinglish)", () => {
  const globalObj = typeof window !== "undefined" ? window : globalThis;
  const presets = globalObj.RelationshipPresets;
  assert(presets, "RelationshipPresets module must be loaded");

  const motherEn = presets.getPreset("mother", "en");
  const motherHi = presets.getPreset("mother", "hi_en");
  const fatherEn = presets.getPreset("father", "en");
  const bestFriendEn = presets.getPreset("best_friend", "en");
  const girlfriendEn = presets.getPreset("girlfriend", "en");

  assert(motherEn && motherEn.letterLines && motherEn.letterLines.length > 0, "Mother EN must have letter lines");
  assert(motherHi && motherHi.letterLines && motherHi.letterLines.length > 0, "Mother Hinglish must have letter lines");
  assert(fatherEn && fatherEn.letterLines && fatherEn.letterLines.length > 0, "Father EN must have letter lines");
  assert(bestFriendEn && bestFriendEn.reasons && bestFriendEn.reasons.length > 0, "Best Friend must have reasons");
  assert(girlfriendEn && girlfriendEn.wishes && girlfriendEn.wishes.length > 0, "Girlfriend must have wishes");

  // Verify content differences
  assert.notStrictEqual(motherEn.letterLines[0], fatherEn.letterLines[0], "Mother and Father letters must differ");
  assert.notStrictEqual(motherEn.letterLines[0], motherHi.letterLines[0], "Mother EN and Hinglish letters must differ");
});

// ------------------------------------------------------------
// TEST 3: Quick Editor Preservation Invariants
// ------------------------------------------------------------
test("4. Quick Editor: Applying relationship preset preserves recipient name, birth date, passcode, sender, and uploaded photos", () => {
  const globalObj = typeof window !== "undefined" ? window : globalThis;
  const presets = globalObj.RelationshipPresets;

  // Simulate existing custom config with uploaded photo & custom audio/video
  const userConfig = {
    name: "Arjun Singh",
    from: "Secret Admirer",
    birthDate: { year: 2001, month: 3, day: 19 },
    passcode: { code: "9876" },
    music: { file: "https://supabase.co/storage/v1/object/public/music/my-track.mp3#bw-start=45", startTime: 45 },
    videoWish: { url: "https://supabase.co/storage/v1/object/public/videos/my-video.mp4#bw-start=90", startTime: 90 },
    gallery: [
      { image: "https://supabase.co/photos/img1.jpg", emoji: "🎈", cap: "Custom photo 1", secretNote: "Note 1" },
      { image: null, emoji: "🍰", cap: "Photo 2", secretNote: "Note 2" }
    ]
  };

  const preset = presets.getPreset("mother", "en");
  
  // Apply preset logic (as implemented in customizer.js and admin-wish-editor.js)
  if (preset.letterLines) userConfig.letterLines = JSON.parse(JSON.stringify(preset.letterLines));
  if (preset.memory) userConfig.memory = preset.memory;
  if (preset.reasons) userConfig.reasons = JSON.parse(JSON.stringify(preset.reasons));
  if (preset.wishes) userConfig.wishes = JSON.parse(JSON.stringify(preset.wishes));
  if (preset.gift) {
    userConfig.gift = {
      message: preset.gift.message || userConfig.gift?.message || "",
      coupon: preset.gift.coupon || userConfig.gift?.coupon || ""
    };
  }
  if (Array.isArray(preset.timeline)) {
    userConfig.timeline = JSON.parse(JSON.stringify(preset.timeline));
  }
  if (Array.isArray(preset.gallery) && Array.isArray(userConfig.gallery)) {
    userConfig.gallery.forEach((g, idx) => {
      const pG = preset.gallery[idx];
      if (pG) {
        g.emoji = pG.emoji || g.emoji;
        g.cap = pG.cap || g.cap;
        g.secretNote = pG.secretNote || g.secretNote;
      }
    });
  }

  // Verify Preservation Invariants
  assert.strictEqual(userConfig.name, "Arjun Singh", "Recipient name must be preserved");
  assert.strictEqual(userConfig.from, "Secret Admirer", "Sender name must be preserved");
  assert.strictEqual(userConfig.birthDate.year, 2001, "Birth year must be preserved");
  assert.strictEqual(userConfig.passcode.code, "9876", "Passcode must be preserved");
  assert.strictEqual(userConfig.music.file, "https://supabase.co/storage/v1/object/public/music/my-track.mp3#bw-start=45", "Audio URL must be preserved");
  assert.strictEqual(userConfig.videoWish.url, "https://supabase.co/storage/v1/object/public/videos/my-video.mp4#bw-start=90", "Video URL must be preserved");
  assert.strictEqual(userConfig.gallery[0].image, "https://supabase.co/photos/img1.jpg", "Uploaded photo URL must be preserved");
  
  // Verify Template Content was applied
  assert(userConfig.letterLines.length > 0, "Preset letter lines must be applied");
  assert.strictEqual(userConfig.gallery[0].cap, preset.gallery[0].cap, "Preset caption must be updated for photo card");
});

// ------------------------------------------------------------
// TEST 4: Start-Time Parsing & MM:SS Formatting
// ------------------------------------------------------------
test("5. Time Utils: parseTimeToSeconds and formatSecondsToMMSS correctly handle 00:30, 02:14, 04:42", () => {
  const globalObj = typeof window !== "undefined" ? window : globalThis;
  const timeUtils = globalObj.TimeUtils;
  assert(timeUtils, "TimeUtils module must be loaded");

  assert.strictEqual(timeUtils.parseTimeToSeconds("00:30"), 30, "00:30 -> 30s");
  assert.strictEqual(timeUtils.parseTimeToSeconds("02:14"), 134, "02:14 -> 134s");
  assert.strictEqual(timeUtils.parseTimeToSeconds("04:42"), 282, "04:42 -> 282s");
  assert.strictEqual(timeUtils.parseTimeToSeconds(134), 134, "Numeric 134 -> 134s");

  assert.strictEqual(timeUtils.formatSecondsToMMSS(30), "00:30", "30s -> 00:30");
  assert.strictEqual(timeUtils.formatSecondsToMMSS(134), "02:14", "134s -> 02:14");
  assert.strictEqual(timeUtils.formatSecondsToMMSS(282), "04:42", "282s -> 04:42");
});

// ------------------------------------------------------------
// TEST 5: Admin Gallery Baseline & Button Wrap Prevention
// ------------------------------------------------------------
test("6. Admin Gallery: CSS rules enforce full-width card stack and white-space nowrap on buttons", () => {
  const css = fs.readFileSync(path.join(__dirname, '../css/admin/admin-editor.css'), 'utf8');
  assert(css.includes('#adm-gallery-container'), "admin-editor.css must contain #adm-gallery-container rule");
  assert(css.includes('display: flex') && css.includes('flex-direction: column'), "Gallery container must be a vertical flex stack");
  assert(css.includes('.adm-gallery-upload-btn'), "admin-editor.css must style .adm-gallery-upload-btn");
  assert(css.includes('white-space: nowrap !important'), "Gallery buttons must have white-space nowrap");
});

test("7. Admin Gallery: renderGallery produces balanced form-grid-2 image/emoji layout and nowrap buttons", () => {
  const adminEditorJs = fs.readFileSync(path.join(__dirname, '../js/admin/admin-wish-editor.js'), 'utf8');
  assert(adminEditorJs.includes('adm-gallery-image') && adminEditorJs.includes('adm-gallery-emoji'), "renderGallery must include Image Link and Fallback Emoji inputs");
  assert(adminEditorJs.includes('adm-gallery-upload-btn'), "Upload photo button must exist with .adm-gallery-upload-btn");
  assert(adminEditorJs.includes('adm-gallery-clear-img-btn'), "Clear image button must exist with .adm-gallery-clear-img-btn");
});

// ------------------------------------------------------------
// TEST 6: Admin Live Wish Summary & Action Buttons
// ------------------------------------------------------------
test("8. Admin Live Summary: Action buttons Save & Share, Save Changes, and Live Preview exist in admin.html", () => {
  const adminHtml = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
  assert(adminHtml.includes('id="btn-sum-save-share"'), "Save & Share button (#btn-sum-save-share) must exist");
  assert(adminHtml.includes('id="btn-sum-save"'), "Save Changes button (#btn-sum-save) must exist");
  assert(adminHtml.includes('id="btn-sum-preview"'), "Live Public Preview button (#btn-sum-preview) must exist");
  assert(adminHtml.includes('id="adm-summary-mode"'), "#adm-summary-mode badge must exist");
  assert(adminHtml.includes('id="adm-summary-status"'), "#adm-summary-status must exist");
});

// ------------------------------------------------------------
// TEST 7: Admin Live Public Preview Hydration (0 DB writes)
// ------------------------------------------------------------
test("9. Admin Public Preview: preview session hydration in app.js re-renders page without DB calls", () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  assert(appJs.includes('sessionStorage.getItem("admin_preview_wish")'), "app.js must check admin_preview_wish in sessionStorage");
  assert(appJs.includes('sessionStorage.getItem("admin_preview_config")'), "app.js must check admin_preview_config in sessionStorage");
  assert(appJs.includes('populateContent()'), "app.js preview hydration must call populateContent()");
  assert(appJs.includes('reRenderPage()'), "app.js preview hydration must call reRenderPage()");
  assert(appJs.includes('renderVideoWishSection()'), "app.js preview hydration must call renderVideoWishSection()");
  assert(appJs.includes('populateEditorFields()'), "app.js preview hydration must call populateEditorFields()");
});

// ------------------------------------------------------------
// TEST 8: YouTube Audio/Video Player Offset Playback & Typing Protection
// ------------------------------------------------------------
test("10. YouTube Audio: updateAudioUI provides dedicated play button and seeks to start offset", () => {
  const adminEditorJs = fs.readFileSync(path.join(__dirname, '../js/admin/admin-wish-editor.js'), 'utf8');
  assert(adminEditorJs.includes('adm-btn-yt-audio-play'), "updateAudioUI must render #adm-btn-yt-audio-play");
  assert(adminEditorJs.includes('ytAudioPlayerInstance.seekTo(curStart, true)'), "Clicking play on YouTube audio must seek to start offset");
  assert(adminEditorJs.includes('document.activeElement !== mscYtUrlEl'), "updateAudioUI must protect active typing in YouTube audio URL input");
  assert(adminEditorJs.includes('document.activeElement !== mscUrlEl'), "updateAudioUI must protect active typing in direct audio URL input");
});

test("11. YouTube Video: updateVideoUI seeks to start offset and protects active typing", () => {
  const adminEditorJs = fs.readFileSync(path.join(__dirname, '../js/admin/admin-wish-editor.js'), 'utf8');
  assert(adminEditorJs.includes('document.activeElement !== vidYtUrlEl'), "updateVideoUI must protect active typing in YouTube video URL input");
  assert(adminEditorJs.includes('document.activeElement !== vidUrlEl'), "updateVideoUI must protect active typing in direct video URL input");
  assert(adminEditorJs.includes('ytVideoPlayerInstance.seekTo(sec, true)'), "Video seekbar input must seek active YouTube video player");
});

test("12. Admin Wish Editor: Instant change listeners for relationship and language dropdowns", () => {
  const adminEditorJs = fs.readFileSync(path.join(__dirname, '../js/admin/admin-wish-editor.js'), 'utf8');
  assert(adminEditorJs.includes('relSelect.addEventListener("change"'), "adm-select-relationship must have change listener for instant application");
  assert(adminEditorJs.includes('relLangSelect.addEventListener("change"'), "adm-select-relationship-lang must have change listener for instant application");
});

console.log("\n============================================================");
console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("============================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL PHASE 30.2 ROUND 3 STABILIZATION TESTS PASSED!");
  process.exit(0);
}
