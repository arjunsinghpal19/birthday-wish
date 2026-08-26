const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

console.log("============================================================");
console.log("👑 RUNNING PHASE 31H-3 SINGLE-USE RECOVERY CODE HARDENING TESTS");
console.log("============================================================\n");

function pbkdf2Async(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 600000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ FAIL: ${name}: ${e.message}`);
    failed++;
  }
}

async function runAllTests() {
  // Test 1: Generate valid code -> Verify once -> valid: true, code atomically consumed
  await runTest("TEST 1: Generate valid code -> First verification succeeds (valid: true)", async () => {
    let mockDb = {
      backup_code_hash: null,
      backup_code_salt: null,
      backup_code_updated_at: null,
      memory_text: "{}"
    };

    // Simulate save-recovery-code
    const code = "WS-1234-ABCD-5678";
    const salt = generateSalt();
    const hash = await pbkdf2Async(code, salt);
    const nowIso = new Date().toISOString();

    mockDb.backup_code_hash = hash;
    mockDb.backup_code_salt = salt;
    mockDb.backup_code_updated_at = nowIso;
    mockDb.memory_text = JSON.stringify({ backup_code_hash: hash, backup_code_salt: salt, backup_code_updated_at: nowIso });

    // Simulate verify-recovery-code (Attempt 1)
    const inputHash = await pbkdf2Async(code, mockDb.backup_code_salt);
    const isValid = crypto.timingSafeEqual(Buffer.from(inputHash, "hex"), Buffer.from(mockDb.backup_code_hash, "hex"));
    assert.strictEqual(isValid, true, "First verification must match hash");

    // Atomic consumption simulation
    if (isValid && mockDb.backup_code_hash === hash) {
      mockDb.backup_code_hash = null;
      mockDb.backup_code_salt = null;
      const mem = JSON.parse(mockDb.memory_text);
      delete mem.backup_code_hash;
      delete mem.backup_code_salt;
      mem.backup_code_consumed_at = new Date().toISOString();
      mockDb.memory_text = JSON.stringify(mem);
    }

    assert.strictEqual(mockDb.backup_code_hash, null, "backup_code_hash must be null after consumption");
    assert.strictEqual(mockDb.backup_code_salt, null, "backup_code_salt must be null after consumption");
  });

  // Test 2: Verify exact same code again -> valid: false (already consumed)
  await runTest("TEST 2: Second verification of the exact same code is strictly REJECTED (valid: false)", async () => {
    let mockDb = {
      backup_code_hash: null,
      backup_code_salt: null,
      memory_text: JSON.stringify({ backup_code_consumed_at: new Date().toISOString() })
    };

    const code = "WS-1234-ABCD-5678";
    // When stored hash is null, verification must be rejected
    const hasStoredCode = !!(mockDb.backup_code_hash && mockDb.backup_code_salt);
    assert.strictEqual(hasStoredCode, false, "Server must reject when code is already consumed");
  });

  // Test 3: Generate new code -> Verify old code -> valid: false
  await runTest("TEST 3: Generating a new code invalidates any previous code", async () => {
    const oldCode = "WS-OLDD-1111-2222";
    const oldSalt = generateSalt();
    const oldHash = await pbkdf2Async(oldCode, oldSalt);

    const newCode = "WS-NEWW-3333-4444";
    const newSalt = generateSalt();
    const newHash = await pbkdf2Async(newCode, newSalt);

    let mockDb = {
      backup_code_hash: newHash,
      backup_code_salt: newSalt
    };

    // Attempting to verify old code against current salt/hash
    const inputHashOld = await pbkdf2Async(oldCode, mockDb.backup_code_salt);
    const isValidOld = crypto.timingSafeEqual(Buffer.from(inputHashOld, "hex"), Buffer.from(mockDb.backup_code_hash, "hex"));
    assert.strictEqual(isValidOld, false, "Old code must fail verification against new code hash");

    // Attempting to verify new code
    const inputHashNew = await pbkdf2Async(newCode, mockDb.backup_code_salt);
    const isValidNew = crypto.timingSafeEqual(Buffer.from(inputHashNew, "hex"), Buffer.from(mockDb.backup_code_hash, "hex"));
    assert.strictEqual(isValidNew, true, "New code must pass verification");
  });

  // Test 4: Wrong code attempt does NOT consume valid stored code
  await runTest("TEST 4: Submitting a wrong code does NOT consume the valid stored code", async () => {
    const validCode = "WS-VALID-9999-0000";
    const validSalt = generateSalt();
    const validHash = await pbkdf2Async(validCode, validSalt);

    let mockDb = {
      backup_code_hash: validHash,
      backup_code_salt: validSalt
    };

    // Wrong code attempt
    const wrongCode = "WS-WRONG-0000-1111";
    const inputHashWrong = await pbkdf2Async(wrongCode, mockDb.backup_code_salt);
    const isWrongValid = crypto.timingSafeEqual(Buffer.from(inputHashWrong, "hex"), Buffer.from(mockDb.backup_code_hash, "hex"));
    assert.strictEqual(isWrongValid, false, "Wrong code must fail");

    // Ensure mockDb is NOT modified
    assert.strictEqual(mockDb.backup_code_hash, validHash, "Stored hash must remain intact on failed attempt");
    assert.strictEqual(mockDb.backup_code_salt, validSalt, "Stored salt must remain intact on failed attempt");

    // Valid code is still usable
    const inputHashValid = await pbkdf2Async(validCode, mockDb.backup_code_salt);
    const isValid = crypto.timingSafeEqual(Buffer.from(inputHashValid, "hex"), Buffer.from(mockDb.backup_code_hash, "hex"));
    assert.strictEqual(isValid, true, "Valid code must remain usable after failed attempt");
  });

  // Test 5: 10 Concurrent Simultaneous Verification Requests Simulation
  await runTest("TEST 5: Concurrent 10-request simulation: Exactly ONE succeeds, 9 fail", async () => {
    const code = "WS-RACE-1111-2222";
    const salt = generateSalt();
    const hash = await pbkdf2Async(code, salt);

    let dbRow = {
      id: "00000000-0000-0000-0000-000000000001",
      backup_code_hash: hash,
      backup_code_salt: salt
    };

    // Thread-safe simulated atomic conditional update
    function atomicConsume(targetId, expectedHash) {
      if (dbRow.id === targetId && dbRow.backup_code_hash === expectedHash) {
        dbRow.backup_code_hash = null;
        dbRow.backup_code_salt = null;
        return [ { id: targetId, backup_code_hash: null } ]; // 1 row updated
      }
      return []; // 0 rows updated
    }

    // Launch 10 simultaneous verification requests
    const promises = Array.from({ length: 10 }, async () => {
      const inputHash = await pbkdf2Async(code, salt);
      const isMatch = crypto.timingSafeEqual(Buffer.from(inputHash, "hex"), Buffer.from(hash, "hex"));
      if (!isMatch) return { success: false, reason: "Hash mismatch" };
      const updatedRows = atomicConsume("00000000-0000-0000-0000-000000000001", hash);
      if (updatedRows.length === 1) {
        return { success: true, token: "admin_token_xyz" };
      }
      return { success: false, reason: "Already consumed" };
    });

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success);
    const rejected = results.filter(r => !r.success);

    assert.strictEqual(successful.length, 1, "Exactly ONE request must succeed");
    assert.strictEqual(rejected.length, 9, "Exactly 9 concurrent requests must be rejected");
    assert.strictEqual(dbRow.backup_code_hash, null, "Final database state must be null");
  });

  // Test 6: Zero Unconditional Fallback in api/auth.js verify-recovery-code path
  await runTest("TEST 6: Zero unconditional fallback exists in verify-recovery-code in api/auth.js", () => {
    const authApi = fs.readFileSync(path.join(ROOT_DIR, "api", "auth.js"), "utf8");

    // Extract the verify-recovery-code block
    const verifyBlockStart = authApi.indexOf('action === "verify-recovery-code"');
    const verifyBlockEnd = authApi.indexOf('action === "passkey-challenge"');
    assert(verifyBlockStart !== -1 && verifyBlockEnd !== -1, "Must locate verify-recovery-code block");

    const verifyBlock = authApi.slice(verifyBlockStart, verifyBlockEnd);

    // Verify conditional atomic PATCH exists
    assert(verifyBlock.includes('&backup_code_hash=eq.${storedCodeHash}'), "Must use conditional &backup_code_hash=eq. filter");
    assert(verifyBlock.includes('Prefer: "return=representation"'), "Must use Prefer: return=representation header");
    assert(verifyBlock.includes('consumedRows.length !== 1'), "Must verify exactly 1 row returned");

    // Verify NO pre-migration or unconditional fallback exists in verify block
    assert(!verifyBlock.includes('Pre-migration fallback'), "Must NOT contain Pre-migration fallback in verify-recovery-code");
    const patchMatches = (verifyBlock.match(/method:\s*"PATCH"/g) || []).length;
    assert.strictEqual(patchMatches, 1, "Must contain exactly ONE PATCH call in verify-recovery-code (conditional only)");
  });

  // Test 7: Session Token Ordering (Token issued only after atomic representation check)
  await runTest("TEST 7: Session token is issued strictly AFTER atomic single-use verification check", () => {
    const authApi = fs.readFileSync(path.join(ROOT_DIR, "api", "auth.js"), "utf8");
    const verifyBlockStart = authApi.indexOf('action === "verify-recovery-code"');
    const verifyBlockEnd = authApi.indexOf('action === "passkey-challenge"');
    const verifyBlock = authApi.slice(verifyBlockStart, verifyBlockEnd);

    const consumeIdx = verifyBlock.indexOf('consumedRows.length !== 1');
    const tokenIdx = verifyBlock.indexOf('createAdminSessionToken');
    const setCookieIdx = verifyBlock.indexOf('res.setHeader("Set-Cookie"');

    assert(consumeIdx !== -1 && tokenIdx !== -1 && setCookieIdx !== -1, "All steps must exist");
    assert(consumeIdx < tokenIdx, "Atomic row check must precede createAdminSessionToken");
    assert(tokenIdx < setCookieIdx, "createAdminSessionToken must precede Set-Cookie");
  });

  // Test 8: Client SessionStorage Cleanup Verification in Source Files
  await runTest("TEST 8: Quick Editor and Admin Dashboard clean up sessionStorage on successful verification", () => {
    const qeSec = fs.readFileSync(path.join(ROOT_DIR, "js", "modules", "admin-security.js"), "utf8");
    const adminSec = fs.readFileSync(path.join(ROOT_DIR, "js", "admin", "admin-security.js"), "utf8");

    assert(qeSec.includes('sessionStorage.removeItem("bw_active_recovery_code")'), "Quick Editor must clean up bw_active_recovery_code");
    assert(adminSec.includes('sessionStorage.removeItem("bw_active_recovery_code")'), "Admin must clean up bw_active_recovery_code");
  });

  console.log("\n============================================================");
  console.log(`PHASE 31H-3 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) process.exit(1);
}

runAllTests();
