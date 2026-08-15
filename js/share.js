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

    const activeUuid = (configObj && configObj._activeWishUuid !== undefined)
      ? configObj._activeWishUuid
      : ((window.CONFIG && window.CONFIG._activeWishUuid) || null);

    // Save or Update to Supabase DB ONLY when explicit persistence is requested
    if (shouldPersist && window.DatabaseModule) {
      if (activeUuid) {
        // EXISTING WISH: Strictly UPDATE existing record. NEVER fallback to INSERT!
        if (typeof window.DatabaseModule.updateWish === "function") {
          const updatedId = await window.DatabaseModule.updateWish(activeUuid, configObj);
          if (updatedId) {
            configObj._activeWishUuid = activeUuid;
            if (window.CONFIG) window.CONFIG._activeWishUuid = activeUuid;
            let url = `${baseUrl}?w=${activeUuid}`;
            if (nameVal) url += `&name=${encodeURIComponent(nameVal)}`;
            return url;
          }
        }
        // UPDATE failed: Preserve activeUuid, do NOT insert a duplicate row, return null
        console.warn("⚠️ Failed to update existing wish record in database:", activeUuid);
        return null;
      } else {
        // NEW WISH: Exactly ONE initial INSERT to create the permanent UUID
        if (typeof window.DatabaseModule.saveWish === "function") {
          const newUuid = await window.DatabaseModule.saveWish(configObj);
          if (newUuid) {
            configObj._activeWishUuid = newUuid;
            if (window.CONFIG) window.CONFIG._activeWishUuid = newUuid;
            let url = `${baseUrl}?w=${newUuid}`;
            if (nameVal) url += `&name=${encodeURIComponent(nameVal)}`;
            return url;
          }
        }
        // INSERT failed
        console.warn("⚠️ Failed to create new wish in cloud database");
        return null;
      }
    }

    // Client-side preview / non-persisted share link with active UUID
    if (activeUuid) {
      let url = `${baseUrl}?w=${activeUuid}`;
      if (nameVal) url += `&name=${encodeURIComponent(nameVal)}`;
      return url;
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
      if (wishPayload) {
        configObj._activeWishUuid = tokenParam;
        if (window.CONFIG) window.CONFIG._activeWishUuid = tokenParam;
      }
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
