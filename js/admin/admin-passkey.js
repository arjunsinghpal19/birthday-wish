/**
 * 🔑 Admin Passkey Module (WebAuthn / FIDO2 Authentication)
 * Standard WebAuthn credential registration and authentication provider.
 * Stores only public credential metadata on server; private key material never leaves user device.
 */
(function (root) {
  "use strict";

  function safeToast(msg) {
    const fn = root.showToast || (typeof showToast === "function" ? showToast : (m) => console.log(m));
    fn(msg);
  }

  function bufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = "";
    for (let i = 0; i < bytes.length; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function base64UrlToBuffer(base64url) {
    let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function isSupported() {
    return !!(window.PublicKeyCredential && typeof window.PublicKeyCredential === "function" && navigator.credentials && navigator.credentials.create);
  }

  async function fetchChallengeData() {
    const apiUrl = root.getApiUrl ? root.getApiUrl("/api/auth") : "/api/auth";
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "passkey-challenge" })
    });
    const data = await res.json();
    if (!res.ok || !data.challenge) {
      throw new Error(data.error || data.message || "Failed to retrieve security challenge");
    }
    return {
      challenge: data.challenge,
      allowCredentials: Array.isArray(data.allowCredentials) ? data.allowCredentials : []
    };
  }

  async function fetchChallenge() {
    const data = await fetchChallengeData();
    return data.challenge;
  }

  async function registerPasskey() {
    if (!isSupported()) {
      safeToast("WebAuthn is not supported in this browser environment ⚠️");
      return { success: false, error: "WebAuthn not supported" };
    }

    try {
      safeToast("⏳ Requesting WebAuthn challenge...");
      const challengeStr = await fetchChallenge();
      const challengeBuffer = base64UrlToBuffer(challengeStr);

      const userIdBuffer = new Uint8Array(16);
      crypto.getRandomValues(userIdBuffer);

      const hostname = window.location.hostname || "localhost";
      const publicKey = {
        challenge: challengeBuffer,
        rp: {
          name: "Wish Studio Admin",
          id: hostname === "localhost" || hostname === "127.0.0.1" ? undefined : hostname
        },
        user: {
          id: userIdBuffer,
          name: "admin@wishstudio.internal",
          displayName: "Master Admin"
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },   // ES256 (ECDSA w/ SHA-256)
          { type: "public-key", alg: -257 }  // RS256 (RSA w/ SHA-256)
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "preferred",
          residentKey: "preferred"
        },
        timeout: 60000,
        attestation: "none"
      };

      safeToast("⚡ Touch your fingerprint sensor, Face ID, or security key...");
      const credential = await navigator.credentials.create({ publicKey });

      if (!credential) {
        throw new Error("No credential was returned by authenticator");
      }

      const credId = credential.id;
      const rawId = bufferToBase64Url(credential.rawId);
      const clientDataJSON = bufferToBase64Url(credential.response.clientDataJSON);
      const attestationObject = bufferToBase64Url(credential.response.attestationObject);

      safeToast("⏳ Persisting public credential to server...");
      const apiUrl = root.getApiUrl ? root.getApiUrl("/api/auth") : "/api/auth";
      const saveRes = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "passkey-register",
          credential: { id: credId, rawId, type: credential.type, clientDataJSON, attestationObject }
        })
      });

      const saveData = await saveRes.json();
      if (saveRes.ok && saveData.success) {
        safeToast("✓ Passkey successfully registered! 🎉");
        updatePasskeyUI(true, credId);
        return { success: true, credentialId: credId };
      } else {
        throw new Error(saveData.error || saveData.message || "Failed to persist passkey");
      }
    } catch (err) {
      if (err.name === "NotAllowedError") {
        safeToast("Passkey registration was cancelled or timed out ⚠️");
      } else {
        safeToast(`Passkey registration failed: ${err.message || "Unknown error"} ❌`);
      }
      return { success: false, error: err.message };
    }
  }

  async function authenticatePasskey() {
    if (!isSupported()) {
      safeToast("WebAuthn is not supported in this browser ⚠️");
      return { success: false, error: "WebAuthn not supported" };
    }

    try {
      safeToast("⏳ Requesting WebAuthn challenge...");
      const challengeData = await fetchChallengeData();
      const challengeBuffer = base64UrlToBuffer(challengeData.challenge);
      const hostname = window.location.hostname || "localhost";

      const publicKey = {
        challenge: challengeBuffer,
        rpId: hostname === "localhost" || hostname === "127.0.0.1" ? undefined : hostname,
        userVerification: "preferred",
        timeout: 60000
      };

      if (challengeData.allowCredentials && challengeData.allowCredentials.length > 0) {
        publicKey.allowCredentials = challengeData.allowCredentials.map(c => ({
          id: base64UrlToBuffer(c.id),
          type: c.type || "public-key"
        }));
      }

      safeToast("⚡ Touch your fingerprint sensor, Face ID, or security key...");
      const assertion = await navigator.credentials.get({ publicKey });

      if (!assertion) {
        throw new Error("No assertion returned by authenticator");
      }

      const credId = assertion.id;
      const clientDataJSON = bufferToBase64Url(assertion.response.clientDataJSON);
      const authenticatorData = bufferToBase64Url(assertion.response.authenticatorData);
      const signature = bufferToBase64Url(assertion.response.signature);

      safeToast("⏳ Verifying passkey with server authority...");
      const apiUrl = root.getApiUrl ? root.getApiUrl("/api/auth") : "/api/auth";
      const verifyRes = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "passkey-verify",
          credentialId: credId,
          clientDataJSON,
          authenticatorData,
          signature
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && (verifyData.valid === true || verifyData.success === true)) {
        sessionStorage.setItem("admin_authenticated", "true");
        sessionStorage.setItem("admin_auth_timestamp", String(Date.now()));
        if (verifyData.token) {
          sessionStorage.setItem("admin_session_token", verifyData.token);
        }
        safeToast("👑 Master Admin authenticated via Passkey! ✅");

        const loginModal = document.getElementById("admin-login-modal");
        if (loginModal) loginModal.classList.remove("open");

        const isDashboardPage = (typeof window !== "undefined" && window.location && window.location.pathname.toLowerCase().endsWith("admin.html")) ||
                                (typeof document !== "undefined" && !!document.getElementById("view-dashboard"));

        if (!isDashboardPage) {
          window.location.href = "admin.html";
        }

        return { success: true };
      } else {
        throw new Error(verifyData.error || verifyData.message || "Passkey verification rejected");
      }
    } catch (err) {
      if (err.name === "NotAllowedError") {
        safeToast("Passkey sign-in cancelled or timed out ⚠️");
      } else {
        safeToast(`Passkey verification failed: ${err.message || "Unknown error"} ❌`);
      }
      return { success: false, error: err.message };
    }
  }

  async function removePasskey() {
    try {
      safeToast("⏳ Removing registered passkeys from server...");
      const apiUrl = root.getApiUrl ? root.getApiUrl("/api/auth") : "/api/auth";
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "passkey-remove" })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        safeToast("✓ Registered passkeys removed ✅");
        updatePasskeyUI(false);
        return { success: true };
      } else {
        throw new Error(data.error || data.message || "Failed to remove passkey");
      }
    } catch (err) {
      safeToast(`Failed to remove passkey: ${err.message} ❌`);
      return { success: false, error: err.message };
    }
  }

  function updatePasskeyUI(hasPasskey, credId) {
    const statusEl = document.getElementById("sec-passkey-status");
    const removeBtn = document.getElementById("btn-remove-passkey");
    const regBtn = document.getElementById("btn-register-passkey");

    if (statusEl) {
      if (hasPasskey) {
        statusEl.textContent = `✓ Active Passkey Configured (${(credId || "Primary Key").substring(0, 12)}...)`;
        statusEl.style.color = "#22c55e";
      } else {
        statusEl.textContent = isSupported() ? "⚡ WebAuthn Ready (No Passkey Registered)" : "⚠️ WebAuthn Not Supported in this Browser";
        statusEl.style.color = "var(--gold)";
      }
    }

    if (removeBtn) {
      removeBtn.style.display = hasPasskey ? "inline-flex" : "none";
    }
    if (regBtn) {
      regBtn.textContent = hasPasskey ? "🔄 Re-Register Passkey" : "➕ Register Passkey";
    }
  }

  async function checkPasskeyStatus() {
    if (!isSupported()) {
      updatePasskeyUI(false);
      return;
    }
    try {
      const dbSettings = root.DatabaseModule?.getSecuritySettings ? await root.DatabaseModule.getSecuritySettings() : null;
      const hasPasskey = !!(dbSettings?.has_passkey || dbSettings?.passkeys_count > 0);
      updatePasskeyUI(hasPasskey);
    } catch (e) {
      updatePasskeyUI(false);
    }
  }

  function initPasskeyUI() {
    const regBtn = document.getElementById("btn-register-passkey");
    if (regBtn && !regBtn.__bound) {
      regBtn.__bound = true;
      regBtn.addEventListener("click", () => registerPasskey());
    }

    const removeBtn = document.getElementById("btn-remove-passkey");
    if (removeBtn && !removeBtn.__bound) {
      removeBtn.__bound = true;
      removeBtn.addEventListener("click", () => removePasskey());
    }

    const qePasskeyBtn = document.getElementById("admin-passkey-login-btn");
    if (qePasskeyBtn && !qePasskeyBtn.__bound) {
      qePasskeyBtn.__bound = true;
      qePasskeyBtn.addEventListener("click", () => authenticatePasskey());
    }

    checkPasskeyStatus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPasskeyUI);
  } else {
    initPasskeyUI();
  }

  root.AdminPasskeyModule = Object.freeze({
    isSupported,
    checkPasskeyStatus,
    registerPasskey,
    authenticatePasskey,
    removePasskey,
    initPasskeyUI
  });

})(window);
