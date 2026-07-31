/**
 * ============================================================================
 * SHARE & ROUTER MODULE (js/share.js)
 * Generates short URLs (?w={uuid}) and parses incoming route parameters.
 * Retains permanent Base64 backward compatibility fallback.
 * ============================================================================
 */

(function (window) {
  "use strict";

  async function generateShareableUrl(configObj, overrideName) {
    const nameVal = (overrideName !== undefined ? overrideName : (configObj.name || "")).trim();
    let baseUrl = location.origin + location.pathname;
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = location.href.split("?")[0];
    }

    // Try saving to Supabase DB first
    if (window.DatabaseModule) {
      const uuid = await window.DatabaseModule.saveWish(configObj);
      if (uuid) {
        let url = `${baseUrl}?w=${uuid}`;
        if (nameVal) url += `&name=${encodeURIComponent(nameVal)}`;
        return url;
      }
    }

    // Fallback to legacy Base64 URL encoding
    if (typeof window.encodeWishData === "function") {
      const token = window.encodeWishData(configObj);
      if (token) {
        let url = `${baseUrl}?w=${token}`;
        if (nameVal) url += `&name=${encodeURIComponent(nameVal)}`;
        return url;
      }
    }

    return nameVal ? `${baseUrl}?name=${encodeURIComponent(nameVal)}` : baseUrl;
  }

  async function parseWishRoute(configObj) {
    const params = new URLSearchParams(location.search);
    const nameParam = params.get("name");
    const tokenParam = params.get("w") || params.get("wish") || params.get("id");

    if (params.get("preview") === "1") {
      try {
        const stored = sessionStorage.getItem("preview_wish_config");
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.warn("Preview route parse exception:", e);
      }
    }

    if (!tokenParam) {
      if (nameParam && typeof window.formatName === "function") {
        configObj.name = window.formatName(nameParam);
      }
      return null;
    }

    let wishPayload = null;

    // Check if token is a Supabase DB UUID (36 chars) or Blob ID
    if (tokenParam.length >= 20 && window.DatabaseModule) {
      wishPayload = await window.DatabaseModule.getWishById(tokenParam);
    }

    // Fallback to Base64 decoding (Permanent Backward Compatibility)
    if (!wishPayload && typeof window.decodeWishData === "function") {
      wishPayload = window.decodeWishData(tokenParam);
    }

    return wishPayload;
  }

  window.ShareModule = {
    buildShareUrl: generateShareableUrl,
    parseRoute: parseWishRoute
  };
})(window);
