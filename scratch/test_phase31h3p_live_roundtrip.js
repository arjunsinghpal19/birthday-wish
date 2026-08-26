const assert = require('assert');
const crypto = require('crypto');

console.log("============================================================");
console.log("👑 RUNNING ISOLATED WEBAUTHN UAT & REGRESSION SUITE (ZERO DB WRITES)");
console.log("============================================================\n");

// Explicit safety guard: Live destructive mutation tests against shared database are disabled by default.
if (process.argv.includes("--live")) {
  if (process.env.ALLOW_DESTRUCTIVE_AUTH_TESTS !== "true") {
    console.error("❌ SAFETY GUARD: Live destructive mutation tests against shared database are disabled.");
    console.error("   To protect production credentials, WebAuthn tests execute in-memory with zero DB writes.");
    console.error("   Set ALLOW_DESTRUCTIVE_AUTH_TESTS=true only in a dedicated ephemeral sandbox.");
    process.exit(1);
  }
}

// In-memory isolated database state (Completely decoupled from live Supabase!)
let inMemorySecRow = {
  id: "00000000-0000-0000-0000-000000000001",
  admin_password_hash: "mock_password_hash_isolated_uat_2026",
  admin_password_salt: "mock_password_salt_isolated_uat_2026",
  pass_code: "Admin1234!",
  memory_text: JSON.stringify({ passkeys: [] })
};

// Intercept global.fetch for Supabase calls made by api/auth.js
const originalFetch = global.fetch;
global.fetch = async function (url, options = {}) {
  const urlStr = String(url);
  if (urlStr.includes("/rest/v1/wishes")) {
    const method = (options.method || "GET").toUpperCase();
    if (method === "GET") {
      return {
        ok: true,
        status: 200,
        json: async () => [{ ...inMemorySecRow }]
      };
    }
    if (method === "PATCH") {
      const payload = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      inMemorySecRow = { ...inMemorySecRow, ...payload };
      return {
        ok: true,
        status: 200,
        json: async () => [{ ...inMemorySecRow }]
      };
    }
  }
  return originalFetch ? originalFetch(url, options) : { ok: false, status: 500, json: async () => ({}) };
};

let authHandler = null;
let createAdminSessionToken = null;

async function getHandler() {
  if (!authHandler) {
    const authMod = await import("../api/auth.js");
    authHandler = authMod.default;
    const sessionMod = await import("../api/session.js");
    createAdminSessionToken = sessionMod.createAdminSessionToken;
  }
  return { authHandler, createAdminSessionToken };
}

async function invokeAuth(body, headers = {}) {
  const { authHandler } = await getHandler();
  const req = {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body
  };
  let resStatus = 200;
  let resHeaders = {};
  let resBody = null;
  const res = {
    status(code) { resStatus = code; return this; },
    setHeader(key, value) { resHeaders[key.toLowerCase()] = value; return this; },
    json(data) { resBody = data; return this; },
    end() { return this; }
  };
  await authHandler(req, res);
  return {
    status: resStatus,
    headers: resHeaders,
    json: async () => resBody,
    body: resBody
  };
}

function createSyntheticAttestation(ecKey, rpId = "localhost", credIdStr = "cred-uat-1") {
  const ecJwk = ecKey.publicKey.export({ format: 'jwk' });
  const xBuf = Buffer.from(ecJwk.x, 'base64url');
  const yBuf = Buffer.from(ecJwk.y, 'base64url');

  const coseBytes = Buffer.concat([
    Buffer.from([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20]),
    xBuf,
    Buffer.from([0x22, 0x58, 0x20]),
    yBuf
  ]);

  const rpHash = crypto.createHash("sha256").update(rpId).digest();
  const flagsBuf = Buffer.from([0x45]); // UP + UV + AT
  const signCountBuf = Buffer.alloc(4);
  const aaguidBuf = Buffer.alloc(16, 0);
  const credIdBytes = Buffer.from(credIdStr);
  const credIdLenBuf = Buffer.alloc(2);
  credIdLenBuf.writeUInt16BE(credIdBytes.length, 0);

  const authData = Buffer.concat([
    rpHash,
    flagsBuf,
    signCountBuf,
    aaguidBuf,
    credIdLenBuf,
    credIdBytes,
    coseBytes
  ]);

  const lenAuth = authData.length;
  const header = Buffer.from([
    0xa3,
    0x63, 0x66, 0x6d, 0x74, // "fmt"
    0x64, 0x6e, 0x6f, 0x6e, 0x65, // "none"
    0x67, 0x61, 0x74, 0x74, 0x53, 0x74, 0x6d, 0x74, // "attStmt"
    0xa0, // empty map
    0x68, 0x61, 0x75, 0x74, 0x68, 0x44, 0x61, 0x74, 0x61, // "authData"
    0x59, (lenAuth >> 8) & 0xff, lenAuth & 0xff // byte string with 2-byte len
  ]);
  return Buffer.concat([header, authData]);
}

