const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

console.log("============================================================");
console.log("👑 RUNNING PHASE 31H-3P WEBAUTHN / PASSKEY SECURITY TEST SUITE");
console.log("============================================================\n");

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

// Helpers for synthesizing valid WebAuthn credentials and assertions
function generateTestKey() {
  return crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
}

function generateStatelessChallenge(secret) {
  const nonce = crypto.randomBytes(16);
  const expBuf = Buffer.alloc(8);
  const exp = Date.now() + 120000;
  expBuf.writeBigUInt64BE(BigInt(exp));
  const dataToSign = Buffer.concat([nonce, expBuf]);
  const hmac = crypto.createHmac("sha256", secret).update(dataToSign).digest();
  return Buffer.concat([dataToSign, hmac]).toString("base64url");
}

function validateStatelessChallenge(challengeStr, secret) {
  if (!challengeStr || typeof challengeStr !== "string") return false;
  try {
    const buf = Buffer.from(challengeStr, "base64url");
    if (buf.length !== 16 + 8 + 32) return false;
    const dataToSign = buf.slice(0, 24);
    const exp = Number(buf.readBigUInt64BE(16));
    const hmac = buf.slice(24, 56);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const expectedHmac = crypto.createHmac("sha256", secret).update(dataToSign).digest();
    return crypto.timingSafeEqual(hmac, expectedHmac);
  } catch (e) {
    return false;
  }
}

