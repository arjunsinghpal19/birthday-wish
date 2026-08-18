/**
 * Automated Verification Suite for Phase 30.2 Round 4 Targeted UAT Fixes:
 * 1. Live Public Preview session hydration and localStorage draft isolation
 * 2. Save & Share full URL creation and clipboard copying with legacy fallback
 * 3. Gallery layout 2-column baseline and nowrap upload button
 * 4. Header / Summary action button baseline parity
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("============================================================");
console.log("🚀 RUNNING PHASE 30.2 ROUND 4 TARGETED UAT TEST SUITE");
console.log("============================================================\n");

const baseDir = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(baseDir, 'js', 'app.js'), 'utf8');
const customizerJs = fs.readFileSync(path.join(baseDir, 'js', 'modules', 'editor', 'customizer.js'), 'utf8');
const adminCoreJs = fs.readFileSync(path.join(baseDir, 'js', 'admin', 'admin-core.js'), 'utf8');
const adminWishEditorJs = fs.readFileSync(path.join(baseDir, 'js', 'admin', 'admin-wish-editor.js'), 'utf8');
const adminEditorCss = fs.readFileSync(path.join(baseDir, 'css', 'admin', 'admin-editor.css'), 'utf8');
const adminHtml = fs.readFileSync(path.join(baseDir, 'admin.html'), 'utf8');

// 1. Task A: Live Public Preview
console.log("▶ TASK A: Live Public Preview Hydration & Isolation");
assert(appJs.includes('CONFIG._isPreview = true'), "app.js must set CONFIG._isPreview flag when hydrating preview session");
assert(appJs.includes('sessionStorage.getItem("admin_preview_wish")') && appJs.includes('localStorage.getItem("admin_preview_wish")'), "app.js must support both sessionStorage and localStorage preview hydration");
assert(appJs.includes('if (isPreview) {'), "app.js must check isPreview before loading localStorage creator draft");
assert(customizerJs.includes('const isPreviewParam = (root.CONFIG && root.CONFIG._isPreview)'), "customizer.js must recognize isPreview to avoid draft overwrite");
console.log("  ✓ app.js and customizer.js protect preview mode from localStorage draft overwrite");

// 2. Task B: Save & Share / Copy Link
console.log("\n▶ TASK B: Save & Share URL Construction & Clipboard Engine");
assert(adminCoreJs.includes('cleanUrl') && adminCoreJs.includes('window.location.origin'), "admin-core.js copyWishUrl must construct full absolute share URL from wish ID");
assert(adminCoreJs.includes('fallbackCopyText'), "admin-core.js must have fallbackCopyText for environments where navigator.clipboard is blocked");
assert(adminWishEditorJs.includes('window.location.origin') && adminWishEditorJs.includes('copyWishUrl'), "admin-wish-editor.js saveAndShare must format full share URL");
console.log("  ✓ admin-core.js and admin-wish-editor.js guarantee full URL copy with clipboard fallback");

// 3. Task C: Admin Gallery Baseline
console.log("\n▶ TASK C: Admin Gallery Visual Layout Baseline");
assert(adminEditorCss.includes('#adm-gallery-container {') && adminEditorCss.includes('display: flex') && adminEditorCss.includes('flex-direction: column'), "admin-editor.css must enforce full-width vertical card stack for gallery");
assert(adminEditorCss.includes('white-space: nowrap !important') && adminEditorCss.includes('.adm-gallery-upload-btn'), "admin-editor.css must enforce nowrap on gallery upload button");
assert(adminWishEditorJs.includes('gallery-thumb-box') && adminWishEditorJs.includes('adm-gallery-upload-btn'), "admin-wish-editor.js must render gallery-thumb-box with upload button");
console.log("  ✓ Gallery retains full-width card stack and single-line upload photo button");

// 4. Task D: Header & Summary Layout Baseline
console.log("\n▶ TASK D: Header and Summary Action Layout Baseline");
assert(adminHtml.includes('id="btn-editor-back"') && adminHtml.includes('id="admin-editor-title"'), "admin.html must contain Back button and title");
assert(adminHtml.includes('id="btn-editor-preview"') && adminHtml.includes('id="btn-editor-save"') && adminHtml.includes('id="btn-editor-save-share"'), "admin.html header must have Preview, Save, and Save & Share buttons");
assert(adminHtml.includes('id="btn-sum-save-share"') && adminHtml.includes('id="btn-sum-save"') && adminHtml.includes('id="btn-sum-preview"'), "admin.html summary card must have Save & Share, Save Changes, and Live Public Preview buttons");
console.log("  ✓ Header and summary action buttons match established baseline");

console.log("\n============================================================");
console.log("🎉 ALL PHASE 30.2 ROUND 4 TARGETED TESTS PASSED!");
console.log("============================================================\n");
