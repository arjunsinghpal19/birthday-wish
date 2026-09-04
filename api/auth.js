import crypto from "crypto";
import { createAdminSessionToken, verifyAdminSessionToken, loadLocalEnv } from "./session.js";

function extractToken(req, body) {
  const cookieHeader = req.headers && req.headers.cookie;
  if (cookieHeader && typeof cookieHeader === "string") {
    const match = cookieHeader.match(/admin_session=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.trim().split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") return parts[1];
  }
  const customHeader = req.headers && req.headers["x-admin-token"];
  if (customHeader && typeof customHeader === "string") return customHeader.trim();
  if (body && body.adminToken && typeof body.adminToken === "string") return body.adminToken.trim();
  return null;
}

const ITERATIONS = 600000;
const KEY_LEN = 32;
const DIGEST = "sha256";

function pbkdf2Async(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LEN, DIGEST, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString("hex"));
    });
  });
}

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

const FAILED_ATTEMPTS = new Map();
const RECOVERY_CODE_ATTEMPTS = new Map();

const MAX_FAILED_ATTEMPTS = 10;
const MAX_RECOVERY_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000;
const RECOVERY_LOCKOUT_MS = 15 * 60 * 1000;

async function parseRequestBody(req) {
  if (req.body) {
    if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      return req.body;
    }
    if (Buffer.isBuffer(req.body)) {
      try { return JSON.parse(req.body.toString("utf8")); } catch (e) { return {}; }
    }
    if (typeof req.body === "string" && req.body.trim()) {
      try { return JSON.parse(req.body); } catch (e) { return {}; }
    }
  }
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += (Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); } catch (e) { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}

function decodeCbor(buffer) {
  let offset = 0;
  const readUInt8 = () => {
    if (offset >= buffer.length) throw new Error("Unexpected end of CBOR buffer");
    return buffer[offset++];
  };
  const readBuffer = (len) => {
    if (offset + len > buffer.length) throw new Error("Unexpected end of CBOR buffer");
    const sub = buffer.slice(offset, offset + len);
    offset += len;
    return sub;
  };
  const readLength = (extra) => {
    if (extra < 24) return extra;
    if (extra === 24) return readUInt8();
    if (extra === 25) return readBuffer(2).readUInt16BE(0);
    if (extra === 26) return readBuffer(4).readUInt32BE(0);
    if (extra === 27) return Number(readBuffer(8).readBigUInt64BE(0));
    throw new Error(`Unsupported CBOR length: ${extra}`);
  };
  const decodeItem = () => {
    const initial = readUInt8();
    const majorType = initial >> 5;
    const extra = initial & 0x1f;
    switch (majorType) {
      case 0: return readLength(extra);
      case 1: return -1 - readLength(extra);
      case 2: return readBuffer(readLength(extra));
      case 3: return readBuffer(readLength(extra)).toString("utf8");
      case 4: {
        const len = readLength(extra);
        const arr = [];
        for (let i = 0; i < len; i++) arr.push(decodeItem());
        return arr;
      }
      case 5: {
        const len = readLength(extra);
        const map = new Map();
        for (let i = 0; i < len; i++) {
          const key = decodeItem();
          const val = decodeItem();
          map.set(key, val);
        }
        return map;
      }
      case 7: {
        if (extra === 20) return false;
        if (extra === 21) return true;
        if (extra === 22) return null;
        if (extra === 23) return undefined;
        return extra;
      }
      default: throw new Error(`Unsupported CBOR major type: ${majorType}`);
    }
  };
  return decodeItem();
}

