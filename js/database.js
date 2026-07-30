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
        video_url: configObj.videoWish?.url || null,
        cake_flavor: configObj.cakeFlavor || "default",
        letter_font: configObj.letterFont || "default",
        letter_theme: configObj.letterTheme || "default"
      };

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

  window.DatabaseModule = {
    saveWish: saveWishRecord,
    getWishById: getWishRecordById
  };
})(window);
