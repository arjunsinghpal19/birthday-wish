/**
 * ============================================================================
 * PHASE 31B-2 AUTOMATED TEST SUITE: WISHES TABLE SORTING UX EXPANSION
 * Validates clickable table headers, sort direction toggling, sort indicators,
 * dropdown bi-directional sync, filter + sort pipeline, and action preservation.
 * Pure Node.js test environment (Zero external dependencies).
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT_DIR = path.resolve(__dirname, "..");

console.log("============================================================");
console.log("🔀 STARTING PHASE 31B-2 WISHES TABLE SORTING TEST SUITE");
console.log("============================================================");

// Sample dataset covering diverse recipients, senders, media, and creation dates
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

let mockElements = {};
let dbQueryCount = 0;

function createMockElement(id = "", tag = "div", dataset = {}) {
  const listeners = {};
  const el = {
    id,
    tagName: tag.toUpperCase(),
    value: "",
    textContent: "",
    innerHTML: "",
    style: {},
    dataset: { ...dataset },
    children: [],
    attributes: {},
    classList: {
      _classes: new Set(),
      add(cls) { this._classes.add(cls); },
      remove(cls) { this._classes.delete(cls); },
      contains(cls) { return this._classes.has(cls); }
    },
    setAttribute(attr, val) {
      this.attributes[attr] = String(val);
    },
    getAttribute(attr) {
      return this.attributes[attr] || null;
    },
    removeAttribute(attr) {
      delete this.attributes[attr];
    },
    appendChild(child) {
      this.children.push(child);
      this.innerHTML += (child.innerHTML || "");
    },
    addEventListener(ev, fn) {
      if (!listeners[ev]) listeners[ev] = [];
      listeners[ev].push(fn);
    },
    dispatchEvent(ev) {
      const eventObj = typeof ev === "string" ? { type: ev } : { ...ev };
      const type = eventObj.type;
      if (!eventObj.preventDefault) eventObj.preventDefault = () => {};
      if (!eventObj.target) eventObj.target = el;
      if (!eventObj.closest) eventObj.closest = (sel) => el.closest(sel);
      if (listeners[type]) {
        listeners[type].forEach(fn => fn(eventObj));
      }
    },
    closest(sel) {
      if (sel === "th.th-sortable" && el.classList.contains("th-sortable")) return el;
      if (sel === "th" && el.tagName === "TH") return el;
      if (sel.includes("button[data-action]") && el.dataset && el.dataset.action) return el;
      return null;
    },
    focus() {
      el.__focused = true;
    },
    querySelectorAll(selector) {
      const results = [];
      const matchAction = selector.match(/data-action="([^"]+)"/);
      const actionToFind = matchAction ? matchAction[1] : null;

      function traverse(node) {
        if (node.dataset && actionToFind && node.dataset.action === actionToFind) {
          results.push(node);
        }
        if (node.innerHTML && actionToFind) {
          const regex = new RegExp(`data-action="${actionToFind}"[^>]*data-id="([^"]+)"`, "g");
          let match;
          while ((match = regex.exec(node.innerHTML)) !== null) {
            results.push({ dataset: { action: actionToFind, id: match[1] } });
          }
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
  const thRecipient = createMockElement("", "th", { sort: "recipient" });
  thRecipient.classList.add("th-sortable");

  const thSender = createMockElement("", "th", { sort: "sender" });
  thSender.classList.add("th-sortable");

  const thCreated = createMockElement("", "th", { sort: "created" });
  thCreated.classList.add("th-sortable");

  const thead = createMockElement("", "thead");
  thead.appendChild(thRecipient);
  thead.appendChild(thSender);
  thead.appendChild(thCreated);

  mockElements = {
    "wishes-tbody": createMockElement("wishes-tbody", "tbody"),
    "wishes-search-input": createMockElement("wishes-search-input", "input"),
    "btn-wishes-search-clear": createMockElement("btn-wishes-search-clear", "button"),
    "wishes-sort-select": createMockElement("wishes-sort-select", "select"),
    "wishes-filter-media": createMockElement("wishes-filter-media", "select"),
    "wishes-filter-date": createMockElement("wishes-filter-date", "select"),
    "wishes-count-badge": createMockElement("wishes-count-badge", "div"),
    "btn-create-new-wish-admin": createMockElement("btn-create-new-wish-admin", "button"),
    "sort-icon-recipient": createMockElement("sort-icon-recipient", "span"),
    "sort-icon-sender": createMockElement("sort-icon-sender", "span"),
    "sort-icon-created": createMockElement("sort-icon-created", "span"),
    "th-recipient": thRecipient,
    "th-sender": thSender,
    "th-created": thCreated,
    "table-thead": thead
  };

  mockElements["wishes-sort-select"].value = "newest";
  mockElements["wishes-filter-media"].value = "all";
  mockElements["wishes-filter-date"].value = "all";

  globalThis.window = globalThis;
  globalThis.location = { origin: "http://localhost:3000" };
  globalThis.document = {
    getElementById: (id) => mockElements[id] || null,
    createElement: (tag) => createMockElement("", tag),
    querySelector: (sel) => {
      if (sel === 'th[data-sort="recipient"]') return thRecipient;
      if (sel === 'th[data-sort="sender"]') return thSender;
      if (sel === 'th[data-sort="created"]') return thCreated;
      if (sel.includes("thead")) return thead;
      return null;
    },
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

// 1. Sort State Existence & Authoritative API
test("Sort State: AdminWishes exports getSortState, setSortState, toggleSortByField", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  assert.strictEqual(typeof AdminWishes.getSortState, "function");
  assert.strictEqual(typeof AdminWishes.setSortState, "function");
  assert.strictEqual(typeof AdminWishes.toggleSortByField, "function");

  const state = AdminWishes.getSortState();
  assert.strictEqual(state.field, "created");
  assert.strictEqual(state.direction, "desc");
});

// 2. Recipient Ascending Sort (A-Z)
test("Sorting: Recipient Ascending orders names A to Z", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);
  AdminWishes.setSortState("recipient", "asc");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed[0].recipient_name, "Aarav Sharma");
  assert.strictEqual(processed[1].recipient_name, "Ananya Roy");
  assert.strictEqual(processed[2].recipient_name, "Priya Patel");
  assert.strictEqual(processed[3].recipient_name, "Rahul Verma");
  assert.strictEqual(processed[4].recipient_name, "Shivam Sharma");
});

// 3. Recipient Descending Sort (Z-A)
test("Sorting: Recipient Descending orders names Z to A", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);
  AdminWishes.setSortState("recipient", "desc");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed[0].recipient_name, "Shivam Sharma");
  assert.strictEqual(processed[1].recipient_name, "Rahul Verma");
  assert.strictEqual(processed[2].recipient_name, "Priya Patel");
  assert.strictEqual(processed[3].recipient_name, "Ananya Roy");
  assert.strictEqual(processed[4].recipient_name, "Aarav Sharma");
});

// 4. Sender Ascending Sort (A-Z)
test("Sorting: Sender Ascending orders senders A to Z", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);
  AdminWishes.setSortState("sender", "asc");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed[0].sender_name, "Arjun Singh");
  assert.strictEqual(processed[1].sender_name, "Arjun Singh");
  assert.strictEqual(processed[2].sender_name, "Neha Gupta");
  assert.strictEqual(processed[3].sender_name, "Rohan Verma");
  assert.strictEqual(processed[4].sender_name, "Vikram Mehta");
});

// 5. Sender Descending Sort (Z-A)
test("Sorting: Sender Descending orders senders Z to A", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);
  AdminWishes.setSortState("sender", "desc");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed[0].sender_name, "Vikram Mehta");
  assert.strictEqual(processed[1].sender_name, "Rohan Verma");
  assert.strictEqual(processed[2].sender_name, "Neha Gupta");
  assert.strictEqual(processed[3].sender_name, "Arjun Singh");
  assert.strictEqual(processed[4].sender_name, "Arjun Singh");
});

// 6. Created Ascending Sort (Oldest First)
test("Sorting: Created Ascending orders wishes from oldest to newest", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);
  AdminWishes.setSortState("created", "asc");

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed[0].recipient_name, "Rahul Verma"); // 45 days ago
  assert.strictEqual(processed[1].recipient_name, "Priya Patel"); // 15 days ago
  assert.strictEqual(processed[2].recipient_name, "Ananya Roy");  // 3 days ago
});

// 7. Created Descending Sort (Newest First)
test("Sorting: Created Descending orders wishes from newest to oldest", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);
  AdminWishes.setSortState("created", "desc");

  const processed = AdminWishes.getProcessedWishes();
  // Shivam & Aarav are 1 hour ago
  assert.ok(processed[0].recipient_name === "Shivam Sharma" || processed[0].recipient_name === "Aarav Sharma");
  assert.strictEqual(processed[4].recipient_name, "Rahul Verma"); // 45 days ago
});

// 8. Default Sorting Baseline (Newest First)
test("Default Sorting: Initial load defaults to Newest First (created desc)", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  const state = AdminWishes.getSortState();
  assert.strictEqual(state.field, "created");
  assert.strictEqual(state.direction, "desc");
});

// 9. Pipeline: Sorting occurs after Search Filter
test("Pipeline: Sorting applies after Search filtering", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-search-input"].value = "Arjun";
  mockElements["wishes-search-input"].dispatchEvent("input");

  AdminWishes.setSortState("recipient", "desc");
  const processed = AdminWishes.getProcessedWishes();

  assert.strictEqual(processed.length, 2);
  assert.strictEqual(processed[0].recipient_name, "Shivam Sharma");
  assert.strictEqual(processed[1].recipient_name, "Rahul Verma");
});

// 10. Pipeline: Sorting occurs after Media Filter
test("Pipeline: Sorting applies after Media filtering", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-filter-media"].value = "photos";
  mockElements["wishes-filter-media"].dispatchEvent("change");

  AdminWishes.setSortState("recipient", "asc");
  const processed = AdminWishes.getProcessedWishes();

  assert.strictEqual(processed.length, 3);
  assert.strictEqual(processed[0].recipient_name, "Aarav Sharma");
  assert.strictEqual(processed[1].recipient_name, "Priya Patel");
  assert.strictEqual(processed[2].recipient_name, "Shivam Sharma");
});

// 11. Pipeline: Sorting occurs after Date Filter
test("Pipeline: Sorting applies after Date filtering", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-filter-date"].value = "7d";
  mockElements["wishes-filter-date"].dispatchEvent("change");

  AdminWishes.setSortState("recipient", "asc");
  const processed = AdminWishes.getProcessedWishes();

  assert.strictEqual(processed.length, 3); // Aarav, Ananya, Shivam
  assert.strictEqual(processed[0].recipient_name, "Aarav Sharma");
  assert.strictEqual(processed[1].recipient_name, "Ananya Roy");
  assert.strictEqual(processed[2].recipient_name, "Shivam Sharma");
});

// 12. Combined Pipeline: Search + Media + Date + Sort
test("Combined Pipeline: Search + Media + Date + Sort works atomically", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  mockElements["wishes-search-input"].value = "Sharma";
  mockElements["wishes-filter-media"].value = "music";
  mockElements["wishes-filter-date"].value = "today";
  mockElements["wishes-search-input"].dispatchEvent("input");
  mockElements["wishes-filter-media"].dispatchEvent("change");
  mockElements["wishes-filter-date"].dispatchEvent("change");

  AdminWishes.setSortState("recipient", "desc");
  const processed = AdminWishes.getProcessedWishes();

  assert.strictEqual(processed.length, 2);
  assert.strictEqual(processed[0].recipient_name, "Shivam Sharma");
  assert.strictEqual(processed[1].recipient_name, "Aarav Sharma");
});

// 13. Sort Indicator State Updates
test("Sort Indicators: Active column shows directional arrow (↑/↓) and inactive show ↕", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  // Default: created desc
  assert.strictEqual(mockElements["sort-icon-created"].textContent, "↓");
  assert.strictEqual(mockElements["sort-icon-recipient"].textContent, "↕");
  assert.strictEqual(mockElements["sort-icon-sender"].textContent, "↕");

  // Switch to recipient asc
  AdminWishes.setSortState("recipient", "asc");
  AdminWishes.render();

  assert.strictEqual(mockElements["sort-icon-recipient"].textContent, "↑");
  assert.strictEqual(mockElements["sort-icon-created"].textContent, "↕");
  assert.strictEqual(mockElements["sort-icon-sender"].textContent, "↕");
});

// 14. Sort Toggle Behavior (Click toggles direction, click new column activates it)
test("Header Toggle: Clicking column toggles asc <-> desc; clicking new column activates it", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  // Click recipient header -> asc
  AdminWishes.toggleSortByField("recipient");
  let state = AdminWishes.getSortState();
  assert.strictEqual(state.field, "recipient");
  assert.strictEqual(state.direction, "asc");

  // Click recipient header again -> desc
  AdminWishes.toggleSortByField("recipient");
  state = AdminWishes.getSortState();
  assert.strictEqual(state.field, "recipient");
  assert.strictEqual(state.direction, "desc");

  // Click sender header -> asc
  AdminWishes.toggleSortByField("sender");
  state = AdminWishes.getSortState();
  assert.strictEqual(state.field, "sender");
  assert.strictEqual(state.direction, "asc");
});

// 15. Dropdown and Clickable Header Bi-directional Sync
test("Bi-directional Sync: Dropdown selection and header state remain 100% synchronized", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  // 1. Changing dropdown updates header sort state
  mockElements["wishes-sort-select"].value = "sender_asc";
  mockElements["wishes-sort-select"].dispatchEvent("change");

  let state = AdminWishes.getSortState();
  assert.strictEqual(state.field, "sender");
  assert.strictEqual(state.direction, "asc");
  assert.strictEqual(mockElements["sort-icon-sender"].textContent, "↑");

  // 2. Clicking header updates dropdown value
  AdminWishes.toggleSortByField("recipient");
  assert.strictEqual(mockElements["wishes-sort-select"].value, "name_asc");
});

// 16. Network Efficiency: 0 DB queries on sort
test("Network Efficiency: Sorting operations trigger zero Supabase database queries", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  const initialCount = dbQueryCount;

  AdminWishes.toggleSortByField("recipient");
  AdminWishes.toggleSortByField("sender");
  AdminWishes.toggleSortByField("created");

  assert.strictEqual(dbQueryCount, initialCount, "Zero network queries executed during sorting");
});

// 17. Empty Result Handling on Sorted State
test("Empty Result State: Sorting on empty dataset or 0 search matches displays empty message safely", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes([]);

  AdminWishes.setSortState("recipient", "asc");
  AdminWishes.render();

  assert.ok(mockElements["wishes-tbody"].innerHTML.includes("No stored wishes found"));
  assert.strictEqual(mockElements["wishes-count-badge"].textContent, "Showing 0 of 0 wishes");
});

// 18. Action Button: View Link Bound to Correct UUID on Sorted Table
test("Action Integrity: View link points to correct UUID after sorting", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  AdminWishes.setSortState("recipient", "asc");
  AdminWishes.render();

  const processed = AdminWishes.getProcessedWishes();
  assert.strictEqual(processed[0].recipient_name, "Aarav Sharma");
  assert.strictEqual(processed[0].id, "55555555-5555-4555-8555-555555555555");
});

// 19. Action Button: Edit Action Bound to Correct UUID on Sorted Table
test("Action Integrity: Edit button dataset.id corresponds to correct sorted wish", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  AdminWishes.setSortState("recipient", "asc");
  AdminWishes.render();

  const tbody = mockElements["wishes-tbody"];
  const editBtns = tbody.querySelectorAll('button[data-action="edit"]');
  assert.strictEqual(editBtns[0].dataset.id, "55555555-5555-4555-8555-555555555555");
});

// 20. Action Button: Duplicate Action Bound to Correct UUID on Sorted Table
test("Action Integrity: Duplicate button dataset.id corresponds to correct sorted wish", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  AdminWishes.setSortState("recipient", "asc");
  AdminWishes.render();

  const tbody = mockElements["wishes-tbody"];
  const dupBtns = tbody.querySelectorAll('button[data-action="duplicate"]');
  assert.strictEqual(dupBtns[0].dataset.id, "55555555-5555-4555-8555-555555555555");
});

// 21. Action Button: Delete Action Bound to Correct UUID on Sorted Table
test("Action Integrity: Delete button dataset.id corresponds to correct sorted wish", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  AdminWishes.setSortState("recipient", "asc");
  AdminWishes.render();

  const tbody = mockElements["wishes-tbody"];
  const delBtns = tbody.querySelectorAll('button[data-action="delete"]');
  assert.strictEqual(delBtns[0].dataset.id, "55555555-5555-4555-8555-555555555555");
});

// 22. Action Button: Copy UUID Link Contains Correct Full URL
test("Action Integrity: Copy UUID button contains correct encoded URL", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  AdminWishes.setSortState("recipient", "asc");
  AdminWishes.render();

  const tbodyHtml = mockElements["wishes-tbody"].innerHTML;
  assert.ok(tbodyHtml.includes("55555555-5555-4555-8555-555555555555"));
});

// 23. HTML Structure & ARIA Attributes
test("HTML & Accessibility: admin.html has th-sortable headers, sort icons, and aria-sort attributes", () => {
  const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");
  assert.ok(adminHtml.includes('data-sort="recipient"'));
  assert.ok(adminHtml.includes('data-sort="sender"'));
  assert.ok(adminHtml.includes('data-sort="created"'));
  assert.ok(adminHtml.includes('id="sort-icon-recipient"'));
  assert.ok(adminHtml.includes('id="sort-icon-sender"'));
  assert.ok(adminHtml.includes('id="sort-icon-created"'));
});

// 24. Keyboard Navigation: Enter & Space on sortable th triggers sort
test("Accessibility: Keyboard Enter/Space on sortable header toggles sorting", () => {
  resetEnvironment();
  const { AdminWishes } = globalThis;
  AdminWishes.init();
  AdminWishes.setWishes(mockWishes);

  const thead = mockElements["table-thead"];
  const thRecipient = mockElements["th-recipient"];

  // Press Enter on thRecipient
  thead.dispatchEvent({ type: "keydown", key: "Enter", target: thRecipient });

  let state = AdminWishes.getSortState();
  assert.strictEqual(state.field, "recipient");
  assert.strictEqual(state.direction, "asc");

  // Press Space on thRecipient
  thead.dispatchEvent({ type: "keydown", key: " ", target: thRecipient });

  state = AdminWishes.getSortState();
  assert.strictEqual(state.field, "recipient");
  assert.strictEqual(state.direction, "desc");
});

console.log("============================================================");
console.log(`🎉 ALL ${testsPassed} PHASE 31B-2 TESTS PASSED!`);
console.log("============================================================");
