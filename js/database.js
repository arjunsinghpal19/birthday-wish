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

  // Persistent Security System Settings (Phase 2.1 - Single Source of Truth: Supabase)
  const SECURITY_STORAGE_KEY = "birthday_suite_security_config_v2";
  let _cachedSecuritySettings = null;

  async function saveSecuritySettings(secObj) {
    try {
      const current = await getSecuritySettings();
      const updated = {
        ...current,
        ...secObj,
        updated_at: new Date().toISOString()
      };

      // 1. Primary Write: Supabase Cloud (Single Source of Truth)
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (client) {
        const { error } = await client.from("wishes").upsert([{
          id: "00000000-0000-0000-0000-000000000001", // Reserved Admin Security Config UUID
          recipient_name: "__SYSTEM_SECURITY_CONFIG__",
          sender_name: "ADMIN_SYSTEM",
          pass_code: updated.admin_master_password || "admin123",
          memory_text: JSON.stringify(updated)
        }], { onConflict: "id" });

        if (error) {
          console.warn("⚠️ Supabase Security Config sync error:", error.message);
        } else {
          console.log("☁️ Security settings successfully synced to Supabase Cloud.");
        }
      }

      // 2. Secondary Write: Local Cache Update
      localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(updated));
      if (updated.admin_master_password) {
        localStorage.setItem("admin_master_password", updated.admin_master_password);
        localStorage.setItem("custom_admin_password", updated.admin_master_password);
      }
      if (updated.admin_recovery_email) localStorage.setItem("admin_recovery_email", updated.admin_recovery_email);
      if (updated.admin_recovery_code) localStorage.setItem("admin_recovery_code", updated.admin_recovery_code);
      if (updated.custom_secret_question) localStorage.setItem("custom_secret_question", updated.custom_secret_question);
      if (updated.custom_secret_answer) localStorage.setItem("custom_secret_answer", updated.custom_secret_answer);

      // 3. Memory Cache Update
      _cachedSecuritySettings = updated;

      return updated;
    } catch (e) {
      console.warn("⚠️ Error saving security settings:", e);
      return secObj;
    }
  }

  async function getSecuritySettings(forceRefresh = false) {
    // Return memory cache during active session unless explicit refresh requested
    if (!forceRefresh && _cachedSecuritySettings) {
      return _cachedSecuritySettings;
    }

    try {
      let cloudData = null;

      // 1. Fetch from Supabase Cloud (Single Source of Truth)
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (client) {
        try {
          const { data } = await client.from("wishes").select("memory_text, pass_code").eq("id", "00000000-0000-0000-0000-000000000001").single();
          if (data) {
            if (data.memory_text) {
              try { cloudData = JSON.parse(data.memory_text); } catch (err) {}
            }
            if (!cloudData && data.pass_code) {
              cloudData = { admin_master_password: data.pass_code };
            }
          }
        } catch (err) {
          console.warn("⚠️ Supabase Cloud fetch notice:", err);
        }
      }

      // 2. Read local cache fallback
      let localData = null;
      const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
      if (raw) {
        try { localData = JSON.parse(raw); } catch (err) {}
      }

      // 3. Supabase Cloud takes absolute priority over Local Cache
      const finalPass = cloudData?.admin_master_password || localData?.admin_master_password || localStorage.getItem("admin_master_password") || localStorage.getItem("custom_admin_password") || "admin123";

      const merged = {
        admin_master_password: finalPass,
        admin_recovery_email: cloudData?.admin_recovery_email || localData?.admin_recovery_email || localStorage.getItem("admin_recovery_email") || "admin@example.com",
        admin_recovery_code: cloudData?.admin_recovery_code || localData?.admin_recovery_code || localStorage.getItem("admin_recovery_code") || "BW-9F8A-3E21-7B04",
        custom_secret_question: cloudData?.custom_secret_question || localData?.custom_secret_question || localStorage.getItem("custom_secret_question") || "What is your childhood pet's name?",
        custom_secret_answer: cloudData?.custom_secret_answer || localData?.custom_secret_answer || localStorage.getItem("custom_secret_answer") || "arjun"
      };

      // 4. Update local cache automatically with latest cloud data
      localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(merged));
      localStorage.setItem("admin_master_password", merged.admin_master_password);
      localStorage.setItem("custom_admin_password", merged.admin_master_password);

      _cachedSecuritySettings = merged;
      return merged;
    } catch (e) {
      return {
        admin_master_password: localStorage.getItem("admin_master_password") || "admin123",
        admin_recovery_email: localStorage.getItem("admin_recovery_email") || "admin@example.com",
        admin_recovery_code: localStorage.getItem("admin_recovery_code") || "BW-9F8A-3E21-7B04",
        custom_secret_question: localStorage.getItem("custom_secret_question") || "What is your childhood pet's name?",
        custom_secret_answer: localStorage.getItem("custom_secret_answer") || "arjun"
      };
    }
  }

  function initSecurityRealtime() {
    try {
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (!client) return;

      client
        .channel("public:wishes:security_config")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "wishes", filter: "id=eq.00000000-0000-0000-0000-000000000001" },
          (payload) => {
            console.log("⚡ Supabase Realtime Security Update received across devices:", payload);
            getSecuritySettings(true).then((sec) => {
              if (sec && sec.admin_master_password) {
                window._globalAdminPassword = sec.admin_master_password;
                if (window.CONFIG) window.CONFIG.adminPassword = sec.admin_master_password;
              }
            });
          }
        )
        .subscribe();
    } catch (e) {
      console.warn("⚠️ Realtime subscription notice:", e);
    }
  }

  window.DatabaseModule = {
    saveWish: saveWishRecord,
    getWishById: getWishRecordById,
    saveSecuritySettings: saveSecuritySettings,
    getSecuritySettings: getSecuritySettings,
    initSecurityRealtime: initSecurityRealtime
  };
})(window);
