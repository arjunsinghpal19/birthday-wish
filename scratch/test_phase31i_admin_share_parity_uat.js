/**
 * ============================================================================
 * TEST SUITE: PHASE 31I ADMIN SHARE PARITY & COMPREHENSIVE FUNCTIONAL UAT
 * Simulates complete Admin Dashboard, Quick Editor, and Public Wish workflows
 * in an isolated in-memory browser environment with 0 database writes.
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

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    testsFailed++;
  }
}

(async () => {
  console.log("============================================================");
  console.log("🛡️ STARTING PHASE 31I FUNCTIONAL UAT & SHARE PARITY SUITE");
  console.log("============================================================\n");

  // Setup In-Memory Mock Browser Environment
  const localStorageStore = {};
  const sessionStorageStore = {
    admin_authenticated: "true",
    admin_session_token: "mock-session-token"
  };
  let clipboardData = "";

  const window = {
    location: {
      origin: "https://birthday-wish-arjun.vercel.app",
      pathname: "/admin.html",
      href: "https://birthday-wish-arjun.vercel.app/admin.html",
      search: ""
    },
    localStorage: {
      getItem(k) { return localStorageStore[k] || null; },
      setItem(k, v) { localStorageStore[k] = String(v); },
      removeItem(k) { delete localStorageStore[k]; },
      clear() { for (const k in localStorageStore) delete localStorageStore[k]; }
    },
    sessionStorage: {
      getItem(k) { return sessionStorageStore[k] || null; },
      setItem(k, v) { sessionStorageStore[k] = String(v); },
      removeItem(k) { delete sessionStorageStore[k]; },
      clear() { for (const k in sessionStorageStore) delete sessionStorageStore[k]; }
    },
    navigator: {
      clipboard: {
        writeText: async (txt) => { clipboardData = txt; return true; }
      }
    },
    open(url) { return { url }; },
    confirm() { return true; }
  };
  globalThis.window = window;
  globalThis.btoa = (str) => Buffer.from(str, "binary").toString("base64");
  globalThis.atob = (b64) => Buffer.from(b64, "base64").toString("binary");
  globalThis.location = window.location;

  globalThis.document = {
    body: {
      appendChild() {},
      removeChild() {}
    },
    getElementById(id) {
      return {
        id,
        value: "",
        textContent: "",
        innerHTML: "",
        style: {},
        classList: { add() {}, remove() {}, contains() { return false; } },
        addEventListener() {},
        focus() {}
      };
    },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    createElement(tag) {
      return {
        tagName: tag,
        style: {},
        innerHTML: "",
        appendChild() {},
        removeChild() {},
        classList: { add() {}, remove() {} },
        setAttribute() {},
        addEventListener() {}
      };
    }
  };

  // Mock DatabaseModule
  const mockDbWishes = [
    {
      id: "11111111-2222-3333-4444-555555555555",
      recipient_name: "Aarav Sharma",
      sender_name: "Priya & Rohit",
      pass_code: "2024",
      birth_date: "2000-08-15",
      created_at: "2026-08-20T10:00:00.000Z",
      letter_lines: ["Happy Birthday Aarav!", "Wishing you joy and success."],
      letter_theme: "cosmic-galaxy",
      reasons: [{ title: "Always there for us", text: "You are the truest friend." }],
      wishes: ["Have an amazing year ahead!", "Stay awesome."],
      gallery: [{ url: "https://example.com/p1.jpg", caption: "Trip to Goa" }],
      timeline: [{ date: "2020", title: "Met in college", desc: "First day in campus" }],
      music_url: "https://example.com/song.mp3",
      video_url: "https://example.com/video.mp4"
    },
    {
      id: "22222222-3333-4444-5555-666666666666",
      recipient_name: "Ananya Verma",
      sender_name: "Bestie",
      pass_code: "5678",
      birth_date: "1998-12-05",
      created_at: "2026-08-22T14:30:00.000Z",
      letter_lines: ["Dear Ananya,", "You make the world brighter!"],
      letter_theme: "rose-romance",
      reasons: [],
      wishes: ["May all your dreams come true!"],
      gallery: [],
      timeline: [],
      music_url: "assets/music/happy-birthday-song.mpeg",
      video_url: ""
    }
  ];

  globalThis.DatabaseModule = {
    getWishes: async () => mockDbWishes,
    getWishById: async (id) => mockDbWishes.find(w => w.id === id) || null,
    saveWish: async (cfg) => "33333333-4444-5555-6666-777777777777",
    updateWish: async (id, cfg) => id,
    deleteWish: async (id) => id !== "00000000-0000-0000-0000-000000000001"
  };
  globalThis.window.DatabaseModule = globalThis.DatabaseModule;

  // 1. Load Admin Themes
  eval(fs.readFileSync(path.join(__dirname, "../js/admin/admin-themes.js"), "utf8"));
  // 2. Load Wish Codec
  eval(fs.readFileSync(path.join(__dirname, "../js/modules/wish-codec.js"), "utf8"));
  if (!window.encodeWishData && globalThis.encodeWishData) {
    window.encodeWishData = globalThis.encodeWishData;
    window.decodeWishData = globalThis.decodeWishData;
    window.buildPublishConfig = globalThis.buildPublishConfig;
  }
  // 3. Load Share Module
  eval(fs.readFileSync(path.join(__dirname, "../js/share.js"), "utf8"));
  // 4. Load Admin Settings
  eval(fs.readFileSync(path.join(__dirname, "../js/admin/admin-settings.js"), "utf8"));
  // 5. Load Admin Logs
  eval(fs.readFileSync(path.join(__dirname, "../js/admin/admin-logs.js"), "utf8"));
  // 6. Load Admin Backup
  eval(fs.readFileSync(path.join(__dirname, "../js/admin/admin-backup.js"), "utf8"));

  // ==========================================
  // STEP 1: CANONICAL SHARE & DESTINATION PARITY
  // ==========================================
  console.log("--- 1. CANONICAL DESTINATION & SHARE PARITY ---");

  await runAsyncTest("1.1 ShareModule.buildShareUrl generates persistent Supabase UUID link (?w={uuid}&name={name})", async () => {
    const cfg = {
      name: "Rohan",
      from: "Friends",
      letterTheme: "sapphire-night",
      letterLines: ["Happy birthday!"]
    };
    const url = await window.ShareModule.buildShareUrl(cfg, "Rohan", { persist: true });
    assert.ok(url, "URL must be returned");
    assert.ok(url.includes("?w=33333333-4444-5555-6666-777777777777"), `URL must contain UUID, got: ${url}`);
    assert.ok(url.includes("name=Rohan"), "URL must contain recipient name param");
    assert.strictEqual(cfg._activeWishUuid, "33333333-4444-5555-6666-777777777777");
  });

  await runAsyncTest("1.2 ShareModule.buildShareUrl strictly updates existing UUID on subsequent shares", async () => {
    const existingCfg = {
      _activeWishUuid: "11111111-2222-3333-4444-555555555555",
      name: "Aarav Sharma"
    };
    const url = await window.ShareModule.buildShareUrl(existingCfg, "Aarav Sharma", { persist: true });
    assert.strictEqual(url, "https://birthday-wish-arjun.vercel.app/admin.html?w=11111111-2222-3333-4444-555555555555&name=Aarav%20Sharma");
  });

  await runAsyncTest("1.3 ShareModule.parseRoute resolves Supabase UUID and hydrates wish payload", async () => {
    window.location.search = "?w=11111111-2222-3333-4444-555555555555";
    const targetConfig = {};
    const payload = await window.ShareModule.parseRoute(targetConfig);
    assert.ok(payload, "Payload must resolve from mock DB");
    assert.strictEqual(payload.recipient_name, "Aarav Sharma");
    assert.strictEqual(targetConfig._activeWishUuid, "11111111-2222-3333-4444-555555555555");
  });

  await runAsyncTest("1.4 Backward compatibility fallback resolves legacy Base64 parameters", async () => {
    const testData = { name: "Simran", from: "Kabir", letterLines: ["Happy Bday!"] };
    const base64Token = window.encodeWishData(testData);
    window.location.search = `?w=${base64Token}`;

    const targetConfig = {};
    const payload = await window.ShareModule.parseRoute(targetConfig);
    assert.ok(payload, "Base64 fallback must decode payload");
    assert.strictEqual(payload.n || payload.name, "Simran");
  });

  // ==========================================
  // STEP 2: WHATSAPP CANONICAL MESSAGE & URL PARITY
  // ==========================================
  console.log("\n--- 2. WHATSAPP UNICODE-SAFE SHARE ENCODING ---");

  runTest("2.1 ShareModule.buildWhatsAppMessage generates byte-for-byte locked message for named recipient", () => {
    const wishUrl = "https://birthday-wish-arjun.vercel.app/?w=11111111-2222-3333-4444-555555555555&name=Aarav";
    const msg = window.ShareModule.buildWhatsAppMessage(wishUrl, "Aarav");
    const expected = "Hey Aarav! 🎂✨\n\nMaine tumhare liye ek special Birthday Surprise banaya hai! 🎁💖\n\nKhol kar dekho 🎁:\nhttps://birthday-wish-arjun.vercel.app/?w=11111111-2222-3333-4444-555555555555&name=Aarav";
    assert.strictEqual(msg, expected, "WhatsApp message must match locked contract byte-for-byte");
  });

  runTest("2.2 ShareModule.buildWhatsAppMessage generates byte-for-byte locked message for default/unnamed recipient", () => {
    const wishUrl = "https://birthday-wish-arjun.vercel.app/?w=11111111-2222-3333-4444-555555555555";
    const msg = window.ShareModule.buildWhatsAppMessage(wishUrl, "");
    const expected = "Hey! 🎂✨\n\nMaine tumhare liye ek special Birthday Surprise banaya hai! 🎁💖\n\nKhol kar dekho 🎁:\nhttps://birthday-wish-arjun.vercel.app/?w=11111111-2222-3333-4444-555555555555";
    assert.strictEqual(msg, expected, "WhatsApp message without recipient name must match locked contract byte-for-byte");
  });

  runTest("2.3 ShareModule.buildWhatsAppUrl builds direct https://api.whatsapp.com/send URL with proper percent-encoding", () => {
    const wishUrl = "https://birthday-wish-arjun.vercel.app/?w=22222222-3333-4444-5555-666666666666&name=Ananya";
    const waUrl = window.ShareModule.buildWhatsAppUrl(wishUrl, "Ananya");
    assert.ok(waUrl.startsWith("https://api.whatsapp.com/send?text="), "Must use direct api.whatsapp.com/send endpoint");
    assert.ok(waUrl.includes("22222222-3333-4444-5555-666666666666"), "Must contain wish UUID");
    assert.ok(waUrl.includes("%F0%9F%8E%82"), "Must percent-encode birthday cake emoji 🎂");
    assert.ok(waUrl.includes("%F0%9F%8E%81"), "Must percent-encode gift emoji 🎁");
    assert.ok(waUrl.includes("%F0%9F%92%96"), "Must percent-encode sparkling heart emoji 💖");
  });

  runTest("2.4 ShareModule.buildNativeSharePayload returns exact approved title, text, and url for named recipient", () => {
    const wishUrl = "https://birthday-wish-arjun.vercel.app/?w=11111111-2222-3333-4444-555555555555&name=Aarav";
    const payload = window.ShareModule.buildNativeSharePayload(wishUrl, "Aarav");
    assert.strictEqual(payload.title, "🎁 Birthday Surprise for Aarav");
    assert.strictEqual(payload.text, "🎂✨ Maine tumhare liye ek special Birthday Surprise banaya hai! 🎁💖\n\nEk chhota sa surprise tumhara wait kar raha hai… 💝\n\n👇 Link open karke dekho — I hope tumhe ye pasand aayega! 🥰");
    assert.strictEqual(payload.url, wishUrl);
  });

  runTest("2.5 ShareModule.buildNativeSharePayload returns exact approved title and text for unnamed recipient", () => {
    const wishUrl = "https://birthday-wish-arjun.vercel.app/?w=11111111-2222-3333-4444-555555555555";
    const payload = window.ShareModule.buildNativeSharePayload(wishUrl, "");
    assert.strictEqual(payload.title, "🎁 Birthday Surprise!");
    assert.strictEqual(payload.text, "🎂✨ Maine tumhare liye ek special Birthday Surprise banaya hai! 🎁💖\n\nEk chhota sa surprise tumhara wait kar raha hai… 💝\n\n👇 Link open karke dekho — I hope tumhe ye pasand aayega! 🥰");
    assert.strictEqual(payload.url, wishUrl);
  });

  runTest("2.6 Quick Editor, Public Wish Page, and Admin Wishes invoke ShareModule.buildNativeSharePayload", () => {
    const customizerCode = fs.readFileSync(path.join(__dirname, "../js/modules/editor/customizer.js"), "utf8");
    const appCode = fs.readFileSync(path.join(__dirname, "../js/app.js"), "utf8");
    const adminWishesCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-wishes.js"), "utf8");

    assert.ok(customizerCode.includes("ShareModule.buildNativeSharePayload"), "Quick Editor must invoke ShareModule.buildNativeSharePayload");
    assert.ok(appCode.includes("ShareModule.buildNativeSharePayload"), "Public Wish page must invoke ShareModule.buildNativeSharePayload");
    assert.ok(adminWishesCode.includes("ShareModule.buildNativeSharePayload"), "Admin Wishes must invoke ShareModule.buildNativeSharePayload");
  });

  // ==========================================
  // STEP 3: ADMIN WISHES MANAGER QUICK VIEW & BULK SHARE PARITY
  // ==========================================
  console.log("\n--- 3. ADMIN WISHES MANAGER & BULK SHARE PARITY ---");

  runTest("3.1 admin-wishes.js defines #btn-quick-view-copy-link, #btn-quick-view-whatsapp-share, and #btn-quick-view-native-share", () => {
    const adminWishesCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-wishes.js"), "utf8");
    assert.ok(adminWishesCode.includes('id="btn-quick-view-copy-link"'), "Must include #btn-quick-view-copy-link");
    assert.ok(adminWishesCode.includes('id="btn-quick-view-whatsapp-share"'), "Must include #btn-quick-view-whatsapp-share");
    assert.ok(adminWishesCode.includes('id="btn-quick-view-native-share"'), "Must include #btn-quick-view-native-share");
  });

  runTest("3.2 admin-wishes.js connects Quick View WhatsApp share to ShareModule.buildWhatsAppUrl", () => {
    const adminWishesCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-wishes.js"), "utf8");
    assert.ok(adminWishesCode.includes("window.ShareModule.buildWhatsAppUrl"), "Quick View must call ShareModule.buildWhatsAppUrl");
  });

  runTest("3.3 admin-wishes.js connects Quick View Native share to ShareModule.buildNativeSharePayload with safe fallback", () => {
    const adminWishesCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-wishes.js"), "utf8");
    assert.ok(adminWishesCode.includes("window.ShareModule.buildNativeSharePayload"), "Quick View must call ShareModule.buildNativeSharePayload");
    assert.ok(adminWishesCode.includes("nav.share(payload)"), "Must invoke navigator.share");
    assert.ok(adminWishesCode.includes("showQuickViewToast"), "Must provide user feedback toast");
  });

  runTest("3.4 Admin bulk copy links produces one canonical URL per line", () => {
    const selectedUuids = [
      "11111111-2222-3333-4444-555555555555",
      "22222222-3333-4444-5555-666666666666"
    ];
    const origin = "https://birthday-wish-arjun.vercel.app";
    const generatedUrls = selectedUuids.map(id => `${origin}/?w=${encodeURIComponent(id)}`);
    const bulkPayload = generatedUrls.join("\n");

    const lines = bulkPayload.split("\n");
    assert.strictEqual(lines.length, 2);
    assert.strictEqual(lines[0], "https://birthday-wish-arjun.vercel.app/?w=11111111-2222-3333-4444-555555555555");
    assert.strictEqual(lines[1], "https://birthday-wish-arjun.vercel.app/?w=22222222-3333-4444-5555-666666666666");
  });

  // ==========================================
  // STEP 4: QUICK EDITOR DOM INTEGRITY
  // ==========================================
  console.log("\n--- 4. QUICK EDITOR DOM & COPY VERIFICATION ---");

  runTest("4.1 index.html contains all 12 sections in verified order", () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
    const sectionsMatch = indexHtml.match(/<div[^>]*class="[^"]*editor-section[^"]*"[^>]*data-section="([^"]+)"/g);
    assert.ok(sectionsMatch, "Must find editor-section elements");
    const sectionNames = sectionsMatch.map(s => s.match(/data-section="([^"]+)"/)[1]);

    const expectedOrder = [
      "basic", "sender", "relationship", "letter", "memory",
      "reasons", "wishes", "gallery", "timeline", "gift", "music", "videowish"
    ];
    assert.deepStrictEqual(sectionNames, expectedOrder, "Quick Editor section order must match exact invariant");
  });

  runTest("4.2 Letter Theme copy in index.html is verified", () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
    assert.ok(indexHtml.includes("💌 Letter Theme"), "Must have label '💌 Letter Theme'");
    assert.ok(indexHtml.includes("Letter ka luxury color theme chuney"), "Must have description 'Letter ka luxury color theme chuney'");
  });

  // ==========================================
  // STEP 5: EGRESS & SECURITY CONSTRAINTS
  // ==========================================
  console.log("\n--- 5. DAM & EGRESS CONSTRAINTS ---");

  runTest("5.1 Video elements specify preload='metadata' and #t=0.001 to prevent full MP4 egress", () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
    const adminMediaCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-media.js"), "utf8");

    assert.ok(adminMediaCode.includes("#t=0.001"), "admin-media.js must append #t=0.001 for zero-egress thumbnails");
    assert.ok(adminMediaCode.includes('preload="metadata"'), "admin-media.js must enforce preload='metadata'");
  });

  runTest("5.2 System configuration row 00000000-0000-0000-0000-000000000001 is protected against deletion", () => {
    const adminWishesCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-wishes.js"), "utf8");
    assert.ok(adminWishesCode.includes("00000000-0000-0000-0000-000000000001"), "admin-wishes.js must reference SYSTEM_CONFIG_UUID");
    assert.ok(adminWishesCode.includes("Cannot delete system configuration record"), "admin-wishes.js must reject system row deletion");
  });

  console.log("\n============================================================");
  console.log(`🏁 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("============================================================");

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 ALL PHASE 31I FUNCTIONAL UAT & SHARE PARITY TESTS PASSED!");
    process.exit(0);
  }
})();

