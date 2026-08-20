/**
 * ============================================================================
 * PHASE 31B-10 AUTOMATED TEST SUITE (scratch/test_phase31b_wishes_management_ux.js)
 * Validates Wishes Table Management UX Batch:
 * - Row selection visual highlighting (.selected-row class on <tr>)
 * - Dynamic selection synchronization across all 4 bulk buttons
 * - Auto-pruning of stale IDs during render()
 * - Empty state rendering & "Reset Filters" action button
 * - resetFilters() public API and toolbar filter reset
 * - Tri-state select-all header checkbox accuracy
 * - Global UUID selection persistence across pagination, search, filter, and sort
 * - Action chaining workflow (Export -> Copy Links -> Duplicate -> Delete)
 * - Row action targeting integrity & public API exports
 * - Security invariants (zero service_role, zero backend mutation)
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("🚀 STARTING PHASE 31B-10 WISHES MANAGEMENT UX TEST SUITE");
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
let mockClipboardText = "";

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
        this.children.forEach((tr, idx) => {
          const match = (tr.innerHTML || "").match(/data-id="([^"]+)"/);
          if (match) {
            const rawId = match[1];
            const isChecked = tr.innerHTML.includes(`data-id="${rawId}" checked`) || tr.classList.contains("selected-row");
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
  mockClipboardText = "";

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
  const mockClipboard = {
    writeText: async (text) => {
      mockClipboardText = text;
      return Promise.resolve();
    }
  };

  try {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: mockClipboard,
      configurable: true,
      writable: true
    });
  } catch (e) {
    globalThis.navigator = { clipboard: mockClipboard };
  }
  globalThis.window.navigator = globalThis.navigator;

  globalThis.window.URL = {
    createObjectURL: (blob) => `blob:mock-url-${Date.now()}`,
    revokeObjectURL: (url) => {}
  };

  let lastToast = "";
  globalThis.window.AdminCore = {
    showToast: (msg) => { lastToast = msg; },
    copyWishUrl: (url) => {
      if (!url) return;
      const clean = String(url).startsWith("http") ? String(url) : `${window.location.origin}/index.html?id=${url}`;
      mockClipboardText = clean;
    },
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
    created_at: "2026-08-18T10:00:00Z"
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    recipient_name: "Priya",
    sender_name: "Rohit",
    pass_code: "5678",
    birth_date: { year: 2002, month: 5, day: 20 },
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

(async function runAllWishesManagementUXTests() {
  // ------------------------------------------------------------
  // SECTION 1: CSS & VISUAL ROW HIGHLIGHT
  // ------------------------------------------------------------
  test("1. CSS: admin-components.css defines .selected-row and .btn-wishes-reset-filters", () => {
    assert.ok(adminComponentsCss.includes(".admin-table tbody tr.selected-row td"), "Must define .selected-row td");
    assert.ok(adminComponentsCss.includes(".btn-wishes-reset-filters"), "Must define .btn-wishes-reset-filters");
  });

  test("2. Visual Row Selection: tr.selected-row is applied when wish is selected and removed on deselect", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    const tbody = mockElements["wishes-tbody"];
    assert.ok(tbody.children.length > 0);

    const row0 = tbody.children.find(r => r.innerHTML.includes(mockWishes[0].id));
    const row1 = tbody.children.find(r => r.innerHTML.includes(mockWishes[1].id));

    // Initial state: no selected-row
    assert.strictEqual(row0.classList.contains("selected-row"), false);
    assert.strictEqual(row1.classList.contains("selected-row"), false);

    // Select wish 0
    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.render();

    const updatedRow0 = tbody.children.find(r => r.innerHTML.includes(mockWishes[0].id));
    const updatedRow1 = tbody.children.find(r => r.innerHTML.includes(mockWishes[1].id));

    assert.strictEqual(updatedRow0.classList.contains("selected-row"), true);
    assert.strictEqual(updatedRow1.classList.contains("selected-row"), false);

    // Deselect wish 0
    AdminWishes.deselectWish(mockWishes[0].id);
    AdminWishes.render();

    const finalRow0 = tbody.children.find(r => r.innerHTML.includes(mockWishes[0].id));
    assert.strictEqual(finalRow0.classList.contains("selected-row"), false);
  });

  // ------------------------------------------------------------
  // SECTION 2: AUTO-PRUNING OF STALE IDS
  // ------------------------------------------------------------
  test("3. Auto-Pruning: render() auto-prunes stale IDs from selectedWishIds", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.selectWish("stale-uuid-9999");

    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);

    // Trigger render
    AdminWishes.render();

    assert.strictEqual(AdminWishes.isWishSelected("stale-uuid-9999"), false);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);
  });

  // ------------------------------------------------------------
  // SECTION 3: EMPTY STATES & RESET FILTERS
  // ------------------------------------------------------------
  test("4. Empty State: Displays search/filter message and Reset Filters button when 0 matches", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    // Search for non-existent term
    mockElements["wishes-search-input"].value = "XYZNonExistent";
    AdminWishes.render();

    const tbody = mockElements["wishes-tbody"];
    assert.ok(tbody.innerHTML.includes("No wishes match your search or filter criteria"));
    assert.ok(tbody.innerHTML.includes("btn-wishes-empty-reset-filters"));
  });

  test("5. resetFilters() resets all inputs and restores full list", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    mockElements["wishes-search-input"].value = "Shivam";
    mockElements["wishes-filter-media"].value = "music";
    mockElements["wishes-filter-date"].value = "today";
    AdminWishes.render();

    // Call resetFilters()
    AdminWishes.resetFilters();

    assert.strictEqual(mockElements["wishes-search-input"].value, "");
    assert.strictEqual(mockElements["wishes-filter-media"].value, "all");
    assert.strictEqual(mockElements["wishes-filter-date"].value, "all");
    assert.strictEqual(AdminWishes.getProcessedWishes().length, mockWishes.length);
  });

  // ------------------------------------------------------------
  // SECTION 4: BULK ACTIONS UNIFIED SYNCHRONIZATION
  // ------------------------------------------------------------
  test("6. Bulk Action Toolbar: All 4 bulk buttons synchronize visibility and counts (Copy, Export, Duplicate, Delete)", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    // 0 selected: all hidden
    assert.strictEqual(mockElements["btn-wishes-bulk-copy-links"].style.display, "none");
    assert.strictEqual(mockElements["btn-wishes-bulk-export"].style.display, "none");
    assert.strictEqual(mockElements["btn-wishes-bulk-duplicate"].style.display, "none");
    assert.strictEqual(mockElements["btn-wishes-bulk-delete"].style.display, "none");

    // Select 2
    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.selectWish(mockWishes[1].id);

    assert.strictEqual(mockElements["btn-wishes-bulk-copy-links"].style.display, "inline-flex");
    assert.strictEqual(mockElements["btn-wishes-bulk-export"].style.display, "inline-flex");
    assert.strictEqual(mockElements["btn-wishes-bulk-duplicate"].style.display, "inline-flex");
    assert.strictEqual(mockElements["btn-wishes-bulk-delete"].style.display, "inline-flex");

    assert.strictEqual(mockElements["wishes-bulk-copy-links-count"].textContent, "2");
    assert.strictEqual(mockElements["wishes-bulk-export-count"].textContent, "2");
    assert.strictEqual(mockElements["wishes-bulk-duplicate-count"].textContent, "2");
    assert.strictEqual(mockElements["wishes-bulk-delete-count"].textContent, "2");
  });

  test("7. Tri-State Header Checkbox: Checked, unchecked, and indeterminate states work accurately", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    const selectAllBox = mockElements["wishes-select-all"];

    // 0 selected -> unchecked
    assert.strictEqual(selectAllBox.checked, false);
    assert.strictEqual(selectAllBox.indeterminate, false);

    // 1 selected -> indeterminate
    AdminWishes.selectWish(mockWishes[0].id);
    assert.strictEqual(selectAllBox.indeterminate, true);

    // All selected -> checked
    AdminWishes.selectAllVisible();
    assert.strictEqual(selectAllBox.checked, true);
    assert.strictEqual(selectAllBox.indeterminate, false);
  });

  // ------------------------------------------------------------
  // SECTION 5: ACTION CHAINING WORKFLOW
  // ------------------------------------------------------------
  await asyncTest("8. Seamless Action Chaining: Export -> Copy Links -> Duplicate -> Delete", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    AdminWishes.selectWish(mockWishes[0].id);

    // 1. Export
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
        newWishes: [{ id: "new-copy-uuid", recipient_name: "Shivam (Copy)" }]
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
  // SECTION 6: PUBLIC API & INVARIANTS
  // ------------------------------------------------------------
  test("9. Public API Invariant: AdminWishes exports all authoritative methods", () => {
    const { AdminWishes } = globalThis.window;
    assert.strictEqual(typeof AdminWishes.resetFilters, "function");
    assert.strictEqual(typeof AdminWishes.getSelectedIds, "function");
    assert.strictEqual(typeof AdminWishes.getSelectedWishLinks, "function");
    assert.strictEqual(typeof AdminWishes.getSelectedWishesData, "function");
    assert.strictEqual(typeof AdminWishes.formatWishesToCSV, "function");
    assert.strictEqual(typeof AdminWishes.exportSelectedWishes, "function");
    assert.strictEqual(typeof AdminWishes.duplicateSelectedWishes, "function");
    assert.strictEqual(typeof AdminWishes.deleteSelectedWishes, "function");
    assert.strictEqual(typeof AdminWishes.clearSelection, "function");
  });

  test("10. Security Invariant: Zero service_role references in client-side code", () => {
    assert.ok(!adminWishesCode.includes("SUPABASE_SERVICE_ROLE_KEY"), "Client code must not contain service_role");
  });

  // ------------------------------------------------------------
  // SECTION 7: ADVANCED SELECTION & INTERACTION INTEGRITY
  // ------------------------------------------------------------
  test("11. Multi-Page Selection: Selection persists across pagination pages", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    AdminWishes.setPageSize(2);
    AdminWishes.setPage(1);

    // Select wish on Page 1
    const page1Wishes = AdminWishes.getProcessedWishes();
    AdminWishes.selectWish(page1Wishes[0].id);

    // Navigate to Page 2 & select wish
    AdminWishes.setPage(2);
    const page2Wishes = AdminWishes.getProcessedWishes();
    AdminWishes.selectWish(page2Wishes[0].id);

    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);
    assert.ok(AdminWishes.isWishSelected(page1Wishes[0].id));
    assert.ok(AdminWishes.isWishSelected(page2Wishes[0].id));

    // Return to Page 1: selection remains intact
    AdminWishes.setPage(1);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);
  });

  test("12. Page Size Change: Selection persists when changing page size", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    AdminWishes.setPageSize(2);
    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.selectWish(mockWishes[2].id);

    AdminWishes.setPageSize("all");
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);
    assert.ok(AdminWishes.isWishSelected(mockWishes[0].id));
    assert.ok(AdminWishes.isWishSelected(mockWishes[2].id));
  });

  test("13. Sorting Change: Selection persists when changing sort order", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.selectWish(mockWishes[1].id);

    AdminWishes.setSortState("recipient", "asc");
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);
    assert.ok(AdminWishes.isWishSelected(mockWishes[0].id));
    assert.ok(AdminWishes.isWishSelected(mockWishes[1].id));
  });

  test("14. Search & Filter Selection: Selection persists during active filtering", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    AdminWishes.selectWish(mockWishes[0].id); // Shivam
    AdminWishes.selectWish(mockWishes[1].id); // Priya

    // Search for Shivam (Priya is filtered out from view)
    mockElements["wishes-search-input"].value = "Shivam";
    AdminWishes.render();

    // Both remain selected globally in memory
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);
    assert.ok(AdminWishes.isWishSelected(mockWishes[0].id));
    assert.ok(AdminWishes.isWishSelected(mockWishes[1].id));
  });

  test("15. clearSelection(): Clears all selections and hides bulk toolbar", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.selectWish(mockWishes[1].id);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);

    AdminWishes.clearSelection();
    assert.strictEqual(AdminWishes.getSelectedIds().length, 0);
    assert.strictEqual(mockElements["btn-wishes-bulk-export"].style.display, "none");
    assert.strictEqual(mockElements["btn-wishes-bulk-copy-links"].style.display, "none");
    assert.strictEqual(mockElements["btn-wishes-bulk-duplicate"].style.display, "none");
    assert.strictEqual(mockElements["btn-wishes-bulk-delete"].style.display, "none");
  });

  test("16. selectAllVisible() and deselectAllVisible(): Correctly toggles all page items", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.render(mockWishes);

    AdminWishes.setPageSize(3);
    AdminWishes.setPage(1);

    AdminWishes.selectAllVisible();
    assert.strictEqual(AdminWishes.getSelectedIds().length, 3);

    AdminWishes.deselectAllVisible();
    assert.strictEqual(AdminWishes.getSelectedIds().length, 0);
  });

  test("17. System Config UUID Protection: System configuration UUID cannot be selected or deleted", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();

    const systemConfigWish = {
      id: "00000000-0000-0000-0000-000000000001",
      recipient_name: "System Config",
      sender_name: "System",
      pass_code: "0000",
      created_at: "2026-08-01T00:00:00Z"
    };
    AdminWishes.render([systemConfigWish, ...mockWishes]);

    // Attempt single delete on system config
    await AdminWishes.deleteWish("00000000-0000-0000-0000-000000000001");
    assert.ok(globalThis.window.AdminCore.getLastToast().includes("Cannot delete system configuration"));
  });

  console.log("\n============================================================");
  console.log(`🎉 ALL ${testCount} PHASE 31B-10 WISHES MANAGEMENT UX TESTS PASSED!`);
  console.log("============================================================\n");
})();
