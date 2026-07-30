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

  // Cryptographically Secure Backup Code Generator (Web Crypto API)
  function generateSecureBackupCode() {
    try {
      const array = new Uint16Array(3);
      window.crypto.getRandomValues(array);
      const seg1 = array[0].toString(16).padStart(4, '0').toUpperCase();
      const seg2 = array[1].toString(16).padStart(4, '0').toUpperCase();
      const seg3 = array[2].toString(16).padStart(4, '0').toUpperCase();
      return `BW-${seg1}-${seg2}-${seg3}`;
    } catch(e) {
      const fallback = () => Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase();
      return `BW-${fallback()}-${fallback()}-${fallback()}`;
    }
  }

  // Persistent Security System Settings (Phase 2.1.1 FINAL SaaS Schema)
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

      // Mirror keys to LocalStorage
      if (updated.admin_master_password) localStorage.setItem("admin_master_password", updated.admin_master_password);
      if (updated.admin_recovery_email !== undefined) localStorage.setItem("admin_recovery_email", updated.admin_recovery_email);
      if (updated.admin_recovery_code) localStorage.setItem("admin_recovery_code", updated.admin_recovery_code);
      if (updated.custom_secret_question !== undefined) localStorage.setItem("custom_secret_question", updated.custom_secret_question);
      if (updated.custom_secret_answer !== undefined) localStorage.setItem("custom_secret_answer", updated.custom_secret_answer);

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

      const defaultCode = generateSecureBackupCode();
      const hasCustomPass = !!(localData?.admin_master_password || localStorage.getItem("admin_master_password") || localStorage.getItem("custom_admin_password"));
      const isFirstTime = localData?.is_first_time !== undefined ? localData.is_first_time : !hasCustomPass;

      return {
        is_first_time: isFirstTime,
        admin_master_password: localData?.admin_master_password || localStorage.getItem("admin_master_password") || localStorage.getItem("custom_admin_password") || "",
        admin_recovery_email: localData?.admin_recovery_email !== undefined ? localData.admin_recovery_email : (localStorage.getItem("admin_recovery_email") || ""),
        admin_recovery_code: localData?.admin_recovery_code || localStorage.getItem("admin_recovery_code") || defaultCode,
        custom_secret_question: localData?.custom_secret_question !== undefined ? localData.custom_secret_question : (localStorage.getItem("custom_secret_question") || ""),
        custom_secret_answer: localData?.custom_secret_answer !== undefined ? localData.custom_secret_answer : (localStorage.getItem("custom_secret_answer") || ""),
        
        // Future SaaS User Architecture
        master_profile: localData?.master_profile || { username: "admin", display_name: "Master Admin", avatar: "👑" },
        created_at: localData?.created_at || new Date().toISOString(),
        last_login: localData?.last_login || new Date().toISOString(),
        last_password_change: localData?.last_password_change || new Date().toISOString(),
        account_status: localData?.account_status || "active",
        user_role: localData?.user_role || "super_admin",
        two_factor_auth: localData?.two_factor_auth || { enabled: false, secret: null }
      };
    } catch (e) {
      return {
        is_first_time: true,
        admin_master_password: "",
        admin_recovery_email: "",
        admin_recovery_code: generateSecureBackupCode(),
        custom_secret_question: "",
        custom_secret_answer: "",
        master_profile: { username: "admin", display_name: "Master Admin", avatar: "👑" },
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        last_password_change: new Date().toISOString(),
        account_status: "active",
        user_role: "super_admin",
        two_factor_auth: { enabled: false, secret: null }
      };
    }
  }

  // Dynamic Human-Readable Bytes Formatter (B, KB, MB, GB, TB)
  function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Storage Analytics & Media Usage Calculator
  function calculateStorageAnalytics(fileList, capacityBytes = 500 * 1024 * 1024) {
    let totalUsedBytes = 0;
    let imagesCount = 0, imagesBytes = 0;
    let videosCount = 0, videosBytes = 0;
    let audioCount = 0, audioBytes = 0;

    if (Array.isArray(fileList)) {
      fileList.forEach(f => {
        const size = f.size || (f.metadata ? f.metadata.size : 0) || 0;
        totalUsedBytes += size;
        const folder = f.folder || (f.path ? f.path.split('/')[0] : '');

        if (folder === 'photos' || (f.name && f.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i))) {
          imagesCount++;
          imagesBytes += size;
        } else if (folder === 'videos' || (f.name && f.name.match(/\.(mp4|webm|mov|mkv)$/i))) {
          videosCount++;
          videosBytes += size;
        } else if (folder === 'audio' || (f.name && f.name.match(/\.(mp3|wav|ogg|mpeg|m4a)$/i))) {
          audioCount++;
          audioBytes += size;
        }
      });
    }

    const remainingBytes = Math.max(0, capacityBytes - totalUsedBytes);

    return {
      totalUsedBytes,
      formattedTotalUsed: formatBytes(totalUsedBytes),
      remainingBytes,
      formattedRemaining: formatBytes(remainingBytes),
      capacityBytes,
      formattedCapacity: formatBytes(capacityBytes),
      images: { count: imagesCount, bytes: imagesBytes, formattedSize: formatBytes(imagesBytes) },
      videos: { count: videosCount, bytes: videosBytes, formattedSize: formatBytes(videosBytes) },
      audio: { count: audioCount, bytes: audioBytes, formattedSize: formatBytes(audioBytes) }
    };
  }

  window.DatabaseModule = {
    saveWish: saveWishRecord,
    getWishById: getWishRecordById,
    saveSecuritySettings: saveSecuritySettings,
    getSecuritySettings: getSecuritySettings,
    generateSecureBackupCode: generateSecureBackupCode,
    formatBytes: formatBytes,
    calculateStorageAnalytics: calculateStorageAnalytics
  };
})(window);
