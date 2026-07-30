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

  window.StorageModule = {
    uploadMedia: uploadMediaFile
  };
})(window);
