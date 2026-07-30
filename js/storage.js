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

  async function listAllMediaFiles() {
    try {
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (!client) return [];

      const folders = ["photos", "videos", "audio"];
      const allFiles = [];

      for (const folder of folders) {
        const { data, error } = await client.storage
          .from(BUCKET_NAME)
          .list(folder, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

        if (!error && data) {
          data.forEach(item => {
            if (item.name && item.name !== ".emptyFolderPlaceholder") {
              const fullPath = `${folder}/${item.name}`;
              const { data: pubData } = client.storage.from(BUCKET_NAME).getPublicUrl(fullPath);
              allFiles.push({
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
        }
      }

      return allFiles;
    } catch (e) {
      console.warn("⚠️ Storage list exception:", e);
      return [];
    }
  }

  async function deleteMediaFile(path) {
    try {
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (!client || !path) return false;

      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .remove([path]);

      if (error) {
        console.warn("⚠️ Storage Delete Error:", error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn("⚠️ Storage delete exception:", e);
      return false;
    }
  }

  async function deleteMultipleMediaFiles(paths) {
    try {
      const client = window.SupabaseModule ? window.SupabaseModule.getClient() : null;
      if (!client || !Array.isArray(paths) || paths.length === 0) return false;

      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .remove(paths);

      if (error) {
        console.warn("⚠️ Storage Bulk Delete Error:", error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn("⚠️ Storage bulk delete exception:", e);
      return false;
    }
  }

  window.StorageModule = {
    uploadMedia: uploadMediaFile,
    listAllMedia: listAllMediaFiles,
    deleteMedia: deleteMediaFile,
    deleteMultipleMedia: deleteMultipleMediaFiles
  };
})(window);
