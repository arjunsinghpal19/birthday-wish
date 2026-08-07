/**
 * ============================================================================
 * SHARE & ROUTER MODULE (js/share.js)
 * Generates short URLs (?w={uuid}) and parses incoming route parameters.
 * Retains permanent Base64 backward compatibility fallback.
 * ============================================================================
 */

(function (window) {
  "use strict";

  /**
   * Generates a shareable URL for a custom wish payload.
   * Attempts primary save via Supabase Database API, falling back to legacy Base64 parameters.
   * @param {Object} configObj - Current application wish configuration object.
   * @param {string} [overrideName] - Optional override recipient name.
   * @returns {Promise<string>} Fully formatted public share URL.
   */
  async function generateShareableUrl(configObj, overrideName, options = { persist: false }) {
    const shouldPersist = typeof options === "boolean" ? options : !!(options && options.persist);
    const nameVal = (overrideName !== undefined ? overrideName : (configObj.name || "")).trim();
    let baseUrl = location.origin + location.pathname;
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = location.href.split("?")[0];
    }

    // Save to Supabase DB ONLY when explicit persistence is requested
    if (shouldPersist && window.DatabaseModule) {
      const uuid = await window.DatabaseModule.saveWish(configObj);
      if (uuid) {
        let url = `${baseUrl}?w=${uuid}`;
        if (nameVal) url += `&name=${encodeURIComponent(nameVal)}`;
        return url;
      }
    }

    // Client-side preview / non-persisted Base64 URL encoding
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

  /**
   * Parses URL query parameters to retrieve a wish payload from Supabase DB or legacy Base64 data.
   * @param {Object} configObj - Target configuration object to hydrate.
   * @returns {Promise<Object|null>} Resolved wish data payload object or null if unspecified.
   */
  async function parseWishRoute(configObj) {
    const params = new URLSearchParams(location.search);
    const nameParam = params.get("name");
    const tokenParam = params.get("w") || params.get("wish") || params.get("id");

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
