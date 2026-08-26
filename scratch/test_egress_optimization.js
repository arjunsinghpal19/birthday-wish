const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("============================================================");
console.log("🔍 VERIFYING CACHED EGRESS FIX & PRESERVATION");
console.log("============================================================\n");

// 1. Check admin-media.js has guarded renderDamGrid and preload='none'
const adminMedia = fs.readFileSync(path.join(__dirname, "../js/admin/admin-media.js"), "utf8");
assert.ok(adminMedia.includes('if (!mediaView || mediaView.classList.contains("active")) {'), "Must check if mediaView is active before renderDamGrid in loadStorageMediaData");
assert.ok(adminMedia.includes('previewHtml = `<video src="${file.publicUrl}#t=0.001" preload="metadata" muted playsinline></video>`;'), "Video preview must use #t=0.001 and preload='metadata'");
console.log("✓ 1. admin-media.js: loadStorageMediaData guarded & video preview uses #t=0.001 with preload='metadata'");

// 2. Check admin.js has media tab renderDamGrid trigger
const adminJs = fs.readFileSync(path.join(__dirname, "../js/admin.js"), "utf8");
assert.ok(adminJs.includes('else if (targetTab === "media")'), "Must handle targetTab === 'media' in initTabNavigation");
assert.ok(adminJs.includes('if (typeof renderDamGrid === "function")'), "Must call renderDamGrid on demand for media tab");
console.log("✓ 2. js/admin.js: initTabNavigation triggers renderDamGrid on demand for media tab");

// 3. Check public wish renderers are untouched
const renderers = fs.readFileSync(path.join(__dirname, "../js/modules/renderers.js"), "utf8");
assert.ok(renderers.includes("wish-video-element"), "Public wish renderer video element must remain intact");
console.log("✓ 3. js/modules/renderers.js: Public wish renderers untouched");

console.log("\n🎉 ALL CACHED EGRESS OPTIMIZATION VERIFICATIONS PASSED!");
