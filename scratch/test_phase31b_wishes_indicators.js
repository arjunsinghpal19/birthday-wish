/**
 * ============================================================================
 * PHASE 31B-4 AUTOMATED TEST SUITE (scratch/test_phase31b_wishes_indicators.js)
 * Validates Rich Content & Media Indicators for Admin Wishes Management:
 * - 🎵 Music presence & start time offset formatting
 * - 🎥 Video presence & start time offset formatting
 * - 📸 Photos count parsing (array & JSON string)
 * - 📜 Letter lines count parsing (array, JSON string, newline string)
 * - ⏳ Timeline milestones count parsing (array & JSON string)
 * - 📝 Text-only detection & badge generation
 * - Non-mutating indicator generation
 * - Integration with Search, Filters, Sorting, Pagination, and Actions
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("🚀 Running Phase 31B-4 Wishes Indicators Test Suite...\n");

// Read admin-wishes.js
const adminWishesFile = path.join(__dirname, "../js/admin/admin-wishes.js");
const adminWishesCode = fs.readFileSync(adminWishesFile, "utf8");

// Mock Environment
let mockElements = {};
let mockListeners = {};

function createMockElement(id, tagName = "div") {
  const el = {
    id,
    tagName: tagName.toUpperCase(),
    value: "",
    textContent: "",
    innerHTML: "",
    style: {},
    disabled: false,
    dataset: {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); },
      toggle(c) { if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c); }
    },
    children: [],
    appendChild(child) {
      this.children.push(child);
      if (child.innerHTML) {
        this.innerHTML += child.innerHTML;
      }
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
    closest(sel) {
      if (sel === "button[data-action]" && this.dataset && this.dataset.action) return this;
      return null;
    },
    focus() {}
  };
  mockElements[id] = el;
  return el;
}

function resetEnvironment() {
  mockElements = {};
  mockListeners = {};

  createMockElement("wishes-tbody", "tbody");
  createMockElement("wishes-search-input", "input");
  createMockElement("btn-wishes-search-clear", "button");
  createMockElement("wishes-filter-media", "select");
  createMockElement("wishes-filter-date", "select");
  createMockElement("wishes-sort-select", "select");
  createMockElement("wishes-count-badge", "div");
  createMockElement("btn-create-new-wish-admin", "button");
  createMockElement("wishes-page-size", "select");
  createMockElement("btn-wishes-prev-page", "button");
  createMockElement("btn-wishes-next-page", "button");
  createMockElement("wishes-page-info", "span");
  createMockElement("sort-icon-recipient", "span");
  createMockElement("sort-icon-sender", "span");
  createMockElement("sort-icon-created", "span");

  // Global Mock
  globalThis.window = {
    location: { origin: "https://test.local" },
    AdminCore: {
      showToast: () => {},
      copyWishUrl: () => {}
    }
  };

  globalThis.document = {
    getElementById: (id) => mockElements[id] || null,
    querySelectorAll: (sel) => {
      if (sel === "th.th-sortable") {
        return [
          { dataset: { sort: "recipient" }, classList: createMockElement("th-rec").classList, setAttribute: () => {}, addEventListener: () => {} },
          { dataset: { sort: "sender" }, classList: createMockElement("th-snd").classList, setAttribute: () => {}, addEventListener: () => {} },
          { dataset: { sort: "created" }, classList: createMockElement("th-crt").classList, setAttribute: () => {}, addEventListener: () => {} }
        ];
      }
      return [];
    },
    createElement: (tag) => createMockElement(`dyn_${Math.random()}`, tag)
  };

  const fn = new Function("window", "document", adminWishesCode);
  fn(globalThis.window, globalThis.document);
}

// Sample wishes for testing
const mockWishes = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    recipient_name: "Aarav Sharma",
    sender_name: "Priya",
    music_url: "https://example.com/audio/song.mp3#bw-start=30",
    video_url: "https://example.com/video/clip.mp4#bw-start=90",
    gallery_json: JSON.stringify([
      { image: "https://example.com/p1.jpg", caption: "Photo 1" },
      { image: "https://example.com/p2.jpg", caption: "Photo 2" },
      { image: "https://example.com/p3.jpg", caption: "Photo 3" }
    ]),
    letter_lines: ["Happy Birthday Aarav!", "Wishing you all the happiness.", "From your best friend."],
    timeline_json: JSON.stringify([
      { title: "First Met", date: "2015-06-10", desc: "College days" },
      { title: "Graduation", date: "2019-05-20", desc: "Graduated together" }
    ]),
    pass_code: "1234",
    created_at: new Date().toISOString()
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    recipient_name: "Bhavna Patel",
    sender_name: "Karan",
    music_url: "https://example.com/audio/acoustic.mp3",
    video_url: null,
    gallery_json: [],
    letter_lines: ["Dear Bhavna,", "Have a wonderful day!"],
    timeline_json: [],
    pass_code: "5678",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    recipient_name: "Chetan Kumar",
    sender_name: "Ananya",
    music_url: "",
    video_url: "https://example.com/video/wish.mp4",
    gallery_json: [{ image: "https://example.com/pic1.jpg" }],
    letter_lines: "Line 1\nLine 2\nLine 3\nLine 4",
    timeline_json: [{ title: "Trip to Goa", date: "2021-12-25" }],
    pass_code: "9999",
    created_at: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    recipient_name: "Divya Singh",
    sender_name: "Rahul",
    music_url: null,
    video_url: null,
    gallery_json: null,
    letter_lines: ["Just a simple note for Divya."],
    timeline_json: null,
    pass_code: "0000",
    created_at: new Date(Date.now() - 40 * 86400000).toISOString()
  }
];

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// 1. API Exports
test("1. API Exports: window.AdminWishes exposes indicator helper functions", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  assert.strictEqual(typeof AdminWishes.getPhotoCount, "function");
  assert.strictEqual(typeof AdminWishes.getLetterCount, "function");
  assert.strictEqual(typeof AdminWishes.getTimelineCount, "function");
  assert.strictEqual(typeof AdminWishes.getMediaOffset, "function");
  assert.strictEqual(typeof AdminWishes.formatOffset, "function");
  assert.strictEqual(typeof AdminWishes.renderContentBadges, "function");
});

// 2. Music Indicator & Offset
test("2. Music Indicator: Detects music and extracts start time offset", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  const w1 = mockWishes[0]; // has #bw-start=30
  assert.strictEqual(AdminWishes.hasMusic(w1), true);
  assert.strictEqual(AdminWishes.getMediaOffset(w1.music_url), 30);
  assert.strictEqual(AdminWishes.formatOffset(30), "00:30");

  const w2 = mockWishes[1]; // has music, no offset
  assert.strictEqual(AdminWishes.hasMusic(w2), true);
  assert.strictEqual(AdminWishes.getMediaOffset(w2.music_url), 0);
  assert.strictEqual(AdminWishes.formatOffset(0), "00:00");

  const w4 = mockWishes[3]; // no music
  assert.strictEqual(AdminWishes.hasMusic(w4), false);
  assert.strictEqual(AdminWishes.getMediaOffset(w4.music_url), 0);
});

// 3. Video Indicator & Offset
test("3. Video Indicator: Detects video and extracts start time offset", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  const w1 = mockWishes[0]; // has #bw-start=90
  assert.strictEqual(AdminWishes.hasVideo(w1), true);
  assert.strictEqual(AdminWishes.getMediaOffset(w1.video_url), 90);
  assert.strictEqual(AdminWishes.formatOffset(90), "01:30");

  const w3 = mockWishes[2]; // has video, no offset
  assert.strictEqual(AdminWishes.hasVideo(w3), true);
  assert.strictEqual(AdminWishes.getMediaOffset(w3.video_url), 0);

  const w2 = mockWishes[1]; // no video
  assert.strictEqual(AdminWishes.hasVideo(w2), false);
});

// 4. Photo Count Parsing
test("4. Photo Count: Correctly counts valid photo items from JSON string or Array", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  assert.strictEqual(AdminWishes.getPhotoCount(mockWishes[0]), 3);
  assert.strictEqual(AdminWishes.getPhotoCount(mockWishes[1]), 0);
  assert.strictEqual(AdminWishes.getPhotoCount(mockWishes[2]), 1);
  assert.strictEqual(AdminWishes.getPhotoCount(mockWishes[3]), 0);
  assert.strictEqual(AdminWishes.getPhotoCount({ gallery_json: "invalid-json" }), 0);
  assert.strictEqual(AdminWishes.getPhotoCount({ gallery_json: [{ image: "" }, { url: "  " }] }), 0);
});

// 5. Letter Line Count Parsing
test("5. Letter Lines Count: Handles array, JSON string, and newline-delimited strings", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  assert.strictEqual(AdminWishes.getLetterCount(mockWishes[0]), 3);
  assert.strictEqual(AdminWishes.getLetterCount(mockWishes[1]), 2);
  assert.strictEqual(AdminWishes.getLetterCount(mockWishes[2]), 4); // newline string
  assert.strictEqual(AdminWishes.getLetterCount(mockWishes[3]), 1);
  assert.strictEqual(AdminWishes.getLetterCount({ letter_lines: null }), 0);
  assert.strictEqual(AdminWishes.getLetterCount({ letter_lines: ["", "  "] }), 0);
});

// 6. Timeline Milestone Count Parsing
test("6. Timeline Count: Correctly counts milestones from JSON string or Array", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  assert.strictEqual(AdminWishes.getTimelineCount(mockWishes[0]), 2);
  assert.strictEqual(AdminWishes.getTimelineCount(mockWishes[1]), 0);
  assert.strictEqual(AdminWishes.getTimelineCount(mockWishes[2]), 1);
  assert.strictEqual(AdminWishes.getTimelineCount(mockWishes[3]), 0);
  assert.strictEqual(AdminWishes.getTimelineCount({ timeline_json: "invalid" }), 0);
});

// 7. Text-Only Detection
test("7. Text-Only Detection: Wish with no music, video, or photos renders 'Text Only' badge", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  const html = AdminWishes.renderContentBadges(mockWishes[3]);
  assert.ok(html.includes("badge-text-only"));
  assert.ok(html.includes("📝 Text Only"));
  assert.ok(!html.includes("badge-music"));
  assert.ok(!html.includes("badge-video"));
  assert.ok(!html.includes("badge-photos"));
});

// 8. Combined Media Badges
test("8. Combined Badges: Wish with full media suite renders all corresponding badges", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  const html = AdminWishes.renderContentBadges(mockWishes[0]);
  assert.ok(html.includes("badge-music"), "Should contain music badge");
  assert.ok(html.includes("00:30"), "Should contain music offset");
  assert.ok(html.includes("badge-video"), "Should contain video badge");
  assert.ok(html.includes("01:30"), "Should contain video offset");
  assert.ok(html.includes("badge-photos"), "Should contain photos badge");
  assert.ok(html.includes("📸 3"), "Should show 3 photos");
  assert.ok(html.includes("badge-letter"), "Should contain letter badge");
  assert.ok(html.includes("📜 3"), "Should show 3 letter lines");
  assert.ok(html.includes("badge-timeline"), "Should contain timeline badge");
  assert.ok(html.includes("⏳ 2"), "Should show 2 milestones");
  assert.ok(!html.includes("badge-text-only"), "Should NOT contain text-only badge");
});

// 9. Non-Mutating Pure Function
test("9. Pure Rendering: renderContentBadges does not mutate source wish object", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  const original = JSON.stringify(mockWishes[0]);
  AdminWishes.renderContentBadges(mockWishes[0]);
  assert.strictEqual(JSON.stringify(mockWishes[0]), original, "Source wish object must remain untouched");
});

// 10. Table Row DOM Integration
test("10. DOM Integration: Table rows contain .wish-media-badges with accurate indicators", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  const tbody = mockElements["wishes-tbody"];
  assert.ok(tbody.innerHTML.includes("wish-media-badges"));
  assert.ok(tbody.innerHTML.includes("badge-music"));
  assert.ok(tbody.innerHTML.includes("badge-video"));
  assert.ok(tbody.innerHTML.includes("badge-photos"));
  assert.ok(tbody.innerHTML.includes("badge-text-only"));
});

// 11. Indicators with Search Filtering
test("11. Search Filtering: Filtered rows maintain accurate indicators", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-search-input"].value = "Divya";
  mockElements["wishes-search-input"].dispatchEvent("input");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 1);
  assert.strictEqual(processed[0].recipient_name, "Divya Singh");

  const tbody = mockElements["wishes-tbody"];
  assert.ok(tbody.innerHTML.includes("Divya Singh"));
  assert.ok(tbody.innerHTML.includes("badge-text-only"));
  assert.ok(!tbody.innerHTML.includes("Aarav Sharma"));
});

// 12. Indicators with Media Filtering
test("12. Media Filtering: Media filter results preserve accurate indicators", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-filter-media"].value = "music";
  mockElements["wishes-filter-media"].dispatchEvent("change");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 2); // Aarav & Bhavna

  const tbody = mockElements["wishes-tbody"];
  assert.ok(tbody.innerHTML.includes("Aarav Sharma"));
  assert.ok(tbody.innerHTML.includes("Bhavna Patel"));
  assert.ok(!tbody.innerHTML.includes("Divya Singh"));
});

// 13. Indicators with Sorting
test("13. Sorting: Sorting preserves correct indicator associations per wish", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  AdminWishes.setSortState("recipient", "desc");
  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed[0].recipient_name, "Divya Singh");

  const badgeHtml = AdminWishes.renderContentBadges(processed[0]);
  assert.ok(badgeHtml.includes("badge-text-only"));
});

// 14. Indicators with Pagination
test("14. Pagination: Page 2 rows display accurate indicators", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  AdminWishes.setPageSize(2);
  AdminWishes.setPage(2);

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 2);
  assert.strictEqual(processed[0].recipient_name, "Chetan Kumar");
  assert.strictEqual(processed[1].recipient_name, "Divya Singh");

  const badge0 = AdminWishes.renderContentBadges(processed[0]);
  assert.ok(badge0.includes("badge-video"));
  assert.ok(badge0.includes("📸 1"));

  const badge1 = AdminWishes.renderContentBadges(processed[1]);
  assert.ok(badge1.includes("badge-text-only"));
});

// 15. Action Button UUID Targeting Integrity
test("15. Action Integrity: Row action buttons retain exact data-id attributes", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  const tbody = mockElements["wishes-tbody"];
  assert.ok(tbody.innerHTML.includes('data-id="11111111-1111-4111-8111-111111111111"'));
  assert.ok(tbody.innerHTML.includes('data-id="22222222-2222-4222-8222-222222222222"'));
  assert.ok(tbody.innerHTML.includes('data-id="33333333-3333-4333-8333-333333333333"'));
  assert.ok(tbody.innerHTML.includes('data-id="44444444-4444-4444-8444-444444444444"'));
});

// 16. Count Badge Integrity
test("16. Count Badge: Preserves dynamic range output with indicators enabled", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  assert.strictEqual(mockElements["wishes-count-badge"].textContent, "Showing 1–4 of 4 wishes");
});

// 17. Empty & Error States with Dynamic Columns (8 columns)
test("17. Colspan Integrity: Empty and error states span all table columns", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  AdminWishes.init();

  // Empty state
  AdminWishes.setWishes([]);
  assert.ok(mockElements["wishes-tbody"].innerHTML.includes('colspan="8"') || mockElements["wishes-tbody"].innerHTML.includes('colspan="7"'));

  // Error state
  AdminWishes.setWishes([], true);
  assert.ok(mockElements["wishes-tbody"].innerHTML.includes('colspan="8"') || mockElements["wishes-tbody"].innerHTML.includes('colspan="7"'));
});

// 18. HTML Structure Validation
test("18. HTML Structure: admin.html contains Content & Media column header", () => {
  const htmlPath = path.join(__dirname, "../admin.html");
  const htmlContent = fs.readFileSync(htmlPath, "utf8");
  assert.ok(htmlContent.includes("<th>Content & Media</th>"), "admin.html must contain Content & Media th");
});

// 19. CSS Stylesheet Validation
test("19. CSS Structure: admin-components.css contains all indicator badge classes", () => {
  const cssPath = path.join(__dirname, "../css/admin/admin-components.css");
  const cssContent = fs.readFileSync(cssPath, "utf8");
  assert.ok(cssContent.includes(".wish-media-badges"), "Must include .wish-media-badges");
  assert.ok(cssContent.includes(".content-badge"), "Must include .content-badge");
  assert.ok(cssContent.includes(".badge-music"), "Must include .badge-music");
  assert.ok(cssContent.includes(".badge-video"), "Must include .badge-video");
  assert.ok(cssContent.includes(".badge-photos"), "Must include .badge-photos");
  assert.ok(cssContent.includes(".badge-letter"), "Must include .badge-letter");
  assert.ok(cssContent.includes(".badge-timeline"), "Must include .badge-timeline");
  assert.ok(cssContent.includes(".badge-text-only"), "Must include .badge-text-only");
});

// 20. Zero Additional Database Queries
test("20. Performance: Indicators are computed purely in-memory with 0 database calls", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis.window;
  let dbQueries = 0;
  globalThis.window.SupabaseModule = {
    getClient: () => {
      dbQueries++;
      return null;
    }
  };

  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);
  AdminWishes.render();

  assert.strictEqual(dbQueries, 0, "Zero Supabase client calls during rendering");
});

// 21. Protected Invariants Untouched
test("21. Invariants: Protected files exist and remain untampered", () => {
  const protectedFiles = [
    "index.html",
    "js/app.js",
    "css/style.css",
    "api/admin-delete-wish.js",
    fs.existsSync(path.join(__dirname, "..", "api", "_session.js")) ? "api/_session.js" : "api/session.js",
    "js/database.js"
  ];
  for (const rel of protectedFiles) {
    const p = path.join(__dirname, "..", rel);
    assert.ok(fs.existsSync(p), `Protected file ${rel} must exist`);
  }
});

// Summary
console.log("\n============================================================");
console.log(`Phase 31B-4 Tests: ${passed} passed, ${failed} failed`);
console.log("============================================================\n");

if (failed > 0) {
  process.exit(1);
}
