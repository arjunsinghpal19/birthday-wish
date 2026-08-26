/**
 * ============================================================================
 * PHASE 31H-6 DESTRUCTIVE ACTION HARDENING TEST SUITE
 * scratch/test_phase31h6_destructive_hardening.js
 *
 * Tests:
 * 1. js/storage.js: Legacy direct client storage delete fallback removed (zero client bypass).
 * 2. api/admin-delete-wish.js: Rejects batches > 100 items with HTTP 400.
 * 3. api/admin-delete-wish.js: Preserves valid batches <= 100 items & system row 403 block.
 * 4. api/admin-delete-media.js: Rejects batches > 100 paths with HTTP 400.
 * 5. api/admin-delete-media.js: Rate limits requests exceeding 30 req/min with HTTP 429.
 * 6. api/admin-delete-media.js: Preserves path traversal and valid folder defenses.
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("🛡️ STARTING PHASE 31H-6 DESTRUCTIVE HARDENING TEST SUITE");
console.log("============================================================");

let testCount = 0;
function test(name, fn) {
  testCount++;
  try {
    fn();
    console.log(`  ✓ ${testCount}. ${name}`);
  } catch (err) {
    console.error(`  ✗ ${testCount}. ${name}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

async function asyncTest(name, fn) {
  testCount++;
  try {
    await fn();
    console.log(`  ✓ ${testCount}. ${name}`);
  } catch (err) {
    console.error(`  ✗ ${testCount}. ${name}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

(async function runAllHardeningTests() {
  // ------------------------------------------------------------
  // 1. Static Analysis: Verify direct client delete fallback removal in js/storage.js
  // ------------------------------------------------------------
  const storageCode = fs.readFileSync(path.join(__dirname, "../js/storage.js"), "utf8");

  test("Storage Module: Direct client .remove() fallback is completely removed", () => {
    assert.strictEqual(
      storageCode.includes("client.storage.from(BUCKET_NAME).remove"),
      false,
      "js/storage.js must NOT contain direct client.storage.from().remove fallback"
    );
    assert.strictEqual(
      storageCode.includes("Storage RLS may restrict anonymous DELETE"),
      false,
      "js/storage.js must not contain legacy RLS warning message"
    );
  });

  test("Storage Module: deleteMultipleMedia returns false on API error without second delete attempt", async () => {
    // Setup isolated environment
    const sandbox = {
      window: {},
      sessionStorage: {
        getItem: (k) => (k === "admin_session_token" ? "mock-token" : null)
      },
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };
    sandbox.window = sandbox;
    sandbox.window.sessionStorage = sandbox.sessionStorage;

    let directClientRemoveCalled = false;
    sandbox.window.SupabaseModule = {
      getClient: () => ({
        storage: {
          from: () => ({
            remove: () => {
              directClientRemoveCalled = true;
              return { data: ["photos/1.jpg"], error: null };
            }
          })
        }
      })
    };

    // Mock fetch to simulate API failure
    sandbox.fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal Error" })
    });

    const vm = require("vm");
    vm.createContext(sandbox);
    vm.runInContext(storageCode, sandbox);

    assert(sandbox.window.StorageModule, "StorageModule must be exported");
    const result = await sandbox.window.StorageModule.deleteMultipleMedia(["photos/test.jpg"]);

    assert.strictEqual(result, false, "Must return false when API fails");
    assert.strictEqual(directClientRemoveCalled, false, "Direct client storage remove MUST NOT be called");
  });

  // ------------------------------------------------------------
  // 2. Serverless API: api/admin-delete-wish.js Batch Limit
  // ------------------------------------------------------------
  const deleteWishModule = await import("../api/admin-delete-wish.js");
  const deleteWishHandler = deleteWishModule.default;

  function createMockRes() {
    return {
      _status: 200,
      _json: null,
      _headers: {},
      setHeader(k, v) { this._headers[k] = v; },
      status(s) { this._status = s; return this; },
      json(j) { this._json = j; return this; },
      end() { return this; }
    };
  }

  await asyncTest("Delete Wish API: Rejects bulk request exceeding 100 items (101 UUIDs)", async () => {
    const oversizedUuids = Array.from({ length: 101 }, (_, i) =>
      `11111111-1111-1111-1111-${String(i + 1).padStart(12, "0")}`
    );

    const req = {
      method: "POST",
      headers: { "x-admin-token": "valid-mock-token" },
      body: { uuids: oversizedUuids }
    };
    const res = createMockRes();

    await deleteWishHandler(req, res);

    assert.strictEqual(res._status, 400, "Must return HTTP 400 for batch > 100");
    assert.strictEqual(res._json.success, false);
    assert.ok(res._json.error.includes("exceeds maximum allowed limit of 100"), "Error must mention 100 limit");
  });

  await asyncTest("Delete Wish API: Allows batch of 100 items (does not reject for size)", async () => {
    const validBatch100 = Array.from({ length: 100 }, (_, i) =>
      `11111111-1111-1111-1111-${String(i + 1).padStart(12, "0")}`
    );

    const req = {
      method: "POST",
      headers: {},
      body: { uuids: validBatch100 }
    };
    const res = createMockRes();

    await deleteWishHandler(req, res);

    // It should proceed to token check (401) or service role check, NOT 400 batch size error
    assert.notStrictEqual(res._status, 400, "100 items must not trigger batch limit error");
    assert.strictEqual(res._status, 401, "Must require session token");
  });

  // ------------------------------------------------------------
  // 3. Serverless API: api/admin-delete-media.js Batch Limit & Rate Limiting
  // ------------------------------------------------------------
  const deleteMediaModule = await import("../api/admin-delete-media.js");
  const deleteMediaHandler = deleteMediaModule.default;

  await asyncTest("Delete Media API: Rejects bulk request exceeding 100 paths (105 paths)", async () => {
    const oversizedPaths = Array.from({ length: 105 }, (_, i) => `photos/image_${i}.jpg`);

    const req = {
      method: "POST",
      headers: { "x-admin-token": "mock-token", "x-forwarded-for": "192.168.1.100" },
      body: { paths: oversizedPaths }
    };
    const res = createMockRes();

    await deleteMediaHandler(req, res);

    assert.strictEqual(res._status, 400, "Must return HTTP 400 for batch > 100");
    assert.strictEqual(res._json.success, false);
    assert.ok(res._json.error.includes("exceeds maximum allowed limit of 100"), "Error must mention 100 limit");
  });

  await asyncTest("Delete Media API: Rate limits client exceeding 30 requests per minute", async () => {
    const testIp = "203.0.113.42";
    let lastRes = null;

    // Send 30 requests within limit
    for (let i = 0; i < 30; i++) {
      const req = {
        method: "POST",
        headers: { "x-forwarded-for": testIp },
        body: { path: "photos/sample.jpg" }
      };
      const res = createMockRes();
      await deleteMediaHandler(req, res);
      lastRes = res;
    }

    // 30th request should pass rate limit (and fail at auth 401 or service key)
    assert.notStrictEqual(lastRes._status, 429, "30th request must not be rate limited");

    // 31st request from same IP must be rate limited with HTTP 429
    const req31 = {
      method: "POST",
      headers: { "x-forwarded-for": testIp },
      body: { path: "photos/sample.jpg" }
    };
    const res31 = createMockRes();
    await deleteMediaHandler(req31, res31);

    assert.strictEqual(res31._status, 429, "31st request must return HTTP 429");
    assert.strictEqual(res31._json.success, false);
    assert.ok(res31._json.error.includes("rate limit exceeded"), "Error message must indicate rate limit");

    // Request from a DIFFERENT IP should NOT be blocked
    const reqDifferentIp = {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.99" },
      body: { path: "photos/sample.jpg" }
    };
    const resDiff = createMockRes();
    await deleteMediaHandler(reqDifferentIp, resDiff);

    assert.notStrictEqual(resDiff._status, 429, "Different IP must not be rate limited");
  });

  // ------------------------------------------------------------
  // 4. Invariant Preservations
  // ------------------------------------------------------------
  await asyncTest("Delete Wish API: Protected system row 00000000-0000-0000-0000-000000000001 is rejected with 403", async () => {
    const req = {
      method: "POST",
      headers: { "x-admin-token": "any-token" },
      body: { uuid: "00000000-0000-0000-0000-000000000001" }
    };
    const res = createMockRes();
    await deleteWishHandler(req, res);

    assert.strictEqual(res._status, 403, "System config row delete must return HTTP 403");
  });

  await asyncTest("Delete Media API: Traversal paths are rejected with 400", async () => {
    const req = {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.101" },
      body: { paths: ["../secrets.json", "photos/../../../etc/passwd", "http://evil.com/a.jpg"] }
    };
    const res = createMockRes();
    await deleteMediaHandler(req, res);

    assert.strictEqual(res._status, 400, "Traversal paths must return HTTP 400");
    assert.ok(res._json.error.includes("No valid storage paths"), "Must reject invalid paths");
  });

  console.log("\n============================================================");
  console.log(`🎉 ALL ${testCount} PHASE 31H-6 DESTRUCTIVE HARDENING TESTS PASSED!`);
  console.log("============================================================\n");
})();
