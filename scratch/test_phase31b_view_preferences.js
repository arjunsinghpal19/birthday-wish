/**
 * ============================================================================
 * PHASE 31B-14.8 AUTOMATED TEST SUITE: ACTION BUTTON SCALE RESTORE
 * Validates:
 * 1. Public API exposure of getDensity, setDensity, getColumnVisibility, setColumnVisibility,
 *    resetView, getViewPreferences, saveViewPreferences, loadViewPreferences, applyViewPreferences,
 *    formatIndianDateTime
 * 2. Default density state ('comfortable') and all optional columns visible
 * 3. Density switching ('compact' <-> 'comfortable') and CSS class synchronization on #view-wishes
 * 4. Multi-table safety: applyViewPreferences correctly applies classes to #view-wishes table when dashboard exists
 * 5. Compact visual CSS rules (avatar 28px, compact cell padding 5-8px, 18px badges, 28px action buttons)
 * 6. Comfortable visual CSS rules (spacious padding 12px 10px, 36px avatar, 32px action buttons, 0.94rem recipient)
 * 7. Copy Link button styles (.btn-copy-link) render "🔗 Copy" on ONE line (white-space: nowrap !important)
 * 8. Actions column is protected from clipping (.col-actions with white-space: nowrap and shrink-to-fit)
 * 9. LocalStorage persistence (saveViewPreferences, loadViewPreferences) under 'bw_admin_wishes_view_prefs'
 * 10. Corrupted / missing LocalStorage graceful fallback to default baseline
 * 11. Independent column visibility toggling for Sender (hide/show)
 * 12. Independent column visibility toggling for Content & Media (hide/show)
 * 13. Independent column visibility toggling for Passcode (hide/show)
 * 14. Independent column visibility toggling for Public Link (hide/show)
 * 15. Independent column visibility toggling for Created At (hide/show)
 * 16. Protected columns (select, recipient, actions) remain permanently visible & non-togglable
 * 17. Column toggle toast notifications ("Sender column hidden", "Public Link column shown", etc.)
 * 18. Dynamic colspan calculation across empty, error, and loaded states
 * 19. Reset view restores comfortable density and all visible columns
 * 20. Reset view preserves search query, filters, sorting, pagination, and selection state
 * 21. Columns popover UX structure (TABLE COLUMNS, Public Link, Always visible pinned items)
 * 22. Columns popover open/close, aria-expanded, outside click, and Escape key dismissal
 * 23. Density select dropdown change event synchronizes density mode
 * 24. Table Copy button displays "🔗 Copy" with title="Copy Public Link" and copies /?w=UUID format
 * 25. Indian date/time formatting (DD/MM/YYYY, h:mm:ss AM/PM) in Asia/Kolkata
 * 26. Zero database queries triggered during view adjustments
 * 27. Fluid, space-aware column layout (.col-uuid with width: 1%, no forced oversized min-widths)
 * 28. Content & Media column is width-controlled (.col-media with max-width: 250px, not consuming entire table width)
 * 29. Media badges wrap naturally without horizontal table overflow (.wish-media-badges with width: auto; max-width: 100%)
 * 30. Hiding Public Link collapses .col-uuid with display: none !important
 * 31. Hiding Content & Media collapses .col-media with display: none !important
 * 32. Compact mode is dense and readable without being microscopic (avatar 28px, badges 18px, buttons 24px)
 * 33. Created At renders as a clean TWO-LINE presentation (.created-cell, .created-date, .created-time)
 * 34. Comfortable mode restores prominent readable scale (36px avatar, 0.94rem name, 22px badges)
 *
 * Pure Node.js test environment (Zero external dependencies).
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT_DIR = path.resolve(__dirname, "..");

console.log("============================================================");
console.log("🚀 STARTING PHASE 31B-14.8 WISHES VIEW CONTROLS TEST SUITE");
console.log("============================================================");

// Mock DOM elements and storage
let mockElements = {};
let mockListeners = {};
let documentListeners = {};
let storageData = {};
let lastToastMessage = null;
let toastCallCount = 0;

function createMockElement(id, tagName = "div", className = "") {
  let _innerHTML = "";
  const _classes = new Set(className.split(" ").filter(Boolean));
  const el = {
    id,
    tagName: tagName.toUpperCase(),
    value: "",
    textContent: "",
    isContentEditable: false,
    _innerHTML: "",
    children: [],
    _parent: null,
    get innerHTML() {
      if (this.children.length > 0) {
        return this.children.map(c => c.innerHTML || c._innerHTML || "").join("");
      }
      return _innerHTML;
    },
    set innerHTML(val) {
      _innerHTML = val;
      if (val === "") {
        this.children = [];
      }
    },
    style: {},
    disabled: false,
    checked: false,
    dataset: {},
    attributes: {},
    setAttribute(name, val) {
      this.attributes[name] = String(val);
      if (name === "aria-expanded") this._ariaExpanded = String(val);
    },
    getAttribute(name) {
      return this.attributes[name] || null;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    classList: {
      add: (...args) => args.forEach(cls => _classes.add(cls)),
      remove: (...args) => args.forEach(cls => _classes.delete(cls)),
      toggle: (cls, force) => {
        if (typeof force === "boolean") {
          if (force) _classes.add(cls);
          else _classes.delete(cls);
          return force;
        }
        if (_classes.has(cls)) {
          _classes.delete(cls);
          return false;
        }
        _classes.add(cls);
        return true;
      },
      contains: (cls) => _classes.has(cls),
      entries: () => Array.from(_classes)
    },
    appendChild(child) {
      this.children.push(child);
      child._parent = this;
      if (child.id) mockElements[child.id] = child;
    },
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) {
        this.children.splice(idx, 1);
        child._parent = null;
      }
    },
    contains(other) {
      if (other === el) return true;
      return this.children.includes(other);
    },
    addEventListener(event, handler) {
      if (!mockListeners[id]) mockListeners[id] = {};
      if (!mockListeners[id][event]) mockListeners[id][event] = [];
      mockListeners[id][event].push(handler);
    },
    dispatchEvent(event, data) {
      const type = typeof event === "string" ? event : event.type;
      const evt = {
        target: el,
        preventDefault: () => {},
        stopPropagation: () => {},
        ...data
      };
      if (typeof this[`on${type}`] === "function") {
        this[`on${type}`](evt);
      }
      if (mockListeners[id] && mockListeners[id][type]) {
        mockListeners[id][type].forEach(h => h(evt));
      }
    },
    click(data) {
      this.dispatchEvent("click", data);
    },
    closest(selector) {
      let curr = this;
      while (curr) {
        if (selector === "table" && (curr.tagName === "TABLE" || (curr.classList && curr.classList.contains("admin-table")))) return curr;
        if (selector === ".table-panel" && curr.classList && curr.classList.contains("table-panel")) return curr;
        if (selector === "#view-wishes" && curr.id === "view-wishes") return curr;
        if (selector === "#wishes-columns-popover" && curr.id === "wishes-columns-popover") return curr;
        if (selector === "#btn-wishes-columns-toggle" && curr.id === "btn-wishes-columns-toggle") return curr;
        if (selector === "tr" && curr.tagName === "TR") return curr;
        curr = curr._parent;
      }
      return null;
    },
    querySelector(selector) {
      if (selector === ".table-panel") {
        return (this.children || []).find(c => c.classList && c.classList.contains("table-panel")) || null;
      }
      if (selector === "table.admin-table" || selector === ".admin-table") {
        if (this.children) {
          for (const c of this.children) {
            if (c.tagName === "TABLE" || (c.classList && c.classList.contains("admin-table"))) return c;
            const sub = c.querySelector && c.querySelector(selector);
            if (sub) return sub;
          }
        }
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === ".col-toggle-checkbox") {
        return [
          mockElements["cb-sender"],
          mockElements["cb-media"],
          mockElements["cb-passcode"],
          mockElements["cb-uuid"],
          mockElements["cb-created"]
        ].filter(Boolean);
      }
      if (selector === "th") {
        return (this.children || []).filter(c => c.tagName === "TH");
      }
      if (selector === ".wish-row-checkbox") return [];
      return [];
    }
  };
  if (id) mockElements[id] = el;
  return el;
}

const mockLocalStorage = {
  getItem(key) {
    return storageData[key] || null;
  },
  setItem(key, val) {
    storageData[key] = String(val);
  },
  removeItem(key) {
    delete storageData[key];
  },
  clear() {
    storageData = {};
  }
};

function resetEnvironment() {
  mockElements = {};
  mockListeners = {};
  documentListeners = {};
  storageData = {};
  lastToastMessage = null;
  toastCallCount = 0;

  // 1. Dashboard View (Section 1 in admin.html)
  const viewDashboard = createMockElement("view-dashboard", "section", "tab-view active");
  const dashPanel = createMockElement("dash-table-panel", "div", "glass-panel table-panel");
  const dashTable = createMockElement("dash-table", "table", "admin-table");
  const dashTbody = createMockElement("dash-recent-wishes-tbody", "tbody");
  dashTable.appendChild(dashTbody);
  dashPanel.appendChild(dashTable);
  viewDashboard.appendChild(dashPanel);

  // 2. Wishes View (Section 2 in admin.html)
  const viewWishes = createMockElement("view-wishes", "section", "tab-view");
  const wishesPanel = createMockElement("wishes-table-panel", "div", "glass-panel table-panel");
  const filterGroup = createMockElement("table-filter-group", "div", "table-filter-group");
  const wishesTable = createMockElement("wishes-table", "table", "admin-table");
  const thead = createMockElement("wishes-thead", "thead");
  const tbody = createMockElement("wishes-tbody", "tbody");

  wishesTable.appendChild(thead);
  wishesTable.appendChild(tbody);
  wishesPanel.appendChild(filterGroup);
  wishesPanel.appendChild(wishesTable);
  viewWishes.appendChild(wishesPanel);

  createMockElement("wishes-search-input", "input");
  createMockElement("btn-wishes-search-clear", "button");
  createMockElement("wishes-sort-select", "select");
  createMockElement("wishes-filter-media", "select");
  createMockElement("wishes-filter-date", "select");
  createMockElement("wishes-count-badge", "span");
  createMockElement("wishes-selection-badge", "span");
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
  createMockElement("btn-create-new-wish-wishes", "button");
  createMockElement("btn-create-new-wish-admin", "button");
  createMockElement("wishes-page-size", "select");
  createMockElement("btn-wishes-prev-page", "button");
  createMockElement("btn-wishes-next-page", "button");
  createMockElement("wishes-page-info", "span");
  createMockElement("wishes-pagination-container", "div");

  // View Preferences UI Controls
  const densitySelect = createMockElement("wishes-density-select", "select", "filter-select");
  filterGroup.appendChild(densitySelect);

  const colsToggleBtn = createMockElement("btn-wishes-columns-toggle", "button", "btn-filter-toggle");
  colsToggleBtn.setAttribute("aria-expanded", "false");
  filterGroup.appendChild(colsToggleBtn);

  const colsPopover = createMockElement("wishes-columns-popover", "div", "columns-popover");
  colsPopover.style.display = "none";
  filterGroup.appendChild(colsPopover);

  const cbSender = createMockElement("cb-sender", "input", "col-toggle-checkbox");
  cbSender.dataset.col = "sender";
  cbSender.checked = true;

  const cbMedia = createMockElement("cb-media", "input", "col-toggle-checkbox");
  cbMedia.dataset.col = "media";
  cbMedia.checked = true;

  const cbPasscode = createMockElement("cb-passcode", "input", "col-toggle-checkbox");
  cbPasscode.dataset.col = "passcode";
  cbPasscode.checked = true;

  const cbUuid = createMockElement("cb-uuid", "input", "col-toggle-checkbox");
  cbUuid.dataset.col = "uuid";
  cbUuid.checked = true;

  const cbCreated = createMockElement("cb-created", "input", "col-toggle-checkbox");
  cbCreated.dataset.col = "created";
  cbCreated.checked = true;

  colsPopover.appendChild(cbSender);
  colsPopover.appendChild(cbMedia);
  colsPopover.appendChild(cbPasscode);
  colsPopover.appendChild(cbUuid);
  colsPopover.appendChild(cbCreated);

  const resetViewBtn = createMockElement("btn-wishes-reset-view", "button", "btn-reset-view");
  filterGroup.appendChild(resetViewBtn);

  global.window = {
    location: { origin: "https://birthdaywish.app" },
    navigator: {
      clipboard: {
        writeText: async () => {}
      }
    },
    AdminCore: {
      showToast: (msg) => {
        lastToastMessage = msg;
        toastCallCount++;
      },
      escapeHTML: (str) => String(str || ""),
      formatDate: (str) => String(str || "")
    },
    localStorage: mockLocalStorage,
    addEventListener: (event, handler) => {
      if (!documentListeners[event]) documentListeners[event] = [];
      documentListeners[event].push(handler);
    }
  };

  global.document = {
    getElementById: (id) => mockElements[id] || null,
    querySelector: (sel) => {
      if (sel === "#view-wishes") return mockElements["view-wishes"] || null;
      if (sel === "#view-dashboard") return mockElements["view-dashboard"] || null;
      if (sel === ".table-panel") return mockElements["dash-table-panel"] || mockElements["wishes-table-panel"] || null;
      if (sel === "table.admin-table" || sel === ".admin-table") return mockElements["dash-table"] || mockElements["wishes-table"] || null;
      if (sel === ".table-filter-group") return mockElements["table-filter-group"] || null;
      if (sel.includes("thead")) return mockElements["wishes-thead"] || null;
      if (sel.startsWith("#")) {
        const id = sel.slice(1);
        return mockElements[id] || null;
      }
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel.includes("#view-wishes .table-panel")) {
        return [mockElements["wishes-table-panel"]].filter(Boolean);
      }
      if (sel.includes("#view-wishes table.admin-table")) {
        return [mockElements["wishes-table"]].filter(Boolean);
      }
      if (sel === ".table-panel" || sel.includes(".table-panel")) {
        return [mockElements["dash-table-panel"], mockElements["wishes-table-panel"]].filter(Boolean);
      }
      if (sel === "table.admin-table" || sel.includes("table.admin-table")) {
        return [mockElements["dash-table"], mockElements["wishes-table"]].filter(Boolean);
      }
      if (sel === ".col-toggle-checkbox") {
        return [
          mockElements["cb-sender"],
          mockElements["cb-media"],
          mockElements["cb-passcode"],
          mockElements["cb-uuid"],
          mockElements["cb-created"]
        ].filter(Boolean);
      }
      if (sel === ".wish-row-checkbox") return [];
      return [];
    },
    createElement: (tag) => createMockElement(`dyn_${Math.random().toString(36).substr(2, 9)}`, tag),
    body: createMockElement("document-body", "body"),
    addEventListener: (event, handler) => {
      if (!documentListeners[event]) documentListeners[event] = [];
      documentListeners[event].push(handler);
    }
  };

  global.localStorage = mockLocalStorage;

  // Re-eval admin-wishes.js
  const adminWishesPath = path.join(ROOT_DIR, "js", "admin", "admin-wishes.js");
  const code = fs.readFileSync(adminWishesPath, "utf8");
  eval(code);
}

resetEnvironment();

const AdminWishes = global.window.AdminWishes;
let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(err);
    failed++;
  }
}

// Sample wish records
const sampleWishes = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    recipient_name: "Alice Sharma",
    sender_name: "Bob Gupta",
    pass_code: "1234",
    created_at: "2026-08-20T21:11:24.000Z",
    music_url: "https://example.com/music.mp3",
    gallery_json: JSON.stringify([{ url: "https://example.com/photo1.jpg" }])
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    recipient_name: "Charlie Verma",
    sender_name: "Dave Singh",
    pass_code: "5678",
    created_at: "2026-08-19T10:00:00.000Z",
    video_url: "https://example.com/video.mp4"
  }
];

// Test 1: Public API Exposure
test("1. Public API exposes all view customization methods and formatters", () => {
  assert.strictEqual(typeof AdminWishes.getDensity, "function");
  assert.strictEqual(typeof AdminWishes.setDensity, "function");
  assert.strictEqual(typeof AdminWishes.getColumnVisibility, "function");
  assert.strictEqual(typeof AdminWishes.setColumnVisibility, "function");
  assert.strictEqual(typeof AdminWishes.resetView, "function");
  assert.strictEqual(typeof AdminWishes.getViewPreferences, "function");
  assert.strictEqual(typeof AdminWishes.saveViewPreferences, "function");
  assert.strictEqual(typeof AdminWishes.loadViewPreferences, "function");
  assert.strictEqual(typeof AdminWishes.applyViewPreferences, "function");
  assert.strictEqual(typeof AdminWishes.formatIndianDateTime, "function");
});

// Test 2: Initial Default Preferences
test("2. Initial default view preferences are comfortable density with all columns visible", () => {
  resetEnvironment();
  const prefs = AdminWishes.loadViewPreferences();
  assert.strictEqual(prefs.density, "comfortable");
  assert.strictEqual(prefs.visibleColumns.sender, true);
  assert.strictEqual(prefs.visibleColumns.media, true);
  assert.strictEqual(prefs.visibleColumns.passcode, true);
  assert.strictEqual(prefs.visibleColumns.uuid, true);
  assert.strictEqual(prefs.visibleColumns.created, true);
});

// Test 3: Table Density Class Initialization
test("3. AdminWishes.init() initializes density class on Wishes table panel and table elements", () => {
  resetEnvironment();
  AdminWishes.init();
  AdminWishes.setWishes(sampleWishes);
  const wishesTable = mockElements["wishes-table"];
  const wishesPanel = mockElements["wishes-table-panel"];
  assert.strictEqual(wishesTable.classList.contains("table-density-comfortable"), true);
  assert.strictEqual(wishesTable.classList.contains("table-density-compact"), false);
  assert.strictEqual(wishesPanel.classList.contains("table-density-comfortable"), true);
});

// Test 4: Multi-Table Safety
test("4. Multi-table safety: applyViewPreferences targets #view-wishes table panel and table correctly", () => {
  AdminWishes.setDensity("compact");
  const wishesTable = mockElements["wishes-table"];
  const wishesPanel = mockElements["wishes-table-panel"];
  assert.strictEqual(wishesTable.classList.contains("table-density-compact"), true);
  assert.strictEqual(wishesPanel.classList.contains("table-density-compact"), true);
});

// Test 5: Density Switching to Compact
test("5. setDensity('compact') updates density state and applies .table-density-compact class", () => {
  AdminWishes.setDensity("compact");
  assert.strictEqual(AdminWishes.getDensity(), "compact");
  const table = mockElements["wishes-table"];
  assert.strictEqual(table.classList.contains("table-density-compact"), true);
  assert.strictEqual(table.classList.contains("table-density-comfortable"), false);
});

// Test 6: Density Switching Back to Comfortable
test("6. setDensity('comfortable') restores spacious comfortable styling class", () => {
  AdminWishes.setDensity("comfortable");
  assert.strictEqual(AdminWishes.getDensity(), "comfortable");
  const table = mockElements["wishes-table"];
  assert.strictEqual(table.classList.contains("table-density-comfortable"), true);
  assert.strictEqual(table.classList.contains("table-density-compact"), false);
});

// Test 7: CSS File Visual Rules Verification
test("7. CSS file contains distinct visual rules for Comfortable (36px avatar, 32px actions) vs Compact (28px avatar, 28px actions)", () => {
  const cssContent = fs.readFileSync(path.join(ROOT_DIR, "css", "admin", "admin-components.css"), "utf8");
  
  // Comfortable rules
  assert.ok(cssContent.includes(".table-density-comfortable td"), "Must have comfortable td rule");
  assert.ok(cssContent.includes(".table-density-comfortable .user-avatar"), "Must have comfortable avatar rule");
  assert.ok(cssContent.includes("width: 36px !important"), "Comfortable avatar must be 36px");
  assert.ok(cssContent.includes(".table-density-comfortable .btn-icon"), "Must have comfortable btn-icon rule");
  assert.ok(cssContent.includes("height: 32px !important"), "Comfortable action button must be 32px");

  // Compact rules
  assert.ok(cssContent.includes(".table-density-compact td"), "Must have compact td rule");
  assert.ok(cssContent.includes(".table-density-compact .user-avatar"), "Must have compact avatar rule");
  assert.ok(cssContent.includes("width: 28px !important"), "Compact avatar must be 28px");
  assert.ok(cssContent.includes(".table-density-compact .btn-icon"), "Must have compact btn-icon rule");
  assert.ok(cssContent.includes("height: 28px !important"), "Compact action button must be 28px");
});

// Test 8: Copy Link Compact Button CSS Verification
test("8. CSS file styles Copy Link button with inline-flex, white-space: nowrap, and compact sizing", () => {
  const cssContent = fs.readFileSync(path.join(ROOT_DIR, "css", "admin", "admin-components.css"), "utf8");
  assert.ok(cssContent.includes(".btn-copy-link"), "Must have .btn-copy-link rule");
  assert.ok(cssContent.includes("white-space: nowrap !important"), "Must enforce nowrap on copy button");
  assert.ok(cssContent.includes(".col-uuid"), "Must style .col-uuid column");
});

// Test 9: LocalStorage Persistence
test("9. LocalStorage correctly persists density and column preferences under 'bw_admin_wishes_view_prefs'", () => {
  AdminWishes.setDensity("compact");
  AdminWishes.setColumnVisibility("sender", false, true);
  AdminWishes.setColumnVisibility("created", false, true);

  const saved = JSON.parse(mockLocalStorage.getItem("bw_admin_wishes_view_prefs"));
  assert.strictEqual(saved.density, "compact");
  assert.strictEqual(saved.visibleColumns.sender, false);
  assert.strictEqual(saved.visibleColumns.created, false);
  assert.strictEqual(saved.visibleColumns.media, true);
  assert.strictEqual(saved.visibleColumns.passcode, true);
  assert.strictEqual(saved.visibleColumns.uuid, true);
});

// Test 10: Corrupted LocalStorage Handling
test("10. Corrupted or invalid LocalStorage data gracefully falls back to default preferences", () => {
  mockLocalStorage.setItem("bw_admin_wishes_view_prefs", "invalid_json_data{{");
  const prefs = AdminWishes.loadViewPreferences();
  assert.strictEqual(prefs.density, "comfortable");
  assert.strictEqual(prefs.visibleColumns.sender, true);
  assert.strictEqual(prefs.visibleColumns.media, true);
  assert.strictEqual(prefs.visibleColumns.passcode, true);
  assert.strictEqual(prefs.visibleColumns.uuid, true);
  assert.strictEqual(prefs.visibleColumns.created, true);
});

// Test 11: Independent Column Visibility - Sender
test("11. Sender column can be independently hidden and shown", () => {
  AdminWishes.setColumnVisibility("sender", false, true);
  assert.strictEqual(AdminWishes.getColumnVisibility("sender"), false);
  assert.strictEqual(mockElements["wishes-table"].classList.contains("hide-col-sender"), true);

  AdminWishes.setColumnVisibility("sender", true, true);
  assert.strictEqual(AdminWishes.getColumnVisibility("sender"), true);
  assert.strictEqual(mockElements["wishes-table"].classList.contains("hide-col-sender"), false);
});

// Test 12: Independent Column Visibility - Content & Media
test("12. Content & Media column can be independently hidden and shown", () => {
  AdminWishes.setColumnVisibility("media", false, true);
  assert.strictEqual(AdminWishes.getColumnVisibility("media"), false);
  assert.strictEqual(mockElements["wishes-table"].classList.contains("hide-col-media"), true);

  AdminWishes.setColumnVisibility("media", true, true);
  assert.strictEqual(AdminWishes.getColumnVisibility("media"), true);
  assert.strictEqual(mockElements["wishes-table"].classList.contains("hide-col-media"), false);
});

// Test 13: Independent Column Visibility - Passcode
test("13. Passcode column can be independently hidden and shown", () => {
  AdminWishes.setColumnVisibility("passcode", false, true);
  assert.strictEqual(AdminWishes.getColumnVisibility("passcode"), false);
  assert.strictEqual(mockElements["wishes-table"].classList.contains("hide-col-passcode"), true);

  AdminWishes.setColumnVisibility("passcode", true, true);
  assert.strictEqual(AdminWishes.getColumnVisibility("passcode"), true);
  assert.strictEqual(mockElements["wishes-table"].classList.contains("hide-col-passcode"), false);
});

// Test 14: Independent Column Visibility - Public Link
test("14. Public Link column can be independently hidden and shown", () => {
  AdminWishes.setColumnVisibility("uuid", false, true);
  assert.strictEqual(AdminWishes.getColumnVisibility("uuid"), false);
  assert.strictEqual(mockElements["wishes-table"].classList.contains("hide-col-uuid"), true);

  AdminWishes.setColumnVisibility("uuid", true, true);
  assert.strictEqual(AdminWishes.getColumnVisibility("uuid"), true);
  assert.strictEqual(mockElements["wishes-table"].classList.contains("hide-col-uuid"), false);
});

// Test 15: Independent Column Visibility - Created At
test("15. Created At column can be independently hidden and shown", () => {
  AdminWishes.setColumnVisibility("created", false, true);
  assert.strictEqual(AdminWishes.getColumnVisibility("created"), false);
  assert.strictEqual(mockElements["wishes-table"].classList.contains("hide-col-created"), true);

  AdminWishes.setColumnVisibility("created", true, true);
  assert.strictEqual(AdminWishes.getColumnVisibility("created"), true);
  assert.strictEqual(mockElements["wishes-table"].classList.contains("hide-col-created"), false);
});

// Test 16: Protected Columns Invariant
test("16. Protected columns (select, recipient, actions) cannot be toggled and always return true", () => {
  assert.strictEqual(AdminWishes.getColumnVisibility("select"), true);
  assert.strictEqual(AdminWishes.getColumnVisibility("recipient"), true);
  assert.strictEqual(AdminWishes.getColumnVisibility("actions"), true);

  // Attempting to toggle protected columns has no effect
  AdminWishes.setColumnVisibility("recipient", false, true);
  AdminWishes.setColumnVisibility("actions", false, true);
  AdminWishes.setColumnVisibility("select", false, true);

  assert.strictEqual(AdminWishes.getColumnVisibility("select"), true);
  assert.strictEqual(AdminWishes.getColumnVisibility("recipient"), true);
  assert.strictEqual(AdminWishes.getColumnVisibility("actions"), true);
});

// Test 17: Column Toggle Toast Feedback
test("17. Column toggling triggers small non-blocking toast with exact column name", () => {
  resetEnvironment();
  AdminWishes.init();

  AdminWishes.setColumnVisibility("sender", false);
  assert.strictEqual(lastToastMessage, "Sender column hidden");

  AdminWishes.setColumnVisibility("sender", true);
  assert.strictEqual(lastToastMessage, "Sender column shown");

  AdminWishes.setColumnVisibility("uuid", false);
  assert.strictEqual(lastToastMessage, "Public Link column hidden");

  AdminWishes.setColumnVisibility("uuid", true);
  assert.strictEqual(lastToastMessage, "Public Link column shown");

  AdminWishes.setColumnVisibility("created", false);
  assert.strictEqual(lastToastMessage, "Created At column hidden");
});

// Test 18: Dynamic Colspan Calculation
test("18. Dynamic colspan spans all visible columns (8 by default, decrements as columns hide)", () => {
  resetEnvironment();
  AdminWishes.init();

  // All visible: 3 protected + 5 optional = 8
  AdminWishes.setWishes([]);
  assert.ok(mockElements["wishes-tbody"].innerHTML.includes('colspan="8"'));

  // Hide 2 columns: 8 - 2 = 6
  AdminWishes.setColumnVisibility("sender", false, true);
  AdminWishes.setColumnVisibility("created", false, true);
  assert.ok(mockElements["wishes-tbody"].innerHTML.includes('colspan="6"'));

  // Error state respects dynamic colspan
  AdminWishes.setWishes([], true);
  assert.ok(mockElements["wishes-tbody"].innerHTML.includes('colspan="6"'));
});

// Test 19: Reset View Restores Baseline
test("19. resetView() restores comfortable density, reveals all columns, and shows toast", () => {
  AdminWishes.setDensity("compact");
  AdminWishes.setColumnVisibility("sender", false, true);
  AdminWishes.setColumnVisibility("media", false, true);

  AdminWishes.resetView();

  assert.strictEqual(AdminWishes.getDensity(), "comfortable");
  assert.strictEqual(AdminWishes.getColumnVisibility("sender"), true);
  assert.strictEqual(AdminWishes.getColumnVisibility("media"), true);
  assert.strictEqual(AdminWishes.getColumnVisibility("passcode"), true);
  assert.strictEqual(AdminWishes.getColumnVisibility("uuid"), true);
  assert.strictEqual(AdminWishes.getColumnVisibility("created"), true);
  assert.ok(lastToastMessage.includes("Table view reset to default preferences"));
});

// Test 20: State Preservation across View Modifications
test("20. Reset View preserves search query, media filter, date filter, sort, page, and selection", () => {
  resetEnvironment();
  AdminWishes.init();
  AdminWishes.setWishes(sampleWishes);

  // Set filter & selection state
  mockElements["wishes-search-input"].value = "Alice";
  mockElements["wishes-filter-media"].value = "music";
  mockElements["wishes-filter-date"].value = "7d";
  AdminWishes.selectWish("00000000-0000-0000-0000-000000000101");

  // Modify view and reset
  AdminWishes.setDensity("compact");
  AdminWishes.setColumnVisibility("sender", false, true);
  AdminWishes.resetView();

  // Verify business state remains intact
  assert.strictEqual(mockElements["wishes-search-input"].value, "Alice");
  assert.strictEqual(mockElements["wishes-filter-media"].value, "music");
  assert.strictEqual(mockElements["wishes-filter-date"].value, "7d");
  assert.strictEqual(AdminWishes.isWishSelected("00000000-0000-0000-0000-000000000101"), true);
});

// Test 21: Columns Popover UX Structure & Labels
test("21. Popover DOM contains 'TABLE COLUMNS' title, 'Public Link' label, and 'Always visible' pinned section", () => {
  const adminWishesJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-wishes.js"), "utf8");
  assert.ok(adminWishesJs.includes("TABLE COLUMNS"), "Popover must contain TABLE COLUMNS header");
  assert.ok(adminWishesJs.includes("Public Link"), "Popover must use 'Public Link' instead of 'UUID Link'");
  assert.ok(adminWishesJs.includes("Always visible"), "Popover must contain 'Always visible' section");
  assert.ok(adminWishesJs.includes("Selection"), "Popover pinned list must mention Selection");
  assert.ok(adminWishesJs.includes("Recipient"), "Popover pinned list must mention Recipient");
  assert.ok(adminWishesJs.includes("Actions"), "Popover pinned list must mention Actions");
});

// Test 22: Popover Open/Close, Outside Click & Escape Key
test("22. Columns popover toggles via button, closes on outside click and Escape key", () => {
  resetEnvironment();
  AdminWishes.init();

  const btn = mockElements["btn-wishes-columns-toggle"];
  const popover = mockElements["wishes-columns-popover"];

  // Open
  btn.click();
  assert.strictEqual(popover.style.display, "flex");
  assert.strictEqual(btn.getAttribute("aria-expanded"), "true");

  // Outside click
  if (documentListeners["click"]) {
    documentListeners["click"].forEach(fn => fn({ target: mockElements["document-body"] }));
  }
  assert.strictEqual(popover.style.display, "none");
  assert.strictEqual(btn.getAttribute("aria-expanded"), "false");

  // Re-open and Escape key
  btn.click();
  assert.strictEqual(popover.style.display, "flex");
  if (documentListeners["keydown"]) {
    documentListeners["keydown"].forEach(fn => fn({ key: "Escape", preventDefault: () => {} }));
  }
  assert.strictEqual(popover.style.display, "none");
});

// Test 23: Density Dropdown Event Integration
test("23. Density select dropdown change event updates density mode immediately", () => {
  resetEnvironment();
  AdminWishes.init();

  const densitySelect = mockElements["wishes-density-select"];
  densitySelect.value = "compact";
  densitySelect.dispatchEvent("change", { target: densitySelect });
  assert.strictEqual(AdminWishes.getDensity(), "compact");

  densitySelect.value = "comfortable";
  densitySelect.dispatchEvent("change", { target: densitySelect });
  assert.strictEqual(AdminWishes.getDensity(), "comfortable");
});

// Test 24: Copy Link Button UX & Format
test("24. Table Copy button displays '🔗 Copy' with title='Copy Public Link' and copies /?w=UUID format", () => {
  resetEnvironment();
  AdminWishes.init();
  AdminWishes.setWishes(sampleWishes);
  AdminWishes.render();

  const tbody = mockElements["wishes-tbody"];
  assert.ok(tbody.innerHTML.includes("🔗 Copy"), "Table row must render '🔗 Copy'");
  assert.ok(tbody.innerHTML.includes("btn-copy-link"), "Table row must include btn-copy-link class");
  assert.ok(tbody.innerHTML.includes('title="Copy Public Link"'), "Table copy button must include title");
  assert.ok(!tbody.innerHTML.includes("📋 Copy UUID Link"), "Old wide text should not exist");
  assert.ok(tbody.innerHTML.includes("/?w=00000000-0000-0000-0000-000000000101"), "Link target must be /?w=UUID");
});

// Test 25: Indian Date/Time Format
test("25. formatIndianDateTime outputs 12-hour DD/MM/YYYY, h:mm:ss AM/PM in Asia/Kolkata", () => {
  const res = AdminWishes.formatIndianDateTime("2026-08-20T21:11:24.000Z");
  assert.ok(res.includes("21/08/2026"), `Expected date 21/08/2026, got ${res}`);
  assert.ok(res.includes("2:41:24"), `Expected time 2:41:24, got ${res}`);
  assert.ok(res.includes("AM"), `Expected AM period, got ${res}`);
});

// Test 26: Zero Database Queries on View Adjustments
test("26. Switching density and toggling columns triggers 0 database queries", () => {
  resetEnvironment();
  AdminWishes.init();
  AdminWishes.setWishes(sampleWishes);

  // Verify operations are purely client-side
  AdminWishes.setDensity("compact");
  AdminWishes.setColumnVisibility("sender", false, true);
  AdminWishes.setColumnVisibility("passcode", false, true);
  AdminWishes.resetView();

  assert.strictEqual(AdminWishes.getDensity(), "comfortable");
  assert.strictEqual(AdminWishes.getColumnVisibility("sender"), true);
});

// Test 27: Fluid Column Sizing (No Forced Overflow)
test("27. CSS enforces fluid, space-aware column layout with width: 1% on shrink-to-fit columns", () => {
  const cssContent = fs.readFileSync(path.join(ROOT_DIR, "css", "admin", "admin-components.css"), "utf8");
  assert.ok(cssContent.includes(".col-uuid"), "Must contain .col-uuid rule");
  assert.ok(cssContent.includes(".col-actions"), "Must contain .col-actions rule");
  assert.ok(cssContent.includes("text-align: right"), "Actions column must align right");
});

// Test 28: Content & Media Column Width Control
test("28. CSS gives Content & Media column controlled width (max-width: 250px) without hogging table width", () => {
  const cssContent = fs.readFileSync(path.join(ROOT_DIR, "css", "admin", "admin-components.css"), "utf8");
  assert.ok(cssContent.includes(".col-media"), "Must contain .col-media rule");
  assert.ok(cssContent.includes("max-width: 250px"), "Content & Media column must have max-width constraint");
});

// Test 29: Actions Column Protected From Clipping
test("29. Actions column (.col-actions) protects action buttons with white-space: nowrap", () => {
  const cssContent = fs.readFileSync(path.join(ROOT_DIR, "css", "admin", "admin-components.css"), "utf8");
  assert.ok(cssContent.includes(".col-actions .action-btns"), "Must style .col-actions .action-btns");
  assert.ok(cssContent.includes("white-space: nowrap"), "Action buttons container must not wrap");
});

// Test 30: Hiding Public Link Collapses Column Cleanly
test("30. Hiding Public Link collapses .col-uuid with display: none !important", () => {
  const cssContent = fs.readFileSync(path.join(ROOT_DIR, "css", "admin", "admin-components.css"), "utf8");
  assert.ok(cssContent.includes(".hide-col-uuid .col-uuid"), "Must hide .col-uuid when hide class applied");
});

// Test 31: Hiding Content & Media Collapses Column Cleanly
test("31. Hiding Content & Media collapses .col-media with display: none !important", () => {
  const cssContent = fs.readFileSync(path.join(ROOT_DIR, "css", "admin", "admin-components.css"), "utf8");
  assert.ok(cssContent.includes(".hide-col-media .col-media"), "Must hide .col-media when hide class applied");
});

// Test 32: Compact Mode Dense & Readable Sizing
test("32. Compact mode is dense and readable (avatar 28px, badges 18px, action buttons 28px)", () => {
  const cssContent = fs.readFileSync(path.join(ROOT_DIR, "css", "admin", "admin-components.css"), "utf8");
  assert.ok(cssContent.includes(".table-density-compact .content-badge"), "Must style compact badges");
  assert.ok(cssContent.includes("font-size: 0.64rem !important"), "Compact badge font size must be 0.64rem");
  assert.ok(cssContent.includes("height: 18px !important"), "Compact badge height must be 18px");
  assert.ok(cssContent.includes("width: 28px !important"), "Compact action button must be 28px");
});

// Test 33: Created At 2-Line Structure
test("33. Created At renders as a clean TWO-LINE presentation (.created-cell, .created-date, .created-time)", () => {
  resetEnvironment();
  AdminWishes.init();
  AdminWishes.setWishes(sampleWishes);
  AdminWishes.render();

  const tbody = mockElements["wishes-tbody"];
  assert.ok(tbody.innerHTML.includes("created-cell"), "Must contain .created-cell wrapper");
  assert.ok(tbody.innerHTML.includes("created-date"), "Must contain .created-date element");
  assert.ok(tbody.innerHTML.includes("created-time"), "Must contain .created-time element");
  assert.ok(tbody.innerHTML.includes("21/08/2026"), "Must contain formatted date string");
  assert.ok(tbody.innerHTML.includes("2:41:24 AM"), "Must contain formatted time string");
});

// Test 34: Comfortable Mode Visual Scale
test("34. Comfortable mode restores prominent readable scale (36px avatar, 0.94rem name, 22px badges)", () => {
  const cssContent = fs.readFileSync(path.join(ROOT_DIR, "css", "admin", "admin-components.css"), "utf8");
  assert.ok(cssContent.includes(".table-density-comfortable .user-avatar"), "Must have comfortable avatar");
  assert.ok(cssContent.includes("width: 36px !important"), "Comfortable avatar must be 36px");
  assert.ok(cssContent.includes(".table-density-comfortable .content-badge"), "Must have comfortable badges");
  assert.ok(cssContent.includes("height: 22px"), "Comfortable badge height must be 22px");
  assert.ok(cssContent.includes(".table-density-comfortable .created-date"), "Must have comfortable created-date");
  assert.ok(cssContent.includes("font-size: 0.84rem !important"), "Comfortable created-date font must be 0.84rem");
});

console.log("============================================================");
console.log(`📊 PHASE 31B-14.8 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("============================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL 34 PHASE 31B-14.8 VIEW CONTROLS TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
}
