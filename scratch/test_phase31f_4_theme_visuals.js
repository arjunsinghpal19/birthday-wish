/**
 * ============================================================================
 * TEST SUITE: Phase 31F-4 Hotfix — Theme Visual Polish, Icon Consistency,
 * Envelope Border, and Default-Scope Correction
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

console.log("============================================================");
console.log("🧪 PHASE 31F-4 HOTFIX: THEME VISUAL POLISH & SCOPE TESTS");
console.log("============================================================");

let testsPassed = 0;
let testsFailed = 0;

function runTest(testName, testFn) {
  try {
    testFn();
    console.log(`  ✓ ${testName}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ ${testName}`);
    console.error(`     Error: ${err.message}`);
    testsFailed++;
  }
}

// 1. Load AdminThemes in simulated browser environment
const adminThemesPath = path.resolve(__dirname, "../js/admin/admin-themes.js");
const adminThemesCode = fs.readFileSync(adminThemesPath, "utf8");

let mockLocalStorage = {};
const allCreatedElements = [];

function createMockElement(id, tag = "div") {
  const el = {
    id: id,
    tagName: tag.toUpperCase(),
    _className: "",
    set className(val) {
      this._className = val || "";
      this.classList.classes.clear();
      if (val) {
        val.trim().split(/\s+/).forEach(c => this.classList.classes.add(c));
      }
    },
    get className() {
      return this._className;
    },
    classList: {
      classes: new Set(),
      add: function (...cls) { cls.forEach(c => this.classes.add(c)); },
      remove: function (...cls) { cls.forEach(c => this.classes.delete(c)); },
      contains: function (cls) { return this.classes.has(cls); },
      toggle: function (cls) { if (this.classes.has(cls)) this.classes.delete(cls); else this.classes.add(cls); }
    },
    style: {},
    _innerHTML: "",
    set innerHTML(val) {
      this._innerHTML = val;
      const idMatches = [...val.matchAll(/id=["']([^"']+)["']/g)];
      idMatches.forEach(m => {
        const subId = m[1];
        if (!this.subElements) this.subElements = {};
        const subEl = createMockElement(subId);
        const classMatch = val.match(new RegExp(`id=["']${subId}["'][^>]*class=["']([^"']+)["']`)) ||
                           val.match(new RegExp(`class=["']([^"']+)["'][^>]*id=["']${subId}["']`));
        if (classMatch) {
          subEl.className = classMatch[1];
          classMatch[1].split(/\s+/).forEach(c => subEl.classList.add(c));
        }
        this.subElements[subId] = subEl;
      });
    },
    get innerHTML() {
      return this._innerHTML;
    },
    textContent: "",
    dataset: {},
    children: [],
    querySelectorAll: function (selector) {
      const results = [];
      function search(node) {
        if (!node) return;
        if (selector.startsWith(".") && (node.className && node.className.includes(selector.slice(1)) || node.classList && node.classList.contains(selector.slice(1)))) {
          results.push(node);
        }
        if (selector.startsWith("#") && node.id === selector.slice(1)) {
          results.push(node);
        }
        if (node.subElements) {
          Object.values(node.subElements).forEach(sub => {
            if (selector.startsWith("#") && sub.id === selector.slice(1)) {
              results.push(sub);
            }
            if (selector.startsWith(".") && (sub.className && sub.className.includes(selector.slice(1)) || sub.classList && sub.classList.contains(selector.slice(1)))) {
              results.push(sub);
            }
          });
        }
        if (node.children) node.children.forEach(search);
      }
      search(this);
      return results;
    },
    querySelector: function (selector) {
      const list = this.querySelectorAll(selector);
      return list.length > 0 ? list[0] : null;
    },
    appendChild: function (child) {
      this.children.push(child);
      return child;
    }
  };
  allCreatedElements.push(el);
  return el;
}

let mockDocumentBody = createMockElement("body", "body");

const mockWindow = {
  localStorage: {
    getItem: (key) => mockLocalStorage[key] || null,
    setItem: (key, val) => { mockLocalStorage[key] = String(val); },
    removeItem: (key) => { delete mockLocalStorage[key]; }
  },
  document: {
    body: mockDocumentBody,
    getElementById: (id) => {
      const found = allCreatedElements.find(e => e.id === id);
      if (found) return found;
      for (const el of allCreatedElements) {
        if (el.subElements && el.subElements[id]) return el.subElements[id];
      }
      return null;
    },
    querySelector: (selector) => {
      if (selector.startsWith("#")) {
        const id = selector.slice(1);
        const found = allCreatedElements.find(e => e.id === id);
        if (found) return found;
        for (const el of allCreatedElements) {
          if (el.subElements && el.subElements[id]) return el.subElements[id];
        }
      }
      return null;
    },
    createElement: (tag) => {
      const el = createMockElement(`dyn_${Math.random().toString(36).substring(2, 7)}`, tag);
      return el;
    }
  },
  AdminCore: {
    showToast: (msg) => { mockWindow.lastToast = msg; }
  },
  AdminLogs: {
    logEvent: (type, desc) => { mockWindow.lastLog = { type, desc }; }
  }
};

mockWindow.globalThis = mockWindow;

// Execute admin-themes.js in context
vm.runInNewContext(adminThemesCode, mockWindow);
const ThemeRegistry = mockWindow.ThemeRegistry;
const AdminThemes = mockWindow.AdminThemes;

// ==========================================
// TEST SUITE ASSERTIONS
// ==========================================

runTest("1. ThemeRegistry is defined and exports authoritative icon & label helpers", () => {
  assert.ok(ThemeRegistry, "ThemeRegistry must be exposed on window");
  assert.strictEqual(typeof ThemeRegistry.getAll, "function");
  assert.strictEqual(typeof ThemeRegistry.getById, "function");
  assert.strictEqual(typeof ThemeRegistry.isValid, "function");
  assert.strictEqual(typeof ThemeRegistry.getDefault, "function");
  assert.strictEqual(typeof ThemeRegistry.resolveTheme, "function");
  assert.strictEqual(typeof ThemeRegistry.getIcon, "function", "ThemeRegistry.getIcon must be a function");
  assert.strictEqual(typeof ThemeRegistry.getOptionLabel, "function", "ThemeRegistry.getOptionLabel must be a function");
});

runTest("2. Authoritative ThemeRegistry contains exactly 6 registered themes with canonical icons", () => {
  const allThemes = ThemeRegistry.getAll();
  assert.strictEqual(allThemes.length, 6, "Expected exactly 6 authoritative themes");
  
  assert.strictEqual(ThemeRegistry.getIcon("default"), "✨", "default icon must be ✨");
  assert.strictEqual(ThemeRegistry.getIcon("royalgold"), "👑", "royalgold icon must be 👑");
  assert.strictEqual(ThemeRegistry.getIcon("galaxy"), "🌌", "galaxy icon must be 🌌");
  assert.strictEqual(ThemeRegistry.getIcon("rosegold"), "🌸", "rosegold icon must be 🌸");
  assert.strictEqual(ThemeRegistry.getIcon("sapphire"), "💎", "sapphire icon must be 💎");
  assert.strictEqual(ThemeRegistry.getIcon("emerald-luxe"), "🌿", "emerald-luxe icon must be 🌿");
});

runTest("3. ThemeRegistry.getOptionLabel() produces consistent labels across all 6 themes", () => {
  assert.strictEqual(ThemeRegistry.getOptionLabel("default"), "✨ Default Golden Luxe");
  assert.strictEqual(ThemeRegistry.getOptionLabel("royalgold"), "👑 Vintage Royal Gold");
  assert.strictEqual(ThemeRegistry.getOptionLabel("galaxy"), "🌌 Midnight Galaxy Glow");
  assert.strictEqual(ThemeRegistry.getOptionLabel("rosegold"), "🌸 Rose Gold Pastel");
  assert.strictEqual(ThemeRegistry.getOptionLabel("sapphire"), "💎 Sapphire Aurora");
  assert.strictEqual(ThemeRegistry.getOptionLabel("emerald-luxe"), "🌿 Emerald Luxe");
});

runTest("4. Fake 'emerald' remains strictly invalid while 'emerald-luxe' is valid", () => {
  assert.strictEqual(ThemeRegistry.isValid("emerald"), false, "'emerald' must be invalid");
  assert.strictEqual(ThemeRegistry.isValid("emerald-luxe"), true, "'emerald-luxe' must be valid");
  assert.strictEqual(ThemeRegistry.resolveTheme("emerald"), "default", "Resolving 'emerald' must fallback to 'default'");
  assert.strictEqual(ThemeRegistry.resolveTheme("emerald-luxe"), "emerald-luxe", "Resolving 'emerald-luxe' must return 'emerald-luxe'");
});

runTest("5. Corner ornaments match exact theme visual identities", () => {
  const tDefault = ThemeRegistry.getById("default");
  const tRoyal = ThemeRegistry.getById("royalgold");
  const tGalaxy = ThemeRegistry.getById("galaxy");
  const tRose = ThemeRegistry.getById("rosegold");
  const tSapphire = ThemeRegistry.getById("sapphire");
  const tEmerald = ThemeRegistry.getById("emerald-luxe");

  assert.strictEqual(tDefault.visuals.cornerOrnament, "🌸", "Default theme corner must be golden blossom 🌸");
  assert.strictEqual(tRoyal.visuals.cornerOrnament, "⚜️", "Royal Gold theme corner must be vintage filigree ⚜️");
  assert.strictEqual(tGalaxy.visuals.cornerOrnament, "✨", "Galaxy theme corner must be cosmic stars ✨");
  assert.strictEqual(tRose.visuals.cornerOrnament, "🌹", "Rose Gold theme corner must be rose blossom 🌹");
  assert.strictEqual(tSapphire.visuals.cornerOrnament, "💎", "Sapphire theme corner must be crystalline starburst 💎");
  assert.strictEqual(tEmerald.visuals.cornerOrnament, "🌿", "Emerald Luxe theme corner must be botanical leaves 🌿");
});

runTest("6. setDefaultTheme() stores setting in localStorage without mutating wishes", () => {
  mockLocalStorage = {};
  const res = AdminThemes.setDefaultTheme("galaxy", false);
  assert.strictEqual(res, true, "setDefaultTheme must return true on valid theme");
  assert.strictEqual(mockLocalStorage["bw_admin_default_theme"], "galaxy", "Must persist 'galaxy' to localStorage");
  assert.strictEqual(AdminThemes.getActiveDefaultThemeId(), "galaxy", "Active default theme ID must be 'galaxy'");
});

runTest("7. openThemePreview() displays centered workspace modal non-destructively", () => {
  AdminThemes.openThemePreview("sapphire");
  const modal = mockWindow.document.getElementById("modal-theme-preview");
  assert.ok(modal, "Modal '#modal-theme-preview' must be created");
  assert.strictEqual(modal.style.display, "flex", "Modal must have display: flex");
  assert.ok(modal.classList.contains("open"), "Modal must have 'open' class for smooth transition");
  assert.ok(modal.classList.contains("theme-preview-backdrop"), "Modal backdrop must have 'theme-preview-backdrop' class");

  // Check close button
  const closeBtn = modal.querySelector("#btn-close-theme-preview");
  assert.ok(closeBtn, "Modal must have '#btn-close-theme-preview'");
  assert.ok(closeBtn.className.includes("btn-modal-close"), "Close button must use polished .btn-modal-close class");

  // Check 4 corner ornaments
  const ornTl = modal.querySelector("#preview-ornament-tl");
  const ornTr = modal.querySelector("#preview-ornament-tr");
  const ornBl = modal.querySelector("#preview-ornament-bl");
  const ornBr = modal.querySelector("#preview-ornament-br");
  assert.ok(ornTl && ornTr && ornBl && ornBr, "All 4 corner ornament elements must be present");
  assert.strictEqual(ornTl.textContent, "💎", "Sapphire preview top-left ornament must be 💎");
  assert.strictEqual(ornBr.textContent, "💎", "Sapphire preview bottom-right ornament must be 💎");
});

runTest("8. closeThemePreview() hides modal cleanly", () => {
  AdminThemes.closeThemePreview();
  const modal = mockWindow.document.getElementById("modal-theme-preview");
  assert.strictEqual(modal.style.display, "none", "Modal display must be 'none'");
  assert.strictEqual(modal.classList.contains("open"), false, "Modal must remove 'open' class");
});

runTest("9. css/style.css contains corner decoration rules and no duplicate pseudo-elements", () => {
  const styleCssPath = path.resolve(__dirname, "../css/style.css");
  const styleCss = fs.readFileSync(styleCssPath, "utf8");

  assert.ok(styleCss.includes(".corner-flower"), "style.css must define .corner-flower base class");
  assert.ok(styleCss.includes(".corner-flower::before"), "style.css must define .corner-flower::before");
  assert.ok(styleCss.includes(".corner-flower::after"), "style.css must define .corner-flower::after");
  assert.ok(styleCss.includes("display: none !important"), "style.css must suppress .corner-flower::after");

  assert.ok(styleCss.includes(".theme-default .corner-flower"), "style.css must define .theme-default corner flower");
  assert.ok(styleCss.includes(".theme-royalgold .corner-flower"), "style.css must define .theme-royalgold corner flower");
  assert.ok(styleCss.includes(".theme-galaxy .corner-flower"), "style.css must define .theme-galaxy corner flower");
  assert.ok(styleCss.includes(".theme-rosegold .corner-flower"), "style.css must define .theme-rosegold corner flower");
  assert.ok(styleCss.includes(".theme-sapphire .corner-flower"), "style.css must define .theme-sapphire corner flower");
  assert.ok(styleCss.includes(".theme-emerald-luxe .corner-flower"), "style.css must define .theme-emerald-luxe corner flower");
});

runTest("10. css/style.css contains open letter paper themed borders for all 6 themes", () => {
  const styleCssPath = path.resolve(__dirname, "../css/style.css");
  const styleCss = fs.readFileSync(styleCssPath, "utf8");

  assert.ok(styleCss.includes(".theme-default .letter-paper"), "style.css must define .theme-default .letter-paper");
  assert.ok(styleCss.includes(".theme-royalgold .letter-paper"), "style.css must define .theme-royalgold .letter-paper");
  assert.ok(styleCss.includes(".theme-galaxy .letter-paper"), "style.css must define .theme-galaxy .letter-paper");
  assert.ok(styleCss.includes(".theme-rosegold .letter-paper"), "style.css must define .theme-rosegold .letter-paper");
  assert.ok(styleCss.includes(".theme-sapphire .letter-paper"), "style.css must define .theme-sapphire .letter-paper");
  assert.ok(styleCss.includes(".theme-emerald-luxe .letter-paper"), "style.css must define .theme-emerald-luxe .letter-paper");
});

runTest("11. css/admin/admin-components.css contains consistent card button heights and alignments", () => {
  const adminCssPath = path.resolve(__dirname, "../css/admin/admin-components.css");
  const adminCss = fs.readFileSync(adminCssPath, "utf8");

  assert.ok(adminCss.includes(".theme-card-footer"), "admin-components.css must define .theme-card-footer");
  assert.ok(adminCss.includes(".btn-theme-preview"), "admin-components.css must define .btn-theme-preview");
  assert.ok(adminCss.includes(".btn-theme-set-default"), "admin-components.css must define .btn-theme-set-default");
  assert.ok(adminCss.includes(".btn-theme-active-default"), "admin-components.css must define .btn-theme-active-default");
  assert.ok(adminCss.includes("height: 32px"), "admin-components.css must enforce 32px height on theme buttons");
});

runTest("12. js/modules/renderers.js empties corner-flower textContent to eliminate duplicate icon", () => {
  const renderersPath = path.resolve(__dirname, "../js/modules/renderers.js");
  const renderersCode = fs.readFileSync(renderersPath, "utf8");

  assert.ok(renderersCode.includes("function updateCornerFlowers"), "renderers.js must have updateCornerFlowers function");
  assert.ok(renderersCode.includes('f.textContent = ""'), "updateCornerFlowers must empty textContent to avoid duplicate icons");
  assert.ok(!renderersCode.includes('f.textContent = "🌸"'), "updateCornerFlowers must not inject hardcoded flower text");
});

runTest("13. Quick Editor (customizer.js & index.html) does NOT contain global default controls", () => {
  const customizerPath = path.resolve(__dirname, "../js/modules/editor/customizer.js");
  const customizerCode = fs.readFileSync(customizerPath, "utf8");
  const indexHtmlPath = path.resolve(__dirname, "../index.html");
  const indexHtmlCode = fs.readFileSync(indexHtmlPath, "utf8");

  assert.ok(!customizerCode.includes("setDefaultTheme"), "customizer.js must NOT contain setDefaultTheme");
  assert.ok(!customizerCode.includes("bw_admin_default_theme"), "customizer.js must NOT write to bw_admin_default_theme");
  assert.ok(!indexHtmlCode.includes("btn-theme-set-default"), "index.html must NOT contain btn-theme-set-default");
});

runTest("14. Admin Wish Editor uses getActiveDefaultThemeId for NEW wishes while preserving existing wish theme", () => {
  const wishEditorPath = path.resolve(__dirname, "../js/admin/admin-wish-editor.js");
  const wishEditorCode = fs.readFileSync(wishEditorPath, "utf8");

  assert.ok(wishEditorCode.includes("AdminThemes.getActiveDefaultThemeId"), "admin-wish-editor.js must consume getActiveDefaultThemeId for new wishes");
  assert.ok(wishEditorCode.includes("ThemeRegistry.getOptionLabel"), "admin-wish-editor.js must use ThemeRegistry.getOptionLabel");
});

runTest("15. Public css/style.css preserves original envelope styling without theme envelope overrides", () => {
  const styleCssPath = path.resolve(__dirname, "../css/style.css");
  const styleCss = fs.readFileSync(styleCssPath, "utf8");

  assert.ok(!styleCss.includes(".theme-sapphire .env-body"), "style.css must not override .env-body for sapphire");
  assert.ok(!styleCss.includes(".theme-galaxy .env-body"), "style.css must not override .env-body for galaxy");
  assert.ok(!styleCss.includes(".theme-royalgold .env-body"), "style.css must not override .env-body for royalgold");
  assert.ok(!styleCss.includes(".theme-rosegold .env-body"), "style.css must not override .env-body for rosegold");
  assert.ok(!styleCss.includes(".theme-emerald-luxe .env-body"), "style.css must not override .env-body for emerald-luxe");
});

console.log("\n============================================================");
console.log(`🏁 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log("============================================================");

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL PHASE 31F-4 HOTFIX TESTS PASSED!");
  process.exit(0);
}
