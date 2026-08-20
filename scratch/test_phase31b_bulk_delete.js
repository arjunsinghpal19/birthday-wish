/**
 * ============================================================================
 * PHASE 31B-6 AUTOMATED TEST SUITE (scratch/test_phase31b_bulk_delete.js)
 * Validates Secure Bulk Delete functionality in Admin Wishes Management:
 * - UI & Selection binding (hidden at 0, visible at >0, dynamic count)
 * - Confirmation dialog requirement and Cancel safety
 * - Backend /api/admin-delete-wish multi-UUID processing & validation
 * - DatabaseModule.deleteWishesBulk API client & error handling
 * - AdminWishes.deleteSelectedWishes state synchronization & page clamping
 * - Partial failure and total failure resilience
 * - Zero Storage media deletion invariant
 * - Single delete backward compatibility & security preservation
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("🚀 STARTING PHASE 31B-6 SECURE BULK DELETE TEST SUITE");
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
  { id: "11111111-1111-4111-8111-111111111111", recipient_name: "Shivam", sender_name: "Arjun", created_at: "2026-08-18T10:00:00Z" },
  { id: "22222222-2222-4222-8222-222222222222", recipient_name: "Priya", sender_name: "Rohit", created_at: "2026-08-18T11:00:00Z" },
  { id: "33333333-3333-4333-8333-333333333333", recipient_name: "Neha", sender_name: "Anjali", created_at: "2026-08-18T12:00:00Z" },
  { id: "44444444-4444-4444-8444-444444444444", recipient_name: "Rahul", sender_name: "Vikram", created_at: "2026-08-18T13:00:00Z" },
  { id: "55555555-5555-4555-8555-555555555555", recipient_name: "Aditi", sender_name: "Pooja", created_at: "2026-08-18T14:00:00Z" },
  { id: "66666666-6666-4666-8666-666666666666", recipient_name: "Karan", sender_name: "Kabir", created_at: "2026-08-18T15:00:00Z" }
];

(async function runAllBulkDeleteTests() {
  // ------------------------------------------------------------
  // SECTION 1: HTML & CSS STRUCTURE
  // ------------------------------------------------------------
  test("HTML Structure: admin.html contains btn-wishes-bulk-delete with count span", () => {
    assert.ok(adminHtmlCode.includes('id="btn-wishes-bulk-delete"'), "Must include bulk delete button");
    assert.ok(adminHtmlCode.includes('id="wishes-bulk-delete-count"'), "Must include bulk delete count element");
  });

  test("CSS Structure: admin-components.css contains .btn-bulk-delete styling", () => {
    assert.ok(adminComponentsCss.includes(".btn-bulk-delete"), "Must define .btn-bulk-delete rule");
    assert.ok(adminComponentsCss.includes(".btn-bulk-delete:hover"), "Must define hover state");
    assert.ok(adminComponentsCss.includes(".btn-bulk-delete:disabled"), "Must define disabled state");
  });

  // ------------------------------------------------------------
  // SECTION 2: UI VISIBILITY & COUNT SYNCHRONIZATION
  // ------------------------------------------------------------
  test("Bulk Action Hidden: bulk delete button is hidden when selected count is 0", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    assert.strictEqual(mockElements["btn-wishes-bulk-delete"].style.display, "none");
    assert.strictEqual(mockElements["wishes-selection-badge"].style.display, "none");
  });

  test("Bulk Action Visible: bulk delete button appears with accurate count when wishes are selected", () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");

    assert.strictEqual(mockElements["btn-wishes-bulk-delete"].style.display, "inline-flex");
    assert.strictEqual(mockElements["wishes-bulk-delete-count"].textContent, "2");
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "2");
  });

  // ------------------------------------------------------------
  // SECTION 3: CONFIRMATION & CANCEL INTEGRITY
  // ------------------------------------------------------------
  await asyncTest("Confirmation Prompt: deleteSelectedWishes prompts strong confirmation dialog", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");

    let confirmPrompt = "";
    globalThis.window.confirm = (msg) => {
      confirmPrompt = msg;
      return false; // User clicks Cancel
    };

    const res = await AdminWishes.deleteSelectedWishes();
    assert.strictEqual(res.success, false);
    assert.ok(confirmPrompt.includes("Delete 1 selected wish?"), "Must include selected count in message");
    assert.ok(confirmPrompt.includes("permanently deleted"), "Must warn of permanent deletion");
    assert.ok(confirmPrompt.includes("Storage media will remain untouched"), "Must confirm storage safety");
  });

  await asyncTest("Cancel Safety: Cancel does not delete records or alter selection Set", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
    AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");

    globalThis.window.confirm = () => false; // Cancel

    await AdminWishes.deleteSelectedWishes();

    assert.strictEqual(AdminWishes.getWishes().length, 6, "All 6 wishes must remain");
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2, "Selection Set must remain intact");
  });

  // ------------------------------------------------------------
  // SECTION 4: BACKEND /api/admin-delete-wish BULK SUPPORT
  // ------------------------------------------------------------
  const deleteApiModule = await import("../api/admin-delete-wish.js");
  const sessionModule = await import("../api/session.js");
  const mockSecRow = {
    admin_password_hash: "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3",
    pass_code: "1234"
  };
  const validToken = sessionModule.createAdminSessionToken(mockSecRow);

  function createMockResponse() {
    let status = 0, jsonRes = {}, ended = false;
    return {
      setHeader: () => {},
      status: (s) => {
        status = s;
        return {
          json: (j) => { jsonRes = j; return jsonRes; },
          end: () => { ended = true; }
        };
      },
      end: () => { ended = true; },
      getStatus: () => status,
      getJson: () => jsonRes
    };
  }

  await asyncTest("Backend API: Rejects empty uuids array with 400", async () => {
    const req = { method: "POST", headers: { authorization: `Bearer ${validToken}` }, body: { uuids: [] } };
    const res = createMockResponse();

    await deleteApiModule.default(req, res);
    assert.strictEqual(res.getStatus(), 400);
    assert.strictEqual(res.getJson().success, false);
  });

  await asyncTest("Backend API: Strictly protects system configuration UUID (00000000-0000-0000-0000-000000000001) with 403", async () => {
    const req = {
      method: "POST",
      headers: { authorization: `Bearer ${validToken}` },
      body: { uuids: ["00000000-0000-0000-0000-000000000001"] }
    };
    const res = createMockResponse();

    await deleteApiModule.default(req, res);
    assert.strictEqual(res.getStatus(), 403);
    assert.strictEqual(res.getJson().success, false);
  });

  await asyncTest("Backend API: Rejects unauthenticated bulk request with 401", async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (url.includes("00000000-0000-0000-0000-000000000001")) {
        return {
          ok: true,
          json: async () => [mockSecRow]
        };
      }
      return { ok: true, json: async () => [] };
    };

    const req = {
      method: "POST",
      headers: { authorization: "Bearer invalid_tampered_token" },
      body: { uuids: ["11111111-1111-4111-8111-111111111111"] }
    };
    const res = createMockResponse();

    try {
      await deleteApiModule.default(req, res);
      assert.strictEqual(res.getStatus(), 401);
      assert.strictEqual(res.getJson().success, false);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  await asyncTest("Backend API: Executes privileged batch delete for multiple valid UUIDs", async () => {
    let requestedUrl = "";
    let requestedHeaders = {};
    let requestedMethod = "";

    const origFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts = {}) => {
      if (url.includes("00000000-0000-0000-0000-000000000001")) {
        return { ok: true, json: async () => [mockSecRow] };
      }
      requestedUrl = url;
      requestedHeaders = opts.headers || {};
      requestedMethod = opts.method || "GET";
      return {
        ok: true,
        json: async () => [
          { id: "11111111-1111-4111-8111-111111111111" },
          { id: "22222222-2222-4222-8222-222222222222" }
        ]
      };
    };

    const req = {
      method: "POST",
      headers: { authorization: `Bearer ${validToken}` },
      body: { uuids: ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"] }
    };
    const res = createMockResponse();

    try {
      await deleteApiModule.default(req, res);
      assert.strictEqual(res.getStatus(), 200);
      assert.strictEqual(res.getJson().success, true);
      assert.strictEqual(res.getJson().deletedCount, 2);
      assert.strictEqual(requestedMethod, "DELETE");
      assert.ok(requestedUrl.includes("id=in.(11111111-1111-4111-8111-111111111111,22222222-2222-4222-8222-222222222222)"), "Must use PostgREST in filter");
      assert.strictEqual(requestedHeaders["Prefer"], "return=representation", "Must request returned representation");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  await asyncTest("Backend API: Single-UUID backward compatibility remains intact", async () => {
    let requestedUrl = "";
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts = {}) => {
      if (url.includes("00000000-0000-0000-0000-000000000001")) {
        return { ok: true, json: async () => [mockSecRow] };
      }
      requestedUrl = url;
      return { ok: true, json: async () => [{ id: "11111111-1111-4111-8111-111111111111" }] };
    };

    const req = {
      method: "POST",
      headers: { authorization: `Bearer ${validToken}` },
      body: { uuid: "11111111-1111-4111-8111-111111111111" }
    };
    const res = createMockResponse();

    try {
      await deleteApiModule.default(req, res);
      assert.strictEqual(res.getStatus(), 200);
      assert.strictEqual(res.getJson().success, true);
      assert.strictEqual(res.getJson().id, "11111111-1111-4111-8111-111111111111");
      assert.ok(requestedUrl.includes("id=eq.11111111-1111-4111-8111-111111111111"));
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  // ------------------------------------------------------------
  // SECTION 5: DatabaseModule.deleteWishesBulk
  // ------------------------------------------------------------
  test("DatabaseModule Exports: exports deleteWishesBulk function", () => {
    eval(databaseCode);
    assert.ok(globalThis.window.DatabaseModule, "DatabaseModule must be defined");
    assert.strictEqual(typeof globalThis.window.DatabaseModule.deleteWishesBulk, "function", "deleteWishesBulk must be exported");
    assert.strictEqual(typeof globalThis.window.DatabaseModule.deleteWish, "function", "deleteWish must remain exported");
  });

  await asyncTest("DatabaseModule.deleteWishesBulk: Rejects empty or invalid UUID array at client level", async () => {
    const res1 = await globalThis.window.DatabaseModule.deleteWishesBulk([]);
    assert.strictEqual(res1.success, false);

    const res2 = await globalThis.window.DatabaseModule.deleteWishesBulk(["00000000-0000-0000-0000-000000000001"]);
    assert.strictEqual(res2.success, false);
  });

  // ------------------------------------------------------------
  // SECTION 6: AdminWishes.deleteSelectedWishes FULL WORKFLOW
  // ------------------------------------------------------------
  await asyncTest("Successful Bulk Deletion: Prunes deleted records from wishesState and selection Set", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const id1 = "11111111-1111-4111-8111-111111111111";
    const id2 = "22222222-2222-4222-8222-222222222222";
    AdminWishes.selectWish(id1);
    AdminWishes.selectWish(id2);

    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      deleteWishesBulk: async (uuids) => ({
        success: true,
        deletedIds: uuids,
        deletedCount: uuids.length
      })
    };

    let stateHookCalled = false;
    let deletedPayload = null;
    AdminWishes.init((event, desc, data) => {
      if (event === "WISHES_BULK_DELETED") {
        stateHookCalled = true;
        deletedPayload = data;
      }
    });

    const res = await AdminWishes.deleteSelectedWishes();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.deletedCount, 2);

    // Verify wishesState
    const remainingWishes = AdminWishes.getWishes();
    assert.strictEqual(remainingWishes.length, 4);
    assert.strictEqual(remainingWishes.find(w => w.id === id1), undefined);
    assert.strictEqual(remainingWishes.find(w => w.id === id2), undefined);

    // Verify selection Set
    assert.strictEqual(AdminWishes.getSelectedIds().length, 0);

    // Verify hook called
    assert.ok(stateHookCalled, "onStateChangeHook must be called");
    assert.deepStrictEqual(deletedPayload, [id1, id2]);
  });

  await asyncTest("Partial Failure Handling: Keeps failed UUIDs selected while removing succeeded UUIDs", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const id1 = "11111111-1111-4111-8111-111111111111";
    const id2 = "22222222-2222-4222-8222-222222222222";
    AdminWishes.selectWish(id1);
    AdminWishes.selectWish(id2);

    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      deleteWishesBulk: async () => ({
        success: true,
        deletedIds: [id1],
        deletedCount: 1,
        failedIds: [{ id: id2, error: "Row lock timeout" }]
      })
    };

    await AdminWishes.deleteSelectedWishes();

    const remaining = AdminWishes.getWishes();
    assert.strictEqual(remaining.length, 5, "Only 1 wish should be removed");
    assert.strictEqual(remaining.find(w => w.id === id1), undefined);
    assert.ok(remaining.find(w => w.id === id2), "Failed wish must remain in state");

    // Failed wish must remain selected
    assert.deepStrictEqual(AdminWishes.getSelectedIds(), [id2]);
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "1");
    assert.strictEqual(mockElements["btn-wishes-bulk-delete"].style.display, "inline-flex");
  });

  await asyncTest("Complete Failure Handling: Keeps all selections and displays error", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const id1 = "11111111-1111-4111-8111-111111111111";
    const id2 = "22222222-2222-4222-8222-222222222222";
    AdminWishes.selectWish(id1);
    AdminWishes.selectWish(id2);

    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      deleteWishesBulk: async () => ({
        success: false,
        error: "Network unavailable"
      })
    };

    let toastMsg = "";
    globalThis.window.AdminCore.showToast = (msg) => { toastMsg = msg; };

    const res = await AdminWishes.deleteSelectedWishes();
    assert.strictEqual(res.success, false);
    assert.strictEqual(AdminWishes.getWishes().length, 6, "No wishes deleted");
    assert.strictEqual(AdminWishes.getSelectedIds().length, 2, "Both wishes remain selected");
    assert.ok(toastMsg.includes("Bulk delete failed"), "Toast must inform of error");
  });

  // ------------------------------------------------------------
  // SECTION 7: PAGINATION & PAGE CLAMPING AFTER BULK DELETE
  // ------------------------------------------------------------
  await asyncTest("Pagination Clamping: Auto-clamps to page 1 when all page 2 items are deleted", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes); // 6 items
    AdminWishes.setPageSize(5); // 2 pages: page 1 (5 items), page 2 (1 item)
    AdminWishes.setPage(2);

    assert.strictEqual(AdminWishes.getPage(), 2);
    const page2Item = AdminWishes.getProcessedWishes()[0]; // 6th item
    AdminWishes.selectWish(page2Item.id);

    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      deleteWishesBulk: async (uuids) => ({ success: true, deletedIds: uuids, deletedCount: 1 })
    };

    await AdminWishes.deleteSelectedWishes();

    assert.strictEqual(AdminWishes.getWishes().length, 5);
    assert.strictEqual(AdminWishes.getTotalPages(), 1);
    assert.strictEqual(AdminWishes.getPage(), 1, "Must auto-clamp to page 1");
    assert.strictEqual(mockElements["wishes-count-badge"].textContent, "Showing 1–5 of 5 wishes");
  });

  await asyncTest("Multi-Page Bulk Delete: Deletes items selected across multiple pages atomically", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);
    AdminWishes.setPageSize(3); // 2 pages of 3

    // Select item on Page 1
    AdminWishes.setPage(1);
    const p1Item = AdminWishes.getProcessedWishes()[0];
    AdminWishes.selectWish(p1Item.id);

    // Select item on Page 2
    AdminWishes.setPage(2);
    const p2Item = AdminWishes.getProcessedWishes()[0];
    AdminWishes.selectWish(p2Item.id);

    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);

    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      deleteWishesBulk: async (uuids) => ({ success: true, deletedIds: uuids, deletedCount: 2 })
    };

    await AdminWishes.deleteSelectedWishes();

    assert.strictEqual(AdminWishes.getWishes().length, 4);
    assert.strictEqual(AdminWishes.getSelectedIds().length, 0);
  });

  // ------------------------------------------------------------
  // SECTION 8: SEARCH, FILTER, SORT COMPATIBILITY
  // ------------------------------------------------------------
  await asyncTest("Filtered Bulk Delete: Deleting filtered selection updates total wishes and filtered views", async () => {
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

    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      deleteWishesBulk: async (uuids) => ({ success: true, deletedIds: uuids, deletedCount: 1 })
    };

    await AdminWishes.deleteSelectedWishes();

    assert.strictEqual(AdminWishes.getWishes().length, 5);
    assert.strictEqual(AdminWishes.getProcessedWishes().length, 0); // Search now matches 0
    assert.strictEqual(AdminWishes.getSelectedIds().length, 0);
  });

  // ------------------------------------------------------------
  // SECTION 9: INVARIANTS & SECURITY
  // ------------------------------------------------------------
  test("Storage Invariant: Database bulk delete does NOT invoke Storage deletion", () => {
    assert.ok(!databaseCode.includes("StorageModule.delete"), "Database module must not call StorageModule.delete");
    assert.ok(!adminWishesCode.includes("StorageModule.delete"), "Admin wishes must not call StorageModule.delete");
  });

  test("Security Invariant: Frontend JS does not contain service_role keys", () => {
    assert.ok(!adminWishesCode.includes("SUPABASE_SERVICE_ROLE_KEY"), "Frontend wishes must not reference service_role");
    assert.ok(!databaseCode.includes("SUPABASE_SERVICE_ROLE_KEY"), "Database module must not reference service_role");
  });

  test("Security Invariant: No direct client-side Supabase .delete() call in database.js", () => {
    assert.ok(!databaseCode.includes(".from('wishes').delete("), "Direct client-side .delete() forbidden");
    assert.ok(!databaseCode.includes('.from("wishes").delete('), "Direct client-side .delete() forbidden");
  });

  test("Public API Invariant: AdminWishes exports deleteSelectedWishes alongside all previous methods", () => {
    const { AdminWishes } = globalThis.window;
    assert.strictEqual(typeof AdminWishes.deleteSelectedWishes, "function");
    assert.strictEqual(typeof AdminWishes.deleteWish, "function");
    assert.strictEqual(typeof AdminWishes.duplicateWish, "function");
    assert.strictEqual(typeof AdminWishes.clearSelection, "function");
    assert.strictEqual(typeof AdminWishes.selectAllVisible, "function");
    assert.strictEqual(typeof AdminWishes.deselectAllVisible, "function");
    assert.strictEqual(typeof AdminWishes.getSelectedIds, "function");
  });

  await asyncTest("Single-Row Delete Invariant: Existing single-row delete remains functional", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const targetId = "11111111-1111-4111-8111-111111111111";
    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      deleteWish: async (id) => ({ success: true })
    };

    let deletedPayload = null;
    AdminWishes.init((event, desc, data) => {
      if (event === "WISH_DELETED") deletedPayload = data;
    });

    await AdminWishes.deleteWish(targetId);
    assert.strictEqual(deletedPayload, targetId);
  });

  await asyncTest("Button State Integrity: Disables button, sets loading indicator, and restores on completion", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    const id1 = "11111111-1111-4111-8111-111111111111";
    AdminWishes.selectWish(id1);

    const btn = mockElements["btn-wishes-bulk-delete"];
    let observedLoadingState = false;

    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      deleteWishesBulk: async (uuids) => {
        if (btn.disabled && btn.textContent.includes("Deleting")) {
          observedLoadingState = true;
        }
        return { success: true, deletedIds: uuids, deletedCount: uuids.length };
      }
    };

    await AdminWishes.deleteSelectedWishes(btn);

    assert.ok(observedLoadingState, "Button must show loading state during execution");
    assert.strictEqual(btn.disabled, false, "Button must be re-enabled after completion");
  });

  await asyncTest("Header Checkbox Sync: Header checkbox synchronizes state after bulk delete", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);

    AdminWishes.selectAllVisible();
    const selectAllBox = mockElements["wishes-select-all"];
    assert.strictEqual(selectAllBox.checked, true);

    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      deleteWishesBulk: async (uuids) => ({ success: true, deletedIds: uuids, deletedCount: uuids.length })
    };

    await AdminWishes.deleteSelectedWishes();

    assert.strictEqual(selectAllBox.checked, false, "Select-all must be unchecked when 0 items remain");
    assert.strictEqual(selectAllBox.indeterminate, false);
  });

  await asyncTest("Multi-Page Partial Selection Integrity: Deleting page 1 items leaves page 2 selections intact", async () => {
    resetEnvironment();
    const { AdminWishes } = globalThis.window;
    AdminWishes.init();
    AdminWishes.setWishes(mockWishes);
    AdminWishes.setPageSize(3); // Page 1: [0, 1, 2], Page 2: [3, 4, 5]

    const p1Item = AdminWishes.getProcessedWishes()[0]; // item 0
    AdminWishes.selectWish(p1Item.id);

    AdminWishes.setPage(2);
    const p2Item = AdminWishes.getProcessedWishes()[0]; // item 3
    AdminWishes.selectWish(p2Item.id);

    assert.strictEqual(AdminWishes.getSelectedIds().length, 2);

    // Simulate deleting only p1Item
    globalThis.window.confirm = () => true;
    globalThis.window.DatabaseModule = {
      deleteWishesBulk: async () => ({
        success: true,
        deletedIds: [p1Item.id],
        deletedCount: 1,
        failedIds: [{ id: p2Item.id, error: "Locked" }]
      })
    };

    await AdminWishes.deleteSelectedWishes();

    // p2Item should still be selected
    assert.deepStrictEqual(AdminWishes.getSelectedIds(), [p2Item.id]);
    assert.strictEqual(mockElements["wishes-selected-count"].textContent, "1");
  });

  console.log("\n============================================================");
  console.log(`🎉 ALL ${testCount} PHASE 31B-6 BULK DELETE TESTS PASSED!`);
  console.log("============================================================\n");
})();
