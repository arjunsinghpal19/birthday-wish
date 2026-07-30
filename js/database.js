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

  // Persistent Security System Settings (Phase 2.1)
  const SECURITY_STORAGE_KEY = "birthday_suite_security_config_v2";

  async function saveSecuritySettings(secObj) {
    try {
      const current = await getSecuritySettings();
      const updated = {
        ...current,
        ...secObj,
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(updated));

      // Also mirror individual keys for backward compatibility
      if (updated.admin_master_password) localStorage.setItem("admin_master_password", updated.admin_master_password);
      if (updated.admin_recovery_email) localStorage.setItem("admin_recovery_email", updated.admin_recovery_email);
      if (updated.admin_recovery_code) localStorage.setItem("admin_recovery_code", updated.admin_recovery_code);
      if (updated.custom_secret_question) localStorage.setItem("custom_secret_question", updated.custom_secret_question);
      if (updated.custom_secret_answer) localStorage.setItem("custom_secret_answer", updated.custom_secret_answer);

      // Attempt Supabase Cloud Sync if connection available
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (client) {
        client.from("wishes").upsert([{
          id: "00000000-0000-0000-0000-000000000001", // Reserved Admin Security Config UUID
          recipient_name: "__SYSTEM_SECURITY_CONFIG__",
          sender_name: "ADMIN_SYSTEM",
          pass_code: updated.admin_master_password || "admin123",
          memory_text: JSON.stringify(updated)
        }], { onConflict: "id" }).then(({ error }) => {
          if (error) console.warn("⚠️ Supabase Security Config sync notice:", error.message);
          else console.log("☁️ Security settings synced to Supabase Cloud.");
        });
      }

      return updated;
    } catch (e) {
      console.warn("⚠️ Error saving security settings:", e);
      return secObj;
    }
  }

  async function getSecuritySettings() {
    try {
      let localData = null;
      const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
      if (raw) {
        try { localData = JSON.parse(raw); } catch (err) {}
      }

      // Check Supabase Cloud fallback
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (client) {
        const { data } = await client.from("wishes").select("memory_text").eq("id", "00000000-0000-0000-0000-000000000001").single();
        if (data && data.memory_text) {
          try {
            const cloudData = JSON.parse(data.memory_text);
            if (cloudData) {
              localData = { ...localData, ...cloudData };
              localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(localData));
            }
          } catch(err) {}
        }
      }

      return {
        admin_master_password: localData?.admin_master_password || localStorage.getItem("admin_master_password") || localStorage.getItem("custom_admin_password") || "admin123",
        admin_recovery_email: localData?.admin_recovery_email || localStorage.getItem("admin_recovery_email") || "admin@example.com",
        admin_recovery_code: localData?.admin_recovery_code || localStorage.getItem("admin_recovery_code") || "BW-9F8A-3E21-7B04",
        custom_secret_question: localData?.custom_secret_question || localStorage.getItem("custom_secret_question") || "What is your childhood pet's name?",
        custom_secret_answer: localData?.custom_secret_answer || localStorage.getItem("custom_secret_answer") || "arjun"
      };
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

  window.DatabaseModule = {
    saveWish: saveWishRecord,
    getWishById: getWishRecordById,
    saveSecuritySettings: saveSecuritySettings,
    getSecuritySettings: getSecuritySettings
  };
})(window);
