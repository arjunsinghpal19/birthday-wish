(function (window) {
  "use strict";

  const TABLE_NAME = "wishes";
  const SYSTEM_CONFIG_UUID = "00000000-0000-0000-0000-000000000001";
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function generateWishUuid() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

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

  async function saveWishRecord(configObj, options = {}) {
    try {
      const isCustomerContext = (options && (options.context === "customer" || options.isCustomer === true))
        || (configObj && (configObj._creatorContext === "customer" || configObj._isCustomer === true));

      let client = null;
      let ownerId = null;

      if (isCustomerContext) {
        // Explicit Customer creation flow: uses authenticated Supabase client and customer UUID
        client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
        if (options && options.ownerId && typeof options.ownerId === "string") {
          ownerId = options.ownerId.trim();
        } else if (configObj && configObj._ownerId && typeof configObj._ownerId === "string") {
          ownerId = configObj._ownerId.trim();
        } else if (window.CustomerAuth && typeof window.CustomerAuth.getCurrentUser === "function") {
          try {
            const u = await window.CustomerAuth.getCurrentUser();
            if (u && u.id) ownerId = u.id;
          } catch (authErr) {}
        }
      } else {
        // Admin or Quick Editor / Anonymous creation: strictly unowned (owner_id = NULL)
        // Uses pure anonymous client to guarantee no ambient customer JWT is attached
        client = (window.SupabaseModule && typeof window.SupabaseModule.getAnonClient === "function")
          ? window.SupabaseModule.getAnonClient()
          : (window.SupabaseModule ? window.SupabaseModule.getClient() : null);
        ownerId = null;
      }

      if (!client) return null;

      const rawMusicFile = configObj.music?.file || null;
      const rawVideoUrl = configObj.videoWish?.url || configObj.videoWish?.file || null;

      const finalMusicUrl = encodeMediaUrlWithStart(rawMusicFile, configObj.music?.startTime);
      const finalVideoUrl = encodeMediaUrlWithStart(rawVideoUrl, configObj.videoWish?.startTime);

      const targetUuid = (configObj._activeWishUuid && UUID_REGEX.test(configObj._activeWishUuid) && configObj._activeWishUuid !== SYSTEM_CONFIG_UUID)
        ? configObj._activeWishUuid
        : ((configObj.id && UUID_REGEX.test(configObj.id) && configObj.id !== SYSTEM_CONFIG_UUID) ? configObj.id : generateWishUuid());

      const record = {
        id: targetUuid,
        owner_id: ownerId,
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

      console.log("💾 Database INSERT record id:", record.id, "music_url:", record.music_url, "video_url:", record.video_url);

      const { error } = await client
        .from(TABLE_NAME)
        .insert([record]);

      if (error) {
        console.warn("⚠️ Supabase DB Insert Error:", error.message);
        return null;
      }

      return targetUuid;
    } catch (e) {
      console.warn("⚠️ DB insert exception:", e);
      return null;
    }
  }

  async function updateWishRecord(uuid, configObj) {
    try {
      if (!uuid) return null;

      const apiUrl = (typeof window !== "undefined" && typeof window.getApiUrl === "function")
        ? window.getApiUrl(`/api/quick-update-wish?id=${encodeURIComponent(uuid)}`)
        : `/api/quick-update-wish?id=${encodeURIComponent(uuid)}`;

      const candidatePasscode = configObj.passcode?.code || configObj.pass_code || "1234";

      console.log("💾 Quick Editor update request for id:", uuid, "recipient:", configObj.name);

      // Primary Secure Path: Serverless endpoint with Service Role execution & passcode verification
      try {
        const res = await fetch(apiUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-wish-passcode": candidatePasscode
          },
          body: JSON.stringify({
            config: configObj,
            passcode: candidatePasscode
          })
        });

        if (res.ok) {
          const result = await res.json();
          if (result && result.success) {
            console.log("💾 Quick Editor wish updated successfully:", uuid);
            return result.id || uuid;
          }
        } else {
          let errData = {};
          try { errData = await res.json(); } catch (e) {}
          console.warn("⚠️ Quick Editor update API rejected:", errData.error || `HTTP ${res.status}`);
          return null;
        }
      } catch (apiEx) {
        console.warn("⚠️ Quick Editor update API fetch notice:", apiEx.message || apiEx);
        return null;
      }

      return null;
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

      const cleanId = String(uuid).trim();
      if (cleanId === SYSTEM_CONFIG_UUID) {
        console.warn("⚠️ DatabaseModule: Attempted fetch of protected system configuration row blocked.");
        return null;
      }

      let data = null;

      // 1. Primary Modern Path: Call public RPC (get_public_wish)
      try {
        const { data: rpcData, error: rpcError } = await client.rpc("get_public_wish", {
          target_id: cleanId
        });

        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          data = rpcData[0];
        } else if (!rpcError && rpcData && !Array.isArray(rpcData) && typeof rpcData === "object" && rpcData.id) {
          data = rpcData;
        }
      } catch (rpcEx) {
        console.warn("⚠️ DatabaseModule: RPC get_public_wish notice:", rpcEx.message || rpcEx);
      }

      // 2. Safe Fallback Path (during transition or test mocking)
      if (!data) {
        const { data: selectData, error: selectError } = await client
          .from(TABLE_NAME)
          .select("*")
          .eq("id", cleanId)
          .single();

        if (selectError || !selectData) {
          console.warn("⚠️ Supabase DB Select Error:", selectError ? selectError.message : "Not found");
          return null;
        }
        data = selectData;
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
          return { success: false, error: "Secure Admin Delete API unavailable." };
        }

        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || `Server returned HTTP ${res.status}` };
      } catch (apiErr) {
        console.warn("⚠️ Secure Admin Delete API unreachable:", apiErr);
        return { success: false, error: "Secure Admin Delete API unavailable." };
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

  function prepareDuplicatePayload(data) {
    const originalName = data.recipient_name || "Friend";
    return {
      recipient_name: `${originalName} (Copy)`,
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

      const token = (typeof sessionStorage !== "undefined" && sessionStorage.getItem("admin_session_token")) || "";
      const apiUrl = (typeof window !== "undefined" && typeof window.getApiUrl === "function")
        ? window.getApiUrl("/api/admin-duplicate-wish")
        : "/api/admin-duplicate-wish";

      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": token,
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({ uuid: cleanSourceId, adminToken: token })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.newId) {
            console.log("📋 Duplicated wish record with new ID:", data.newId);
            return { success: true, newId: data.newId };
          }
          return { success: false, error: data.error || "Failed to duplicate wish record" };
        }

        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || `Server returned HTTP ${res.status}` };
      } catch (apiErr) {
        console.warn("⚠️ Secure Admin Duplicate API unreachable:", apiErr);
        return { success: false, error: "Secure Admin Duplicate API unavailable." };
      }
    } catch (e) {
      console.warn("⚠️ DB duplicate exception:", e);
      return { success: false, error: e.message || "Failed to duplicate wish record" };
    }
  }

  async function duplicateWishesBulk(sourceUuids) {
    try {
      if (!Array.isArray(sourceUuids) || sourceUuids.length === 0) {
        return { success: false, error: "No wish UUIDs provided for bulk duplication", createdCount: 0, newWishes: [], failedIds: [] };
      }

      const validSourceIds = [];
      const failedIds = [];
      for (const rawId of sourceUuids) {
        if (!rawId || typeof rawId !== "string") {
          failedIds.push({ id: String(rawId || ""), error: "Invalid UUID format" });
          continue;
        }
        const cleanId = rawId.trim();
        if (cleanId === SYSTEM_CONFIG_UUID) {
          console.warn("⚠️ DatabaseModule: Attempted duplication of protected system configuration row blocked.");
          failedIds.push({ id: cleanId, error: "Cannot duplicate protected system configuration record" });
          continue;
        }
        if (!validSourceIds.includes(cleanId)) validSourceIds.push(cleanId);
      }

      if (validSourceIds.length === 0) {
        return { success: false, error: "All provided wish UUIDs are invalid or protected", createdCount: 0, newWishes: [], failedIds };
      }

      const token = (typeof sessionStorage !== "undefined" && sessionStorage.getItem("admin_session_token")) || "";
      const apiUrl = (typeof window !== "undefined" && typeof window.getApiUrl === "function")
        ? window.getApiUrl("/api/admin-duplicate-wish")
        : "/api/admin-duplicate-wish";

      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": token,
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({ uuids: validSourceIds, adminToken: token })
        });

        if (res.ok) {
          const data = await res.json();
          return {
            success: !!data.success,
            createdCount: data.createdCount || (data.newWishes ? data.newWishes.length : 0),
            newWishes: data.newWishes || [],
            failedIds: (data.failedIds || []).concat(failedIds)
          };
        }

        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errData.error || `Server returned HTTP ${res.status}`,
          createdCount: 0,
          newWishes: [],
          failedIds: validSourceIds.map(id => ({ id, error: errData.error || `HTTP ${res.status}` })).concat(failedIds)
        };
      } catch (apiErr) {
        console.warn("⚠️ Secure Admin Duplicate API unreachable:", apiErr);
        return {
          success: false,
          error: "Secure Admin Duplicate API unavailable.",
          createdCount: 0,
          newWishes: [],
          failedIds: validSourceIds.map(id => ({ id, error: "Network error" })).concat(failedIds)
        };
      }
    } catch (e) {
      console.warn("⚠️ DB bulk duplicate exception:", e);
      return { success: false, error: e.message || "Failed to duplicate wish records", createdCount: 0, newWishes: [], failedIds: [] };
    }
  }

  const PasswordService = {
    _sessionPassword: null,

    async getPassword(forceRefresh = false) {
      if (!forceRefresh && this._sessionPassword) return this._sessionPassword;
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
        const adminToken = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("admin_session_token") : null;
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(adminToken ? { "x-admin-token": adminToken } : {})
          },
          body: JSON.stringify({ action: "update", newPassword: cleanPass, adminToken })
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

  async function getSecuritySettings(forceRefresh = false) {
    try {
      try {
        const apiUrl = window.getApiUrl ? window.getApiUrl("/api/auth") : "/api/auth";
        const authRes = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get-security-status" })
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData && authData.success) {
            return authData;
          }
        }
      } catch (apiErr) {}

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
