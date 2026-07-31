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

  async function saveWishRecord(configObj) {
    try {
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (!client) return null;

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
        music_url: configObj.music?.file || null,
        video_url: configObj.videoWish?.url || configObj.videoWish?.file || null,
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
        msc: { f: data.music_url, file: data.music_url },
        v: { u: data.video_url, url: data.video_url },
        cf: data.cake_flavor,
        lf: data.letter_font,
        lt: data.letter_theme
      };
    } catch (e) {
      console.warn("⚠️ DB select exception:", e);
      return null;
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
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", password: cleanInput })
        });
        if (res.ok) {
          const data = await res.json();
          return !!data.valid;
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
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", newPassword: cleanPass })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            this._sessionPassword = cleanPass;
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
        admin_recovery_code: parsedMemory.admin_recovery_code || localData?.admin_recovery_code || localStorage.getItem("admin_recovery_code") || "BW-9F8A-3E21-7B04",
        custom_secret_question: cloudData?.security_question || parsedMemory.custom_secret_question || localData?.custom_secret_question || localStorage.getItem("custom_secret_question") || "What is your childhood pet's name?",
        custom_secret_answer: parsedMemory.custom_secret_answer || localData?.custom_secret_answer || localStorage.getItem("custom_secret_answer") || "arjun"
      };
    } catch (e) {
      return {
        admin_master_password: await PasswordService.getPassword(),
        admin_recovery_email: localStorage.getItem("admin_recovery_email") || "admin@example.com",
        recovery_email_verified: false,
        admin_recovery_code: localStorage.getItem("admin_recovery_code") || "BW-9F8A-3E21-7B04",
        custom_secret_question: localStorage.getItem("custom_secret_question") || "What is your childhood pet's name?",
        custom_secret_answer: localStorage.getItem("custom_secret_answer") || "arjun"
      };
    }
  }

  window.DatabaseModule = {
    saveWish: saveWishRecord,
    getWishById: getWishRecordById,
    saveSecuritySettings: saveSecuritySettings,
    getSecuritySettings: getSecuritySettings,
    initSecurityRealtime: () => PasswordService.initRealtime()
  };
})(window);