function parseAttestationObject(attestationBuffer) {
  const attestation = decodeCbor(attestationBuffer);
  const authData = attestation.get("authData");
  if (!authData || !(Buffer.isBuffer(authData) || authData instanceof Uint8Array)) {
    throw new Error("Invalid attestationObject: missing authData");
  }
  const buf = Buffer.from(authData);
  const rpIdHash = buf.slice(0, 32);
  const flags = buf[32];
  const up = !!(flags & 0x01);
  const uv = !!(flags & 0x04);
  const at = !!(flags & 0x40);
  const signCount = buf.readUInt32BE(33);
  if (!at) throw new Error("Attestation missing attested credential flag");

  const credIdLen = buf.readUInt16BE(53);
  const credId = buf.slice(55, 55 + credIdLen);
  const coseKeyBuffer = buf.slice(55 + credIdLen);

  const coseMap = decodeCbor(coseKeyBuffer);
  const kty = coseMap.get(1); // 2 = EC2, 3 = RSA, 1 = OKP
  const alg = coseMap.get(3); // -7 = ES256, -257 = RS256, -8 = Ed25519

  let jwk = null;
  if (kty === 2 && alg === -7) {
    const x = coseMap.get(-2);
    const y = coseMap.get(-3);
    jwk = { kty: "EC", crv: "P-256", x: Buffer.from(x).toString("base64url"), y: Buffer.from(y).toString("base64url") };
  } else if (kty === 3 && alg === -257) {
    const n = coseMap.get(-1);
    const e = coseMap.get(-2);
    jwk = { kty: "RSA", n: Buffer.from(n).toString("base64url"), e: Buffer.from(e).toString("base64url") };
  } else if (kty === 1 && alg === -8) {
    const x = coseMap.get(-2);
    jwk = { kty: "OKP", crv: "Ed25519", x: Buffer.from(x).toString("base64url") };
  } else {
    throw new Error(`Unsupported COSE algorithm: kty=${kty}, alg=${alg}`);
  }

  const pubKeyObj = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const pem = pubKeyObj.export({ type: "spki", format: "pem" });

  return { rpIdHash, flags, up, uv, signCount, credId: Buffer.from(credId).toString("base64url"), jwk, pem, alg };
}

function getAllowedOriginsAndRpIds(req) {
  const allowedOrigins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ]);
  const allowedRpIds = new Set(["localhost", "127.0.0.1"]);

  const reqOrigin = req.headers.origin;
  const reqHost = req.headers.host;
  if (reqOrigin) {
    try {
      const u = new URL(reqOrigin);
      if (u.hostname.endsWith(".vercel.app") || u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        allowedOrigins.add(reqOrigin);
        allowedRpIds.add(u.hostname);
      }
    } catch (e) {}
  }
  if (reqHost) {
    const hostOnly = reqHost.split(":")[0];
    allowedRpIds.add(hostOnly);
    allowedOrigins.add(`https://${hostOnly}`);
    allowedOrigins.add(`http://${hostOnly}`);
  }
  return { allowedOrigins, allowedRpIds };
}

