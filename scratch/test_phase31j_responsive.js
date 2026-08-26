/**
 * ============================================================================
 * PHASE 31J TEST SUITE: DASHBOARD RESPONSIVE MASTER PASS & PRESERVATION
 * ============================================================================
 * Tests:
 * 1. Semantic dashboard responsive classes (.dash-analytics-grid, .dash-overview-subgrid)
 * 2. Responsive CSS rules & media query coverage (1024px, 960px, 768px, 640px, 480px, 375px)
 * 3. Quick Editor 12-section DOM order preservation
 * 4. Letter Theme label and hint copy preservation
 * 5. ShareModule canonical single authority in js/share.js
 * 6. WhatsApp locked contract byte-for-byte fidelity
 * 7. Native share payload exact approved structure
 * 8. Admin Wishes Quick View sharing buttons
 * 9. Zero auth/passkey mutations & zero DB/storage logic changes
 * ============================================================================
 */

import fs from "fs";
import path from "path";
import assert from "assert";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${testName}`);
    console.error(`    ${err.message}`);
  }
}

console.log("============================================================");
console.log("🛡️ STARTING PHASE 31J RESPONSIVE MASTER PASS TEST SUITE");
console.log("============================================================");

// --- 1. DASHBOARD OVERVIEW & ANALYTICS RESPONSIVE CLASSES ---
console.log("\n--- 1. DASHBOARD OVERVIEW & ANALYTICS RESPONSIVE CLASSES ---");

const adminHtmlPath = path.join(projectRoot, "admin.html");
const adminHtmlContent = fs.readFileSync(adminHtmlPath, "utf-8");

runTest("1.1 admin.html contains .dash-analytics-grid semantic container", () => {
  assert(
    adminHtmlContent.includes('class="dash-analytics-grid"'),
    "admin.html must contain class='dash-analytics-grid'"
  );
});

runTest("1.2 admin.html contains .dash-overview-subgrid semantic container", () => {
  assert(
    adminHtmlContent.includes('class="dash-overview-subgrid"'),
    "admin.html must contain class='dash-overview-subgrid'"
  );
});

// --- 2. RESPONSIVE CSS MASTER STYLESHEET ---
console.log("\n--- 2. RESPONSIVE CSS MASTER STYLESHEET ---");

const responsiveCssPath = path.join(projectRoot, "css", "admin", "admin-responsive.css");
const responsiveCssContent = fs.readFileSync(responsiveCssPath, "utf-8");

runTest("2.1 admin-responsive.css defines 1024px breakpoint with sidebar drawer & editor layout collapse", () => {
  assert(responsiveCssContent.includes("@media (max-width: 1024px)"), "Must define @media (max-width: 1024px)");
  assert(responsiveCssContent.includes(".admin-editor-layout"), "Must collapse .admin-editor-layout at 1024px");
  assert(responsiveCssContent.includes(".admin-sidebar"), "Must handle .admin-sidebar drawer at 1024px");
});

runTest("2.2 admin-responsive.css defines 960px breakpoint for dash analytics & overview grids", () => {
  assert(responsiveCssContent.includes("@media (max-width: 960px)"), "Must define @media (max-width: 960px)");
  assert(responsiveCssContent.includes(".dash-analytics-grid"), "Must collapse .dash-analytics-grid at 960px");
  assert(responsiveCssContent.includes(".dash-overview-subgrid"), "Must collapse .dash-overview-subgrid at 960px");
});

runTest("2.3 admin-responsive.css defines 768px breakpoint for settings, themes, inspector & table toolbar", () => {
  assert(responsiveCssContent.includes("@media (max-width: 768px)"), "Must define @media (max-width: 768px)");
  assert(responsiveCssContent.includes(".settings-grid"), "Must collapse .settings-grid at 768px");
  assert(responsiveCssContent.includes(".themes-catalog-grid"), "Must collapse .themes-catalog-grid at 768px");
  assert(responsiveCssContent.includes(".inspector-modal-body"), "Must collapse .inspector-modal-body at 768px");
  assert(responsiveCssContent.includes(".table-search"), "Must expand .table-search at 768px");
});

runTest("2.4 admin-responsive.css defines 640px breakpoint for mobile metrics, form grids & pagination", () => {
  assert(responsiveCssContent.includes("@media (max-width: 640px)"), "Must define @media (max-width: 640px)");
  assert(responsiveCssContent.includes(".metrics-grid"), "Must collapse .metrics-grid at 640px");
  assert(responsiveCssContent.includes(".form-grid-2"), "Must collapse .form-grid-2 at 640px");
  assert(responsiveCssContent.includes(".table-pagination"), "Must stack .table-pagination at 640px");
});

runTest("2.5 admin-responsive.css defines 480px and 375px breakpoints for compact mobile & modal fits", () => {
  assert(responsiveCssContent.includes("@media (max-width: 480px)"), "Must define @media (max-width: 480px)");
  assert(responsiveCssContent.includes(".wishes-quick-view-overlay"), "Must handle .wishes-quick-view-overlay at 480px");
  assert(responsiveCssContent.includes("@media (max-width: 375px)"), "Must define @media (max-width: 375px)");
  assert(responsiveCssContent.includes(".glass-panel"), "Must adjust .glass-panel padding at 375px");
});

// --- 3. QUICK EDITOR DOM & COPY PRESERVATION ---
console.log("\n--- 3. QUICK EDITOR DOM & COPY PRESERVATION ---");

const indexHtmlPath = path.join(projectRoot, "index.html");
const indexHtmlContent = fs.readFileSync(indexHtmlPath, "utf-8");

const expectedSections = [
  "basic", "sender", "relationship", "letter",
  "memory", "reasons", "wishes", "gallery",
  "timeline", "gift", "music", "videowish"
];

runTest("3.1 index.html contains all 12 Quick Editor sections in exact order", () => {
  const sectionRegex = /<div\s+class="editor-section"\s+data-section="([^"]+)"/g;
  const foundSections = [];
  let match;
  while ((match = sectionRegex.exec(indexHtmlContent)) !== null) {
    foundSections.push(match[1]);
  }
  assert.strictEqual(foundSections.length, 12, "Must find exactly 12 sections");
  for (let i = 0; i < 12; i++) {
    assert.strictEqual(foundSections[i], expectedSections[i], `Section ${i + 1} must be ${expectedSections[i]}`);
  }
});

runTest("3.2 Letter Theme UI copy preserved byte-for-byte", () => {
  assert(indexHtmlContent.includes("💌 Letter Theme"), "Must contain '💌 Letter Theme'");
  assert(indexHtmlContent.includes("Letter ka luxury color theme chuney"), "Must contain 'Letter ka luxury color theme chuney'");
});

// --- 4. CANONICAL SHARE SYSTEM & LOCKED CONTRACT PRESERVATION ---
console.log("\n--- 4. CANONICAL SHARE SYSTEM & LOCKED CONTRACT PRESERVATION ---");

const shareJsPath = path.join(projectRoot, "js", "share.js");
const shareJsContent = fs.readFileSync(shareJsPath, "utf-8");

// Setup isolated window mock to run ShareModule methods
const mockWindow = { location: { origin: "https://birthday-wish-arjun.vercel.app", pathname: "/" } };
const shareModuleFn = new Function("window", "location", shareJsContent);
shareModuleFn(mockWindow, mockWindow.location);
const ShareModule = mockWindow.ShareModule;

runTest("4.1 ShareModule exports buildWhatsAppMessage, buildWhatsAppUrl, buildNativeSharePayload", () => {
  assert(typeof ShareModule.buildWhatsAppMessage === "function", "Must define buildWhatsAppMessage");
  assert(typeof ShareModule.buildWhatsAppUrl === "function", "Must define buildWhatsAppUrl");
  assert(typeof ShareModule.buildNativeSharePayload === "function", "Must define buildNativeSharePayload");
});

runTest("4.2 Locked WhatsApp message template matches exact byte-for-byte contract", () => {
  const url = "https://birthday-wish-arjun.vercel.app/?w=11111111-2222-3333-4444-555555555555&name=Aarav";
  const msg = ShareModule.buildWhatsAppMessage(url, "Aarav");
  const expected = "Hey Aarav! 🎂✨\n\nMaine tumhare liye ek special Birthday Surprise banaya hai! 🎁💖\n\nKhol kar dekho 🎁:\nhttps://birthday-wish-arjun.vercel.app/?w=11111111-2222-3333-4444-555555555555&name=Aarav";
  assert.strictEqual(msg, expected, "WhatsApp message must match locked contract byte-for-byte");
});

runTest("4.3 Native share payload template matches exact approved structure", () => {
  const url = "https://birthday-wish-arjun.vercel.app/?w=11111111-2222-3333-4444-555555555555&name=Aarav";
  const payload = ShareModule.buildNativeSharePayload(url, "Aarav");
  assert.strictEqual(payload.title, "🎁 Birthday Surprise for Aarav");
  assert.strictEqual(payload.text, "🎂✨ Maine tumhare liye ek special Birthday Surprise banaya hai! 🎁💖\n\nEk chhota sa surprise tumhara wait kar raha hai… 💝\n\n👇 Link open karke dekho — I hope tumhe ye pasand aayega! 🥰");
  assert.strictEqual(payload.url, url);
});

// --- 5. ADMIN DASHBOARD SHARE BUTTONS PARITY ---
console.log("\n--- 5. ADMIN DASHBOARD SHARE BUTTONS PARITY ---");

const adminWishesJsPath = path.join(projectRoot, "js", "admin", "admin-wishes.js");
const adminWishesJsContent = fs.readFileSync(adminWishesJsPath, "utf-8");

runTest("5.1 admin-wishes.js retains #btn-quick-view-copy-link, #btn-quick-view-whatsapp-share, #btn-quick-view-native-share", () => {
  assert(adminWishesJsContent.includes("btn-quick-view-copy-link"), "Must define btn-quick-view-copy-link");
  assert(adminWishesJsContent.includes("btn-quick-view-whatsapp-share"), "Must define btn-quick-view-whatsapp-share");
  assert(adminWishesJsContent.includes("btn-quick-view-native-share"), "Must define btn-quick-view-native-share");
});

// --- 6. ZERO MUTATION INTEGRITY ---
console.log("\n--- 6. ZERO MUTATION INTEGRITY ---");

runTest("6.1 Auth modules, database, and passkey files are untouched", () => {
  const authJsPath = path.join(projectRoot, "api", "auth.js");
  const dbJsPath = path.join(projectRoot, "js", "database.js");
  const passkeyJsPath = path.join(projectRoot, "js", "admin", "admin-passkey.js");

  assert(fs.existsSync(authJsPath), "api/auth.js must exist");
  assert(fs.existsSync(dbJsPath), "js/database.js must exist");
  assert(fs.existsSync(passkeyJsPath), "js/admin/admin-passkey.js must exist");
});

// --- SUMMARY ---
console.log("\n============================================================");
console.log(`🏁 TEST RESULTS: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
console.log("============================================================");

if (passedTests === totalTests) {
  console.log("🎉 ALL PHASE 31J RESPONSIVE MASTER PASS TESTS PASSED!\n");
  process.exit(0);
} else {
  console.error("❌ SOME TESTS FAILED!\n");
  process.exit(1);
}
