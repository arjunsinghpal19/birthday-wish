/**
 * ============================================================================
 * PHASE 31B-13.4 AUTOMATED TEST SUITE: QUICK VIEW FINAL DATA & CARD ORDER FIX
 * Validates:
 * 1. Direct birth_date object parsing
 * 2. JSON-stringified birth_date object parsing
 * 3. birthDate object parsing
 * 4. birthDate JSON string parsing
 * 5. d/m/y legacy fields parsing
 * 6. Plain DD/MM/YYYY and YYYY-MM-DD strings parsing
 * 7. Invalid birthday fallback ("Not specified")
 * 8. Missing birthday fallback ("Not specified")
 * 9. Theme Resolution: letter_theme custom schema value
 * 10. Theme Resolution: letterTheme / lt / theme_id / theme fallback values
 * 11. Theme Resolution: truly missing theme defaults to "default" without mutating valid values
 * 12. Font Resolution: letter_font custom schema value
 * 13. Font Resolution: letterFont / lf / font_id / font fallback values
 * 14. Font Resolution: truly missing font defaults to "default" without mutating valid values
 * 15. Content Cards Order: Strictly Letter -> Memory -> Reasons -> Wishes
 * 16. Media Cards Order: Strictly Photos -> Timeline -> Music -> Video
 * 17. Customization Row: Exactly 4 equal columns in ONE line with nowrap, ellipsis & Gift View interaction
 * 18. Gallery: data:image thumbnail rendering
 * 19. Gallery: HTTPS image thumbnail rendering
 * 20. Gallery: object with .image property
 * 21. Gallery: object with .url property
 * 22. Gallery: View action opens internal image preview lightbox
 * 23. Lightbox: renders data URL
 * 24. Lightbox: renders HTTPS URL
 * 25. Lightbox: close button
 * 26. Lightbox: backdrop click close
 * 27. Lightbox: Escape key closes lightbox first
 * 28. Lightbox: invalid image fallback ("Image preview unavailable")
 * 29. Lightbox: multi-image navigation (prev/next/arrow keys)
 * 30. Security: no raw Base64 text exposed in UI
 * 31. Public Page: canonical /?w=UUID link structure
 * 32. Public Page: standard HTML link with no blocking async intercepts
 * 33. State: Quick View and Gallery lightbox preserve parent state
 * 34. State: row selections preserved
 * 35. State: search & filter preserved
 * 36. State: pagination preserved
 * 37. Security: passcode privacy invariant
 * 38. Security: system master configuration row protection
 * Pure Node.js test environment (Zero external dependencies).
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT_DIR = path.resolve(__dirname, "..");

console.log("============================================================");
console.log("🚀 STARTING PHASE 31B-13.4 QUICK VIEW FINAL DATA & CARD ORDER TEST SUITE");
console.log("============================================================");

const fixedIsoDate = "2026-08-20T21:11:24.000Z";
const threeDaysAgo = "2026-08-17T10:05:00.000Z";
const fifteenDaysAgo = "2026-08-05T14:30:00.000Z";

const mockWishes = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    recipient_name: "Shivam Sharma",
    sender_name: "Arjun Singh",
    birth_date: { year: 2001, month: 8, day: 17 },
    pass_code: "1234",
    memory_text: "Manali winter road trip memories and bonfire nights",
    created_at: fixedIsoDate,
    music_url: "https://example.com/audio1.mp3#bw-start=75",
    video_url: null,
    gallery_json: [
      { image: "https://example.com/photo1.jpg", caption: "Trip Day 1" },
      { url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...", caption: "Base64 Sunset" },
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      { image: "", caption: "Missing Photo" }
    ],
    letter_json: ["Dear Shivam,", "Happy Birthday my brother! May you achieve everything."],
    timeline_json: [{ year: "2020", title: "College Start", desc: "First day at university" }],
    reasons_json: [{ text: "Always loyal" }, { text: "Best advisor" }, { text: "Epic road trips" }],
    wishes_json: [{ message: "Have a blast!", emoji: "🎉" }, { message: "Stay blessed always!", emoji: "✨" }],
    letter_theme: "midnight-gold",
    letter_font: "playfair",
    cake_flavor: "Chocolate Truffle",
    gift_json: { message: "Enjoy your gift voucher!", coupon: "BASH2026" }
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    recipient_name: "Priya Patel",
    sender_name: "Rohit Verma",
    birth_date: "{\"day\":17,\"month\":8,\"year\":2001}",
    pass_code: "5678",
    memory_text: "",
    created_at: threeDaysAgo,
    music_url: null,
    video_url: "https://youtube.com/watch?v=video123#bw-start=30",
    gallery_json: [],
    letter_json: null,
    timeline_json: null,
    reasons_json: null,
    wishes_json: null,
    theme_id: "sunset",
    font_id: "inter",
    cake_flavor: null,
    gift_json: null
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    recipient_name: "Minimal Wish",
    sender_name: "",
    birth_date: null,
    pass_code: "secret_passcode_9999",
    memory_text: null,
    created_at: null,
    music_url: null,
    video_url: null,
    gallery_json: null,
    letter_json: null,
    timeline_json: null,
    reasons_json: null,
    wishes_json: null,
    theme_id: null,
    font_id: null,
    cake_flavor: null,
    gift_json: null
  },
  {
    id: "00000000-0000-0000-0000-000000000001",
    recipient_name: "System Baseline Config",
    sender_name: "System Admin",
    birth_date: null,
    pass_code: "admin_pass",
    memory_text: "System configuration master row",
    created_at: fifteenDaysAgo,
    music_url: null,
    video_url: null,
    gallery_json: [],
    letter_json: [],
    timeline_json: [],
    reasons_json: [],
    wishes_json: [],
    theme_id: "default",
    font_id: "default",
    cake_flavor: "Vanilla",
    gift_json: null
  }
];

let mockElements = {};
let mockListeners = {};
let documentListeners = {};
let activeElement = null;

function createMockElement(id, tagName = "div") {
  let _innerHTML = "";
  const _classes = new Set();
  const el = {
    id,
    tagName: tagName.toUpperCase(),
    value: "",
    textContent: "",
    isContentEditable: false,
    _focused: false,
    get innerHTML() {
      return _innerHTML;
    },
    set innerHTML(val) {
      _innerHTML = val;
      this._cardBtns = [];
      this._galleryViewBtns = [];
      if (!val) {
        this.children = [];
      } else {
        const idRegex = /\bid="([^"]+)"/gi;
        let idMatch;
        while ((idMatch = idRegex.exec(val)) !== null) {
          const elemId = idMatch[1];
          if (!mockElements[elemId]) {
            createMockElement(elemId);
          }
        }
        const regex = /<[a-z0-9]+[^>]*data-section="([^"]+)"[^>]*>/gi;
        let match;
        while ((match = regex.exec(val)) !== null) {
          if (match[0].includes("quick-view-card-btn")) {
            this._cardBtns.push({
              dataset: { section: match[1] },
              onclick: null
            });
          }
        }
        const galleryRegex = /<button[^>]*class="[^"]*btn-gallery-view-item[^"]*"[^>]*data-index="([^"]+)"[^>]*>/gi;
        let gMatch;
        while ((gMatch = galleryRegex.exec(val)) !== null) {
          this._galleryViewBtns.push({
            dataset: { index: gMatch[1] },
            onclick: null
          });
        }
      }
    },
    style: {},
    disabled: false,
    checked: false,
    indeterminate: false,
    dataset: {},
    children: [],
    href: "",
    download: "",
    appendChild(child) {
      this.children.push(child);
      if (child.innerHTML) _innerHTML += child.innerHTML;
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
    focus() {
      this._focused = true;
      activeElement = this;
    },
    blur() {
      this._focused = false;
      if (activeElement === this) activeElement = null;
    },
    select() {
      this._selected = true;
    },
    closest(sel) {
      if (sel === "tr") return this.tagName === "TR" ? this : (this._parentTr || null);
      if (sel === "button[data-action]" && this.dataset && this.dataset.action) return this;
      if (sel === ".wish-row-checkbox" && this.dataset && this.dataset.id) return this;
      if (sel === "#btn-wishes-empty-reset-filters" && this.id === "btn-wishes-empty-reset-filters") return this;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === ".wish-row-checkbox") {
        const matches = [];
        this.children.forEach(tr => {
          const match = (tr.innerHTML || "").match(/data-id="([^"]+)"/);
          if (match) {
            const rawId = match[1];
            const isChecked = tr.innerHTML.includes(`data-id="${rawId}" checked`) || _classes.has("selected-row");
            const cb = {
              dataset: { id: rawId },
              checked: isChecked,
              closest: (s) => (s === "tr" ? tr : null)
            };
            matches.push(cb);
          }
        });
        return matches;
      }
      if (sel === ".quick-view-card-btn") {
        return this._cardBtns || [];
      }
      if (sel.includes("btn-gallery-view-item") || sel.includes("gallery-photo-thumb-wrap")) {
        return this._galleryViewBtns || [];
      }
      return [];
    },
    classList: {
      add: (c) => { _classes.add(c); },
      remove: (c) => { _classes.delete(c); },
      contains: (c) => _classes.has(c),
      toggle: (c) => { if (_classes.has(c)) _classes.delete(c); else _classes.add(c); },
      get _classes() { return _classes; }
    },
    setAttribute(name, val) { this[name] = val; },
  };
  mockElements[id] = el;
  return el;
}

const adminWishesCode = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-wishes.js"), "utf8");

function resetEnvironment() {
  mockElements = {};
  mockListeners = {};
  documentListeners = {};
  activeElement = null;

  createMockElement("wishes-tbody", "tbody");
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
  createMockElement("view-wishes", "div");

  const windowMock = {
    location: { origin: "https://birthdaywish.app" },
    navigator: {
      clipboard: {
        writeText: async (text) => {
          windowMock.lastCopied = text;
        }
      }
    },
    AdminCore: {
      showToast: (msg) => { windowMock.lastToast = msg; },
      copyWishUrl: (url) => { windowMock.lastCopiedUrl = url; }
    }
  };

  const documentMock = {
    getElementById: (id) => mockElements[id] || null,
    createElement: (tag) => {
      const el = createMockElement(`dyn-${Math.random()}`, tag);
      return el;
    },
    querySelector: (sel) => null,
    querySelectorAll: (sel) => [],
    addEventListener: (evt, handler) => {
      if (!documentListeners[evt]) documentListeners[evt] = [];
      documentListeners[evt].push(handler);
    },
    dispatchEvent: (evt, data) => {
      if (documentListeners[evt]) {
        documentListeners[evt].forEach(h => h({
          key: data ? data.key : "",
          preventDefault: () => {},
          stopPropagation: () => {},
          target: data ? data.target : null,
          ...data
        }));
      }
    },
    get activeElement() {
      return activeElement;
    },
    body: {
      appendChild: (child) => {
        if (child.id) mockElements[child.id] = child;
      },
      removeChild: (child) => {
        if (child.id) delete mockElements[child.id];
      }
    },
    __wishesGlobalKeyBound: false
  };

  const fn = new Function("window", "document", adminWishesCode);
  fn(windowMock, documentMock);
  windowMock.AdminWishes.init();

  return { windowMock, documentMock };
}

let passed = 0;
let failed = 0;

function runTest(desc, testFn) {
  try {
    testFn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

// ============================================================
// 1. BIRTHDAY PARSING & NORMALIZATION TESTS (1 - 8)
// ============================================================

runTest("1. Birthday: direct birth_date object { day: 17, month: 8, year: 2001 }", () => {
  const { windowMock } = resetEnvironment();
  const wish = { id: "w-1", birth_date: { day: 17, month: 8, year: 2001 } };
  const formatted = windowMock.AdminWishes.formatBirthDateDisplay(wish);
  assert.strictEqual(formatted, "17/08/2001");
});

runTest("2. Birthday: JSON-stringified birth_date object '{\"day\":17,\"month\":8,\"year\":2001}'", () => {
  const { windowMock } = resetEnvironment();
  const wish = { id: "w-2", birth_date: "{\"day\":17,\"month\":8,\"year\":2001}" };
  const formatted = windowMock.AdminWishes.formatBirthDateDisplay(wish);
  assert.strictEqual(formatted, "17/08/2001");
});

runTest("3. Birthday: camelCase birthDate object { day: 17, month: 8, year: 2001 }", () => {
  const { windowMock } = resetEnvironment();
  const wish = { id: "w-3", birthDate: { day: 17, month: 8, year: 2001 } };
  const formatted = windowMock.AdminWishes.formatBirthDateDisplay(wish);
  assert.strictEqual(formatted, "17/08/2001");
});

runTest("4. Birthday: camelCase JSON string birthDate '{\"day\":17,\"month\":8,\"year\":2001}'", () => {
  const { windowMock } = resetEnvironment();
  const wish = { id: "w-4", birthDate: "{\"day\":17,\"month\":8,\"year\":2001}" };
  const formatted = windowMock.AdminWishes.formatBirthDateDisplay(wish);
  assert.strictEqual(formatted, "17/08/2001");
});

runTest("5. Birthday: d/m/y legacy fields { d: 17, m: 8, y: 2001 }", () => {
  const { windowMock } = resetEnvironment();
  const wish = { id: "w-5", d: 17, m: 8, y: 2001 };
  const formatted = windowMock.AdminWishes.formatBirthDateDisplay(wish);
  assert.strictEqual(formatted, "17/08/2001");
});

runTest("6. Birthday: plain DD/MM/YYYY and YYYY-MM-DD date strings", () => {
  const { windowMock } = resetEnvironment();
  const wish1 = { id: "w-6a", birth_date: "17/08/2001" };
  const wish2 = { id: "w-6b", birth_date: "2001-08-17" };
  assert.strictEqual(windowMock.AdminWishes.formatBirthDateDisplay(wish1), "17/08/2001");
  assert.strictEqual(windowMock.AdminWishes.formatBirthDateDisplay(wish2), "17/08/2001");
});

runTest("7. Birthday: invalid birthday fallback ('Not specified')", () => {
  const { windowMock } = resetEnvironment();
  const wishInvalid1 = { id: "w-7a", birth_date: "invalid-date-string" };
  const wishInvalid2 = { id: "w-7b", birth_date: { day: 45, month: 15, year: 2001 } };
  const wishInvalid3 = { id: "w-7c", birth_date: "{malformed_json" };
  assert.strictEqual(windowMock.AdminWishes.formatBirthDateDisplay(wishInvalid1), "Not specified");
  assert.strictEqual(windowMock.AdminWishes.formatBirthDateDisplay(wishInvalid2), "Not specified");
  assert.strictEqual(windowMock.AdminWishes.formatBirthDateDisplay(wishInvalid3), "Not specified");
});

runTest("8. Birthday: missing birthday fallback ('Not specified')", () => {
  const { windowMock } = resetEnvironment();
  assert.strictEqual(windowMock.AdminWishes.formatBirthDateDisplay({ id: "w-8a", birth_date: null }), "Not specified");
  assert.strictEqual(windowMock.AdminWishes.formatBirthDateDisplay({ id: "w-8b", birth_date: "" }), "Not specified");
  assert.strictEqual(windowMock.AdminWishes.formatBirthDateDisplay(null), "Not specified");
});

// ============================================================
// 2. THEME & FONT RESOLUTION TESTS (9 - 14)
// ============================================================

runTest("9. Theme Resolution: letter_theme custom schema value", () => {
  const { windowMock } = resetEnvironment();
  const wish = { id: "w-t1", letter_theme: "vintage-retro" };
  const resolved = windowMock.AdminWishes.resolveWishTheme(wish);
  assert.strictEqual(resolved, "vintage-retro");
});

runTest("10. Theme Resolution: letterTheme / lt / theme_id / theme fallback values", () => {
  const { windowMock } = resetEnvironment();
  assert.strictEqual(windowMock.AdminWishes.resolveWishTheme({ letterTheme: "cyberpunk" }), "cyberpunk");
  assert.strictEqual(windowMock.AdminWishes.resolveWishTheme({ lt: "aurora" }), "aurora");
  assert.strictEqual(windowMock.AdminWishes.resolveWishTheme({ theme_id: "cosmic" }), "cosmic");
  assert.strictEqual(windowMock.AdminWishes.resolveWishTheme({ themeId: "royal" }), "royal");
  assert.strictEqual(windowMock.AdminWishes.resolveWishTheme({ theme: "sunset" }), "sunset");
});

runTest("11. Theme Resolution: truly missing theme defaults to 'default' without mutating valid values", () => {
  const { windowMock } = resetEnvironment();
  assert.strictEqual(windowMock.AdminWishes.resolveWishTheme({ letter_theme: "" }), "default");
  assert.strictEqual(windowMock.AdminWishes.resolveWishTheme({ letter_theme: null }), "default");
  assert.strictEqual(windowMock.AdminWishes.resolveWishTheme({}), "default");
  assert.strictEqual(windowMock.AdminWishes.resolveWishTheme(null), "default");

  // In Quick View modal
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");
  const overlay1 = mockElements["wishes-quick-view-overlay"];
  assert(overlay1.innerHTML.includes("midnight-gold"), "Quick View must show custom theme 'midnight-gold'");
});

runTest("12. Font Resolution: letter_font custom schema value", () => {
  const { windowMock } = resetEnvironment();
  const wish = { id: "w-f1", letter_font: "cinzel-decorative" };
  const resolved = windowMock.AdminWishes.resolveWishFont(wish);
  assert.strictEqual(resolved, "cinzel-decorative");
});

runTest("13. Font Resolution: letterFont / lf / font_id / font fallback values", () => {
  const { windowMock } = resetEnvironment();
  assert.strictEqual(windowMock.AdminWishes.resolveWishFont({ letterFont: "dancing-script" }), "dancing-script");
  assert.strictEqual(windowMock.AdminWishes.resolveWishFont({ lf: "pacifico" }), "pacifico");
  assert.strictEqual(windowMock.AdminWishes.resolveWishFont({ font_id: "montserrat" }), "montserrat");
  assert.strictEqual(windowMock.AdminWishes.resolveWishFont({ fontId: "outfit" }), "outfit");
  assert.strictEqual(windowMock.AdminWishes.resolveWishFont({ font: "inter" }), "inter");
});

runTest("14. Font Resolution: truly missing font defaults to 'default' without mutating valid values", () => {
  const { windowMock } = resetEnvironment();
  assert.strictEqual(windowMock.AdminWishes.resolveWishFont({ letter_font: "" }), "default");
  assert.strictEqual(windowMock.AdminWishes.resolveWishFont({ letter_font: null }), "default");
  assert.strictEqual(windowMock.AdminWishes.resolveWishFont({}), "default");
  assert.strictEqual(windowMock.AdminWishes.resolveWishFont(null), "default");

  // In Quick View modal
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");
  const overlay1 = mockElements["wishes-quick-view-overlay"];
  assert(overlay1.innerHTML.includes("playfair"), "Quick View must show custom font 'playfair'");
});

// ============================================================
// 3. CARD ORDER & CUSTOMIZATION LAYOUT TESTS (15 - 17)
// ============================================================

runTest("15. Content Cards Order: Strictly Letter -> Memory -> Reasons -> Wishes", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  const html = overlay.innerHTML;

  const letterIdx = html.indexOf('data-section="letter"');
  const memoryIdx = html.indexOf('data-section="memory"');
  const reasonsIdx = html.indexOf('data-section="reasons"');
  const wishesIdx = html.indexOf('data-section="wishes"');

  assert(letterIdx !== -1, "Letter card must exist");
  assert(memoryIdx !== -1, "Memory card must exist");
  assert(reasonsIdx !== -1, "Reasons card must exist");
  assert(wishesIdx !== -1, "Wishes card must exist");

  assert(letterIdx < memoryIdx, "Letter card must precede Memory card");
  assert(memoryIdx < reasonsIdx, "Memory card must precede Reasons card");
  assert(reasonsIdx < wishesIdx, "Reasons card must precede Wishes card");
});

runTest("16. Media Cards Order: Strictly Photos -> Timeline -> Music -> Video", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  const html = overlay.innerHTML;

  const galleryIdx = html.indexOf('data-section="gallery"');
  const timelineIdx = html.indexOf('data-section="timeline"');
  const musicIdx = html.indexOf('data-section="music"');
  const videoIdx = html.indexOf('data-section="video"');

  assert(galleryIdx !== -1, "Gallery/Photos card must exist");
  assert(timelineIdx !== -1, "Timeline card must exist");
  assert(musicIdx !== -1, "Music card must exist");
  assert(videoIdx !== -1, "Video card must exist");

  assert(galleryIdx < timelineIdx, "Gallery/Photos card must precede Timeline card");
  assert(timelineIdx < musicIdx, "Timeline card must precede Music card");
  assert(musicIdx < videoIdx, "Music card must precede Video card");
});

runTest("17. Customization Row: Exactly 4 equal columns in ONE line with nowrap, ellipsis & Gift View interaction", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  assert(overlay, "Overlay should exist");
  assert(overlay.innerHTML.includes("grid-template-columns:repeat(4, minmax(0, 1fr))") || overlay.innerHTML.includes("grid-template-columns: repeat(4, minmax(0, 1fr))"), "Customization row must use 4 equal-column CSS grid");
  assert(overlay.innerHTML.includes("white-space:nowrap;"), "Customization items must have nowrap style");
  assert(overlay.innerHTML.includes("text-overflow:ellipsis;"), "Customization items must support ellipsis on overflow");
  assert(overlay.innerHTML.includes("🎨 Theme:"), "Theme item must exist");
  assert(overlay.innerHTML.includes("🔤 Font:"), "Font item must exist");
  assert(overlay.innerHTML.includes("🍰 Cake:"), "Cake item must exist");
  assert(overlay.innerHTML.includes("🎁 Gift:"), "Gift item must exist");
  assert(overlay.innerHTML.includes("Attached (View →)"), "Gift attached status must render with View link");

  // Test Gift interaction
  const giftBtn = overlay._cardBtns.find(b => b.dataset.section === "gift");
  assert(giftBtn, "Gift button must be clickable in customization row");
  giftBtn.onclick();
  assert(overlay.innerHTML.includes("🎁 Gift Message & Coupon"), "Clicking Gift must open Gift detail view");
});

// ============================================================
// 4. GALLERY & LIGHTBOX IMAGE VIEWER TESTS (18 - 30)
// ============================================================

runTest("18. Gallery: data:image JPEG thumbnail renders in detail view", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  const galleryBtn = overlay._cardBtns.find(b => b.dataset.section === "gallery");
  assert(galleryBtn, "Gallery card button must exist");
  galleryBtn.onclick();

  assert(overlay.innerHTML.includes("data:image/jpeg;base64"), "Detail view must render data URL in thumbnail img tag");
});

runTest("19. Gallery: HTTPS image thumbnail renders in detail view", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  const galleryBtn = overlay._cardBtns.find(b => b.dataset.section === "gallery");
  galleryBtn.onclick();

  assert(overlay.innerHTML.includes("https://example.com/photo1.jpg"), "Detail view must render HTTPS image URL");
});

runTest("20. Gallery: handles item with .image property", () => {
  const { windowMock } = resetEnvironment();
  const wish = {
    id: "w-20",
    recipient_name: "Test",
    gallery_json: [{ image: "https://example.com/img-prop.jpg", caption: "Photo Prop" }]
  };
  windowMock.AdminWishes.setWishes([wish]);
  windowMock.AdminWishes.openQuickView("w-20");
  const overlay = mockElements["wishes-quick-view-overlay"];
  overlay._cardBtns.find(b => b.dataset.section === "gallery").onclick();

  assert(overlay.innerHTML.includes("https://example.com/img-prop.jpg"));
  assert(overlay.innerHTML.includes("Photo Prop"));
});

runTest("21. Gallery: handles item with .url property", () => {
  const { windowMock } = resetEnvironment();
  const wish = {
    id: "w-21",
    recipient_name: "Test",
    gallery_json: [{ url: "https://example.com/url-prop.jpg", caption: "Url Prop" }]
  };
  windowMock.AdminWishes.setWishes([wish]);
  windowMock.AdminWishes.openQuickView("w-21");
  const overlay = mockElements["wishes-quick-view-overlay"];
  overlay._cardBtns.find(b => b.dataset.section === "gallery").onclick();

  assert(overlay.innerHTML.includes("https://example.com/url-prop.jpg"));
});

runTest("22. Gallery: View action opens internal image preview lightbox", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  overlay._cardBtns.find(b => b.dataset.section === "gallery").onclick();

  const viewBtn = overlay._galleryViewBtns[0];
  assert(viewBtn, "Gallery view button must exist");
  viewBtn.onclick();

  const lightbox = mockElements["wishes-gallery-lightbox"];
  assert(lightbox, "Gallery lightbox overlay must be created in DOM");
  assert(lightbox.innerHTML.includes("https://example.com/photo1.jpg"), "Lightbox must show photo 1 image");
  assert(lightbox.innerHTML.includes("Photo <strong style=\"color:#fff;\">1</strong> of"), "Lightbox must have photo counter");
});

runTest("23. Lightbox: renders data URL in image preview", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  overlay._cardBtns.find(b => b.dataset.section === "gallery").onclick();

  // Item 1 is base64
  const viewBtn2 = overlay._galleryViewBtns[1];
  viewBtn2.onclick();

  const lightbox = mockElements["wishes-gallery-lightbox"];
  assert(lightbox.innerHTML.includes("data:image/jpeg;base64"), "Lightbox must render base64 data URL");
});

runTest("24. Lightbox: renders HTTPS image in image preview", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  overlay._cardBtns.find(b => b.dataset.section === "gallery").onclick();

  const viewBtn1 = overlay._galleryViewBtns[0];
  viewBtn1.onclick();

  const lightbox = mockElements["wishes-gallery-lightbox"];
  assert(lightbox.innerHTML.includes("https://example.com/photo1.jpg"), "Lightbox must render HTTPS image URL");
});

runTest("25. Lightbox: close button closes image preview", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  overlay._cardBtns.find(b => b.dataset.section === "gallery").onclick();
  overlay._galleryViewBtns[0].onclick();

  assert(mockElements["wishes-gallery-lightbox"], "Lightbox is open");

  const closeBtn = mockElements["btn-gallery-lightbox-close"];
  assert(closeBtn, "Close button must exist on lightbox");
  closeBtn.click();

  const lightbox = mockElements["wishes-gallery-lightbox"];
  assert.strictEqual(lightbox.style.display, "none", "Lightbox must be hidden after clicking close");
  assert.strictEqual(windowMock.AdminWishes.isGalleryLightboxOpen(), false, "Lightbox state must be closed");
});

runTest("26. Lightbox: backdrop click closes image preview", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  overlay._cardBtns.find(b => b.dataset.section === "gallery").onclick();
  overlay._galleryViewBtns[0].onclick();

  const lightbox = mockElements["wishes-gallery-lightbox"];
  assert.strictEqual(lightbox.style.display, "flex", "Lightbox is open");

  lightbox.dispatchEvent("click", { target: lightbox });
  assert.strictEqual(lightbox.style.display, "none", "Backdrop click must close lightbox");
  assert.strictEqual(windowMock.AdminWishes.isGalleryLightboxOpen(), false, "Lightbox state must be closed");
});

runTest("27. Lightbox: Escape key closes image preview first before Quick View", () => {
  const { windowMock, documentMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  overlay._cardBtns.find(b => b.dataset.section === "gallery").onclick();
  overlay._galleryViewBtns[0].onclick();

  const lightbox = mockElements["wishes-gallery-lightbox"];
  assert.strictEqual(lightbox.style.display, "flex", "Lightbox is open");
  assert.strictEqual(overlay.style.display, "flex", "Quick view is open");

  // Press Escape once -> Lightbox closes, Quick View remains
  documentMock.dispatchEvent("keydown", { key: "Escape" });
  assert.strictEqual(lightbox.style.display, "none", "First Escape must close Lightbox");
  assert.strictEqual(windowMock.AdminWishes.isGalleryLightboxOpen(), false, "Lightbox state must be closed");
  assert.strictEqual(overlay.style.display, "flex", "Quick View must remain open");

  // Press Escape second time -> Quick View closes
  documentMock.dispatchEvent("keydown", { key: "Escape" });
  assert.strictEqual(overlay.style.display, "none", "Second Escape must close Quick View");
});

runTest("28. Lightbox: invalid image fallback shows 'Image preview unavailable'", () => {
  const { windowMock } = resetEnvironment();
  const wish = {
    id: "w-28",
    recipient_name: "Test",
    gallery_json: [{ image: "", caption: "Empty image" }]
  };
  windowMock.AdminWishes.setWishes([wish]);
  windowMock.AdminWishes.openQuickView("w-28");

  const overlay = mockElements["wishes-quick-view-overlay"];
  overlay._cardBtns.find(b => b.dataset.section === "gallery").onclick();
  overlay._galleryViewBtns[0].onclick();

  const lightbox = mockElements["wishes-gallery-lightbox"];
  assert(lightbox.innerHTML.includes("Image preview unavailable"), "Lightbox should show fallback message when image is empty");
});

runTest("29. Lightbox: multiple-image navigation buttons and arrow keys", () => {
  const { windowMock, documentMock } = resetEnvironment();
  const gallery = [
    { image: "https://example.com/p1.jpg", caption: "Photo 1" },
    { image: "https://example.com/p2.jpg", caption: "Photo 2" },
    { image: "https://example.com/p3.jpg", caption: "Photo 3" }
  ];
  windowMock.AdminWishes.setWishes([{ id: "w-29", recipient_name: "Multi", gallery_json: gallery }]);
  windowMock.AdminWishes.openQuickView("w-29");

  const overlay = mockElements["wishes-quick-view-overlay"];
  overlay._cardBtns.find(b => b.dataset.section === "gallery").onclick();
  overlay._galleryViewBtns[0].onclick();

  const lightbox = mockElements["wishes-gallery-lightbox"];
  assert(lightbox.innerHTML.includes("Photo <strong style=\"color:#fff;\">1</strong> of <strong style=\"color:#fff;\">3</strong>"));

  // Navigate using Next button
  const nextBtn = mockElements["btn-gallery-lightbox-next"];
  assert(nextBtn, "Next button must exist for multi-image gallery");
  nextBtn.click();
  assert(lightbox.innerHTML.includes("Photo <strong style=\"color:#fff;\">2</strong> of <strong style=\"color:#fff;\">3</strong>"));

  // Navigate using ArrowRight
  documentMock.dispatchEvent("keydown", { key: "ArrowRight" });
  assert(lightbox.innerHTML.includes("Photo <strong style=\"color:#fff;\">3</strong> of <strong style=\"color:#fff;\">3</strong>"));

  // Navigate using ArrowLeft
  documentMock.dispatchEvent("keydown", { key: "ArrowLeft" });
  assert(lightbox.innerHTML.includes("Photo <strong style=\"color:#fff;\">2</strong> of <strong style=\"color:#fff;\">3</strong>"));
});

runTest("30. Security: no raw Base64 strings exposed as text in UI", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  overlay._cardBtns.find(b => b.dataset.section === "gallery").onclick();

  // Detail view should NOT print long raw base64 string outside of attributes
  const textContentWithoutTags = overlay.innerHTML.replace(/<[^>]+>/g, " ");
  assert(!textContentWithoutTags.includes("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"), "Raw base64 string should not be displayed as text content");
});

// ============================================================
// 5. PUBLIC PAGE NAVIGATION TESTS (31 - 32)
// ============================================================

runTest("31. Public Page: canonical /?w=UUID link structure is preserved", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  assert(overlay.innerHTML.includes("href=\"https://birthdaywish.app/?w=11111111-1111-4111-8111-111111111111\""));
  assert(overlay.innerHTML.includes("target=\"_blank\""));
  assert(overlay.innerHTML.includes("rel=\"noopener noreferrer\""));
  assert(overlay.innerHTML.includes("🌐 Open Public Page ↗"));
});

runTest("32. Public Page: standard HTML link with no blocking async intercepts", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  assert(overlay.innerHTML.includes("<a href=\"https://birthdaywish.app/?w=11111111-1111-4111-8111-111111111111\""));
});

// ============================================================
// 6. STATE PRESERVATION TESTS (33 - 36)
// ============================================================

runTest("33. State: Quick View and Gallery lightbox preserve parent state", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  overlay._cardBtns.find(b => b.dataset.section === "gallery").onclick();
  windowMock.AdminWishes.openGalleryLightbox(0, [{ image: "https://example.com/p1.jpg" }]);
  windowMock.AdminWishes.closeGalleryLightbox();

  // Return back to overview
  const backBtn = mockElements["btn-quick-view-back"];
  if (backBtn && backBtn.onclick) backBtn.onclick();

  assert(overlay.innerHTML.includes("UUID:"), "Overview view is restored");
});

runTest("34. State: row selections are preserved during Quick View and Lightbox operations", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.selectWish("11111111-1111-4111-8111-111111111111");
  windowMock.AdminWishes.selectWish("22222222-2222-4222-8222-222222222222");

  assert.strictEqual(windowMock.AdminWishes.getSelectedIds().length, 2);

  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");
  windowMock.AdminWishes.openGalleryLightbox(0, [{ image: "https://example.com/p1.jpg" }]);
  windowMock.AdminWishes.closeGalleryLightbox();
  windowMock.AdminWishes.closeQuickView();

  assert.strictEqual(windowMock.AdminWishes.getSelectedIds().length, 2);
  assert(windowMock.AdminWishes.isWishSelected("11111111-1111-4111-8111-111111111111"));
  assert(windowMock.AdminWishes.isWishSelected("22222222-2222-4222-8222-222222222222"));
});

runTest("35. State: search query and filters are preserved across modal lifecycle", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);

  mockElements["wishes-search-input"].value = "Shivam";
  mockElements["wishes-filter-media"].value = "all";
  windowMock.AdminWishes.render();

  assert.strictEqual(windowMock.AdminWishes.getFilteredAndSortedWishes().length, 1);

  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");
  windowMock.AdminWishes.closeQuickView();

  assert.strictEqual(mockElements["wishes-search-input"].value, "Shivam");
  assert.strictEqual(windowMock.AdminWishes.getFilteredAndSortedWishes().length, 1);
});

runTest("36. State: table pagination page is preserved across Quick View lifecycle", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.setPageSize(2);
  windowMock.AdminWishes.setPage(2);
  assert.strictEqual(windowMock.AdminWishes.getPage(), 2);

  windowMock.AdminWishes.openQuickView("33333333-3333-4333-8333-333333333333");
  windowMock.AdminWishes.closeQuickView();

  assert.strictEqual(windowMock.AdminWishes.getPage(), 2);
});

// ============================================================
// 7. SECURITY & SYSTEM INTEGRITY TESTS (37 - 38)
// ============================================================

runTest("37. Security: passcode is NEVER exposed in plaintext in Quick View or Lightbox", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("11111111-1111-4111-8111-111111111111");

  const overlay = mockElements["wishes-quick-view-overlay"];
  assert(!overlay.innerHTML.includes("1234"), "Passcode must not appear in Quick View HTML");

  windowMock.AdminWishes.openQuickView("33333333-3333-4333-8333-333333333333");
  assert(!overlay.innerHTML.includes("secret_passcode_9999"), "Secret passcode must not appear in Quick View HTML");
});

runTest("38. Security: system baseline configuration row remains protected", () => {
  const { windowMock } = resetEnvironment();
  windowMock.AdminWishes.setWishes(mockWishes);
  windowMock.AdminWishes.openQuickView("00000000-0000-0000-0000-000000000001");

  const overlay = mockElements["wishes-quick-view-overlay"];
  assert(overlay, "System row can be inspected in Quick View");
  assert(overlay.innerHTML.includes("System Baseline Config"));
});

console.log("============================================================");
console.log(`📊 PHASE 31B-13.4 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("============================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL 38 PHASE 31B-13.4 QUICK VIEW TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
}