function validateAndConsumeChallenge(challengeStr, secret) {
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-token");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  loadLocalEnv();

  const supabaseUrl = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim()) || "https://dvacxeooaqxwldszqpek.supabase.co";
  const supabaseKey =
    (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim()) ||
    (process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY.trim()) ||
    "sb_publishable_UZ1WSWZHyaij07xleBgSxw_YBn7-lAx";

  const hasServiceRoleKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim());
  if (!hasServiceRoleKey && process.env.NODE_ENV === "production") {
    console.warn("⚠️ [Security Notice] SUPABASE_SERVICE_ROLE_KEY is not configured in production environment. Admin system row read may be blocked by RLS.");
  }

  try {
    const body = await parseRequestBody(req);
    const rawAction = body.action || body.type || (req.query && req.query.action) || "";
    const action = String(rawAction).trim().toLowerCase().replace(/_/g, "-");
    const password = body.password;
    const newPassword = body.newPassword;
    const question = body.question;
    const answer = body.answer;
    const code = body.code;
    const clientIp = (req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "127.0.0.1").split(",")[0].trim();

    // Fetch security columns from reserved system row 00000000-0000-0000-0000-000000000001
    let fetchRes = await fetch(
      `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001&select=admin_password_hash,admin_password_salt,security_question,security_answer_hash,security_answer_salt,backup_code_hash,backup_code_salt,pass_code,memory_text`,
      {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      }
    );

    // Pre-migration fallback if dedicated columns do not exist yet
    if (!fetchRes.ok) {
      fetchRes = await fetch(
        `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001&select=pass_code,memory_text`,
        {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
        }
      );
    }

    if (!fetchRes.ok) {
      return res.status(500).json({ error: "Failed to query database security configuration" });
    }

    const records = await fetchRes.json();
    const secRow = records[0] || {};

    let parsedMemory = {};
    if (secRow.memory_text) {
      try { parsedMemory = JSON.parse(secRow.memory_text); } catch (e) {}
    }

    let actualPass = secRow.pass_code || parsedMemory.admin_master_password;
    let storedPassHash = secRow.admin_password_hash || parsedMemory.admin_password_hash;
    let storedPassSalt = secRow.admin_password_salt || parsedMemory.admin_password_salt;
    let storedAnsHash = secRow.security_answer_hash || parsedMemory.security_answer_hash;
    let storedAnsSalt = secRow.security_answer_salt || parsedMemory.security_answer_salt;
    let storedCodeHash = secRow.backup_code_hash || parsedMemory.backup_code_hash;
    let storedCodeSalt = secRow.backup_code_salt || parsedMemory.backup_code_salt;

    const authSecret = (process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.trim()) ||
                       storedPassHash ||
                       (secRow && secRow.pass_code) ||
                       (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim()) ||
                       (process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY.trim()) ||
                       supabaseKey;

    if (action === "verify") {
      const ipRecord = FAILED_ATTEMPTS.get(clientIp);
      if (ipRecord && ipRecord.lockedUntil && ipRecord.lockedUntil > Date.now()) {
        const remainingSec = Math.ceil((ipRecord.lockedUntil - Date.now()) / 1000);
        return res.status(429).json({
          valid: false,
          rateLimited: true,
          message: `Too many failed login attempts. Please wait ${remainingSec} seconds.`
        });
      }

      if (!password) return res.status(400).json({ valid: false, message: "Password is required" });

      const inputClean = password.trim();
      let isValid = false;
      if (storedPassHash && storedPassSalt) {
        const inputHash = await pbkdf2Async(inputClean, storedPassSalt);
        isValid = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedPassHash));
      } else {
        isValid = !!(actualPass && inputClean === actualPass.trim());
      }

      if (isValid) {
        FAILED_ATTEMPTS.delete(clientIp);
        const token = createAdminSessionToken(secRow);
        res.setHeader("Set-Cookie", `admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
        return res.status(200).json({ valid: true, token });
      }

      const current = FAILED_ATTEMPTS.get(clientIp) || { count: 0, lockedUntil: 0 };
      current.count += 1;
      if (current.count >= MAX_FAILED_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      }
      FAILED_ATTEMPTS.set(clientIp, current);
      return res.status(200).json({ valid: false });
    }

    if (action === "update") {
      const token = extractToken(req, body);
      const isAuthorized = verifyAdminSessionToken(token, secRow);
      if (!isAuthorized) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized: Valid admin session token required."
        });
      }

      if (!newPassword || newPassword.trim().length < 4) {
        return res.status(400).json({ success: false, message: "Password must be at least 4 characters" });
      }

      const cleanNewPass = newPassword.trim();
      const newSalt = generateSalt();
      const newHash = await pbkdf2Async(cleanNewPass, newSalt);

      delete parsedMemory.admin_master_password;
      parsedMemory.admin_password_hash = newHash;
      parsedMemory.admin_password_salt = newSalt;
      parsedMemory.updated_at = new Date().toISOString();

      let updateBody = {
        pass_code: cleanNewPass,
        admin_password_hash: newHash,
        admin_password_salt: newSalt,
        memory_text: JSON.stringify(parsedMemory),
        updated_at: new Date().toISOString()
      };

      let updateRes = await fetch(
        `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`,
        {
          method: "PATCH",
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(updateBody)
        }
      );

      if (!updateRes.ok) {
        updateRes = await fetch(
          `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`,
          {
            method: "PATCH",
            headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              pass_code: cleanNewPass,
              memory_text: JSON.stringify(parsedMemory),
              updated_at: new Date().toISOString()
            })
          }
        );
      }

      if (!updateRes.ok) {
        return res.status(500).json({ success: false, message: "Database update failed" });
      }

      const newToken = createAdminSessionToken({
        ...secRow,
        admin_password_hash: newHash,
        admin_password_salt: newSalt,
        pass_code: cleanNewPass
      });
      res.setHeader("Set-Cookie", `admin_session=${newToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
      return res.status(200).json({ success: true, token: newToken });
    }

    if (action === "save-recovery-code") {
      const token = extractToken(req, body);
      const isAuthorized = verifyAdminSessionToken(token, secRow);
      if (!isAuthorized) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized: Valid admin session token required."
        });
      }

      if (!code || code.trim().length < 8) {
        return res.status(400).json({ success: false, message: "Valid recovery code is required" });
      }

      const cleanCode = code.trim().toUpperCase();
      const codeSalt = generateSalt();
      const codeHash = await pbkdf2Async(cleanCode, codeSalt);

      delete parsedMemory.admin_recovery_code;
      const nowIso = new Date().toISOString();
      parsedMemory.backup_code_hash = codeHash;
      parsedMemory.backup_code_salt = codeSalt;
      parsedMemory.backup_code_updated_at = nowIso;
      parsedMemory.updated_at = nowIso;

      let updateRes = await fetch(
        `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`,
        {
          method: "PATCH",
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            backup_code_hash: codeHash,
            backup_code_salt: codeSalt,
            memory_text: JSON.stringify(parsedMemory),
            updated_at: nowIso
          })
        }
      );

      if (!updateRes.ok) {
        updateRes = await fetch(
          `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`,
          {
            method: "PATCH",
            headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              memory_text: JSON.stringify(parsedMemory),
              updated_at: nowIso
            })
          }
        );
      }

      if (!updateRes.ok) {
        return res.status(500).json({ success: false, message: "Failed to store recovery code securely" });
      }

      RECOVERY_CODE_ATTEMPTS.delete(clientIp);
      return res.status(200).json({
        success: true,
        message: "Emergency Recovery Code saved securely!",
        updatedAt: nowIso,
        backupCodeUpdatedAt: nowIso
      });
    }

    if (action === "verify-recovery-code" || action === "verify-backup-code") {
      const lockRecord = RECOVERY_CODE_ATTEMPTS.get(clientIp);
      if (lockRecord && lockRecord.lockedUntil && lockRecord.lockedUntil > Date.now()) {
        const remainingMin = Math.ceil((lockRecord.lockedUntil - Date.now()) / 60000);
        return res.status(429).json({
          valid: false,
          error: `Emergency Recovery Locked: Too many failed attempts. Try again in ${remainingMin} minute(s).`
        });
      }

      if (!code) {
        return res.status(400).json({ valid: false, error: "Emergency Recovery Code is required" });
      }

      const cleanCode = code.trim().toUpperCase();

      if (!storedCodeHash || !storedCodeSalt) {
        return res.status(400).json({ valid: false, error: "No active Emergency Recovery Code configured." });
      }

      const inputHash = await pbkdf2Async(cleanCode, storedCodeSalt);
      const isValid = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedCodeHash));

      if (isValid) {
        const nowIso = new Date().toISOString();
        let updatedMemory = { ...parsedMemory };
        delete updatedMemory.backup_code_hash;
        delete updatedMemory.backup_code_salt;
        delete updatedMemory.admin_backup_code;
        delete updatedMemory.admin_recovery_code;
        updatedMemory.backup_code_consumed_at = nowIso;
        updatedMemory.updated_at = nowIso;

        const consumeRes = await fetch(
          `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001&backup_code_hash=eq.${storedCodeHash}`,
          {
            method: "PATCH",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              Prefer: "return=representation"
            },
            body: JSON.stringify({
              backup_code_hash: null,
              backup_code_salt: null,
              memory_text: JSON.stringify(updatedMemory),
              updated_at: nowIso
            })
          }
        );

        if (!consumeRes.ok) {
          return res.status(500).json({ valid: false, error: "Database error consuming Emergency Recovery Code." });
        }

        const consumedRows = await consumeRes.json();
        if (!Array.isArray(consumedRows) || consumedRows.length !== 1) {
          return res.status(400).json({
            valid: false,
            error: "Emergency Recovery Code was already consumed or is no longer active. Please generate a new code."
          });
        }

        RECOVERY_CODE_ATTEMPTS.delete(clientIp);
        const token = createAdminSessionToken(secRow);
        res.setHeader("Set-Cookie", `admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
        return res.status(200).json({ valid: true, token, message: "Emergency Recovery Code Verified and Consumed!" });
      }

      const curr = RECOVERY_CODE_ATTEMPTS.get(clientIp) || { count: 0, lockedUntil: 0 };
      curr.count += 1;
      if (curr.count >= MAX_RECOVERY_ATTEMPTS) {
        curr.lockedUntil = Date.now() + RECOVERY_LOCKOUT_MS;
        RECOVERY_CODE_ATTEMPTS.set(clientIp, curr);
        return res.status(429).json({
          valid: false,
          error: "Maximum recovery code attempts exceeded. Locked for 15 minutes."
        });
      }
      RECOVERY_CODE_ATTEMPTS.set(clientIp, curr);
      return res.status(200).json({ valid: false, error: "Invalid emergency recovery code." });
    }

    if (action === "passkey-challenge") {
      const nonce = crypto.randomBytes(16);
      const expBuf = Buffer.alloc(8);
      const exp = Date.now() + 120000;
      expBuf.writeBigUInt64BE(BigInt(exp));
      const dataToSign = Buffer.concat([nonce, expBuf]);
      const hmac = crypto.createHmac("sha256", authSecret).update(dataToSign).digest();
      const challenge = Buffer.concat([dataToSign, hmac]).toString("base64url");
      const allowCredentials = (parsedMemory.passkeys || []).map(k => ({
        id: k.id,
        type: "public-key"
      }));
      return res.status(200).json({ success: true, challenge, allowCredentials });
    }

    if (action === "passkey-register") {
      const token = extractToken(req, body);
      const isAuthorized = verifyAdminSessionToken(token, secRow);
      if (!isAuthorized) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized: Valid admin session token required."
        });
      }

      const credential = body.credential || {};
      if (!credential || !credential.clientDataJSON || !credential.attestationObject) {
        return res.status(400).json({ success: false, message: "Invalid passkey registration payload" });
      }

      let clientData;
      try {
        const rawJson = Buffer.from(credential.clientDataJSON, "base64url").toString("utf8");
        clientData = JSON.parse(rawJson);
      } catch (e) {
        return res.status(400).json({ success: false, message: "Malformed clientDataJSON" });
      }

      if (clientData.type !== "webauthn.create") {
        return res.status(400).json({ success: false, message: "Invalid ceremony type in clientDataJSON" });
      }

      if (!validateAndConsumeChallenge(clientData.challenge, authSecret)) {
        return res.status(400).json({ success: false, message: "Challenge expired or invalid. Please retry." });
      }

      const { allowedOrigins, allowedRpIds } = getAllowedOriginsAndRpIds(req);
      if (!allowedOrigins.has(clientData.origin)) {
        return res.status(400).json({ success: false, message: `Origin ${clientData.origin} not allowed` });
      }

      let parsedAttestation;
      try {
        const attBuf = Buffer.from(credential.attestationObject, "base64url");
        parsedAttestation = parseAttestationObject(attBuf);
      } catch (e) {
        return res.status(400).json({ success: false, message: `Attestation parsing failed: ${e.message}` });
      }

      // Validate RP ID hash
      let rpIdMatched = false;
      for (const rpId of allowedRpIds) {
        const expectedHash = crypto.createHash("sha256").update(rpId).digest();
        if (crypto.timingSafeEqual(Buffer.from(parsedAttestation.rpIdHash), expectedHash)) {
          rpIdMatched = true;
          break;
        }
      }
      if (!rpIdMatched) {
        return res.status(400).json({ success: false, message: "RP ID hash mismatch in attestationObject" });
      }

      if (!parsedAttestation.up) {
        return res.status(400).json({ success: false, message: "User Present flag not set by authenticator" });
      }

      const credId = parsedAttestation.credId || credential.id;
      const passkeyObj = {
        id: credId,
        rawId: credential.rawId || credId,
        publicKey: parsedAttestation.pem,
        jwk: parsedAttestation.jwk,
        algorithm: parsedAttestation.alg,
        signCount: parsedAttestation.signCount || 0,
        type: credential.type || "public-key",
        createdAt: new Date().toISOString()
      };

      parsedMemory.passkeys = [passkeyObj];
      parsedMemory.updated_at = new Date().toISOString();

      const updateRes = await fetch(
        `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`,
        {
          method: "PATCH",
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            memory_text: JSON.stringify(parsedMemory),
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!updateRes.ok) {
        return res.status(500).json({ success: false, message: "Failed to persist passkey credential" });
      }

      return res.status(200).json({ success: true, message: "Passkey registered successfully!" });
    }

    if (action === "passkey-verify") {
      const credentialId = body.credentialId;
      const clientDataJSON = body.clientDataJSON;
      const authenticatorData = body.authenticatorData;
      const signature = body.signature;

      if (!credentialId || !clientDataJSON || !authenticatorData || !signature) {
        return res.status(400).json({ valid: false, error: "Missing required WebAuthn assertion parameters." });
      }

      let clientData;
      try {
        const rawJson = Buffer.from(clientDataJSON, "base64url").toString("utf8");
        clientData = JSON.parse(rawJson);
      } catch (e) {
        return res.status(400).json({ valid: false, error: "Malformed clientDataJSON" });
      }

      if (clientData.type !== "webauthn.get") {
        return res.status(400).json({ valid: false, error: "Invalid ceremony type in clientDataJSON" });
      }

      if (!validateAndConsumeChallenge(clientData.challenge, authSecret)) {
        return res.status(400).json({ valid: false, error: "Challenge expired or invalid. Please retry." });
      }

      const { allowedOrigins, allowedRpIds } = getAllowedOriginsAndRpIds(req);
      if (!allowedOrigins.has(clientData.origin)) {
        return res.status(400).json({ valid: false, error: `Origin ${clientData.origin} not allowed` });
      }

      function normalizeCredId(idStr) {
        if (!idStr || typeof idStr !== "string") return "";
        try {
          return Buffer.from(idStr, "base64url").toString("base64url");
        } catch (e) {
          return idStr.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
        }
      }

      const targetId = normalizeCredId(credentialId);
      const registered = (parsedMemory.passkeys || []).find(k => {
        return normalizeCredId(k.id) === targetId || normalizeCredId(k.rawId) === targetId;
      });

      if (!registered || (!registered.publicKey && !registered.jwk)) {
        return res.status(401).json({ valid: false, error: "Unknown or unregistered passkey credential." });
      }

      let authDataBuf;
      try {
        authDataBuf = Buffer.from(authenticatorData, "base64url");
      } catch (e) {
        return res.status(400).json({ valid: false, error: "Invalid authenticatorData buffer" });
      }

      if (authDataBuf.length < 37) {
        return res.status(400).json({ valid: false, error: "authenticatorData buffer too short" });
      }

      const rpIdHash = authDataBuf.slice(0, 32);
      let rpIdMatched = false;
      for (const rpId of allowedRpIds) {
        const expectedHash = crypto.createHash("sha256").update(rpId).digest();
        if (crypto.timingSafeEqual(rpIdHash, expectedHash)) {
          rpIdMatched = true;
          break;
        }
      }
      if (!rpIdMatched) {
        return res.status(400).json({ valid: false, error: "RP ID hash mismatch in authenticatorData" });
      }

      const flags = authDataBuf[32];
      const up = !!(flags & 0x01);
      if (!up) {
        return res.status(400).json({ valid: false, error: "User Present flag not set by authenticator" });
      }

      const signCount = authDataBuf.readUInt32BE(33);
      if (signCount > 0 && registered.signCount > 0 && signCount < registered.signCount) {
        return res.status(401).json({ valid: false, error: "Cloned authenticator detected (counter rollback)." });
      }

      // Construct Signed Data Buffer: authenticatorData + SHA-256(clientDataJSON)
      const clientDataHash = crypto.createHash("sha256").update(Buffer.from(clientDataJSON, "base64url")).digest();
      const signedData = Buffer.concat([ authDataBuf, clientDataHash ]);
      const signatureBuffer = Buffer.from(signature, "base64url");

      let pubKeyObj;
      try {
        if (registered.jwk) {
          pubKeyObj = crypto.createPublicKey({ key: registered.jwk, format: "jwk" });
        } else {
          pubKeyObj = crypto.createPublicKey(registered.publicKey);
        }
      } catch (e) {
        return res.status(500).json({ valid: false, error: "Failed to load registered public key" });
      }

      let isSigValid = crypto.verify("sha256", signedData, pubKeyObj, signatureBuffer);
      if (!isSigValid && signatureBuffer.length === 64) {
        try {
          const r = signatureBuffer.slice(0, 32);
          const s = signatureBuffer.slice(32, 64);
          function encodeDerInt(buf) {
            let i = 0;
            while (i < buf.length - 1 && buf[i] === 0) i++;
            const trimmed = buf.slice(i);
            if (trimmed[0] & 0x80) return Buffer.concat([Buffer.from([0x02, trimmed.length + 1, 0x00]), trimmed]);
            return Buffer.concat([Buffer.from([0x02, trimmed.length]), trimmed]);
          }
          const derR = encodeDerInt(r);
          const derS = encodeDerInt(s);
          const derSig = Buffer.concat([Buffer.from([0x30, derR.length + derS.length]), derR, derS]);
          isSigValid = crypto.verify("sha256", signedData, pubKeyObj, derSig);
        } catch (err) {}
      }

      if (!isSigValid) {
        return res.status(401).json({ valid: false, error: "Passkey cryptographic signature verification failed." });
      }

      // Update sign count in DB
      registered.signCount = signCount;
      parsedMemory.updated_at = new Date().toISOString();

      await fetch(
        `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`,
        {
          method: "PATCH",
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            memory_text: JSON.stringify(parsedMemory),
            updated_at: new Date().toISOString()
          })
        }
      );

      const token = createAdminSessionToken(secRow);
      res.setHeader("Set-Cookie", `admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
      return res.status(200).json({ valid: true, success: true, token, message: "Passkey authenticated successfully!" });
    }

    if (action === "passkey-remove") {
      const token = extractToken(req, body);
      const isAuthorized = verifyAdminSessionToken(token, secRow);
      if (!isAuthorized) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized: Valid admin session token required."
        });
      }

      delete parsedMemory.passkeys;
      parsedMemory.updated_at = new Date().toISOString();

      const updateRes = await fetch(
        `${supabaseUrl}/rest/v1/wishes?id=eq.00000000-0000-0000-0000-000000000001`,
        {
          method: "PATCH",
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            memory_text: JSON.stringify(parsedMemory),
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!updateRes.ok) {
        return res.status(500).json({ success: false, message: "Failed to remove passkey credential" });
      }

      return res.status(200).json({ success: true, message: "Passkey removed" });
    }

    if (action === "get-security-status" || action === "security-status") {
      const recEmail = secRow.recovery_email || parsedMemory.admin_recovery_email || "";
      const isVerified = secRow.recovery_email_verified ?? parsedMemory.recovery_email_verified ?? false;
      const hasBackup = !!(secRow.backup_code_hash || parsedMemory.backup_code_hash);
      const codeTime = parsedMemory.backup_code_updated_at || secRow.updated_at || parsedMemory.updated_at || null;
      const passkeysList = parsedMemory.passkeys || [];
      const hasPasskey = passkeysList.length > 0;

      return res.status(200).json({
        success: true,
        admin_recovery_email: recEmail,
        recovery_email_verified: isVerified,
        has_recovery_code: hasBackup,
        recovery_code_updated_at: codeTime,
        has_passkey: hasPasskey,
        passkeys_count: passkeysList.length
      });
    }

    return res.status(400).json({ error: "Invalid action parameter" });
  } catch (err) {
    console.error("❌ Auth API Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
