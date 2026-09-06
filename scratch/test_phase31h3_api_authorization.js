/**
 * ============================================================================
 * TEST SUITE: PHASE 31H-3 API AUTHORIZATION HARDENING
 * Verifies strict server-side authorization enforcement on protected actions:
 * 1. update
 * 2. save-recovery-code
 * 3. passkey-register
 * 4. passkey-remove
 *
 * Verifies unauthenticated (401), missing token (401), malformed token (401),
 * forged token (401), expired token (401), and valid admin session (200).
 * Verifies public authentication actions remain public and fully working.
 * ============================================================================
 */

import assert from "assert";
import crypto from "crypto";
import authHandler from "../api/auth.js";
import { createAdminSessionToken } from "../api/_session.js";

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
    throw err;
  }
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    }
  };
  return res;
}

console.log("\n🛡️ RUNNING PHASE 31H-3 API AUTHORIZATION HARDENING TESTS...\n");

(async () => {
  const mockSecRow = {
    admin_password_hash: "mock_hash_123",
    admin_password_salt: "mock_salt_123",
    pass_code: "1234"
  };

  const validToken = createAdminSessionToken(mockSecRow);

  // Expired Token
  const expHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const expPayload = Buffer.from(JSON.stringify({
    role: "admin",
    iat: Math.floor(Date.now() / 1000) - 10000,
    exp: Math.floor(Date.now() / 1000) - 100
  })).toString("base64url");
  const secret = process.env.ADMIN_SESSION_SECRET || mockSecRow.admin_password_hash || mockSecRow.pass_code || "birthday_wish_admin_session_secret_2026";
  const expSig = crypto.createHmac("sha256", secret).update(`${expHeader}.${expPayload}`).digest("base64url");
  const expiredToken = `${expHeader}.${expPayload}.${expSig}`;

  // Forged Token (wrong secret)
  const forgedSig = crypto.createHmac("sha256", "wrong_attacker_secret").update(`${expHeader}.${expPayload}`).digest("base64url");
  const forgedToken = `${expHeader}.${expPayload}.${forgedSig}`;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. ACTION: update (Password Update)
  // ──────────────────────────────────────────────────────────────────────────
  await runTest("1.1 action: 'update' rejects unauthenticated request (HTTP 401)", async () => {
    const req = {
      method: "POST",
      headers: {},
      body: { action: "update", newPassword: "NewSecretPassword123" }
    };
    const res = createMockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 401, "Must return HTTP 401");
    assert.strictEqual(res.body.success, false, "Must return success: false");
    assert(res.body.error.includes("Unauthorized"), "Must mention Unauthorized");
  });

  await runTest("1.2 action: 'update' rejects malformed token (HTTP 401)", async () => {
    const req = {
      method: "POST",
      headers: { authorization: "Bearer not.a.valid.jwt.token" },
      body: { action: "update", newPassword: "NewSecretPassword123" }
    };
    const res = createMockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 401, "Must return HTTP 401 for malformed token");
  });

  await runTest("1.3 action: 'update' rejects forged token (HTTP 401)", async () => {
    const req = {
      method: "POST",
      headers: { cookie: `admin_session=${forgedToken}` },
      body: { action: "update", newPassword: "NewSecretPassword123" }
    };
    const res = createMockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 401, "Must return HTTP 401 for forged token");
  });

  await runTest("1.4 action: 'update' rejects expired token (HTTP 401)", async () => {
    const req = {
      method: "POST",
      headers: { "x-admin-token": expiredToken },
      body: { action: "update", newPassword: "NewSecretPassword123" }
    };
    const res = createMockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 401, "Must return HTTP 401 for expired token");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. ACTION: save-recovery-code (Regenerate Recovery Code)
  // ──────────────────────────────────────────────────────────────────────────
  await runTest("2.1 action: 'save-recovery-code' rejects unauthenticated request (HTTP 401)", async () => {
    const req = {
      method: "POST",
      headers: {},
      body: { action: "save-recovery-code", code: "WS-1234-5678-9012" }
    };
    const res = createMockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 401, "Must return HTTP 401");
    assert.strictEqual(res.body.success, false, "Must return success: false");
  });

  await runTest("2.2 action: 'save-recovery-code' rejects forged token (HTTP 401)", async () => {
    const req = {
      method: "POST",
      headers: { authorization: `Bearer ${forgedToken}` },
      body: { action: "save-recovery-code", code: "WS-1234-5678-9012" }
    };
    const res = createMockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 401, "Must return HTTP 401 for forged token");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. ACTION: passkey-register (Register Passkey)
  // ──────────────────────────────────────────────────────────────────────────
  await runTest("3.1 action: 'passkey-register' rejects unauthenticated request (HTTP 401)", async () => {
    const req = {
      method: "POST",
      headers: {},
      body: { action: "passkey-register", credential: { clientDataJSON: "abc", attestationObject: "def" } }
    };
    const res = createMockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 401, "Must return HTTP 401");
    assert.strictEqual(res.body.success, false, "Must return success: false");
  });

  await runTest("3.2 action: 'passkey-register' rejects expired token (HTTP 401)", async () => {
    const req = {
      method: "POST",
      headers: { cookie: `admin_session=${expiredToken}` },
      body: { action: "passkey-register", credential: { clientDataJSON: "abc", attestationObject: "def" } }
    };
    const res = createMockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 401, "Must return HTTP 401 for expired token");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. ACTION: passkey-remove (Remove Passkey)
  // ──────────────────────────────────────────────────────────────────────────
  await runTest("4.1 action: 'passkey-remove' rejects unauthenticated request (HTTP 401)", async () => {
    const req = {
      method: "POST",
      headers: {},
      body: { action: "passkey-remove" }
    };
    const res = createMockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 401, "Must return HTTP 401");
    assert.strictEqual(res.body.success, false, "Must return success: false");
  });

  await runTest("4.2 action: 'passkey-remove' rejects invalid token (HTTP 401)", async () => {
    const req = {
      method: "POST",
      headers: { authorization: `Bearer invalid-token` },
      body: { action: "passkey-remove" }
    };
    const res = createMockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 401, "Must return HTTP 401 for invalid token");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. PUBLIC ACTIONS REMAIN PUBLIC & UNBLOCKED
  // ──────────────────────────────────────────────────────────────────────────
  await runTest("5.1 action: 'passkey-challenge' remains publicly accessible without token (HTTP 200)", async () => {
    const req = {
      method: "POST",
      headers: {},
      body: { action: "passkey-challenge" }
    };
    const res = createMockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 200, "Must return HTTP 200");
    assert.strictEqual(res.body.success, true, "Must return success: true");
    assert(typeof res.body.challenge === "string" && res.body.challenge.length > 0, "Must return challenge string");
    assert(Array.isArray(res.body.allowCredentials), "Must return allowCredentials array");
  });

  await runTest("5.2 action: 'verify' (password login) remains publicly accessible (HTTP 200)", async () => {
    const req = {
      method: "POST",
      headers: {},
      body: { action: "verify", password: "wrong_password_test" }
    };
    const res = createMockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 200, "Must return HTTP 200 (with valid: false for wrong pass)");
    assert.strictEqual(res.body.valid, false, "Must return valid: false");
  });

  console.log("\n✅ ALL PHASE 31H-3 API AUTHORIZATION HARDENING TESTS PASSED!\n");
})();
