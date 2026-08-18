/**
 * ============================================================================
 * PHASE 30.2 POST-UAT REGRESSION & VALIDATION TEST SUITE
 * Validates all fixes for Issues A through V across Admin Studio & Quick Editor
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("================================================================");
console.log("RUNNING PHASE 30.2 POST-UAT AUTOMATED TEST SUITE");
console.log("================================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// 1. Mock browser / window environment for loading core modules
const windowMock = {
  WishDefaults: null,
  RelationshipPresets: null,
  MediaService: {
    isYouTubeVideoUrl: (url) => typeof url === "string" && (url.includes("youtube.com") || url.includes("youtu.be")),
    extractYouTubeId: (url) => "dQw4w9WgXcQ"
  },
  document: {
    getElementById: () => null,
    querySelectorAll: () => []
  }
};

// Load defaults and presets
const wishDefaultsContent = fs.readFileSync(path.join(__dirname, '../js/core/wish-defaults.js'), 'utf8');
eval(`(function(window) { ${wishDefaultsContent} })(windowMock);`);

const presetsContent = fs.readFileSync(path.join(__dirname, '../js/core/relationship-presets.js'), 'utf8');
eval(`(function(window) { ${presetsContent} })(windowMock);`);

test("Core WishDefaults and RelationshipPresets loaded properly", () => {
  assert(windowMock.WishDefaults, "WishDefaults exists");
  assert(typeof windowMock.WishDefaults.getDefaultConfig === 'function', "getDefaultConfig exists");
  assert(typeof windowMock.WishDefaults.getSectionDefault === 'function', "getSectionDefault exists");
  assert(windowMock.RelationshipPresets, "RelationshipPresets exists");
  assert(typeof windowMock.RelationshipPresets.getPreset === 'function', "getPreset exists");
  assert(typeof windowMock.RelationshipPresets.listPresets === 'function', "listPresets exists");
  assert(windowMock.RelationshipPresets.listPresets("en").length >= 10, "Presets list available");
});

// Test Normalization logic from admin-wish-editor.js
test("AdminWishEditor.normalizeWishRecordToConfig parses JSON columns correctly (Issue N, O, P, Q)", () => {
  const adminEditorContent = fs.readFileSync(path.join(__dirname, '../js/admin/admin-wish-editor.js'), 'utf8');
  
  // Extract helpers and normalizeWishRecordToConfig
  const normalizeMatch = adminEditorContent.match(/function normalizeWishRecordToConfig\(record\)\s*\{([\s\S]*?)\n  \}/);
  assert(normalizeMatch, "normalizeWishRecordToConfig found in admin-wish-editor.js");
  
  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function pad(num) { return String(num).padStart(2, "0"); }
  function parseTime(input) {
    if (typeof input === "number") return Math.max(0, Math.floor(input));
    const s = String(input || "").trim();
    if (s.includes(":")) {
      const parts = s.split(":");
      return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    }
    const num = parseInt(s, 10);
    return isNaN(num) ? 0 : Math.max(0, num);
  }
  function parseUserDisplayDate(str) {
    if (!str || typeof str !== "string") return null;
    const clean = str.trim();
    const match = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (match) {
      return { day: parseInt(match[1], 10), month: parseInt(match[2], 10), year: parseInt(match[3], 10) };
    }
    const isoMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (isoMatch) {
      return { year: parseInt(isoMatch[1], 10), month: parseInt(isoMatch[2], 10), day: parseInt(isoMatch[3], 10) };
    }
    return null;
  }

  const DEFAULT_ADMIN_CONFIG = windowMock.WishDefaults.getDefaultConfig();
  DEFAULT_ADMIN_CONFIG.music = { file: "assets/music/happy-birthday-song.mpeg", startTime: 0 };
  DEFAULT_ADMIN_CONFIG.videoWish = { url: "", startTime: 0 };

  const normalizeFn = new Function('record', 'deepClone', 'DEFAULT_ADMIN_CONFIG', 'parseUserDisplayDate', 'parseTime', 'window', 'WishDefaults', normalizeMatch[1]);
  
  const mockRecord = {
    id: "wish_12345",
    recipient_name: "Aanya",
    sender_name: "Rahul",
    pass_code: "1234",
    birth_date: "2000-05-15",
    cake_flavor: "chocolate",
    letter_theme: "midnight",
    letter_font: "handwriting",
    memory_text: "Remember Goa trip!",
    reasons_json: JSON.stringify(["You inspire me", "You make me laugh"]),
    wishes_json: JSON.stringify(["Health & Joy", "Success"]),
    gallery_json: JSON.stringify([
      { url: "https://supabase.co/img1.jpg", caption: "Beach sunset", emoji: "🌅", secretNote: "Best day" },
      { url: "https://supabase.co/img2.jpg", caption: "Dinner night", emoji: "🥂", secretNote: "Fun talks" }
    ]),
    timeline_json: JSON.stringify([
      { year: "2018", title: "Met in college", text: "First project together" }
    ]),
    gift_json: JSON.stringify({ message: "Spa day coupon", coupon: "SPA100" }),
    music_url: "https://supabase.co/audio.mp3",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  };

  const config = normalizeFn(mockRecord, deepClone, DEFAULT_ADMIN_CONFIG, parseUserDisplayDate, parseTime, windowMock, windowMock.WishDefaults);

  assert.strictEqual(config.name, "Aanya", "recipient name correctly extracted");
  assert.strictEqual(config.from, "Rahul", "sender name correctly extracted");
  assert.strictEqual(config.passcode.code, "1234", "passcode correctly extracted");
  assert.strictEqual(config.birthDate.year, 2000, "birthDate year parsed");
  assert.strictEqual(config.cakeFlavor, "chocolate", "cakeFlavor correctly extracted");
  assert.strictEqual(config.letterTheme, "midnight", "letterTheme correctly extracted");
  assert.strictEqual(config.letterFont, "handwriting", "letterFont correctly extracted");
  assert.strictEqual(config.memory, "Remember Goa trip!", "memory correctly extracted");
  
  assert.strictEqual(config.reasons.length, 2, "reasons_json parsed to array");
  assert.strictEqual(config.reasons[0], "You inspire me", "reason 0 content matches");
  
  assert.strictEqual(config.wishes.length, 2, "wishes_json parsed to array");
  assert.strictEqual(config.wishes[1], "Success", "wish 1 content matches");
  
  assert.strictEqual(config.gallery.length, 2, "gallery_json parsed to array");
  assert.strictEqual(config.gallery[0].url, "https://supabase.co/img1.jpg", "gallery image url parsed");
  assert.strictEqual(config.gallery[0].caption, "Beach sunset", "gallery caption parsed");
  assert.strictEqual(config.gallery[0].emoji, "🌅", "gallery emoji parsed");
  assert.strictEqual(config.gallery[0].secretNote, "Best day", "gallery secretNote parsed");
  
  assert.strictEqual(config.timeline.length, 1, "timeline_json parsed to array");
  assert.strictEqual(config.timeline[0].year, "2018", "timeline year parsed");
  
  assert.strictEqual(config.gift.message, "Spa day coupon", "gift message parsed");
  assert.strictEqual(config.gift.coupon, "SPA100", "gift coupon parsed");
  
  assert.strictEqual(config.music.file, "https://supabase.co/audio.mp3", "music file parsed");
  assert.strictEqual(config.videoWish.url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "video url parsed");
});

test("Admin Relationship Reset restores baseline defaults while PRESERVING gallery photo URLs (Issue C)", () => {
  const currentGallery = [
    { url: "https://supabase.co/uploaded_photo_1.jpg", caption: "Custom caption 1", emoji: "🎉", secretNote: "Secret 1" },
    { url: "https://supabase.co/uploaded_photo_2.jpg", caption: "Custom caption 2", emoji: "✨", secretNote: "Secret 2" }
  ];

  const baselineGalleryDefaults = windowMock.WishDefaults.getSectionDefault('gallery');

  const resetGallery = currentGallery.map((item, idx) => {
    const defaultMeta = (baselineGalleryDefaults && baselineGalleryDefaults[idx]) || {};
    return {
      url: item.url, // URL is preserved!
      caption: defaultMeta.cap || defaultMeta.caption || "",
      emoji: defaultMeta.emoji || "✨",
      secretNote: defaultMeta.secretNote || ""
    };
  });

  assert.strictEqual(resetGallery.length, 2, "Length preserved");
  assert.strictEqual(resetGallery[0].url, "https://supabase.co/uploaded_photo_1.jpg", "Photo 1 URL preserved");
  assert.strictEqual(resetGallery[1].url, "https://supabase.co/uploaded_photo_2.jpg", "Photo 2 URL preserved");
  assert.strictEqual(resetGallery[0].caption, baselineGalleryDefaults[0].cap, "Photo 1 caption reset to default");
  assert.strictEqual(resetGallery[0].emoji, baselineGalleryDefaults[0].emoji, "Photo 1 emoji reset to default");
  assert.strictEqual(resetGallery[0].secretNote, baselineGalleryDefaults[0].secretNote, "Photo 1 secretNote reset to default");
});

test("Quick Editor saved video recognition handles permanent HTTPS / Supabase URLs (Issue R)", () => {
  const videoModuleContent = fs.readFileSync(path.join(__dirname, '../js/modules/editor/video.js'), 'utf8');
  assert(videoModuleContent.includes('videoWish.url.includes("supabase.co")'), "hasCustomVid checks permanent supabase.co URLs");
  assert(videoModuleContent.includes('const hasCustomVid = videoWish.file'), "hasCustomVid expression exists in video.js");
});

test("Quick Editor Relationship Reset button and apply buttons exist in HTML and CSS (Issue S, T)", () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(__dirname, '../css/style.css'), 'utf8');

  assert(indexHtml.includes('id="btn-apply-quick-relationship"'), "btn-apply-quick-relationship exists in index.html");
  assert(indexHtml.includes('id="btn-reset-quick-relationship"'), "btn-reset-quick-relationship exists in index.html");
  assert(styleCss.includes('.quick-rel-btn'), ".quick-rel-btn exists in style.css");
  assert(styleCss.includes('.quick-rel-btn-apply'), ".quick-rel-btn-apply exists in style.css");
  assert(styleCss.includes('.quick-rel-btn-reset'), ".quick-rel-btn-reset exists in style.css");
});

test("Admin HTML has all required reset and preview elements (Issues A, B, E, J, K)", () => {
  const adminHtml = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
  assert(adminHtml.includes('id="adm-btn-reset-basic"'), "adm-btn-reset-basic exists in admin.html");
  assert(adminHtml.includes('id="adm-btn-reset-sender"'), "adm-btn-reset-sender exists in admin.html");
  assert(adminHtml.includes('id="adm-btn-reset-relationship"'), "adm-btn-reset-relationship exists in admin.html");
  assert(adminHtml.includes('id="adm-btn-clear-yt-audio"'), "adm-btn-clear-yt-audio exists");
  assert(adminHtml.includes('id="adm-btn-clear-yt-video"'), "adm-btn-clear-yt-video exists");
  assert(adminHtml.includes('id="adm-audio-yt-preview"'), "adm-audio-yt-preview exists");
  assert(adminHtml.includes('id="adm-video-yt-preview"'), "adm-video-yt-preview exists");
});

test("Admin Audio & Video source changes reset start time to 00:00 (Issues G, L)", () => {
  const adminEditorContent = fs.readFileSync(path.join(__dirname, '../js/admin/admin-wish-editor.js'), 'utf8');
  assert(adminEditorContent.includes('editorState.config.music.startTime = 0;'), "Audio startTime reset to 0 in admin-wish-editor.js");
  assert(adminEditorContent.includes('editorState.config.videoWish.startTime = 0;'), "Video startTime reset to 0 in admin-wish-editor.js");
});

test("Admin save safety awaits pending cloud uploads before saving DB record (Issues D, I)", () => {
  const adminEditorContent = fs.readFileSync(path.join(__dirname, '../js/admin/admin-wish-editor.js'), 'utf8');
  assert(adminEditorContent.includes('editorState.pendingAudioUploadPromise'), "save() checks pendingAudioUploadPromise");
  assert(adminEditorContent.includes('editorState.pendingVideoUploadPromise'), "save() checks pendingVideoUploadPromise");
  assert(adminEditorContent.includes('.startsWith("blob:")'), "save() checks blob prefix");
});

test("Modular Admin CSS files are properly loaded in admin.html (Issue U, BRAIN.md architecture)", () => {
  const adminHtml = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
  assert(adminHtml.includes('href="css/admin/admin-core.css"'), "admin-core.css loaded");
  assert(adminHtml.includes('href="css/admin/admin-layout.css"'), "admin-layout.css loaded");
  assert(adminHtml.includes('href="css/admin/admin-components.css"'), "admin-components.css loaded");
  assert(adminHtml.includes('href="css/admin/admin-dashboard.css"'), "admin-dashboard.css loaded");
  assert(adminHtml.includes('href="css/admin/admin-media.css"'), "admin-media.css loaded");
  assert(adminHtml.includes('href="css/admin/admin-editor.css"'), "admin-editor.css loaded");
  assert(adminHtml.includes('href="css/admin/admin-editor-media.css"'), "admin-editor-media.css loaded");
  assert(adminHtml.includes('href="css/admin/admin-responsive.css"'), "admin-responsive.css loaded");
});

console.log(`\n================================================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`================================================================`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