function createSyntheticAssertion(ecKey, challenge, origin = "http://localhost:3000", rpId = "localhost", signCountNum = 1) {
  const rpIdHash = crypto.createHash("sha256").update(rpId).digest();
  const flags = Buffer.from([0x05]); // UP (1) + UV (4)
  const signCount = Buffer.alloc(4);
  signCount.writeUInt32BE(signCountNum, 0);
  const authData = Buffer.concat([rpIdHash, flags, signCount]);

  const clientDataObj = {
    type: "webauthn.get",
    challenge: challenge,
    origin: origin,
    crossOrigin: false
  };
  const clientDataJSON = Buffer.from(JSON.stringify(clientDataObj), "utf8");
  const clientDataHash = crypto.createHash("sha256").update(clientDataJSON).digest();
  const signedData = Buffer.concat([authData, clientDataHash]);

  const signature = crypto.sign("sha256", signedData, ecKey.privateKey);

  return {
    clientDataJSON: clientDataJSON.toString("base64url"),
    authenticatorData: authData.toString("base64url"),
    signature: signature.toString("base64url")
  };
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ FAIL: ${name}: ${e.message}`);
    failed++;
  }
}

async function runLiveUat() {
  const testKey1 = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const testKey2 = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const credId1 = "cred-uat-primary-passkey";
  const credId2 = "cred-uat-secondary-passkey";

  const { createAdminSessionToken: createToken } = await getHandler();
  const token = createToken(inMemorySecRow);

  // TEST 1: Admin Registration
  await test("TEST 1: Admin Passkey Registration round-trip (Challenge -> Biometric -> Register HTTP 200)", async () => {
    const chRes = await invokeAuth({ action: "passkey-challenge" });
    assert.strictEqual(chRes.status, 200);
    const chData = await chRes.json();
    assert(chData.success);
    assert.strictEqual(chData.challenge.length, 75);

    const attBuf = createSyntheticAttestation(testKey1, "localhost", credId1);
    const clientDataObj = { type: "webauthn.create", challenge: chData.challenge, origin: "http://localhost:3000" };
    const clientDataJSON = Buffer.from(JSON.stringify(clientDataObj)).toString("base64url");

    const regRes = await invokeAuth({
      action: "passkey-register",
      credential: {
        id: Buffer.from(credId1).toString("base64url"),
        rawId: Buffer.from(credId1).toString("base64url"),
        clientDataJSON,
        attestationObject: attBuf.toString("base64url")
      }
    }, { "x-admin-token": token });

    assert.strictEqual(regRes.status, 200);
    const regData = await regRes.json();
    assert(regData.success);
  });

  // TEST 2: Quick Editor Authentication
  await test("TEST 2: Quick Editor Authentication round-trip (Challenge -> Assertion -> Verify HTTP 200 + Admin Session)", async () => {
    const chRes = await invokeAuth({ action: "passkey-challenge" });
    const chData = await chRes.json();

    const assertion = createSyntheticAssertion(testKey1, chData.challenge, "http://localhost:3000", "localhost", 1);
    const authRes = await invokeAuth({
      action: "passkey-verify",
      credentialId: Buffer.from(credId1).toString("base64url"),
      ...assertion
    });
    assert.strictEqual(authRes.status, 200);
    const authData = await authRes.json();
    assert(authData.valid && authData.success);
    assert(typeof authData.token === "string" && authData.token.length > 20);
  });

  // TEST 3: Passkey Removal
  await test("TEST 3: Passkey Removal (passkey-remove HTTP 200 -> Subsequent auth rejected HTTP 401)", async () => {
    const remRes = await invokeAuth({ action: "passkey-remove" }, { "x-admin-token": token });
    assert.strictEqual(remRes.status, 200);

    const chRes = await invokeAuth({ action: "passkey-challenge" });
    const chData = await chRes.json();
    const assertion = createSyntheticAssertion(testKey1, chData.challenge, "http://localhost:3000", "localhost", 2);

    const postAuthRes = await invokeAuth({
      action: "passkey-verify",
      credentialId: Buffer.from(credId1).toString("base64url"),
      ...assertion
    });
    assert.strictEqual(postAuthRes.status, 401);
  });

  // TEST 4: Re-register
  await test("TEST 4: Re-registration succeeds with fresh keypair", async () => {
    const chRes = await invokeAuth({ action: "passkey-challenge" });
    const chData = await chRes.json();

    const attBuf = createSyntheticAttestation(testKey2, "localhost", credId2);
    const clientDataObj = { type: "webauthn.create", challenge: chData.challenge, origin: "http://localhost:3000" };
    const clientDataJSON = Buffer.from(JSON.stringify(clientDataObj)).toString("base64url");

    const regRes = await invokeAuth({
      action: "passkey-register",
      credential: {
        id: Buffer.from(credId2).toString("base64url"),
        rawId: Buffer.from(credId2).toString("base64url"),
        clientDataJSON,
        attestationObject: attBuf.toString("base64url")
      }
    }, { "x-admin-token": token });
    assert.strictEqual(regRes.status, 200);
  });

  // TEST 5: Multi-tab concurrency
  await test("TEST 5: Multi-Tab Concurrency (Challenge A and Challenge B do not invalidate each other)", async () => {
    const chResA = await invokeAuth({ action: "passkey-challenge" });
    const chDataA = await chResA.json();

    const chResB = await invokeAuth({ action: "passkey-challenge" });
    const chDataB = await chResB.json();

    // Challenge A can still be used to authenticate Tab A
    const assertionA = createSyntheticAssertion(testKey2, chDataA.challenge, "http://localhost:3000", "localhost", 3);
    const authResA = await invokeAuth({
      action: "passkey-verify",
      credentialId: Buffer.from(credId2).toString("base64url"),
      ...assertionA
    });
    assert.strictEqual(authResA.status, 200);

    // Challenge B can also still be used to authenticate Tab B
    const assertionB = createSyntheticAssertion(testKey2, chDataB.challenge, "http://localhost:3000", "localhost", 4);
    const authResB = await invokeAuth({
      action: "passkey-verify",
      credentialId: Buffer.from(credId2).toString("base64url"),
      ...assertionB
    });
    assert.strictEqual(authResB.status, 200);
  });

  // TEST 6: Incognito / Normal Isolation
  await test("TEST 6: Incognito / Normal Isolation (Zero cross-IP collision)", async () => {
    const chNormal = await (await invokeAuth({ action: "passkey-challenge" }, { "x-forwarded-for": "127.0.0.1" })).json();
    const chIncognito = await (await invokeAuth({ action: "passkey-challenge" }, { "x-forwarded-for": "127.0.0.1" })).json();

    assert.notStrictEqual(chNormal.challenge, chIncognito.challenge);
  });

  // TEST 7: Expired challenge rejected
  await test("TEST 7: Expired Challenge Rejected (Generated with past timestamp)", async () => {
    const nonce = crypto.randomBytes(16);
    const expBuf = Buffer.alloc(8);
    expBuf.writeBigUInt64BE(BigInt(Date.now() - 10000)); // 10s ago
    const dataToSign = Buffer.concat([nonce, expBuf]);

    // Construct an expired clientDataJSON
    const expiredChallenge = Buffer.concat([dataToSign, crypto.createHash("sha256").update(dataToSign).digest()]).toString("base64url");
    const assertion = createSyntheticAssertion(testKey2, expiredChallenge, "http://localhost:3000", "localhost", 5);

    const authRes = await invokeAuth({
      action: "passkey-verify",
      credentialId: Buffer.from(credId2).toString("base64url"),
      ...assertion
    });
    assert.strictEqual(authRes.status, 400);
  });

  // TEST 8: Tampered Nonce / Expiration / HMAC Rejected
  await test("TEST 8: Tampered Challenge Rejected", async () => {
    const chRes = await invokeAuth({ action: "passkey-challenge" });
    const chData = await chRes.json();

    const buf = Buffer.from(chData.challenge, "base64url");
    buf[10] ^= 0xff; // Tamper
    const tamperedCh = buf.toString("base64url");

    const assertion = createSyntheticAssertion(testKey2, tamperedCh, "http://localhost:3000", "localhost", 6);
    const authRes = await invokeAuth({
      action: "passkey-verify",
      credentialId: Buffer.from(credId2).toString("base64url"),
      ...assertion
    });
    assert.strictEqual(authRes.status, 400);
  });

  console.log("\n============================================================");
  console.log(`ISOLATED UAT RESULTS: ${passed} PASSED, ${failed} FAILED (ZERO LIVE SUPABASE MUTATIONS)`);
  console.log("============================================================\n");

  if (failed > 0) process.exit(1);
}

runLiveUat();
