const crypto = require('crypto');
const assert = require('assert');

/**
 * Lightweight, robust WebAuthn CBOR & COSE decoder
 * Zero external dependencies — purely native Node.js Buffer & TypedArray operations.
 */
function decodeCbor(buffer) {
  let offset = 0;

  function readUInt8() {
    if (offset >= buffer.length) throw new Error("Unexpected end of CBOR buffer");
    return buffer[offset++];
  }

  function readBuffer(len) {
    if (offset + len > buffer.length) throw new Error("Unexpected end of CBOR buffer");
    const sub = buffer.slice(offset, offset + len);
    offset += len;
    return sub;
  }

  function readLength(extra) {
    if (extra < 24) return extra;
    if (extra === 24) return readUInt8();
    if (extra === 25) {
      const b = readBuffer(2);
      return b.readUInt16BE(0);
    }
    if (extra === 26) {
      const b = readBuffer(4);
      return b.readUInt32BE(0);
    }
    if (extra === 27) {
      const b = readBuffer(8);
      return Number(b.readBigUInt64BE(0));
    }
    throw new Error(`Unsupported CBOR length indicator: ${extra}`);
  }

  function decodeItem() {
    const initial = readUInt8();
    const majorType = initial >> 5;
    const extra = initial & 0x1f;

    switch (majorType) {
      case 0: // Unsigned integer
        return readLength(extra);
      case 1: // Negative integer
        return -1 - readLength(extra);
      case 2: { // Byte string
        const len = readLength(extra);
        return readBuffer(len);
      }
      case 3: { // Text string
        const len = readLength(extra);
        return readBuffer(len).toString("utf8");
      }
      case 4: { // Array
        const len = readLength(extra);
        const arr = [];
        for (let i = 0; i < len; i++) arr.push(decodeItem());
        return arr;
      }
      case 5: { // Map
        const len = readLength(extra);
        const map = new Map();
        for (let i = 0; i < len; i++) {
          const key = decodeItem();
          const val = decodeItem();
          map.set(key, val);
        }
        return map;
      }
      case 7: { // Simple / Float
        if (extra === 20) return false;
        if (extra === 21) return true;
        if (extra === 22) return null;
        if (extra === 23) return undefined;
        return extra;
      }
      default:
        throw new Error(`Unsupported CBOR major type: ${majorType}`);
    }
  }

  return decodeItem();
}

/**
 * Extracts public key and credential metadata from WebAuthn attestationObject
 */
function parseAttestationObject(attestationBuffer) {
  const attestation = decodeCbor(attestationBuffer);
  const authData = attestation.get("authData");
  if (!authData || !(authData instanceof Buffer || authData instanceof Uint8Array)) {
    throw new Error("Invalid attestationObject: missing authData");
  }

  const rpIdHash = authData.slice(0, 32);
  const flags = authData[32];
  const up = !!(flags & 0x01);
  const uv = !!(flags & 0x04);
  const at = !!(flags & 0x40);
  const signCount = authData.readUInt32BE(33);

  if (!at) {
    throw new Error("Attestation authData does not contain attested credential data");
  }

  const aaguid = authData.slice(37, 53);
  const credIdLen = authData.readUInt16BE(53);
  const credId = authData.slice(55, 55 + credIdLen);
  const coseKeyBuffer = authData.slice(55 + credIdLen);

  const coseMap = decodeCbor(coseKeyBuffer);
  const kty = coseMap.get(1); // 2 = EC2, 3 = RSA, 1 = OKP
  const alg = coseMap.get(3); // -7 = ES256, -257 = RS256, -8 = Ed25519

  let jwk = null;
  if (kty === 2 && alg === -7) {
    // ES256 (P-256)
    const crv = coseMap.get(-1); // 1 = P-256
    const x = coseMap.get(-2);
    const y = coseMap.get(-3);
    jwk = {
      kty: "EC",
      crv: "P-256",
      x: Buffer.from(x).toString("base64url"),
      y: Buffer.from(y).toString("base64url")
    };
  } else if (kty === 3 && alg === -257) {
    // RS256
    const n = coseMap.get(-1);
    const e = coseMap.get(-2);
    jwk = {
      kty: "RSA",
      n: Buffer.from(n).toString("base64url"),
      e: Buffer.from(e).toString("base64url")
    };
  } else if (kty === 1 && alg === -8) {
    // Ed25519
    const crv = coseMap.get(-1);
    const x = coseMap.get(-2);
    jwk = {
      kty: "OKP",
      crv: "Ed25519",
      x: Buffer.from(x).toString("base64url")
    };
  } else {
    throw new Error(`Unsupported COSE algorithm or key type: kty=${kty}, alg=${alg}`);
  }

  const pubKeyObj = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const pem = pubKeyObj.export({ type: "spki", format: "pem" });

  return {
    rpIdHash,
    flags,
    up,
    uv,
    signCount,
    aaguid,
    credId: Buffer.from(credId).toString("base64url"),
    jwk,
    pem,
    alg
  };
}

