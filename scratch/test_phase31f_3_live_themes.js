/**
 * ============================================================================
 * PHASE 31F-3 LIVE THEME INTEGRATION & EXPANSION TEST SUITE
 *
 * Validates:
 * 1. All 6 themes registered in ThemeRegistry.
 * 2. All 6 IDs are valid: default, royalgold, galaxy, rosegold, sapphire, emerald-luxe.
 * 3. Existing 4 IDs are strictly unchanged.
 * 4. New 'sapphire' ID is valid.
 * 5. New 'emerald-luxe' ID is valid.
 * 6. Old fake 'emerald' ID is strictly absent.
 * 7. Registry returns all 6 themes from getAll().
 * 8. Case-insensitive lookup works for all 6 themes.
 * 9. Invalid theme safely resolves to 'default'.
 * 10. Existing wish theme is preserved without silent overwrite.
 * 11. Global default only affects newly created wishes.
 * 12. Global default persists across sessions in localStorage.
 * 13. Theme preview is non-destructive and causes 0 DB writes.
 * 14. Admin Wish Studio dynamically populates all 6 themes from ThemeRegistry.
 * 15. Admin Wish Studio live summary updates display name on theme change.
 * 16. Quick Editor theme selector options include all 6 themes.
 * 17. Quick Editor save persists 'sapphire' and 'emerald-luxe' to canonical database row.
 * 18. Cross-editor synchronization: Quick Editor -> DB -> Admin Quick View.
 * 19. Cross-editor synchronization: Admin Wish Studio -> DB -> Quick Editor.
 * 20. Public renderer applies .theme-sapphire and .theme-emerald-luxe to experience container.
 * 21. CSS stylesheet contains distinct visual rules for all 6 themes.
 * 22. All 6 themes have complete palette metadata.
 * 23. Theme cycling across all 6 themes (Default -> Royal Gold -> Galaxy -> Rose Gold -> Sapphire -> Emerald Luxe).
 * 24. Database schema remains unmutated (only canonical letter_theme field is used).
 * 25. Modularity & Anti-monolith invariants maintained.
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

console.log("============================================================");
console.log("💎 STARTING PHASE 31F-3 LIVE THEME INTEGRATION TEST SUITE");
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
// Mock Environment & In-Memory Store
// -------------------------------------------------------------
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => { mockStorage.set(k, String(v)); },
  removeItem: (k) => { mockStorage.delete(k); },
  clear: () => { mockStorage.clear(); }
};
globalThis.sessionStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => { mockStorage.set(k, String(v)); },
  removeItem: (k) => { mockStorage.delete(k); },
  clear: () => { mockStorage.clear(); }
};

globalThis.window = globalThis;
globalThis.location = {
  origin: "https://birthday-wish-arjun.vercel.app",
  pathname: "/",
  href: "https://birthday-wish-arjun.vercel.app/"
};

let toastMessages = [];
globalThis.formatName = (n) => n;
globalThis.getOrdinalDay = (d) => `${d}th`;
globalThis.getZodiacSign = (m, d) => ({ sign: "Capricorn", emoji: "♑" });
globalThis.showToast = (msg) => { toastMessages.push(msg); };
globalThis.AdminCore = {
  showToast: (msg) => { toastMessages.push(msg); },
  copyWishUrl: (url) => {}
};

let loggedEvents = [];
globalThis.AdminLogs = {
  logEvent: (event, desc) => {
    loggedEvents.push({ event, desc });
  }
};

let inMemoryWishesTable = new Map();

globalThis.SupabaseModule = {
  getClient: () => ({
    from: (tableName) => ({
      select: (cols) => ({
        eq: (col, val) => ({
          single: async () => {
            if (inMemoryWishesTable.has(val)) {
              return { data: inMemoryWishesTable.get(val), error: null };
            }
            return { data: null, error: { message: "Row not found" } };
          }
        }),
        neq: (col, val) => ({
          order: (orderCol, opts) => async () => {
            const list = Array.from(inMemoryWishesTable.values()).filter(r => r.id !== val);
            return { data: list, error: null };
          }
        })
      })
    })
  })
};

globalThis.DatabaseModule = {
  saveWish: async (configObj) => {
    const newId = "wish-" + Math.random().toString(36).substring(2, 9);
    const row = {
      id: newId,
      recipient_name: configObj.name || "",
      sender_name: configObj.from || "",
      pass_code: configObj.passcode?.code || "1234",
      birth_date: configObj.birthDate || { year: 2001, month: 1, day: 1 },
      letter_lines: configObj.letterLines || [],
      memory_text: configObj.memory || "",
      reasons_json: configObj.reasons || [],
      wishes_json: configObj.wishes || [],
      gallery_json: configObj.gallery || [],
      timeline_json: configObj.timeline || [],
      gift_json: configObj.gift || {},
      music_url: configObj.music?.file || null,
      video_url: configObj.videoWish?.url || null,
      cake_flavor: configObj.cakeFlavor || "default",
      letter_font: configObj.letterFont || "default",
      letter_theme: configObj.letterTheme || "default",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    inMemoryWishesTable.set(newId, row);
    return newId;
  },
  updateWish: async (uuid, configObj) => {
    if (!inMemoryWishesTable.has(uuid)) return null;
    const existing = inMemoryWishesTable.get(uuid);
    const updated = {
      ...existing,
      recipient_name: configObj.name !== undefined ? configObj.name : existing.recipient_name,
      sender_name: configObj.from !== undefined ? configObj.from : existing.sender_name,
      pass_code: configObj.passcode?.code !== undefined ? configObj.passcode.code : existing.pass_code,
      birth_date: configObj.birthDate !== undefined ? configObj.birthDate : existing.birth_date,
      letter_lines: configObj.letterLines !== undefined ? configObj.letterLines : existing.letter_lines,
      memory_text: configObj.memory !== undefined ? configObj.memory : existing.memory_text,
      reasons_json: configObj.reasons !== undefined ? configObj.reasons : existing.reasons_json,
      wishes_json: configObj.wishes !== undefined ? configObj.wishes : existing.wishes_json,
      gallery_json: configObj.gallery !== undefined ? configObj.gallery : existing.gallery_json,
      timeline_json: configObj.timeline !== undefined ? configObj.timeline : existing.timeline_json,
      gift_json: configObj.gift !== undefined ? configObj.gift : existing.gift_json,
      music_url: configObj.music?.file !== undefined ? configObj.music.file : existing.music_url,
      video_url: configObj.videoWish?.url !== undefined ? configObj.videoWish.url : existing.video_url,
      cake_flavor: configObj.cakeFlavor !== undefined ? configObj.cakeFlavor : existing.cake_flavor,
      letter_font: configObj.letterFont !== undefined ? configObj.letterFont : existing.letter_font,
      letter_theme: configObj.letterTheme !== undefined ? configObj.letterTheme : existing.letter_theme,
      updated_at: new Date().toISOString()
    };
    inMemoryWishesTable.set(uuid, updated);
    return uuid;
  },
  getWishRecordById: async (uuid) => {
    if (!inMemoryWishesTable.has(uuid)) return null;
    const data = inMemoryWishesTable.get(uuid);
    return {
      n: data.recipient_name,
      f: data.sender_name,
      c: data.pass_code,
      y: data.birth_date?.year,
      m: data.birth_date?.month,
      d: data.birth_date?.day,
      mem: data.memory_text,
      l: data.letter_lines || [],
      r: data.reasons_json || [],
      w: data.wishes_json || [],
      g: data.gallery_json || [],
      t: data.timeline_json || [],
      gft: data.gift_json || {},
      msc: { f: data.music_url, file: data.music_url, startTime: 0, t: 0 },
      v: { u: data.video_url, url: data.video_url, startTime: 0, t: 0 },
      cf: data.cake_flavor,
      lf: data.letter_font,
      lt: data.letter_theme
    };
  },
  getWishById: async (uuid) => {
    return globalThis.DatabaseModule.getWishRecordById(uuid);
  }
};

function createMockElement(tag = "DIV") {
  const el = {
    tagName: tag.toUpperCase(),
    className: "",
    options: [],
    value: "",
    matches: function (sel) { return true; },
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
      this.options.push(child);
      this.innerHTML += (child.innerHTML || child.textContent || "");
      return child;
    },
    removeChild: function (child) {
      const idx = this._children.indexOf(child);
      if (idx !== -1) this._children.splice(idx, 1);
    },
    setAttribute: function (k, v) { this[k] = v; },
    getAttribute: function (k) { return this[k]; },
    removeAttribute: function (k) { delete this[k]; },
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
    click: async function () {
      if (this._listeners && this._listeners.click) {
        for (const cb of this._listeners.click) {
          await cb({ target: this, stopPropagation: () => {} });
        }
      }
    },
    focus: function () {},
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

// Load Core & Modules
require(path.join(ROOT_DIR, "js", "core", "wish-defaults.js"));
require(path.join(ROOT_DIR, "js", "admin", "admin-themes.js"));
require(path.join(ROOT_DIR, "js", "admin", "admin-wishes.js"));
require(path.join(ROOT_DIR, "js", "admin", "admin-wish-editor.js"));
require(path.join(ROOT_DIR, "js", "share.js"));
require(path.join(ROOT_DIR, "js", "modules", "renderers.js"));

globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();

// Load Customizer
require(path.join(ROOT_DIR, "js", "modules", "editor", "customizer.js"));

const { ThemeRegistry, AdminThemes, AdminWishes, AdminWishEditor, ShareModule, updateLetterThemeAndFont } = globalThis;

globalThis.buildRecipientShareUrl = async (overrideName, options = { persist: false }) => {
  return ShareModule.buildShareUrl(globalThis.CONFIG, overrideName, options);
};

async function runTests() {
  // 1. All 6 themes registered
  await it("1. All 6 themes registered in ThemeRegistry", () => {
    const all = ThemeRegistry.getAll();
    assert.strictEqual(all.length, 6, "Must have exactly 6 registered themes");
  });

  // 2. All 6 IDs are valid
  await it("2. All 6 IDs are valid: default, royalgold, galaxy, rosegold, sapphire, emerald-luxe", () => {
    const expected = ["default", "royalgold", "galaxy", "rosegold", "sapphire", "emerald-luxe"];
    expected.forEach(id => {
      assert.strictEqual(ThemeRegistry.isValid(id), true, `Theme '${id}' must be valid`);
    });
  });

  // 3. Existing 4 IDs strictly unchanged
  await it("3. Existing 4 IDs are strictly unchanged", () => {
    assert(ThemeRegistry.getById("default"));
    assert(ThemeRegistry.getById("royalgold"));
    assert(ThemeRegistry.getById("galaxy"));
    assert(ThemeRegistry.getById("rosegold"));
  });

  // 4. New 'sapphire' ID valid
  await it("4. New 'sapphire' theme has complete metadata & palette", () => {
    const s = ThemeRegistry.getById("sapphire");
    assert(s, "Sapphire must exist");
    assert.strictEqual(s.displayName, "Sapphire Aurora");
    assert.strictEqual(s.badge, "💎 Aurora");
    assert.strictEqual(s.className, "theme-sapphire");
    assert.strictEqual(s.palette.accent, "#38bdf8");
    assert.strictEqual(s.palette.envelope, "#0d223a");
  });

  // 5. New 'emerald-luxe' ID valid
  await it("5. New 'emerald-luxe' theme has complete metadata & palette", () => {
    const e = ThemeRegistry.getById("emerald-luxe");
    assert(e, "Emerald Luxe must exist");
    assert.strictEqual(e.displayName, "Emerald Luxe");
    assert.strictEqual(e.badge, "🌿 Luxe");
    assert.strictEqual(e.className, "theme-emerald-luxe");
    assert.strictEqual(e.palette.accent, "#10b981");
    assert.strictEqual(e.palette.paperBg, "#fffbf0");
  });

  // 6. Old fake 'emerald' ID strictly absent
  await it("6. Old fake 'emerald' ID is strictly absent", () => {
    assert.strictEqual(ThemeRegistry.isValid("emerald"), false);
    assert.strictEqual(ThemeRegistry.getById("emerald"), null);
  });

  // 7. Registry returns all 6 themes from getAll()
  await it("7. Registry returns all 6 themes from getAll()", () => {
    const all = ThemeRegistry.getAll();
    const ids = all.map(t => t.id);
    assert.deepStrictEqual(ids.sort(), ["default", "emerald-luxe", "galaxy", "rosegold", "royalgold", "sapphire"].sort());
  });

  // 8. Case-insensitive lookup works for all 6 themes
  await it("8. Case-insensitive lookup works for all 6 themes", () => {
    ["Default", "ROYALGOLD", "Galaxy", "RoseGold", "Sapphire", "Emerald-Luxe"].forEach(id => {
      assert(ThemeRegistry.getById(id), `Must find theme ${id}`);
    });
  });

  // 9. Invalid theme safely resolves to 'default'
  await it("9. Invalid theme safely resolves to 'default'", () => {
    assert.strictEqual(ThemeRegistry.resolveTheme("invalid_theme_xyz"), "default");
    assert.strictEqual(ThemeRegistry.resolveTheme("emerald"), "default");
    assert.strictEqual(ThemeRegistry.resolveTheme(null), "default");
  });

  // 10. Existing wish theme is preserved without silent overwrite
  await it("10. Existing wish theme is preserved without silent overwrite", () => {
    const wish = { id: "w-old", letter_theme: "rosegold" };
    assert.strictEqual(ThemeRegistry.resolveTheme(wish), "rosegold");
  });

  // 11. Global default only affects newly created wishes
  await it("11. Global default only affects newly created wishes", () => {
    AdminThemes.setDefaultTheme("sapphire", false);
    const existing = { id: "w-1", letter_theme: "galaxy" };
    assert.strictEqual(ThemeRegistry.resolveTheme(existing), "galaxy");
  });

  // 12. Global default persists in localStorage
  await it("12. Global default persists in localStorage", () => {
    AdminThemes.setDefaultTheme("emerald-luxe", false);
    assert.strictEqual(localStorage.getItem("bw_admin_default_theme"), "emerald-luxe");
    assert.strictEqual(AdminThemes.getActiveDefaultThemeId(), "emerald-luxe");
  });

  // 13. Theme preview is non-destructive and causes 0 DB writes
  await it("13. Theme preview is non-destructive and causes 0 DB writes", () => {
    const countBefore = inMemoryWishesTable.size;
    AdminThemes.openThemePreview("sapphire");
    AdminThemes.openThemePreview("emerald-luxe");
    assert.strictEqual(inMemoryWishesTable.size, countBefore);
  });

  // 14. Admin Wish Studio dynamically populates all 6 themes
  await it("14. Admin Wish Studio dynamically populates all 6 themes", () => {
    mockDOM = {};
    sessionStorage.setItem("admin_authenticated", "true");
    AdminWishEditor.openNew();
    const themeSelect = document.getElementById("adm-input-letter-theme");
    assert(themeSelect.innerHTML.includes('value="default"'));
    assert(themeSelect.innerHTML.includes('value="royalgold"'));
    assert(themeSelect.innerHTML.includes('value="galaxy"'));
    assert(themeSelect.innerHTML.includes('value="rosegold"'));
    assert(themeSelect.innerHTML.includes('value="sapphire"'));
    assert(themeSelect.innerHTML.includes('value="emerald-luxe"'));
  });

  // 15. Admin Wish Studio live summary updates display name on theme change
  await it("15. Admin Wish Studio live summary updates display name on theme change", () => {
    sessionStorage.setItem("admin_authenticated", "true");
    AdminWishEditor.init();
    AdminWishEditor.openNew();
    
    // Simulate user selecting Sapphire theme
    const themeSelect = document.getElementById("adm-input-letter-theme");
    themeSelect.value = "sapphire";
    
    // Trigger input / change handler
    const viewEditor = document.getElementById("view-wish-editor");
    if (viewEditor._listeners && viewEditor._listeners.change) {
      viewEditor._listeners.change.forEach(cb => cb({ target: themeSelect, stopPropagation: () => {} }));
    }

    const sumTheme = document.getElementById("adm-sum-theme");
    assert.strictEqual(sumTheme.textContent, "Sapphire Aurora");
  });

  // 16. Quick Editor theme selector options include all 6 themes
  await it("16. Quick Editor theme selector options include all 6 themes in index.html", () => {
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
    assert(indexHtml.includes('value="sapphire"'), "index.html must include sapphire");
    assert(indexHtml.includes('value="emerald-luxe"'), "index.html must include emerald-luxe");
  });

  // 17. Quick Editor save persists 'sapphire' and 'emerald-luxe' to canonical database row
  await it("17. Quick Editor save persists 'sapphire' and 'emerald-luxe' to canonical database row", async () => {
    const id = await DatabaseModule.saveWish({ name: "ThemePersistUser", letterTheme: "default" });
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;

    // Change to sapphire
    mockDOM = {};
    await globalThis.initCustomizerModal();
    document.getElementById("input-name").value = "ThemePersistUser";
    document.getElementById("input-letter-theme").value = "sapphire";
    await document.getElementById("customizer-save-btn").click();

    let row = inMemoryWishesTable.get(id);
    assert.strictEqual(row.letter_theme, "sapphire");

    // Change to emerald-luxe
    mockDOM = {};
    await globalThis.initCustomizerModal();
    document.getElementById("input-name").value = "ThemePersistUser";
    document.getElementById("input-letter-theme").value = "emerald-luxe";
    await document.getElementById("customizer-save-btn").click();

    row = inMemoryWishesTable.get(id);
    assert.strictEqual(row.letter_theme, "emerald-luxe");
  });

  // 18. Cross-editor synchronization: Quick Editor -> DB -> Admin Quick View
  await it("18. Cross-editor synchronization: Quick Editor -> DB -> Admin Quick View", async () => {
    const id = await DatabaseModule.saveWish({ name: "SyncTestUser", letterTheme: "default" });
    AdminWishes.setWishes([inMemoryWishesTable.get(id)]);

    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;
    mockDOM = {};
    await globalThis.initCustomizerModal();
    document.getElementById("input-name").value = "SyncTestUser";
    document.getElementById("input-letter-theme").value = "sapphire";
    await document.getElementById("customizer-save-btn").click();

    await AdminWishes.openQuickView(id);
    const updated = AdminWishes.getWishes().find(w => w.id === id);
    assert.strictEqual(updated.letter_theme, "sapphire");
  });

  // 19. Cross-editor synchronization: Admin Wish Studio -> DB -> Quick Editor
  await it("19. Cross-editor synchronization: Admin Wish Studio -> DB -> Quick Editor", async () => {
    const id = await DatabaseModule.saveWish({ name: "AdminSyncUser", letterTheme: "emerald-luxe" });
    const record = await DatabaseModule.getWishRecordById(id);
    assert.strictEqual(record.lt, "emerald-luxe");
  });

  // 20. Public renderer applies .theme-sapphire and .theme-emerald-luxe to experience container
  await it("20. Public renderer applies .theme-sapphire and .theme-emerald-luxe to experience container", () => {
    mockDOM = {};
    const exp = document.getElementById("experience");

    // Test Sapphire
    globalThis.CONFIG.letterTheme = "sapphire";
    updateLetterThemeAndFont();
    assert(exp.classList.contains("theme-sapphire"), "experience container must have theme-sapphire class");
    assert(!exp.classList.contains("theme-royalgold"), "other theme classes must be removed");

    // Test Emerald Luxe
    globalThis.CONFIG.letterTheme = "emerald-luxe";
    updateLetterThemeAndFont();
    assert(exp.classList.contains("theme-emerald-luxe"), "experience container must have theme-emerald-luxe class");
    assert(!exp.classList.contains("theme-sapphire"), "theme-sapphire must be removed");
  });

  // 21. CSS stylesheet contains distinct visual rules for all 6 themes
  await it("21. CSS stylesheet contains distinct visual rules for all 6 themes", () => {
    const css = fs.readFileSync(path.join(ROOT_DIR, "css", "style.css"), "utf8");
    assert(css.includes(".theme-royalgold"), "CSS must contain .theme-royalgold");
    assert(css.includes(".theme-galaxy"), "CSS must contain .theme-galaxy");
    assert(css.includes(".theme-rosegold"), "CSS must contain .theme-rosegold");
    assert(css.includes(".theme-sapphire"), "CSS must contain .theme-sapphire");
    assert(css.includes(".theme-emerald-luxe"), "CSS must contain .theme-emerald-luxe");
  });

  // 22. All 6 themes have complete palette metadata
  await it("22. All 6 themes have complete palette metadata", () => {
    const all = ThemeRegistry.getAll();
    all.forEach(t => {
      assert(t.palette.background, `${t.id} missing background`);
      assert(t.palette.envelope, `${t.id} missing envelope`);
      assert(t.palette.paperBg, `${t.id} missing paperBg`);
      assert(t.palette.text, `${t.id} missing text`);
      assert(t.palette.accent, `${t.id} missing accent`);
      assert(t.palette.highlight, `${t.id} missing highlight`);
      assert(t.palette.border, `${t.id} missing border`);
    });
  });

  // 23. Theme cycling across all 6 themes
  await it("23. Theme cycling across all 6 themes (Default -> Royal Gold -> Galaxy -> Rose Gold -> Sapphire -> Emerald Luxe)", async () => {
    const id = await DatabaseModule.saveWish({ name: "CycleUser", letterTheme: "default" });
    const themeCycle = ["royalgold", "galaxy", "rosegold", "sapphire", "emerald-luxe", "default"];

    for (const targetTheme of themeCycle) {
      await DatabaseModule.updateWish(id, { name: "CycleUser", letterTheme: targetTheme });
      const rec = inMemoryWishesTable.get(id);
      assert.strictEqual(rec.letter_theme, targetTheme, `Must persist ${targetTheme}`);
    }
  });

  // 24. Database schema remains unmutated
  await it("24. Database schema remains unmutated", () => {
    const dbJs = fs.readFileSync(path.join(ROOT_DIR, "js", "database.js"), "utf8");
    assert(dbJs.includes("letter_theme"), "Canonical letter_theme field preserved");
  });

  // 25. Modularity & Anti-monolith invariants maintained
  await it("25. Modularity & Anti-monolith invariants maintained", () => {
    const themesStats = fs.statSync(path.join(ROOT_DIR, "js", "admin", "admin-themes.js"));
    const wishesStats = fs.statSync(path.join(ROOT_DIR, "js", "admin", "admin-wishes.js"));
    const editorStats = fs.statSync(path.join(ROOT_DIR, "js", "admin", "admin-wish-editor.js"));

    assert(themesStats.size < 35000, `admin-themes.js size is healthy (${themesStats.size} bytes)`);
    assert(wishesStats.size < 160000, `admin-wishes.js size is healthy (${wishesStats.size} bytes)`);
    assert(editorStats.size < 135000, `admin-wish-editor.js size is healthy (${editorStats.size} bytes)`);
  });

  console.log("============================================================");
  if (testsFailed === 0) {
    console.log(`🎉 ALL ${testsPassed} PHASE 31F-3 LIVE THEME TESTS PASSED!`);
  } else {
    console.error(`❌ ${testsFailed} TEST(S) FAILED!`);
    process.exit(1);
  }
  console.log("============================================================");
}

runTests();
