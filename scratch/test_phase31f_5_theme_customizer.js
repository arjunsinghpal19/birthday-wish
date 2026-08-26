/**
 * ============================================================================
 * TEST SUITE: PHASE 31F-5 CONTROLLED THEME CUSTOMIZATION & SAFE PALETTE EXTENSIONS
 * Verifies ThemeRegistry integrity, parameter clamps, curated parchment tones,
 * ornament modes, border weights, non-destructive preview, envelope protection,
 * Quick Editor isolation, and modularity invariants.
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    testsFailed++;
  }
}

console.log("============================================================");
console.log("🎨 STARTING PHASE 31F-5 THEME CUSTOMIZER TEST SUITE");
console.log("============================================================\n");

// Mock Browser Environment
globalThis.window = {
  localStorage: {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, val) { this._data[key] = String(val); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; }
  }
};
globalThis.document = {
  body: {
    appendChild(el) { return el; }
  },
  getElementById(id) { return null; },
  createElement(tag) {
    return {
      id: "",
      className: "",
      style: {},
      innerHTML: "",
      dataset: {},
      querySelector() { return null; },
      querySelectorAll() { return []; }
    };
  }
};

// 1. Load Admin Themes (Theme Registry)
const adminThemesCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-themes.js"), "utf8");
eval(adminThemesCode);

// 2. Load Admin Theme Customizer
const customizerCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-theme-customizer.js"), "utf8");
eval(customizerCode);

const ThemeRegistry = window.ThemeRegistry;
const AdminThemeCustomizer = window.AdminThemeCustomizer;

runTest("1. ThemeRegistry contains exactly 6 valid authoritative themes", () => {
  assert.ok(ThemeRegistry, "ThemeRegistry must exist");
  const all = ThemeRegistry.getAll();
  assert.strictEqual(all.length, 6, "Must have exactly 6 themes");
  const expectedIds = ["default", "royalgold", "galaxy", "rosegold", "sapphire", "emerald-luxe"];
  expectedIds.forEach(id => {
    assert.ok(ThemeRegistry.isValid(id), `Theme ${id} must be valid`);
  });
});

runTest("2. Fake 'emerald' theme is strictly invalid", () => {
  assert.strictEqual(ThemeRegistry.isValid("emerald"), false, "emerald must be invalid");
  assert.strictEqual(ThemeRegistry.getById("emerald"), null, "emerald must return null");
});

runTest("3. Canonical Theme Icons remain consistent", () => {
  assert.strictEqual(ThemeRegistry.getIcon("default"), "✨");
  assert.strictEqual(ThemeRegistry.getIcon("royalgold"), "👑");
  assert.strictEqual(ThemeRegistry.getIcon("galaxy"), "🌌");
  assert.strictEqual(ThemeRegistry.getIcon("rosegold"), "🌸");
  assert.strictEqual(ThemeRegistry.getIcon("sapphire"), "💎");
  assert.strictEqual(ThemeRegistry.getIcon("emerald-luxe"), "🌿");
});

runTest("4. Glow multipliers and clamp boundaries function correctly", () => {
  assert.ok(AdminThemeCustomizer, "AdminThemeCustomizer must exist");
  assert.strictEqual(AdminThemeCustomizer.clampGlow("subtle"), 0.6);
  assert.strictEqual(AdminThemeCustomizer.clampGlow("balanced"), 1.0);
  assert.strictEqual(AdminThemeCustomizer.clampGlow("vibrant"), 1.4);
  
  // Boundary clamps
  assert.strictEqual(AdminThemeCustomizer.clampGlow(0.2), 0.5, "Values below 0.5 must clamp to 0.5");
  assert.strictEqual(AdminThemeCustomizer.clampGlow(2.5), 1.5, "Values above 1.5 must clamp to 1.5");
  assert.strictEqual(AdminThemeCustomizer.clampGlow(1.2), 1.2, "Values in range remain unchanged");
  assert.strictEqual(AdminThemeCustomizer.clampGlow("invalid"), 1.0, "Invalid input defaults to 1.0");
});

runTest("5. Corner ornament modes validate and resolve correctly", () => {
  assert.strictEqual(AdminThemeCustomizer.isValidOrnamentMode("quad"), true);
  assert.strictEqual(AdminThemeCustomizer.isValidOrnamentMode("header-only"), true);
  assert.strictEqual(AdminThemeCustomizer.isValidOrnamentMode("minimal"), true);
  assert.strictEqual(AdminThemeCustomizer.isValidOrnamentMode("hidden"), true);
  assert.strictEqual(AdminThemeCustomizer.isValidOrnamentMode("random"), false);
  assert.strictEqual(AdminThemeCustomizer.isValidOrnamentMode(""), false);
});

runTest("6. Parchment tone validates and retrieves curated palettes for all 6 themes", () => {
  assert.strictEqual(AdminThemeCustomizer.isValidParchmentTone("default"), true);
  assert.strictEqual(AdminThemeCustomizer.isValidParchmentTone("soft"), true);
  assert.strictEqual(AdminThemeCustomizer.isValidParchmentTone("deep"), true);
  assert.strictEqual(AdminThemeCustomizer.isValidParchmentTone("neon"), false);

  const themeIds = ["default", "royalgold", "galaxy", "rosegold", "sapphire", "emerald-luxe"];
  themeIds.forEach(tId => {
    const def = AdminThemeCustomizer.getCuratedTone(tId, "default");
    const soft = AdminThemeCustomizer.getCuratedTone(tId, "soft");
    const deep = AdminThemeCustomizer.getCuratedTone(tId, "deep");

    assert.ok(def && def.name && def.gradient, `Theme ${tId} must have default tone`);
    assert.ok(soft && soft.name && soft.gradient, `Theme ${tId} must have soft tone`);
    assert.ok(deep && deep.name && deep.gradient, `Theme ${tId} must have deep tone`);
  });
});

runTest("7. Border weight validates correctly", () => {
  assert.strictEqual(AdminThemeCustomizer.isValidBorderWeight("delicate"), true);
  assert.strictEqual(AdminThemeCustomizer.isValidBorderWeight("standard"), true);
  assert.strictEqual(AdminThemeCustomizer.isValidBorderWeight("ornate"), true);
  assert.strictEqual(AdminThemeCustomizer.isValidBorderWeight("thick"), false);
});

runTest("8. Customizer State and non-destructive reset", () => {
  AdminThemeCustomizer.open("sapphire");
  let state = AdminThemeCustomizer.getState();
  assert.strictEqual(state.activeThemeId, "sapphire");

  AdminThemeCustomizer.setGlowIntensity("vibrant");
  AdminThemeCustomizer.setOrnamentMode("minimal");
  AdminThemeCustomizer.setParchmentTone("soft");
  AdminThemeCustomizer.setBorderWeight("delicate");

  state = AdminThemeCustomizer.getState();
  assert.strictEqual(state.current.glowIntensity, "vibrant");
  assert.strictEqual(state.current.ornamentMode, "minimal");
  assert.strictEqual(state.current.parchmentTone, "soft");
  assert.strictEqual(state.current.borderWeight, "delicate");

  // Reset
  AdminThemeCustomizer.reset();
  state = AdminThemeCustomizer.getState();
  assert.strictEqual(state.current.glowIntensity, "balanced");
  assert.strictEqual(state.current.ornamentMode, "quad");
  assert.strictEqual(state.current.parchmentTone, "default");
  assert.strictEqual(state.current.borderWeight, "standard");

  AdminThemeCustomizer.close();
});

runTest("9. Admin Theme Preset Persistence in localStorage", () => {
  window.localStorage.clear();
  const sapphireCustom = {
    glowIntensity: "vibrant",
    ornamentMode: "header-only",
    parchmentTone: "deep",
    borderWeight: "ornate"
  };

  AdminThemeCustomizer.saveStoredThemeCustomization("sapphire", sapphireCustom);
  const loaded = AdminThemeCustomizer.getStoredThemeCustomization("sapphire");

  assert.strictEqual(loaded.glowIntensity, "vibrant");
  assert.strictEqual(loaded.ornamentMode, "header-only");
  assert.strictEqual(loaded.parchmentTone, "deep");
  assert.strictEqual(loaded.borderWeight, "ornate");

  // Other themes remain default
  const defaultThemeLoaded = AdminThemeCustomizer.getStoredThemeCustomization("default");
  assert.strictEqual(defaultThemeLoaded.glowIntensity, "balanced");
  assert.strictEqual(defaultThemeLoaded.ornamentMode, "quad");
});

runTest("10. Public css/style.css contains NO theme envelope overrides (Envelope Protection)", () => {
  const styleCssPath = path.resolve(__dirname, "../css/style.css");
  const styleCss = fs.readFileSync(styleCssPath, "utf8");

  assert.ok(!styleCss.includes(".theme-sapphire .env-body"), "style.css must not override .env-body for sapphire");
  assert.ok(!styleCss.includes(".theme-galaxy .env-body"), "style.css must not override .env-body for galaxy");
  assert.ok(!styleCss.includes(".theme-royalgold .env-body"), "style.css must not override .env-body for royalgold");
  assert.ok(!styleCss.includes(".theme-rosegold .env-body"), "style.css must not override .env-body for rosegold");
  assert.ok(!styleCss.includes(".theme-emerald-luxe .env-body"), "style.css must not override .env-body for emerald-luxe");
});

runTest("11. Quick Editor remains protected from Admin-only customization controls", () => {
  const customizerPath = path.resolve(__dirname, "../js/modules/editor/customizer.js");
  const customizerCode = fs.readFileSync(customizerPath, "utf8");
  const indexHtmlPath = path.resolve(__dirname, "../index.html");
  const indexHtmlCode = fs.readFileSync(indexHtmlPath, "utf8");

  assert.ok(!customizerCode.includes("AdminThemeCustomizer"), "customizer.js must NOT reference AdminThemeCustomizer");
  assert.ok(!customizerCode.includes("bw_admin_theme_customization"), "customizer.js must NOT access customizer storage key");
  assert.ok(!indexHtmlCode.includes("btn-theme-customize"), "index.html must NOT contain btn-theme-customize");
});

runTest("12. admin-themes.js and admin-theme-customizer.js maintain modular file sizes (< 35 KB)", () => {
  const themesStat = fs.statSync(path.join(__dirname, "../js/admin/admin-themes.js"));
  const customizerStat = fs.statSync(path.join(__dirname, "../js/admin/admin-theme-customizer.js"));

  const themesKb = themesStat.size / 1024;
  const customizerKb = customizerStat.size / 1024;

  assert.ok(themesKb < 35, `admin-themes.js must be < 35 KB (currently ${themesKb.toFixed(2)} KB)`);
  assert.ok(customizerKb < 35, `admin-theme-customizer.js must be < 35 KB (currently ${customizerKb.toFixed(2)} KB)`);
});

runTest("13. admin.html correctly includes stylesheet and script tags for customizer", () => {
  const adminHtmlPath = path.resolve(__dirname, "../admin.html");
  const adminHtmlCode = fs.readFileSync(adminHtmlPath, "utf8");

  assert.ok(adminHtmlCode.includes('href="css/admin/admin-theme-customizer.css"'), "admin.html must link admin-theme-customizer.css");
  assert.ok(adminHtmlCode.includes('src="js/admin/admin-theme-customizer.js"'), "admin.html must load admin-theme-customizer.js");
  assert.ok(adminHtmlCode.includes('id="adm-btn-customize-theme"'), "admin.html must include adm-btn-customize-theme");
});

runTest("14. css/admin/admin-theme-customizer.css defines required customizer classes", () => {
  const cssPath = path.resolve(__dirname, "../css/admin/admin-theme-customizer.css");
  const css = fs.readFileSync(cssPath, "utf8");

  assert.ok(css.includes(".theme-customizer-backdrop"), "CSS must define .theme-customizer-backdrop");
  assert.ok(css.includes(".theme-customizer-dialog"), "CSS must define .theme-customizer-dialog");
  assert.ok(css.includes(".customizer-seg-btn"), "CSS must define .customizer-seg-btn");
  assert.ok(css.includes(".customizer-swatch-card"), "CSS must define .customizer-swatch-card");
  assert.ok(css.includes(".customizer-live-paper"), "CSS must define .customizer-live-paper");
  assert.ok(css.includes("@media (max-width: 600px)"), "CSS must include mobile responsive query");
});

runTest("15. Registered Themes badge dynamically derives count from ThemeRegistry.getAll().length", () => {
  const adminHtmlPath = path.resolve(__dirname, "../admin.html");
  const adminHtmlCode = fs.readFileSync(adminHtmlPath, "utf8");
  const adminThemesPath = path.resolve(__dirname, "../js/admin/admin-themes.js");
  const adminThemesCode = fs.readFileSync(adminThemesPath, "utf8");

  assert.ok(adminHtmlCode.includes('id="admin-themes-count-badge"'), "admin.html must contain #admin-themes-count-badge");
  assert.ok(adminHtmlCode.includes('6 Registered Themes'), "admin.html must display 6 Registered Themes");
  assert.ok(adminThemesCode.includes("countBadge.textContent = `${themes.length} Registered Themes`"), "renderThemesUI must dynamically set textContent to themes.length Registered Themes");
});

runTest("16. Theme Card Footer uses 2-row layout with 3-column action grid preventing overflow", () => {
  const adminCssPath = path.resolve(__dirname, "../css/admin/admin-components.css");
  const adminCss = fs.readFileSync(adminCssPath, "utf8");
  const adminThemesPath = path.resolve(__dirname, "../js/admin/admin-themes.js");
  const adminThemesCode = fs.readFileSync(adminThemesPath, "utf8");

  assert.ok(adminCss.includes(".theme-card-footer-top"), "admin-components.css must define .theme-card-footer-top");
  assert.ok(adminCss.includes("grid-template-columns: repeat(3, 1fr)"), "admin-components.css must use 3-column grid for action buttons");
  assert.ok(adminThemesCode.includes('class="theme-card-footer-top"'), "renderThemesUI must output .theme-card-footer-top");
  assert.ok(adminThemesCode.includes('class="theme-card-actions"'), "renderThemesUI must output .theme-card-actions");
});

console.log("\n============================================================");
console.log(`🏁 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log("============================================================");

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL PHASE 31F-5 THEME CUSTOMIZER TESTS PASSED!");
  process.exit(0);
}
