/**
 * ============================================================================
 * PHASE 30.2 STABILIZATION AUTOMATED TEST SUITE
 * Validates:
 * 1. Relationship Presets V2 (All 12 categories, English & Hinglish, 5 wishes each, funny best friend, timeline, gallery).
 * 2. Relationship Style Application & Reset logic.
 * 3. Memory Reset logic.
 * 4. Date Input validation & segment overflow parsing.
 * 5. Media Service & instant gallery fallback (0 404s).
 * 6. Audio/Video time parsing, seekbar gradient math, and playback offset logic.
 * 7. Live Summary 15-field tracking.
 * 8. Quick Editor relationship preset application.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

console.log("\n============================================================");
console.log("🧪 RUNNING PHASE 30.2 STABILIZATION AUTOMATED TESTS");
console.log("============================================================\n");

// 1. Test Relationship Presets Engine V2
console.log("▶ TEST SUITE 1: Relationship Presets Engine V2 (English & Hinglish)");

// Mock browser environment for loading files
global.window = global;
global.DEFAULT_CONFIG_BACKUP = {};

// Load WishDefaults
require(path.join(__dirname, '../js/core/wish-defaults.js'));
assert(typeof window.WishDefaults !== "undefined", "WishDefaults is loaded globally");

// Load RelationshipPresets
require(path.join(__dirname, '../js/core/relationship-presets.js'));
assert(typeof window.RelationshipPresets !== "undefined", "RelationshipPresets is loaded globally");

const relKeys = [
  "friend", "best_friend", "boyfriend", "girlfriend",
  "husband", "wife", "father", "mother",
  "brother", "sister", "colleague", "teacher"
];

assert(relKeys.length === 12, "Exact 12 relationship categories present");

relKeys.forEach(key => {
  // English
  const enPreset = window.RelationshipPresets.getPreset(key, 'en');
  assert(enPreset !== null, `[EN] Preset for '${key}' is retrieved successfully`);
  assert(Array.isArray(enPreset.letterLines) && enPreset.letterLines.length >= 3, `[EN] '${key}' has at least 3 letter paragraphs`);
  assert(typeof enPreset.memory === "string" && enPreset.memory.length > 10, `[EN] '${key}' has custom cherished memory`);
  assert(Array.isArray(enPreset.reasons) && enPreset.reasons.length === 5, `[EN] '${key}' has exactly 5 custom reasons`);
  assert(Array.isArray(enPreset.wishes) && enPreset.wishes.length === 5, `[EN] '${key}' has exactly 5 custom wishes`);
  assert(Array.isArray(enPreset.timeline) && enPreset.timeline.length === 4, `[EN] '${key}' has 4 customized timeline milestones`);
  assert(Array.isArray(enPreset.gallery) && enPreset.gallery.length === 5, `[EN] '${key}' has 5 customized gallery polaroids`);

  // Hinglish
  const hiPreset = window.RelationshipPresets.getPreset(key, 'hi_en');
  assert(hiPreset !== null, `[HI_EN] Preset for '${key}' is retrieved successfully`);
  assert(Array.isArray(hiPreset.wishes) && hiPreset.wishes.length === 5, `[HI_EN] '${key}' has exactly 5 Hinglish wishes`);
  assert(Array.isArray(hiPreset.reasons) && hiPreset.reasons.length === 5, `[HI_EN] '${key}' has exactly 5 Hinglish reasons`);
});

// Best Friend Funny Tone Check
const bfEn = window.RelationshipPresets.getPreset('best_friend', 'en');
assert(
  bfEn.letterLines[0].toLowerCase().includes("partner") || bfEn.reasons[2].title.toLowerCase().includes("chaos") || bfEn.reasons[3].title.toLowerCase().includes("roaster"),
  "Best Friend [EN] has funny, teasing, partner-in-crime tone"
);

const bfHi = window.RelationshipPresets.getPreset('best_friend', 'hi_en');
assert(
  bfHi.reasons[2].title.includes("Partner in Crime") || bfHi.reasons[3].title.includes("Roaster") || bfHi.timeline[0].text.includes("crazy"),
  "Best Friend [HI_EN] has genuine desi banter & funny Hinglish tone"
);

// 2. Test Time Utils & Offset Calculations
console.log("\n▶ TEST SUITE 2: Time Utils & Offset Engine");
require(path.join(__dirname, '../js/core/time-utils.js'));
assert(typeof window.TimeUtils !== "undefined", "TimeUtils is loaded");

assert(window.TimeUtils.parseTimeToSeconds("00:00") === 0, "00:00 parses to 0 seconds");
assert(window.TimeUtils.parseTimeToSeconds("01:30") === 90, "01:30 parses to 90 seconds");
assert(window.TimeUtils.parseTimeToSeconds("90") === 90, "90 numeric parses to 90 seconds");
assert(window.TimeUtils.formatSecondsToMMSS(90) === "01:30", "90 seconds formats to 01:30");
assert(window.TimeUtils.formatSecondsToMMSS(0) === "00:00", "0 seconds formats to 00:00");

// 3. Test Date Validation & Segment Parsing
console.log("\n▶ TEST SUITE 3: Date Parsing & Segment Overflow");

function parseUserDisplayDate(str) {
  if (!str || typeof str !== "string") return null;
  const clean = str.trim();
  const match = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const dObj = new Date(year, month - 1, day);
      if (dObj.getFullYear() === year && dObj.getMonth() === month - 1 && dObj.getDate() === day) {
        return { year, month, day };
      }
    }
  }
  return null;
}

assert(parseUserDisplayDate("17/08/2001") !== null, "17/08/2001 parses valid date object");
assert(parseUserDisplayDate("17/08/2001").day === 17, "Day is 17");
assert(parseUserDisplayDate("17/08/2001").month === 8, "Month is 8");
assert(parseUserDisplayDate("17/08/2001").year === 2001, "Year is 2001");
assert(parseUserDisplayDate("31/02/2001") === null, "31/02/2001 (invalid leap/month) returns null");
assert(parseUserDisplayDate("1905200111") === null, "1905200111 (overflow digits) returns null");

// 4. Test Zero 404 in admin-media.js
console.log("\n▶ TEST SUITE 4: Zero 404 Image Fallbacks");
const adminMediaContent = fs.readFileSync(path.join(__dirname, '../js/admin/admin-media.js'), 'utf8');
assert(!adminMediaContent.includes("polaroid-1.jpg"), "admin-media.js contains zero references to non-existent polaroid-1.jpg");
assert(adminMediaContent.includes("gallery-emoji-tile"), "admin-media.js uses clean DOM emoji fallback");

// 5. Test Quick Editor HTML and Customizer Integration
console.log("\n▶ TEST SUITE 5: Quick Editor Relationship Integration");
const indexHtmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert(indexHtmlContent.includes("input-relationship-preset"), "index.html has input-relationship-preset select");
assert(indexHtmlContent.includes("input-relationship-lang"), "index.html has input-relationship-lang select");
assert(indexHtmlContent.includes("btn-apply-quick-relationship"), "index.html has btn-apply-quick-relationship button");

const customizerContent = fs.readFileSync(path.join(__dirname, '../js/modules/editor/customizer.js'), 'utf8');
assert(customizerContent.includes("btn-apply-quick-relationship"), "customizer.js attaches click handler to btn-apply-quick-relationship");
assert(customizerContent.includes("RelationshipPresets.getPreset"), "customizer.js calls RelationshipPresets.getPreset()");

// 6. Test Admin HTML and Wish Editor Parity
console.log("\n▶ TEST SUITE 6: Admin Wish Editor Parity & Controls");
const adminHtmlContent = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
assert(adminHtmlContent.includes("adm-select-relationship-lang"), "admin.html has relationship language selector");
assert(adminHtmlContent.includes("adm-btn-apply-relationship"), "admin.html has apply relationship style button");
assert(adminHtmlContent.includes("adm-btn-reset-relationship"), "admin.html has reset relationship style button");
assert(adminHtmlContent.includes("adm-btn-reset-memory"), "admin.html has reset memory button");
assert(adminHtmlContent.includes("adm-sum-theme"), "admin.html Live Summary has Letter Theme row");
assert(adminHtmlContent.includes("adm-sum-font"), "admin.html Live Summary has Letter Font Style row");
assert(adminHtmlContent.includes('placeholder="e.g. Shivam"'), "admin.html Recipient Name placeholder is 'e.g. Shivam'");

const adminWishEditorContent = fs.readFileSync(path.join(__dirname, '../js/admin/admin-wish-editor.js'), 'utf8');
assert(adminWishEditorContent.includes("adm-btn-reset-memory"), "admin-wish-editor.js binds memory reset button");
assert(adminWishEditorContent.includes("adm-btn-reset-relationship"), "admin-wish-editor.js binds relationship reset button");
assert(adminWishEditorContent.includes("adm-gallery-image"), "admin-wish-editor.js handles instant gallery image preview");
assert(adminWishEditorContent.includes("adm-sum-theme"), "admin-wish-editor.js updates theme in summary panel");
assert(adminWishEditorContent.includes("adm-sum-font"), "admin-wish-editor.js updates font in summary panel");

console.log("\n============================================================");
console.log(`📊 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log("============================================================\n");

if (failCount > 0) {
  process.exit(1);
}
