const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const adminHtml = fs.readFileSync(path.join(ROOT_DIR, 'admin.html'), 'utf8');

console.log("============================================================");
console.log("🔍 ADMIN DOM INTEGRITY VERIFICATION");
console.log("============================================================\n");

const expectedSingletons = [
  'sec-pane-config',
  'sec-pane-recovery',
  'sec-old-pass',
  'sec-new-pass',
  'sec-confirm-pass',
  'sec-save-pass-btn',
  'sec-passkey-card-wrapper',
  'sec-passkey-status-box',
  'sec-passkey-status',
  'btn-register-passkey',
  'btn-remove-passkey',
  'sec-method-card-email',
  'sec-method-card-code',
  'sec-rec-panel-email',
  'sec-rec-panel-code',
  'sec-recovery-email',
  'sec-save-email-btn',
  'sec-email-otp-box',
  'sec-email-otp-input',
  'sec-verify-email-otp-btn',
  'sec-rec-email-target',
  'btn-sec-rec-send-otp',
  'sec-rec-email-otp-box',
  'sec-rec-email-otp-input',
  'btn-sec-rec-verify-otp',
  'sec-backup-card-wrapper',
  'sec-code-display',
  'btn-regen-recovery-code',
  'btn-copy-recovery-code',
  'btn-download-recovery-code',
  'btn-print-recovery-code',
  'sec-rec-code-input',
  'btn-sec-rec-verify-code',
  'sec-rec-step-resetpass',
  'sec-rec-verified-msg',
  'sec-rec-new-pass',
  'sec-rec-confirm-pass',
  'btn-sec-rec-save-newpass',
  'regen-confirm-modal',
  'btn-regen-cancel',
  'btn-regen-confirm'
];

let allPassed = true;
for (const id of expectedSingletons) {
  const regex = new RegExp(`id=["']${id}["']`, 'g');
  const matches = adminHtml.match(regex) || [];
  const count = matches.length;
  if (count === 1) {
    console.log(`  ✓ PASS: id="${id}" exists exactly once`);
  } else {
    console.error(`  ❌ FAIL: id="${id}" exists ${count} times (expected 1)`);
    allPassed = false;
  }
}

console.log("\n============================================================");
console.log(`DOM INTEGRITY RESULT: ${allPassed ? "ALL 41 IDS VERIFIED CLEAN (100%)" : "FAILED"}`);
console.log("============================================================\n");

if (!allPassed) process.exit(1);
