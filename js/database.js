(function (window) {
  "use strict";

  const TABLE_NAME = "wishes";

  function encodeMediaUrlWithStart(url, startTime) {
    if (!url || typeof url !== "string") return null;
    const clean = url.trim();
    if (!clean) return null;
    const fn = (window.MediaService && window.MediaService.encodeMediaStartTime) || window.encodeMediaStartTime;
    return fn ? (fn(clean, startTime) || clean) : clean;
  }

  function decodeMediaUrlStart(url) {
    if (!url || typeof url !== "string") return 0;
    const fn = (window.MediaService && window.MediaService.decodeMediaStartTime) || window.decodeMediaStartTime;
    if (fn) return fn(url);
    const match = url.match(/#bw-start=(\d+)/i);
    return match ? (parseInt(match[1], 10) || 0) : 0;
  }

  function stripMediaUrlMetadata(url) {
    if (!url || typeof url !== "string") return "";
    const fn = (window.MediaService && window.MediaService.stripMediaMetadata) || window.stripMediaMetadata;
    return fn ? fn(url) : url.replace(/#bw-start=\d+/i, "").replace(/#+$/, "").trim();
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
   * Deletes multiple wish records via secure server-side Admin API (/api/admin-delete-wish).
   * Strictly filters out system config row. Never falls back to insecure direct anon delete.
   * @param {string[]} uuids - Array of wish UUIDs to delete.
   * @returns {Promise<{success: boolean, deletedIds?: string[], failedIds?: Array<{id: string, error?: string}>, deletedCount?: number, error?: string}>}
   */
  async function deleteWishesBulk(uuids) {
    try {
      if (!Array.isArray(uuids) || uuids.length === 0) {
        return { success: false, error: "No wish UUIDs provided for deletion", deletedIds: [], failedIds: [] };
      }

      // Filter out invalid or system config UUIDs
      const validIds = [];
      const localFailed = [];
      for (const rawId of uuids) {
        if (!rawId || typeof rawId !== "string") {
          localFailed.push({ id: String(rawId || ""), error: "Invalid UUID format" });
          continue;
        }
        const cleanId = rawId.trim();
        if (cleanId === SYSTEM_CONFIG_UUID) {
          console.warn("⚠️ DatabaseModule: Attempted bulk deletion of protected system configuration row blocked.");
          localFailed.push({ id: cleanId, error: "Cannot delete protected system configuration record" });
          continue;
        }
        if (!validIds.includes(cleanId)) {
          validIds.push(cleanId);
        }
      }

      if (validIds.length === 0) {
        return {
          success: false,
          error: "No valid wish UUIDs eligible for deletion",
          deletedIds: [],
          failedIds: localFailed
        };
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
          body: JSON.stringify({ uuids: validIds, adminToken: token })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            console.log("🗑️ Secure Admin API bulk deleted records count:", data.deletedCount || validIds.length);
            const allFailed = [...localFailed, ...(data.failedIds || [])];
            return {
              success: true,
              deletedIds: data.deletedIds || validIds,
              deletedCount: data.deletedCount || validIds.length,
              failedIds: allFailed
            };
          }
          return {
            success: false,
            error: data.error || "Server bulk deletion failed",
            deletedIds: [],
            failedIds: validIds.map(id => ({ id, error: data.error || "Server deletion failed" }))
          };
        }

        if (res.status === 404) {
          return {
            success: false,
            error: "Secure Admin Delete API unavailable.",
            deletedIds: [],
            failedIds: validIds.map(id => ({ id, error: "API unavailable" }))
          };
        }

        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errData.error || `Server returned HTTP ${res.status}`,
          deletedIds: [],
          failedIds: validIds.map(id => ({ id, error: errData.error || `HTTP ${res.status}` }))
        };
      } catch (apiErr) {
        console.warn("⚠️ Secure Admin Delete API unreachable:", apiErr);
        return {
          success: false,
          error: "Secure Admin Delete API unavailable.",
          deletedIds: [],
          failedIds: validIds.map(id => ({ id, error: "Network error" }))
        };
      }
    } catch (e) {
      console.warn("⚠️ DB bulk delete exception:", e);
      return { success: false, error: e.message || "Unknown error during bulk deletion", deletedIds: [], failedIds: [] };
    }
  }

  /**
   * Helper to construct a clean duplicate wish record payload from existing data.
   * Preserves all JSON structures and media URLs by reference without duplicating storage assets.
   * Appends '(Copy)' to recipient_name.
   * @param {object} data - Source wish record from database.
   * @returns {object} Payload ready for Supabase insert.
   */
  function prepareDuplicatePayload(data) {
    const originalName = data.recipient_name || "Friend";
    const duplicatedName = `${originalName} (Copy)`;

    return {
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

      const record = prepareDuplicatePayload(data);
      const { data: inserted, error: insertError } = await client
        .from(TABLE_NAME)
        .insert([record])
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.warn("⚠️ Supabase DB Duplicate Insert Error:", insertError ? insertError.message : "Failed insert");
        return { success: false, error: insertError ? insertError.message : "Failed to insert duplicate wish record" };
      }

      return { success: true, newId: inserted.id };
    } catch (e) {
      console.warn("⚠️ DB duplicate exception:", e);
      return { success: false, error: e.message || "Failed to duplicate wish record" };
    }
  }

  /**
   * Duplicates multiple existing wish records in Supabase table 'public.wishes'.
   * Generates new UUIDs for each duplicate, preserving JSON structures and media URLs by reference.
   * Strictly rejects duplication of the system configuration row.
   * @param {string[]} sourceUuids - Array of wish UUIDs to duplicate.
   * @returns {Promise<{success: boolean, createdCount: number, newWishes: Array<object>, failedIds: Array<any>, error?: string}>}
   */
  async function duplicateWishesBulk(sourceUuids) {
    try {
      if (!Array.isArray(sourceUuids) || sourceUuids.length === 0) {
        return { success: false, error: "No wish UUIDs provided for bulk duplication", createdCount: 0, newWishes: [], failedIds: [] };
      }

      const validSourceIds = [];
      const failedIds = [];

      sourceUuids.forEach(id => {
        if (!id || typeof id !== "string") {
          failedIds.push({ id, error: "Invalid UUID format" });
          return;
        }
        const cleanId = id.trim();
        if (cleanId === SYSTEM_CONFIG_UUID) {
          console.warn("⚠️ DatabaseModule: Attempted bulk duplication of protected system configuration row blocked.");
          failedIds.push({ id: cleanId, error: "Cannot duplicate protected system configuration record" });
          return;
        }
        validSourceIds.push(cleanId);
      });

      if (validSourceIds.length === 0) {
        return {
          success: false,
          error: "All provided wish UUIDs are invalid or protected",
          createdCount: 0,
          newWishes: [],
          failedIds
        };
      }

      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (!client) {
        return { success: false, error: "Database client unavailable", createdCount: 0, newWishes: [], failedIds };
      }

      // Fetch the source wish records
      const { data: sourceRecords, error: selectError } = await client
        .from(TABLE_NAME)
        .select("*")
        .in("id", validSourceIds);

      if (selectError || !Array.isArray(sourceRecords) || sourceRecords.length === 0) {
        console.warn("⚠️ Supabase DB Bulk Duplicate: Source wishes not found:", selectError ? selectError.message : "No records found");
        return {
          success: false,
          error: selectError ? selectError.message : "No matching source wish records found to duplicate",
          createdCount: 0,
          newWishes: [],
          failedIds: validSourceIds.map(id => ({ id, error: "Source record not found" }))
        };
      }

      // Identify any IDs that were not found in database
      const foundIds = new Set(sourceRecords.map(r => r.id));
      validSourceIds.forEach(id => {
        if (!foundIds.has(id)) {
          failedIds.push({ id, error: "Source record not found in database" });
        }
      });

      const duplicatePayloads = sourceRecords.map(r => prepareDuplicatePayload(r));
      const { data: insertedRecords, error: insertError } = await client
        .from(TABLE_NAME)
        .insert(duplicatePayloads)
        .select("*");

      if (insertError || !Array.isArray(insertedRecords)) {
        console.warn("⚠️ Supabase DB Bulk Duplicate Insert Error:", insertError ? insertError.message : "Failed batch insert");
        return {
          success: false,
          error: insertError ? insertError.message : "Failed to insert duplicate wish records",
          createdCount: 0,
          newWishes: [],
          failedIds: validSourceIds.map(id => ({ id, error: insertError ? insertError.message : "Batch insert failed" }))
        };
      }

      return {
        success: true,
        createdCount: insertedRecords.length,
        newWishes: insertedRecords,
        failedIds
      };
    } catch (e) {
      console.warn("⚠️ DB bulk duplicate exception:", e);
      return {
        success: false,
        error: e.message || "Failed to duplicate wish records",
        createdCount: 0,
        newWishes: [],
        failedIds: []
      };
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
            .select("pass_code, memory_text")
            .eq("id", "00000000-0000-0000-0000-000000000001")
            .single();

          if (!error && data) {
            let cloudPass = data.pass_code;
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

    async _hashPbkdf2Client(password, saltHex) {
      if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle || !saltHex) return null;
      try {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
          "raw",
          enc.encode(password),
          { name: "PBKDF2" },
          false,
          ["deriveBits"]
        );
        const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const derivedBits = await window.crypto.subtle.deriveBits(
          {
            name: "PBKDF2",
            salt: saltBytes,
            iterations: 100000,
            hash: "SHA-256"
          },
          keyMaterial,
          256
        );
        return Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, "0")).join("");
      } catch (e) {
        return null;
      }
    },

    async verifyPassword(inputPassword) {
      if (!inputPassword) return false;
      const cleanInput = inputPassword.trim();

      // 1. Try Serverless API verification (PBKDF2-HMAC-SHA256)
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
            this._sessionPassword = cleanInput;
            return true;
          }
          return false;
        }
      } catch (err) {
        console.warn("⚠️ Serverless Auth verification notice:", err);
      }

      // 2. Direct Supabase PBKDF2 hash verification fallback
      try {
        const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
        if (client) {
          const { data } = await client
            .from("wishes")
            .select("admin_password_hash, admin_password_salt, pass_code, memory_text")
            .eq("id", "00000000-0000-0000-0000-000000000001")
            .single();

          if (data) {
            if (data.admin_password_hash && data.admin_password_salt) {
              const computed = await this._hashPbkdf2Client(cleanInput, data.admin_password_salt);
              if (computed && computed === data.admin_password_hash) {
                this._sessionPassword = cleanInput;
                return true;
              }
            }
            const fallbackPass = data.pass_code || (data.memory_text && JSON.parse(data.memory_text).admin_master_password);
            if (fallbackPass && cleanInput === fallbackPass.trim()) {
              this._sessionPassword = cleanInput;
              return true;
            }
          }
        }
      } catch (e) {}

      // 3. Active session memory fallback
      if (this._sessionPassword && cleanInput === this._sessionPassword.trim()) {
        return true;
      }
      return false;
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

  const SECURITY_STORAGE_KEY = "birthday_suite_security_config_v2";

  async function saveSecuritySettings(secObj) {
    try {
      if (secObj.admin_master_password) {
        await PasswordService.updatePassword(secObj.admin_master_password);
      }

      // Preserve all existing cryptographic hashes & salts from cloud memory_text
      let existingMemory = {};
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (client) {
        try {
          const { data } = await client
            .from("wishes")
            .select("memory_text")
            .eq("id", "00000000-0000-0000-0000-000000000001")
            .single();
          if (data && data.memory_text) {
            existingMemory = JSON.parse(data.memory_text);
          }
        } catch (err) {}
      }

      const updated = {
        ...existingMemory,
        ...secObj,
        updated_at: new Date().toISOString()
      };

      // Strip sensitive plaintext credentials from database memory_text and localStorage
      delete updated.admin_master_password;
      delete updated.admin_recovery_code;

      if (client) {
        try {
          const { error: colErr } = await client.from("wishes").update({
            recovery_email: updated.admin_recovery_email,
            recovery_email_verified: updated.recovery_email_verified || false,
            memory_text: JSON.stringify(updated),
            updated_at: new Date().toISOString()
          }).eq("id", "00000000-0000-0000-0000-000000000001");

          // Pre-migration fallback if dedicated columns don't exist
          if (colErr) {
            await client.from("wishes").update({
              memory_text: JSON.stringify(updated),
              updated_at: new Date().toISOString()
            }).eq("id", "00000000-0000-0000-0000-000000000001");
          }
        } catch (updateErr) {
          console.warn("⚠️ DatabaseModule: Notice updating security settings:", updateErr);
        }
      }

      const metadataOnly = { ...updated };
      localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(metadataOnly));
      localStorage.removeItem("admin_master_password");
      localStorage.removeItem("custom_admin_password");
      localStorage.removeItem("admin_recovery_code");

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
      let cloudData = null;
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (client) {
        try {
          const { data } = await client
            .from("wishes")
            .select("recovery_email, recovery_email_verified, backup_code_hash, memory_text, updated_at")
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

      const hasBackup = !!(cloudData?.backup_code_hash || parsedMemory.backup_code_hash);
      const codeTime = parsedMemory.backup_code_updated_at || cloudData?.updated_at || parsedMemory.updated_at || null;
      const hasPasskey = !!(parsedMemory.passkeys && parsedMemory.passkeys.length > 0);

      return {
        admin_recovery_email: cloudData?.recovery_email || parsedMemory.admin_recovery_email || localData?.admin_recovery_email || "",
        recovery_email_verified: cloudData?.recovery_email_verified ?? parsedMemory.recovery_email_verified ?? false,
        has_recovery_code: hasBackup,
        recovery_code_updated_at: codeTime,
        has_passkey: hasPasskey,
        passkeys_count: (parsedMemory.passkeys || []).length
      };
    } catch (e) {
      return {
        admin_recovery_email: "",
        recovery_email_verified: false,
        has_recovery_code: false,
        recovery_code_updated_at: null,
        has_passkey: false,
        passkeys_count: 0
      };
    }
  }

  window.DatabaseModule = {
    saveWish: saveWishRecord,
    updateWish: updateWishRecord,
    getWishById: getWishRecordById,
    deleteWish: deleteWishRecord,
    deleteWishesBulk: deleteWishesBulk,
    duplicateWish: duplicateWishRecord,
    duplicateWishesBulk: duplicateWishesBulk,
    saveSecuritySettings: saveSecuritySettings,
    getSecuritySettings: getSecuritySettings,
    initSecurityRealtime: () => PasswordService.initRealtime()
  };
})(window);
