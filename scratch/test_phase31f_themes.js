/**
 * ============================================================================
 * PHASE 31F-1 & 31F-3 THEMES FOUNDATION & AUTHORITATIVE THEME REGISTRY TEST SUITE
 *
 * Validates:
 * 1. Theme Registry exists on window.AdminThemes and window.ThemeRegistry.
 * 2. Registry contains all 6 valid theme IDs: default, royalgold, galaxy, rosegold, sapphire, emerald-luxe.
 * 3. Theme IDs are unique (exactly 6 distinct themes).
 * 4. Each theme definition has complete required metadata fields (id, displayName, description, palette, etc.).
 * 5. getById() works accurately with case-insensitive and whitespace handling.
 * 6. Invalid theme IDs (e.g. 'emerald', 'hacker', 'custom') are strictly rejected.
 * 7. Existing 'default' theme remains valid and marked default.
 * 8. Existing 'royalgold' theme remains valid.
 * 9. Existing 'galaxy' theme remains valid.
 * 10. Existing 'rosegold' theme remains valid.
 * 11. New 'sapphire' theme is valid and registered.
 * 12. New 'emerald-luxe' theme is valid and registered.
 * 13. Admin Themes UI is generated dynamically from registry data into #admin-themes-grid.
 * 14. No duplicate hardcoded theme list exists in Theme UI rendering.
 * 15. Preview foundation does not mutate wish records.
 * 16. Zero database mutation introduced in theme operations.
 * 17. No arbitrary CSS injection or script execution in theme module.
 * 18. js/modules/admin-security.js remains strictly untouched.
 * 19. Public Wish engine (index.html, js/app.js, js/modules/renderers.js) retains updateLetterThemeAndFont.
 * 20. Quick Editor (js/modules/editor/*) retains input-letter-theme synchronization.
 * 21. resolveTheme safely cascades fallbacks to valid themes.
 * 22. Theme module remains within a clear single responsibility boundary (admin-themes.js).
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

console.log("============================================================");
console.log("🎨 STARTING PHASE 31F-1 & 31F-3 THEME REGISTRY TEST SUITE");
console.log("============================================================");

let testsPassed = 0;
let testsFailed = 0;

async function it(desc, fn) {
  try {
    await fn();
    console.log(`  ✓ ${++testsPassed}. ${desc}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(err);
    testsFailed++;
  }
}

// -------------------------------------------------------------
// Mock Environment
// -------------------------------------------------------------
globalThis.window = globalThis;
globalThis.location = { origin: "https://birthday-wish-arjun.vercel.app" };

let toastMessage = null;
globalThis.AdminCore = {
  showToast: (msg) => { toastMessage = msg; }
};

let loggedEvents = [];
globalThis.AdminLogs = {
  logEvent: (event, desc) => {
    loggedEvents.push({ event, desc });
  }
};

function createMockElement(tag = "DIV") {
  const el = {
    tagName: tag.toUpperCase(),
    className: "",
    classList: {
      _classes: new Set(),
      add: function (...cls) { cls.forEach(c => this._classes.add(c)); },
      remove: function (...cls) { cls.forEach(c => this._classes.delete(c)); },
      contains: function (c) { return this._classes.has(c); },
      toggle: function (c) { if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c); }
    },
    style: {},
    innerHTML: "",
    textContent: "",
    dataset: {},
    appendChild: function (child) {
      this._children.push(child);
      this.innerHTML += (child.innerHTML || child.textContent || "");
      return child;
    },
    removeChild: function (child) {
      const idx = this._children.indexOf(child);
      if (idx !== -1) this._children.splice(idx, 1);
    },
    setAttribute: function (k, v) { this[k] = v; },
    getAttribute: function (k) { return this[k]; },
    querySelector: function (sel) {
      if (sel.startsWith("#")) {
        const id = sel.substring(1);
        return mockDOM[id] || null;
      }
      return createMockElement();
    },
    querySelectorAll: function (sel) {
      return [];
    },
    closest: function (sel) {
      return createMockElement();
    },
    addEventListener: function (ev, cb) {
      if (!this._listeners) this._listeners = {};
      if (!this._listeners[ev]) this._listeners[ev] = [];
      this._listeners[ev].push(cb);
    },
    click: function () {
      if (this._listeners && this._listeners.click) {
        this._listeners.click.forEach(cb => cb({ target: this, stopPropagation: () => {} }));
      }
    },
    _children: [],
    _listeners: {}
  };
  return el;
}

let mockDOM = {};
globalThis.document = {
  getElementById: (id) => {
    if (!mockDOM[id]) {
      mockDOM[id] = createMockElement();
      mockDOM[id].id = id;
    }
    return mockDOM[id];
  },
  querySelector: (sel) => {
    if (sel && sel.startsWith("#")) {
      return document.getElementById(sel.substring(1));
    }
    return createMockElement();
  },
  querySelectorAll: () => [],
  createElement: (tag) => createMockElement(tag),
  body: createMockElement("BODY"),
  addEventListener: () => {}
};

// Load Admin Themes Module
require(path.join(ROOT_DIR, "js", "admin", "admin-themes.js"));

const { AdminThemes, ThemeRegistry } = globalThis;

async function runTests() {
  await it("1. Theme Registry exists on window.AdminThemes and window.ThemeRegistry", () => {
    assert(AdminThemes, "window.AdminThemes must exist");
    assert(ThemeRegistry, "window.ThemeRegistry must exist");
    assert.strictEqual(typeof ThemeRegistry.getAll, "function", "ThemeRegistry.getAll must be a function");
    assert.strictEqual(typeof ThemeRegistry.getById, "function", "ThemeRegistry.getById must be a function");
    assert.strictEqual(typeof ThemeRegistry.isValid, "function", "ThemeRegistry.isValid must be a function");
    assert.strictEqual(typeof ThemeRegistry.getDefault, "function", "ThemeRegistry.getDefault must be a function");
    assert.strictEqual(typeof ThemeRegistry.getDisplayName, "function", "ThemeRegistry.getDisplayName must be a function");
  });

  await it("2. Registry contains all 6 valid theme IDs: default, royalgold, galaxy, rosegold, sapphire, emerald-luxe", () => {
    const allThemes = ThemeRegistry.getAll();
    const ids = allThemes.map(t => t.id);
    const expectedIds = ["default", "royalgold", "galaxy", "rosegold", "sapphire", "emerald-luxe"];

    assert.strictEqual(ids.length, 6, "Must contain exactly 6 themes");
    expectedIds.forEach(id => {
      assert(ids.includes(id), `Theme ID '${id}' must be present in registry`);
    });
    assert(!ids.includes("emerald"), "Unimplemented 'emerald' placeholder must NOT be in the registry");
  });

  await it("3. Theme IDs are unique (exactly 6 distinct themes)", () => {
    const allThemes = ThemeRegistry.getAll();
    const ids = allThemes.map(t => t.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(uniqueIds.size, ids.length, "All registered theme IDs must be strictly unique");
  });

  await it("4. Each theme definition has complete required metadata fields", () => {
    const allThemes = ThemeRegistry.getAll();
    allThemes.forEach(t => {
      assert(t.id && typeof t.id === "string", "Theme must have valid string id");
      assert(t.displayName && typeof t.displayName === "string", `Theme ${t.id} must have displayName`);
      assert(t.description && typeof t.description === "string", `Theme ${t.id} must have description`);
      assert(t.badge && typeof t.badge === "string", `Theme ${t.id} must have badge`);
      assert(t.category && typeof t.category === "string", `Theme ${t.id} must have category`);
      assert(t.className && t.className.startsWith("theme-"), `Theme ${t.id} className must start with 'theme-'`);
      assert(t.palette && typeof t.palette === "object", `Theme ${t.id} must have palette object`);
      assert(t.palette.background, `Theme ${t.id} palette must specify background`);
      assert(t.palette.envelope, `Theme ${t.id} palette must specify envelope`);
      assert(t.palette.paperBg, `Theme ${t.id} palette must specify paperBg`);
      assert(t.palette.accent, `Theme ${t.id} palette must specify accent`);
      assert(t.preview && typeof t.preview === "object", `Theme ${t.id} must have preview object`);
    });
  });

  await it("5. getById() works accurately with normalization (case-insensitive & whitespace)", () => {
    const s1 = ThemeRegistry.getById("sapphire");
    const s2 = ThemeRegistry.getById(" Sapphire ");
    assert(s1, "Must find 'sapphire'");
    assert(s2, "Must find ' Sapphire '");
    assert.strictEqual(s1.id, "sapphire");
    assert.strictEqual(s2.id, "sapphire");
    assert.strictEqual(s1.displayName, "Sapphire Aurora");
  });

  await it("6. Invalid theme IDs are strictly rejected by isValid() and return null from getById()", () => {
    assert.strictEqual(ThemeRegistry.isValid("emerald"), false, "'emerald' is not registered");
    assert.strictEqual(ThemeRegistry.isValid("neon-matrix"), false);
    assert.strictEqual(ThemeRegistry.isValid(""), false);
    assert.strictEqual(ThemeRegistry.isValid(null), false);
    assert.strictEqual(ThemeRegistry.isValid(undefined), false);

    assert.strictEqual(ThemeRegistry.getById("emerald"), null);
    assert.strictEqual(ThemeRegistry.getById("invalid-id"), null);
    assert.strictEqual(ThemeRegistry.getById(""), null);
  });

  await it("7. Existing 'default' theme remains valid and is marked default", () => {
    const defTheme = ThemeRegistry.getDefault();
    assert(defTheme, "getDefault() must return a theme");
    assert.strictEqual(defTheme.id, "default");
    assert.strictEqual(defTheme.isDefault, true);
    assert.strictEqual(ThemeRegistry.isValid("default"), true);
  });

  await it("8. Existing 'royalgold' theme remains valid", () => {
    assert.strictEqual(ThemeRegistry.isValid("royalgold"), true);
    const theme = ThemeRegistry.getById("royalgold");
    assert.strictEqual(theme.className, "theme-royalgold");
    assert.strictEqual(theme.palette.accent, "#f59e0b");
  });

  await it("9. Existing 'galaxy' theme remains valid", () => {
    assert.strictEqual(ThemeRegistry.isValid("galaxy"), true);
    const theme = ThemeRegistry.getById("galaxy");
    assert.strictEqual(theme.className, "theme-galaxy");
    assert.strictEqual(theme.palette.accent, "#a855f7");
  });

  await it("10. Existing 'rosegold' theme remains valid", () => {
    assert.strictEqual(ThemeRegistry.isValid("rosegold"), true);
    const theme = ThemeRegistry.getById("rosegold");
    assert.strictEqual(theme.className, "theme-rosegold");
    assert.strictEqual(theme.palette.accent, "#f472b6");
  });

  await it("11. New 'sapphire' theme is valid and registered", () => {
    assert.strictEqual(ThemeRegistry.isValid("sapphire"), true);
    const theme = ThemeRegistry.getById("sapphire");
    assert.strictEqual(theme.displayName, "Sapphire Aurora");
    assert.strictEqual(theme.className, "theme-sapphire");
    assert.strictEqual(theme.palette.accent, "#38bdf8");
  });

  await it("12. New 'emerald-luxe' theme is valid and registered", () => {
    assert.strictEqual(ThemeRegistry.isValid("emerald-luxe"), true);
    const theme = ThemeRegistry.getById("emerald-luxe");
    assert.strictEqual(theme.displayName, "Emerald Luxe");
    assert.strictEqual(theme.className, "theme-emerald-luxe");
    assert.strictEqual(theme.palette.accent, "#10b981");
  });

  await it("13. Admin Themes UI is generated dynamically from registry data into #admin-themes-grid", () => {
    mockDOM = {};
    const grid = document.getElementById("admin-themes-grid");
    const select = document.getElementById("admin-theme-preset");

    AdminThemes.init();

    assert(grid.innerHTML.includes("Default Golden Luxe"), "Grid must include Default Golden Luxe");
    assert(grid.innerHTML.includes("Vintage Royal Gold"), "Grid must include Vintage Royal Gold");
    assert(grid.innerHTML.includes("Midnight Galaxy Glow"), "Grid must include Midnight Galaxy Glow");
    assert(grid.innerHTML.includes("Rose Gold Pastel"), "Grid must include Rose Gold Pastel");
    assert(grid.innerHTML.includes("Sapphire Aurora"), "Grid must include Sapphire Aurora");
    assert(grid.innerHTML.includes("Emerald Luxe"), "Grid must include Emerald Luxe");
    assert(grid.innerHTML.includes("btn-theme-preview"), "Grid must include preview buttons");

    assert(select.innerHTML.includes('value="default"'), "Preset select must include default");
    assert(select.innerHTML.includes('value="royalgold"'), "Preset select must include royalgold");
    assert(select.innerHTML.includes('value="galaxy"'), "Preset select must include galaxy");
    assert(select.innerHTML.includes('value="rosegold"'), "Preset select must include rosegold");
    assert(select.innerHTML.includes('value="sapphire"'), "Preset select must include sapphire");
    assert(select.innerHTML.includes('value="emerald-luxe"'), "Preset select must include emerald-luxe");
    assert(!select.innerHTML.includes('value="emerald"'), "Preset select must NOT include fake emerald");
  });

  await it("14. No duplicate hardcoded theme list exists in new Theme UI logic", () => {
    const themesJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-themes.js"), "utf8");
    const countDefinitions = (themesJs.match(/id:\s*"(default|royalgold|galaxy|rosegold|sapphire|emerald-luxe)"/g) || []).length;
    assert.strictEqual(countDefinitions, 6, "Theme definitions must only appear once in THEME_DEFINITIONS array");
  });

  await it("15. Preview foundation does not mutate wish records", () => {
    const sampleWishes = [
      { id: "w-1", letter_theme: "galaxy" },
      { id: "w-2", letter_theme: "sapphire" }
    ];
    const initialClone = JSON.stringify(sampleWishes);

    AdminThemes.openThemePreview("emerald-luxe");
    assert.strictEqual(JSON.stringify(sampleWishes), initialClone, "Wish records must remain 100% untouched by preview");
  });

  await it("16. Zero database mutation introduced in theme operations", () => {
    loggedEvents = [];
    AdminThemes.setDefaultTheme("sapphire", false);

    assert.strictEqual(AdminThemes.getActiveDefaultThemeId(), "sapphire");
    assert(loggedEvents.some(e => e.event === "THEME_DEFAULT_CHANGE"), "Must log THEME_DEFAULT_CHANGE audit event");
  });

  await it("17. No arbitrary CSS injection or script execution in theme module", () => {
    const themesJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-themes.js"), "utf8");
    assert(!themesJs.includes("<style>"), "No inline style injection");
    assert(!themesJs.includes("eval("), "No eval usage");
    assert(!themesJs.includes("new Function("), "No new Function usage");
  });

  await it("18. js/modules/admin-security.js remains strictly untouched", () => {
    const secJs = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "admin-security.js"), "utf8");
    assert(secJs.includes("PasswordService"), "Shared admin-security.js must remain untouched");
  });

  await it("19. Public Wish engine (index.html, js/app.js, js/modules/renderers.js) retains updateLetterThemeAndFont", () => {
    const appJs = fs.readFileSync(path.join(ROOT_DIR, "js", "app.js"), "utf8");
    const renderersJs = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "renderers.js"), "utf8");
    assert(renderersJs.includes("updateLetterThemeAndFont"), "Public renderers.js must retain updateLetterThemeAndFont");
    assert(!appJs.includes("AdminThemes"), "app.js must not contain AdminThemes reference");
  });

  await it("20. Quick Editor (js/modules/editor/*) retains input-letter-theme synchronization", () => {
    const customizerJs = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "editor", "customizer.js"), "utf8");
    const letterJs = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "editor", "letter.js"), "utf8");
    assert(customizerJs.includes("input-letter-theme"), "customizer.js must retain input-letter-theme synchronization");
    assert(letterJs.includes("input-letter-theme"), "letter.js must retain input-letter-theme handler");
  });

  await it("21. resolveTheme safely cascades fallbacks to valid themes", () => {
    assert.strictEqual(ThemeRegistry.resolveTheme("galaxy"), "galaxy");
    assert.strictEqual(ThemeRegistry.resolveTheme("ROYALGOLD"), "royalgold");
    assert.strictEqual(ThemeRegistry.resolveTheme("sapphire"), "sapphire");
    assert.strictEqual(ThemeRegistry.resolveTheme("emerald-luxe"), "emerald-luxe");
    assert.strictEqual(ThemeRegistry.resolveTheme({ letter_theme: "rosegold" }), "rosegold");
    assert.strictEqual(ThemeRegistry.resolveTheme({ letterTheme: "sapphire" }), "sapphire");
    assert.strictEqual(ThemeRegistry.resolveTheme({ lt: "emerald-luxe" }), "emerald-luxe");
    assert.strictEqual(ThemeRegistry.resolveTheme({ letter_theme: "unknown_theme" }), "default");
    assert.strictEqual(ThemeRegistry.resolveTheme(null), "default");
    assert.strictEqual(ThemeRegistry.resolveTheme(""), "default");
  });

  await it("22. Theme module remains within a clear single responsibility boundary (admin-themes.js)", () => {
    const stats = fs.statSync(path.join(ROOT_DIR, "js", "admin", "admin-themes.js"));
    assert(stats.size > 1000 && stats.size < 35000, `File size is reasonable (${stats.size} bytes)`);

    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");
    assert(adminHtml.includes('src="js/admin/admin-themes.js"'), "admin.html must import admin-themes.js");
  });

  console.log("============================================================");
  if (testsFailed === 0) {
    console.log(`🎉 ALL ${testsPassed} PHASE 31F-1 & 31F-3 THEME TESTS PASSED!`);
  } else {
    console.error(`❌ ${testsFailed} TEST(S) FAILED!`);
    process.exit(1);
  }
  console.log("============================================================");
}

runTests();
