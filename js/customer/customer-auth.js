/**
 * ============================================================================
 * CUSTOMER CLIENT AUTHENTICATION MODULE (js/customer/customer-auth.js)
 * Architecture: Phase 32B-2 Customer Platform Foundation
 *
 * Dedicated, isolated client-side authentication controller for end-user
 * Customer accounts. Interacts exclusively with Supabase GoTrue Auth
 * (auth.users) and the public.customers profile table.
 *
 * CRITICAL ARCHITECTURAL INVARIANTS:
 * 1. 100% Isolated from Master Admin Authentication (api/auth.js, PBKDF2, WebAuthn).
 * 2. Uses client.auth GoTrue JWT storage in localStorage (sb-<ref>-auth-token).
 * 3. NEVER accesses, sets, or clears Admin sessionStorage keys (admin_*).
 * 4. Password validation: UTF-8 string with minimum length >= 6 characters.
 * 5. Profile queries strictly adhere to RLS customers_select_policy (auth.uid() = id).
 * ============================================================================
 */

(function (root) {
  "use strict";

  // In-memory cache for the currently active customer profile
  let _cachedProfile = null;
  let _cachedUserId = null;

  /**
   * Helper to retrieve the active singleton Supabase client instance.
   * @returns {Object|null}
   */
  function getClient() {
    if (root.SupabaseModule && typeof root.SupabaseModule.getClient === "function") {
      return root.SupabaseModule.getClient();
    }
    if (root._supabaseClientInstance) {
      return root._supabaseClientInstance;
    }
    return null;
  }

  /**
   * Basic RFC-compliant email string validator.
   * @param {string} email
   * @returns {boolean}
   */
  function isValidEmail(email) {
    if (!email || typeof email !== "string") return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  /**
   * Validates customer password strength policy (min 6 characters, full UTF-8).
   * @param {string} password
   * @returns {{ valid: boolean, error?: string }}
   */
  function validatePassword(password) {
    if (!password || typeof password !== "string") {
      return { valid: false, error: "Password is required." };
    }
    if (password.length < 6) {
      return { valid: false, error: "Password must be at least 6 characters long." };
    }
    return { valid: true };
  }

  /**
   * --------------------------------------------------------------------------
   * CustomerAuth.signUp(email, password, fullName)
   * --------------------------------------------------------------------------
   * Registers a new customer account using Supabase Auth.
   * Triggers the database handle_new_customer() trigger to provision public.customers.
   *
   * @param {string} email - Customer email address.
   * @param {string} password - Customer account password (min 6 chars).
   * @param {string} [fullName=""] - Customer display name (passed in raw_user_meta_data).
   * @returns {Promise<{ success: boolean, user?: Object, session?: Object, needsEmailConfirmation?: boolean, error?: string }>}
   */
  async function signUp(email, password, fullName = "") {
    try {
      const client = getClient();
      if (!client) {
        return { success: false, error: "Supabase database client is unavailable." };
      }

      const cleanEmail = (email || "").trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return { success: false, error: "Please provide a valid email address." };
      }

      const passCheck = validatePassword(password);
      if (!passCheck.valid) {
        return { success: false, error: passCheck.error };
      }

      const cleanFullName = (fullName || "").trim();
      const redirectUrl =
        (typeof window !== "undefined" &&
         window.location &&
         window.location.origin)
          ? `${window.location.origin}/customer`
          : "/customer";

      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: cleanFullName,
            name: cleanFullName
          }
        }
      });

      if (error) {
        console.warn("⚠️ CustomerAuth: Signup failed:", error.message);
        return { success: false, error: error.message };
      }

      const user = data ? data.user : null;
      const session = data ? data.session : null;
      const needsEmailConfirmation = !session && !!user;

      return {
        success: true,
        user,
        session,
        needsEmailConfirmation
      };
    } catch (err) {
      console.warn("⚠️ CustomerAuth: Unexpected signup exception:", err);
      return { success: false, error: err.message || "An unexpected error occurred during signup." };
    }
  }

  /**
   * --------------------------------------------------------------------------
   * CustomerAuth.signIn(email, password)
   * --------------------------------------------------------------------------
   * Authenticates an existing customer account using email and password.
   * Automatically stores the GoTrue JWT token in localStorage.
   *
   * @param {string} email - Customer email address.
   * @param {string} password - Customer password.
   * @returns {Promise<{ success: boolean, user?: Object, session?: Object, error?: string }>}
   */
  async function signIn(email, password) {
    try {
      const client = getClient();
      if (!client) {
        return { success: false, error: "Supabase database client is unavailable." };
      }

      const cleanEmail = (email || "").trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return { success: false, error: "Please enter a valid email address." };
      }

      if (!password || typeof password !== "string") {
        return { success: false, error: "Password is required." };
      }

      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (error) {
        console.warn("⚠️ CustomerAuth: Sign in failed:", error.message);
        return { success: false, error: error.message };
      }

      _cachedProfile = null;
      _cachedUserId = data.user ? data.user.id : null;

      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (err) {
      console.warn("⚠️ CustomerAuth: Unexpected sign in exception:", err);
      return { success: false, error: err.message || "An unexpected error occurred during sign in." };
    }
  }

  /**
   * --------------------------------------------------------------------------
   * CustomerAuth.signOut()
   * --------------------------------------------------------------------------
   * Terminates the current customer Supabase Auth session.
   * Resets customer in-memory caches. Strictly leaves Admin session intact.
   *
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async function signOut() {
    try {
      const client = getClient();
      if (!client) {
        return { success: false, error: "Supabase database client is unavailable." };
      }

      const { error } = await client.auth.signOut();
      _cachedProfile = null;
      _cachedUserId = null;

      if (error) {
        console.warn("⚠️ CustomerAuth: Sign out notice:", error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.warn("⚠️ CustomerAuth: Unexpected sign out exception:", err);
      return { success: false, error: err.message || "An unexpected error occurred during sign out." };
    }
  }

  /**
   * --------------------------------------------------------------------------
   * CustomerAuth.getSession()
   * --------------------------------------------------------------------------
   * Retrieves the current Supabase Auth session (access token, refresh token, expiry).
   *
   * @returns {Promise<{ session: Object|null, error?: string }>}
   */
  async function getSession() {
    try {
      const client = getClient();
      if (!client) return { session: null, error: "Client unavailable" };

      const { data, error } = await client.auth.getSession();
      if (error) {
        return { session: null, error: error.message };
      }
      return { session: data ? data.session : null };
    } catch (err) {
      return { session: null, error: err.message };
    }
  }

  /**
   * --------------------------------------------------------------------------
   * CustomerAuth.getCurrentUser()
   * --------------------------------------------------------------------------
   * Retrieves the currently authenticated customer user object.
   *
   * @returns {Promise<Object|null>} User object or null if unauthenticated.
   */
  async function getCurrentUser() {
    try {
      const client = getClient();
      if (!client) return null;

      const { data, error } = await client.auth.getUser();
      if (error || !data || !data.user) {
        return null;
      }
      return data.user;
    } catch (err) {
      return null;
    }
  }

  /**
   * --------------------------------------------------------------------------
   * CustomerAuth.getCustomerProfile(forceRefresh)
   * --------------------------------------------------------------------------
   * Fetches the customer profile row from public.customers for the logged-in customer.
   * Enforces tenant isolation via PostgreSQL RLS (auth.uid() = id).
   *
   * @param {boolean} [forceRefresh=false] - If true, bypasses in-memory cache.
   * @returns {Promise<{ success: boolean, profile: Object|null, error?: string }>}
   */
  async function getCustomerProfile(forceRefresh = false) {
    try {
      const client = getClient();
      if (!client) {
        return { success: false, profile: null, error: "Client unavailable" };
      }

      const user = await getCurrentUser();
      if (!user || !user.id) {
        _cachedProfile = null;
        _cachedUserId = null;
        return { success: false, profile: null, error: "User is not authenticated." };
      }

      if (!forceRefresh && _cachedProfile && _cachedUserId === user.id) {
        return { success: true, profile: _cachedProfile };
      }

      const { data, error } = await client
        .from("customers")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.warn("⚠️ CustomerAuth: Profile fetch error:", error ? error.message : "No row found");
        return { success: false, profile: null, error: error ? error.message : "Profile not found" };
      }

      _cachedProfile = data;
      _cachedUserId = user.id;

      return {
        success: true,
        profile: data
      };
    } catch (err) {
      console.warn("⚠️ CustomerAuth: Profile fetch exception:", err);
      return { success: false, profile: null, error: err.message || "Failed to fetch customer profile." };
    }
  }

  /**
   * --------------------------------------------------------------------------
   * CustomerAuth.onAuthStateChange(callback)
   * --------------------------------------------------------------------------
   * Subscribes to customer authentication state transitions (SIGNED_IN, SIGNED_OUT,
   * TOKEN_REFRESHED, USER_UPDATED).
   *
   * @param {Function} callback - Function receiving (event, session).
   * @returns {{ unsubscribe: Function }} Subscription teardown handle.
   */
  function onAuthStateChange(callback) {
    if (typeof callback !== "function") {
      console.warn("⚠️ CustomerAuth: onAuthStateChange requires a valid callback function.");
      return { unsubscribe: () => {} };
    }

    try {
      const client = getClient();
      if (!client) {
        console.warn("⚠️ CustomerAuth: Cannot attach onAuthStateChange listener (client unavailable).");
        return { unsubscribe: () => {} };
      }

      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
          _cachedProfile = null;
          _cachedUserId = null;
        } else if (event === "SIGNED_IN" && session && session.user) {
          _cachedUserId = session.user.id;
        }
        try {
          callback(event, session);
        } catch (cbErr) {
          console.warn("⚠️ CustomerAuth: Error in auth state change listener callback:", cbErr);
        }
      });

      return {
        unsubscribe: () => {
          if (data && data.subscription && typeof data.subscription.unsubscribe === "function") {
            data.subscription.unsubscribe();
          }
        }
      };
    } catch (err) {
      console.warn("⚠️ CustomerAuth: Failed to register auth state change listener:", err);
      return { unsubscribe: () => {} };
    }
  }

  /**
   * --------------------------------------------------------------------------
   * CustomerAuth.deleteAccount()
   * --------------------------------------------------------------------------
   * Permanently deletes the active customer account via serverless endpoint.
   * Clears in-memory caches upon confirmed deletion.
   *
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async function deleteAccount() {
    try {
      const sessionData = await getSession();
      const accessToken = (sessionData && sessionData.session) ? sessionData.session.access_token : null;

      if (!accessToken) {
        return { success: false, error: "No active customer session found." };
      }

      const res = await fetch("/api/customer-delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || `Deletion failed with status ${res.status}.`
        };
      }

      _cachedProfile = null;
      _cachedUserId = null;

      return { success: true };
    } catch (err) {
      console.warn("⚠️ CustomerAuth: deleteAccount exception:", err);
      return { success: false, error: err.message || "An unexpected error occurred during account deletion." };
    }
  }

  /**
   * --------------------------------------------------------------------------
   * CustomerAuth.updateCustomerProfile(updates)
   * --------------------------------------------------------------------------
   * Updates customer profile fields (e.g. full_name) in public.customers.
   * Scoped by PostgreSQL RLS customers_update_policy (auth.uid() = id).
   *
   * @param {{ full_name?: string }} updates
   * @returns {Promise<{ success: boolean, profile?: Object, error?: string }>}
   */
  async function updateCustomerProfile(updates = {}) {
    try {
      const client = getClient();
      if (!client) {
        return { success: false, error: "Database client is unavailable." };
      }

      const user = await getCurrentUser();
      if (!user || !user.id) {
        return { success: false, error: "User is not authenticated." };
      }

      const payload = {};
      if (typeof updates.full_name === "string") {
        payload.full_name = updates.full_name.trim();
      }

      const { data, error } = await client
        .from("customers")
        .update(payload)
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.warn("⚠️ CustomerAuth: Profile update error:", error.message);
        return { success: false, error: error.message };
      }

      // Also update GoTrue user metadata in parallel if available
      if (payload.full_name && client.auth && typeof client.auth.updateUser === "function") {
        await client.auth.updateUser({
          data: { full_name: payload.full_name, name: payload.full_name }
        }).catch(() => {});
      }

      _cachedProfile = data;
      _cachedUserId = user.id;

      return { success: true, profile: data };
    } catch (err) {
      console.warn("⚠️ CustomerAuth: Profile update exception:", err);
      return { success: false, error: err.message || "Failed to update profile." };
    }
  }

  /**
   * --------------------------------------------------------------------------
   * CustomerAuth.sendPasswordResetEmail(email)
   * --------------------------------------------------------------------------
   * Triggers a GoTrue password reset email with redirection back to /customer.
   *
   * @param {string} email
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async function sendPasswordResetEmail(email) {
    try {
      const client = getClient();
      if (!client) {
        return { success: false, error: "Database client is unavailable." };
      }

      const cleanEmail = (email || "").trim().toLowerCase();
      if (!cleanEmail || !isValidEmail(cleanEmail)) {
        return { success: false, error: "Please provide a valid email address." };
      }

      const redirectUrl =
        (typeof window !== "undefined" &&
         window.location &&
         window.location.origin)
          ? `${window.location.origin}/customer`
          : "/customer";

      const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl
      });

      if (error) {
        console.warn("⚠️ CustomerAuth: Password reset error:", error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.warn("⚠️ CustomerAuth: Password reset exception:", err);
      return { success: false, error: err.message || "Failed to send password reset email." };
    }
  }

  // Export CustomerAuth namespace to global window
  root.CustomerAuth = {
    signUp,
    signIn,
    signOut,
    deleteAccount,
    updateCustomerProfile,
    sendPasswordResetEmail,
    getSession,
    getCurrentUser,
    getCustomerProfile,
    onAuthStateChange,
    validatePassword,
    isValidEmail
  };

})(typeof window !== "undefined" ? window : globalThis);

