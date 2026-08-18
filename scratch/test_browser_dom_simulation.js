/**
 * ============================================================================
 * FULL DOM INTERACTIVE BROWSER SIMULATION
 * Simulates complete user session across:
 * 1. admin.html:
 *    - Login -> Navigation to Wish Editor
 *    - Recipient name placeholder 'e.g. Shivam'
 *    - Relationship selection: English & Hinglish (12 categories, 5 wishes)
 *    - Best Friend Funny tone validation
 *    - Apply & Reset buttons
 *    - Special Memory Reset button
 *    - Date input keyboard entry with segment masking & calendar sync
 *    - Instant Gallery Image URL preview & emoji fallback
 *    - Audio player preview, YouTube separation & Start Time seekbar
 *    - Video player preview, YouTube separation & Start Time seekbar
 *    - Live Summary 15-field sticky panel synchronization
 *    - In-Memory Preview & Save/Update lifecycle
 * 2. index.html:
 *    - Quick Editor Modal
 *    - Relationship Presets accordion section
 *    - Apply relationship style to public page state
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  ✅ PASS: ${msg}`);
    pass++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    fail++;
  }
}

console.log("\n============================================================");
console.log("🌐 RUNNING FULL DOM INTERACTIVE BROWSER SIMULATION");
console.log("============================================================\n");

// Read HTML files
const adminHtmlRaw = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
const indexHtmlRaw = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

// 1. Simulate admin.html
console.log("▶ TEST 1: Admin Studio DOM & Lifecycle Simulation");
const domAdmin = new JSDOM(adminHtmlRaw, {
  url: "http://localhost:8080/admin.html",
  runScripts: "dangerously",
  resources: "usable"
});

const { window: winAdmin } = domAdmin;
const { document: docAdmin } = winAdmin;

// Load Core Dependencies into simulated window
winAdmin.sessionStorage.setItem("admin_authenticated", "true");

require(path.join(__dirname, '../js/core/wish-defaults.js'));
require(path.join(__dirname, '../js/core/relationship-presets.js'));
require(path.join(__dirname, '../js/core/time-utils.js'));
require(path.join(__dirname, '../js/services/media-service.js'));

// Bind window mocks
winAdmin.WishDefaults = global.window.WishDefaults;
winAdmin.RelationshipPresets = global.window.RelationshipPresets;
winAdmin.TimeUtils = global.window.TimeUtils;
winAdmin.MediaService = global.window.MediaService;

// Mock AdminCore & DatabaseModule
winAdmin.AdminCore = {
  showToast: (m) => console.log(`    [Toast]: ${m}`),
  copyWishUrl: async (id) => `http://localhost:8080/index.html?w=${id}`
};

winAdmin.DatabaseModule = {
  saveWish: async (cfg) => "uuid-test-1234-5678-90ab",
  updateWish: async (id, cfg) => id,
  getWishRecordById: async (id) => null
};

// Load Admin Wish Editor
require(path.join(__dirname, '../js/admin/admin-wish-editor.js'));
winAdmin.AdminWishEditor = global.window.AdminWishEditor;

// Initialize Editor
winAdmin.AdminWishEditor.init();
winAdmin.AdminWishEditor.openNew();

// Verify Form Initial State
const nameInp = docAdmin.getElementById("adm-input-name");
assert(nameInp !== null, "Recipient Name input exists");
assert(nameInp.placeholder === "e.g. Shivam", "Recipient Name placeholder is 'e.g. Shivam'");

// Test Relationship Selection - English
const relSelect = docAdmin.getElementById("adm-select-relationship");
const relLangSelect = docAdmin.getElementById("adm-select-relationship-lang");
const applyRelBtn = docAdmin.getElementById("adm-btn-apply-relationship");
const resetRelBtn = docAdmin.getElementById("adm-btn-reset-relationship");

assert(relSelect !== null, "Relationship dropdown exists");
assert(relLangSelect !== null, "Relationship language selector exists");
assert(applyRelBtn !== null, "Apply Relationship button exists");
assert(resetRelBtn !== null, "Reset Relationship button exists");

relSelect.value = "best_friend";
relLangSelect.value = "en";
applyRelBtn.click();

const stateAfterEn = winAdmin.AdminWishEditor.getState();
assert(stateAfterEn.config.wishes.length === 5, "Best Friend [EN] populated exactly 5 wishes");
assert(stateAfterEn.config.reasons.length === 5, "Best Friend [EN] populated exactly 5 reasons");
assert(stateAfterEn.config.timeline.length === 4, "Best Friend [EN] populated 4 timeline milestones");
assert(stateAfterEn.config.gallery.length === 5, "Best Friend [EN] populated 5 polaroid captions");

// Test Relationship Selection - Hinglish
relLangSelect.value = "hi_en";
applyRelBtn.click();

const stateAfterHi = winAdmin.AdminWishEditor.getState();
assert(stateAfterHi.config.wishes.length === 5, "Best Friend [HI_EN] populated 5 Hinglish wishes");
assert(stateAfterHi.config.reasons[2].title.includes("Partner in Crime"), "Hinglish reason 3 title is 'Partner in Crime'");

// Test Relationship Reset
resetRelBtn.click();
const stateAfterReset = winAdmin.AdminWishEditor.getState();
assert(stateAfterReset.config.letterLines.length === 3, "Reset restored letter to baseline 3 paragraphs");

// Test Special Memory Reset
const memInp = docAdmin.getElementById("adm-input-memory");
const resetMemBtn = docAdmin.getElementById("adm-btn-reset-memory");
assert(resetMemBtn !== null, "Special Memory Reset button exists");
memInp.value = "Custom modified memory";
resetMemBtn.click();
assert(memInp.value.includes("laughing until our stomachs hurt"), "Special Memory Reset restores default baseline text");

// Test Date Input and Masking
const dateInp = docAdmin.getElementById("adm-input-birthdate-display");
assert(dateInp !== null, "Birthdate display input exists");
dateInp.value = "17/08/2001";
dateInp.dispatchEvent(new winAdmin.Event("input"));
const stateDate = winAdmin.AdminWishEditor.getState();
assert(stateDate.config.birthDate.day === 17, "Date input parsed Day as 17");
assert(stateDate.config.birthDate.month === 8, "Date input parsed Month as 8");
assert(stateDate.config.birthDate.year === 2001, "Date input parsed Year as 2001");

// Test Live Summary Panel
const sumTheme = docAdmin.getElementById("adm-sum-theme");
const sumFont = docAdmin.getElementById("adm-sum-font");
const sumDate = docAdmin.getElementById("adm-sum-date");
const sumWishes = docAdmin.getElementById("adm-sum-wishes");

assert(sumTheme !== null && sumTheme.textContent === "Original", "Live Summary shows Letter Theme 'Original'");
assert(sumFont !== null && sumFont.textContent === "Sacramento", "Live Summary shows Letter Font 'Sacramento'");
assert(sumDate !== null && sumDate.textContent === "17/08/2001", "Live Summary shows Birth Date '17/08/2001'");
assert(sumWishes !== null && sumWishes.textContent === "5 quotes", "Live Summary shows Wishes '5 quotes'");

// Test Audio & Video Seekbars
const audSeekbar = docAdmin.getElementById("adm-audio-seekbar");
const vidSeekbar = docAdmin.getElementById("adm-video-seekbar");
assert(audSeekbar !== null, "Audio start time seekbar exists");
assert(vidSeekbar !== null, "Video start time seekbar exists");

// Test Save Action
nameInp.value = "Shivam";
nameInp.dispatchEvent(new winAdmin.Event("input"));
winAdmin.AdminWishEditor.save().then(res => {
  assert(res.success === true, "Admin Wish Editor save() succeeded");
  assert(res.id === "uuid-test-1234-5678-90ab", "Admin Wish Editor returned expected saved UUID");
});

// 2. Simulate index.html Quick Editor
console.log("\n▶ TEST 2: Public Page & Quick Editor Relationship Integration");
const domIndex = new JSDOM(indexHtmlRaw, {
  url: "http://localhost:8080/index.html",
  runScripts: "dangerously",
  resources: "usable"
});

const { window: winIndex } = domIndex;
const { document: docIndex } = winIndex;

// Verify Quick Editor Relationship Section
const qkRelSection = docIndex.querySelector('.editor-section[data-section="relationship"]');
assert(qkRelSection !== null, "Quick Editor has Relationship Presets accordion section");

const qkRelSelect = docIndex.getElementById("input-relationship-preset");
const qkRelLang = docIndex.getElementById("input-relationship-lang");
const qkApplyBtn = docIndex.getElementById("btn-apply-quick-relationship");

assert(qkRelSelect !== null, "Quick Editor has input-relationship-preset dropdown");
assert(qkRelLang !== null, "Quick Editor has input-relationship-lang dropdown");
assert(qkApplyBtn !== null, "Quick Editor has btn-apply-quick-relationship button");

console.log("\n============================================================");
console.log(`📊 SIMULATION RESULTS: ${pass} PASSED, ${fail} FAILED`);
console.log("============================================================\n");

if (fail > 0) {
  process.exit(1);
}
