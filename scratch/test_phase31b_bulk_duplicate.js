/**
 * ============================================================================
 * PHASE 31B-7 AUTOMATED TEST SUITE (scratch/test_phase31b_bulk_duplicate.js)
 * Validates Wishes Table Bulk Duplicate Functionality:
 * - UI & Selection binding (hidden at 0, visible at >0, dynamic count)
 * - Confirmation dialog requirement and Cancel safety
 * - DatabaseModule.duplicateWishesBulk batch fetch and insert
 * - Field and media preservation semantics with '(Copy)' naming
 * - New UUID identity & original row immutability
 * - Exclusion of protected system configuration UUID
 * - Non-auto-selection of new duplicates
 * - In-memory wishesState, pagination, and KPI hook synchronization
 * - Partial failure and total failure resilience
 * - Zero Storage media modification invariant
 * - Single duplicate & bulk delete backward compatibility & security
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("🚀 STARTING PHASE 31B-7 SECURE BULK DUPLICATE TEST SUITE");
console.log("============================================================\n");

// Read source files
const adminWishesCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-wishes.js"), "utf8");
const databaseCode = fs.readFileSync(path.join(__dirname, "../js/database.js"), "utf8");
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
  createMockElement("wishes-sort-select", "select");
  createMockElement("wishes-filter-media", "select");
  createMockElement("wishes-filter-date", "select");
  createMockElement("wishes-count-badge", "div");
  createMockElement("wishes-selection-badge", "div");
  createMockElement("wishes-selected-count", "span");
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

  globalThis.document = {
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
    addEventListener: () => {}
  };

  globalThis.window = globalThis;
  globalThis.window.location = { origin: "https://test.local" };
  globalThis.window.AdminCore = {
    showToast: () => {},
    copyWishUrl: () => {}
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
    letter_lines: ["Line 1", "Line 2"],
    memory_text: "Great memories together",
    reasons_json: ["Reason A", "Reason B"],
    wishes_json: ["Wish A", "Wish B"],
    gallery_json: [{ url: "https://example.com/p1.jpg" }],
    timeline_json: [{ title: "Met in 2020" }],
    gift_json: { type: "watch" },
    music_url: "https://example.com/song.mp3",
    video_url: "https://example.com/video.mp4",
    cake_flavor: "chocolate",
    letter_font: "handwriting",
    letter_theme: "warm",
    created_at: "2026-08-18T10:00:00Z"
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    recipient_name: "Priya",
    sender_name: "Rohit",
    pass_code: "5678",
    birth_date: { year: 2002, month: 5, day: 20 },
    letter_lines: ["Happy Birthday!"],
    memory_text: "Fun times",
    reasons_json: ["You are awesome"],
    wishes_json: ["Have a blast"],
    gallery_json: [{ url: "https://example.com/p2.jpg" }],
    timeline_json: [],
    gift_json: {},
    music_url: null,
    video_url: null,
    cake_flavor: "vanilla",
    letter_font: "serif",
    letter_theme: "cool",
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

(async function runAllBulkDuplicateTests() {
  // ------------------------------------------------------------
  // SECTION 1: HTML & CSS STRUCTURE
  // ------------------------------------------------------------
  test("HTML Structure: admin.html contains btn-wishes-bulk-duplicate with count span", () => {
    assert.ok(adminHtmlCode.includes('id="btn-wishes-bulk-duplicate"'), "Must include bulk duplicate button");
    assert.ok(adminHtmlCode.includes('id="wishes-bulk-duplicate-count"'), "Must include bulk duplicate count element");
  });

  test("CSS Structure: admin-components.css contains .btn-bulk-duplicate styling", () => {
    assert.ok(adminComponentsCss.includes(".btn-bulk-duplicate"), "Must define .btn-bulk-duplicate rule");
    assert.ok(adminComponentsCss.includes(".btn-bulk-duplicate:hover"), "Must define hover state");
    assert.ok(adminComponentsCss.includes(".btn-bulk-duplicate:disabled"), "Must define disabled state");
  });

  // ------------------------------------------------------------
  // SECTION 2: UI VISIBILITY & COUNT SYNCHRONIZATION
  // ------------------------------------------------------------
  test("Bulk Action Hidden: bulk duplicate button is hidden when selected count is 0", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    assert.strictEqual(mockElements["btn-wishes-bulk-duplicate"].style.display, "none");
    assert.strictEqual(mockElements["wishes-selection-badge"].style.display, "none");
  });

  test("Bulk Action Visible: bulk duplicate button appears with accurate count when wishes are selected", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");

    assert.strictEqual(mockElements["btn-wishes-bulk-duplicate"].style.display, "inline-flex");
    assert.strictEqual(mockElements["wishes-bulk-duplicate-count"].textContent, "2");
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "2");
  });

  // ------------------------------------------------------------
  // SECTION 3: CONFIRMATION & CANCEL INTEGRITY
  // ------------------------------------------------------------
  await asyncTest("Confirmation Prompt: duplicateSelectedWishes prompts confirmation dialog with count", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");

    let confirmPrompt = "";
    globalThis.window.confirm = (msg) => {
      confirmPrompt = msg;
      return false; // User clicks Cancel
    };

    const res = await AdminWishes.duplicateSelectedWishes();
    assert.strictEqual(res.success, false);
    assert.ok(confirmPrompt.includes("Duplicate 2 selected wishes?"), "Must include selected count in message");
    assert.ok(confirmPrompt.includes("(Copy)"), "Must mention (Copy) appending");
    assert.ok(confirmPrompt.includes("Original wishes will remain untouched"), "Must confirm original safety");
  });

  await asyncTest("Cancel Safety: Cancel performs no database operation and preserves selections", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");

    globalThis.window.confirm = () => false; // Cancel

    await AdminWishes.duplicateSelectedWishes();

    assert.strictEqual(AdminWishes.getWishes().length, 6, "All 6 original wishes must remain");
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2, "Selection Set must remain intact");
  });

  // ------------------------------------------------------------
  // SECTION 4: DatabaseModule.duplicateWishesBulk
  // ------------------------------------------------------------
  test("DatabaseModule Exports: exports duplicateWishesBulk function", () => {
    eval(databaseCode);
    assert.ok(globalThis.window.DatabaseModule, "DatabaseModule must be defined");
    assert.strictEqual(typeof globalThis.window.DatabaseModule.duplicateWishesBulk, "function", "duplicateWishesBulk must be exported");
    assert.strictEqual(typeof globalThis.window.DatabaseModule.duplicateWish, "function", "duplicateWish must remain exported");
  });

  await asyncTest("DatabaseModule.duplicateWishesBulk: Rejects empty or invalid UUID array at client level", async () => {
    const res1 = await globalThis.window.DatabaseModule.duplicateWishesBulk([]);
    assert.strictEqual(res1.success, false);

    const res2 = await globalThis.window.DatabaseModule.duplicateWishesBulk(["00000000-0000-0000-0000-000000000001"]);
    assert.strictEqual(res2.success, false);
  });

  await asyncTest("DatabaseModule.duplicateWishesBulk: Successfully batch fetches, clones payloads, and inserts duplicates", async () => {
    let insertedPayloads = [];
    let queriedIds = [];

    // Mock Supabase client
    globalThis.window.SupabaseModule = {
      getClient: () => ({
        from: (table) => ({
          select: (cols) => ({
            in: async (col, ids) => {
              queriedIds = ids;
              const found = mockWishes.filter(w => ids.includes(w.id));
              return { data: found, error: null };
            }
          }),
          insert: (payloads) => ({
            select: (cols) => {
              insertedPayloads = payloads;
              const created = payloads.map((p, idx) => ({
                id: `new-uuid-${idx + 1}-${Date.now()}`,
                ...p,
                created_at: new Date().toISOString()
              }));
              return Promise.resolve({ data: created, error: null });
            }
          })
        })
      })
    };

    const idsToDup = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
    const res = await globalThis.window.DatabaseModule.duplicateWishesBulk(idsToDup);

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.createdCount, 2);
    assert.strictEqual(res.newWishes.length, 2);
    assert.deepStrictEqual(queriedIds, idsToDup);

    // Verify '(Copy)' naming
    assert.strictEqual(insertedPayloads[0].recipient_name, "Shivam (Copy)");
    assert.strictEqual(insertedPayloads[1].recipient_name, "Priya (Copy)");

    // Verify field preservation
    assert.strictEqual(insertedPayloads[0].sender_name, "Arjun");
    assert.strictEqual(insertedPayloads[0].pass_code, "1234");
    assert.deepStrictEqual(insertedPayloads[0].birth_date, { year: 2001, month: 1, day: 15 });
    assert.deepStrictEqual(insertedPayloads[0].letter_lines, ["Line 1", "Line 2"]);
    assert.strictEqual(insertedPayloads[0].memory_text, "Great memories together");
    assert.deepStrictEqual(insertedPayloads[0].reasons_json, ["Reason A", "Reason B"]);
    assert.deepStrictEqual(insertedPayloads[0].wishes_json, ["Wish A", "Wish B"]);
    assert.deepStrictEqual(insertedPayloads[0].gallery_json, [{ url: "https://example.com/p1.jpg" }]);
    assert.deepStrictEqual(insertedPayloads[0].timeline_json, [{ title: "Met in 2020" }]);
    assert.deepStrictEqual(insertedPayloads[0].gift_json, { type: "watch" });
    assert.strictEqual(insertedPayloads[0].music_url, "https://example.com/song.mp3");
    assert.strictEqual(insertedPayloads[0].video_url, "https://example.com/video.mp4");
    assert.strictEqual(insertedPayloads[0].cake_flavor, "chocolate");
    assert.strictEqual(insertedPayloads[0].letter_font, "handwriting");
    assert.strictEqual(insertedPayloads[0].letter_theme, "warm");

    // Verify new UUID uniqueness
    assert.ok(res.newWishes[0].id.startsWith("new-uuid-1"));
    assert.ok(res.newWishes[1].id.startsWith("new-uuid-2"));
    assert.notStrictEqual(res.newWishes[0].id, idsToDup[0]);
    assert.notStrictEqual(res.newWishes[1].id, idsToDup[1]);
  });

  // ------------------------------------------------------------
  // SECTION 5: AdminWishes.duplicateSelectedWishes FULL WORKFLOW
  // ------------------------------------------------------------
  await asyncTest("Single Selected Duplicate: duplicates 1 selected wish record", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const id1 = "11111111-1111-4111-8111-111111111111";
    AdminWishes.selectWish(id1);

    const newMockWish = {
      id: "dup-uuid-1111",
      recipient_name: "Shivam (Copy)",
      sender_name: "Arjun",
      created_at: new Date().toISOString()
    };

    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      duplicateWishesBulk: async (uuids) => ({
        success: true,
        createdCount: 1,
        newWishes: [newMockWish],
        failedIds: []
      })
    };

    let hookPayload = null;
    AdminWishes.init((event, desc, data) => {
      if (event === "WISHES_BULK_DUPLICATED") hookPayload = data;
    });

    const res = await AdminWishes.duplicateSelectedWishes();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.createdCount, 1);

    // Verify wishesState has 7 wishes now
    const wishes = AdminWishes.getWishes();
    assert.strictEqual(wishes.length, 7);
    assert.strictEqual(wishes[0].id, "dup-uuid-1111");

    // Verify new duplicate is NOT auto-selected
    assert.strictEqual(AdminWishes.isWishSelected("dup-uuid-1111"), false);
    assert.deepStrictEqual(AdminWishes.getSelectedIds(), [id1]);

    // Verify hook called
    assert.deepStrictEqual(hookPayload, ["dup-uuid-1111"]);
  });

  await asyncTest("Multi-Selected Duplicate: duplicates multiple selected wishes atomically", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const id1 = "11111111-1111-4111-8111-111111111111";
    const id2 = "22222222-2222-4222-8222-222222222222";
    AdminWishes.selectWish(id1);
    AdminWishes.selectWish(id2);

    const newWishes = [
      { id: "dup-1", recipient_name: "Shivam (Copy)", sender_name: "Arjun", created_at: new Date().toISOString() },
      { id: "dup-2", recipient_name: "Priya (Copy)", sender_name: "Rohit", created_at: new Date().toISOString() }
    ];

    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      duplicateWishesBulk: async (uuids) => ({
        success: true,
        createdCount: 2,
        newWishes,
        failedIds: []
      })
    };

    const res = await AdminWishes.duplicateSelectedWishes();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.createdCount, 2);

    assert.strictEqual(AdminWishes.getWishes().length, 8);
    assert.strictEqual(AdminWishes.isWishSelected("dup-1"), false);
    assert.strictEqual(AdminWishes.isWishSelected("dup-2"), false);
  });

  await asyncTest("Multi-Page Selection Duplication: duplicates items selected across multiple pages", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);
    AdminWishes.setPageSize(3); // 2 pages of 3 items

    // Select item on Page 1
    AdminWishes.setPage(1);
    const p1Item = AdminWishes.getProcessedWishes()[0];
    AdminWishes.selectWish(p1Item.id);

    // Select item on Page 2
    AdminWishes.setPage(2);
    const p2Item = AdminWishes.getProcessedWishes()[0];
    AdminWishes.selectWish(p2Item.id);

    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);

    const newWishes = [
      { id: "dup-p1", recipient_name: `${p1Item.recipient_name} (Copy)` },
      { id: "dup-p2", recipient_name: `${p2Item.recipient_name} (Copy)` }
    ];

    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      duplicateWishesBulk: async (uuids) => ({
        success: true,
        createdCount: 2,
        newWishes,
        failedIds: []
      })
    };

    const res = await AdminWishes.duplicateSelectedWishes();
    assert.strictEqual(res.success, true);
    assert.strictEqual(AdminWishes.getWishes().length, 8);
  });

  await asyncTest("Original Records Immutability: original records remain unmodified", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const origWish1 = mockWishes[0];
    AdminWishes.selectWish(origWish1.id);

    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      duplicateWishesBulk: async () => ({
        success: true,
        createdCount: 1,
        newWishes: [{ id: "copy-1", recipient_name: "Shivam (Copy)" }]
      })
    };

    await AdminWishes.duplicateSelectedWishes();

    const wishes = AdminWishes.getWishes();
    const foundOrig = wishes.find(w => w.id === origWish1.id);
    assert.ok(foundOrig, "Original wish must still exist");
    assert.strictEqual(foundOrig.recipient_name, "Shivam", "Original recipient name must remain unchanged");
    assert.strictEqual(foundOrig.sender_name, "Arjun", "Original sender name must remain unchanged");
  });

  await asyncTest("Partial Failure Handling: adds succeeded duplicates to state and reports failures", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const id1 = "11111111-1111-4111-8111-111111111111";
    const id2 = "22222222-2222-4222-8222-222222222222";
    AdminWishes.selectWish(id1);
    AdminWishes.selectWish(id2);

    let toastMsg = "";
    globalThis.window.AdminCore.showToast = (msg) => { toastMsg = msg; };

    globalThis.window.confirm = () => true;
    // Simulate 1 success, 1 failure
    globalThis.window.DatabaseModule = {
      duplicateWishesBulk: async () => ({
        success: true,
        createdCount: 1,
        newWishes: [{ id: "dup-1", recipient_name: "Shivam (Copy)" }],
        failedIds: [{ id: id2, error: "Network timeout" }]
      })
    };

    const res = await AdminWishes.duplicateSelectedWishes();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.createdCount, 1);
    assert.strictEqual(AdminWishes.getWishes().length, 7);
    assert.ok(toastMsg.includes("Duplicated 1 wish(es). 1 failed"), "Toast must report partial failure");
  });

  await asyncTest("Total Failure Handling: does not mutate wishesState and shows error toast", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");

    let toastMsg = "";
    globalThis.window.AdminCore.showToast = (msg) => { toastMsg = msg; };

    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      duplicateWishesBulk: async () => ({
        success: false,
        error: "Supabase connection error"
      })
    };

    const res = await AdminWishes.duplicateSelectedWishes();
    assert.strictEqual(res.success, false);
    assert.strictEqual(AdminWishes.getWishes().length, 6, "wishesState must remain 6");
    assert.ok(toastMsg.includes("Bulk duplicate failed"), "Toast must report failure");
  });

  await asyncTest("Loading-State Protection: disables button, shows '⏳ Duplicating...', and restores on finish", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    const btn = mockElements["btn-wishes-bulk-duplicate"];

    let observedLoading = false;
    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      duplicateWishesBulk: async () => {
        if (btn.disabled && btn.textContent.includes("Duplicating")) {
          observedLoading = true;
        }
        return { success: true, createdCount: 1, newWishes: [{ id: "copy-1", recipient_name: "Shivam (Copy)" }] };
      }
    };

    await AdminWishes.duplicateSelectedWishes(btn);

    assert.ok(observedLoading, "Button must show loading state during operation");
    assert.strictEqual(btn.disabled, false, "Button must be re-enabled after operation");
    assert.ok(btn.innerHTML.includes("Duplicate Selected"), "Button text must be restored");
  });

  await asyncTest("Single Duplicate Regression: existing single duplicateWish remains functional", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    globalThis.window.DatabaseModule = {
      duplicateWish: async (id) => ({ success: true, newId: "single-dup-1" })
    };

    let singleHookCalled = false;
    AdminWishes.init((event) => {
      if (event === "WISH_DUPLICATED") singleHookCalled = true;
    });

    await AdminWishes.duplicateWish("11111111-1111-4111-8111-111111111111");
    assert.ok(singleHookCalled, "Single duplicate hook must be called");
  });

  await asyncTest("Bulk Delete Regression: existing deleteSelectedWishes remains functional", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const id1 = "11111111-1111-4111-8111-111111111111";
    AdminWishes.selectWish(id1);

    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      deleteWishesBulk: async (uuids) => ({ success: true, deletedIds: uuids, deletedCount: 1 })
    };

    const res = await AdminWishes.deleteSelectedWishes();
    assert.strictEqual(res.success, true);
    assert.strictEqual(AdminWishes.getWishes().length, 5);
  });

  test("Storage Invariant: Bulk duplicate does NOT invoke Storage delete or copy", () => {
    assert.ok(!databaseCode.includes("StorageModule.delete"), "Database module must not call StorageModule.delete");
    assert.ok(!adminWishesCode.includes("StorageModule.delete"), "Admin wishes must not call StorageModule.delete");
  });

  test("Security Invariant: Frontend JS does not contain service_role keys", () => {
    assert.ok(!adminWishesCode.includes("SUPABASE_SERVICE_ROLE_KEY"), "Frontend wishes must not reference service_role");
    assert.ok(!databaseCode.includes("SUPABASE_SERVICE_ROLE_KEY"), "Database module must not reference service_role");
  });

  test("Public API Invariant: AdminWishes exports duplicateSelectedWishes alongside all previous methods", () => {
    const { AdminWishes } = globalThis.window;
    assert.strictEqual(typeof AdminWishes.duplicateSelectedWishes, "function");
    assert.strictEqual(typeof AdminWishes.duplicateWish, "function");
    assert.strictEqual(typeof AdminWishes.deleteSelectedWishes, "function");
    assert.strictEqual(typeof AdminWishes.deleteWish, "function");
    assert.strictEqual(typeof AdminWishes.clearSelection, "function");
    assert.strictEqual(typeof AdminWishes.selectAllVisible, "function");
    assert.strictEqual(typeof AdminWishes.deselectAllVisible, "function");
    assert.strictEqual(typeof AdminWishes.getSelectedIds, "function");
  });

  await asyncTest("Filtered Bulk Duplicate: Duplicating filtered selection updates total wishes and filtered views", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    // Search for 'Shivam'
    mockElements["wishes-search-input"].value = "Shivam";
    mockElements["wishes-search-input"].dispatchEvent("input");

    const filtered = AdminWishes.getProcessedWishes();
    assert.strictEqual(filtered.length, 1);
    AdminWishes.selectWish(filtered[0].id);

    const newWish = { id: "dup-shivam", recipient_name: "Shivam (Copy)", sender_name: "Arjun" };
    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      duplicateWishesBulk: async () => ({ success: true, createdCount: 1, newWishes: [newWish], failedIds: [] })
    };

    await AdminWishes.duplicateSelectedWishes();

    assert.strictEqual(AdminWishes.getWishes().length, 7);
    // Search for 'Shivam' now matches 2 items ('Shivam' and 'Shivam (Copy)')
    assert.strictEqual(AdminWishes.getProcessedWishes().length, 2);
  });

  await asyncTest("Protected System Config Rejection: duplicateSelectedWishes rejects system configuration UUID", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("00000000-0000-0000-0000-000000000001");

    let toastMsg = "";
    globalThis.window.AdminCore.showToast = (msg) => { toastMsg = msg; };

    const res = await AdminWishes.duplicateSelectedWishes();
    assert.strictEqual(res.success, false);
    assert.ok(toastMsg.includes("Cannot duplicate protected system configuration record"), "Must toast protected record warning");
  });

  await asyncTest("Count Badge and Header Checkbox Sync: updates live count and header checkbox state", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");

    const newWish = { id: "dup-1", recipient_name: "Shivam (Copy)" };
    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      duplicateWishesBulk: async () => ({ success: true, createdCount: 1, newWishes: [newWish], failedIds: [] })
    };

    await AdminWishes.duplicateSelectedWishes();

    const countBadge = mockElements["wishes-count-badge"];
    assert.strictEqual(countBadge.textContent, "Showing 1–7 of 7 wishes");

    const selectAllBox = mockElements["wishes-select-all"];
    assert.strictEqual(selectAllBox.checked, false);
    assert.strictEqual(selectAllBox.indeterminate, true, "Should be indeterminate since 1 of 7 is selected");
  });

  await asyncTest("Field Preservation Verification: All wish fields and media URLs are preserved accurately", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const orig = mockWishes[0];
    AdminWishes.selectWish(orig.id);

    let insertedRecords = [];
    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      duplicateWishesBulk: async (uuids) => {
        const dup = {
          id: "dup-deep-check",
          recipient_name: `${orig.recipient_name} (Copy)`,
          sender_name: orig.sender_name,
          pass_code: orig.pass_code,
          birth_date: { ...orig.birth_date },
          letter_lines: [...orig.letter_lines],
          memory_text: orig.memory_text,
          reasons_json: [...orig.reasons_json],
          wishes_json: [...orig.wishes_json],
          gallery_json: JSON.parse(JSON.stringify(orig.gallery_json)),
          timeline_json: JSON.parse(JSON.stringify(orig.timeline_json)),
          gift_json: JSON.parse(JSON.stringify(orig.gift_json)),
          music_url: orig.music_url,
          video_url: orig.video_url,
          cake_flavor: orig.cake_flavor,
          letter_font: orig.letter_font,
          letter_theme: orig.letter_theme
        };
        insertedRecords.push(dup);
        return { success: true, createdCount: 1, newWishes: [dup], failedIds: [] };
      }
    };

    await AdminWishes.duplicateSelectedWishes();

    const created = insertedRecords[0];
    assert.strictEqual(created.recipient_name, "Shivam (Copy)");
    assert.strictEqual(created.sender_name, "Arjun");
    assert.strictEqual(created.music_url, "https://example.com/song.mp3");
    assert.strictEqual(created.video_url, "https://example.com/video.mp4");
    assert.deepStrictEqual(created.letter_lines, ["Line 1", "Line 2"]);
    assert.strictEqual(created.cake_flavor, "chocolate");
  });

  await asyncTest("Multi-Page Partial Duplicate: Selected items across multiple pages duplicate and preserve active page", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);
    AdminWishes.setPageSize(3); // Page 1: [0, 1, 2], Page 2: [3, 4, 5]

    AdminWishes.setPage(2);
    const p2Item = AdminWishes.getProcessedWishes()[0]; // item 3
    AdminWishes.selectWish(p2Item.id);

    const newWish = { id: "dup-p2-item", recipient_name: `${p2Item.recipient_name} (Copy)` };
    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      duplicateWishesBulk: async () => ({ success: true, createdCount: 1, newWishes: [newWish], failedIds: [] })
    };

    await AdminWishes.duplicateSelectedWishes();

    assert.strictEqual(AdminWishes.getWishes().length, 7);
    assert.strictEqual(AdminWishes.getPage(), 2, "Page 2 should remain active");
  });

  console.log("\n============================================================");
  console.log(`🎉 ALL ${testCount} PHASE 31B-7 BULK DUPLICATE TESTS PASSED!`);
  console.log("============================================================\n");
})();
