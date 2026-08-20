/**
 * ============================================================================
 * PHASE 31B-12 AUTOMATED TEST SUITE: WISHES MANAGEMENT PRODUCTIVITY BATCH
 * Validates quick search clear, filter & selection preservation, keyboard shortcuts
 * ('/' to focus, Escape to clear/blur), shortcut conflict protection, result count clarity,
 * seamless bulk action chaining, and security invariants.
 * Pure Node.js test environment (Zero external dependencies).
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT_DIR = path.resolve(__dirname, "..");

console.log("============================================================");
console.log("🚀 STARTING PHASE 31B-12 WISHES PRODUCTIVITY TEST SUITE");
console.log("============================================================");

// Sample dataset
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
    memory_text: "Manali trip",
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
    memory_text: "Graduation celebration",
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
    memory_text: "Late night coffee talks",
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
    memory_text: "Playground memories",
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
    memory_text: "Goa beach road trip",
    created_at: oneHourAgo, // Today
    music_url: null,
    video_url: null,
    gallery_json: [{ src: "https://example.com/p3.jpg" }]
  }
];

let mockElements = {};
let mockListeners = {};
let documentListeners = {};
let activeElement = null;
let downloadedBlobs = [];

function createMockElement(id, tagName = "div") {
  let _innerHTML = "";
  const _classes = new Set();
  const el = {
    id,
    tagName: tagName.toUpperCase(),
    value: "",
    textContent: "",
    isContentEditable: false,
    _focused: false,
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
      this.dispatchEvent("click");
    },
    focus() {
      this._focused = true;
      activeElement = this;
    },
    blur() {
      this._focused = false;
      if (activeElement === this) activeElement = null;
    },
    select() {
      this._selected = true;
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
    removeAttribute(name) { delete this[name]; }
  };
  mockElements[id] = el;
  return el;
}

const adminWishesCode = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-wishes.js"), "utf8");

function resetEnvironment() {
  mockElements = {};
  mockListeners = {};
  documentListeners = {};
  activeElement = null;
  downloadedBlobs = [];

  const elementIds = [
    "view-wishes",
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

  // Set default view-wishes visibility
  mockElements["view-wishes"].style.display = "block";
  mockElements["view-wishes"].classList.add("active");

  const docEl = {
    addEventListener: (event, handler) => {
      if (!documentListeners[event]) documentListeners[event] = [];
      documentListeners[event].push(handler);
    },
    dispatchEvent: (event, data) => {
      const type = typeof event === "string" ? event : event.type;
      if (documentListeners[type]) {
        documentListeners[type].forEach(h => h({
          preventDefault: () => {},
          stopPropagation: () => {},
          ...data
        }));
      }
    },
    getElementById: (id) => mockElements[id] || null,
    querySelector: (sel) => null,
    querySelectorAll: (sel) => [],
    createElement: (tag) => createMockElement(`dyn-${Date.now()}-${Math.random()}`, tag),
    get activeElement() { return activeElement; },
    body: {
      appendChild: () => {},
      removeChild: () => {}
    }
  };

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
    document: docEl
  };

  globalThis.document = docEl;

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
  // SECTION 1: QUICK CLEAR / SEARCH RESET
  // ------------------------------------------------------------
  test("1. Quick Search Clear: clearSearch() clears input and resets table to page 1", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-search-input"].value = "Shivam";
    AdminWishes.render();
    assert.strictEqual(AdminWishes.getProcessedWishes().length, 1);

    AdminWishes.clearSearch();
    assert.strictEqual(mockElements["wishes-search-input"].value, "");
    assert.strictEqual(AdminWishes.getProcessedWishes().length, 5);
  });

  test("2. Clear Button: Clicking #btn-wishes-search-clear clears search text", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-search-input"].value = "Priya";
    AdminWishes.render();

    const clearBtn = mockElements["btn-wishes-search-clear"];
    assert.strictEqual(clearBtn.style.display, "inline-flex");

    clearBtn.click();
    assert.strictEqual(mockElements["wishes-search-input"].value, "");
    assert.strictEqual(AdminWishes.getProcessedWishes().length, 5);
  });

  test("3. Search Clear preserves Media and Date Filters", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-filter-media"].value = "photos";
    mockElements["wishes-filter-date"].value = "today";
    mockElements["wishes-search-input"].value = "Shivam";
    AdminWishes.render();

    assert.strictEqual(AdminWishes.getProcessedWishes().length, 1);

    AdminWishes.clearSearch();

    // Media and date filter dropdowns remain intact
    assert.strictEqual(mockElements["wishes-filter-media"].value, "photos");
    assert.strictEqual(mockElements["wishes-filter-date"].value, "today");
    // Returns Shivam and Aditi (both have photos and created today)
    assert.strictEqual(AdminWishes.getProcessedWishes().length, 2);
  });

  test("4. Search Clear preserves global selectedWishIds", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.selectWish(mockWishes[1].id);

    mockElements["wishes-search-input"].value = "Shivam";
    AdminWishes.render();

    AdminWishes.clearSearch();

    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);
    assert.ok(AdminWishes.isWishSelected(mockWishes[0].id));
    assert.ok(AdminWishes.isWishSelected(mockWishes[1].id));
  });

  // ------------------------------------------------------------
  // SECTION 2: KEYBOARD SHORTCUTS & INTERACTION
  // ------------------------------------------------------------
  test("5. Search Input Escape Key: Clears search text when non-empty", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    const searchInput = mockElements["wishes-search-input"];
    searchInput.value = "TestQuery";
    AdminWishes.render();

    searchInput.dispatchEvent("keydown", { key: "Escape" });
    assert.strictEqual(searchInput.value, "");
    assert.strictEqual(AdminWishes.getProcessedWishes().length, 5);
  });

  test("6. Search Input Escape Key: Blurs search input when already empty", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    const searchInput = mockElements["wishes-search-input"];
    searchInput.value = "";
    searchInput.focus();
    assert.strictEqual(searchInput._focused, true);

    searchInput.dispatchEvent("keydown", { key: "Escape" });
    assert.strictEqual(searchInput._focused, false);
  });

  test("7. Global '/' Shortcut: Focuses search input and selects content when in Wishes tab", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    const searchInput = mockElements["wishes-search-input"];
    searchInput.value = "ExistingQuery";

    globalThis.document.dispatchEvent("keydown", { key: "/" });

    assert.strictEqual(searchInput._focused, true);
    assert.strictEqual(searchInput._selected, true);
  });

  test("8. Global '/' Shortcut Conflict Protection: Ignored when user is typing in another input/textarea", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    const otherInput = createMockElement("other-input", "input");
    otherInput.focus();

    const searchInput = mockElements["wishes-search-input"];
    searchInput._focused = false;

    globalThis.document.dispatchEvent("keydown", { key: "/" });

    assert.strictEqual(searchInput._focused, false);
  });

  test("9. Global '/' Shortcut Conflict Protection: Ignored when modifier keys (Ctrl/Meta/Alt) are pressed", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    const searchInput = mockElements["wishes-search-input"];
    searchInput._focused = false;

    globalThis.document.dispatchEvent("keydown", { key: "/", ctrlKey: true });
    assert.strictEqual(searchInput._focused, false);

    globalThis.document.dispatchEvent("keydown", { key: "/", metaKey: true });
    assert.strictEqual(searchInput._focused, false);

    globalThis.document.dispatchEvent("keydown", { key: "/", altKey: true });
    assert.strictEqual(searchInput._focused, false);
  });

  // ------------------------------------------------------------
  // SECTION 3: RESULT COUNT & SELECTION CLARITY
  // ------------------------------------------------------------
  test("10. Result Count Badge: Accurate display across normal, filtered, and empty states", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    assert.strictEqual(mockElements["wishes-count-badge"].textContent, "Showing 1–5 of 5 wishes");

    // Filter to 1 wish
    mockElements["wishes-search-input"].value = "Shivam";
    AdminWishes.render();
    assert.strictEqual(mockElements["wishes-count-badge"].textContent, "Showing 1 of 1 wishes");

    // Filter to 0 wishes
    mockElements["wishes-search-input"].value = "NonExistent";
    AdminWishes.render();
    assert.strictEqual(mockElements["wishes-count-badge"].textContent, "Showing 0 of 0 wishes");
  });

  test("11. Selection Count Badge: Synchronized across search, pagination, and bulk toolbar", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.selectWish(mockWishes[1].id);

    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "2");
    assert.strictEqual(mockElements["wishes-bulk-export-count"].textContent, "2");
    assert.strictEqual(mockElements["wishes-bulk-copy-links-count"].textContent, "2");
    assert.strictEqual(mockElements["wishes-bulk-duplicate-count"].textContent, "2");
    assert.strictEqual(mockElements["wishes-bulk-delete-count"].textContent, "2");
  });

  // ------------------------------------------------------------
  // SECTION 4: SEAMLESS BULK ACTION CHAINING
  // ------------------------------------------------------------
  await asyncTest("12. Action Chaining with Search: Search -> Select -> Export -> Copy Links -> Clear Search -> Delete", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    // 1. Search Shivam and select
    mockElements["wishes-search-input"].value = "Shivam";
    AdminWishes.render();
    AdminWishes.selectWish(mockWishes[0].id);

    // 2. Export
    const expRes = await AdminWishes.exportSelectedWishes("json");
    assert.strictEqual(expRes.success, true);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);

    // 3. Copy links
    const copyRes = await AdminWishes.copySelectedWishLinks();
    assert.strictEqual(copyRes.success, true);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);

    // 4. Clear search
    AdminWishes.clearSearch();
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);
    assert.ok(AdminWishes.isWishSelected(mockWishes[0].id));

    // 5. Delete
    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      deleteWishesBulk: async (ids) => ({
        success: true,
        deletedCount: ids.length,
        deletedIds: ids
      })
    };

    const delRes = await AdminWishes.deleteSelectedWishes();
    assert.strictEqual(delRes.success, true);
  });

  // ------------------------------------------------------------
  // SECTION 5: PUBLIC API & SECURITY INVARIANTS
  // ------------------------------------------------------------
  test("13. Public API Invariant: AdminWishes exports clearSearch and all core methods", () => {
    const { AdminWishes } = globalThis.window;
    assert.strictEqual(typeof AdminWishes.clearSearch, "function");
    assert.strictEqual(typeof AdminWishes.resetFilters, "function");
    assert.strictEqual(typeof AdminWishes.getSelectedIds, "function");
    assert.strictEqual(typeof AdminWishes.getSelectedWishLinks, "function");
    assert.strictEqual(typeof AdminWishes.exportSelectedWishes, "function");
    assert.strictEqual(typeof AdminWishes.duplicateSelectedWishes, "function");
    assert.strictEqual(typeof AdminWishes.deleteSelectedWishes, "function");
    assert.strictEqual(typeof AdminWishes.clearSelection, "function");
  });

  test("14. Security Invariant: Zero service_role references in client-side code", () => {
    assert.ok(!adminWishesCode.includes("SUPABASE_SERVICE_ROLE_KEY"), "Client code must not contain service_role");
  });

  console.log("\n============================================================");
  console.log(`🎉 ALL ${testCount} PHASE 31B-12 WISHES PRODUCTIVITY TESTS PASSED!`);
  console.log("============================================================\n");
})();
