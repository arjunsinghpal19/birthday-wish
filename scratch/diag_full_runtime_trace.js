const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

// Build simulated DOM environment
class MockElement {
  constructor(id = '', className = '', tagName = 'DIV') {
    this.id = id;
    this.className = className;
    this.tagName = tagName;
    this.classList = {
      _classes: new Set(className ? className.split(/\s+/) : []),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        } else if (force) this.classList._classes.add(c);
        else this.classList._classes.delete(c);
      }
    };
    this.style = {};
    this.textContent = '';
    this.value = '';
    this.disabled = false;
    this.onclick = null;
    this.listeners = {};
    this.dataset = {};
  }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  click() {
    if (typeof this.onclick === 'function') {
      this.onclick({ preventDefault: () => {}, target: this });
    }
    if (this.listeners['click']) {
      for (const fn of this.listeners['click']) {
        fn({ preventDefault: () => {}, target: this });
      }
    }
  }
  querySelector(sel) {
    return mockDoc.querySelector(sel);
  }
  querySelectorAll(sel) {
    return mockDoc.querySelectorAll(sel);
  }
  focus() {}
}

const elements = new Map();
function getOrCreate(id, className = '', tagName = 'DIV') {
  if (!elements.has(id)) {
    const el = new MockElement(id, className, tagName);
    elements.set(id, el);
  }
  return elements.get(id);
}

const mockDoc = {
  getElementById: (id) => elements.get(id) || null,
  querySelector: (sel) => {
    if (sel.startsWith('#')) {
      const parts = sel.split(/\s+/);
      const firstId = parts[0].replace('#', '');
      if (parts.length === 1) return elements.get(firstId) || null;
      if (parts[1].startsWith('.')) {
        const cls = parts[1].replace('.', '');
        for (const el of elements.values()) {
          if (el.classList.contains(cls)) return el;
        }
      }
    }
    if (sel.startsWith('.')) {
      const cls = sel.replace('.', '');
      for (const el of elements.values()) {
        if (el.classList.contains(cls)) return el;
      }
    }
    return null;
  },
  querySelectorAll: (sel) => {
    const matched = [];
    const selectors = sel.split(',').map(s => s.trim());
    for (const s of selectors) {
      if (s.startsWith('#')) {
        const id = s.replace('#', '');
        if (elements.has(id)) matched.push(elements.get(id));
      } else if (s.startsWith('.')) {
        const cls = s.replace('.', '');
        for (const el of elements.values()) {
          if (el.classList.contains(cls) && !matched.includes(el)) matched.push(el);
        }
      }
    }
    return matched;
  },
  addEventListener: () => {}
};

const mockSessionStorage = {
  _store: new Map(),
  getItem: (k) => mockSessionStorage._store.get(k) || null,
  setItem: (k, v) => mockSessionStorage._store.set(k, String(v)),
  removeItem: (k) => mockSessionStorage._store.delete(k),
  clear: () => mockSessionStorage._store.clear()
};

// Populate DOM matching index.html
const modal = getOrCreate('admin-login-modal', 'modal-backdrop');
const closeBtn = getOrCreate('admin-modal-close-btn', '');
const tabAdmin = getOrCreate('tab-btn-admin', 'admin-tab-btn'); tabAdmin.dataset.tab = 'admin';
const tabSec = getOrCreate('tab-btn-sec', 'admin-tab-btn'); tabSec.dataset.tab = 'security';
const tabContentAdmin = getOrCreate('admin-tab-admin', 'admin-tab-content');
const tabContentSec = getOrCreate('admin-tab-security', 'admin-tab-content');

const subtabChange = getOrCreate('subtab-change', 'security-subtab-btn'); subtabChange.dataset.subtab = 'change';
const subtabForgot = getOrCreate('subtab-forgot', 'security-subtab-btn'); subtabForgot.dataset.subtab = 'forgot';
const subContentChange = getOrCreate('security-subtab-change', 'security-subtab-content');
const subContentForgot = getOrCreate('security-subtab-forgot', 'security-subtab-content');

const stepChoose = getOrCreate('forgot-step-choose-method');
const substepEmail = getOrCreate('forgot-substep-email');
const substepBackup = getOrCreate('forgot-substep-backup');
const stepNewPass = getOrCreate('forgot-step-newpass');

const cardEmail = getOrCreate('card-method-email', 'recovery-method-card');
const cardBackup = getOrCreate('card-method-backup', 'recovery-method-card');

const backupDisplay = getOrCreate('forgot-backup-code-display', 'sec-backup-code-val');
backupDisplay.textContent = '••••-••••-••••-••••';

const backupWrapper = getOrCreate('forgot-backup-card-wrapper', 'backup-code-card');

const btnCopy = getOrCreate('btn-copy-code', 'btn-backup-act btn-copy-code-action', 'BUTTON');
const btnDl = getOrCreate('btn-dl-code', 'btn-backup-act btn-download-code-action', 'BUTTON');
const btnPrint = getOrCreate('btn-print-code', 'btn-backup-act btn-print-code-action', 'BUTTON');
const btnRegen = getOrCreate('btn-regen-code', 'btn-backup-act btn-regen-code-action', 'BUTTON');

