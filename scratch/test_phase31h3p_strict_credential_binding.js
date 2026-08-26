const assert = require('assert');
const crypto = require('crypto');

console.log("============================================================");
console.log("🛡️ PROVING STRICT WEBAUTHN CREDENTIAL BINDING SECURITY (ISOLATED)");
console.log("============================================================\n");

// In-memory isolated database state (Completely decoupled from live Supabase!)
let inMemorySecRow = {
  id: "00000000-0000-0000-0000-000000000001",
  admin_password_hash: "mock_password_hash_isolated_uat_2026",
  admin_password_salt: "mock_password_salt_isolated_uat_2026",
  pass_code: "Admin1234!",
  memory_text: JSON.stringify({
    passkeys: [{
      id: "bGVnaXRpbWF0ZS1yZWdpc3RlcmVkLWNyZWQtMQ",
      publicKey: "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBd1aA9MKyH3dcaJn0v7e3nzAIbmq\nWKWZQE2DdnJq3v6knhMIyZaP4WroL+qf0yA1t6qVHoBHNr/HU+ndJiuwQg==\n-----END PUBLIC KEY-----\n"
    }]
  })
};

// Intercept global.fetch for Supabase calls made by api/auth.js
const originalFetch = global.fetch;
global.fetch = async function (url, options = {}) {
  const urlStr = String(url);
  if (urlStr.includes("/rest/v1/wishes")) {
    return {
      ok: true,
      status: 200,
      json: async () => [{ ...inMemorySecRow }]
    };
  }
  return originalFetch ? originalFetch(url, options) : { ok: false, status: 500, json: async () => ({}) };
};

let authHandler = null;

async function getHandler() {
  if (!authHandler) {
    const authMod = await import("../api/auth.js");
    authHandler = authMod.default;
  }
  return authHandler;
}

async function invokeAuth(body, headers = {}) {
  const handler = await getHandler();
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
  await handler(req, res);
  return {
    status: resStatus,
    headers: resHeaders,
    json: async () => resBody,
    body: resBody
  };
}

function createSyntheticAssertion(ecKey, challenge, origin = "http://localhost:3000", rpId = "localhost", signCountNum = 1) {
  const rpIdHash = crypto.createHash("sha256").update(rpId).digest();
  const flags = Buffer.from([0x05]); // UP + UV
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

async function runProof() {
  const testKey = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });

  // Step 1: Request legitimate challenge
  const chRes = await invokeAuth({ action: "passkey-challenge" });
  const chData = await chRes.json();
  assert(chData.success);
  console.log("1. Received legitimate signed challenge.");
  console.log("   Server provided allowCredentials count:", chData.allowCredentials ? chData.allowCredentials.length : 0);

  // Step 2: Attempt authentication with an UNREGISTERED credential ID even with valid signature & challenge
  const fakeCredId = "unregistered-attacker-credential-id-12345";
  const assertion = createSyntheticAssertion(testKey, chData.challenge, "http://localhost:3000", "localhost", 1);

  const authRes = await invokeAuth({
    action: "passkey-verify",
    credentialId: fakeCredId,
    ...assertion
  });

  const authData = await authRes.json();
  console.log("2. Attacker authentication response status:", authRes.status);
  console.log("   Attacker authentication error:", authData.error);

  assert.strictEqual(authRes.status, 401, "Unregistered credential ID must be rejected with HTTP 401");
  assert.strictEqual(authData.valid, false, "valid must be false");
  assert.strictEqual(authData.token, undefined, "Zero admin session token must be issued");
  assert.strictEqual(authData.error, "Unknown or unregistered passkey credential.", "Must explicitly reject unknown credential");

  console.log("\n✅ PROOF COMPLETE: Server strictly requires registered credential match. Zero single-passkey fallback exists!");
}

runProof().catch(err => {
  console.error("❌ PROOF FAILED:", err);
  process.exit(1);
});
