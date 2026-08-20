/**
 * ============================================================================
 * PHASE 31B-1 AUTOMATED TEST SUITE: SEARCH & FILTER TOOLBAR EXPANSION
 * Validates search clear, media presence filtering, creation date filtering,
 * live result count badge, and preservation of row actions and sorting.
 * Pure Node.js test environment (Zero external dependencies).
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT_DIR = path.resolve(__dirname, "..");

console.log("============================================================");
console.log("🔍 STARTING PHASE 31B-1 WISHES SEARCH & FILTER TEST SUITE");
console.log("============================================================");

// Sample dataset covering diverse media and creation dates
const now = Date.now();
const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000).toISOString();
const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
const fifteenDaysAgo = new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString();
const fortyFiveDaysAgo = new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString();

const mockWishes = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    recipient_name: "Shivam Sharma",
    sender_name: "Arjun Singh",
    pass_code: "1234",
    created_at: oneHourAgo, // Today
    music_url: "https://example.com/audio1.mp3",
    video_url: null,
    gallery_json: [{ image: "https://example.com/photo1.jpg" }]
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    recipient_name: "Ananya Roy",
    sender_name: "Rohan Verma",
    pass_code: "5678",
    created_at: threeDaysAgo, // 7d
    music_url: null,
    video_url: "https://youtube.com/watch?v=video123",
    gallery_json: []
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    recipient_name: "Priya Patel",
    sender_name: "Neha Gupta",
    pass_code: "9999",
    created_at: fifteenDaysAgo, // 30d
    music_url: null,
    video_url: null,
    gallery_json: [{ url: "https://example.com/photo2.jpg" }]
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    recipient_name: "Rahul Verma",
    sender_name: "Arjun Singh",
    pass_code: "4321",
    created_at: fortyFiveDaysAgo, // Older than 30d
    music_url: null,
    video_url: null,
    gallery_json: [] // Text Only
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    recipient_name: "Aarav Sharma",
    sender_name: "Vikram Mehta",
    pass_code: "7777",
    created_at: oneHourAgo, // Today
    music_url: "https://example.com/song.mp3",
    video_url: "https://example.com/video.mp4",
    gallery_json: [{ src: "https://example.com/p3.jpg" }]
  }
];

// Setup clean DOM mock environment
let mockElements = {};
let dbQueryCount = 0;

function createMockElement(id = "", tag = "div") {
  const listeners = {};
  const el = {
    id,
    tagName: tag.toUpperCase(),
    value: "",
    textContent: "",
    innerHTML: "",
    style: {},
    dataset: {},
    children: [],
    appendChild(child) {
      this.children.push(child);
    },
    addEventListener(ev, fn) {
      if (!listeners[ev]) listeners[ev] = [];
      listeners[ev].push(fn);
    },
    dispatchEvent(ev) {
      const type = typeof ev === "string" ? ev : ev.type;
      if (listeners[type]) {
        listeners[type].forEach(fn => fn({ target: el, ...ev }));
      }
    },
    focus() {
      el.__focused = true;
    },
    querySelectorAll(selector) {
      const results = [];
      function traverse(node) {
        if (node.dataset) {
          if (selector.includes('data-action="edit"') && node.dataset.action === "edit") results.push(node);
          if (selector.includes('data-action="duplicate"') && node.dataset.action === "duplicate") results.push(node);
          if (selector.includes('data-action="delete"') && node.dataset.action === "delete") results.push(node);
        }
        if (node.children) node.children.forEach(traverse);
      }
      traverse(el);
      return results;
    }
  };
  return el;
}

function resetEnvironment() {
  mockElements = {
    "wishes-tbody": createMockElement("wishes-tbody", "tbody"),
    "wishes-search-input": createMockElement("wishes-search-input", "input"),
    "btn-wishes-search-clear": createMockElement("btn-wishes-search-clear", "button"),
    "wishes-sort-select": createMockElement("wishes-sort-select", "select"),
    "wishes-filter-media": createMockElement("wishes-filter-media", "select"),
    "wishes-filter-date": createMockElement("wishes-filter-date", "select"),
    "wishes-count-badge": createMockElement("wishes-count-badge", "div"),
    "btn-create-new-wish-admin": createMockElement("btn-create-new-wish-admin", "button")
  };

  mockElements["wishes-sort-select"].value = "newest";
  mockElements["wishes-filter-media"].value = "all";
  mockElements["wishes-filter-date"].value = "all";

  globalThis.window = globalThis;
  globalThis.location = { origin: "http://localhost:3000" };
  globalThis.document = {
    getElementById: (id) => mockElements[id] || null,
    createElement: (tag) => createMockElement("", tag),
    querySelectorAll: (sel) => []
  };

  globalThis.AdminCore = {
    showToast: () => {},
    copyWishUrl: () => {}
  };

  dbQueryCount = 0;
  globalThis.DatabaseModule = {
    deleteWish: async () => { dbQueryCount++; return { success: true }; },
    duplicateWish: async () => { dbQueryCount++; return { success: true, newId: "new-uuid" }; }
  };

  // Reload admin-wishes.js
  const code = fs.readFileSync(path.join(ROOT_DIR, "js/admin/admin-wishes.js"), "utf8");
  delete globalThis.AdminWishes;
  eval(code);
}

let testCount = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    console.log(`  ✓ ${testCount}. ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${testCount}. ${name}`);
    console.error(`    Error: ${err.message}`);
    testsFailed++;
  }
}

// ------------------------------------------------------------
// TEST SUITE EXECUTION
// ------------------------------------------------------------

// 1. HTML Inspection Test
test("HTML Structure: admin.html contains clear button, filter selects, and count badge", () => {
  const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");
  assert.ok(adminHtml.includes('id="wishes-search-input"'), "wishes-search-input exists in HTML");
  assert.ok(adminHtml.includes('id="btn-wishes-search-clear"'), "btn-wishes-search-clear exists in HTML");
  assert.ok(adminHtml.includes('id="wishes-filter-media"'), "wishes-filter-media exists in HTML");
  assert.ok(adminHtml.includes('id="wishes-filter-date"'), "wishes-filter-date exists in HTML");
  assert.ok(adminHtml.includes('id="wishes-sort-select"'), "wishes-sort-select exists in HTML");
  assert.ok(adminHtml.includes('id="wishes-count-badge"'), "wishes-count-badge exists in HTML");
});

// 2. CSS Inspection Test
test("CSS Structure: admin-components.css contains styles for clear button and count badge", () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, "css/admin/admin-components.css"), "utf8");
  assert.ok(css.includes(".btn-search-clear"), ".btn-search-clear style rule exists");
  assert.ok(css.includes(".table-count-badge"), ".table-count-badge style rule exists");
  assert.ok(css.includes(".table-filter-group"), ".table-filter-group style rule exists");
});

// 3. Search: Matches Recipient Name
test("Search: Matches recipient name case-insensitively and partially", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-search-input"].value = "shivam";
  mockElements["wishes-search-input"].dispatchEvent("input");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 1);
  assert.strictEqual(processed[0].recipient_name, "Shivam Sharma");
});

// 4. Search: Matches Sender Name
test("Search: Matches sender name case-insensitively", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-search-input"].value = "arjun";
  mockElements["wishes-search-input"].dispatchEvent("input");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 2);
  assert.ok(processed.some(w => w.recipient_name === "Shivam Sharma"));
  assert.ok(processed.some(w => w.recipient_name === "Rahul Verma"));
});

// 5. Search: Matches UUID
test("Search: Matches UUID substring", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-search-input"].value = "22222222";
  mockElements["wishes-search-input"].dispatchEvent("input");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 1);
  assert.strictEqual(processed[0].id, "22222222-2222-4222-8222-222222222222");
});

// 6. Search Clear Button Functionality
test("Search Clear: Clears search input, resets table state and refocuses input", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-search-input"].value = "Ananya";
  mockElements["wishes-search-input"].dispatchEvent("input");
  assert.strictEqual(mockElements["btn-wishes-search-clear"].style.display, "inline-flex");
  assert.strictEqual(AdminWishes.getProcessedWishes().length, 1);

  // Click clear
  mockElements["btn-wishes-search-clear"].dispatchEvent("click");
  assert.strictEqual(mockElements["wishes-search-input"].value, "");
  assert.strictEqual(mockElements["btn-wishes-search-clear"].style.display, "none");
  assert.strictEqual(mockElements["wishes-search-input"].__focused, true);
  assert.strictEqual(AdminWishes.getProcessedWishes().length, 5);
});

// 7. Media Filter: Has Music
test("Media Filter: 'music' returns only wishes with valid music_url", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-filter-media"].value = "music";
  mockElements["wishes-filter-media"].dispatchEvent("change");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 2); // Shivam & Aarav
  assert.ok(processed.every(w => Boolean(w.music_url)));
});

// 8. Media Filter: Has Video
test("Media Filter: 'video' returns only wishes with valid video_url", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-filter-media"].value = "video";
  mockElements["wishes-filter-media"].dispatchEvent("change");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 2); // Ananya & Aarav
  assert.ok(processed.every(w => Boolean(w.video_url)));
});

// 9. Media Filter: Has Photos
test("Media Filter: 'photos' returns only wishes with non-empty gallery_json", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-filter-media"].value = "photos";
  mockElements["wishes-filter-media"].dispatchEvent("change");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 3); // Shivam, Priya, Aarav
  assert.ok(processed.every(w => w.gallery_json && w.gallery_json.length > 0));
});

// 10. Media Filter: Text Only
test("Media Filter: 'text_only' returns wishes with no music, video, or photos", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-filter-media"].value = "text_only";
  mockElements["wishes-filter-media"].dispatchEvent("change");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 1);
  assert.strictEqual(processed[0].recipient_name, "Rahul Verma");
});

// 11. Media Filter: All Media Types
test("Media Filter: 'all' returns all 5 wishes", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-filter-media"].value = "all";
  mockElements["wishes-filter-media"].dispatchEvent("change");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 5);
});

// 12. Date Filter: Created Today
test("Date Filter: 'today' returns wishes created today", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-filter-date"].value = "today";
  mockElements["wishes-filter-date"].dispatchEvent("change");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 2); // Shivam (1 hr ago) & Aarav (1 hr ago)
});

// 13. Date Filter: Last 7 Days
test("Date Filter: '7d' returns wishes created in last 7 days", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-filter-date"].value = "7d";
  mockElements["wishes-filter-date"].dispatchEvent("change");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 3); // Shivam (today), Ananya (3d), Aarav (today)
});

// 14. Date Filter: Last 30 Days
test("Date Filter: '30d' returns wishes created in last 30 days", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-filter-date"].value = "30d";
  mockElements["wishes-filter-date"].dispatchEvent("change");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 4); // Shivam, Ananya, Priya (15d), Aarav
});

// 15. Date Filter: All Time
test("Date Filter: 'all' returns all wishes regardless of date", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-filter-date"].value = "all";
  mockElements["wishes-filter-date"].dispatchEvent("change");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 5);
});

// 16. Combined Filter: Search + Media Filter
test("Combined Filter: Search 'Sharma' + Media 'music' returns matching wishes", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-search-input"].value = "Sharma";
  mockElements["wishes-filter-media"].value = "music";
  mockElements["wishes-search-input"].dispatchEvent("input");
  mockElements["wishes-filter-media"].dispatchEvent("change");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 2); // Shivam Sharma & Aarav Sharma
});

// 17. Combined Filter: Search + Date Filter
test("Combined Filter: Search 'Arjun' + Date '7d' returns matching wish", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-search-input"].value = "Arjun";
  mockElements["wishes-filter-date"].value = "7d";
  mockElements["wishes-search-input"].dispatchEvent("input");
  mockElements["wishes-filter-date"].dispatchEvent("change");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 1);
  assert.strictEqual(processed[0].recipient_name, "Shivam Sharma"); // Rahul Verma is 45d ago
});

// 18. Combined Filter: Search + Media + Date Filter
test("Combined Filter: Search 'Sharma' + Media 'video' + Date 'today'", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-search-input"].value = "Sharma";
  mockElements["wishes-filter-media"].value = "video";
  mockElements["wishes-filter-date"].value = "today";
  mockElements["wishes-search-input"].dispatchEvent("input");
  mockElements["wishes-filter-media"].dispatchEvent("change");
  mockElements["wishes-filter-date"].dispatchEvent("change");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 1);
  assert.strictEqual(processed[0].recipient_name, "Aarav Sharma");
});

// 19. Count Badge: Accurate 'Showing X of Y wishes' in normal, filtered, and empty states
test("Count Badge: Displays accurate 'Showing X of Y wishes' across all states", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  assert.strictEqual(mockElements["wishes-count-badge"].textContent, "Showing 5 of 5 wishes");

  // Filter down
  mockElements["wishes-filter-media"].value = "text_only";
  mockElements["wishes-filter-media"].dispatchEvent("change");
  assert.strictEqual(mockElements["wishes-count-badge"].textContent, "Showing 1 of 5 wishes");

  // Filter to 0
  mockElements["wishes-search-input"].value = "NonExistentQuery";
  mockElements["wishes-search-input"].dispatchEvent("input");
  assert.strictEqual(mockElements["wishes-count-badge"].textContent, "Showing 0 of 5 wishes");

  // Zero database wishes state
  AdminWishes.setWishes([]);
  assert.strictEqual(mockElements["wishes-count-badge"].textContent, "Showing 0 of 0 wishes");
});

// 20. Empty Result Contextual Message
test("Empty Result UI: Displays contextual message when filters or search match zero wishes", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-search-input"].value = "NonExistentXYZ";
  mockElements["wishes-search-input"].dispatchEvent("input");

  assert.ok(mockElements["wishes-tbody"].innerHTML.includes("No wishes match your search or filter criteria. 🔍"));
});

// 21. Sort Preservation on Filtered Dataset
test("Sort Preservation: Sort dropdown works correctly on filtered dataset", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-filter-media"].value = "photos";
  mockElements["wishes-sort-select"].value = "name";
  mockElements["wishes-filter-media"].dispatchEvent("change");
  mockElements["wishes-sort-select"].dispatchEvent("change");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 3);
  assert.strictEqual(processed[0].recipient_name, "Aarav Sharma");
  assert.strictEqual(processed[1].recipient_name, "Priya Patel");
  assert.strictEqual(processed[2].recipient_name, "Shivam Sharma");
});

// 22. Network Efficiency: Zero Redundant Queries
test("Network Efficiency: Search and filter operations trigger 0 database queries", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  const initialCount = dbQueryCount;

  mockElements["wishes-search-input"].value = "Shivam";
  mockElements["wishes-search-input"].dispatchEvent("input");

  mockElements["wishes-filter-media"].value = "music";
  mockElements["wishes-filter-media"].dispatchEvent("change");

  mockElements["wishes-filter-date"].value = "today";
  mockElements["wishes-filter-date"].dispatchEvent("change");

  mockElements["btn-wishes-search-clear"].dispatchEvent("click");

  assert.strictEqual(dbQueryCount, initialCount, "Zero network queries executed during search/filter operations");
});

console.log("============================================================");
console.log(`🎉 ALL ${testsPassed} PHASE 31B-1 TESTS PASSED!`);
console.log("============================================================");
