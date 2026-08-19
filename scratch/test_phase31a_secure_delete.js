/**
 * ============================================================================
 * PHASE 31A SECURE DELETE TEST SUITE
 * Validates cryptographic HMAC-SHA256 admin session token creation & verification,
 * serverless /api/admin-delete-wish endpoint security, rejection of unauthenticated
 * requests, protection of system configuration UUID, zero Storage deletions,
 * and preservation of duplicate wish functionality.
 * ============================================================================
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("🔒 STARTING PHASE 31A SECURE DELETE & SESSION TEST SUITE");
console.log("============================================================");

// Setup lightweight DOM and Browser mock environment
globalThis.window = globalThis;
globalThis.document = {
  getElementById: (id) => null,
  querySelectorAll: (selector) => [],
  addEventListener: () => {}
};
let mockSessionStorage = {
  "admin_authenticated": "true",
  "admin_session_token": ""
};
globalThis.sessionStorage = {
  getItem: (key) => mockSessionStorage[key] || null,
  setItem: (key, val) => { mockSessionStorage[key] = String(val); },
  removeItem: (key) => { delete mockSessionStorage[key]; }
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

// Storage Safety Spy
let storageDeleteCalled = false;
globalThis.StorageModule = {
  deleteMedia: () => {
    storageDeleteCalled = true;
    return Promise.resolve(true);
  },
  deleteMultipleMedia: () => {
    storageDeleteCalled = true;
    return Promise.resolve(true);
  }
};

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

(async function runAllTests() {
  // ------------------------------------------------------------
  // 1. Session Token Engine (api/session.js)
  // ------------------------------------------------------------
  const sessionModule = await import("../api/session.js");
  assert(sessionModule.createAdminSessionToken, "createAdminSessionToken must be exported");
  assert(sessionModule.verifyAdminSessionToken, "verifyAdminSessionToken must be exported");

  const mockSecRow = {
    admin_password_hash: "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3",
    pass_code: "1234"
  };

  test("Session Token: Generates cryptographically signed 3-part token", () => {
    const token = sessionModule.createAdminSessionToken(mockSecRow);
    assert(typeof token === "string", "Token must be a string");
    const parts = token.split(".");
    assert.strictEqual(parts.length, 3, "Token must have header.payload.signature format");
  });

  test("Session Token: Verifies valid token successfully", () => {
    const token = sessionModule.createAdminSessionToken(mockSecRow);
    const isValid = sessionModule.verifyAdminSessionToken(token, mockSecRow);
    assert.strictEqual(isValid, true, "Valid token must verify as true");
  });

  test("Session Token: Rejects tampered signature or invalid token", () => {
    const token = sessionModule.createAdminSessionToken(mockSecRow);
    const tampered = token.slice(0, -4) + "XXXX";
    assert.strictEqual(sessionModule.verifyAdminSessionToken(tampered, mockSecRow), false, "Tampered token must fail verification");
    assert.strictEqual(sessionModule.verifyAdminSessionToken("invalid.token", mockSecRow), false, "Malformed token must fail");
    assert.strictEqual(sessionModule.verifyAdminSessionToken(null, mockSecRow), false, "Null token must fail");
  });

  test("Session Token: Rejects token signed with different secret/row", () => {
    const token = sessionModule.createAdminSessionToken(mockSecRow);
    const differentSecRow = { admin_password_hash: "different_hash_12345" };
    assert.strictEqual(sessionModule.verifyAdminSessionToken(token, differentSecRow), false, "Different secret token must fail verification");
  });

  // ------------------------------------------------------------
  // 2. Serverless Admin Delete API (api/admin-delete-wish.js)
  // ------------------------------------------------------------
  const deleteApiHandler = (await import("../api/admin-delete-wish.js")).default;
  assert(typeof deleteApiHandler === "function", "Admin Delete API handler must be a function");

  function createMockRes() {
    return {
      statusCode: 200,
      headers: {},
      body: null,
      setHeader(k, v) { this.headers[k] = v; },
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; },
      end() { return this; }
    };
  }

  // Mock global fetch for backend Supabase queries
  let backendDeletedUuid = null;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, opts = {}) => {
    const urlStr = String(url);

    // Fetch security row
    if (urlStr.includes("00000000-0000-0000-0000-000000000001") && (!opts.method || opts.method === "GET")) {
      return {
        ok: true,
        status: 200,
        json: async () => [mockSecRow]
      };
    }

    // Privileged Supabase DELETE
    if (opts.method === "DELETE") {
      const match = urlStr.match(/id=eq\.([^&]+)/);
      if (match) {
        backendDeletedUuid = decodeURIComponent(match[1]);
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true })
      };
    }

    return { ok: false, status: 404, text: async () => "Not found" };
  };

  // Ensure service role key is set for test baseline
  process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_role_secret_key_999";

  test("Serverless API: Source inspection confirms ZERO anon key references in admin-delete-wish.js", () => {
    const apiCode = fs.readFileSync(path.join(__dirname, "../api/admin-delete-wish.js"), "utf8");
    assert(!apiCode.includes("SUPABASE_ANON_KEY"), "admin-delete-wish.js must NOT reference SUPABASE_ANON_KEY");
    assert(!apiCode.includes("sb_publishable_"), "admin-delete-wish.js must NOT contain hardcoded publishable/anon key");
    assert(apiCode.includes("SUPABASE_SERVICE_ROLE_KEY"), "admin-delete-wish.js must reference SUPABASE_SERVICE_ROLE_KEY");
  });

  test("Local Env: loadLocalEnv loads SUPABASE_SERVICE_ROLE_KEY from .env.local if not present in process.env", () => {
    const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    sessionModule.loadLocalEnv();
    assert(process.env.SUPABASE_SERVICE_ROLE_KEY, "loadLocalEnv must load SUPABASE_SERVICE_ROLE_KEY from .env.local");

    process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
  });

  await asyncTest("Serverless API: Returns HTTP 500 if SUPABASE_SERVICE_ROLE_KEY is completely missing", async () => {
    const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const origCwd = process.cwd;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.cwd = () => path.join(__dirname, "empty_dir_mock");

    const token = sessionModule.createAdminSessionToken(mockSecRow);
    const req = {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: { uuid: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d" }
    };
    const res = createMockRes();
    await deleteApiHandler(req, res);

    assert.strictEqual(res.statusCode, 500, "Missing service_role key must return HTTP 500");
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, "Server delete configuration unavailable.");

    process.cwd = origCwd;
    process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
  });

  await asyncTest("Serverless API: Rejects unauthenticated request without admin token with 401", async () => {
    const req = {
      method: "POST",
      headers: {},
      body: { uuid: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d" }
    };
    const res = createMockRes();
    await deleteApiHandler(req, res);

    assert.strictEqual(res.statusCode, 401, "Unauthenticated request must return HTTP 401");
    assert.strictEqual(res.body.success, false);
    assert(res.body.error.includes("Unauthorized"), "Error message must indicate unauthorized");
  });

  await asyncTest("Serverless API: Rejects invalid or missing UUID format with 400", async () => {
    const token = sessionModule.createAdminSessionToken(mockSecRow);
    const req = {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: { uuid: "invalid-uuid-format" }
    };
    const res = createMockRes();
    await deleteApiHandler(req, res);

    assert.strictEqual(res.statusCode, 400, "Malformed UUID must return HTTP 400");
    assert.strictEqual(res.body.success, false);
  });

  await asyncTest("Serverless API: Strictly rejects protected system configuration UUID with 403", async () => {
    const token = sessionModule.createAdminSessionToken(mockSecRow);
    const req = {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: { uuid: "00000000-0000-0000-0000-000000000001" }
    };
    const res = createMockRes();
    await deleteApiHandler(req, res);

    assert.strictEqual(res.statusCode, 403, "System configuration UUID deletion must return HTTP 403");
    assert.strictEqual(res.body.success, false);
    assert(res.body.error.includes("protected system configuration"), "Error must clearly identify protected system record");
  });

  await asyncTest("Serverless API: Authorizes valid admin session and executes Supabase DELETE with service_role key", async () => {
    backendDeletedUuid = null;
    let usedAuthKey = null;

    const prevFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts = {}) => {
      const urlStr = String(url);
      usedAuthKey = opts.headers && opts.headers.apikey;

      if (urlStr.includes("00000000-0000-0000-0000-000000000001") && (!opts.method || opts.method === "GET")) {
        return { ok: true, status: 200, json: async () => [mockSecRow] };
      }
      if (opts.method === "DELETE") {
        const match = urlStr.match(/id=eq\.([^&]+)/);
        if (match) backendDeletedUuid = decodeURIComponent(match[1]);
        return { ok: true, status: 200, text: async () => JSON.stringify({ success: true }) };
      }
      return { ok: false, status: 404, text: async () => "Not found" };
    };

    const targetUuid = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d";
    const token = sessionModule.createAdminSessionToken(mockSecRow);
    const req = {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: { uuid: targetUuid }
    };
    const res = createMockRes();
    await deleteApiHandler(req, res);

    assert.strictEqual(res.statusCode, 200, "Authorized admin delete must return HTTP 200");
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(backendDeletedUuid, targetUuid, "Supabase DELETE must be called for target UUID");
    assert.strictEqual(usedAuthKey, process.env.SUPABASE_SERVICE_ROLE_KEY, "Must use SUPABASE_SERVICE_ROLE_KEY for Supabase queries");

    globalThis.fetch = prevFetch;
  });

  // ------------------------------------------------------------
  // 3. DatabaseModule Client Integration
  // ------------------------------------------------------------
  require(path.join(__dirname, "../js/database.js"));
  const dbModule = globalThis.DatabaseModule;
  assert(dbModule, "DatabaseModule must be loaded");

  // Restore fetch to intercept client calls and route nested API/Supabase calls
  globalThis.fetch = async (url, opts = {}) => {
    const urlStr = String(url);
    if (urlStr.includes("/api/admin-delete-wish")) {
      const parsedBody = JSON.parse(opts.body || "{}");
      const req = {
        method: "POST",
        headers: opts.headers || {},
        body: parsedBody
      };
      const res = createMockRes();
      await deleteApiHandler(req, res);
      return {
        ok: res.statusCode === 200,
        status: res.statusCode,
        json: async () => res.body,
        text: async () => JSON.stringify(res.body)
      };
    }

    // Fetch security row
    if (urlStr.includes("00000000-0000-0000-0000-000000000001") && (!opts.method || opts.method === "GET")) {
      return {
        ok: true,
        status: 200,
        json: async () => [mockSecRow]
      };
    }

    // Privileged Supabase DELETE
    if (opts.method === "DELETE") {
      const match = urlStr.match(/id=eq\.([^&]+)/);
      if (match) {
        backendDeletedUuid = decodeURIComponent(match[1]);
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true })
      };
    }

    return originalFetch ? originalFetch(url, opts) : { ok: false };
  };

  await asyncTest("DatabaseModule.deleteWish dispatches to secure serverless API and succeeds", async () => {
    const validToken = sessionModule.createAdminSessionToken(mockSecRow);
    mockSessionStorage["admin_session_token"] = validToken;
    storageDeleteCalled = false;

    const targetWishId = "e5f6a1b2-c3d4-4a5b-8c9d-0e1f2a3b4c5d";
    const res = await dbModule.deleteWish(targetWishId);

    assert.strictEqual(res.success, true, "Delete should succeed through secure API");
    assert.strictEqual(backendDeletedUuid, targetWishId, "Backend must have deleted target ID");
    assert.strictEqual(storageDeleteCalled, false, "StorageModule.deleteMedia must NEVER be called");
  });

  await asyncTest("DatabaseModule.deleteWish returns clear error when API returns 404 without falling back to anon delete", async () => {
    // Override fetch to return 404
    const prevFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });

    const res = await dbModule.deleteWish("e5f6a1b2-c3d4-4a5b-8c9d-0e1f2a3b4c5d");
    assert.strictEqual(res.success, false);
    assert(
      res.error.includes("Secure Admin Delete API unavailable"),
      `Error must indicate API runtime requirement (received: ${res.error})`
    );

    globalThis.fetch = prevFetch;
  });

  await asyncTest("DatabaseModule.deleteWish returns clear error when API network fails without falling back to anon delete", async () => {
    // Override fetch to throw network error
    const prevFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error("Failed to fetch"); };

    const res = await dbModule.deleteWish("e5f6a1b2-c3d4-4a5b-8c9d-0e1f2a3b4c5d");
    assert.strictEqual(res.success, false);
    assert(
      res.error.includes("Secure Admin Delete API unavailable"),
      `Error must indicate API runtime requirement (received: ${res.error})`
    );

    globalThis.fetch = prevFetch;
  });

  await asyncTest("DatabaseModule.deleteWish rejects system configuration UUID at client level", async () => {
    const res = await dbModule.deleteWish("00000000-0000-0000-0000-000000000001");
    assert.strictEqual(res.success, false, "System configuration UUID must be rejected");
    assert(res.error.includes("system configuration"), "Error message must state system protection");
  });

  // ------------------------------------------------------------
  // 4. Source Inspection Security Checks
  // ------------------------------------------------------------
  test("Security Check: database.js does NOT contain direct client-side .delete() fallback", () => {
    const dbCode = fs.readFileSync(path.join(__dirname, "../js/database.js"), "utf8");
    assert(!dbCode.includes('.from(TABLE_NAME).delete()') && !dbCode.includes('.from("wishes").delete()'), "database.js must NOT contain client-side delete calls on wishes table");
  });
  test("Security Check: Frontend JS does not contain service_role keys", () => {
    const jsDir = path.join(__dirname, "../js");
    const scanDir = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith(".js")) {
          const content = fs.readFileSync(fullPath, "utf8");
          assert(!content.includes("service_role"), `File ${file} must NOT contain service_role key`);
        }
      }
    };
    scanDir(jsDir);
  });

  test("Security Check: DatabaseModule.duplicateWish remains functional and intact", () => {
    assert.strictEqual(typeof dbModule.duplicateWish, "function", "duplicateWish must remain intact");
  });

  console.log("\n============================================================");
  console.log(`🎉 ALL ${testCount} PHASE 31A SECURE DELETE TESTS PASSED!`);
  console.log("============================================================\n");
})();
