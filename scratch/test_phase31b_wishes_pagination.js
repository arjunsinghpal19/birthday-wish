/**
 * ============================================================================
 * PHASE 31B-3: WISHES TABLE PAGINATION & PAGE SIZE CONTROLS TEST SUITE
 * Validates in-memory slicing, page size selection, page navigation, auto-reset,
 * page clamping, count badge range formatting, full pipeline integration,
 * action button targeting, and network efficiency.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('============================================================');
console.log('📄 STARTING PHASE 31B-3 WISHES TABLE PAGINATION TEST SUITE');
console.log('============================================================');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    failedTests++;
  }
}

// Helper to create a lightweight mock DOM element
function createMockElement(id, tagName = 'div') {
  let _html = '';
  let _children = [];
  const el = {
    id,
    tagName: tagName.toUpperCase(),
    value: '',
    textContent: '',
    get innerHTML() { return _html; },
    set innerHTML(val) {
      _html = val;
      if (val === '') {
        _children = [];
      }
    },
    get _children() { return _children; },
    style: {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); }
    },
    attributes: {},
    dataset: {},
    disabled: false,
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k]; },
    removeAttribute(k) { delete this.attributes[k]; },
    addEventListener(evt, cb) {
      if (!this._listeners) this._listeners = {};
      if (!this._listeners[evt]) this._listeners[evt] = [];
      this._listeners[evt].push(cb);
    },
    dispatchEvent(evt) {
      if (this._listeners && this._listeners[evt.type]) {
        this._listeners[evt.type].forEach(cb => cb(evt));
      }
    },
    focus() {},
    querySelector(sel) { return null; },
    querySelectorAll(sel) { return []; },
    closest(sel) { return null; },
    appendChild(child) {
      _children.push(child);
      return child;
    }
  };
  return el;
}

// Generate 15 sample wishes with varying properties for comprehensive pagination testing
const sample15Wishes = Array.from({ length: 15 }, (_, i) => {
  const num = i + 1;
  const pad = String(num).padStart(2, '0');
  const d = new Date(Date.now() - (15 - num) * 86400000); // spread across 15 days
  return {
    id: `wish-uuid-${pad}-4a5b-8c9d-0e1f2a3b4c5d`,
    recipient_name: `Recipient ${String.fromCharCode(65 + (i % 5))} ${pad}`, // Recipient A, B, C, D, E
    sender_name: `Sender ${String.fromCharCode(90 - (i % 5))} ${pad}`,     // Sender Z, Y, X, W, V
    passcode: `pass-${pad}`,
    created_at: d.toISOString(),
    music_url: num % 2 === 0 ? `https://example.com/audio${pad}.mp3` : null,
    video_url: num % 3 === 0 ? `https://youtube.com/watch?v=vid${pad}` : null,
    gallery_json: num % 4 === 0 ? JSON.stringify([{ image: `https://example.com/p${pad}.jpg` }]) : '[]'
  };
});

// Setup mock global environment
function setupEnvironment() {
  const elements = {
    'wishes-tbody': createMockElement('wishes-tbody', 'tbody'),
    'wishes-search-input': createMockElement('wishes-search-input', 'input'),
    'btn-wishes-search-clear': createMockElement('btn-wishes-search-clear', 'button'),
    'wishes-sort-select': createMockElement('wishes-sort-select', 'select'),
    'wishes-filter-media': createMockElement('wishes-filter-media', 'select'),
    'wishes-filter-date': createMockElement('wishes-filter-date', 'select'),
    'wishes-count-badge': createMockElement('wishes-count-badge', 'div'),
    'wishes-page-size': createMockElement('wishes-page-size', 'select'),
    'btn-wishes-prev-page': createMockElement('btn-wishes-prev-page', 'button'),
    'btn-wishes-next-page': createMockElement('btn-wishes-next-page', 'button'),
    'wishes-page-info': createMockElement('wishes-page-info', 'span'),
    'wishes-pagination-container': createMockElement('wishes-pagination-container', 'div'),
    'sort-icon-recipient': createMockElement('sort-icon-recipient', 'span'),
    'sort-icon-sender': createMockElement('sort-icon-sender', 'span'),
    'sort-icon-created': createMockElement('sort-icon-created', 'span')
  };

  const tableThead = createMockElement('table-thead', 'thead');

  const doc = {
    getElementById(id) {
      return elements[id] || null;
    },
    querySelector(sel) {
      if (sel.includes('thead')) return tableThead;
      return null;
    },
    querySelectorAll(sel) {
      return [];
    },
    createElement(tag) {
      return createMockElement(`dyn-${Date.now()}-${Math.random()}`, tag);
    }
  };

  const win = {
    document: doc,
    location: { origin: 'http://localhost:3000' },
    AdminDashboard: {
      escapeHtml(s) { return String(s || ''); }
    },
    AdminCore: {
      showToast(msg) {},
      copyWishUrl(url) {}
    },
    DatabaseModule: {
      deleteWish: async (id) => ({ success: true }),
      duplicateWish: async (id) => ({ success: true, newId: `dup-${id}` })
    }
  };

  // Load admin-wishes.js into mock window
  const code = fs.readFileSync(path.resolve(__dirname, '../js/admin/admin-wishes.js'), 'utf8');
  const fn = new Function('window', 'document', code);
  fn(win, doc);

  return { win, doc, elements };
}

// ============================================================
// TESTS
// ============================================================

test('1. API Exports: AdminWishes exports getPage, setPage, getPageSize, setPageSize, getTotalPages', () => {
  const { win } = setupEnvironment();
  assert.strictEqual(typeof win.AdminWishes.getPage, 'function', 'getPage must be a function');
  assert.strictEqual(typeof win.AdminWishes.setPage, 'function', 'setPage must be a function');
  assert.strictEqual(typeof win.AdminWishes.getPageSize, 'function', 'getPageSize must be a function');
  assert.strictEqual(typeof win.AdminWishes.setPageSize, 'function', 'setPageSize must be a function');
  assert.strictEqual(typeof win.AdminWishes.getTotalPages, 'function', 'getTotalPages must be a function');
  assert.strictEqual(typeof win.AdminWishes.getFilteredAndSortedWishes, 'function', 'getFilteredAndSortedWishes must be a function');
});

test('2. Default Pagination State: Initial load defaults to page 1, pageSize 10', () => {
  const { win } = setupEnvironment();
  win.AdminWishes.setWishes(sample15Wishes);
  assert.strictEqual(win.AdminWishes.getPage(), 1, 'Default page must be 1');
  assert.strictEqual(win.AdminWishes.getPageSize(), 10, 'Default pageSize must be 10');
  assert.strictEqual(win.AdminWishes.getTotalPages(), 2, '15 items with pageSize 10 yields 2 total pages');
});

test('3. Page Slicing (PageSize = 5): 15 items yield 3 pages of exactly 5 items each', () => {
  const { win } = setupEnvironment();
  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize(5);

  assert.strictEqual(win.AdminWishes.getTotalPages(), 3, 'Total pages must be 3');

  // Page 1
  win.AdminWishes.setPage(1);
  const p1 = win.AdminWishes.getProcessedWishes();
  assert.strictEqual(p1.length, 5, 'Page 1 must contain 5 items');

  // Page 2
  win.AdminWishes.setPage(2);
  const p2 = win.AdminWishes.getProcessedWishes();
  assert.strictEqual(p2.length, 5, 'Page 2 must contain 5 items');

  // Page 3
  win.AdminWishes.setPage(3);
  const p3 = win.AdminWishes.getProcessedWishes();
  assert.strictEqual(p3.length, 5, 'Page 3 must contain 5 items');

  // Verify non-overlapping items
  const allIds = [...p1, ...p2, ...p3].map(w => w.id);
  const uniqueIds = new Set(allIds);
  assert.strictEqual(uniqueIds.size, 15, 'All 15 items across 3 pages must be distinct');
});

test('4. Page Size = "all": Returns all 15 items on a single page', () => {
  const { win, elements } = setupEnvironment();
  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize('all');

  assert.strictEqual(win.AdminWishes.getPageSize(), 'all', 'PageSize must be "all"');
  assert.strictEqual(win.AdminWishes.getTotalPages(), 1, 'Total pages must be 1');

  const processed = win.AdminWishes.getProcessedWishes();
  assert.strictEqual(processed.length, 15, 'All 15 items must be returned');
  assert.strictEqual(elements['wishes-page-info'].textContent, 'Page 1 of 1');
  assert.strictEqual(elements['btn-wishes-prev-page'].disabled, true, 'Prev must be disabled on single page');
  assert.strictEqual(elements['btn-wishes-next-page'].disabled, true, 'Next must be disabled on single page');
});

test('5. Navigation: Next and Prev buttons update currentPage correctly', () => {
  const { win, elements } = setupEnvironment();
  win.AdminWishes.init();
  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize(5);

  assert.strictEqual(win.AdminWishes.getPage(), 1, 'Start on page 1');
  assert.strictEqual(elements['btn-wishes-prev-page'].disabled, true, 'Prev is disabled on page 1');
  assert.strictEqual(elements['btn-wishes-next-page'].disabled, false, 'Next is enabled on page 1');

  // Click Next -> Page 2
  elements['btn-wishes-next-page'].dispatchEvent({ type: 'click' });
  assert.strictEqual(win.AdminWishes.getPage(), 2, 'Current page must be 2 after Next');
  assert.strictEqual(elements['btn-wishes-prev-page'].disabled, false, 'Prev is enabled on page 2');
  assert.strictEqual(elements['btn-wishes-next-page'].disabled, false, 'Next is enabled on page 2');

  // Click Next -> Page 3
  elements['btn-wishes-next-page'].dispatchEvent({ type: 'click' });
  assert.strictEqual(win.AdminWishes.getPage(), 3, 'Current page must be 3 after Next');
  assert.strictEqual(elements['btn-wishes-prev-page'].disabled, false, 'Prev is enabled on page 3');
  assert.strictEqual(elements['btn-wishes-next-page'].disabled, true, 'Next is disabled on last page 3');

  // Click Prev -> Page 2
  elements['btn-wishes-prev-page'].dispatchEvent({ type: 'click' });
  assert.strictEqual(win.AdminWishes.getPage(), 2, 'Current page must be 2 after Prev');

  // Click Prev -> Page 1
  elements['btn-wishes-prev-page'].dispatchEvent({ type: 'click' });
  assert.strictEqual(win.AdminWishes.getPage(), 1, 'Current page must be 1 after Prev');
  assert.strictEqual(elements['btn-wishes-prev-page'].disabled, true, 'Prev is disabled on page 1');
});

test('6. Count Badge Formatting: Correctly displays item range and total count', () => {
  const { win, elements } = setupEnvironment();
  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize(5);

  win.AdminWishes.setPage(1);
  assert.strictEqual(elements['wishes-count-badge'].textContent, 'Showing 1–5 of 15 wishes');

  win.AdminWishes.setPage(2);
  assert.strictEqual(elements['wishes-count-badge'].textContent, 'Showing 6–10 of 15 wishes');

  win.AdminWishes.setPage(3);
  assert.strictEqual(elements['wishes-count-badge'].textContent, 'Showing 11–15 of 15 wishes');

  win.AdminWishes.setPageSize('all');
  assert.strictEqual(elements['wishes-count-badge'].textContent, 'Showing 1–15 of 15 wishes');
});

test('7. Empty State Handling: 0 matching wishes displays 0 of 0 and disables navigation', () => {
  const { win, elements } = setupEnvironment();
  win.AdminWishes.setWishes([]);

  assert.strictEqual(win.AdminWishes.getPage(), 1, 'Page should be 1');
  assert.strictEqual(win.AdminWishes.getTotalPages(), 1, 'Total pages should be 1');
  assert.strictEqual(elements['wishes-count-badge'].textContent, 'Showing 0 of 0 wishes');
  assert.strictEqual(elements['wishes-page-info'].textContent, 'Page 1 of 1');
  assert.strictEqual(elements['btn-wishes-prev-page'].disabled, true, 'Prev must be disabled');
  assert.strictEqual(elements['btn-wishes-next-page'].disabled, true, 'Next must be disabled');
});

test('8. Filter Reset: Search query resets currentPage to 1', () => {
  const { win, elements } = setupEnvironment();
  win.AdminWishes.init();
  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize(5);
  win.AdminWishes.setPage(3);
  assert.strictEqual(win.AdminWishes.getPage(), 3);

  // Type search
  elements['wishes-search-input'].value = 'Recipient';
  elements['wishes-search-input'].dispatchEvent({ type: 'input' });

  assert.strictEqual(win.AdminWishes.getPage(), 1, 'Search input must reset currentPage to 1');
});

test('9. Filter Reset: Search clear button resets currentPage to 1', () => {
  const { win, elements } = setupEnvironment();
  win.AdminWishes.init();
  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize(5);
  win.AdminWishes.setPage(2);
  elements['wishes-search-input'].value = 'test';

  elements['btn-wishes-search-clear'].dispatchEvent({ type: 'click' });
  assert.strictEqual(win.AdminWishes.getPage(), 1, 'Search clear must reset currentPage to 1');
  assert.strictEqual(elements['wishes-search-input'].value, '', 'Search input must be cleared');
});

test('10. Filter Reset: Media filter change resets currentPage to 1', () => {
  const { win, elements } = setupEnvironment();
  win.AdminWishes.init();
  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize(5);
  win.AdminWishes.setPage(2);

  elements['wishes-filter-media'].value = 'music';
  elements['wishes-filter-media'].dispatchEvent({ type: 'change' });

  assert.strictEqual(win.AdminWishes.getPage(), 1, 'Media filter change must reset currentPage to 1');
});

test('11. Filter Reset: Date filter change resets currentPage to 1', () => {
  const { win, elements } = setupEnvironment();
  win.AdminWishes.init();
  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize(5);
  win.AdminWishes.setPage(2);

  elements['wishes-filter-date'].value = '7d';
  elements['wishes-filter-date'].dispatchEvent({ type: 'change' });

  assert.strictEqual(win.AdminWishes.getPage(), 1, 'Date filter change must reset currentPage to 1');
});

test('12. Page Size Change: Changing page size dropdown updates pageSize and resets to page 1', () => {
  const { win, elements } = setupEnvironment();
  win.AdminWishes.init();
  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize(5);
  win.AdminWishes.setPage(3);

  elements['wishes-page-size'].value = '25';
  elements['wishes-page-size'].dispatchEvent({ type: 'change' });

  assert.strictEqual(win.AdminWishes.getPageSize(), 25, 'Page size must be 25');
  assert.strictEqual(win.AdminWishes.getPage(), 1, 'Changing page size must reset currentPage to 1');
});

test('13. Page Clamping: Reducing results via deletion or data update clamps currentPage', () => {
  const { win } = setupEnvironment();
  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize(5);
  win.AdminWishes.setPage(3); // On page 3 of 3 (items 11-15)

  // Reduce wishes dataset to 8 items (only 2 pages possible with size 5)
  win.AdminWishes.setWishes(sample15Wishes.slice(0, 8));

  assert.strictEqual(win.AdminWishes.getTotalPages(), 2, '8 items with pageSize 5 yields 2 total pages');
  assert.strictEqual(win.AdminWishes.getPage(), 2, 'Page 3 must be auto-clamped to maximum valid page 2');
});

test('14. Page Preservation: Sorting changes preserve currentPage if valid', () => {
  const { win } = setupEnvironment();
  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize(5);
  win.AdminWishes.setPage(2);

  // Toggle sort to Recipient A-Z
  win.AdminWishes.toggleSortByField('recipient');

  assert.strictEqual(win.AdminWishes.getPage(), 2, 'Sorting must preserve currentPage = 2');
  const p2 = win.AdminWishes.getProcessedWishes();
  assert.strictEqual(p2.length, 5, 'Page 2 must have 5 sorted items');
});

test('15. Full Pipeline: Search + Media + Date + Sort + Pagination work atomically', () => {
  const { win, elements } = setupEnvironment();
  win.AdminWishes.init();
  win.AdminWishes.setWishes(sample15Wishes);

  // Set Search
  elements['wishes-search-input'].value = 'Recipient';
  // Set Media = music
  elements['wishes-filter-media'].value = 'music';
  // Set Sort = recipient asc
  win.AdminWishes.setSortState('recipient', 'asc');
  // Set PageSize = 5
  win.AdminWishes.setPageSize(5);

  const allMatching = win.AdminWishes.getFilteredAndSortedWishes();
  assert.ok(allMatching.length > 0, 'Should find matching wishes with music');
  allMatching.forEach(w => {
    assert.ok(w.music_url, 'Every item must have music_url');
    assert.ok(w.recipient_name.includes('Recipient'), 'Every item must match search');
  });

  const paginated = win.AdminWishes.getProcessedWishes();
  assert.strictEqual(paginated.length, Math.min(5, allMatching.length), 'Processed length matches page slice');
});

test('16. Action Integrity: Row action buttons on Page 2 target the correct underlying UUID', () => {
  const { win, elements } = setupEnvironment();
  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize(5);
  win.AdminWishes.setPage(2);

  const page2Items = win.AdminWishes.getProcessedWishes();
  assert.strictEqual(page2Items.length, 5);

  const tbody = elements['wishes-tbody'];
  assert.strictEqual(tbody._children.length, 5, 'Tbody must have 5 rendered rows');

  // Verify that rendered row data corresponds to page 2 items
  tbody._children.forEach((tr, idx) => {
    const expectedWish = page2Items[idx];
    assert.ok(expectedWish, 'Expected wish must exist');
    // Check short ID or content in tr
    assert.ok(tr.innerHTML.includes(expectedWish.id.substring(0, 8)), `Row ${idx} must contain wish UUID ${expectedWish.id}`);
    assert.ok(tr.innerHTML.includes(`data-id="${expectedWish.id}"`), `Action buttons in row ${idx} must bind data-id="${expectedWish.id}"`);
  });
});

test('17. Network Efficiency: Zero Supabase queries during page switching or page size changes', () => {
  let queryCount = 0;
  const { win } = setupEnvironment();
  win.DatabaseModule.fetchWishes = async () => { queryCount++; return []; };

  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize(5);
  win.AdminWishes.setPage(2);
  win.AdminWishes.setPage(3);
  win.AdminWishes.setPageSize(10);
  win.AdminWishes.setPage(1);

  assert.strictEqual(queryCount, 0, 'Pagination operations must never invoke DatabaseModule.fetchWishes');
});

test('18. HTML Structure: admin.html contains pagination container, size select, prev/next buttons, and page info', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../admin.html'), 'utf8');
  assert.ok(html.includes('id="wishes-pagination-container"'), 'admin.html must contain wishes-pagination-container');
  assert.ok(html.includes('id="wishes-page-size"'), 'admin.html must contain wishes-page-size');
  assert.ok(html.includes('id="btn-wishes-prev-page"'), 'admin.html must contain btn-wishes-prev-page');
  assert.ok(html.includes('id="btn-wishes-next-page"'), 'admin.html must contain btn-wishes-next-page');
  assert.ok(html.includes('id="wishes-page-info"'), 'admin.html must contain wishes-page-info');
});

test('19. CSS Structure: admin-components.css contains pagination and page-size styles', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../css/admin/admin-components.css'), 'utf8');
  assert.ok(css.includes('.table-pagination'), 'CSS must define .table-pagination');
  assert.ok(css.includes('.pagination-size-group'), 'CSS must define .pagination-size-group');
  assert.ok(css.includes('.page-size-select'), 'CSS must define .page-size-select');
  assert.ok(css.includes('.pagination-controls'), 'CSS must define .pagination-controls');
  assert.ok(css.includes('.pagination-btn'), 'CSS must define .pagination-btn');
  assert.ok(css.includes('.pagination-info'), 'CSS must define .pagination-info');
});

test('20. Partial Last Page Range: 12 items with pageSize 5 renders "Showing 11–12 of 12 wishes" on page 3', () => {
  const { win, elements } = setupEnvironment();
  win.AdminWishes.setWishes(sample15Wishes.slice(0, 12));
  win.AdminWishes.setPageSize(5);

  win.AdminWishes.setPage(3);
  assert.strictEqual(win.AdminWishes.getTotalPages(), 3, 'Total pages must be 3');
  assert.strictEqual(elements['wishes-count-badge'].textContent, 'Showing 11–12 of 12 wishes');
  assert.strictEqual(elements['wishes-page-info'].textContent, 'Page 3 of 3');
  assert.strictEqual(elements['btn-wishes-prev-page'].disabled, false, 'Prev enabled on page 3');
  assert.strictEqual(elements['btn-wishes-next-page'].disabled, true, 'Next disabled on page 3');
});

test('21. Clamping on setPage Out-of-Bounds: setPage(99) or setPage(-5) clamps safely', () => {
  const { win } = setupEnvironment();
  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize(5); // 3 pages

  win.AdminWishes.setPage(99);
  assert.strictEqual(win.AdminWishes.getPage(), 3, 'setPage(99) must clamp to max page 3');

  win.AdminWishes.setPage(-5);
  assert.strictEqual(win.AdminWishes.getPage(), 1, 'setPage(-5) must clamp to min page 1');
});

test('22. Page Size "50" on 15 items: Renders all items on Page 1 of 1 with Next/Prev disabled', () => {
  const { win, elements } = setupEnvironment();
  win.AdminWishes.setWishes(sample15Wishes);
  win.AdminWishes.setPageSize(50);

  assert.strictEqual(win.AdminWishes.getTotalPages(), 1, 'Total pages must be 1 for 15 items with size 50');
  assert.strictEqual(win.AdminWishes.getPage(), 1, 'Current page must be 1');
  assert.strictEqual(elements['wishes-count-badge'].textContent, 'Showing 1–15 of 15 wishes');
  assert.strictEqual(elements['btn-wishes-prev-page'].disabled, true, 'Prev must be disabled');
  assert.strictEqual(elements['btn-wishes-next-page'].disabled, true, 'Next must be disabled');
});

// ============================================================
// SUMMARY
// ============================================================
console.log('============================================================');
console.log(`📊 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('============================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL 22 PHASE 31B-3 PAGINATION TESTS PASSED!');
  process.exit(0);
}