const btnBack = getOrCreate('btn-back', 'btn-back-link btn-back-to-methods', 'BUTTON');

// Set up Global Mocks
const toastHistory = [];
global.location = { search: '' };
global.document = mockDoc;
global.sessionStorage = mockSessionStorage;
global.showToast = (msg) => { toastHistory.push(msg); console.log(`  [TOAST DISPATCHED]: ${msg}`); };
global.fetch = fetch;
global.window = {
  getApiUrl: (ep) => `http://localhost:3000${ep}`,
  showToast: global.showToast,
  DatabaseModule: {
    getSecuritySettings: async () => ({
      has_recovery_code: true,
      recovery_code_updated_at: mockSessionStorage.getItem("bw_active_recovery_code_time") || "2026-08-24T11:16:05.354Z"
    })
  }
};

// Evaluate js/modules/admin-security.js in sandbox
const codeStr = fs.readFileSync(path.join(ROOT_DIR, 'js', 'modules', 'admin-security.js'), 'utf8');
const runModule = new Function('root', 'document', 'sessionStorage', 'fetch', codeStr);
runModule(global.window, mockDoc, mockSessionStorage, fetch);

async function runLiveRuntimeTrace() {
  console.log("============================================================");
  console.log("🚀 LIVE BROWSER RUNTIME VERIFICATION TRACE");
  console.log("============================================================\n");

  console.log("--- PHASE 1: INITIAL STATE BEFORE ANY ACTION ---");
  console.log("DOM textContent:", backupDisplay.textContent);
  console.log("sessionStorage 'bw_active_recovery_code':", mockSessionStorage.getItem("bw_active_recovery_code"));
  console.log("sessionStorage 'bw_active_recovery_code_time':", mockSessionStorage.getItem("bw_active_recovery_code_time"));

  console.log("\n--- PHASE 2: USER CLICKS 'SECURITY' -> 'FORGOT PASSWORD' -> 'EMERGENCY BACKUP' ---");
  tabSec.click();
  subtabForgot.click();
  await cardBackup.click();
  console.log("DOM textContent after cardBackup click:", backupDisplay.textContent);
  console.log("sessionStorage code:", mockSessionStorage.getItem("bw_active_recovery_code"));

  console.log("\n--- PHASE 3: USER CLICKS '🔄 GENERATE NEW CODE' ---");
  console.log("Button onclick exists:", typeof btnRegen.onclick === 'function');
  const genPromise = btnRegen.onclick({ preventDefault: () => {} });
  console.log("Generate request in flight...");
  await genPromise;
  console.log("Generate request completed!");

  console.log("\n--- PHASE 4: STATE IMMEDIATELY AFTER GENERATE RESPONSE ---");
  console.log("DOM textContent (immediate):", backupDisplay.textContent);
  console.log("sessionStorage code:", mockSessionStorage.getItem("bw_active_recovery_code"));
  console.log("sessionStorage time:", mockSessionStorage.getItem("bw_active_recovery_code_time"));

  console.log("\n--- PHASE 5: TIMED INTERVAL CHECKS (100ms, 500ms, 1s, 2s) ---");
  await new Promise(r => setTimeout(r, 100));
  console.log("DOM at +100ms:", backupDisplay.textContent);
  await new Promise(r => setTimeout(r, 400));
  console.log("DOM at +500ms:", backupDisplay.textContent);
  await new Promise(r => setTimeout(r, 500));
  console.log("DOM at +1000ms:", backupDisplay.textContent);
  await new Promise(r => setTimeout(r, 1000));
  console.log("DOM at +2000ms:", backupDisplay.textContent);

  console.log("\n--- PHASE 6: USER CLICKS '📋 COPY CODE' AFTER GENERATION ---");
  let clipboardText = '';
  global.navigator = { clipboard: { writeText: async (t) => { clipboardText = t; } } };
  await btnCopy.onclick({ preventDefault: () => {} });
  console.log("Copied to clipboard:", clipboardText);
  console.log("Button text after copy:", btnCopy.innerHTML);

  console.log("\n--- PHASE 7: USER NAVIGATES BACK AND RETURNS TO EMERGENCY BACKUP ---");
  btnBack.click();
  console.log("Substeps reset to Choose Method");
  await cardBackup.click();
  console.log("DOM textContent after returning to cardBackup:", backupDisplay.textContent);
  console.log("sessionStorage code:", mockSessionStorage.getItem("bw_active_recovery_code"));

  console.log("\n--- PHASE 8: TOAST DISPATCH SUMMARY ---");
  console.log("Total toasts dispatched during flow:", toastHistory.length);
  toastHistory.forEach((t, i) => console.log(`  ${i + 1}. "${t}"`));

  console.log("\n============================================================");
  console.log("🏁 LIVE RUNTIME TRACE FINISHED");
  console.log("============================================================\n");
}

runLiveRuntimeTrace();
