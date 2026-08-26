/**
 * Master Test Runner to execute all phase test suites in sequence and aggregate results.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SCRATCH_DIR = path.resolve(__dirname);
const testFiles = [
  "test_phase31j_defect_fixes.js",
  "test_phase31j1_responsive_uat_customers.js",
  "test_phase31j_responsive.js",
  "test_phase31i_admin_share_parity_uat.js",
  "test_phase31h6_destructive_hardening.js",
  "test_phase31h5_xss_sanitization.js",
  "test_phase31h3_api_authorization.js",
  "test_phase31h3p_webauthn.js",
  "test_phase31h3_single_use_recovery.js",
  "test_phase31h3p_live_roundtrip.js",
  "test_phase31h3p_strict_credential_binding.js",
  "test_phase31h_security.js",
  "test_phase31g_backup_logs_settings.js",
  "test_phase31f_5_theme_customizer.js",
  "test_phase31f_4_theme_visuals.js",
  "test_phase31f_3_live_themes.js",
  "test_phase31f_wish_state_sync.js",
  "test_phase31f_themes.js",
  "test_phase31d1b_31e_storage_save_share.js",
  "test_phase31d1a_ui_polish.js",
  "test_phase31d_dashboard_analytics.js",
  "test_phase31d_dashboard_overview.js",
  "test_phase31c_audio_and_wishes_view.js",
  "test_phase31c_media_productivity.js",
  "test_phase31c_asset_inspector.js",
  "test_phase31c_unused_cleanup.js",
  "test_phase31c_orphan_scanner_export.js",
  "test_phase31c_unused_management.js",
  "test_phase31c_media_reference_engine.js",
  "test_phase31c_share_flow_hotfix.js",
  "test_phase31b_view_preferences.js",
  "test_phase31b_wishes_quick_view.js",
  "test_phase31b_bulk_duplicate.js",
  "test_phase31b_bulk_delete.js",
  "test_phase31b_bulk_export.js",
  "test_phase31b_bulk_copy_links.js",
  "test_phase31b_wishes_selection.js",
  "test_phase31b_wishes_sorting.js",
  "test_phase31b_wishes_pagination.js",
  "test_phase31b_wishes_advanced_filters.js",
  "test_phase31b_wishes_indicators.js",
  "test_phase31b_wishes_management_ux.js",
  "test_phase31b_wishes_productivity.js",
  "test_phase31b_wishes_ux.js",
  "test_phase31a_kpi_sync.js",
  "test_phase31a_secure_delete.js",
  "test_phase31a_wishes_management.js"
];

console.log("============================================================");
console.log("🚀 EXECUTING MASTER TEST RUNNER ACROSS ALL TEST SUITES");
console.log("============================================================");

let suitesPassed = 0;
let suitesFailed = 0;

testFiles.forEach(file => {
  const filePath = path.join(SCRATCH_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Skipped missing file: ${file}`);
    return;
  }
  try {
    console.log(`\n▶ Running ${file}...`);
    const output = execSync(`node "${filePath}"`, { encoding: "utf8" });
    const lastLine = output.trim().split("\n").pop();
    console.log(`  ✓ ${file} PASSED: ${lastLine}`);
    suitesPassed++;
  } catch (err) {
    console.error(`  ❌ ${file} FAILED!`);
    console.error(err.stdout || err.message);
    suitesFailed++;
  }
});

console.log("\n============================================================");
console.log(`🏁 MASTER RUNNER SUMMARY: ${suitesPassed} SUITES PASSED, ${suitesFailed} SUITES FAILED`);
console.log("============================================================");

if (suitesFailed > 0) process.exit(1);
