/**
 * ============================================================================
 * TEST SUITE: PHASE 31K — DASHBOARD CONTENT MIX, LINE CHART & CUSTOMERS PLACEHOLDER
 * (scratch/test_phase31k_content_mix_and_customers.js)
 * Tests:
 * 1. Content Mix Calculation from Canonical Wishes Schema Fields (gallery_json, video_url, music_url, letter_lines, pass_code)
 * 2. Empty, Null, Undefined, and Whitespace Handling Produces 0
 * 3. Gallery Items Inspection (Array of Objects, Strings, JSON strings vs Empty/Null)
 * 4. Letter Lines Inspection (Array of Strings, JSON strings vs Empty Arrays)
 * 5. Denominator Equals Total Active Wishes & Percentage Calculation Accuracy
 * 6. Line Chart SVG Rendering (Yellow/Gold Continuous Line, Subtle Nodes, Clean Line Chart)
 * 7. Customers Tab Compact Phase 32 Placeholder (Matching Plans/Coupons Pattern)
 * 8. Admin Sidebar Branding Displays "Wish Studio v2.0"
 * 9. Modularity & Invariant Preservation (File sizes < 35 KB, Quick Editor 12 sections, Share Contracts)
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ ${name}:`, err.message);
    failCount++;
  }
}

console.log("\n============================================================");
console.log("🧪 RUNNING PHASE 31K FINAL UI POLISH & ACCURACY TESTS");
console.log("============================================================\n");

// Read files
const adminHtml = fs.readFileSync(path.join(ROOT, "admin.html"), "utf8");
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const analyticsJs = fs.readFileSync(path.join(ROOT, "js/admin/admin-dashboard-analytics.js"), "utf8");
const customersJs = fs.readFileSync(path.join(ROOT, "js/admin/admin-customers.js"), "utf8");
const shareJs = fs.readFileSync(path.join(ROOT, "js/share.js"), "utf8");

// Load Analytics in VM
let mockChartContainer = { innerHTML: "" };
const sandbox = {
  window: {},
  document: {
    getElementById: (id) => {
      if (id === "dash-trend-chart-container") return mockChartContainer;
      return { innerHTML: "", style: {} };
    },
    querySelectorAll: () => []
  },
  navigator: {},
  console: console
};
vm.createContext(sandbox);
vm.runInContext(analyticsJs, sandbox);
const Analytics = sandbox.window.AdminDashboardAnalytics;

// TEST 1: Canonical Field Checking
test("1. Content Mix calculates correctly from canonical schema fields", () => {
  assert.ok(Analytics, "AdminDashboardAnalytics must be defined on window");
  assert.ok(typeof Analytics.calculateContentMix === "function", "calculateContentMix must be exported");

  const wishes = [
    {
      id: "w-1",
      recipient_name: "Aarav",
      gallery_json: [{ src: "photos/aarav1.jpg" }, { src: "photos/aarav2.jpg" }],
      video_url: "videos/memory.mp4",
      music_url: "audio/melody.mp3",
      letter_lines: ["Dear Aarav,", "Wishing you a wonderful birthday!"],
      pass_code: "9988"
    },
    {
      id: "w-2",
      recipient_name: "Diya",
      gallery_json: JSON.stringify([{ url: "photos/diya1.jpg" }]),
      video_url: "https://youtube.com/watch?v=123",
      music_url: "audio/track.mp3",
      letter_lines: JSON.stringify(["Happy Birthday Diya!"]),
      pass_code: "1234"
    },
    {
      id: "w-3",
      recipient_name: "Karan",
      gallery_json: [],
      video_url: "",
      music_url: "audio/bg.mp3",
      letter_lines: ["Best wishes!"],
      pass_code: ""
    },
    {
      id: "w-4",
      recipient_name: "Sneha",
      gallery_json: null,
      video_url: null,
      music_url: null,
      letter_lines: [],
      pass_code: null
    }
  ];

  const mix = Analytics.calculateContentMix(wishes);

  assert.strictEqual(mix.totalWishes, 4, "Total active wishes must be 4");
  assert.strictEqual(mix.photos.count, 2, "2 wishes contain photos (Aarav, Diya)");
  assert.strictEqual(mix.photos.pct, 50, "50% photos adoption");
  assert.strictEqual(mix.videos.count, 2, "2 wishes contain video (Aarav, Diya)");
  assert.strictEqual(mix.videos.pct, 50, "50% video adoption");
  assert.strictEqual(mix.audio.count, 3, "3 wishes contain audio (Aarav, Diya, Karan)");
  assert.strictEqual(mix.audio.pct, 75, "75% audio adoption");
  assert.strictEqual(mix.letters.count, 3, "3 wishes contain letters (Aarav, Diya, Karan)");
  assert.strictEqual(mix.letters.pct, 75, "75% letter adoption");
  assert.strictEqual(mix.passcode.count, 2, "2 wishes contain passcode (Aarav: 9988, Diya: 1234)");
  assert.strictEqual(mix.passcode.pct, 50, "50% passcode adoption");
});

// TEST 2: Empty, Null, and Whitespace Handling
test("2. Empty, null, undefined, and whitespace values return 0", () => {
  const emptyWishes = [
    {
      id: "empty-1",
      gallery_json: "",
      video_url: "   ",
      music_url: "",
      letter_lines: "   ",
      pass_code: "   "
    },
    {
      id: "empty-2",
      gallery_json: "[]",
      video_url: null,
      music_url: undefined,
      letter_lines: [],
      pass_code: null
    },
    {
      id: "empty-3",
      gallery_json: "{}",
      video_url: "",
      music_url: "   ",
      letter_lines: "[]",
      pass_code: ""
    }
  ];

  const mix = Analytics.calculateContentMix(emptyWishes);

  assert.strictEqual(mix.totalWishes, 3);
  assert.strictEqual(mix.photos.count, 0, "Photos count must be 0 for empty values");
  assert.strictEqual(mix.photos.pct, 0);
  assert.strictEqual(mix.videos.count, 0, "Videos count must be 0 for whitespace");
  assert.strictEqual(mix.videos.pct, 0);
  assert.strictEqual(mix.audio.count, 0, "Audio count must be 0 for empty");
  assert.strictEqual(mix.audio.pct, 0);
  assert.strictEqual(mix.letters.count, 0, "Letters count must be 0 for empty arrays");
  assert.strictEqual(mix.letters.pct, 0);
  assert.strictEqual(mix.passcode.count, 0, "Passcode count must be 0 for whitespace");
  assert.strictEqual(mix.passcode.pct, 0);
});

// TEST 3: Zero Active Wishes Graceful Handling
test("3. Handles 0 active wishes gracefully without NaN errors", () => {
  const mix = Analytics.calculateContentMix([]);

  assert.strictEqual(mix.totalWishes, 0);
  assert.strictEqual(mix.photos.count, 0);
  assert.strictEqual(mix.photos.pct, 0);
  assert.strictEqual(mix.videos.count, 0);
  assert.strictEqual(mix.videos.pct, 0);
  assert.strictEqual(mix.audio.count, 0);
  assert.strictEqual(mix.audio.pct, 0);
  assert.strictEqual(mix.letters.count, 0);
  assert.strictEqual(mix.letters.pct, 0);
  assert.strictEqual(mix.passcode.count, 0);
  assert.strictEqual(mix.passcode.pct, 0);
});

// TEST 4: Original Phase 31J-1 Trend Chart Structure (Straight Lines, Purple Gradient Area, Gold Stroke)
test("4. Line chart renders exact Phase 31J-1 SVG structure (straight lines, purple gradient, gold stroke)", () => {
  const wishes = [
    { id: "1", created_at: new Date().toISOString() },
    { id: "2", created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    { id: "3", created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() }
  ];

  Analytics.renderTrendChart(mockChartContainer, wishes, 7);
  const svgHtml = mockChartContainer.innerHTML;

  assert.ok(svgHtml.includes("<svg"), "Must render SVG element");
  assert.ok(svgHtml.includes('viewBox="0 0 600 200"'), "Must render 600x200 viewBox");
  assert.ok(svgHtml.includes('stroke="var(--gold, #ffd700)"'), "Must render primary gold stroke");
  assert.ok(svgHtml.includes('stroke-width="2.5"'), "Must have prominent 2.5 stroke width");
  assert.ok(svgHtml.includes("dashTrendGrad"), "Must include purple area gradient definition");
  assert.ok(svgHtml.includes('fill="url(#dashTrendGrad)"'), "Must fill area with dashTrendGrad");
  assert.ok(svgHtml.includes('class="dash-chart-node"'), "Must retain interactive chart nodes");
  assert.ok(svgHtml.includes('r="4.5"'), "Must retain 4.5 radius node circles");
  assert.ok(svgHtml.includes("Total created in period:"), "Must display bottom summary footer");
  assert.ok(svgHtml.includes("Peak daily volume:"), "Must display peak volume stat");

  // Verify pure straight line segments: contains ' L ' and NO cubic Bézier ' C ' commands
  const pathRegex = /<path\s+d="([^"]+)"\s+fill="none"\s+stroke="var\(--gold, #ffd700\)"\s+stroke-width="2\.5"/;
  const match = pathRegex.exec(svgHtml);
  assert.ok(match, "Must find primary line path element");
  const pathD = match[1];
  assert.ok(pathD.startsWith("M "), "Path must start with M");
  assert.ok(pathD.includes(" L "), "Path must use straight line segments L");
  assert.ok(!pathD.includes(" C "), "Path must NOT contain cubic Bézier smoothing C");
});

// TEST 5: Customers Tab Compact Phase 32 Placeholder
test("5. Customers tab displays compact Phase 32 placeholder matching Plans/Coupons pattern", () => {
  assert.ok(adminHtml.includes('id="view-customers"'), "admin.html must contain #view-customers");
  assert.ok(adminHtml.includes("coming-soon-banner"), "Must use standard .coming-soon-banner component");
  assert.ok(adminHtml.includes("Customer Management"), "Must have Customer Management title");
  assert.ok(adminHtml.includes("Customer Dashboard Architecture"), "Must have Customer Dashboard Architecture subtitle");
  assert.ok(adminHtml.includes("Phase 32 — Coming Soon"), "Must have Phase 32 — Coming Soon badge");
  assert.ok(adminHtml.includes("Customer accounts, profiles, wish ownership, and customer features will be introduced in a future release."), "Must have exact description");

  // Verify pseudo-customer elements are completely removed
  assert.ok(!adminHtml.includes('id="kpi-total-customers"'), "Must NOT contain old #kpi-total-customers");
  assert.ok(!adminHtml.includes('id="kpi-customer-total-wishes"'), "Must NOT contain old #kpi-customer-total-wishes");
  assert.ok(!adminHtml.includes('id="customers-tbody"'), "Must NOT contain old #customers-tbody");
  assert.ok(!adminHtml.includes("Unique Creators"), "Must NOT display 'Unique Creators'");
  assert.ok(!adminHtml.includes("Top Creator"), "Must NOT display 'Top Creator'");
});

// TEST 6: Admin Sidebar Branding Displays Wish Studio v2.0
test("6. Admin sidebar branding displays 'Wish Studio v2.0'", () => {
  assert.ok(adminHtml.includes("<span>Wish Studio v2.0</span>"), "Sidebar must contain 'Wish Studio v2.0'");
  assert.ok(!adminHtml.includes("<span>Wish Studio v2.5</span>"), "Sidebar must NOT contain 'Wish Studio v2.5'");
});

// TEST 7: AdminCustomers Module Clean Exports
test("7. AdminCustomers module exports clean placeholder interface", () => {
  const custContext = { window: {}, console: console };
  vm.createContext(custContext);
  vm.runInContext(customersJs, custContext);

  const AdminCustomers = custContext.window.AdminCustomers;
  assert.ok(AdminCustomers, "AdminCustomers must be defined on window");
  assert.ok(typeof AdminCustomers.init === "function", "init must be a function");
  assert.ok(typeof AdminCustomers.render === "function", "render must be a function");
  assert.strictEqual(AdminCustomers.isPlaceholder, true, "isPlaceholder must be true");
});

// TEST 8: Modularity & File Size Invariants (< 35 KB)
test("8. Modularity & File Size Invariant (< 35 KB) strictly maintained", () => {
  const analyticsSize = Buffer.byteLength(analyticsJs, "utf8");
  const customersSize = Buffer.byteLength(customersJs, "utf8");

  assert.ok(analyticsSize < 35840, `admin-dashboard-analytics.js (${analyticsSize} bytes) must be < 35 KB`);
  assert.ok(customersSize < 35840, `admin-customers.js (${customersSize} bytes) must be < 35 KB`);
});

// TEST 9: Quick Editor 12-Section Order & Letter Theme
test("9. Quick Editor 12 sections in verified order & Letter Theme copy preserved", () => {
  const sectionIds = [];
  const regex = /<div\s+class="editor-section"\s+data-section="([^"]+)"/g;
  let match;
  while ((match = regex.exec(indexHtml)) !== null) {
    sectionIds.push(match[1]);
  }

  const EXPECTED_SECTIONS = [
    "basic", "sender", "relationship", "letter",
    "memory", "reasons", "wishes", "gallery",
    "timeline", "gift", "music", "videowish"
  ];

  assert.deepStrictEqual(sectionIds, EXPECTED_SECTIONS, "Quick Editor section order must match exactly");
  assert.ok(indexHtml.includes("💌 Letter Theme"), "Letter Theme header copy must be preserved");
  assert.ok(indexHtml.includes("Letter ka luxury color theme chuney"), "Letter Theme subtitle copy must be preserved");
});

// TEST 10: ShareModule Locked WhatsApp & Native Share Contracts
test("10. ShareModule locked WhatsApp contract and Native Share payload preserved", () => {
  const shareContext = { window: {}, encodeURIComponent: encodeURIComponent };
  vm.createContext(shareContext);
  vm.runInContext(shareJs, shareContext);

  const ShareModule = shareContext.window.ShareModule;
  assert.ok(ShareModule, "ShareModule must be defined on window");

  const waMsg = ShareModule.buildWhatsAppMessage("https://example.com/?w=123&name=Pooja", "Pooja");
  const expectedWa = "Hey Pooja! 🎂✨\n\nMaine tumhare liye ek special Birthday Surprise banaya hai! 🎁💖\n\nKhol kar dekho 🎁:\nhttps://example.com/?w=123&name=Pooja";
  assert.strictEqual(waMsg, expectedWa, "WhatsApp message contract must match byte-for-byte");

  const nativePayload = ShareModule.buildNativeSharePayload("https://example.com/?w=123&name=Pooja", "Pooja");
  assert.strictEqual(nativePayload.title, "🎁 Birthday Surprise for Pooja", "Native share title must match exact contract");
  assert.ok(nativePayload.text.includes("Ek chhota sa surprise tumhara wait kar raha hai… 💝"), "Native share text must match exact contract");
  assert.strictEqual(nativePayload.url, "https://example.com/?w=123&name=Pooja", "Native share URL must match canonical URL");
});

console.log("\n============================================================");
console.log(`🏁 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log("============================================================\n");

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
