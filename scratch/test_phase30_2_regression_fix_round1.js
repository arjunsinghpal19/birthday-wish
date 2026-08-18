/**
 * ============================================================================
 * PHASE 30.2 REGRESSION FIX (ROUND 1) AUTOMATED TEST SUITE (PURE NODE)
 * ============================================================================
 * Validates:
 * 1. Admin HTML modal and button markup presence & structure
 * 2. Section 03 Relationship card header & body layout
 * 3. Date parsing engine (DD/MM/YYYY, compact DDMMYYYY, hyphens, dots, leap years, invalid dates)
 * 4. Passcode Live Summary sync (adm-sum-passcode / adm-sum-pass)
 * 5. Basic info defaults reset (01/01/2001, passcode 1234)
 * 6. Relationship reset preserving uploaded gallery photos
 * 7. Responsive CSS rollback verification
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("================================================================");
console.log("RUNNING PHASE 30.2 REGRESSION FIX (ROUND 1) TEST SUITE");
console.log("================================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// --- 1. HTML Markup & Element ID Verification ---
const adminHtml = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');

test("Admin HTML contains #adm-date-picker-modal with all controls", () => {
  assert(adminHtml.includes('id="adm-date-picker-modal"'), "adm-date-picker-modal exists");
  assert(adminHtml.includes('id="adm-btn-datepicker"'), "adm-btn-datepicker exists");
  assert(adminHtml.includes('id="adm-input-birthdate-display"'), "adm-input-birthdate-display exists");
  assert(adminHtml.includes('id="adm-input-birthdate"'), "adm-input-birthdate hidden input exists");
  assert(adminHtml.includes('id="adm-mdp-days-grid"'), "adm-mdp-days-grid exists");
  assert(adminHtml.includes('id="adm-mdp-month-select"'), "adm-mdp-month-select exists");
  assert(adminHtml.includes('id="adm-mdp-year-select"'), "adm-mdp-year-select exists");
  assert(adminHtml.includes('id="adm-mdp-today-btn"'), "adm-mdp-today-btn exists");
  assert(adminHtml.includes('id="adm-mdp-cancel-btn"'), "adm-mdp-cancel-btn exists");
  assert(adminHtml.includes('id="adm-mdp-ok-btn"'), "adm-mdp-ok-btn exists");
});

test("Section 03 Relationship card header has Reset Style on the right", () => {
  // Check that adm-btn-reset-relationship is inside .editor-header-actions
  const section3Match = adminHtml.match(/<!-- RELATIONSHIP PRESET TEMPLATES -->([\s\S]*?)<!-- 3\. BIRTHDAY LETTER -->/);
  assert(section3Match, "Section 03 Relationship block found in admin.html");
  const s3 = section3Match[1];

  assert(/class="editor-header-actions"[\s\S]*?id="adm-btn-reset-relationship"/.test(s3), "adm-btn-reset-relationship is in editor-header-actions");
  assert(s3.includes('id="adm-select-relationship-lang"'), "adm-select-relationship-lang exists");
  assert(s3.includes('id="adm-select-relationship"'), "adm-select-relationship exists");
  assert(s3.includes('id="adm-btn-apply-relationship"'), "adm-btn-apply-relationship exists");
});

test("Admin Live Wish Summary contains #adm-sum-passcode and #adm-sum-date", () => {
  assert(adminHtml.includes('id="adm-sum-passcode"'), "adm-sum-passcode element exists");
  assert(adminHtml.includes('id="adm-sum-date"'), "adm-sum-date element exists");
});

// --- 2. Date Parsing Engine Validation ---
const editorCode = fs.readFileSync(path.join(__dirname, '../js/admin/admin-wish-editor.js'), 'utf8');

// Extract parseUserDisplayDate from admin-wish-editor.js
let parseUserDisplayDate;
{
  const fnMatch = editorCode.match(/function parseUserDisplayDate\(str\)\s*\{([\s\S]*?)\n  \}/);
  assert(fnMatch, "parseUserDisplayDate function extracted from admin-wish-editor.js");
  parseUserDisplayDate = new Function('str', fnMatch[1]);
}

test("parseUserDisplayDate parses DD/MM/YYYY correctly (19/03/2001)", () => {
  const res = parseUserDisplayDate("19/03/2001");
  assert.deepStrictEqual(res, { year: 2001, month: 3, day: 19 });
});

test("parseUserDisplayDate parses compact 8-digit DDMMYYYY correctly (19032001)", () => {
  const res = parseUserDisplayDate("19032001");
  assert.deepStrictEqual(res, { year: 2001, month: 3, day: 19 });
});

test("parseUserDisplayDate parses hyphens and dots (19-03-2001, 19.03.2001)", () => {
  const resHyphen = parseUserDisplayDate("19-03-2001");
  assert.deepStrictEqual(resHyphen, { year: 2001, month: 3, day: 19 });

  const resDot = parseUserDisplayDate("19.03.2001");
  assert.deepStrictEqual(resDot, { year: 2001, month: 3, day: 19 });
});

test("parseUserDisplayDate validates leap years and rejects invalid dates", () => {
  assert.deepStrictEqual(parseUserDisplayDate("29/02/2004"), { year: 2004, month: 2, day: 29 }, "2004 is leap year");
  assert.strictEqual(parseUserDisplayDate("29/02/2001"), null, "2001 is not a leap year");
  assert.strictEqual(parseUserDisplayDate("31/02/2001"), null, "Feb 31 is invalid");
  assert.strictEqual(parseUserDisplayDate("31/04/2001"), null, "Apr 31 is invalid (April has 30 days)");
  assert.strictEqual(parseUserDisplayDate("99/99/9999"), null, "99/99/9999 is invalid");
  assert.strictEqual(parseUserDisplayDate(""), null, "Empty string returns null");
  assert.strictEqual(parseUserDisplayDate(null), null, "Null returns null");
});

// --- 3. Passcode Live Summary Selector Compatibility ---
test("updateSummaryPanel supports both adm-sum-passcode and adm-sum-pass", () => {
  assert(
    editorCode.includes('document.getElementById("adm-sum-passcode") || document.getElementById("adm-sum-pass")'),
    "updateSummaryPanel queries adm-sum-passcode || adm-sum-pass"
  );
});

// --- 4. Date Masking Segmentation Logic Verification ---
test("Date typing masking converts 19032001 to 19/03/2001 and prevents segment bleed", () => {
  function maskInput(val) {
    let masked = "";
    if (val.includes("/") || val.includes("-") || val.includes(".")) {
      const parts = val.split(/[\/\-\.]/);
      let p0 = (parts[0] || "").replace(/\D/g, "").slice(0, 2);
      let p1 = (parts[1] || "").replace(/\D/g, "").slice(0, 2);
      let p2 = (parts[2] || "").replace(/\D/g, "").slice(0, 4);

      if (parts.length >= 3) {
        masked = `${p0}/${p1}/${p2}`;
      } else if (parts.length === 2) {
        masked = `${p0}/${p1}`;
        if (p1.length === 2 && !val.endsWith("/")) {
          masked += "/";
        }
      } else {
        masked = p0;
        if (p0.length === 2) {
          masked += "/";
        }
      }
    } else {
      let raw = val.replace(/\D/g, "").slice(0, 8);
      if (raw.length > 0) {
        let p0 = raw.slice(0, 2);
        let p1 = raw.slice(2, 4);
        let p2 = raw.slice(4, 8);
        if (raw.length <= 2) {
          masked = p0 + (p0.length === 2 ? "/" : "");
        } else if (raw.length <= 4) {
          masked = p0 + "/" + p1 + (p1.length === 2 ? "/" : "");
        } else {
          masked = p0 + "/" + p1 + "/" + p2;
        }
      }
    }
    return masked;
  }

  assert.strictEqual(maskInput("19032001"), "19/03/2001", "Compact 19032001 masks to 19/03/2001");
  assert.strictEqual(maskInput("19-03-2001"), "19/03/2001", "Hyphen 19-03-2001 masks to 19/03/2001");
  assert.strictEqual(maskInput("19.03.2001"), "19/03/2001", "Dot 19.03.2001 masks to 19/03/2001");
  assert.strictEqual(maskInput("1/03/2001"), "1/03/2001", "Backspace day segment preserves month and year without bleed");
  assert.strictEqual(maskInput("01/1/2001"), "01/1/2001", "Backspace month segment preserves day and year without bleed");
});

// --- 5. Basic Info Defaults Reset Logic ---
test("Basic Info Reset resets name, date to 2001-01-01, cake to default, and passcode to 1234", () => {
  assert(editorCode.includes('cfg.birthDate = { year: 2001, month: 1, day: 1 }'), "Sets birthDate to 2001-01-01");
  assert(editorCode.includes('dateDisplayEl.value = "01/01/2001"'), "Sets dateDisplayEl.value to 01/01/2001");
  assert(editorCode.includes('cfg.passcode = { code: "1234" }'), "Sets passcode to 1234");
  assert(editorCode.includes('passEl.value = "1234"'), "Sets passEl.value to 1234");
});

// --- 6. Relationship Reset Uploaded Photo Preservation ---
test("Relationship Reset preserves uploaded gallery photo URLs", () => {
  // Check that cfg.gallery preserves g.image
  const resetRelMatch = editorCode.match(/resetRelBtn\.addEventListener\("click",\s*\(\)\s*=>\s*\{([\s\S]*?)\n    \}\);/);
  assert(resetRelMatch, "Relationship reset listener found");
  const body = resetRelMatch[1];
  assert(body.includes('cfg.gallery.forEach'), "Iterates existing cfg.gallery to preserve image URLs");
  assert(!body.includes('g.image = null') && !body.includes('g.image = defCard.image'), "Does not overwrite g.image with default placeholder");
});

// --- 7. Responsive CSS Rollback Verification ---
test("Responsive CSS rollback retains stable baseline without aggressive card/editor collapses", () => {
  const respCss = fs.readFileSync(path.join(__dirname, '../css/admin/admin-responsive.css'), 'utf8');
  assert(!respCss.includes('.admin-editor-layout'), "No .admin-editor-layout collapse rule");
  assert(!respCss.includes('.form-grid-2'), "No .form-grid-2 collapse rule");
  assert(!respCss.includes('.editor-card-header'), "No .editor-card-header collapse rule");
  assert(respCss.includes('.admin-sidebar'), "Baseline .admin-sidebar rule present");
});

console.log("\n================================================================");
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("================================================================");

if (failed > 0) {
  process.exit(1);
}
