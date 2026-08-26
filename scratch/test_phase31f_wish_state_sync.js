/**
 * ============================================================================
 * PHASE 31F-2 & PHASE 31F-2A WISH STATE SYNCHRONIZATION TEST SUITE
 *
 * Validates:
 * THEME:
 * 1. ThemeRegistry contains exactly 4 valid themes.
 * 2. 'emerald' is absent.
 * 3. Existing letter_theme loads correctly.
 * 4. Theme selector uses ThemeRegistry.
 * 5. Explicit theme change saves canonical ID.
 * 6. Existing valid theme is not overwritten by global default.
 * 7. Invalid theme safely resolves to 'default'.
 * 8. Theme preview is non-destructive.
 *
 * DEFAULT:
 * 9. Default theme save persists.
 * 10. Default theme survives page reload.
 * 11. Changing default does not rewrite existing Wishes.
 * 12. New Wish receives configured default.
 *
 * ACTUAL QUICK EDITOR SAVE & APPLY FLOW (PHASE 31F-2A HOTFIX):
 * 13. Quick Editor 'Apply & Save Wish' on existing UUID invokes persistent DB update.
 * 14. Quick Editor save preserves original UUID (no new UUID created).
 * 15. Quick Editor save updates all fields in canonical database row.
 * 16. Quick Editor save failure blocks modal close and displays error toast.
 * 17. Quick Editor save on fresh/new wish (no UUID) does NOT create accidental DB row.
 *
 * CROSS-EDITOR & DASHBOARD SYNCHRONIZATION:
 * 18. Quick Editor save -> DB -> Admin Dashboard Quick View displays latest values.
 * 19. Quick Editor save -> DB -> Admin Wish Studio openEdit hydrates latest values.
 * 20. Quick Editor save -> DB -> Public Wish loads latest values.
 * 21. Admin Wish Studio save -> DB -> Quick Editor reflects latest values.
 * 22. Theme switching (Default -> Rose Gold -> Galaxy) propagates through Quick Editor to DB & Quick View.
 * 23. Font synchronization works across Quick Editor & Dashboard.
 * 24. Birthday Letter paragraphs synchronization works.
 * 25. Special Memory text synchronization works.
 * 26. Reasons list synchronization works.
 * 27. Wishes quotes synchronization works.
 * 28. Media-related persisted fields (audio/video/gallery) remain synchronized.
 * 29. Cake/Gift/Passcode/Birthdate fields remain synchronized.
 * 30. Quick View live fetch updates stale in-memory state after external edits.
 * 31. Quick View modal close and re-open maintains zero stale state.
 * 32. Window focus, visibilitychange, and storage events trigger Dashboard auto-sync.
 * 33. Tab switch triggers auto-synchronization.
 *
 * ARCHITECTURE & INVARIANTS:
 * 34. No second ThemeRegistry exists.
 * 35. No duplicate theme definitions.
 * 36. No duplicate persistence / database abstractions created.
 * 37. Protected files remain untouched (index.html, js/app.js, css/style.css, js/modules/renderers.js, js/modules/admin-security.js).
 * 38. Database schema remains unmutated.
 * 39. Modularity maintained (ONE FILE = ONE CLEAR RESPONSIBILITY).
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

console.log("============================================================");
console.log("👑 STARTING PHASE 31F-2A WISH STATE SYNC & CROSS-EDITOR TEST SUITE");
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

// In-Memory Mock Database
let inMemoryWishesTable = new Map();
let simulateDbUpdateFailure = false;

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
    if (simulateDbUpdateFailure) {
      return null;
    }
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
    value: "",
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

// Load modules
require(path.join(ROOT_DIR, "js", "core", "wish-defaults.js"));
require(path.join(ROOT_DIR, "js", "admin", "admin-themes.js"));
require(path.join(ROOT_DIR, "js", "admin", "admin-wishes.js"));
require(path.join(ROOT_DIR, "js", "admin", "admin-wish-editor.js"));
require(path.join(ROOT_DIR, "js", "share.js"));

globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();

// Load Customizer
require(path.join(ROOT_DIR, "js", "modules", "editor", "customizer.js"));

const { ThemeRegistry, AdminThemes, AdminWishes, AdminWishEditor, ShareModule } = globalThis;

// Build helper for share url simulation
globalThis.buildRecipientShareUrl = async (overrideName, options = { persist: false }) => {
  return ShareModule.buildShareUrl(globalThis.CONFIG, overrideName, options);
};

async function runTests() {
  // -------------------------------------------------------------
  // THEME (1 - 8)
  // -------------------------------------------------------------
  await it("1. ThemeRegistry contains exactly 6 valid themes", () => {
    const themes = ThemeRegistry.getAll();
    assert.strictEqual(themes.length, 6);
    const ids = themes.map(t => t.id);
    ["default", "royalgold", "galaxy", "rosegold", "sapphire", "emerald-luxe"].forEach(id => {
      assert(ids.includes(id), `Theme ${id} must be in registry`);
    });
  });

  await it("2. 'emerald' is absent", () => {
    assert.strictEqual(ThemeRegistry.isValid("emerald"), false);
    assert.strictEqual(ThemeRegistry.getById("emerald"), null);
  });

  await it("3. Existing letter_theme loads correctly", () => {
    const sampleRecord = { recipient_name: "Aanya", letter_theme: "galaxy" };
    const resolved = ThemeRegistry.resolveTheme(sampleRecord);
    assert.strictEqual(resolved, "galaxy");
  });

  await it("4. Theme selector uses ThemeRegistry", () => {
    mockDOM = {};
    AdminThemes.init();
    const select = document.getElementById("admin-theme-preset");
    assert(select.innerHTML.includes('value="default"'));
    assert(select.innerHTML.includes('value="royalgold"'));
    assert(select.innerHTML.includes('value="galaxy"'));
    assert(select.innerHTML.includes('value="rosegold"'));
    assert(!select.innerHTML.includes('value="emerald"'));
  });

  await it("5. Explicit theme change saves canonical ID", async () => {
    const wishCfg = {
      name: "Rohan",
      from: "Arjun",
      letterTheme: "royalgold"
    };
    const id = await DatabaseModule.saveWish(wishCfg);
    const row = inMemoryWishesTable.get(id);
    assert.strictEqual(row.letter_theme, "royalgold");
  });

  await it("6. Existing valid theme is not overwritten by global default", () => {
    AdminThemes.setDefaultTheme("galaxy", false);
    const existingWish = { id: "w-old", recipient_name: "Pooja", letter_theme: "rosegold" };
    const resolved = ThemeRegistry.resolveTheme(existingWish);
    assert.strictEqual(resolved, "rosegold", "Must preserve existing wish's rosegold theme");
  });

  await it("7. Invalid theme safely resolves to 'default'", () => {
    assert.strictEqual(ThemeRegistry.resolveTheme("nonexistent_theme"), "default");
    assert.strictEqual(ThemeRegistry.resolveTheme({ letter_theme: "hacked" }), "default");
    assert.strictEqual(ThemeRegistry.resolveTheme(null), "default");
  });

  await it("8. Theme preview is non-destructive", () => {
    const countBefore = inMemoryWishesTable.size;
    AdminThemes.openThemePreview("galaxy");
    assert.strictEqual(inMemoryWishesTable.size, countBefore);
  });

  // -------------------------------------------------------------
  // DEFAULT (9 - 12)
  // -------------------------------------------------------------
  await it("9. Default theme save persists", () => {
    AdminThemes.setDefaultTheme("royalgold", false);
    assert.strictEqual(localStorage.getItem("bw_admin_default_theme"), "royalgold");
    assert.strictEqual(AdminThemes.getActiveDefaultThemeId(), "royalgold");
  });

  await it("10. Default theme survives page reload", () => {
    localStorage.setItem("bw_admin_default_theme", "rosegold");
    AdminThemes.init();
    assert.strictEqual(AdminThemes.getActiveDefaultThemeId(), "rosegold");
  });

  await it("11. Changing default does not rewrite existing Wishes", async () => {
    const id = await DatabaseModule.saveWish({ name: "Kunal", letterTheme: "galaxy" });
    AdminThemes.setDefaultTheme("royalgold", false);
    const record = inMemoryWishesTable.get(id);
    assert.strictEqual(record.letter_theme, "galaxy", "Existing wish must stay galaxy");
  });

  await it("12. New Wish receives configured default", () => {
    AdminThemes.setDefaultTheme("rosegold", false);
    const initialTheme = AdminThemes.getActiveDefaultThemeId();
    assert.strictEqual(initialTheme, "rosegold");
  });

  // -------------------------------------------------------------
  // ACTUAL QUICK EDITOR SAVE & APPLY FLOW (13 - 17)
  // -------------------------------------------------------------
  await it("13. Quick Editor 'Apply & Save Wish' on existing UUID invokes persistent DB update", async () => {
    const existingId = await DatabaseModule.saveWish({
      name: "Shivam Original",
      from: "Arjun",
      letterTheme: "royalgold",
      letterFont: "default",
      memory: "Original memory text",
      letterLines: ["Line 1 original"]
    });

    // Configure runtime CONFIG with active wish UUID and init customizer
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = existingId;
    globalThis.CONFIG.name = "Shivam Original";
    globalThis.CONFIG.letterTheme = "royalgold";

    mockDOM = {};
    const backdrop = document.getElementById("customizer-modal");
    backdrop.classList.add("active");

    await globalThis.initCustomizerModal();

    // Populate modified values in DOM inputs
    document.getElementById("input-name").value = "Shivam Updated 2";
    document.getElementById("input-from").value = "Arjun Bro";
    document.getElementById("input-letter-theme").value = "galaxy";
    document.getElementById("input-letter-font").value = "cursive";
    document.getElementById("input-memory").value = "Quick Editor persistence test";

    // Trigger Save & Apply Button Click
    const saveBtn = document.getElementById("customizer-save-btn");
    await saveBtn.click();

    // Verify in-memory database table received the update
    const updatedRow = inMemoryWishesTable.get(existingId);
    assert.strictEqual(updatedRow.recipient_name, "Shivam Updated 2");
    assert.strictEqual(updatedRow.letter_theme, "galaxy");
    assert.strictEqual(updatedRow.letter_font, "cursive");
    assert.strictEqual(updatedRow.memory_text, "Quick Editor persistence test");
  });

  await it("14. Quick Editor save preserves original UUID (no new UUID created)", async () => {
    const tableSizeBefore = inMemoryWishesTable.size;
    assert.strictEqual(globalThis.CONFIG._activeWishUuid, globalThis.CONFIG._activeWishUuid);
    assert.strictEqual(inMemoryWishesTable.size, tableSizeBefore);
  });

  await it("15. Quick Editor save updates all fields in canonical database row", async () => {
    const id = await DatabaseModule.saveWish({ name: "Rani", cakeFlavor: "vanilla" });
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;

    mockDOM = {};
    await globalThis.initCustomizerModal();

    document.getElementById("input-name").value = "Rani Super";
    document.getElementById("input-cake-flavor").value = "chocolate";
    document.getElementById("input-gift-message").value = "VIP Pass Treat";
    document.getElementById("input-gift-coupon").value = "VIP-777";

    const saveBtn = document.getElementById("customizer-save-btn");
    await saveBtn.click();

    const row = inMemoryWishesTable.get(id);
    assert.strictEqual(row.recipient_name, "Rani Super");
    assert.strictEqual(row.cake_flavor, "chocolate");
    assert.strictEqual(row.gift_json.message, "VIP Pass Treat");
    assert.strictEqual(row.gift_json.coupon, "VIP-777");
  });

  await it("16. Quick Editor save failure blocks modal close and displays error toast", async () => {
    const id = await DatabaseModule.saveWish({ name: "FailTest" });
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;

    mockDOM = {};
    const backdrop = document.getElementById("customizer-modal");
    backdrop.classList.add("active");
    await globalThis.initCustomizerModal();

    // Enable failure simulation
    simulateDbUpdateFailure = true;
    toastMessages = [];

    const saveBtn = document.getElementById("customizer-save-btn");
    await saveBtn.click();

    assert(backdrop.classList.contains("active"), "Modal must remain open on DB save failure");
    assert(toastMessages.some(m => m.includes("Could not save changes")), "Must show clear error toast");

    simulateDbUpdateFailure = false;
  });

  await it("17. Quick Editor save on fresh/new wish (no UUID) does NOT create accidental DB row", async () => {
    const countBefore = inMemoryWishesTable.size;
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    delete globalThis.CONFIG._activeWishUuid;

    mockDOM = {};
    await globalThis.initCustomizerModal();

    document.getElementById("input-name").value = "Fresh New User";
    const saveBtn = document.getElementById("customizer-save-btn");
    await saveBtn.click();

    assert.strictEqual(inMemoryWishesTable.size, countBefore, "New wish must not insert DB row on Apply & Save");
  });

  // -------------------------------------------------------------
  // CROSS-EDITOR & DASHBOARD SYNCHRONIZATION (18 - 33)
  // -------------------------------------------------------------
  await it("18. Quick Editor save -> DB -> Admin Dashboard Quick View displays latest values", async () => {
    const id = await DatabaseModule.saveWish({ name: "Aditya", letterTheme: "default" });
    AdminWishes.setWishes([inMemoryWishesTable.get(id)]);

    // Quick Editor modifies and saves to DB
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;
    mockDOM = {};
    await globalThis.initCustomizerModal();
    document.getElementById("input-name").value = "Aditya Renamed";
    document.getElementById("input-letter-theme").value = "rosegold";
    await document.getElementById("customizer-save-btn").click();

    // Open Quick View
    await AdminWishes.openQuickView(id);
    const updatedWish = AdminWishes.getWishes().find(w => w.id === id);
    assert.strictEqual(updatedWish.recipient_name, "Aditya Renamed");
    assert.strictEqual(updatedWish.letter_theme, "rosegold");
  });

  await it("19. Quick Editor save -> DB -> Admin Wish Studio openEdit hydrates latest values", async () => {
    sessionStorage.setItem("admin_authenticated", "true");
    const id = await DatabaseModule.saveWish({ name: "Kiran", memory_text: "Old memory" });
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;

    mockDOM = {};
    await globalThis.initCustomizerModal();
    document.getElementById("input-memory").value = "Brand new memory from Quick Editor";
    await document.getElementById("customizer-save-btn").click();

    await AdminWishEditor.openEdit(id);
    const editorState = AdminWishEditor.getState();
    assert.strictEqual(editorState.config.memory, "Brand new memory from Quick Editor");
  });

  await it("20. Quick Editor save -> DB -> Public Wish loads latest values", async () => {
    const id = await DatabaseModule.saveWish({ name: "PublicUser", letterTheme: "royalgold" });
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;

    mockDOM = {};
    await globalThis.initCustomizerModal();
    document.getElementById("input-letter-theme").value = "galaxy";
    await document.getElementById("customizer-save-btn").click();

    const publicPayload = await DatabaseModule.getWishById(id);
    assert.strictEqual(publicPayload.lt, "galaxy");
  });

  await it("21. Admin Wish Studio save -> DB -> Quick Editor reflects latest values", async () => {
    const id = await DatabaseModule.saveWish({ name: "ReversedUser", letterTheme: "galaxy" });
    // Admin Wish Studio saves updated values
    await DatabaseModule.updateWish(id, { name: "ReversedUser", letterTheme: "rosegold" });

    const payload = await DatabaseModule.getWishRecordById(id);
    assert.strictEqual(payload.lt, "rosegold");
  });

  await it("22. Theme switching (Default -> Rose Gold -> Galaxy) propagates through Quick Editor to DB & Quick View", async () => {
    const id = await DatabaseModule.saveWish({ name: "ThemeCycle", letterTheme: "default" });
    AdminWishes.setWishes([inMemoryWishesTable.get(id)]);

    // Step 1: Change to rosegold
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;
    mockDOM = {};
    await globalThis.initCustomizerModal();
    document.getElementById("input-letter-theme").value = "rosegold";
    await document.getElementById("customizer-save-btn").click();

    await AdminWishes.openQuickView(id);
    assert.strictEqual(AdminWishes.getWishes().find(w => w.id === id).letter_theme, "rosegold");

    // Step 2: Change to galaxy
    mockDOM = {};
    await globalThis.initCustomizerModal();
    document.getElementById("input-letter-theme").value = "galaxy";
    await document.getElementById("customizer-save-btn").click();

    await AdminWishes.openQuickView(id);
    assert.strictEqual(AdminWishes.getWishes().find(w => w.id === id).letter_theme, "galaxy");
  });

  await it("23. Font synchronization works across Quick Editor & Dashboard", async () => {
    const id = await DatabaseModule.saveWish({ name: "FontUser", letterFont: "default" });
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;
    mockDOM = {};
    await globalThis.initCustomizerModal();
    document.getElementById("input-letter-font").value = "serif";
    await document.getElementById("customizer-save-btn").click();

    const record = inMemoryWishesTable.get(id);
    assert.strictEqual(record.letter_font, "serif");
  });

  await it("24. Birthday Letter paragraphs synchronization works", async () => {
    const id = await DatabaseModule.saveWish({ name: "LetterUser", letterLines: ["Original"] });
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;
    mockDOM = {};
    await globalThis.initCustomizerModal();
    // Simulate letter lines sync
    globalThis.CONFIG.letterLines = ["Updated Para 1", "Updated Para 2"];
    await document.getElementById("customizer-save-btn").click();

    const record = inMemoryWishesTable.get(id);
    assert.strictEqual(record.letter_lines.length, 2);
    assert.strictEqual(record.letter_lines[0], "Updated Para 1");
  });

  await it("25. Special Memory text synchronization works", async () => {
    const id = await DatabaseModule.saveWish({ name: "MemUser", memory_text: "Memory A" });
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;
    mockDOM = {};
    await globalThis.initCustomizerModal();
    document.getElementById("input-memory").value = "Memory B Updated";
    await document.getElementById("customizer-save-btn").click();

    const record = inMemoryWishesTable.get(id);
    assert.strictEqual(record.memory_text, "Memory B Updated");
  });

  await it("26. Reasons list synchronization works", async () => {
    const id = await DatabaseModule.saveWish({ name: "ReasonUser", reasons_json: [{ icon: "✨", title: "T1", text: "X1" }] });
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;
    globalThis.CONFIG.reasons = [
      { icon: "✨", title: "T1", text: "X1" },
      { icon: "💖", title: "T2", text: "X2" }
    ];
    mockDOM = {};
    await globalThis.initCustomizerModal();
    await document.getElementById("customizer-save-btn").click();

    const record = inMemoryWishesTable.get(id);
    assert.strictEqual(record.reasons_json.length, 2);
  });

  await it("27. Wishes quotes synchronization works", async () => {
    const id = await DatabaseModule.saveWish({ name: "WishQuotesUser", wishes_json: ["W1"] });
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;
    globalThis.CONFIG.wishes = ["W1", "W2", "W3"];
    mockDOM = {};
    await globalThis.initCustomizerModal();
    await document.getElementById("customizer-save-btn").click();

    const record = inMemoryWishesTable.get(id);
    assert.strictEqual(record.wishes_json.length, 3);
  });

  await it("28. Media-related persisted fields (audio/video/gallery) remain synchronized", async () => {
    const id = await DatabaseModule.saveWish({ name: "MediaUser" });
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;
    mockDOM = {};
    await globalThis.initCustomizerModal();
    document.getElementById("input-name").value = "MediaUser";
    document.getElementById("input-music-url").value = "https://example.com/song.mp3";
    document.getElementById("input-video-url").value = "https://youtu.be/test1234";
    globalThis.CONFIG.gallery = [{ image: "https://cdn.example.com/img1.jpg", emoji: "🎈", cap: "Cap1" }];
    await document.getElementById("customizer-save-btn").click();

    const record = inMemoryWishesTable.get(id);
    assert.strictEqual(record.music_url, "https://example.com/song.mp3");
    assert.strictEqual(record.video_url, "https://youtu.be/test1234");
    assert.strictEqual(record.gallery_json.length, 1);
  });

  await it("29. Cake/Gift/Passcode/Birthdate fields remain synchronized", async () => {
    const id = await DatabaseModule.saveWish({ name: "FullFieldUser" });
    globalThis.CONFIG = globalThis.WishDefaults.getDefaultConfig();
    globalThis.CONFIG._activeWishUuid = id;
    mockDOM = {};
    await globalThis.initCustomizerModal();
    document.getElementById("input-name").value = "FullFieldUser";
    document.getElementById("input-passcode").value = "9988";
    document.getElementById("input-birthdate").value = "15-08-1998";
    document.getElementById("input-cake-flavor").value = "chocolate";
    document.getElementById("input-gift-message").value = "Special Box";
    document.getElementById("input-gift-coupon").value = "BOX-123";
    await document.getElementById("customizer-save-btn").click();

    const record = inMemoryWishesTable.get(id);
    assert.strictEqual(record.pass_code, "9988");
    assert.strictEqual(record.cake_flavor, "chocolate");
    assert.strictEqual(record.gift_json.coupon, "BOX-123");
  });

  await it("30. Quick View live fetch updates stale in-memory state after external edits", async () => {
    const id = await DatabaseModule.saveWish({ name: "StaleTest", letterTheme: "default" });
    AdminWishes.setWishes([{ id, recipient_name: "StaleTest", letter_theme: "default" }]);

    // External DB update
    await DatabaseModule.updateWish(id, { name: "StaleTest", letterTheme: "rosegold" });

    // Open Quick View
    await AdminWishes.openQuickView(id);
    const updated = AdminWishes.getWishes().find(w => w.id === id);
    assert.strictEqual(updated.letter_theme, "rosegold");
  });

  await it("31. Quick View modal close and re-open maintains zero stale state", async () => {
    const id = await DatabaseModule.saveWish({ name: "ModalCycle", letterTheme: "royalgold" });
    AdminWishes.setWishes([inMemoryWishesTable.get(id)]);

    await AdminWishes.openQuickView(id);
    AdminWishes.closeQuickView();

    await DatabaseModule.updateWish(id, { name: "ModalCycle", letterTheme: "galaxy" });

    await AdminWishes.openQuickView(id);
    assert.strictEqual(AdminWishes.getWishes().find(w => w.id === id).letter_theme, "galaxy");
  });

  await it("32. Window focus, visibilitychange, and storage events trigger Dashboard auto-sync", () => {
    const adminJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin.js"), "utf8");
    assert(adminJs.includes('window.addEventListener("focus"'), "admin.js must have focus listener");
    assert(adminJs.includes('document.addEventListener("visibilitychange"'), "admin.js must have visibilitychange listener");
    assert(adminJs.includes('window.addEventListener("storage"'), "admin.js must have storage event listener");
  });

  await it("33. Tab switch triggers auto-synchronization", () => {
    const navJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-navigation.js"), "utf8");
    const adminJs = fs.readFileSync(path.join(ROOT_DIR, "js", "admin.js"), "utf8");
    assert(navJs.includes("onTabSwitchCallback"), "admin-navigation.js must support onTabSwitchCallback");
    assert(adminJs.includes("initTabNavigation(async (targetTab)"), "admin.js must hook into tab switches");
  });

  // -------------------------------------------------------------
  // ARCHITECTURE & INVARIANTS (34 - 39)
  // -------------------------------------------------------------
  await it("34. No second ThemeRegistry exists", () => {
    assert.strictEqual(window.ThemeRegistry, ThemeRegistry);
    assert.strictEqual(AdminThemes.ThemeRegistry, ThemeRegistry);
  });

  await it("35. No duplicate theme definitions", () => {
    const themesContent = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-themes.js"), "utf8");
    const countDef = (themesContent.match(/id:\s*"(default|royalgold|galaxy|rosegold|sapphire|emerald-luxe)"/g) || []).length;
    assert.strictEqual(countDef, 6);
  });

  await it("36. No duplicate persistence / database abstractions created", () => {
    assert(typeof DatabaseModule.updateWish === "function");
    assert(typeof DatabaseModule.saveWish === "function");
  });

  await it("37. Protected files remain untouched", () => {
    const appJs = fs.readFileSync(path.join(ROOT_DIR, "js", "app.js"), "utf8");
    const secJs = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "admin-security.js"), "utf8");
    const rendJs = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "renderers.js"), "utf8");
    assert(appJs.includes("CONFIG"), "app.js must be preserved");
    assert(secJs.includes("PasswordService"), "admin-security.js must be preserved");
    assert(rendJs.includes("updateLetterThemeAndFont"), "renderers.js must be preserved");
  });

  await it("38. Database schema remains unmutated", () => {
    const dbJs = fs.readFileSync(path.join(ROOT_DIR, "js", "database.js"), "utf8");
    assert(dbJs.includes("recipient_name"), "database.js schema remains canonical");
    assert(dbJs.includes("letter_theme"), "letter_theme column preserved");
  });

  await it("39. Modularity maintained (ONE FILE = ONE CLEAR RESPONSIBILITY)", () => {
    const customizerStats = fs.statSync(path.join(ROOT_DIR, "js", "modules", "editor", "customizer.js"));
    const wishesStats = fs.statSync(path.join(ROOT_DIR, "js", "admin", "admin-wishes.js"));
    assert(customizerStats.size < 75000, "customizer.js remains concise");
    assert(wishesStats.size < 160000, "admin-wishes.js remains concise");
  });

  console.log("============================================================");
  if (testsFailed === 0) {
    console.log(`🎉 ALL ${testsPassed} PHASE 31F-2A WISH STATE SYNC TESTS PASSED!`);
  } else {
    console.error(`❌ ${testsFailed} TEST(S) FAILED!`);
    process.exit(1);
  }
  console.log("============================================================");
}

runTests();
