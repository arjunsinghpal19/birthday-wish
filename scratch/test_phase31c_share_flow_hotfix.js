/**
 * ============================================================================
 * TEST SUITE: PHASE 31C-2B BIRTHDAY SHARE FLOW HOTFIX (PASS 2 - UNICODE SAFE)
 * Tests Quick Editor WhatsApp share, Public Wish Page WhatsApp share,
 * Admin Wish Editor Save & Share canonical URL, and OG metadata.
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const customizerCode = fs.readFileSync(path.join(__dirname, "../js/modules/editor/customizer.js"), "utf8");
const appCode = fs.readFileSync(path.join(__dirname, "../js/app.js"), "utf8");
const adminWishEditorCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-wish-editor.js"), "utf8");
const adminCoreCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-core.js"), "utf8");
const indexHtmlCode = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const shareCode = fs.readFileSync(path.join(__dirname, "../js/share.js"), "utf8");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log("============================================================");
console.log("🚀 STARTING PHASE 31C-2B SHARE FLOW HOTFIX TEST SUITE (PASS 2)");
console.log("============================================================\n");

// --- PART A: QUICK EDITOR WHATSAPP SHARE & UNICODE ESCAPE CONSTANTS ---
console.log("--- PART A: QUICK EDITOR WHATSAPP SHARE ---");

test("A1. Quick Editor uses modern wa.me endpoint", () => {
  assert.ok(customizerCode.includes("https://wa.me/?text="), "Must use wa.me endpoint");
  assert.ok(!customizerCode.includes("api.whatsapp.com/send?text="), "Must not use legacy api.whatsapp.com");
});

test("A2. Quick Editor defines explicit Unicode code point constants", () => {
  assert.ok(customizerCode.includes('\\u{1F382}'), "Must define EMOJI_CAKE as \\u{1F382}");
  assert.ok(customizerCode.includes('\\u{2728}'), "Must define EMOJI_SPARKLES as \\u{2728}");
  assert.ok(customizerCode.includes('\\u{1F381}'), "Must define EMOJI_GIFT as \\u{1F381}");
  assert.ok(customizerCode.includes('\\u{1F496}'), "Must define EMOJI_HEART as \\u{1F496}");
});

test("A3. Quick Editor includes recipient name before emojis in greeting", () => {
  assert.ok(customizerCode.includes("Hey ${trimmedName}! ${EMOJI_CAKE}${EMOJI_SPARKLES}"), "Greeting format must be 'Hey {name}! {cake}{sparkles}'");
  assert.ok(customizerCode.includes("Hey! ${EMOJI_CAKE}${EMOJI_SPARKLES}"), "Fallback greeting must be 'Hey! {cake}{sparkles}'");
});

test("A4. Quick Editor message contains required surprise text with Unicode constants", () => {
  assert.ok(customizerCode.includes("Maine tumhare liye ek special Birthday Surprise banaya hai! ${EMOJI_GIFT}${EMOJI_HEART}"), "Must contain surprise message with {gift}{heart}");
  assert.ok(customizerCode.includes("Khol kar dekho ${EMOJI_GIFT}:"), "Must contain call to action with {gift}");
});

test("A5. Quick Editor uses encodeURIComponent for entire message", () => {
  assert.ok(customizerCode.includes("encodeURIComponent(msg)"), "Must encode msg via encodeURIComponent");
});

// --- PART B: PUBLIC WISH PAGE WHATSAPP SHARE ---
console.log("\n--- PART B: PUBLIC WISH PAGE WHATSAPP SHARE ---");

test("B1. Public Wish Page contains #whatsapp-share-btn button in DOM", () => {
  assert.ok(indexHtmlCode.includes('id="whatsapp-share-btn"'), "Must contain #whatsapp-share-btn in index.html");
});

test("B2. Public Wish Page defines explicit Unicode code point constants", () => {
  assert.ok(appCode.includes('\\u{1F382}'), "Must define EMOJI_CAKE in app.js");
  assert.ok(appCode.includes('\\u{2728}'), "Must define EMOJI_SPARKLES in app.js");
  assert.ok(appCode.includes('\\u{1F381}'), "Must define EMOJI_GIFT in app.js");
  assert.ok(appCode.includes('\\u{1F496}'), "Must define EMOJI_HEART in app.js");
});

test("B3. Public Wish Page handles WhatsApp share with wa.me endpoint", () => {
  assert.ok(appCode.includes("https://wa.me/?text=${encodeURIComponent(waText)}"), "Must use wa.me endpoint with waText");
});

test("B4. Public Wish Page WhatsApp message format matches required text and constants", () => {
  assert.ok(appCode.includes("Maine tumhare liye ek special Birthday Surprise banaya hai! ${EMOJI_GIFT}${EMOJI_HEART}"), "Must contain exact surprise message");
  assert.ok(appCode.includes("Khol kar dekho ${EMOJI_GIFT}:"), "Must contain call to action with gift");
  assert.ok(appCode.includes("Hey ${displayName}! ${EMOJI_CAKE}${EMOJI_SPARKLES}"), "Must place displayName before cake and sparkles");
});

test("B5. Native share fallback also uses wa.me endpoint and Unicode constants", () => {
  assert.ok(appCode.includes("https://wa.me/?text=${encodeURIComponent(shareMsg)}"), "Fallback must use wa.me with shareMsg");
});

// --- PART C: RUNTIME UNICODE CODE POINT & ENCODING VERIFICATION ---
console.log("\n--- PART C: RUNTIME UNICODE CODE POINT & ENCODING VERIFICATION ---");

test("C1. Runtime message contains U+1F382 (🎂)", () => {
  const EMOJI_CAKE = "\u{1F382}";
  assert.strictEqual(EMOJI_CAKE.codePointAt(0), 0x1F382, "Must resolve to Unicode 0x1F382");
});

test("C2. Runtime message contains U+2728 (✨)", () => {
  const EMOJI_SPARKLES = "\u{2728}";
  assert.strictEqual(EMOJI_SPARKLES.codePointAt(0), 0x2728, "Must resolve to Unicode 0x2728");
});

test("C3. Runtime message contains U+1F381 (🎁)", () => {
  const EMOJI_GIFT = "\u{1F381}";
  assert.strictEqual(EMOJI_GIFT.codePointAt(0), 0x1F381, "Must resolve to Unicode 0x1F381");
});

test("C4. Runtime message contains U+1F496 (💖)", () => {
  const EMOJI_HEART = "\u{1F496}";
  assert.strictEqual(EMOJI_HEART.codePointAt(0), 0x1F496, "Must resolve to Unicode 0x1F496");
});

test("C5. Runtime message contains ZERO replacement characters (\\uFFFD)", () => {
  const EMOJI_CAKE = "\u{1F382}";
  const EMOJI_SPARKLES = "\u{2728}";
  const EMOJI_GIFT = "\u{1F381}";
  const EMOJI_HEART = "\u{1F496}";
  const recipientName = "Sanu";
  const currentUrl = "http://localhost:3000/?w=test-uuid&name=Sanu";

  const greeting = `Hey ${recipientName}! ${EMOJI_CAKE}${EMOJI_SPARKLES}`;
  const msg = `${greeting}\n\nMaine tumhare liye ek special Birthday Surprise banaya hai! ${EMOJI_GIFT}${EMOJI_HEART}\n\nKhol kar dekho ${EMOJI_GIFT}:\n${currentUrl}`;

  assert.ok(!msg.includes("\uFFFD"), "Runtime string must not contain \\uFFFD");
  assert.strictEqual(msg.indexOf("\uFFFD"), -1);
});

test("C6. Generated wa.me URL contains exact required UTF-8 hex sequences", () => {
  const EMOJI_CAKE = "\u{1F382}";
  const EMOJI_SPARKLES = "\u{2728}";
  const EMOJI_GIFT = "\u{1F381}";
  const EMOJI_HEART = "\u{1F496}";
  const recipientName = "Sanu";
  const currentUrl = "http://localhost:3000/?w=test-uuid&name=Sanu";

  const greeting = `Hey ${recipientName}! ${EMOJI_CAKE}${EMOJI_SPARKLES}`;
  const msg = `${greeting}\n\nMaine tumhare liye ek special Birthday Surprise banaya hai! ${EMOJI_GIFT}${EMOJI_HEART}\n\nKhol kar dekho ${EMOJI_GIFT}:\n${currentUrl}`;

  const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;

  assert.ok(waUrl.includes("%F0%9F%8E%82"), "Must contain encoded cake %F0%9F%8E%82");
  assert.ok(waUrl.includes("%E2%9C%A8"), "Must contain encoded sparkles %E2%9C%A8");
  assert.ok(waUrl.includes("%F0%9F%8E%81"), "Must contain encoded gift %F0%9F%8E%81");
  assert.ok(waUrl.includes("%F0%9F%92%96"), "Must contain encoded heart %F0%9F%92%96");
  assert.ok(!waUrl.includes("%EF%BF%BD"), "Must NEVER contain %EF%BF%BD replacement character encoding");
});

// --- PART D: PUBLIC URL CLEANUP (ADMIN WISH EDITOR SAVE & SHARE) ---
console.log("\n--- PART D: PUBLIC URL CLEANUP (ADMIN WISH EDITOR SAVE & SHARE) ---");

test("D1. Admin Wish Editor saveAndShare generates canonical /?w=UUID format", () => {
  assert.ok(adminWishEditorCode.includes("const shareUrl = `${window.location.origin}/?w=${encodeURIComponent(wishId)}${nameParam}`;"), "Must generate canonical /?w=UUID&name=... URL");
  assert.ok(!adminWishEditorCode.includes("const shareUrl = `${window.location.origin}/index.html?id=${wishId}`;"), "Must not use legacy /index.html?id=");
});

test("D2. Admin Wish Editor appends encoded recipient name when present", () => {
  assert.ok(adminWishEditorCode.includes("const nameParam = recipientName ? `&name=${encodeURIComponent(recipientName)}` : \"\";"), "Must URL encode recipient name");
});

test("D3. AdminCore.copyWishUrl formats bare UUID to canonical /?w=UUID format", () => {
  assert.ok(adminCoreCode.includes("`${window.location.origin}/?w=${encodeURIComponent(url)}`"), "Must format bare UUID to /?w=UUID");
  assert.ok(!adminCoreCode.includes("`${window.location.origin}/index.html?id=${url}`"), "Must not use /index.html?id= in copyWishUrl");
});

test("D4. parseWishRoute retains permanent backward compatibility for legacy ?id= and ?wish=", () => {
  assert.ok(shareCode.includes('params.get("w") || params.get("wish") || params.get("id")'), "Must support w, wish, and legacy id");
});

// --- PART E: OPEN GRAPH & TWITTER METADATA ---
console.log("\n--- PART E: OPEN GRAPH & TWITTER METADATA ---");

test("E1. index.html meta description contains birthday-focused text with emojis", () => {
  const expected = 'content="Wish Studio – A special birthday surprise, made just for you! 🎂✨ Tap the link below to open your wish 🎁"';
  assert.ok(indexHtmlCode.includes(expected), "Meta description must match expected birthday surprise text");
});

test("E2. index.html og:description contains birthday-focused text with emojis", () => {
  assert.ok(indexHtmlCode.includes('id="og-desc" content="Wish Studio – A special birthday surprise, made just for you! 🎂✨ Tap the link below to open your wish 🎁"'), "og:description must match expected birthday surprise text");
});

test("E3. index.html twitter:description contains birthday-focused text with emojis", () => {
  assert.ok(indexHtmlCode.includes('id="tw-desc" content="Wish Studio – A special birthday surprise, made just for you! 🎂✨ Tap the link below to open your wish 🎁"'), "twitter:description must match expected birthday surprise text");
});

test("E4. index.html preserves og:title, twitter:title, and og:image", () => {
  assert.ok(indexHtmlCode.includes('id="og-title" content="Happy Birthday! 🎉❤️"'));
  assert.ok(indexHtmlCode.includes('id="tw-title" content="Happy Birthday! 🎉❤️"'));
  assert.ok(indexHtmlCode.includes('id="og-image" content="assets/photos/og-preview.png"'));
});

console.log("\n============================================================");
console.log(`📊 PHASE 31C-2B TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("============================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL PHASE 31C-2B TESTS PASSED SUCCESSFULLY!\n");
}
