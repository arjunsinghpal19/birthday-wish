const crypto = require('crypto');
const assert = require('assert');

console.log("Testing Node.js WebAuthn Cryptography...");

// 1. Generate an ECDSA P-256 key pair to simulate an authenticator
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'P-256'
});

const jwk = publicKey.export({ format: 'jwk' });
console.log("JWK generated:", { kty: jwk.kty, crv: jwk.crv, x: jwk.x?.slice(0, 10), y: jwk.y?.slice(0, 10) });

const pubKeyObj = crypto.createPublicKey({ key: jwk, format: 'jwk' });
const pem = pubKeyObj.export({ type: 'spki', format: 'pem' });
console.log("PEM export length:", pem.length);

// 2. Create simulated authenticatorData and clientDataJSON
const rpId = "localhost";
const rpIdHash = crypto.createHash("sha256").update(rpId).digest();
const flags = Buffer.from([0x05]); // UP (0x01) + UV (0x04)
const signCount = Buffer.alloc(4);
signCount.writeUInt32BE(42, 0);
const authData = Buffer.concat([rpIdHash, flags, signCount]);

const clientDataObj = {
  type: "webauthn.get",
  challenge: "test_challenge_12345",
  origin: "http://localhost:3000",
  crossOrigin: false
};
const clientDataJSON = Buffer.from(JSON.stringify(clientDataObj), "utf8");
const clientDataHash = crypto.createHash("sha256").update(clientDataJSON).digest();

const signedData = Buffer.concat([authData, clientDataHash]);

// 3. Sign using private key (ASN.1 DER format, which browser authenticators produce)
const signature = crypto.sign("sha256", signedData, privateKey);

// 4. Verify using public key
const isVerified = crypto.verify("sha256", signedData, pubKeyObj, signature);
console.log("Signature verification result:", isVerified);
assert.strictEqual(isVerified, true, "Signature verification must succeed");

// 5. Tampered signature test
const tamperedSig = Buffer.from(signature);
tamperedSig[tamperedSig.length - 1] ^= 0xff;
const isTamperedVerified = crypto.verify("sha256", signedData, pubKeyObj, tamperedSig);
console.log("Tampered signature verification result:", isTamperedVerified);
assert.strictEqual(isTamperedVerified, false, "Tampered signature must fail");

// 6. Tampered signedData test
const tamperedData = Buffer.from(signedData);
tamperedData[0] ^= 0xff;
const isTamperedDataVerified = crypto.verify("sha256", signedData, pubKeyObj, tamperedSig);
assert.strictEqual(isTamperedDataVerified, false, "Tampered data must fail");

console.log("ALL WEBAUTHN CRYPTO PROOFS PASSED! 🎉");
