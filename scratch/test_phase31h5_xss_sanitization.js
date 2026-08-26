/**
 * ============================================================================
 * TEST: Phase 31H-5 Input & XSS Security Hardening (Isolated In-Memory Test)
 * ============================================================================
 * 
 * Safety Rules Enforced:
 * - ZERO Supabase writes or network calls
 * - ZERO storage mutations
 * - ZERO passkey mutations
 * - 100% in-memory / local DOM simulation
 * 
 * Test Coverage:
 * 1. Canonical escapeHtml() unit tests
 * 2. ensureLineHighlight() pre-highlight escaping + highlight preservation
 * 3. Public Reasons Grid XSS neutralization
 * 4. Public Gallery Deck XSS neutralization
 * 5. Public Timeline Section XSS neutralization
 * 6. Quick Editor Reasons input attribute breakout protection
 * 7. Quick Editor Timeline input attribute breakout protection
 * 8. Quick Editor Wishes textarea breakout protection
 * 9. Quick Editor Letter textarea breakout protection
 * 10. Quick Editor Gallery input attribute breakout protection
 * 11. Admin Audit Logs log.desc XSS neutralization
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("🛡️ Running Phase 31H-5 Input & XSS Security Hardening Tests (100% In-Memory Isolation)...");

global.requestAnimationFrame = (cb) => { cb(); };

// Setup isolated fake DOM environment
const mockWindow = {
  requestAnimationFrame: (cb) => { cb(); },
  document: {
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(),
        className: "",
        classList: {
          contains(c) { return false; },
          add(c) {},
          remove(c) {},
          toggle(c) {}
        },
        style: {
          setProperty(k, v) { this[k] = v; },
          display: ""
        },
        dataset: {},
        children: [],
        innerHTMLValue: "",
        textContentValue: "",
        value: "",
        attributes: {},
        setAttribute(k, v) { this.attributes[k] = v; },
        getAttribute(k) { return this.attributes[k]; },
        appendChild(child) {
          this.children.push(child);
          return child;
        },
        querySelector(selector) {
          return null;
        },
        querySelectorAll(selector) {
          return [];
        },
        addEventListener(evt, fn) {}
      };

      Object.defineProperty(el, "innerHTML", {
        get() { return this.innerHTMLValue; },
        set(val) {
          this.innerHTMLValue = String(val);
          // Very basic textContent approximation for test checks
          this.textContentValue = String(val).replace(/<[^>]*>/g, "");
        }
      });

      Object.defineProperty(el, "textContent", {
        get() { return this.textContentValue; },
        set(val) {
          this.textContentValue = String(val);
          this.innerHTMLValue = String(val);
        }
      });

      return el;
    },
    getElementById(id) {
      if (!this._elements[id]) {
        this._elements[id] = this.createElement("div");
        this._elements[id].id = id;
      }
      return this._elements[id];
    },
    querySelectorAll(sel) { return []; },
    _elements: {}
  }
};

// 1. Load and execute js/modules/utils.js in isolated scope
const utilsCode = fs.readFileSync(path.join(__dirname, "../js/modules/utils.js"), "utf8");
const utilsContext = { ...mockWindow };
const utilsFn = new Function("root", "window", "document", utilsCode);
utilsFn(utilsContext, utilsContext, utilsContext.document);

assert.strictEqual(typeof utilsContext.escapeHtml, "function", "escapeHtml should be exported on root/window");
assert.strictEqual(typeof utilsContext.ensureLineHighlight, "function", "ensureLineHighlight should be exported on root/window");

// Test 1: Canonical escapeHtml() unit tests
console.log("  [1/11] Testing canonical escapeHtml()...");
assert.strictEqual(utilsContext.escapeHtml(null), "");
assert.strictEqual(utilsContext.escapeHtml(undefined), "");
assert.strictEqual(utilsContext.escapeHtml("Hello World"), "Hello World");
assert.strictEqual(utilsContext.escapeHtml('<script>alert("XSS")</script>'), '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
assert.strictEqual(utilsContext.escapeHtml("Tom & Jerry's 'Party'"), "Tom &amp; Jerry&#039;s &#039;Party&#039;");
assert.strictEqual(utilsContext.escapeHtml("Special 💖 ✨ 🎈 🎂"), "Special 💖 ✨ 🎈 🎂", "Emojis must be preserved");

// Test 2: ensureLineHighlight() pre-highlight escaping + highlight preservation
console.log("  [2/11] Testing ensureLineHighlight() pre-highlight escaping...");
const normalLine = "I love everything you are.";
const highlightedNormal = utilsContext.ensureLineHighlight(normalLine);
assert.strictEqual(highlightedNormal, 'I love <span class="highlight">everything you are.</span>', "Normal phrase must receive highlight span");

const maliciousLine = 'Malicious <script>alert(1)</script> because of everything you are.';
const highlightedMalicious = utilsContext.ensureLineHighlight(maliciousLine);
assert.ok(!highlightedMalicious.includes("<script>"), "Must not contain raw <script> tag");
assert.ok(highlightedMalicious.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), "Must contain escaped script entities");
assert.ok(highlightedMalicious.includes('<span class="highlight">everything you are.</span>'), "Must preserve highlight span");

// Test 3: Public Reasons Grid XSS neutralization
console.log("  [3/11] Testing public Reasons Grid rendering...");
const renderersCode = fs.readFileSync(path.join(__dirname, "../js/modules/renderers.js"), "utf8");
const renderersContext = { ...utilsContext, CONFIG: {
  reasons: [
    { icon: '✨<img src=x onerror=alert(1)>', title: 'Why Special <script>alert(2)</script>', text: 'Description with "quotes" & <tags>' }
  ]
}};
const renderersFn = new Function("root", "window", "document", "CONFIG", renderersCode);
renderersFn(renderersContext, renderersContext, renderersContext.document, renderersContext.CONFIG);

const reasonsGrid = renderersContext.document.getElementById("reasons-grid");
renderersContext.renderReasonsGrid();
assert.ok(reasonsGrid.children.length > 0, "Reasons grid must render items");
const renderedReasonHtml = reasonsGrid.children[0].innerHTML;
assert.ok(!renderedReasonHtml.includes("<img src=x onerror=alert(1)>"), "Must escape reason icon");
assert.ok(!renderedReasonHtml.includes("<script>alert(2)</script>"), "Must escape reason title");
assert.ok(renderedReasonHtml.includes("&lt;script&gt;alert(2)&lt;/script&gt;"), "Must output escaped script entities");

// Test 4: Public Gallery Deck XSS neutralization
console.log("  [4/11] Testing public Gallery Deck rendering...");
renderersContext.CONFIG.gallery = [
  { image: 'https://example.com/pic.jpg" onmouseover="alert(1)', cap: 'Caption <svg onload=alert(2)>', secretNote: 'Secret Note <iframe src="javascript:alert(3)">' }
];
const galleryDeck = renderersContext.document.getElementById("gallery-deck");
renderersContext.renderGalleryDeck();
assert.ok(galleryDeck.children.length > 0, "Gallery deck must render items");
const renderedGalleryHtml = galleryDeck.children[0].innerHTML;
assert.ok(!renderedGalleryHtml.includes("<svg onload=alert(2)>"), "Must escape gallery caption");
assert.ok(!renderedGalleryHtml.includes('<iframe src="javascript:alert(3)">'), "Must escape gallery secret note");
assert.ok(renderedGalleryHtml.includes("&quot; onmouseover=&quot;"), "Must escape double quotes in image src");

// Test 5: Public Timeline Section XSS neutralization
console.log("  [5/11] Testing public Timeline Section rendering...");
renderersContext.CONFIG.timeline = [
  { date: '2024 <b onclick=alert(1)>', title: 'Milestone <script>alert(2)</script>', text: 'Desc <img src=x onerror=alert(3)>' }
];
const timelineWrap = renderersContext.document.getElementById("timeline-wrap");
renderersContext.renderTimelineSection();
assert.ok(timelineWrap.children.length > 0, "Timeline must render items");
const renderedTimelineHtml = timelineWrap.children[0].innerHTML;
assert.ok(!renderedTimelineHtml.includes("<script>alert(2)</script>"), "Must escape timeline title");
assert.ok(!renderedTimelineHtml.includes("<img src=x onerror=alert(3)>"), "Must escape timeline text");
assert.ok(renderedTimelineHtml.includes("&lt;script&gt;alert(2)&lt;/script&gt;"), "Must output escaped entities");

// Test 6: Quick Editor Reasons attribute breakout protection
console.log("  [6/11] Testing Quick Editor Reasons input generator...");
const editorReasonsCode = fs.readFileSync(path.join(__dirname, "../js/modules/editor/reasons.js"), "utf8");
const editorReasonsContext = { ...utilsContext, CONFIG: {
  reasons: [
    { icon: '✨', title: 'Test" onfocus="alert(1)" autofocus="', text: 'Desc" onclick="alert(2)' }
  ]
}};
const editorReasonsFn = new Function("root", "window", "document", editorReasonsCode);
editorReasonsFn(editorReasonsContext, editorReasonsContext, editorReasonsContext.document);

const reasonsContainer = editorReasonsContext.document.getElementById("reasons-inputs-container");
editorReasonsContext.renderReasonInputs();
assert.ok(reasonsContainer.children.length > 0, "Reasons inputs container must have children");
const renderedReasonInputHtml = reasonsContainer.children[0].innerHTML;
assert.ok(renderedReasonInputHtml.includes('value="Test&quot; onfocus=&quot;alert(1)&quot; autofocus=&quot;"'), "Must escape double quotes in input value attribute");

// Test 7: Quick Editor Timeline attribute breakout protection
console.log("  [7/11] Testing Quick Editor Timeline input generator...");
const editorTimelineCode = fs.readFileSync(path.join(__dirname, "../js/modules/editor/timeline.js"), "utf8");
const editorTimelineContext = { ...utilsContext, CONFIG: {
  timeline: [
    { icon: '⏳', date: 'Date" onblur="alert(1)', title: 'Title" onfocus="alert(2)', text: 'Text" onchange="alert(3)' }
  ]
}};
const editorTimelineFn = new Function("root", "window", "document", editorTimelineCode);
editorTimelineFn(editorTimelineContext, editorTimelineContext, editorTimelineContext.document);

const timelineContainer = editorTimelineContext.document.getElementById("timeline-inputs-container");
editorTimelineContext.renderTimelineInputs();
assert.ok(timelineContainer.children.length > 0, "Timeline inputs container must have children");
const renderedTimelineInputHtml = timelineContainer.children[0].innerHTML;
assert.ok(renderedTimelineInputHtml.includes('value="Title&quot; onfocus=&quot;alert(2)"'), "Must escape double quotes in title value attribute");

// Test 8: Quick Editor Wishes textarea breakout protection
console.log("  [8/11] Testing Quick Editor Wishes textarea generator...");
const editorWishesCode = fs.readFileSync(path.join(__dirname, "../js/modules/editor/wishes.js"), "utf8");
const editorWishesContext = { ...utilsContext, CONFIG: {
  wishes: [
    '</textarea><script>alert("XSS")</script>'
  ]
}};
const editorWishesFn = new Function("root", "window", "document", editorWishesCode);
editorWishesFn(editorWishesContext, editorWishesContext, editorWishesContext.document);

const wishesContainer = editorWishesContext.document.getElementById("wishes-inputs-container");
editorWishesContext.renderWishInputs();
assert.ok(wishesContainer.children.length > 0, "Wishes inputs container must have children");
const renderedWishInputHtml = wishesContainer.children[0].innerHTML;
assert.ok(!renderedWishInputHtml.includes('</textarea><script>'), "Must not contain raw unescaped textarea closing tag");
assert.ok(renderedWishInputHtml.includes('&lt;/textarea&gt;&lt;script&gt;'), "Must escape textarea content");

// Test 9: Quick Editor Letter textarea breakout protection
console.log("  [9/11] Testing Quick Editor Letter textarea generator...");
const editorLetterCode = fs.readFileSync(path.join(__dirname, "../js/modules/editor/letter.js"), "utf8");
const editorLetterContext = { ...utilsContext, CONFIG: {
  letterLines: [
    'Line with <span class="highlight">highlight</span> and </textarea><img src=x onerror=alert(1)>'
  ]
}};
const editorLetterFn = new Function("root", "window", "document", editorLetterCode);
editorLetterFn(editorLetterContext, editorLetterContext, editorLetterContext.document);

const letterContainer = editorLetterContext.document.getElementById("letter-inputs-container");
editorLetterContext.renderLetterInputs();
assert.ok(letterContainer.children.length > 0, "Letter inputs container must have children");
const renderedLetterInputHtml = letterContainer.children[0].innerHTML;
assert.ok(!renderedLetterInputHtml.includes('<img src=x'), "Must not contain executable img tag");
assert.ok(!renderedLetterInputHtml.includes('<span class="highlight">'), "Must strip span highlight tag in editor textarea");
assert.ok(!renderedLetterInputHtml.includes('</textarea><img'), "Must not contain raw unescaped textarea tag");

// Test 10: Quick Editor Gallery input attribute breakout protection
console.log("  [10/11] Testing Quick Editor Gallery input generator...");
const editorGalleryCode = fs.readFileSync(path.join(__dirname, "../js/modules/editor/gallery.js"), "utf8");
const editorGalleryContext = { ...utilsContext, CONFIG: {
  gallery: [
    { emoji: '📸', cap: 'Cap" onfocus="alert(1)', secretNote: 'Note" onclick="alert(2)', image: 'https://example.com/a.jpg" onmouseover="alert(3)' }
  ]
}};
const editorGalleryFn = new Function("root", "window", "document", editorGalleryCode);
editorGalleryFn(editorGalleryContext, editorGalleryContext, editorGalleryContext.document);

const galleryContainer = editorGalleryContext.document.getElementById("gallery-inputs-container");
editorGalleryContext.renderGalleryInputs();
assert.ok(galleryContainer.children.length > 0, "Gallery inputs container must have children");
const renderedGalleryInputHtml = galleryContainer.children[0].innerHTML;
assert.ok(renderedGalleryInputHtml.includes('value="Cap&quot; onfocus=&quot;alert(1)"'), "Must escape double quotes in caption value");
assert.ok(renderedGalleryInputHtml.includes('value="Note&quot; onclick=&quot;alert(2)"'), "Must escape double quotes in secret note value");

// Test 11: Admin Audit Logs log.desc XSS neutralization
console.log("  [11/11] Testing Admin Audit Logs table rendering...");
const adminLogsCode = fs.readFileSync(path.join(__dirname, "../js/admin/admin-logs.js"), "utf8");
const adminLogsContext = {
  ...utilsContext,
  localStorage: {
    getItem() {
      return JSON.stringify([
        { time: "2026-08-26T09:00:00Z", event: "WISH_CREATE", desc: 'Created wish for: <script>alert("XSS")</script>', status: "SUCCESS" }
      ]);
    },
    setItem() {}
  }
};
const adminLogsFn = new Function("window", "document", adminLogsCode);
adminLogsFn(adminLogsContext, adminLogsContext.document);

const logsTbody = adminLogsContext.document.getElementById("logs-tbody");
adminLogsContext.AdminLogs.render();
assert.ok(logsTbody.children.length > 0, "Logs tbody must have children");
const renderedLogHtml = logsTbody.children[0].innerHTML;
assert.ok(!renderedLogHtml.includes('<script>alert("XSS")</script>'), "Must not contain raw script tag in log description");
assert.ok(renderedLogHtml.includes('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'), "Must escape log description entities");

console.log("✅ ALL 11/11 Phase 31H-5 Input & XSS Hardening Tests PASSED (100% In-Memory Isolated)!");