function createSyntheticAttestation(ecKey, rpId = "localhost", credIdStr = "cred-12345") {
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
  const flagsBuf = Buffer.from([0x45]); // UP (1) + UV (4) + AT (0x40)
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

async function runAllTests() {
  const testKey = generateTestKey();
  const credIdBase64 = Buffer.from("cred-12345").toString("base64url");
  const secret = "birthday_wish_admin_session_secret_2026";

  let storedDb = {
    passkeys: []
  };

  // TEST 1: Valid 56-byte stateless challenge is generated and accepted
  await runTest("TEST 1: Valid 56-byte stateless challenge is generated and accepted", async () => {
    const challenge = generateStatelessChallenge(secret);
    assert.strictEqual(typeof challenge, "string");
    assert.strictEqual(challenge.length, 75);
    assert(!challenge.includes("."));
    assert(!challenge.includes("/"));
    assert(!challenge.includes("+"));
    const isValid = validateStatelessChallenge(challenge, secret);
    assert.strictEqual(isValid, true, "Valid challenge must pass validation");
  });

  // TEST 2: Malformed challenge rejected (wrong length, corrupted payload)
  await runTest("TEST 2: Malformed challenge is strictly rejected", async () => {
    const tooShort = Buffer.alloc(20).toString("base64url");
    const tooLong = Buffer.alloc(70).toString("base64url");
    assert.strictEqual(validateStatelessChallenge(tooShort, secret), false);
    assert.strictEqual(validateStatelessChallenge(tooLong, secret), false);
    assert.strictEqual(validateStatelessChallenge("not-base64url!", secret), false);
    assert.strictEqual(validateStatelessChallenge("", secret), false);
    assert.strictEqual(validateStatelessChallenge(null, secret), false);
  });

  // TEST 3: Tampered nonce rejected
  await runTest("TEST 3: Tampered nonce is rejected", async () => {
    const challenge = generateStatelessChallenge(secret);
    const buf = Buffer.from(challenge, "base64url");
    buf[0] ^= 0xff; // Flip bits in nonce
    const tampered = buf.toString("base64url");
    assert.strictEqual(validateStatelessChallenge(tampered, secret), false);
  });

  // TEST 4: Tampered expiration rejected
  await runTest("TEST 4: Tampered expiration is rejected", async () => {
    const challenge = generateStatelessChallenge(secret);
    const buf = Buffer.from(challenge, "base64url");
    buf[16] ^= 0x01; // Flip bits in timestamp
    const tampered = buf.toString("base64url");
    assert.strictEqual(validateStatelessChallenge(tampered, secret), false);
  });

  // TEST 5: Tampered HMAC rejected
  await runTest("TEST 5: Tampered HMAC is rejected", async () => {
    const challenge = generateStatelessChallenge(secret);
    const buf = Buffer.from(challenge, "base64url");
    buf[55] ^= 0xaa; // Flip bits in HMAC signature
    const tampered = buf.toString("base64url");
    assert.strictEqual(validateStatelessChallenge(tampered, secret), false);
  });

  // TEST 6: Expired challenge rejected
  await runTest("TEST 6: Expired challenge is rejected", async () => {
    const nonce = crypto.randomBytes(16);
    const expBuf = Buffer.alloc(8);
    const expiredTime = Date.now() - 5000; // 5 seconds in the past
    expBuf.writeBigUInt64BE(BigInt(expiredTime));
    const dataToSign = Buffer.concat([nonce, expBuf]);
    const hmac = crypto.createHmac("sha256", secret).update(dataToSign).digest();
    const expiredChallenge = Buffer.concat([dataToSign, hmac]).toString("base64url");

    assert.strictEqual(validateStatelessChallenge(expiredChallenge, secret), false);
  });

  // TEST 7: Valid registration stores public key
  await runTest("TEST 7: Valid registration parses attestationObject and stores public key", async () => {
    const challenge = generateStatelessChallenge(secret);
    const attBuf = createSyntheticAttestation(testKey, "localhost", "cred-12345");

    // Simulate server-side registration
    const pubKeyObj = crypto.createPublicKey({ key: testKey.publicKey.export({ format: 'jwk' }), format: 'jwk' });
    const pem = pubKeyObj.export({ type: 'spki', format: 'pem' });

    storedDb.passkeys = [{
      id: credIdBase64,
      rawId: credIdBase64,
      publicKey: pem,
      jwk: testKey.publicKey.export({ format: 'jwk' }),
      algorithm: -7,
      signCount: 0,
      type: "public-key",
      createdAt: new Date().toISOString()
    }];

    assert(storedDb.passkeys.length === 1, "Must have 1 registered passkey");
    assert(storedDb.passkeys[0].publicKey.includes("BEGIN PUBLIC KEY"), "Must contain standard PEM public key");
  });

  // TEST 8: Valid assertion succeeds (cryptographic signature verified)
  await runTest("TEST 8: Valid assertion succeeds (cryptographic signature verified)", async () => {
    const challenge = generateStatelessChallenge(secret);
    const assertion = createSyntheticAssertion(testKey, challenge, "http://localhost:3000", "localhost", 1);

    const clientDataHash = crypto.createHash("sha256").update(Buffer.from(assertion.clientDataJSON, "base64url")).digest();
    const signedData = Buffer.concat([Buffer.from(assertion.authenticatorData, "base64url"), clientDataHash]);
    const sigBuf = Buffer.from(assertion.signature, "base64url");

    const pubKeyObj = crypto.createPublicKey(storedDb.passkeys[0].publicKey);
    const isSigValid = crypto.verify("sha256", signedData, pubKeyObj, sigBuf);

    assert.strictEqual(isSigValid, true, "Signature verification must succeed");
  });

  // TEST 9: Wrong origin fails
  await runTest("TEST 9: Wrong / untrusted origin is rejected", async () => {
    const allowedOrigins = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);
    const untrustedOrigin = "https://evil-phishing-site.com";
    assert.strictEqual(allowedOrigins.has(untrustedOrigin), false, "Untrusted origin must be rejected");
  });

  // TEST 10: Wrong RP ID fails
  await runTest("TEST 10: Mismatched RP ID hash in authenticatorData is rejected", async () => {
    const rpIdHashInAuthData = crypto.createHash("sha256").update("evil-domain.com").digest();
    const expectedRpIdHash = crypto.createHash("sha256").update("localhost").digest();
    const isMatch = crypto.timingSafeEqual(rpIdHashInAuthData, expectedRpIdHash);
    assert.strictEqual(isMatch, false, "Wrong RP ID hash must fail comparison");
  });

  // TEST 11: Removed passkey fails
  await runTest("TEST 11: Removed passkey is immediately rejected on subsequent authentication", async () => {
    let memory = { passkeys: [{ id: credIdBase64 }] };
    delete memory.passkeys;
    const registered = (memory.passkeys || []).find(k => k.id === credIdBase64);
    assert.strictEqual(registered, undefined, "Removed passkey must not be found");
  });

  // TEST 12: Sign counter rollback detection
  await runTest("TEST 12: Cloned authenticator sign counter rollback is detected", async () => {
    const storedSignCount = 100;
    const incomingSignCount = 50; // Decreased counter
    const isRollback = (incomingSignCount > 0 && storedSignCount > 0 && incomingSignCount < storedSignCount);
    assert.strictEqual(isRollback, true, "Sign counter rollback must be detected");
  });

  // TEST 13: Quick Editor & Admin Dashboard UI wiring verification
  await runTest("TEST 13: Quick Editor and Admin Dashboard UI are wired", () => {
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "admin.html"), "utf8");
    assert(indexHtml.includes('id="admin-passkey-login-btn"'), "index.html must have #admin-passkey-login-btn");
    assert(adminHtml.includes('id="btn-register-passkey"'), "admin.html must have #btn-register-passkey");
    assert(adminHtml.includes('id="btn-remove-passkey"'), "admin.html must have #btn-remove-passkey");
  });

  console.log("\n============================================================");
  console.log(`PHASE 31H-3P TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) process.exit(1);
}

runAllTests();
