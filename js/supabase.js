/**
 * ============================================================================
 * SUPABASE CLIENT INITIALIZER (js/supabase.js)
 * Safely reads credentials from environment/runtime variables without hardcoding.
 * If credentials are missing or network fails, returns null for graceful local fallback.
 * ============================================================================
 */

(function (window) {
  "use strict";

  function getEnvVariable(key) {
    if (window.ENV && window.ENV[key]) return window.ENV[key];
    if (window.process && window.process.env && window.process.env[key]) return window.process.env[key];
    try {
      const stored = localStorage.getItem(`custom_${key.toLowerCase()}`);
      if (stored) return stored;
    } catch (e) {}
    return null;
  }

  function initSupabaseClient() {
    const supabaseUrl = getEnvVariable("SUPABASE_URL");
    const supabaseAnonKey = getEnvVariable("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.info("ℹ️ Supabase credentials not found in environment. Operating in dual-layer local fallback mode.");
      return null;
    }

    if (typeof window.supabase !== "undefined" && typeof window.supabase.createClient === "function") {
      try {
        return window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      } catch (e) {
        console.warn("⚠️ Error initializing Supabase client:", e);
      }
    }
    return null;
  }

  window.SupabaseModule = {
    getClient: function () {
      if (!window._supabaseClientInstance) {
        window._supabaseClientInstance = initSupabaseClient();
      }
      return window._supabaseClientInstance;
    },
    isConfigured: function () {
      return !!this.getClient();
    }
  };
})(window);
