/**
 * ============================================================================
 * SUPABASE DATABASE MODULE (js/database.js)
 * Manages CRUD operations for table 'public.wishes'.
 * Stores JSON payloads and returns UUID primary keys.
 * ============================================================================
 */

(function (window) {
  "use strict";

  const TABLE_NAME = "wishes";

  // Safe helper to encode media start time metadata
  function encodeMediaUrlWithStart(url, startTime) {
    if (!url || typeof url !== "string") return null;
    const clean = url.trim();
    if (!clean) return null;
    if (window.MediaService && typeof window.MediaService.encodeMediaStartTime === "function") {
      return window.MediaService.encodeMediaStartTime(clean, startTime) || clean;
    }
    if (typeof window.encodeMediaStartTime === "function") {
      return window.encodeMediaStartTime(clean, startTime) || clean;
    }
    return clean;
  }

  // Safe helper to decode media start time metadata
  function decodeMediaUrlStart(url) {
    if (!url || typeof url !== "string") return 0;
    if (window.MediaService && typeof window.MediaService.decodeMediaStartTime === "function") {
      return window.MediaService.decodeMediaStartTime(url);
    }
    if (typeof window.decodeMediaStartTime === "function") {
      return window.decodeMediaStartTime(url);
    }
    const match = url.match(/#bw-start=(\d+)/i);
    return match ? (parseInt(match[1], 10) || 0) : 0;
  }

  // Safe helper to strip media start time metadata
  function stripMediaUrlMetadata(url) {
    if (!url || typeof url !== "string") return "";
    if (window.MediaService && typeof window.MediaService.stripMediaMetadata === "function") {
      return window.MediaService.stripMediaMetadata(url);
    }
    if (typeof window.stripMediaMetadata === "function") {
      return window.stripMediaMetadata(url);
    }
    return url.replace(/#bw-start=\d+/i, "").replace(/#+$/, "").trim();
  }

  async function saveWishRecord(configObj) {
    try {
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (!client) return null;

      const rawMusicFile = configObj.music?.file || null;
      const rawVideoUrl = configObj.videoWish?.url || configObj.videoWish?.file || null;

      const finalMusicUrl = encodeMediaUrlWithStart(rawMusicFile, configObj.music?.startTime);
      const finalVideoUrl = encodeMediaUrlWithStart(rawVideoUrl, configObj.videoWish?.startTime);

      const record = {
        recipient_name: configObj.name || "",
        sender_name: configObj.from || "",
        pass_code: configObj.passcode?.code || "1234",
        birth_date: configObj.birthDate || { year: 2001, month: 1, day: 1 },
        letter_lines: configObj.letterLines || [],
        memory_text: configObj.memory || "",
        reasons_json: configObj.reasons || [],
        wishes_json: configObj.wishes || [],
        gallery_json: configObj.gallery || [],
        timeline_json: configObj.timeline || [],
        gift_json: configObj.gift || {},
        music_url: finalMusicUrl,
        video_url: finalVideoUrl,
        cake_flavor: configObj.cakeFlavor || "default",
        letter_font: configObj.letterFont || "default",
        letter_theme: configObj.letterTheme || "default"
      };

      console.log("💾 Database INSERT record music_url:", record.music_url, "video_url:", record.video_url);

      const { data, error } = await client
        .from(TABLE_NAME)
        .insert([record])
        .select("id")
        .single();

      if (error) {
        console.warn("⚠️ Supabase DB Insert Error:", error.message);
        return null;
      }

      return data ? data.id : null;
    } catch (e) {
      console.warn("⚠️ DB insert exception:", e);
      return null;
    }
  }

  async function updateWishRecord(uuid, configObj) {
    try {
      if (!uuid) return null;
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (!client) return null;

      const rawMusicFile = configObj.music?.file || null;
      const rawVideoUrl = configObj.videoWish?.url || configObj.videoWish?.file || null;

      const finalMusicUrl = encodeMediaUrlWithStart(rawMusicFile, configObj.music?.startTime);
      const finalVideoUrl = encodeMediaUrlWithStart(rawVideoUrl, configObj.videoWish?.startTime);

      const record = {
        recipient_name: configObj.name || "",
        sender_name: configObj.from || "",
        pass_code: configObj.passcode?.code || "1234",
        birth_date: configObj.birthDate || { year: 2001, month: 1, day: 1 },
        letter_lines: configObj.letterLines || [],
        memory_text: configObj.memory || "",
        reasons_json: configObj.reasons || [],
        wishes_json: configObj.wishes || [],
        gallery_json: configObj.gallery || [],
        timeline_json: configObj.timeline || [],
        gift_json: configObj.gift || {},
        music_url: finalMusicUrl,
        video_url: finalVideoUrl,
        cake_flavor: configObj.cakeFlavor || "default",
        letter_font: configObj.letterFont || "default",
        letter_theme: configObj.letterTheme || "default",
        updated_at: new Date().toISOString()
      };

      console.log("💾 Database UPDATE record id:", uuid, "recipient:", record.recipient_name);

      const { error, count } = await client
        .from(TABLE_NAME)
        .update(record, { count: "exact" })
        .eq("id", uuid);

      if (error) {
        console.warn("⚠️ Supabase DB Update Error:", error.message);
        return null;
      }

      if (count === 0) {
        console.warn("⚠️ Existing wish UUID was not updated (row not found):", uuid);
        return null;
      }

      return uuid;
    } catch (e) {
      console.warn("⚠️ DB update exception:", e);
      return null;
    }
  }

  async function getWishRecordById(uuid) {
    try {
      if (!uuid) return null;
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (!client) return null;

      const { data, error } = await client
        .from(TABLE_NAME)
        .select("*")
        .eq("id", uuid)
        .single();

      if (error || !data) {
        console.warn("⚠️ Supabase DB Select Error:", error ? error.message : "Not found");
        return null;
      }

      console.log("📥 Database SELECT record music_url:", data.music_url, "video_url:", data.video_url);

      const rawMusic = data.music_url || "";
      const cleanMusic = stripMediaUrlMetadata(rawMusic);
      const musicStart = decodeMediaUrlStart(rawMusic);

      const rawVideo = data.video_url || "";
      const cleanVideo = stripMediaUrlMetadata(rawVideo);
      const videoStart = decodeMediaUrlStart(rawVideo);

      // Format database record back to application config schema
      return {
        n: data.recipient_name,
        f: data.sender_name,
        c: data.pass_code,
        y: data.birth_date?.year,
        m: data.birth_date?.month,
        d: data.birth_date?.day,
        mem: data.memory_text,
        l: data.letter_lines || [],
        r: data.reasons_json || [],
        w: data.wishes_json || [],
        g: data.gallery_json || [],
        t: data.timeline_json || [],
        gft: data.gift_json || {},
        msc: { f: cleanMusic, file: cleanMusic, startTime: musicStart, t: musicStart },
        v: { u: cleanVideo, url: cleanVideo, startTime: videoStart, t: videoStart },
        cf: data.cake_flavor,
        lf: data.letter_font,
        lt: data.letter_theme
      };
    } catch (e) {
      console.warn("⚠️ DB select exception:", e);
      return null;
    }
  }

  const SYSTEM_CONFIG_UUID = "00000000-0000-0000-0000-000000000001";

  /**
   * Deletes a wish record exclusively via secure server-side Admin API (/api/admin-delete-wish).
   * Strictly rejects deletion of system config row. Never falls back to insecure direct anon delete.
   * @param {string} uuid - Target wish UUID.
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function deleteWishRecord(uuid) {
    try {
      if (!uuid || typeof uuid !== "string") {
        return { success: false, error: "Invalid or missing wish UUID" };
      }
      const cleanId = uuid.trim();
      if (cleanId === SYSTEM_CONFIG_UUID) {
        console.warn("⚠️ DatabaseModule: Attempted deletion of protected system configuration row blocked.");
        return { success: false, error: "Cannot delete protected system configuration record." };
      }

      const token = (typeof sessionStorage !== "undefined" && sessionStorage.getItem("admin_session_token")) || "";
      const apiUrl = (typeof window !== "undefined" && typeof window.getApiUrl === "function")
        ? window.getApiUrl("/api/admin-delete-wish")
        : "/api/admin-delete-wish";

      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({ uuid: cleanId, adminToken: token })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            console.log("🗑️ Secure Admin API deleted record id:", cleanId);
            return { success: true };
          }
          return { success: false, error: data.error || "Server deletion failed" };
        }

        if (res.status === 401 || res.status === 403 || res.status === 400) {
          const errData = await res.json().catch(() => ({}));
          return { success: false, error: errData.error || `Server rejected deletion (HTTP ${res.status})` };
        }

        if (res.status === 404) {
          return {
            success: false,
            error: "Secure Admin Delete API unavailable. Use the Vercel/local server runtime for Admin operations."
          };
        }

        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || `Server returned HTTP ${res.status}` };
      } catch (apiErr) {
        console.warn("⚠️ Secure Admin Delete API unreachable:", apiErr);
        return {
          success: false,
          error: "Secure Admin Delete API unavailable. Use the Vercel/local server runtime for Admin operations."
        };
      }
    } catch (e) {
      console.warn("⚠️ DB delete exception:", e);
      return { success: false, error: e.message || "Unknown error during deletion" };
    }
  }

  /**
   * Duplicates an existing wish record in Supabase table 'public.wishes' with a real new UUID.
   * Preserves all JSON structures and media URLs by reference without duplicating storage assets.
   * Strictly rejects duplication of the system configuration row.
   * @param {string} sourceUuid - UUID of the wish to duplicate.
   * @returns {Promise<{success: boolean, newId?: string, error?: string}>}
   */
  async function duplicateWishRecord(sourceUuid) {
    try {
      if (!sourceUuid || typeof sourceUuid !== "string") {
        return { success: false, error: "Invalid or missing source wish UUID" };
      }
      const cleanSourceId = sourceUuid.trim();
      if (cleanSourceId === SYSTEM_CONFIG_UUID) {
        console.warn("⚠️ DatabaseModule: Attempted duplication of protected system configuration row blocked.");
        return { success: false, error: "Cannot duplicate protected system configuration record." };
      }

      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (!client) {
        return { success: false, error: "Database client unavailable" };
      }

      // Fetch the source wish record
      const { data, error: selectError } = await client
        .from(TABLE_NAME)
        .select("*")
        .eq("id", cleanSourceId)
        .single();

      if (selectError || !data) {
        console.warn("⚠️ Supabase DB Duplicate: Source wish not found:", selectError ? selectError.message : "No data");
        return { success: false, error: selectError ? selectError.message : "Source wish record not found" };
      }

      const originalName = data.recipient_name || "Friend";
      const duplicatedName = `${originalName} (Copy)`;

      const record = {
        recipient_name: duplicatedName,
        sender_name: data.sender_name || "",
        pass_code: data.pass_code || "1234",
        birth_date: data.birth_date || { year: 2001, month: 1, day: 1 },
        letter_lines: Array.isArray(data.letter_lines) ? JSON.parse(JSON.stringify(data.letter_lines)) : (data.letter_lines || []),
        memory_text: data.memory_text || "",
        reasons_json: Array.isArray(data.reasons_json) ? JSON.parse(JSON.stringify(data.reasons_json)) : (data.reasons_json || []),
        wishes_json: Array.isArray(data.wishes_json) ? JSON.parse(JSON.stringify(data.wishes_json)) : (data.wishes_json || []),
        gallery_json: Array.isArray(data.gallery_json) ? JSON.parse(JSON.stringify(data.gallery_json)) : (data.gallery_json || []),
        timeline_json: Array.isArray(data.timeline_json) ? JSON.parse(JSON.stringify(data.timeline_json)) : (data.timeline_json || []),
        gift_json: (data.gift_json && typeof data.gift_json === "object") ? JSON.parse(JSON.stringify(data.gift_json)) : (data.gift_json || {}),
        music_url: data.music_url || null,
        video_url: data.video_url || null,
        cake_flavor: data.cake_flavor || "default",
        letter_font: data.letter_font || "default",
        letter_theme: data.letter_theme || "default"
      };

      console.log("📋 Database DUPLICATE creating copy for:", duplicatedName, "from source id:", cleanSourceId);

      const { data: inserted, error: insertError } = await client
        .from(TABLE_NAME)
        .insert([record])
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.warn("⚠️ Supabase DB Duplicate Insert Error:", insertError ? insertError.message : "Failed insert");
        return { success: false, error: insertError ? insertError.message : "Failed to insert duplicate wish record" };
      }

      console.log("✅ Database DUPLICATE created new wish with UUID:", inserted.id);
      return { success: true, newId: inserted.id };
    } catch (e) {
      console.warn("⚠️ DB duplicate exception:", e);
      return { success: false, error: e.message || "Failed to duplicate wish record" };
    }
  }

  // ============================================================================
  // SINGLE PASSWORD SERVICE (Supabase Single Source of Truth)
  // Stores password ONLY in JS memory during active session (_sessionPassword).
  // NEVER stores passwords in localStorage keys.
  // ============================================================================
  const PasswordService = {
    _sessionPassword: null,

    async getPassword(forceRefresh = false) {
      if (!forceRefresh && this._sessionPassword) {
        return this._sessionPassword;
      }
      try {
        const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
        if (client) {
          const { data, error } = await client
            .from("wishes")
            .select("admin_password_hash, pass_code, memory_text")
            .eq("id", "00000000-0000-0000-0000-000000000001")
            .single();

          if (!error && data) {
            // pass_code / admin_password_hash takes primary precedence
            let cloudPass = data.admin_password_hash || data.pass_code;

            // Fallback to memory_text if pass_code is unpopulated
            if (!cloudPass && data.memory_text) {
              try {
                const parsed = JSON.parse(data.memory_text);
                if (parsed && parsed.admin_master_password) cloudPass = parsed.admin_master_password;
              } catch (e) {}
            }

            if (cloudPass) {
              this._sessionPassword = cloudPass;
              return cloudPass;
            }
          }
        }
      } catch (err) {
        console.warn("⚠️ PasswordService fetch notice:", err);
      }
      return this._sessionPassword;
    },

    async verifyPassword(inputPassword) {
      if (!inputPassword) return false;
      const cleanInput = inputPassword.trim();

      // Try Serverless API verification (PBKDF2-HMAC-SHA256)
      try {
        const apiUrl = window.getApiUrl ? window.getApiUrl("/api/auth") : "/api/auth";
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", password: cleanInput })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.valid) {
            if (data.token && typeof sessionStorage !== "undefined") {
              sessionStorage.setItem("admin_session_token", data.token);
            }
            return true;
          }
          return false;
        }
      } catch (err) {
        console.warn("⚠️ Serverless Auth verification notice:", err);
      }

      // Local session memory fallback
      const actualPassword = await this.getPassword();
      if (!actualPassword) return false;
      return cleanInput === actualPassword.trim();
    },

    async updatePassword(newPassword) {
      if (!newPassword || newPassword.trim().length < 4) return false;
      const cleanPass = newPassword.trim();

      // Try Serverless API password update (PBKDF2-HMAC-SHA256 + 16-byte salt)
      try {
        const apiUrl = window.getApiUrl ? window.getApiUrl("/api/auth") : "/api/auth";
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", newPassword: cleanPass })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            this._sessionPassword = cleanPass;
            if (data.token && typeof sessionStorage !== "undefined") {
              sessionStorage.setItem("admin_session_token", data.token);
            }
            console.log("🔑 Password hashed (PBKDF2-HMAC-SHA256) & updated via Serverless API.");
            return true;
          }
        }
      } catch (err) {
        console.warn("⚠️ Serverless Auth update notice:", err);
      }

      // Supabase direct fallback if serverless unavailable
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (!client) return false;

      let payload = {};
      try {
        const { data } = await client
          .from("wishes")
          .select("memory_text")
          .eq("id", "00000000-0000-0000-0000-000000000001")
          .single();
        if (data && data.memory_text) {
          payload = JSON.parse(data.memory_text);
        }
      } catch (e) {}

      payload.admin_master_password = cleanPass;
      payload.updated_at = new Date().toISOString();

      const { error } = await client
        .from("wishes")
        .update({
          pass_code: cleanPass,
          memory_text: JSON.stringify(payload),
          updated_at: new Date().toISOString()
        })
        .eq("id", "00000000-0000-0000-0000-000000000001");

      if (error) return false;

      this._sessionPassword = cleanPass;
      return true;
    },

    initRealtime() {
      try {
        const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
        if (!client) return;

        client
          .channel("public:wishes:password_security")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "wishes", filter: "id=eq.00000000-0000-0000-0000-000000000001" },
            (payload) => {
              console.log("⚡ Supabase Realtime Password Update received:", payload);
              PasswordService.getPassword(true);
            }
          )
          .subscribe();
      } catch (e) {
        console.warn("⚠️ Realtime password subscription notice:", e);
      }
    }
  };

  window.PasswordService = PasswordService;

  // Persistent Security Metadata Storage
  const SECURITY_STORAGE_KEY = "birthday_suite_security_config_v2";

  /**
   * Persists updated security metadata and configuration options to cloud DB & localStorage.
   * @param {Object} secObj - Security metadata configuration payload.
   * @returns {Promise<Object>} Resolved updated security settings object.
   */
  async function saveSecuritySettings(secObj) {
    try {
      if (secObj.admin_master_password) {
        await PasswordService.updatePassword(secObj.admin_master_password);
      }

      const current = await getSecuritySettings();
      const updated = {
        ...current,
        ...secObj,
        updated_at: new Date().toISOString()
      };

      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (client) {
        const cloudFields = {
          recovery_email: updated.admin_recovery_email,
          recovery_email_verified: updated.recovery_email_verified || false,
          security_question: updated.custom_secret_question,
          memory_text: JSON.stringify(updated),
          updated_at: new Date().toISOString()
        };
        await client.from("wishes").update(cloudFields).eq("id", "00000000-0000-0000-0000-000000000001");
      }

      const metadataOnly = { ...updated };
      delete metadataOnly.admin_master_password;
      localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(metadataOnly));
      localStorage.removeItem("admin_master_password");
      localStorage.removeItem("custom_admin_password");

      return updated;
    } catch (e) {
      console.warn("⚠️ Error saving security settings:", e);
      return secObj;
    }
  }

  /**
   * Retrieves security configuration metadata from cloud DB or local storage fallbacks.
   * @param {boolean} [forceRefresh=false] - If true, bypasses in-memory session cache.
   * @returns {Promise<Object>} Resolved security configuration metadata object.
   */
  async function getSecuritySettings(forceRefresh = false) {
    try {
      const masterPass = await PasswordService.getPassword(forceRefresh);
      let cloudData = null;

      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (client) {
        try {
          const { data } = await client
            .from("wishes")
            .select("recovery_email, recovery_email_verified, security_question, memory_text")
            .eq("id", "00000000-0000-0000-0000-000000000001")
            .single();
          if (data) cloudData = data;
        } catch (err) {}
      }

      let localData = null;
      const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
      if (raw) {
        try { localData = JSON.parse(raw); } catch (err) {}
      }

      let parsedMemory = {};
      if (cloudData?.memory_text) {
        try { parsedMemory = JSON.parse(cloudData.memory_text); } catch (e) {}
      }

      return {
        admin_master_password: masterPass,
        admin_recovery_email: cloudData?.recovery_email || parsedMemory.admin_recovery_email || localData?.admin_recovery_email || localStorage.getItem("admin_recovery_email") || "admin@example.com",
        recovery_email_verified: cloudData?.recovery_email_verified ?? parsedMemory.recovery_email_verified ?? false,
        admin_recovery_code: parsedMemory.admin_recovery_code || localData?.admin_recovery_code || localStorage.getItem("admin_recovery_code") || "WS-9F8A-3E21-7B04",
        custom_secret_question: cloudData?.security_question || parsedMemory.custom_secret_question || localData?.custom_secret_question || localStorage.getItem("custom_secret_question") || "Who is your best friend?",
        custom_secret_answer: parsedMemory.custom_secret_answer || localData?.custom_secret_answer || localStorage.getItem("custom_secret_answer") || "Shivam"
      };
    } catch (e) {
      return {
        admin_master_password: await PasswordService.getPassword(),
        admin_recovery_email: localStorage.getItem("admin_recovery_email") || "admin@example.com",
        recovery_email_verified: false,
        admin_recovery_code: localStorage.getItem("admin_recovery_code") || "WS-9F8A-3E21-7B04",
        custom_secret_question: localStorage.getItem("custom_secret_question") || "Who is your best friend?",
        custom_secret_answer: localStorage.getItem("custom_secret_answer") || "Shivam"
      };
    }
  }

  window.DatabaseModule = {
    saveWish: saveWishRecord,
    updateWish: updateWishRecord,
    getWishById: getWishRecordById,
    deleteWish: deleteWishRecord,
    duplicateWish: duplicateWishRecord,
    saveSecuritySettings: saveSecuritySettings,
    getSecuritySettings: getSecuritySettings,
    initSecurityRealtime: () => PasswordService.initRealtime()
  };
})(window);
