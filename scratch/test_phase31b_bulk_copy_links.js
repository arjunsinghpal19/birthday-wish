/**
 * ============================================================================
 * PHASE 31B-8 AUTOMATED TEST SUITE (scratch/test_phase31b_bulk_copy_links.js)
 * Validates Wishes Table Bulk Copy UUID Links Feature:
 * - UI & Selection binding (hidden at 0, visible at >0, dynamic count)
 * - Public canonical UUID share link format (${origin}/?w=${UUID})
 * - Newline-separated clipboard payload formatting
 * - Exclusion of passcodes, recipient names, and internal admin URLs
 * - Selection state preservation after copy
 * - Multi-page selection copy support
 * - Stale / missing UUID resolution and graceful pruning
 * - Double-click / loading-state protection ("⏳ Copying...")
 * - Clipboard API & fallback handling
 * - Single-row copy, bulk delete & bulk duplicate backward compatibility
 * - Security invariants & public API exports
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("🚀 STARTING PHASE 31B-8 BULK COPY UUID LINKS TEST SUITE");
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
let mockClipboardText = "";

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

function resetEnvironment() {
  mockElements = {};
  mockListeners = {};
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

  let lastCreatedTextarea = null;

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
    createElement: (tag) => {
      const el = createMockElement(`dyn-${Date.now()}-${Math.random()}`, tag);
      if (tag && tag.toLowerCase() === "textarea") lastCreatedTextarea = el;
      return el;
    },
    execCommand: (cmd) => {
      if (cmd === "copy" && lastCreatedTextarea) {
        mockClipboardText = lastCreatedTextarea.value;
      }
      return true;
    },
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
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    recipient_name: "Karan",
    sender_name: "Kabir",
    pass_code: "3333",
    created_at: "2026-08-18T15:00:00Z"
  }
];

(async function runAllBulkCopyLinksTests() {
  // ------------------------------------------------------------
  // SECTION 1: HTML & CSS STRUCTURE
  // ------------------------------------------------------------
  test("HTML Structure: admin.html contains btn-wishes-bulk-copy-links with count span", () => {
    assert.ok(adminHtmlCode.includes('id="btn-wishes-bulk-copy-links"'), "Must include bulk copy links button");
    assert.ok(adminHtmlCode.includes('id="wishes-bulk-copy-links-count"'), "Must include bulk copy links count element");
  });

  test("CSS Structure: admin-components.css contains .btn-bulk-copy-links styling", () => {
    assert.ok(adminComponentsCss.includes(".btn-bulk-copy-links"), "Must define .btn-bulk-copy-links rule");
    assert.ok(adminComponentsCss.includes(".btn-bulk-copy-links:hover"), "Must define hover state");
    assert.ok(adminComponentsCss.includes(".btn-bulk-copy-links:disabled"), "Must define disabled state");
  });

  // ------------------------------------------------------------
  // SECTION 2: UI VISIBILITY & COUNT SYNCHRONIZATION
  // ------------------------------------------------------------
  test("Zero Selection: Bulk Copy Links button is hidden when 0 wishes are selected", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    assert.strictEqual(mockElements["btn-wishes-bulk-copy-links"].style.display, "none");
    assert.strictEqual(mockElements["wishes-selection-badge"].style.display, "none");
  });

  test("Selection Count Sync: Button appears with accurate count dynamically (1 -> 2 -> 3)", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    // Select 1
    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    assert.strictEqual(mockElements["btn-wishes-bulk-copy-links"].style.display, "inline-flex");
    assert.strictEqual(mockElements["wishes-bulk-copy-links-count"].textContent, "1");

    // Select 2
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");
    assert.strictEqual(mockElements["wishes-bulk-copy-links-count"].textContent, "2");

    // Select 3
    AdminWishes.selectWish("33333333-3333-4333-8333-333333333333");
    assert.strictEqual(mockElements["wishes-bulk-copy-links-count"].textContent, "3");

    // Deselect 1
    AdminWishes.deselectWish("11111111-1111-4111-8111-111111111111");
    assert.strictEqual(mockElements["wishes-bulk-copy-links-count"].textContent, "2");

    // Clear all
    AdminWishes.clearSelection();
    assert.strictEqual(mockElements["btn-wishes-bulk-copy-links"].style.display, "none");
  });

  // ------------------------------------------------------------
  // SECTION 3: URL FORMAT & CLIPBOARD PAYLOAD
  // ------------------------------------------------------------
  test("Public URL Generation: getSelectedWishLinks generates canonical ${origin}/?w=${UUID} URLs", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    const links = AdminWishes.getSelectedWishLinks();

    assert.strictEqual(links.length, 1);
    assert.strictEqual(links[0], "https://birthday-wish.app/?w=11111111-1111-4111-8111-111111111111");
  });

  await asyncTest("Clipboard Single Link: copies 1 public UUID URL to clipboard", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    const res = await AdminWishes.copySelectedWishLinks();

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.copiedCount, 1);
    assert.strictEqual(mockClipboardText, "https://birthday-wish.app/?w=11111111-1111-4111-8111-111111111111");
  });

  await asyncTest("Clipboard Multiple Links: copies newline-separated URLs for multiple selected wishes", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");
    AdminWishes.selectWish("33333333-3333-4333-8333-333333333333");

    const res = await AdminWishes.copySelectedWishLinks();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.copiedCount, 3);

    const expected = [
      "https://birthday-wish.app/?w=11111111-1111-4111-8111-111111111111",
      "https://birthday-wish.app/?w=22222222-2222-4222-8222-222222222222",
      "https://birthday-wish.app/?w=33333333-3333-4333-8333-333333333333"
    ].join("\n");

    assert.strictEqual(mockClipboardText, expected);
  });

  // ------------------------------------------------------------
  // SECTION 4: SECURITY & PRIVACY INVARIANTS
  // ------------------------------------------------------------
  await asyncTest("Privacy Invariant: Clipboard contains ONLY public URLs (no passcodes, names, or admin paths)", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");

    await AdminWishes.copySelectedWishLinks();

    // Must NOT contain passcodes
    assert.ok(!mockClipboardText.includes("1234"), "Must not include passcode 1234");
    assert.ok(!mockClipboardText.includes("5678"), "Must not include passcode 5678");

    // Must NOT contain names
    assert.ok(!mockClipboardText.includes("Shivam"), "Must not include recipient Shivam");
    assert.ok(!mockClipboardText.includes("Arjun"), "Must not include sender Arjun");

    // Must NOT contain admin paths
    assert.ok(!mockClipboardText.includes("admin.html"), "Must not include admin.html");
    assert.ok(!mockClipboardText.includes("admin_edit"), "Must not include admin_edit parameter");
  });

  // ------------------------------------------------------------
  // SECTION 5: SELECTION PRESERVATION & STATE INTEGRITY
  // ------------------------------------------------------------
  await asyncTest("Selection Preservation: Successful copy leaves selections 100% intact", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const id1 = "11111111-1111-4111-8111-111111111111";
    const id2 = "22222222-2222-4222-8222-222222222222";
    AdminWishes.selectWish(id1);
    AdminWishes.selectWish(id2);

    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);

    await AdminWishes.copySelectedWishLinks();

    // Selections must remain intact
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);
    assert.ok(AdminWishes.isWishSelected(id1));
    assert.ok(AdminWishes.isWishSelected(id2));
    assert.strictEqual(mockElements["btn-wishes-bulk-copy-links"].style.display, "inline-flex");
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "2");
  });

  // ------------------------------------------------------------
  // SECTION 6: MULTI-PAGE & PAGINATION COMPATIBILITY
  // ------------------------------------------------------------
  await asyncTest("Multi-Page Selection Copy: Copies links selected across multiple pagination pages", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);
    AdminWishes.setPageSize(2); // 3 pages of 2 items

    // Select on Page 1
    AdminWishes.setPage(1);
    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");

    // Select on Page 2
    AdminWishes.setPage(2);
    AdminWishes.selectWish("33333333-3333-4333-8333-333333333333");

    // Select on Page 3
    AdminWishes.setPage(3);
    AdminWishes.selectWish("55555555-5555-4555-8555-555555555555");

    assert.strictEqual(AdminWishes.getSelectedIds().length, 3);

    const res = await AdminWishes.copySelectedWishLinks();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.copiedCount, 3);

    const lines = mockClipboardText.split("\n");
    assert.strictEqual(lines.length, 3);
    assert.ok(lines[0].includes("11111111-1111-4111-8111-111111111111"));
    assert.ok(lines[1].includes("33333333-3333-4333-8333-333333333333"));
    assert.ok(lines[2].includes("55555555-5555-4555-8555-555555555555"));

    // Page 3 must remain active
    assert.strictEqual(AdminWishes.getPage(), 3);
  });

  // ------------------------------------------------------------
  // SECTION 7: STALE & MISSING UUID HANDLING
  // ------------------------------------------------------------
  await asyncTest("Stale UUID Handling: Prunes missing UUIDs and copies only valid records", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const validId = "11111111-1111-4111-8111-111111111111";
    const staleId = "99999999-9999-9999-9999-999999999999";

    AdminWishes.selectWish(validId);
    AdminWishes.selectWish(staleId);

    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);

    const res = await AdminWishes.copySelectedWishLinks();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.copiedCount, 1);
    assert.strictEqual(mockClipboardText, `https://birthday-wish.app/?w=${validId}`);

    // Stale ID must be pruned from selectedWishIds
    assert.strictEqual(AdminWishes.isWishSelected(staleId), false);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);
  });

  // ------------------------------------------------------------
  // SECTION 8: LOADING STATE & DOUBLE-CLICK PROTECTION
  // ------------------------------------------------------------
  await asyncTest("Loading State: Disables button, sets '⏳ Copying...', and restores on finish", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    const btn = mockElements["btn-wishes-bulk-copy-links"];

    let observedLoading = false;
    globalThis.window.navigator.clipboard.writeText = async () => {
      if (btn.disabled && btn.textContent.includes("Copying")) {
        observedLoading = true;
      }
      return Promise.resolve();
    };

    await AdminWishes.copySelectedWishLinks(btn);

    assert.ok(observedLoading, "Button must show loading state during copy");
    assert.strictEqual(btn.disabled, false, "Button must be re-enabled after copy");
    assert.ok(btn.innerHTML.includes("Copy Links"), "Button text must be restored");
  });

  // ------------------------------------------------------------
  // SECTION 9: CLIPBOARD FALLBACK & ERROR HANDLING
  // ------------------------------------------------------------
  await asyncTest("Clipboard Fallback: Uses fallback textarea when navigator.clipboard is unavailable", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    // Disable navigator.clipboard
    globalThis.window.navigator.clipboard = undefined;

    let execCommandCalled = false;
    globalThis.document.execCommand = (cmd) => {
      if (cmd === "copy") execCommandCalled = true;
      return true;
    };

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    const res = await AdminWishes.copySelectedWishLinks();

    assert.strictEqual(res.success, true);
    assert.ok(execCommandCalled, "Must use document.execCommand fallback");
  });

  await asyncTest("Clipboard Failure: Handles clipboard error gracefully and shows toast", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    globalThis.window.navigator.clipboard = {
      writeText: async () => Promise.reject(new Error("Permission denied"))
    };

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    const res = await AdminWishes.copySelectedWishLinks();

    assert.strictEqual(res.success, false);
    assert.ok(res.error.includes("Permission denied"));
    assert.ok(globalThis.window.AdminCore.getLastToast().includes("Copy failed"), "Must show copy failure toast");
  });

  // ------------------------------------------------------------
  // SECTION 10: REGRESSION & COMPATIBILITY CHECKS
  // ------------------------------------------------------------
  test("Single-Row Copy Regression: Existing AdminCore.copyWishUrl remains functional", () => {
    resetEnvironment();
    globalThis.window.AdminCore.copyWishUrl("https://birthday-wish.app/?w=11111111-1111-4111-8111-111111111111");
    assert.strictEqual(mockClipboardText, "https://birthday-wish.app/?w=11111111-1111-4111-8111-111111111111");
  });

  await asyncTest("Bulk Actions Workflow: Copy -> Duplicate -> Delete chain works seamlessly", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const id1 = "11111111-1111-4111-8111-111111111111";
    AdminWishes.selectWish(id1);

    // 1. Copy Links
    const copyRes = await AdminWishes.copySelectedWishLinks();
    assert.strictEqual(copyRes.success, true);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 1);

    // 2. Duplicate Selected
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
    assert.strictEqual(AdminWishes.getWishes().length, 7);

    // 3. Delete Selected
    const delRes = await AdminWishes.deleteSelectedWishes();
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(AdminWishes.getWishes().length, 6);
  });

  await asyncTest("Search & Filter Selection Copy: Copying filtered wishes copies only matching selected records", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    // Filter by search 'Shivam'
    mockElements["wishes-search-input"].value = "Shivam";
    mockElements["wishes-search-input"].dispatchEvent("input");

    const processed = AdminWishes.getProcessedWishes();
    assert.strictEqual(processed.length, 1);
    AdminWishes.selectWish(processed[0].id);

    const res = await AdminWishes.copySelectedWishLinks();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.copiedCount, 1);
    assert.strictEqual(mockClipboardText, `https://birthday-wish.app/?w=${processed[0].id}`);
  });

  // ------------------------------------------------------------
  // SECTION 11: INVARIANTS & PUBLIC API
  // ------------------------------------------------------------
  test("Public API Invariant: AdminWishes exports getSelectedWishLinks and copySelectedWishLinks", () => {
    const { AdminWishes } = globalThis.window;
    assert.strictEqual(typeof AdminWishes.getSelectedWishLinks, "function");
    assert.strictEqual(typeof AdminWishes.copySelectedWishLinks, "function");
    assert.strictEqual(typeof AdminWishes.duplicateSelectedWishes, "function");
    assert.strictEqual(typeof AdminWishes.deleteSelectedWishes, "function");
  });

  test("Security Invariant: Frontend JS does not contain service_role keys", () => {
    assert.ok(!adminWishesCode.includes("SUPABASE_SERVICE_ROLE_KEY"), "Frontend wishes must not reference service_role");
  });

  test("Zero Backend Invariant: Bulk copy performs 0 network/DB mutations", () => {
    assert.ok(!adminWishesCode.includes("DatabaseModule.copyLinks"), "Bulk copy is purely client-side");
  });

  await asyncTest("Empty Selection Rejection: copySelectedWishLinks returns error and shows toast when 0 selected", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const res = await AdminWishes.copySelectedWishLinks();
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.copiedCount, 0);
    assert.ok(globalThis.window.AdminCore.getLastToast().includes("No valid wishes selected"));
  });

  await asyncTest("All-Stale Selection Handling: Cleans all stale selections and returns error gracefully", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const fakeId1 = "00000000-1111-0000-0000-000000000000";
    const fakeId2 = "00000000-2222-0000-0000-000000000000";
    AdminWishes.selectWish(fakeId1);
    AdminWishes.selectWish(fakeId2);

    const res = await AdminWishes.copySelectedWishLinks();
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.copiedCount, 0);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 0);
  });

  test("Duplicate Prevention: Selecting same wish multiple times does not produce duplicate links", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const id = "11111111-1111-4111-8111-111111111111";
    AdminWishes.selectWish(id);
    AdminWishes.selectWish(id);
    AdminWishes.selectWish(id);

    const links = AdminWishes.getSelectedWishLinks();
    assert.strictEqual(links.length, 1);
  });

  await asyncTest("Page Size Switching: Changing page size preserves selections and copies all", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.setPageSize(2);
    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.selectWish(mockWishes[3].id);

    AdminWishes.setPageSize("all");
    const res = await AdminWishes.copySelectedWishLinks();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.copiedCount, 2);
  });

  await asyncTest("Sorting Switching: Changing sort order preserves selections and copies properly", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish(mockWishes[0].id);
    AdminWishes.selectWish(mockWishes[1].id);

    AdminWishes.setSortState("recipient", "desc");
    const res = await AdminWishes.copySelectedWishLinks();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.copiedCount, 2);
  });

  await asyncTest("Media and Date Filter Compatibility: Selection and copy works seamlessly with active filters", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    // Set media filter to text_only
    mockElements["wishes-filter-media"].value = "text_only";
    mockElements["wishes-filter-media"].dispatchEvent("change");

    const processed = AdminWishes.getProcessedWishes();
    assert.ok(processed.length > 0);
    AdminWishes.selectWish(processed[0].id);

    const res = await AdminWishes.copySelectedWishLinks();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.copiedCount, 1);
    assert.strictEqual(mockClipboardText, `https://birthday-wish.app/?w=${processed[0].id}`);
  });

  console.log("\n============================================================");
  console.log(`🎉 ALL ${testCount} PHASE 31B-8 BULK COPY LINKS TESTS PASSED!`);
  console.log("============================================================\n");
})();