// Quick verification test
console.log("Testing CBOR & Attestation Parser...");
// Let's construct a synthetic attestationObject CBOR
// COSE map: { 1: 2, 3: -7, -1: 1, -2: 32 bytes X, -3: 32 bytes Y }
const ecKey = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const ecJwk = ecKey.publicKey.export({ format: 'jwk' });
const xBuf = Buffer.from(ecJwk.x, 'base64url');
const yBuf = Buffer.from(ecJwk.y, 'base64url');

// Simple manual CBOR encoding of COSE map:
// map of 5 entries: 0xa5
// 1: 2 (0x01, 0x02)
// 3: -7 (0x03, 0x26) [-1-6 = -7 -> 0x20 | 6 = 0x26]
// -1: 1 (0x20, 0x01) [-1-0 = -1 -> 0x20]
// -2: 32-byte x (0x21, 0x58, 0x20, xBuf)
// -3: 32-byte y (0x22, 0x58, 0x20, yBuf)
const coseBytes = Buffer.concat([
  Buffer.from([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20]),
  xBuf,
  Buffer.from([0x22, 0x58, 0x20]),
  yBuf
]);

const rpHash = crypto.createHash("sha256").update("localhost").digest();
const flagsBuf = Buffer.from([0x45]); // UP (1) + UV (4) + AT (0x40)
const signCountBuf = Buffer.alloc(4);
const aaguidBuf = Buffer.alloc(16, 0);
const credIdBytes = Buffer.from("test-cred-id-12345");
const credIdLenBuf = Buffer.alloc(2);
credIdLenBuf.writeUInt16BE(credIdBytes.length, 0);

const syntheticAuthData = Buffer.concat([
  rpHash,
  flagsBuf,
  signCountBuf,
  aaguidBuf,
  credIdLenBuf,
  credIdBytes,
  coseBytes
]);

// CBOR map for attestationObject: { "fmt": "none", "attStmt": {}, "authData": syntheticAuthData }
// 0xa3, 0x63, 'fmt', 0x64, 'none', 0x67, 'attStmt', 0xa0, 0x68, 'authData', 0x59, lenHi, lenLo, authData
const lenAuth = syntheticAuthData.length;
const header = Buffer.from([
  0xa3,
  0x63, 0x66, 0x6d, 0x74, // "fmt"
  0x64, 0x6e, 0x6f, 0x6e, 0x65, // "none"
  0x67, 0x61, 0x74, 0x74, 0x53, 0x74, 0x6d, 0x74, // "attStmt"
  0xa0, // empty map
  0x68, 0x61, 0x75, 0x74, 0x68, 0x44, 0x61, 0x74, 0x61, // "authData"
  0x59, (lenAuth >> 8) & 0xff, lenAuth & 0xff // byte string with 2-byte len
]);
const syntheticAttestation = Buffer.concat([header, syntheticAuthData]);

const parsed = parseAttestationObject(syntheticAttestation);
console.log("Parsed Attestation Result:", {
  credId: parsed.credId,
  up: parsed.up,
  uv: parsed.uv,
  alg: parsed.alg,
  pemLength: parsed.pem.length
});

assert.strictEqual(parsed.up, true);
assert.strictEqual(parsed.uv, true);
assert.strictEqual(parsed.alg, -7);
assert.strictEqual(parsed.jwk.x, ecJwk.x);
assert.strictEqual(parsed.jwk.y, ecJwk.y);

console.log("ALL CBOR & ATTESTATION TESTS PASSED! 🎉");
