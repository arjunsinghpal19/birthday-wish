/**
 * ============================================================================
 * PHASE 31B-11 AUTOMATED TEST SUITE: WISHES ADVANCED SEARCH & FILTERING
 * Validates enhanced multi-token search, combined filters (search + media + date),
 * filter state consistency, pagination/sorting integration, selection persistence,
 * bulk action compatibility, resetFilters API, and security invariants.
 * Pure Node.js test environment (Zero external dependencies).
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT_DIR = path.resolve(__dirname, "..");

console.log("============================================================");
console.log("🚀 STARTING PHASE 31B-11 WISHES ADVANCED SEARCH & FILTER TEST SUITE");
console.log("============================================================");

// Sample dataset covering diverse media, creation dates, passcodes, and memory texts
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
    memory_text: "Remember the trip to Manali",
    created_at: oneHourAgo, // Today
    music_url: "https://example.com/audio1.mp3",
    video_url: null,
    gallery_json: [{ image: "https://example.com/photo1.jpg" }]
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    recipient_name: "Priya Patel",
    sender_name: "Rohit Verma",
    pass_code: "5678",
    memory_text: "College graduation day celebration",
    created_at: threeDaysAgo, // 7d
    music_url: null,
    video_url: "https://youtube.com/watch?v=video123",
    gallery_json: []
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    recipient_name: "Neha Gupta",
    sender_name: "Anjali Rao",
    pass_code: "9999",
    memory_text: "Late night coffee talks and music",
    created_at: fifteenDaysAgo, // 30d
    music_url: "https://example.com/song.mp3",
    video_url: "https://example.com/vid.mp4",
    gallery_json: [{ url: "https://example.com/photo2.jpg" }]
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    recipient_name: "Rahul Verma",
    sender_name: "Arjun Singh",
    pass_code: "4321",
    memory_text: "Childhood playground memories",
    created_at: fortyFiveDaysAgo, // Older than 30d
    music_url: null,
    video_url: null,
    gallery_json: [] // Text Only
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    recipient_name: "Aditi Sharma",
    sender_name: "Pooja Mehta",
    pass_code: "2222",
    memory_text: "Road trip to Goa beach",
    created_at: oneHourAgo, // Today
    music_url: null,
    video_url: null,
    gallery_json: [{ src: "https://example.com/p3.jpg" }]
  }
];

// Clean DOM mock environment
let mockElements = {};
let mockListeners = {};
let downloadedBlobs = [];

function createMockElement(id, tagName = "div") {
  let _innerHTML = "";
  const _classes = new Set();
  const el = {
    id,
    tagName: tagName.toUpperCase(),
    value: "",
    textContent: "",
    get innerHTML() {
      return _innerHTML;
    },
    set innerHTML(val) {
      _innerHTML = val;
      if (!val) {
        this.children = [];
      }
    },
    style: {},
    disabled: false,
    checked: false,
    indeterminate: false,
    dataset: {},
    children: [],
    href: "",
    download: "",
    appendChild(child) {
      this.children.push(child);
      if (child.innerHTML) _innerHTML += child.innerHTML;
    },
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
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
    click() {
      if (this.download && this.href) {
        downloadedBlobs.push({
          download: this.download,
          href: this.href
        });
      }
    },
    closest(sel) {
      if (sel === "tr") return this.tagName === "TR" ? this : (this._parentTr || null);
      if (sel === "button[data-action]" && this.dataset && this.dataset.action) return this;
      if (sel === ".wish-row-checkbox" && this.dataset && this.dataset.id) return this;
      if (sel === "#btn-wishes-empty-reset-filters" && this.id === "btn-wishes-empty-reset-filters") return this;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === ".wish-row-checkbox") {
        const matches = [];
        this.children.forEach(tr => {
          const match = (tr.innerHTML || "").match(/data-id="([^"]+)"/);
          if (match) {
            const rawId = match[1];
            const isChecked = tr.innerHTML.includes(`data-id="${rawId}" checked`) || _classes.has("selected-row");
            const cb = {
              dataset: { id: rawId },
              checked: isChecked,
              closest: (s) => (s === "tr" ? tr : null)
            };
            matches.push(cb);
          }
        });
        return matches;
      }
      return [];
    },
    classList: {
      add: (c) => { _classes.add(c); },
      remove: (c) => { _classes.delete(c); },
      contains: (c) => _classes.has(c),
      toggle: (c) => { if (_classes.has(c)) _classes.delete(c); else _classes.add(c); },
      get _classes() { return _classes; }
    },
    setAttribute(name, val) { this[name] = val; },
    removeAttribute(name) { delete this[name]; },
    focus() {},
    select() {}
  };
  mockElements[id] = el;
  return el;
}

const adminWishesCode = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-wishes.js"), "utf8");

function resetEnvironment() {
  mockElements = {};
  mockListeners = {};
  downloadedBlobs = [];

  const elementIds = [
    "wishes-tbody",
    "wishes-search-input",
    "btn-wishes-search-clear",
    "wishes-sort-select",
    "wishes-filter-media",
    "wishes-filter-date",
    "wishes-count-badge",
    "wishes-selection-badge",
    "wishes-selected-count",
    "btn-wishes-bulk-copy-links",
    "wishes-bulk-copy-links-count",
    "btn-wishes-bulk-export",
    "wishes-bulk-export-count",
    "btn-wishes-bulk-duplicate",
    "wishes-bulk-duplicate-count",
    "btn-wishes-bulk-delete",
    "wishes-bulk-delete-count",
    "btn-wishes-clear-selection",
    "wishes-select-all",
    "btn-create-new-wish-wishes",
    "btn-create-new-wish-admin",
    "wishes-page-size",
    "btn-wishes-prev-page",
    "btn-wishes-next-page",
    "wishes-page-info",
    "wishes-pagination-container"
  ];

  elementIds.forEach(id => createMockElement(id));

  globalThis.window = {
    location: { origin: "http://localhost:3000" },
    AdminCore: {
      showToast: (msg) => { globalThis.__lastToast = msg; },
      getLastToast: () => globalThis.__lastToast,
      copyWishUrl: () => true
    },
    AdminDashboard: {
      escapeHtml: (s) => (s ? String(s) : "")
    },
    navigator: {
      clipboard: {
        writeText: async (text) => {
          globalThis.__copiedText = text;
          return true;
        }
      }
    },
    Blob: class {
      constructor(parts, opts) {
        this.parts = parts;
        this.opts = opts;
      }
    },
    URL: {
      createObjectURL: (blob) => `blob:mock-url-${Date.now()}`,
      revokeObjectURL: () => {}
    },
    document: {
      getElementById: (id) => mockElements[id] || null,
      querySelector: (sel) => null,
      querySelectorAll: (sel) => [],
      createElement: (tag) => createMockElement(`dyn-${Date.now()}-${Math.random()}`, tag),
      body: {
        appendChild: () => {},
        removeChild: () => {}
      }
    }
  };

  globalThis.document = globalThis.window.document;

  eval(adminWishesCode);
}

let testCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    console.log(`  ✓ ${testCount}. ${name}`);
  } catch (err) {
    console.error(`  ✗ ${testCount}. ${name}`);
    console.error("    Error:", err.message);
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
    console.error("    Error:", err.message);
    throw err;
  }
}

(async () => {
  // ------------------------------------------------------------
  // SECTION 1: SEARCH CAPABILITIES
  // ------------------------------------------------------------
  test("1. Recipient Search: Matches recipient name case-insensitively and partially", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-search-input"].value = "shivam";
    const results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].recipient_name, "Shivam Sharma");
  });

  test("2. Sender Search: Matches sender name case-insensitively", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-search-input"].value = "arjun";
    const results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 2); // Shivam Sharma and Rahul Verma both have sender Arjun Singh
  });

  test("3. UUID Search: Matches full UUID and UUID substring", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-search-input"].value = "22222222";
    const results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].recipient_name, "Priya Patel");
  });

  test("4. Passcode Search: Matches pass_code field", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-search-input"].value = "9999";
    const results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].recipient_name, "Neha Gupta");
  });

  test("5. Memory Text Search: Matches keywords in memory_text", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-search-input"].value = "Manali";
    const results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].recipient_name, "Shivam Sharma");
  });

  test("6. Multi-Token AND Search: Every search token must match at least one field", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    // "Shivam 1234" matches wish 0 (recipient Shivam, passcode 1234)
    mockElements["wishes-search-input"].value = "Shivam 1234";
    let results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].recipient_name, "Shivam Sharma");

    // "Shivam 9999" matches nothing because 9999 belongs to Neha
    mockElements["wishes-search-input"].value = "Shivam 9999";
    results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 0);
  });

  test("7. Whitespace Trimming & Empty Query: Empty or whitespace query returns all wishes", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-search-input"].value = "   ";
    const results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 5);
  });

  // ------------------------------------------------------------
  // SECTION 2: COMBINED FILTERS (SEARCH + MEDIA + DATE)
  // ------------------------------------------------------------
  test("8. Search + Media Filter: Returns wishes matching both criteria", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    // Search "Sharma" matches Shivam (has music, photos) and Aditi (has photos)
    mockElements["wishes-search-input"].value = "Sharma";
    mockElements["wishes-filter-media"].value = "music";

    const results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].recipient_name, "Shivam Sharma");
  });

  test("9. Search + Date Filter: Returns wishes matching search and creation date", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    // Search "Arjun" matches Shivam (Today) and Rahul (45d ago)
    mockElements["wishes-search-input"].value = "Arjun";
    mockElements["wishes-filter-date"].value = "today";

    const results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].recipient_name, "Shivam Sharma");
  });

  test("10. Media + Date Filter: Returns wishes matching media type and date range", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-filter-media"].value = "video";
    mockElements["wishes-filter-date"].value = "7d";

    const results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].recipient_name, "Priya Patel");
  });

  test("11. Search + Media + Date (Triple AND Filter): Strict intersection of all 3 conditions", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-search-input"].value = "Sharma";
    mockElements["wishes-filter-media"].value = "photos";
    mockElements["wishes-filter-date"].value = "today";

    const results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 2); // Shivam Sharma and Aditi Sharma
  });

  test("12. Text Only Filter: Returns wishes with no music, video, or photos", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-filter-media"].value = "text_only";
    const results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].recipient_name, "Rahul Verma");
  });

  // ------------------------------------------------------------
  // SECTION 3: EMPTY STATES & RESET FILTERS
  // ------------------------------------------------------------
  test("13. Empty State: Displays search/filter empty message and reset button when 0 matches", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-search-input"].value = "NonExistentName";
    AdminWishes.render();

    const tbody = mockElements["wishes-tbody"];
    assert.ok(tbody.innerHTML.includes("No wishes match your search or filter criteria. 🔍"));
    assert.ok(tbody.innerHTML.includes("btn-wishes-empty-reset-filters"));
  });

  test("14. resetFilters() API: Clears search input, media & date selects, resets page to 1", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-search-input"].value = "Priya";
    mockElements["wishes-filter-media"].value = "video";
    mockElements["wishes-filter-date"].value = "7d";
    AdminWishes.setPage(2);

    AdminWishes.resetFilters();

    assert.strictEqual(mockElements["wishes-search-input"].value, "");
    assert.strictEqual(mockElements["wishes-filter-media"].value, "all");
    assert.strictEqual(mockElements["wishes-filter-date"].value, "all");
    assert.strictEqual(AdminWishes.getPage(), 1);

    const results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 5);
  });

  // ------------------------------------------------------------
  // SECTION 4: PAGINATION, SORTING & SELECTION INTEGRATION
  // ------------------------------------------------------------
  test("15. Pagination Reset on Search/Filter Input: Typing search query resets currentPage to 1", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    AdminWishes.setPageSize(2);
    AdminWishes.setPage(2);
    assert.strictEqual(AdminWishes.getPage(), 2);

    mockElements["wishes-search-input"].value = "Sharma";
    mockElements["wishes-search-input"].dispatchEvent("input");

    assert.strictEqual(AdminWishes.getPage(), 1);
  });

  test("16. Sorting on Filtered Results: Sorts filtered subset correctly", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    // Filter by sender "Arjun" -> matches Shivam Sharma and Rahul Verma
    mockElements["wishes-search-input"].value = "Arjun";
    AdminWishes.setSortState("recipient", "asc");

    const results = AdminWishes.getFilteredAndSortedWishes();
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].recipient_name, "Rahul Verma");
    assert.strictEqual(results[1].recipient_name, "Shivam Sharma");
  });

  test("17. Global Selection Persistence: Selected wish remains selected when hidden by filter", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    // Select Shivam (Wish 0) and Priya (Wish 1)
    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.selectWish(mockWishes[1].id);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);

    // Filter to only Shivam
    mockElements["wishes-search-input"].value = "Shivam";
    AdminWishes.render();

    // Both remain globally selected in memory
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);
    assert.ok(AdminWishes.isWishSelected(mockWishes[0].id));
    assert.ok(AdminWishes.isWishSelected(mockWishes[1].id));

    // Clear filter: both remain selected
    AdminWishes.resetFilters();
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);
  });

  test("18. Stale Selection Pruning on Render: Stale IDs are pruned while valid IDs remain", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.selectWish("deleted-stale-uuid-1234");
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);

    AdminWishes.render();
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);
    assert.ok(AdminWishes.isWishSelected(mockWishes[0].id));
    assert.ok(!AdminWishes.isWishSelected("deleted-stale-uuid-1234"));
  });

  // ------------------------------------------------------------
  // SECTION 5: BULK ACTIONS & SYSTEM INVARIANTS
  // ------------------------------------------------------------
  test("19. Bulk Action Compatibility: Bulk toolbar count reflects global selection regardless of filter", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.selectWish(mockWishes[1].id);
    AdminWishes.selectWish(mockWishes[2].id);

    // Apply filter that only matches 1 wish
    mockElements["wishes-search-input"].value = "Shivam";
    AdminWishes.render();

    // Toolbar count remains 3
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "3");
    assert.strictEqual(mockElements["wishes-bulk-export-count"].textContent, "3");
    assert.strictEqual(mockElements["wishes-bulk-copy-links-count"].textContent, "3");
    assert.strictEqual(mockElements["wishes-bulk-duplicate-count"].textContent, "3");
    assert.strictEqual(mockElements["wishes-bulk-delete-count"].textContent, "3");
  });

  test("20. Security Invariant: Zero service_role references in client-side code", () => {
    assert.ok(!adminWishesCode.includes("SUPABASE_SERVICE_ROLE_KEY"), "Client code must not contain service_role");
  });

  console.log("\n============================================================");
  console.log(`🎉 ALL ${testCount} PHASE 31B-11 WISHES ADVANCED SEARCH & FILTER TESTS PASSED!`);
  console.log("============================================================\n");
})();
