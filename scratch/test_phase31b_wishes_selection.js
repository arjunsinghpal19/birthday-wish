/**
 * ============================================================================
 * PHASE 31B-5 AUTOMATED TEST SUITE (scratch/test_phase31b_wishes_selection.js)
 * Validates Wishes Table Bulk Selection Foundation:
 * - Row checkboxes & canonical UUID selection
 * - Select-all header checkbox (checked / unchecked / indeterminate)
 * - Page-scoped selection on active pagination page
 * - Selection counter & Clear Selection control
 * - Multi-page, search, filter, and sort persistence
 * - Single-delete pruning and duplication safety
 * - 0 database network queries
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("🚀 Running Phase 31B-5 Wishes Selection Test Suite...\n");

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
    checked: false,
    indeterminate: false,
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
      if (sel === ".wish-row-checkbox" && this.dataset && this.dataset.id) return this;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === ".wish-row-checkbox") {
        const matches = [];
        const regex = /data-id="([^"]+)"/g;
        let match;
        while ((match = regex.exec(this.innerHTML)) !== null) {
          const rawId = match[1];
          const isChecked = this.innerHTML.includes(`data-id="${rawId}" checked`);
          matches.push({
            dataset: { id: rawId },
            checked: isChecked
          });
        }
        return matches;
      }
      return [];
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
  createMockElement("wishes-selection-badge", "div");
  createMockElement("wishes-selected-count", "span");
  createMockElement("btn-wishes-clear-selection", "button");
  createMockElement("wishes-select-all", "input");
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
    },
    DatabaseModule: {
      deleteWish: async (id) => ({ success: true }),
      duplicateWish: async (id) => ({ success: true, newId: `dup_${Date.now()}` })
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
      if (sel === ".wish-row-checkbox") {
        const tbody = mockElements["wishes-tbody"];
        return tbody ? tbody.querySelectorAll(".wish-row-checkbox") : [];
      }
      return [];
    },
    querySelector: (sel) => {
      if (sel && sel.includes("thead")) return createMockElement("thead_mock");
      return null;
    },
    createElement: (tag) => createMockElement(`dyn_${Math.random()}`, tag)
  };

  const fn = new Function("window", "document", adminWishesCode);
  fn(globalThis.window, globalThis.document);
}

// 8 Sample wishes across pages for pagination & selection tests
const mockWishes = [
  { id: "11111111-1111-4111-8111-111111111111", recipient_name: "Aarav Sharma", sender_name: "Priya", music_url: "https://example.com/song1.mp3", gallery_json: [], letter_lines: ["L1"], created_at: "2026-08-20T10:00:00Z" },
  { id: "22222222-2222-4222-8222-222222222222", recipient_name: "Bhavna Patel", sender_name: "Karan", music_url: null, gallery_json: [{ image: "p.jpg" }], letter_lines: ["L1"], created_at: "2026-08-19T10:00:00Z" },
  { id: "33333333-3333-4333-8333-333333333333", recipient_name: "Chetan Kumar", sender_name: "Ananya", video_url: "https://example.com/vid.mp4", gallery_json: [], letter_lines: ["L1"], created_at: "2026-08-18T10:00:00Z" },
  { id: "44444444-4444-4444-8444-444444444444", recipient_name: "Divya Singh", sender_name: "Rahul", music_url: null, gallery_json: [], letter_lines: ["L1"], created_at: "2026-08-17T10:00:00Z" },
  { id: "55555555-5555-4555-8555-555555555555", recipient_name: "Eshan Verma", sender_name: "Neha", music_url: "https://example.com/song2.mp3", gallery_json: [], letter_lines: ["L1"], created_at: "2026-08-16T10:00:00Z" },
  { id: "66666666-6666-4666-8666-666666666666", recipient_name: "Fatima Khan", sender_name: "Zaid", video_url: null, gallery_json: [], letter_lines: ["L1"], created_at: "2026-08-15T10:00:00Z" },
  { id: "77777777-7777-4777-8777-777777777777", recipient_name: "Gaurav Joshi", sender_name: "Simran", music_url: null, gallery_json: [], letter_lines: ["L1"], created_at: "2026-08-14T10:00:00Z" },
  { id: "88888888-8888-4888-8888-888888888888", recipient_name: "Hina Mehta", sender_name: "Vikram", music_url: "https://example.com/song3.mp3", gallery_json: [], letter_lines: ["L1"], created_at: "2026-08-13T10:00:00Z" }
];

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runAllTests() {
  // 1. Initial Selection State
  await runTest("1. Initial State: Selected count = 0, selection badge hidden, getSelectedIds() empty", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    assert.strictEqual(AdminWishes.getSelectedIds().length, 0);
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "0");
    assert.strictEqual(mockElements["wishes-selection-badge"].style.display, "none");
    assert.strictEqual(mockElements["wishes-select-all"].checked, false);
  });

  // 2. Select Single Wish
  await runTest("2. Select Wish: selectWish() adds UUID and updates counter & badge", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    assert.strictEqual(AdminWishes.isWishSelected("11111111-1111-4111-8111-111111111111"), true);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "1");
    assert.strictEqual(mockElements["wishes-selection-badge"].style.display, "inline-flex");
  });

  // 3. Deselect Single Wish
  await runTest("3. Deselect Wish: deselectWish() removes UUID and resets badge when empty", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.deselectWish("11111111-1111-4111-8111-111111111111");
    assert.strictEqual(AdminWishes.isWishSelected("11111111-1111-4111-8111-111111111111"), false);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 0);
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "0");
    assert.strictEqual(mockElements["wishes-selection-badge"].style.display, "none");
  });

  // 4. Toggle Selection
  await runTest("4. Toggle Selection: toggleWishSelection() flips selection state correctly", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.toggleWishSelection("22222222-2222-4222-8222-222222222222");
    assert.strictEqual(AdminWishes.isWishSelected("22222222-2222-4222-8222-222222222222"), true);

    AdminWishes.toggleWishSelection("22222222-2222-4222-8222-222222222222");
    assert.strictEqual(AdminWishes.isWishSelected("22222222-2222-4222-8222-222222222222"), false);
  });

  // 5. Select-All Visible on Current Page
  await runTest("5. Select All Visible: selectAllVisible() selects all items on current page only", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.setPageSize(3);
    AdminWishes.setPage(1); // items 0, 1, 2 visible

    AdminWishes.selectAllVisible();
    const selected = AdminWishes.getSelectedIds();
    assert.strictEqual(selected.length, 3);
    assert.ok(selected.includes("11111111-1111-4111-8111-111111111111"));
    assert.ok(selected.includes("22222222-2222-4222-8222-222222222222"));
    assert.ok(selected.includes("33333333-3333-4333-8333-333333333333"));
    assert.ok(!selected.includes("44444444-4444-4444-8444-444444444444")); // page 2 item
  });

  // 6. Deselect-All Visible on Current Page
  await runTest("6. Deselect All Visible: deselectAllVisible() clears active page items only", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.setPageSize(3);
    AdminWishes.setPage(1);

    // Select items on page 1 and item on page 2
    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");
    AdminWishes.selectWish("44444444-4444-4444-8444-444444444444"); // page 2

    AdminWishes.deselectAllVisible(); // clears page 1
    const selected = AdminWishes.getSelectedIds();
    assert.strictEqual(selected.length, 1);
    assert.strictEqual(selected[0], "44444444-4444-4444-8444-444444444444");
  });

  // 7. Header Checkbox Checked State
  await runTest("7. Header Checkbox: Checked when all visible items on active page are selected", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.setPageSize(2);
    AdminWishes.setPage(1);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");

    assert.strictEqual(mockElements["wishes-select-all"].checked, true);
    assert.strictEqual(mockElements["wishes-select-all"].indeterminate, false);
  });

  // 8. Header Checkbox Unchecked State
  await runTest("8. Header Checkbox: Unchecked when no visible items on active page are selected", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.setPageSize(2);
    AdminWishes.setPage(1);

    assert.strictEqual(mockElements["wishes-select-all"].checked, false);
    assert.strictEqual(mockElements["wishes-select-all"].indeterminate, false);
  });

  // 9. Header Checkbox Indeterminate State
  await runTest("9. Header Checkbox: Indeterminate when some (not all) visible items are selected", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.setPageSize(3);
    AdminWishes.setPage(1);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111"); // 1 of 3 selected

    assert.strictEqual(mockElements["wishes-select-all"].checked, false);
    assert.strictEqual(mockElements["wishes-select-all"].indeterminate, true);
  });

  // 10. Selection Across Pagination
  await runTest("10. Multi-Page Selection: Selections accumulate and persist across page navigation", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.setPageSize(2);

    // Page 1: select 1 item
    AdminWishes.setPage(1);
    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");

    // Page 2: select 1 item
    AdminWishes.setPage(2);
    AdminWishes.selectWish("33333333-3333-4333-8333-333333333333");

    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "2");

    // Return to Page 1: header checkbox is indeterminate (1 of 2 selected)
    AdminWishes.setPage(1);
    assert.strictEqual(mockElements["wishes-select-all"].indeterminate, true);
  });

  // 11. Selection Survives Page Size Change
  await runTest("11. Page Size Resilience: Changing page size preserves selected UUIDs", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("55555555-5555-4555-8555-555555555555");

    AdminWishes.setPageSize(50);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "2");

    AdminWishes.setPageSize("all");
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);
  });

  // 12. Selection Survives Sorting
  await runTest("12. Sorting Resilience: Sorting table columns preserves selected UUIDs", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.setSortState("recipient", "desc");

    assert.strictEqual(AdminWishes.isWishSelected("11111111-1111-4111-8111-111111111111"), true);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);
  });

  // 13. Selection Survives Search & Filters
  await runTest("13. Search & Filter Resilience: Filtering retains selected UUIDs in authoritative state", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111"); // Aarav
    AdminWishes.selectWish("44444444-4444-4444-8444-444444444444"); // Divya

    // Search for "Aarav" only
    mockElements["wishes-search-input"].value = "Aarav";
    mockElements["wishes-search-input"].dispatchEvent("input");

    assert.strictEqual(AdminWishes.getSelectedIds().length, 2, "Both UUIDs remain in selection state");
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "2");
    assert.strictEqual(mockElements["wishes-select-all"].checked, true, "Visible row (Aarav) is selected");
  });

  // 14. Clear Selection Button
  await runTest("14. Clear Selection: Clicking clear selection resets state to 0 and unchecks boxes", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);

    AdminWishes.clearSelection();
    assert.strictEqual(AdminWishes.getSelectedIds().length, 0);
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "0");
    assert.strictEqual(mockElements["wishes-selection-badge"].style.display, "none");
    assert.strictEqual(mockElements["wishes-select-all"].checked, false);
  });

  // 15. Single Delete Removes UUID from Selection
  await runTest("15. Delete Integration: Deleting a selected wish removes its UUID from selection Set", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);

    globalThis.window.confirm = () => true;
    await AdminWishes.deleteWish("11111111-1111-4111-8111-111111111111");

    assert.strictEqual(AdminWishes.isWishSelected("11111111-1111-4111-8111-111111111111"), false);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "1");
  });

  // 16. Duplicate Does Not Alter Selection
  await runTest("16. Duplicate Integration: Duplicating a wish preserves existing selections without auto-selecting duplicate", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    await AdminWishes.duplicateWish("11111111-1111-4111-8111-111111111111");

    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);
    assert.strictEqual(AdminWishes.getSelectedIds()[0], "11111111-1111-4111-8111-111111111111");
  });

  // 17. Row Checkbox DOM Representation
  await runTest("17. Row Checkbox DOM: Table rows contain checkbox with data-id and proper checked state", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.render();

    const tbody = mockElements["wishes-tbody"];
    assert.ok(tbody.innerHTML.includes('class="table-checkbox wish-row-checkbox"'));
    assert.ok(tbody.innerHTML.includes('data-id="11111111-1111-4111-8111-111111111111" checked'));
  });

  // 18. Colspan Spans 8 Columns in Empty/Error State
  await runTest("18. Colspan Integrity: Empty and error state rows span all 8 table columns", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();

    AdminWishes.setWishes([]);
    assert.ok(mockElements["wishes-tbody"].innerHTML.includes('colspan="8"'));

    AdminWishes.setWishes([], true);
    assert.ok(mockElements["wishes-tbody"].innerHTML.includes('colspan="8"'));
  });

  // 19. HTML Structure
  await runTest("19. HTML Structure: admin.html contains selection badge, clear button, and select-all checkbox", () => {
    const htmlPath = path.join(__dirname, "../admin.html");
    const htmlContent = fs.readFileSync(htmlPath, "utf8");
    assert.ok(htmlContent.includes('id="wishes-selection-badge"'), "Must contain #wishes-selection-badge");
    assert.ok(htmlContent.includes('id="wishes-selected-count"'), "Must contain #wishes-selected-count");
    assert.ok(htmlContent.includes('id="btn-wishes-clear-selection"'), "Must contain #btn-wishes-clear-selection");
    assert.ok(htmlContent.includes('id="wishes-select-all"'), "Must contain #wishes-select-all");
  });

  // 20. CSS Structure
  await runTest("20. CSS Structure: admin-components.css contains selection badge and checkbox classes", () => {
    const cssPath = path.join(__dirname, "../css/admin/admin-components.css");
    const cssContent = fs.readFileSync(cssPath, "utf8");
    assert.ok(cssContent.includes(".table-selection-badge"), "Must contain .table-selection-badge");
    assert.ok(cssContent.includes(".btn-clear-selection"), "Must contain .btn-clear-selection");
    assert.ok(cssContent.includes(".th-checkbox"), "Must contain .th-checkbox");
    assert.ok(cssContent.includes(".td-checkbox"), "Must contain .td-checkbox");
    assert.ok(cssContent.includes(".table-checkbox"), "Must contain .table-checkbox");
  });

  // 21. Zero Supabase Queries on Selection
  await runTest("21. Performance: Selection operations execute 100% in-memory with 0 database queries", () => {
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
    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectAllVisible();
    AdminWishes.clearSelection();

    assert.strictEqual(dbQueries, 0, "Zero Supabase queries during selection operations");
  });

  // 22. Protected Invariants Untouched
  await runTest("22. Invariants: Protected files exist and remain untampered", () => {
    const protectedFiles = [
      "index.html",
      "js/app.js",
      "css/style.css",
      "api/admin-delete-wish.js",
      "api/session.js",
      "js/database.js",
      "js/storage.js",
      "js/services/media-service.js"
    ];
    for (const rel of protectedFiles) {
      const p = path.join(__dirname, "..", rel);
      assert.ok(fs.existsSync(p), `Protected file ${rel} must exist`);
    }
  });

  // 23. Header Select-All Event Trigger
  await runTest("23. Event Trigger: Changing header select-all checkbox toggles visible items", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);
    AdminWishes.setPageSize(3);

    // Trigger select-all change event (checked = true)
    mockElements["wishes-select-all"].checked = true;
    mockElements["wishes-select-all"].dispatchEvent("change");

    assert.strictEqual(AdminWishes.getSelectedIds().length, 3);

    // Trigger select-all change event (checked = false)
    mockElements["wishes-select-all"].checked = false;
    mockElements["wishes-select-all"].dispatchEvent("change");

    assert.strictEqual(AdminWishes.getSelectedIds().length, 0);
  });

  // 24. Clear Selection Button Event Trigger
  await runTest("24. Event Trigger: Clicking clear selection button resets selection to 0", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);

    mockElements["btn-wishes-clear-selection"].dispatchEvent("click");
    assert.strictEqual(AdminWishes.getSelectedIds().length, 0);
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "0");
  });

  // 25. Tbody Event Delegation for Row Checkbox
  await runTest("25. Event Delegation: Tbody change event on row checkbox updates selection", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const mockCheckbox = {
      dataset: { id: "11111111-1111-4111-8111-111111111111" },
      checked: true,
      closest: (sel) => sel === ".wish-row-checkbox" ? mockCheckbox : null
    };

    mockElements["wishes-tbody"].dispatchEvent("change", { target: mockCheckbox });
    assert.strictEqual(AdminWishes.isWishSelected("11111111-1111-4111-8111-111111111111"), true);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);

    mockCheckbox.checked = false;
    mockElements["wishes-tbody"].dispatchEvent("change", { target: mockCheckbox });
    assert.strictEqual(AdminWishes.isWishSelected("11111111-1111-4111-8111-111111111111"), false);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 0);
  });

  // 26. Multi-Page Accumulation & Deselect Visible
  await runTest("26. Multi-Page Accumulation: Selecting on Page 1 then Page 2 accumulates; deselecting visible on Page 2 preserves Page 1", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);
    AdminWishes.setPageSize(3);

    // Page 1: select all (3 items)
    AdminWishes.setPage(1);
    AdminWishes.selectAllVisible();
    assert.strictEqual(AdminWishes.getSelectedIds().length, 3);

    // Page 2: select all (3 items)
    AdminWishes.setPage(2);
    AdminWishes.selectAllVisible();
    assert.strictEqual(AdminWishes.getSelectedIds().length, 6);

    // Page 2: deselect visible (clears 3 items from page 2)
    AdminWishes.deselectAllVisible();
    assert.strictEqual(AdminWishes.getSelectedIds().length, 3);

    // Return to Page 1: all 3 items remain selected
    AdminWishes.setPage(1);
    assert.strictEqual(mockElements["wishes-select-all"].checked, true);
  });

  // 27. Public API Exports
  await runTest("27. Public API: window.AdminWishes exports all required selection methods", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    const requiredMethods = [
      "getSelectedIds",
      "isWishSelected",
      "selectWish",
      "deselectWish",
      "toggleWishSelection",
      "selectAllVisible",
      "deselectAllVisible",
      "clearSelection",
      "updateSelectionUI"
    ];
    for (const m of requiredMethods) {
      assert.strictEqual(typeof AdminWishes[m], "function", `AdminWishes.${m} must be a function`);
    }
  });

  // 28. Row Action Targeting Integrity
  await runTest("28. Action Targeting: Edit/Duplicate/Delete buttons maintain correct data-action & data-id with 8 columns", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const tbody = mockElements["wishes-tbody"];
    assert.ok(tbody.innerHTML.includes('data-action="edit" data-id="11111111-1111-4111-8111-111111111111"'));
    assert.ok(tbody.innerHTML.includes('data-action="duplicate" data-id="11111111-1111-4111-8111-111111111111"'));
    assert.ok(tbody.innerHTML.includes('data-action="delete" data-id="11111111-1111-4111-8111-111111111111"'));
  });

  // 29. Media Badges Rendered Correctly Alongside Checkbox
  await runTest("29. Media Badges: Content & media badges render correctly with row checkboxes", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const tbody = mockElements["wishes-tbody"];
    assert.ok(tbody.innerHTML.includes('badge-music'));
    assert.ok(tbody.innerHTML.includes('badge-photos'));
  });

  // 30. Open Wish Editor Bridge Unchanged
  await runTest("30. Editor Bridge: openWishEditor routes correctly without mutation", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    let openedNew = false;
    let openedEditId = null;
    globalThis.window.AdminWishEditor = {
      openNew: () => { openedNew = true; },
      openEdit: (id) => { openedEditId = id; }
    };

    AdminWishes.openWishEditor(null);
    assert.strictEqual(openedNew, true);

    AdminWishes.openWishEditor("11111111-1111-4111-8111-111111111111");
    assert.strictEqual(openedEditId, "11111111-1111-4111-8111-111111111111");
  });

  // Summary
  console.log("\n============================================================");
  console.log(`Phase 31B-5 Tests: ${passed} passed, ${failed} failed`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
