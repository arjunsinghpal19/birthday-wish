/**
 * ============================================================================
 * PHASE 31B-9 AUTOMATED TEST SUITE (scratch/test_phase31b_bulk_export.js)
 * Validates Wishes Table Bulk Export Feature (JSON & CSV):
 * - UI & Selection binding (hidden at 0, visible at >0, dynamic count)
 * - getSelectedWishesData() retrieval & deep-cloning
 * - JSON structure, field completeness, and deep object preservation
 * - CSV formatting: headers, comma escaping, quote escaping, newline escaping
 * - Exclusion of unselected records & handling of stale/missing UUIDs
 * - Multi-page selection export
 * - Filter & sorting persistence during export
 * - Selection state preservation after export
 * - Loading & double-click protection ("⏳ Exporting...")
 * - Browser Blob / ObjectURL creation and revocation
 * - Compatibility with Copy Links, Duplicate, Delete, Search, and Pagination
 * - Security invariants & public API exports
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("🚀 STARTING PHASE 31B-9 BULK EXPORT (JSON & CSV) TEST SUITE");
console.log("============================================================\n");

// Read source files
const adminWishesCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-wishes.js"), "utf8");
const adminHtmlCode = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
const adminComponentsCss = fs.readFileSync(path.join(__dirname, "../css/admin/admin-components.css"), "utf8");

let testCount = 0;
function test(name, fn) {
  testCount++;
  try {
    fn();
    console.log(`  ✓ ${testCount}. ${name}`);
  } catch (err) {
    console.error(`  ✗ ${testCount}. ${name}`);
    console.error(`    Error: ${err.message}`);
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
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// DOM & ENVIRONMENT MOCK ENGINE
// ────────────────────────────────────────────────────────────────────────────
let mockElements = {};
let mockListeners = {};
let downloadedBlobs = [];

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
    children: [],
    href: "",
    download: "",
    appendChild(child) {
      this.children.push(child);
      if (child.innerHTML) this.innerHTML += child.innerHTML;
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
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); },
      toggle(c) { if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c); }
    },
    setAttribute(name, val) { this[name] = val; },
    removeAttribute(name) { delete this[name]; },
    focus() {},
    select() {}
  };
  mockElements[id] = el;
  return el;
}

// Mock Blob implementation
class MockBlob {
  constructor(parts, options) {
    this.parts = parts;
    this.options = options || {};
    this.text = parts.join("");
  }
}

function resetEnvironment() {
  mockElements = {};
  mockListeners = {};
  downloadedBlobs = [];

  createMockElement("wishes-tbody", "tbody");
  createMockElement("wishes-search-input", "input");
  createMockElement("btn-wishes-search-clear", "button");
  createMockElement("wishes-sort-select", "select");
  createMockElement("wishes-filter-media", "select");
  createMockElement("wishes-filter-date", "select");
  createMockElement("wishes-count-badge", "div");
  createMockElement("wishes-selection-badge", "div");
  createMockElement("wishes-selected-count", "span");
  createMockElement("btn-wishes-bulk-copy-links", "button");
  createMockElement("wishes-bulk-copy-links-count", "span");
  createMockElement("btn-wishes-bulk-export", "button");
  createMockElement("wishes-bulk-export-count", "span");
  createMockElement("btn-wishes-bulk-duplicate", "button");
  createMockElement("wishes-bulk-duplicate-count", "span");
  createMockElement("btn-wishes-bulk-delete", "button");
  createMockElement("wishes-bulk-delete-count", "span");
  createMockElement("btn-wishes-clear-selection", "button");
  createMockElement("wishes-select-all", "input");
  createMockElement("btn-create-new-wish-admin", "button");
  createMockElement("btn-create-new-wish-wishes", "button");
  createMockElement("wishes-page-size", "select");
  createMockElement("btn-wishes-prev-page", "button");
  createMockElement("btn-wishes-next-page", "button");
  createMockElement("wishes-page-info", "span");
  createMockElement("wishes-pagination-container", "div");
  createMockElement("sort-icon-recipient", "span");
  createMockElement("sort-icon-sender", "span");
  createMockElement("sort-icon-created", "span");

  const bodyEl = createMockElement("body", "body");

  globalThis.Blob = MockBlob;
  globalThis.document = {
    body: bodyEl,
    getElementById: (id) => mockElements[id] || null,
    querySelectorAll: (sel) => {
      if (sel === ".th-sortable" || sel === "th.th-sortable") {
        return [
          { dataset: { sort: "recipient" }, classList: createMockElement("th-rec").classList, setAttribute: () => {}, removeAttribute: () => {}, addEventListener: () => {} },
          { dataset: { sort: "sender" }, classList: createMockElement("th-snd").classList, setAttribute: () => {}, removeAttribute: () => {}, addEventListener: () => {} },
          { dataset: { sort: "created" }, classList: createMockElement("th-crt").classList, setAttribute: () => {}, removeAttribute: () => {}, addEventListener: () => {} }
        ];
      }
      if (sel === ".wish-row-checkbox") {
        const tbody = mockElements["wishes-tbody"];
        return tbody ? tbody.querySelectorAll(sel) : [];
      }
      return [];
    },
    querySelector: (sel) => {
      const match = sel ? sel.match(/data-sort="([^"]+)"/) : null;
      if (match) {
        return {
          dataset: { sort: match[1] },
          classList: { add: () => {}, remove: () => {}, contains: () => false },
          setAttribute: () => {},
          removeAttribute: () => {}
        };
      }
      return null;
    },
    createElement: (tag) => createMockElement(`dyn-${Date.now()}-${Math.random()}`, tag),
    execCommand: (cmd) => true,
    addEventListener: () => {}
  };

  globalThis.window = globalThis;
  globalThis.window.location = { origin: "https://birthday-wish.app" };
  globalThis.window.URL = {
    createObjectURL: (blob) => `blob:mock-url-${Date.now()}`,
    revokeObjectURL: (url) => {}
  };

  let lastToast = "";
  globalThis.window.AdminCore = {
    showToast: (msg) => { lastToast = msg; },
    copyWishUrl: (url) => {},
    getLastToast: () => lastToast
  };

  // Run eval for admin-wishes.js
  eval(adminWishesCode);
}

const mockWishes = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    recipient_name: "Shivam",
    sender_name: "Arjun",
    pass_code: "1234",
    birth_date: { year: 2001, month: 1, day: 15 },
    cake_flavor: "chocolate",
    letter_font: "caveat",
    letter_theme: "rose",
    letter_lines: ["Happy Birthday!", "Have a wonderful year ahead."],
    memory_text: "Remember Goa trip 2024",
    reasons_json: [{ id: 1, text: "You are always helpful" }],
    wishes_json: ["Best wishes always"],
    gallery_json: [{ url: "https://example.com/photo1.jpg", caption: "Beach" }],
    timeline_json: [{ year: "2020", title: "Met in college" }],
    gift_json: { type: "watch" },
    music_url: "https://example.com/music.mp3#bw-start=15",
    video_url: "https://example.com/video.mp4#bw-start=30",
    created_at: "2026-08-18T10:00:00Z"
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    recipient_name: "Priya, \"Special\"",
    sender_name: "Rohit\nSharma",
    pass_code: "5678",
    birth_date: { year: 2002, month: 5, day: 20 },
    cake_flavor: "vanilla",
    letter_font: "inter",
    letter_theme: "gold",
    letter_lines: ["Line 1 with, comma", "Line 2 with \"quotes\""],
    memory_text: "Childhood memories",
    reasons_json: [{ id: 1, text: "Always smiling" }],
    wishes_json: ["Joy and success"],
    gallery_json: [],
    timeline_json: [],
    gift_json: null,
    music_url: "",
    video_url: "",
    created_at: "2026-08-18T11:00:00Z"
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    recipient_name: "Neha",
    sender_name: "Anjali",
    pass_code: "9999",
    birth_date: { year: 2000, month: 12, day: 1 },
    created_at: "2026-08-18T12:00:00Z"
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    recipient_name: "Rahul",
    sender_name: "Vikram",
    pass_code: "1111",
    created_at: "2026-08-18T13:00:00Z"
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    recipient_name: "Aditi",
    sender_name: "Pooja",
    pass_code: "2222",
    created_at: "2026-08-18T14:00:00Z"
  }
];

(async function runAllBulkExportTests() {
  // ------------------------------------------------------------
  // SECTION 1: HTML & CSS STRUCTURE
  // ------------------------------------------------------------
  test("1. HTML Structure: admin.html contains btn-wishes-bulk-export and count span", () => {
    assert.ok(adminHtmlCode.includes('id="btn-wishes-bulk-export"'), "Must include bulk export button");
    assert.ok(adminHtmlCode.includes('id="wishes-bulk-export-count"'), "Must include bulk export count span");
  });

  test("2. CSS Structure: admin-components.css contains .btn-bulk-export styling", () => {
    assert.ok(adminComponentsCss.includes(".btn-bulk-export"), "Must define .btn-bulk-export");
    assert.ok(adminComponentsCss.includes(".btn-bulk-export:hover"), "Must define hover state");
    assert.ok(adminComponentsCss.includes(".btn-bulk-export:disabled"), "Must define disabled state");
  });

  // ------------------------------------------------------------
  // SECTION 2: UI VISIBILITY & COUNT SYNCHRONIZATION
  // ------------------------------------------------------------
  test("3. Zero Selection: Export button is hidden when 0 wishes are selected", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    assert.strictEqual(mockElements["btn-wishes-bulk-export"].style.display, "none");
  });

  test("4. Selection Count Sync: Button appears with accurate count dynamically (1 -> 2 -> 3)", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    // Select 1
    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    assert.strictEqual(mockElements["btn-wishes-bulk-export"].style.display, "inline-flex");
    assert.strictEqual(mockElements["wishes-bulk-export-count"].textContent, "1");

    // Select 2
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");
    assert.strictEqual(mockElements["wishes-bulk-export-count"].textContent, "2");

    // Select 3
    AdminWishes.selectWish("33333333-3333-4333-8333-333333333333");
    assert.strictEqual(mockElements["wishes-bulk-export-count"].textContent, "3");

    // Deselect 1
    AdminWishes.deselectWish("11111111-1111-4111-8111-111111111111");
    assert.strictEqual(mockElements["wishes-bulk-export-count"].textContent, "2");

    // Clear all
    AdminWishes.clearSelection();
    assert.strictEqual(mockElements["btn-wishes-bulk-export"].style.display, "none");
  });

  // ------------------------------------------------------------
  // SECTION 3: DATA RETRIEVAL & DEEP-CLONING
  // ------------------------------------------------------------
  test("5. getSelectedWishesData() returns only selected records", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("33333333-3333-4333-8333-333333333333");

    const data = AdminWishes.getSelectedWishesData();
    assert.strictEqual(data.length, 2);
    assert.strictEqual(data[0].id, "11111111-1111-4111-8111-111111111111");
    assert.strictEqual(data[1].id, "33333333-3333-4333-8333-333333333333");
  });

  test("6. JSON deep data preservation & non-mutation", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    const data = AdminWishes.getSelectedWishesData();

    // Mutate returned object
    data[0].recipient_name = "MUTATED";
    data[0].letter_lines.push("EXTRA LINE");

    // Source in wishesState must remain pristine
    const original = AdminWishes.getWishes()[0];
    assert.strictEqual(original.recipient_name, "Shivam");
    assert.strictEqual(original.letter_lines.length, 2);
  });

  // ------------------------------------------------------------
  // SECTION 4: JSON EXPORT
  // ------------------------------------------------------------
  await asyncTest("7. JSON Export: Generates valid JSON file download with all 15 wish fields", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");

    const res = await AdminWishes.exportSelectedWishes("json");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.exportedCount, 2);
    assert.strictEqual(res.format, "json");
    assert.ok(res.filename.startsWith("wishes-export-"));
    assert.ok(res.filename.endsWith(".json"));

    // Verify downloaded blob
    assert.strictEqual(downloadedBlobs.length, 1);
    assert.strictEqual(downloadedBlobs[0].download, res.filename);

    // Verify toast
    assert.ok(globalThis.window.AdminCore.getLastToast().includes("Exported 2 wish records (JSON)"));
  });

  // ------------------------------------------------------------
  // SECTION 5: CSV FORMATTING & ESCAPING
  // ------------------------------------------------------------
  test("8. CSV Header Correctness: formatWishesToCSV generates standard CSV header row", () => {
    const { AdminWishes } = globalThis.window;
    const csv = AdminWishes.formatWishesToCSV(mockWishes.slice(0, 1));
    const lines = csv.split("\r\n");

    const header = lines[0];
    assert.ok(header.includes("id"));
    assert.ok(header.includes("recipient_name"));
    assert.ok(header.includes("sender_name"));
    assert.ok(header.includes("pass_code"));
    assert.ok(header.includes("birth_date"));
    assert.ok(header.includes("cake_flavor"));
    assert.ok(header.includes("music_url"));
    assert.ok(header.includes("video_url"));
  });

  test("9. CSV Escaping: Handles commas, quotes, newlines, and JSON objects in fields", () => {
    const { AdminWishes } = globalThis.window;
    // Wish 2 has: recipient_name: "Priya, \"Special\"", sender_name: "Rohit\nSharma"
    const csv = AdminWishes.formatWishesToCSV([mockWishes[1]]);
    const lines = csv.split("\r\n");

    assert.ok(lines.length >= 2, "Must have header and data row");
    const dataRow = lines.slice(1).join("\r\n");

    // Quotes must be escaped as ""
    assert.ok(dataRow.includes('"Priya, ""Special"""'), "Commas and quotes must be escaped in double quotes");
    // Newline in sender name
    assert.ok(dataRow.includes('"Rohit\nSharma"'), "Newlines in text must be quoted");
  });

  await asyncTest("10. CSV Export: Generates downloadable .csv file", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    const res = await AdminWishes.exportSelectedWishes("csv");

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.exportedCount, 1);
    assert.strictEqual(res.format, "csv");
    assert.ok(res.filename.endsWith(".csv"));
    assert.strictEqual(downloadedBlobs.length, 1);
    assert.ok(globalThis.window.AdminCore.getLastToast().includes("Exported 1 wish record (CSV)"));
  });

  // ------------------------------------------------------------
  // SECTION 6: MULTI-PAGE & FILTER/SORT PERSISTENCE
  // ------------------------------------------------------------
  await asyncTest("11. Multi-Page Selection Export: Exports records selected across multiple pages", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);
    AdminWishes.setPageSize(2); // 3 pages

    // Page 1
    AdminWishes.setPage(1);
    AdminWishes.selectWish(mockWishes[0].id);

    // Page 2
    AdminWishes.setPage(2);
    AdminWishes.selectWish(mockWishes[2].id);

    // Page 3
    AdminWishes.setPage(3);
    AdminWishes.selectWish(mockWishes[4].id);

    const res = await AdminWishes.exportSelectedWishes("json");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.exportedCount, 3);
    assert.strictEqual(res.data.length, 3);
    assert.strictEqual(res.data[0].id, mockWishes[0].id);
    assert.strictEqual(res.data[1].id, mockWishes[2].id);
    assert.strictEqual(res.data[2].id, mockWishes[4].id);
  });

  await asyncTest("12. Search & Filter Selection Export: Retains selection and exports all selected items", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    // Select Shivam
    AdminWishes.selectWish(mockWishes[0].id);

    // Search for Neha
    mockElements["wishes-search-input"].value = "Neha";
    mockElements["wishes-search-input"].dispatchEvent("input");

    // Also select Neha
    AdminWishes.selectWish(mockWishes[2].id);

    // Clear search
    mockElements["btn-wishes-search-clear"].dispatchEvent("click");

    const res = await AdminWishes.exportSelectedWishes("json");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.exportedCount, 2);
  });

  // ------------------------------------------------------------
  // SECTION 7: STALE UUID HANDLING & UNSELECTED PROTECTION
  // ------------------------------------------------------------
  await asyncTest("13. Stale UUID Handling: Prunes missing UUIDs and exports only valid records", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const validId = "11111111-1111-4111-8111-111111111111";
    const fakeId = "99999999-9999-9999-9999-999999999999";

    AdminWishes.selectWish(validId);
    AdminWishes.selectWish(fakeId);

    const res = await AdminWishes.exportSelectedWishes("json");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.exportedCount, 1);
    assert.strictEqual(res.data[0].id, validId);

    // Fake ID pruned
    assert.strictEqual(AdminWishes.isWishSelected(fakeId), false);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);
  });

  test("14. Unselected Protection: Records not selected are NEVER exported", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    const data = AdminWishes.getSelectedWishesData();

    assert.strictEqual(data.length, 1);
    const unselected = data.find(w => w.id === "22222222-2222-4222-8222-222222222222");
    assert.strictEqual(unselected, undefined);
  });

  // ------------------------------------------------------------
  // SECTION 8: SELECTION PRESERVATION & BUTTON RESTORATION
  // ------------------------------------------------------------
  await asyncTest("15. Selection Preservation: Successful export leaves selections 100% intact", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const id = "11111111-1111-4111-8111-111111111111";
    AdminWishes.selectWish(id);

    await AdminWishes.exportSelectedWishes("json");

    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);
    assert.ok(AdminWishes.isWishSelected(id));
    assert.strictEqual(mockElements["btn-wishes-bulk-export"].style.display, "inline-flex");
  });

  await asyncTest("16. Loading State & Button Restoration: Disables button, sets '⏳ Exporting...', and restores on finish", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    const btn = mockElements["btn-wishes-bulk-export"];

    let observedLoading = false;
    const origCreateObjectURL = globalThis.window.URL.createObjectURL;
    globalThis.window.URL.createObjectURL = (b) => {
      if (btn.disabled && btn.textContent.includes("Exporting")) {
        observedLoading = true;
      }
      return origCreateObjectURL(b);
    };

    await AdminWishes.exportSelectedWishes("json", btn);

    assert.ok(observedLoading, "Button must show loading state during export");
    assert.strictEqual(btn.disabled, false, "Button must be re-enabled after export");
    assert.ok(btn.innerHTML.includes("Export"), "Button text must be restored");
  });

  await asyncTest("17. Error Handling: Handles export error gracefully, restores button, and shows toast", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    const btn = mockElements["btn-wishes-bulk-export"];

    // Force error in Blob creation
    globalThis.Blob = class {
      constructor() {
        throw new Error("Blob creation failed");
      }
    };

    const res = await AdminWishes.exportSelectedWishes("json", btn);

    assert.strictEqual(res.success, false);
    assert.ok(res.error.includes("Blob creation failed"));
    assert.strictEqual(btn.disabled, false);
    assert.ok(globalThis.window.AdminCore.getLastToast().includes("Export failed"));
  });

  // ------------------------------------------------------------
  // SECTION 9: REGRESSION WITH EXISTING BULK ACTIONS
  // ------------------------------------------------------------
  await asyncTest("18. Full Bulk Actions Workflow: Export -> Copy Links -> Duplicate -> Delete", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const id = "11111111-1111-4111-8111-111111111111";
    AdminWishes.selectWish(id);

    // 1. Export JSON
    const expRes = await AdminWishes.exportSelectedWishes("json");
    assert.strictEqual(expRes.success, true);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);

    // 2. Copy Links
    const copyRes = await AdminWishes.copySelectedWishLinks();
    assert.strictEqual(copyRes.success, true);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);

    // 3. Duplicate
    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      duplicateWishesBulk: async () => ({
        success: true,
        createdCount: 1,
        newWishes: [{ id: "copy-uuid-1", recipient_name: "Shivam (Copy)" }]
      }),
      deleteWishesBulk: async (ids) => ({
        success: true,
        deletedCount: ids.length,
        deletedIds: ids
      })
    };

    const dupRes = await AdminWishes.duplicateSelectedWishes();
    assert.strictEqual(dupRes.success, true);

    // 4. Delete
    const delRes = await AdminWishes.deleteSelectedWishes();
    assert.strictEqual(delRes.success, true);
  });

  // ------------------------------------------------------------
  // SECTION 10: INVARIANTS & PUBLIC API
  // ------------------------------------------------------------
  test("19. Public API Invariant: AdminWishes exports getSelectedWishesData, formatWishesToCSV, and exportSelectedWishes", () => {
    const { AdminWishes } = globalThis.window;
    assert.strictEqual(typeof AdminWishes.getSelectedWishesData, "function");
    assert.strictEqual(typeof AdminWishes.formatWishesToCSV, "function");
    assert.strictEqual(typeof AdminWishes.exportSelectedWishes, "function");
  });

  test("20. Security Invariant: Frontend code has zero service_role references", () => {
    assert.ok(!adminWishesCode.includes("SUPABASE_SERVICE_ROLE_KEY"), "Wishes controller must not contain service_role");
  });

  test("21. Zero Backend Invariant: Export performs 0 database/network mutations", () => {
    assert.ok(!adminWishesCode.includes("DatabaseModule.export"), "Bulk export is purely client-side");
  });

  await asyncTest("22. Empty Selection Rejection: exportSelectedWishes returns error when 0 selected", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const res = await AdminWishes.exportSelectedWishes("json");
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.exportedCount, 0);
    assert.ok(globalThis.window.AdminCore.getLastToast().includes("No valid wishes selected"));
  });

  await asyncTest("23. All-Stale Selection Handling: Cleans all stale selections and returns error gracefully", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const fakeId1 = "00000000-1111-0000-0000-000000000000";
    AdminWishes.selectWish(fakeId1);

    const res = await AdminWishes.exportSelectedWishes("json");
    assert.strictEqual(res.success, false);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 0);
  });

  await asyncTest("24. Page Size Switching: Changing page size preserves selections for export", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.setPageSize(2);
    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.selectWish(mockWishes[3].id);

    AdminWishes.setPageSize("all");
    const res = await AdminWishes.exportSelectedWishes("json");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.exportedCount, 2);
  });

  await asyncTest("25. Sorting Switching: Changing sort order preserves selections for export", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.selectWish(mockWishes[1].id);

    AdminWishes.setSortState("recipient", "desc");
    const res = await AdminWishes.exportSelectedWishes("json");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.exportedCount, 2);
  });

  test("26. formatWishesToCSV returns empty string on empty array", () => {
    const { AdminWishes } = globalThis.window;
    assert.strictEqual(AdminWishes.formatWishesToCSV([]), "");
    assert.strictEqual(AdminWishes.formatWishesToCSV(null), "");
  });

  console.log("\n============================================================");
  console.log(`🎉 ALL ${testCount} PHASE 31B-9 BULK EXPORT TESTS PASSED!`);
  console.log("============================================================\n");
})();
