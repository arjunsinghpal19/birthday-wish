/**
 * ============================================================================
 * SUPABASE STORAGE MODULE (js/storage.js)
 * Manages user-uploaded media files for bucket 'wish-media'.
 * Preserves default local assets untouched. Returns public HTTPS URLs.
 * ============================================================================
 */

(function (window) {
  "use strict";

  const BUCKET_NAME = "wish-media";

  /**
   * Uploads a user media file (File or Blob) to the designated Supabase Storage folder.
   * @param {File|Blob|string} file - Media binary payload or asset reference.
   * @param {string} [folderName="photos"] - Target storage folder ("photos", "videos", "audio").
   * @returns {Promise<string|null>} Resolved public HTTPS URL or null on error.
   */
  async function uploadMediaFile(file, folderName = "photos") {
    try {
      if (!file || !(file instanceof File || file instanceof Blob)) return null;

      // Do NOT upload local asset paths
      if (typeof file === "string" && (file.startsWith("assets/") || file.startsWith("./assets/"))) {
        return null;
      }

      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (!client) return null;

      const fileExt = file.name ? file.name.split('.').pop() : 'png';
      const fileName = `${folderName}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.warn("⚠️ Supabase Storage Upload Error:", error.message);
        return null;
      }

      const { data: publicUrlData } = client.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      return publicUrlData ? publicUrlData.publicUrl : null;
    } catch (e) {
      console.warn("⚠️ Storage upload exception:", e);
      return null;
    }
  }

  /**
   * Lists all media items across storage folders for Digital Asset Management (DAM).
   * @returns {Promise<Array<Object>>} Array of asset metadata objects with public URLs.
   */
  async function listAllMediaFiles() {
    try {
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (!client) return [];

      const folders = ["photos", "videos", "audio"];

      // Concurrently query all three storage folders in parallel
      const folderResults = await Promise.all(
        folders.map(async (folder) => {
          try {
            const { data, error } = await client.storage
              .from(BUCKET_NAME)
              .list(folder, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

            if (error || !Array.isArray(data)) return [];

            const files = [];
            data.forEach(item => {
              if (item.name && item.name !== ".emptyFolderPlaceholder") {
                const fullPath = `${folder}/${item.name}`;
                const { data: pubData } = client.storage.from(BUCKET_NAME).getPublicUrl(fullPath);
                files.push({
                  id: item.id || `${folder}_${item.name}`,
                  name: item.name,
                  folder: folder,
                  path: fullPath,
                  size: item.metadata?.size || item.size || 0,
                  created_at: item.created_at || item.updated_at || new Date().toISOString(),
                  updated_at: item.updated_at || item.created_at || new Date().toISOString(),
                  mimetype: item.metadata?.mimetype || (folder === "photos" ? "image/jpeg" : folder === "videos" ? "video/mp4" : "audio/mpeg"),
                  publicUrl: pubData ? pubData.publicUrl : null
                });
              }
            });
            return files;
          } catch (folderErr) {
            console.warn(`⚠️ Storage folder list exception (${folder}):`, folderErr);
            return [];
          }
        })
      );

      return folderResults.flat();
    } catch (e) {
      console.warn("⚠️ Storage list exception:", e);
      return [];
    }
  }

  /**
   * Deletes a single media file from Supabase Storage bucket 'wish-media'.
   * Uses the secure serverless Admin Delete Media API (/api/admin-delete-media).
   * @param {string} path - Target relative storage path (e.g. "photos/123.jpg").
   * @returns {Promise<boolean>} True if object was deleted, false otherwise.
   */
  async function deleteMediaFile(path) {
    if (!path || typeof path !== "string") return false;
    const res = await deleteMultipleMediaFiles([path]);
    return res;
  }

  /**
   * Deletes multiple media files from Supabase Storage bucket 'wish-media'.
   * Uses the secure serverless Admin Delete Media API (/api/admin-delete-media).
   * @param {string[]} paths - Array of relative storage paths.
   * @returns {Promise<boolean>} True if objects were deleted, false otherwise.
   */
  async function deleteMultipleMediaFiles(paths) {
    try {
      if (!Array.isArray(paths) || paths.length === 0) return false;
      const validPaths = paths.filter(p => p && typeof p === "string" && p.trim() !== "");
      if (validPaths.length === 0) return false;

      const token = (typeof sessionStorage !== "undefined" && sessionStorage.getItem("admin_session_token")) ||
                    (typeof window !== "undefined" && window.sessionStorage && typeof window.sessionStorage.getItem === "function" && window.sessionStorage.getItem("admin_session_token")) || "";
      const apiUrl = (typeof window !== "undefined" && typeof window.getApiUrl === "function")
        ? window.getApiUrl("/api/admin-delete-media")
        : "/api/admin-delete-media";

      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({ paths: validPaths, adminToken: token })
        });

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.success) {
            console.log("🗑️ Secure Admin Delete Media API succeeded:", data.deletedCount || validPaths.length);
            return true;
          }
          console.warn("⚠️ Secure Admin Delete Media API reported failure:", data.error);
          return false;
        }

        if (res.status === 401 || res.status === 403 || res.status === 400) {
          const errData = await res.json().catch(() => ({}));
          console.warn(`⚠️ Secure Admin Delete Media API rejected (HTTP ${res.status}):`, errData.error);
          return false;
        }

        const errData = await res.json().catch(() => ({}));
        console.warn(`⚠️ Secure Admin Delete Media API returned HTTP ${res.status}:`, errData.error);
        return false;
      } catch (apiErr) {
        console.warn("⚠️ Secure Admin Delete Media API unreachable:", apiErr);
        return false;
      }
    } catch (e) {
      console.warn("⚠️ Storage bulk delete exception:", e);
      return false;
    }
  }

  window.StorageModule = {
    uploadMedia: uploadMediaFile,
    uploadMediaFile: uploadMediaFile,
    listAllMedia: listAllMediaFiles,
    deleteMedia: deleteMediaFile,
    deleteMultipleMedia: deleteMultipleMediaFiles
  };
})(window);
