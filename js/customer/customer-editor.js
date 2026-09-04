/**
 * ============================================================================
 * CUSTOMER WISH EDITOR CONTROLLER (js/customer/customer-editor.js)
 * Architecture: Phase 32E-2 Customer Platform Foundation
 *
 * Dedicated in-dashboard 12-section Wish Editor for Customers with full
 * Admin Studio feature and visual parity.
 *
 * INVARIANTS:
 * 1. Customer-scoped: created/edited wishes bind to authenticated customer.
 * 2. Reuses WishDefaults, RelationshipPresets, MediaService, StorageModule, DatabaseModule.
 * 3. File size strictly under 35 KB ceiling.
 * ============================================================================
 */

(function (root) {
  "use strict";

  let editorState = {
    isOpen: false,
    mode: "new",
    activeWishUuid: null,
    isDirty: false,
    isSaving: false,
    config: null,
    audioDuration: 0,
    videoDuration: 0
  };

  const el = (id) => document.getElementById(id);
  const on = (id, evt, fn) => { const x = el(id); if (x) x.addEventListener(evt, fn); };
  const getVal = (id) => el(id)?.value?.trim() || "";
  const setVal = (id, v) => { const x = el(id); if (x) x.value = v; };
  const setTxt = (id, v) => { const x = el(id); if (x) x.textContent = v; };

  function escapeHtml(s) {
    return s ? String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") : "";
  }

  function formatTime(s) {
    const sec = Math.max(0, Math.floor(Number(s) || 0));
    return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
  }

  function parseTime(v) {
    if (typeof v === "number") return Math.max(0, v);
    if (!v || typeof v !== "string") return 0;
    const c = v.trim();
    if (c.includes(":")) { const [m, s] = c.split(":").map(n => parseInt(n, 10) || 0); return (m * 60) + s; }
    return Math.max(0, parseInt(c, 10) || 0);
  }

  function showToast(msg, type = "info") {
    const t = el("customer-toast");
    if (!t) return;
    t.textContent = msg;
    t.className = "customer-toast active " + type;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = "customer-toast"; }, 3500);
  }

  function loadYouTubeApi() {
    if (root.YT?.Player) return Promise.resolve(root.YT);
    if (typeof root.loadYouTubeIFrameAPI === "function") return root.loadYouTubeIFrameAPI();
    return new Promise((resolve) => {
      if (root.YT?.Player) return resolve(root.YT);
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api-cust";
      tag.src = "https://www.youtube.com/iframe_api";
      const f = document.getElementsByTagName("script")[0];
      if (f?.parentNode) f.parentNode.insertBefore(tag, f); else document.head.appendChild(tag);
      const chk = setInterval(() => { if (root.YT?.Player) { clearInterval(chk); resolve(root.YT); } }, 150);
    });
  }

  function getFreshConfig() {
    if (root.WishDefaults?.getDefaultConfig) return JSON.parse(JSON.stringify(root.WishDefaults.getDefaultConfig()));
    return {
      name: "", from: "", passcode: { code: "1234" },
      birthDate: { year: 2001, month: 1, day: 1 },
      letterLines: ["Today is all about you — the joy you bring into the world, the warmth of your smile."],
      letterFont: "default", letterTheme: "default", cakeFlavor: "default",
      memory: "A cherished memory together.",
      reasons: [{ icon: "✨", title: "Your Kindness", text: "You brighten every room." }],
      wishes: ["May your day be filled with warm smiles and sweet surprises!"],
      gallery: [{ image: null, emoji: "🎈", rot: 0, cap: "Special moment", secretNote: "Flip note" }],
      timeline: [{ icon: "👶", date: "The Beginning", title: "A Star Was Born", text: "Story narrative..." }],
      gift: { message: "VIP Birthday Privilege pass!", coupon: "VIP-BIRTHDAY-TREAT" },
      music: { file: "assets/music/happy-birthday-song.mpeg", startTime: 0 },
      videoWish: { url: "", startTime: 0 }
    };
  }

  function updateThemePreview() {
    const p = el("cust-theme-live-preview");
    if (!p || !editorState.config) return;
    const k = editorState.config.letterTheme || "default";
    const colors = { default: ["#ffd700","#ffaa00"], royalgold: ["#ffd700","#d4af37"], galaxy: ["#a855f7","#6366f1"], rosegold: ["#f472b6","#fb7185"], sapphire: ["#38bdf8","#3b82f6"], "emerald-luxe": ["#34d399","#10b981"] }[k] || ["#ffd700","#ffaa00"];
    p.innerHTML = '<span style="color:var(--customer-text-muted);font-weight:600;">Theme:</span> ' +
      '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + colors[0] + ';margin:0 2px 0 6px;"></span>' +
      '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + colors[1] + ';margin-right:4px;"></span>' +
      '<strong style="color:var(--customer-gold);text-transform:capitalize;">' + escapeHtml(k) + '</strong>';
  }

  async function updateAudioUI() {
    const cfg = editorState.config; if (!cfg) return;
    const player = el("cust-audio-player"), ytPrev = el("cust-audio-yt-preview"), durDisp = el("cust-audio-dur-display"), durTime = el("cust-audio-dur-time"), curTime = el("cust-audio-cur-time"), seek = el("cust-audio-seekbar");
    const raw = cfg.music?.file || "assets/music/happy-birthday-song.mpeg";
    const url = root.MediaService?.stripMediaMetadata ? root.MediaService.stripMediaMetadata(raw) : raw.replace(/#bw-start=\d+/i, "").trim();
    const start = parseTime(cfg.music?.startTime || 0);
    const isYt = root.MediaService?.isYouTubeVideoUrl ? root.MediaService.isYouTubeVideoUrl(url) : (url.includes("youtube.com") || url.includes("youtu.be"));

    if (isYt) {
      if (document.activeElement !== el("cust-input-music-yt-url")) setVal("cust-input-music-yt-url", url);
      if (document.activeElement !== el("cust-input-music-url")) setVal("cust-input-music-url", "");
      if (player) { player.style.display = "none"; try { player.pause(); } catch(e){} }
      const ytId = root.MediaService?.extractYouTubeId ? root.MediaService.extractYouTubeId(url) : "";
      if (root.CustomerEditorRenderers) {
        root.CustomerEditorRenderers.attachYouTubeAudio(ytId, start, (dur) => {
          if (dur > 0) {
            editorState.audioDuration = dur;
            if (durDisp) durDisp.textContent = "YouTube Track (" + formatTime(dur) + ")";
            if (durTime) durTime.textContent = formatTime(dur);
            if (seek) { seek.max = dur; seek.value = Math.min(start, dur); }
          }
        });
      }
      if (durDisp && !durDisp.textContent.includes("(")) durDisp.textContent = "YouTube Song Attached";
      if (durTime && durTime.textContent === "00:00") durTime.textContent = "YouTube Track";
      if (curTime) curTime.textContent = formatTime(start);
      if (document.activeElement !== el("cust-input-music-time")) setVal("cust-input-music-time", formatTime(start));
      if (seek) { seek.max = 300; seek.value = start; }
    } else {
      if (ytPrev) { ytPrev.style.display = "none"; ytPrev.innerHTML = ""; }
      if (document.activeElement !== el("cust-input-music-url")) setVal("cust-input-music-url", url.includes("happy-birthday-song.mpeg") ? "" : url);
      if (document.activeElement !== el("cust-input-music-yt-url")) setVal("cust-input-music-yt-url", "");
      if (player) {
        player.style.display = "block";
        if (player.src !== url && (!player.src || !player.src.endsWith(url))) player.src = url;
        if (start > 0 && Math.abs(player.currentTime - start) > 1) { try { player.currentTime = start; } catch(e){} }
      }
      let dur = 0;
      if (root.MediaService?.detectAudioDuration) dur = await root.MediaService.detectAudioDuration(url);
      editorState.audioDuration = dur;
      if (durDisp) durDisp.textContent = url.includes("happy-birthday") ? "Default Melody" : (dur > 0 ? "Duration: " + formatTime(dur) : "Custom Audio");
      if (durTime) durTime.textContent = dur > 0 ? formatTime(dur) : "03:00";
      if (curTime) curTime.textContent = formatTime(start);
      if (document.activeElement !== el("cust-input-music-time")) setVal("cust-input-music-time", formatTime(start));
      if (seek) { seek.max = dur > 0 ? dur : 180; seek.value = start; }
    }
  }

  async function updateVideoUI() {
    const cfg = editorState.config; if (!cfg) return;
    const player = el("cust-video-player"), ytPrev = el("cust-video-yt-preview"), emptyPrev = el("cust-video-empty-preview"), durDisp = el("cust-video-dur-display"), durTime = el("cust-video-dur-time"), curTime = el("cust-video-cur-time"), seek = el("cust-video-seekbar");
    const raw = cfg.videoWish?.url || "";
    const url = root.MediaService?.stripMediaMetadata ? root.MediaService.stripMediaMetadata(raw) : raw.replace(/#bw-start=\d+/i, "").trim();
    const start = parseTime(cfg.videoWish?.startTime || 0);

    if (document.activeElement !== el("cust-input-video-time")) setVal("cust-input-video-time", formatTime(start));
    if (curTime) curTime.textContent = formatTime(start);

    const isYt = root.MediaService?.isYouTubeVideoUrl ? root.MediaService.isYouTubeVideoUrl(url) : (url.includes("youtube.com") || url.includes("youtu.be"));
    if (!url) {
      if (document.activeElement !== el("cust-input-video-url")) setVal("cust-input-video-url", "");
      if (document.activeElement !== el("cust-input-video-yt-url")) setVal("cust-input-video-yt-url", "");
      if (player) { player.style.display = "none"; try { player.pause(); } catch(e){} }
      if (ytPrev) { ytPrev.style.display = "none"; ytPrev.innerHTML = ""; }
      if (emptyPrev) emptyPrev.style.display = "block";
      if (durDisp) durDisp.textContent = "No Video";
      if (durTime) durTime.textContent = "00:00";
      if (seek) { seek.max = 100; seek.value = 0; }
      return;
    }

    if (isYt) {
      if (document.activeElement !== el("cust-input-video-yt-url")) setVal("cust-input-video-yt-url", url);
      if (document.activeElement !== el("cust-input-video-url")) setVal("cust-input-video-url", "");
      if (player) { player.style.display = "none"; try { player.pause(); } catch(e){} }
      if (emptyPrev) emptyPrev.style.display = "none";
      const ytId = root.MediaService?.extractYouTubeId ? root.MediaService.extractYouTubeId(url) : "";
      if (root.CustomerEditorRenderers) {
        root.CustomerEditorRenderers.attachYouTubeVideo(ytId, start, (dur) => {
          if (dur > 0) {
            editorState.videoDuration = dur;
            if (durDisp) durDisp.textContent = "YouTube Video (" + formatTime(dur) + ")";
            if (durTime) durTime.textContent = formatTime(dur);
            if (seek) { seek.max = dur; seek.value = Math.min(start, dur); }
          }
        });
      }
      if (durDisp && !durDisp.textContent.includes("(")) durDisp.textContent = "YouTube Video Attached";
      if (durTime && durTime.textContent === "00:00") durTime.textContent = "YouTube Video";
      if (seek) { seek.max = 300; seek.value = start; }
    } else {
      if (ytPrev) { ytPrev.style.display = "none"; ytPrev.innerHTML = ""; }
      if (emptyPrev) emptyPrev.style.display = "none";
      if (document.activeElement !== el("cust-input-video-url")) setVal("cust-input-video-url", url);
      if (document.activeElement !== el("cust-input-video-yt-url")) setVal("cust-input-video-yt-url", "");
      if (player) {
        player.style.display = "block";
        if (player.src !== url && (!player.src || !player.src.endsWith(url))) player.src = url;
      }
      if (durDisp) durDisp.textContent = "Direct Video Attached";
      if (durTime) durTime.textContent = "Custom MP4";
      if (seek) { seek.max = 300; seek.value = start; }
    }
  }

  function populateFormFromConfig(cfg) {
    if (!cfg) return;
    setVal("cust-input-name", cfg.name || "");
    setVal("cust-input-cake", cfg.cakeFlavor || "default");
    setVal("cust-input-passcode", cfg.passcode?.code || cfg.pass_code || "1234");
    setVal("cust-input-from", cfg.from || cfg.sender_name || "");
    setVal("cust-input-letter-theme", cfg.letterTheme || "default");
    setVal("cust-input-letter-font", cfg.letterFont || "default");
    setVal("cust-input-memory", cfg.memory || "");
    setVal("cust-input-gift-message", cfg.gift?.message || "");
    setVal("cust-input-gift-coupon", cfg.gift?.coupon || "");

    if (cfg.birthDate) {
      const y = cfg.birthDate.year || 2001, m = String(cfg.birthDate.month || 1).padStart(2, "0"), d = String(cfg.birthDate.day || 1).padStart(2, "0");
      setVal("cust-input-birthdate-display", d + "/" + m + "/" + y);
      setVal("cust-input-birthdate", y + "-" + m + "-" + d);
      el("cust-input-birthdate-display")?.classList.remove("input-error");
    }
    const saveBtn = el("btn-cust-editor-save");
    if (saveBtn) saveBtn.textContent = editorState.mode === "edit" ? "💾 Save Changes" : "💾 Save Wish";

    updateThemePreview();
    if (root.CustomerEditorRenderers) {
      root.CustomerEditorRenderers.renderLetterLines(editorState);
      root.CustomerEditorRenderers.renderReasons(editorState);
      root.CustomerEditorRenderers.renderWishes(editorState);
      root.CustomerEditorRenderers.renderGallery(editorState, updateSummaryPanel);
      root.CustomerEditorRenderers.renderTimeline(editorState);
      root.CustomerEditorRenderers.initCalendar(editorState, updateSummaryPanel);
    }
    updateAudioUI();
    updateVideoUI();
    updateSummaryPanel();
  }

  function syncFormToConfig() {
    if (!editorState.config) return;
    const cfg = editorState.config;
    cfg.name = getVal("cust-input-name");
    const bDisp = getVal("cust-input-birthdate-display");
    if (bDisp) {
      const parseFn = root.CustomerEditorRenderers?.parseUserDisplayDate;
      const parsed = parseFn ? parseFn(bDisp) : null;
      if (parsed) {
        cfg.birthDate = parsed;
        const hid = el("cust-input-birthdate");
        if (hid) hid.value = `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
      }
    }
    cfg.cakeFlavor = el("cust-input-cake")?.value || "default";
    cfg.passcode = { code: getVal("cust-input-passcode") || "1234" };
    cfg.from = getVal("cust-input-from");
    cfg.letterTheme = el("cust-input-letter-theme")?.value || "default";
    cfg.letterFont = el("cust-input-letter-font")?.value || "default";
    cfg.memory = el("cust-input-memory")?.value || "";

    const q = (s) => Array.from(document.querySelectorAll(s));
    const lines = q(".cust-letter-line");
    if (lines.length) cfg.letterLines = lines.map(i => i.value).filter(v => v.trim().length > 0);
    const reasons = q(".cust-reason-item");
    if (reasons.length) cfg.reasons = reasons.map(i => ({ icon: i.querySelector(".cust-reason-icon")?.value || "✨", title: i.querySelector(".cust-reason-title")?.value || "", text: i.querySelector(".cust-reason-text")?.value || "" }));
    const wishes = q(".cust-wish-text");
    if (wishes.length) cfg.wishes = wishes.map(i => i.value).filter(v => v.trim().length > 0);
    const gallery = q(".cust-gallery-card");
    if (gallery.length) cfg.gallery = gallery.map(i => ({ image: i.querySelector(".cust-gallery-image")?.value.trim() || null, emoji: i.querySelector(".cust-gallery-emoji")?.value || "🎈", rot: 0, cap: i.querySelector(".cust-gallery-caption")?.value || "", secretNote: i.querySelector(".cust-gallery-secret")?.value || "" }));
    const timeline = q(".cust-timeline-card");
    if (timeline.length) cfg.timeline = timeline.map(i => ({ icon: i.querySelector(".cust-timeline-icon")?.value || "✨", date: i.querySelector(".cust-timeline-date")?.value || "", title: i.querySelector(".cust-timeline-title")?.value || "", text: i.querySelector(".cust-timeline-text")?.value || "" }));
    cfg.gift = { message: getVal("cust-input-gift-message"), coupon: getVal("cust-input-gift-coupon") };
    updateThemePreview();
    updateSummaryPanel();
  }

  function updateSummaryPanel() {
    if (!editorState.config) return;
    const cfg = editorState.config;
    setTxt("cust-sum-name", cfg.name || "— (Required)");
    setTxt("cust-sum-from", cfg.from || "—");
    setTxt("cust-sum-date", cfg.birthDate ? (String(cfg.birthDate.day || 1).padStart(2, "0") + "/" + String(cfg.birthDate.month || 1).padStart(2, "0") + "/" + String(cfg.birthDate.year || 2001)) : "—");
    setTxt("cust-sum-passcode", cfg.passcode?.code || "1234");
    setTxt("cust-sum-cake", cfg.cakeFlavor === "default" ? "Classic" : (cfg.cakeFlavor || "Classic"));
    setTxt("cust-sum-theme", cfg.letterTheme === "default" ? "Original" : (cfg.letterTheme || "Original"));
    setTxt("cust-sum-font", cfg.letterFont === "default" ? "Sacramento" : (cfg.letterFont || "Sacramento"));
    setTxt("cust-sum-lines", ((cfg.letterLines || []).length) + " paras");
    setTxt("cust-sum-memory", cfg.memory ? "Set" : "None");
    setTxt("cust-sum-reasons", ((cfg.reasons || []).length) + " items");
    setTxt("cust-sum-wishes", ((cfg.wishes || []).length) + " quotes");
    setTxt("cust-sum-photos", ((cfg.gallery || []).filter(g => Boolean(g.image)).length) + " photos");
    setTxt("cust-sum-timeline", ((cfg.timeline || []).length) + " events");
    setTxt("cust-sum-gift", cfg.gift?.message ? "Attached" : "None");
    setTxt("cust-sum-music", cfg.music?.file ? (cfg.music.file.includes("happy-birthday") ? "Default Track" : "Custom Track") : "None");
    setTxt("cust-sum-video", cfg.videoWish?.url ? "Attached" : "None");
    setTxt("cust-sum-uuid", editorState.activeWishUuid ? editorState.activeWishUuid.slice(0, 8) + "..." : "New Wish");

    const modeBadge = el("cust-editor-mode-badge");
    if (modeBadge) {
      modeBadge.textContent = editorState.mode === "edit" ? "EDIT WISH" : "NEW WISH";
      modeBadge.className = editorState.mode === "edit" ? "status-badge active" : "status-badge gold";
    }
  }

  function previewWish() {
    syncFormToConfig();
    const cfg = editorState.config; if (!cfg) return;
    try {
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem("admin_preview_config", JSON.stringify(cfg));
      const win = window.open("index.html?preview=true", "_blank");
      if (win) showToast("Opening live celebration preview...", "info");
      else showToast("Please allow popups to open preview.", "warning");
    } catch (e) { showToast("Unable to launch preview.", "error"); }
  }

  async function saveWish(shouldShare = false) {
    syncFormToConfig();
    const cfg = editorState.config;
    if (!cfg?.name?.trim()) { showToast("Please provide a Recipient Name.", "error"); el("cust-input-name")?.focus(); return null; }
    if (editorState.isSaving) return null;
    editorState.isSaving = true;

    const saveBtn = el("btn-cust-editor-save"), shareBtn = el("btn-cust-editor-save-share");
    const origText = saveBtn ? saveBtn.textContent : (editorState.mode === "edit" ? "💾 Save Changes" : "💾 Save Wish");
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving..."; }
    if (shareBtn) shareBtn.disabled = true;

    try {
      let customerId = null;
      if (root.CustomerAuth?.getCurrentUser) {
        const u = await root.CustomerAuth.getCurrentUser();
        if (u?.id) customerId = u.id;
      }
      if (!customerId) throw new Error("Please log in to save wishes.");

      let savedUuid = null;
      if (editorState.mode === "edit" && editorState.activeWishUuid) {
        savedUuid = editorState.activeWishUuid;
        const client = root.SupabaseModule ? root.SupabaseModule.getClient() : null;
        if (!client) throw new Error("Supabase client unavailable.");
        const orig = editorState.originalDbRecord || {};
        const record = {
          recipient_name: cfg.name,
          sender_name: cfg.from !== undefined ? cfg.from : (orig.sender_name || ""),
          pass_code: cfg.passcode?.code || orig.pass_code || "1234",
          birth_date: cfg.birthDate || orig.birth_date || { year: 2001, month: 1, day: 1 },
          letter_lines: cfg.letterLines || orig.letter_lines || [],
          memory_text: cfg.memory !== undefined ? cfg.memory : (orig.memory_text || ""),
          reasons_json: cfg.reasons || orig.reasons_json || [],
          wishes_json: cfg.wishes || orig.wishes_json || [],
          gallery_json: cfg.gallery || orig.gallery_json || [],
          timeline_json: cfg.timeline || orig.timeline_json || [],
          gift_json: cfg.gift || orig.gift_json || {},
          music_url: cfg.music?.file || orig.music_url || null,
          video_url: cfg.videoWish?.url || orig.video_url || null,
          cake_flavor: cfg.cakeFlavor || orig.cake_flavor || "default",
          letter_font: cfg.letterFont || orig.letter_font || "default",
          letter_theme: cfg.letterTheme || orig.letter_theme || "default",
          updated_at: new Date().toISOString()
        };
        const { error } = await client.from("wishes").update(record).eq("id", savedUuid).eq("owner_id", customerId);
        if (error) throw new Error(error.message || "Failed to update wish.");
      } else {
        cfg._activeWishUuid = null;
        if (root.DatabaseModule?.saveWish) {
          savedUuid = await root.DatabaseModule.saveWish(cfg, { context: "customer", ownerId: customerId });
        } else {
          throw new Error("Database persistence unavailable.");
        }
      }

      if (!savedUuid) throw new Error("Failed to save celebration.");
      editorState.isDirty = false;
      editorState.activeWishUuid = savedUuid;

      if (root.CustomerWishes?.loadWishes) await root.CustomerWishes.loadWishes(true);
      if (shouldShare) {
        if (root.CustomerWishes?.copyWishLink) await root.CustomerWishes.copyWishLink(savedUuid);
        showToast("Saved & link copied! 🚀", "success");
      } else {
        showToast("Celebration saved successfully! ✨", "success");
      }
      root.CustomerDashboard?.switchTab?.("wishes");
      return savedUuid;
    } catch (err) {
      showToast(err.message || "Save failed.", "error"); return null;
    } finally {
      editorState.isSaving = false;
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = origText; }
      if (shareBtn) shareBtn.disabled = false;
    }
  }

  function openNew(options = {}) {
    editorState.mode = "new";
    editorState.activeWishUuid = null;
    editorState.isDirty = false;
    editorState.originalDbRecord = null;
    editorState.config = getFreshConfig();
    if (options.theme) editorState.config.letterTheme = options.theme;
    const titleEl = el("cust-editor-title");
    if (titleEl) titleEl.textContent = "Create New Wish";
    populateFormFromConfig(editorState.config);
    root.CustomerDashboard?.switchTab?.("create");
    setTimeout(() => { el("cust-input-name")?.focus(); }, 200);
  }

  async function openEdit(wishId) {
    if (!wishId) return;
    try {
      showToast("Loading celebration...", "info");
      let customerId = null;
      if (root.CustomerAuth?.getCurrentUser) {
        const u = await root.CustomerAuth.getCurrentUser();
        if (u?.id) customerId = u.id;
      }
      if (!customerId) {
        showToast("Please log in to edit celebrations.", "error");
        return;
      }

      const CUSTOMER_WISH_COLUMNS = "id, owner_id, recipient_name, sender_name, pass_code, birth_date, letter_lines, memory_text, reasons_json, wishes_json, gallery_json, timeline_json, gift_json, music_url, video_url, cake_flavor, letter_font, letter_theme, status, event_type, created_at, updated_at";

      let wish = null;
      if (root.SupabaseModule) {
        const client = root.SupabaseModule.getClient();
        if (client) {
          const { data, error } = await client
            .from("wishes")
            .select(CUSTOMER_WISH_COLUMNS)
            .eq("id", wishId)
            .eq("owner_id", customerId)
            .single();
          if (!error && data) wish = data;
        }
      }
      if (!wish) {
        const cached = root.CustomerWishes?.getWishes?.().find(w => w.id === wishId && w.owner_id === customerId);
        if (cached && cached.reasons_json !== undefined) wish = cached;
      }
      if (!wish) { showToast("Celebration not found or unauthorized.", "error"); return; }

      editorState.mode = "edit";
      editorState.activeWishUuid = wish.id;
      editorState.isDirty = false;
      editorState.originalDbRecord = JSON.parse(JSON.stringify(wish));

      const baseCfg = getFreshConfig();
      const parseJ = (v, d) => {
        if (Array.isArray(v)) return v;
        if (v && typeof v === "object") return v;
        if (typeof v === "string") {
          try { return JSON.parse(v); } catch (e) {}
        }
        return d;
      };

      let bDate = baseCfg.birthDate;
      if (wish.birth_date && typeof wish.birth_date === "object") {
        bDate = {
          year: parseInt(wish.birth_date.year, 10) || baseCfg.birthDate.year,
          month: parseInt(wish.birth_date.month, 10) || baseCfg.birthDate.month,
          day: parseInt(wish.birth_date.day, 10) || baseCfg.birthDate.day
        };
      }

      const savedPasscode = (wish.pass_code !== undefined && wish.pass_code !== null)
        ? String(wish.pass_code).trim()
        : "1234";

      const savedMemory = (wish.memory_text !== undefined && wish.memory_text !== null)
        ? String(wish.memory_text)
        : baseCfg.memory;

      editorState.config = {
        ...baseCfg,
        name: wish.recipient_name || "",
        from: wish.sender_name || "",
        passcode: { code: savedPasscode },
        birthDate: bDate,
        letterLines: Array.isArray(wish.letter_lines) && wish.letter_lines.length > 0 ? wish.letter_lines : baseCfg.letterLines,
        letterFont: wish.letter_font || "default",
        letterTheme: wish.letter_theme || "default",
        cakeFlavor: wish.cake_flavor || "default",
        memory: savedMemory,
        reasons: parseJ(wish.reasons_json, baseCfg.reasons),
        wishes: parseJ(wish.wishes_json, baseCfg.wishes),
        gallery: parseJ(wish.gallery_json, baseCfg.gallery),
        timeline: parseJ(wish.timeline_json, baseCfg.timeline),
        gift: parseJ(wish.gift_json, baseCfg.gift),
        music: { file: wish.music_url || baseCfg.music.file, startTime: 0 },
        videoWish: { url: wish.video_url || "", startTime: 0 }
      };

      const titleEl = el("cust-editor-title");
      if (titleEl) titleEl.textContent = "Edit: " + (wish.recipient_name || "Celebration");
      populateFormFromConfig(editorState.config);
      root.CustomerDashboard?.switchTab?.("create");
    } catch (err) { showToast("Failed to load celebration.", "error"); }
  }

  function applyRelationshipPreset() {
    const relKey = el("cust-select-relationship")?.value, langKey = el("cust-select-relationship-lang")?.value || "en";
    if (!relKey) { showToast("Please choose a relationship preset.", "info"); return; }
    if (root.RelationshipPresets?.getPreset) {
      const preset = root.RelationshipPresets.getPreset(relKey, langKey);
      if (preset && editorState.config) {
        if (preset.letterLines) editorState.config.letterLines = [...preset.letterLines];
        if (preset.memory) editorState.config.memory = preset.memory;
        if (preset.reasons) editorState.config.reasons = JSON.parse(JSON.stringify(preset.reasons));
        if (preset.wishes) editorState.config.wishes = [...preset.wishes];
        if (preset.timeline) editorState.config.timeline = JSON.parse(JSON.stringify(preset.timeline));
        if (preset.gift) editorState.config.gift = { ...preset.gift };
        if (Array.isArray(preset.gallery) && Array.isArray(editorState.config.gallery)) {
          editorState.config.gallery.forEach((g, idx) => {
            const pG = preset.gallery[idx];
            if (pG) {
              g.emoji = pG.emoji || g.emoji;
              g.cap = pG.cap || g.cap;
              g.secretNote = pG.secretNote || g.secretNote;
            }
          });
        }
        populateFormFromConfig(editorState.config);
        editorState.isDirty = true;
        showToast("Applied " + (preset.label || relKey) + " style! ✨", "success");
      }
    }
  }

  function resetSection(sec) {
    const f = getFreshConfig();
    if (sec === "basic") {
      editorState.config.name = "";
      editorState.config.birthDate = f.birthDate;
      editorState.config.cakeFlavor = "default";
      editorState.config.passcode = { code: "1234" };
      populateFormFromConfig(editorState.config);
      showToast("Restored basic info to defaults ↺", "info");
    } else if (sec === "sender") {
      editorState.config.from = f.from || "your friends who adore you";
      populateFormFromConfig(editorState.config);
      showToast("Restored sender info to defaults ↺", "info");
    } else if (sec === "relationship") {
      const curGal = editorState.config.gallery || [];
      const defGal = f.gallery || [];
      const newGal = defGal.map((dItem, idx) => ({
        ...dItem,
        image: curGal[idx]?.image || null
      }));
      Object.assign(editorState.config, {
        letterLines: [...f.letterLines],
        reasons: JSON.parse(JSON.stringify(f.reasons)),
        wishes: [...f.wishes],
        timeline: JSON.parse(JSON.stringify(f.timeline)),
        memory: f.memory,
        gallery: newGal
      });
      const relSelect = el("cust-select-relationship");
      if (relSelect) relSelect.value = "";
      populateFormFromConfig(editorState.config);
      showToast("Reset relationship style to baseline defaults ↺", "info");
    } else if (sec === "letter") {
      Object.assign(editorState.config, { letterLines: [...f.letterLines], letterTheme: "default", letterFont: "default" });
      populateFormFromConfig(editorState.config);
      showToast("Restored letter to defaults ✨", "info");
    } else if (sec === "memory") {
      editorState.config.memory = f.memory;
      populateFormFromConfig(editorState.config);
      showToast("Restored memory to defaults 🌟", "info");
    } else if (sec === "reasons") {
      editorState.config.reasons = JSON.parse(JSON.stringify(f.reasons));
      root.CustomerEditorRenderers?.renderReasons(editorState);
      updateSummaryPanel();
      showToast("Restored reasons to defaults ⭐", "info");
    } else if (sec === "wishes") {
      editorState.config.wishes = [...f.wishes];
      root.CustomerEditorRenderers?.renderWishes(editorState);
      updateSummaryPanel();
      showToast("Restored wishes to defaults 💫", "info");
    } else if (sec === "gallery") {
      editorState.config.gallery = JSON.parse(JSON.stringify(f.gallery));
      root.CustomerEditorRenderers?.renderGallery(editorState, updateSummaryPanel);
      updateSummaryPanel();
      showToast("Restored gallery to defaults 📸", "info");
    } else if (sec === "timeline") {
      editorState.config.timeline = JSON.parse(JSON.stringify(f.timeline));
      root.CustomerEditorRenderers?.renderTimeline(editorState);
      updateSummaryPanel();
      showToast("Restored timeline to defaults ⏳", "info");
    } else if (sec === "gift") {
      editorState.config.gift = { ...f.gift };
      populateFormFromConfig(editorState.config);
      showToast("Restored gift details to defaults 🎁", "info");
    }
  }

  function bindEvents() {
    const view = el("view-create"); if (!view) return;

    view.addEventListener("input", (e) => {
      if (e.target.id === "cust-audio-seekbar") {
        const val = parseInt(e.target.value, 10) || 0;
        if (editorState.config?.music) editorState.config.music.startTime = val;
        setTxt("cust-audio-cur-time", formatTime(val));
        setVal("cust-input-music-time", formatTime(val));
        const p = el("cust-audio-player");
        if (p && p.style.display !== "none") { try { p.currentTime = val; } catch(err){} }
        root.CustomerEditorRenderers?.seekAudio(val);
        return;
      }
      if (e.target.id === "cust-video-seekbar") {
        const val = parseInt(e.target.value, 10) || 0;
        if (editorState.config?.videoWish) editorState.config.videoWish.startTime = val;
        setTxt("cust-video-cur-time", formatTime(val));
        setVal("cust-input-video-time", formatTime(val));
        const p = el("cust-video-player");
        if (p && p.style.display !== "none") { try { p.currentTime = val; } catch(err){} }
        root.CustomerEditorRenderers?.seekVideo(val);
        return;
      }
      editorState.isDirty = true;
      syncFormToConfig();
    });

    view.addEventListener("change", () => { editorState.isDirty = true; syncFormToConfig(); });

    on("btn-cust-editor-preview", "click", previewWish);
    on("btn-sum-preview", "click", previewWish);
    on("btn-cust-editor-save", "click", () => saveWish(false));
    on("btn-sum-save", "click", () => saveWish(false));
    on("btn-cust-editor-save-share", "click", () => saveWish(true));
    on("btn-sum-save-share", "click", () => saveWish(true));
    on("btn-cust-editor-back", "click", () => root.CustomerDashboard?.switchTab?.("wishes"));
    on("btn-cust-editor-cancel", "click", () => root.CustomerDashboard?.switchTab?.("wishes"));
    on("cust-btn-apply-relationship", "click", applyRelationshipPreset);

    const addHandlers = [
      ["cust-btn-add-letter-line", () => { syncFormToConfig(); editorState.config.letterLines.push("Add another message..."); root.CustomerEditorRenderers?.renderLetterLines(editorState); updateSummaryPanel(); showToast("Added paragraph ✨", "info"); }],
      ["cust-btn-add-reason", () => { syncFormToConfig(); editorState.config.reasons.push({ icon: "🌟", title: "New Reason", text: "Why you are special." }); root.CustomerEditorRenderers?.renderReasons(editorState); updateSummaryPanel(); showToast("Added new reason ⭐", "info"); }],
      ["cust-btn-add-wish", () => { syncFormToConfig(); editorState.config.wishes.push("May your year be blessed!"); root.CustomerEditorRenderers?.renderWishes(editorState); updateSummaryPanel(); showToast("Added new wish quote 💫", "info"); }],
      ["cust-btn-add-gallery", () => { syncFormToConfig(); editorState.config.gallery.push({ image: null, emoji: "📸", rot: 0, cap: "Moment", secretNote: "Note" }); root.CustomerEditorRenderers?.renderGallery(editorState, updateSummaryPanel); updateSummaryPanel(); showToast("Added new polaroid card 📸", "info"); }],
      ["cust-btn-add-timeline", () => { syncFormToConfig(); editorState.config.timeline.push({ icon: "🎉", date: "Milestone", title: "Chapter", text: "Story..." }); root.CustomerEditorRenderers?.renderTimeline(editorState); updateSummaryPanel(); showToast("Added new timeline milestone ⏳", "info"); }]
    ];
    addHandlers.forEach(([id, fn]) => on(id, "click", fn));

    view.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]"); if (!btn) return;
      const act = btn.dataset.action, idx = parseInt(btn.dataset.index, 10);
      if (isNaN(idx)) return;
      syncFormToConfig();
      if (act === "remove-line") { editorState.config.letterLines.splice(idx, 1); root.CustomerEditorRenderers?.renderLetterLines(editorState); showToast("Paragraph removed 🗑️", "info"); }
      else if (act === "remove-reason") { editorState.config.reasons.splice(idx, 1); root.CustomerEditorRenderers?.renderReasons(editorState); showToast("Reason removed 🗑️", "info"); }
      else if (act === "remove-wish") { editorState.config.wishes.splice(idx, 1); root.CustomerEditorRenderers?.renderWishes(editorState); showToast("Wish quote removed 🗑️", "info"); }
      else if (act === "remove-gallery") { editorState.config.gallery.splice(idx, 1); root.CustomerEditorRenderers?.renderGallery(editorState, updateSummaryPanel); showToast("Polaroid card removed 🗑️", "info"); }
      else if (act === "remove-timeline") { editorState.config.timeline.splice(idx, 1); root.CustomerEditorRenderers?.renderTimeline(editorState); showToast("Milestone removed 🗑️", "info"); }
      updateSummaryPanel();
    });

    const resetKeys = ["basic", "sender", "relationship", "letter", "memory", "reasons", "wishes", "gallery", "timeline", "gift"];
    resetKeys.forEach((key) => on("cust-btn-reset-" + key, "click", () => resetSection(key)));

    if (root.CustomerEditorRenderers) {
      root.CustomerEditorRenderers.bindMediaEvents(editorState, updateAudioUI, updateVideoUI, updateSummaryPanel);
      root.CustomerEditorRenderers.initCalendar(editorState, updateSummaryPanel);
    }
  }

  function init() { bindEvents(); }

  root.CustomerWishEditor = Object.freeze({
    init, openNew, openEdit, previewWish,
    save: () => saveWish(false),
    saveAndShare: () => saveWish(true),
    getState: () => ({ ...editorState }),
    getFreshConfig,
    showToast,
    loadYouTubeApi
  });

})(typeof window !== "undefined" ? window : globalThis);
