/**
 * ============================================================================
 * ADMIN STUDIO WISH EDITOR MODULE (js/admin/admin-wish-editor.js)
 * Native Admin Studio editor for creating, editing, and managing birthday wishes.
 * Persists directly via DatabaseModule.saveWish() (INSERT) and
 * DatabaseModule.updateWish() (UPDATE) with zero duplicate UUIDs.
 * Full Feature Parity & Phase 30.2 Stabilization:
 * - Photo Compression & StorageModule upload to HTTPS URLs + Instant URL Preview
 * - Audio Device Upload & YouTube Song links with Duration + Start-Time Seekbar + Playback Offset
 * - Video Device Upload & YouTube / Shorts links with Duration + Start-Time Seekbar + Playback Offset
 * - Wish Studio Luxury Popup Calendar with DD/MM/YYYY Segment Masking & Validation
 * - Relationship Presets V2 (English & Hinglish) across 12 relationships with 5 wishes, timeline & gallery
 * - Memory Reset & Relationship Style Reset
 * - Live Summary Panel tracking all 15 metadata fields including typography
 * - In-memory live preview (0 DB writes, 0 mutations)
 * ============================================================================
 */

(function (window) {
  "use strict";

  /* ============================================================
     1. DEFAULT CONFIGURATION TEMPLATE (WishDefaults Single Source)
     ============================================================ */
  const DEFAULT_ADMIN_CONFIG = Object.freeze(
    (typeof window.WishDefaults !== "undefined" && typeof window.WishDefaults.getDefaultConfig === "function")
      ? window.WishDefaults.getDefaultConfig()
      : {
        name: "",
        from: "",
        passcode: { code: "1234" },
        birthDate: { year: 2001, month: 1, day: 1 },
        letterLines: [
          "Today is all about you — the joy you bring into the world, the warmth of your smile, and every little moment that makes you so genuinely special.",
          "May this upcoming year shower you with unforgettable laughter, soaring adventures, peace in your quiet moments, and love in every step you take.",
          "Never forget how deeply cherished and appreciated you are today and every single day ahead. Keep shining your beautiful light!"
        ],
        letterFont: "default",
        letterTheme: "default",
        cakeFlavor: "default",
        memory: "Remember that time we couldn't stop laughing until our stomachs hurt? Those little moments are the ones I treasure most.",
        reasons: [
          { icon: "✨", title: "Your Radiant Energy", text: "You effortlessly light up every room you walk into with pure kindness and warmth." },
          { icon: "🌟", title: "Always Having My Back", text: "Through high tides and low tides, you are the truest and most dependable friend." },
          { icon: "🎨", title: "Your Creative Soul", text: "The unique passion and thoughtfulness you pour into everything you create inspires everyone." },
          { icon: "💫", title: "Unforgettable Laughter", text: "Our endless conversations and inside jokes make life ten times more joyful." },
          { icon: "💖", title: "A Heart of Pure Gold", text: "You care so deeply for those around you, always making everyone feel seen and loved." }
        ],
        wishes: [
          "May your day be filled with warm smiles, sweet surprises, and countless heartfelt memories!",
          "Wishing you 365 days of boundless joy, thriving health, and dreams coming true!",
          "May every candle on your cake bring a blessing that lasts throughout your whole year!",
          "May your path ahead be blessed with true happiness, bright opportunities, and peace!",
          "Here's to celebrating you today and welcoming another fantastic chapter in your life!"
        ],
        gallery: [
          { image: null, emoji: "🎈", rot: -6, cap: "That day out", secretNote: "Remember this day? The vibe was so unmatchable! ✨" },
          { image: null, emoji: "🌇", rot: 4, cap: "Golden hour", secretNote: "Getting 50 photos, and this one was the best 📸" },
          { image: null, emoji: "🍰", rot: -3, cap: "Cake attempt #1", secretNote: "Half of the icing went on your nose before we cut it 🎂" },
          { image: null, emoji: "📸", rot: 6, cap: "Candid chaos", secretNote: "Pure unscripted laughter. Top 3 favorite moments!" },
          { image: null, emoji: "🎉", rot: -8, cap: "Last celebration", secretNote: "Here's to making this year's party 10x bigger! 🥂" }
        ],
        timeline: [
          { icon: "👶", date: "The Beginning", title: "A Star Was Born", text: "The universe was blessed with an absolute gem of a human being." },
          { icon: "🎒", date: "Growing Up", title: "Adventures & Dreams", text: "Learning, laughing, falling, rising, and building an inspiring story." },
          { icon: "🎓", date: "New Milestones", title: "Conquering New Heights", text: "Turning passions into reality with strength, focus, and grace." },
          { icon: "🎂", date: "Today", title: "Another Level Unlocked!", text: "Celebrating everything you are and the magnificent journey ahead." }
        ],
        gift: {
          message: "Here is your VIP Birthday Privilege pass! Valid for 365 days of unlimited smiles, treats, and good vibes.",
          coupon: "VIP-BIRTHDAY-TREAT"
        },
        music: {
          file: "assets/music/happy-birthday-song.mpeg",
          startTime: 0
        },
        videoWish: {
          url: "",
          startTime: 0
        }
      }
  );

  /* ============================================================
     2. MODULE STATE
     ============================================================ */
  let editorState = {
    isOpen: false,
    mode: "new", // "new" | "edit"
    activeWishUuid: null,
    isDirty: false,
    isSaving: false,
    config: null,
    audioDuration: 0,
    videoDuration: 0
  };

  let onStateChangeHook = null;

  /* ============================================================
     3. HELPER UTILITIES
     ============================================================ */
  function deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return { ...obj };
    }
  }

  function escapeHtml(str) {
    if (window.AdminDashboard && typeof window.AdminDashboard.escapeHtml === "function") {
      return window.AdminDashboard.escapeHtml(str);
    }
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function switchTab(tabId) {
    const views = document.querySelectorAll(".tab-view");
    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");

    views.forEach(v => {
      if (v.id === `view-${tabId}`) {
        v.classList.add("active");
      } else {
        v.classList.remove("active");
      }
    });

    navItems.forEach(i => {
      if (i.dataset.tab === tabId) {
        i.classList.add("active");
      } else {
        i.classList.remove("active");
      }
    });
  }

  function pad(num) {
    return String(num).padStart(2, "0");
  }

  function formatTime(seconds) {
    if (window.TimeUtils && typeof window.TimeUtils.formatSecondsToMMSS === "function") {
      return window.TimeUtils.formatSecondsToMMSS(seconds);
    }
    const total = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function parseTime(input) {
    if (window.TimeUtils && typeof window.TimeUtils.parseTimeToSeconds === "function") {
      return window.TimeUtils.parseTimeToSeconds(input);
    }
    if (typeof input === "number") return Math.max(0, Math.floor(input));
    const s = String(input || "").trim();
    if (s.includes(":")) {
      const parts = s.split(":");
      return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    }
    const num = parseInt(s, 10);
    return isNaN(num) ? 0 : Math.max(0, num);
  }

  function formatDisplayDate(dateObj) {
    if (!dateObj) return "01/01/2001";
    const d = pad(dateObj.day || 1);
    const m = pad(dateObj.month || 1);
    const y = dateObj.year || 2001;
    return `${d}/${m}/${y}`;
  }

  function parseUserDisplayDate(str) {
    if (!str || typeof str !== "string") return null;
    const clean = str.trim();

    // 1. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const match = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        // Validate calendar date logic (e.g. Feb leap year / 30/31 days)
        const dObj = new Date(year, month - 1, day);
        if (dObj.getFullYear() === year && dObj.getMonth() === month - 1 && dObj.getDate() === day) {
          return { year, month, day };
        }
      }
      return null;
    }

    // 2. 8-digit compact DDMMYYYY (e.g. 19032001)
    const compactMatch = clean.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (compactMatch) {
      const day = parseInt(compactMatch[1], 10);
      const month = parseInt(compactMatch[2], 10);
      const year = parseInt(compactMatch[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const dObj = new Date(year, month - 1, day);
        if (dObj.getFullYear() === year && dObj.getMonth() === month - 1 && dObj.getDate() === day) {
          return { year, month, day };
        }
      }
      return null;
    }

    // 3. YYYY-MM-DD
    const isoMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10);
      const day = parseInt(isoMatch[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const dObj = new Date(year, month - 1, day);
        if (dObj.getFullYear() === year && dObj.getMonth() === month - 1 && dObj.getDate() === day) {
          return { year, month, day };
        }
      }
      return null;
    }
    return null;
  }

  function updateSeekbarFill(seekbar) {
    if (!seekbar) return;
    const val = parseFloat(seekbar.value) || 0;
    const max = parseFloat(seekbar.max) || 100;
    const pct = max > 0 ? Math.min(100, Math.max(0, (val / max) * 100)) : 0;
    seekbar.style.background = `linear-gradient(to right, #ffd700 ${pct}%, rgba(255, 255, 255, 0.12) ${pct}%)`;
  }

  /* ============================================================
     4. DATA CONVERSION & HYDRATION
     ============================================================ */
  function normalizeWishRecordToConfig(record) {
    if (!record) return deepClone(DEFAULT_ADMIN_CONFIG);

    const cfg = deepClone(DEFAULT_ADMIN_CONFIG);
    cfg.name = record.recipient_name || record.name || record.n || "";
    cfg.from = record.sender_name || record.from || record.f || "";

    const rawPass = record.pass_code || record.passcode?.code || record.passcode || record.c || "1234";
    cfg.passcode = { code: String(rawPass) };
    
    // Parse birth date
    if (record.birth_date && typeof record.birth_date === "object") {
      cfg.birthDate = {
        year: parseInt(record.birth_date.year, 10) || 2001,
        month: parseInt(record.birth_date.month, 10) || 1,
        day: parseInt(record.birth_date.day, 10) || 1
      };
    } else if (typeof record.birth_date === "string") {
      const parsed = parseUserDisplayDate(record.birth_date);
      if (parsed) {
        cfg.birthDate = parsed;
      }
    } else if (record.birthDate && typeof record.birthDate === "object") {
      cfg.birthDate = {
        year: parseInt(record.birthDate.year, 10) || 2001,
        month: parseInt(record.birthDate.month, 10) || 1,
        day: parseInt(record.birthDate.day, 10) || 1
      };
    } else if (record.y && record.m && record.d) {
      cfg.birthDate = {
        year: parseInt(record.y, 10) || 2001,
        month: parseInt(record.m, 10) || 1,
        day: parseInt(record.d, 10) || 1
      };
    }

    cfg.cakeFlavor = record.cake_flavor || record.cakeFlavor || record.ck || "default";
    cfg.letterTheme = record.letter_theme || record.letterTheme || record.lt || "default";
    cfg.letterFont = record.letter_font || record.letterFont || record.lf || "default";
    cfg.memory = record.memory_text || record.memory || record.mem || "";

    // 1. Letter lines
    const rawLetter = record.letter_lines || record.letterLines || record.l;
    if (Array.isArray(rawLetter) && rawLetter.length > 0) {
      cfg.letterLines = deepClone(rawLetter);
    } else if (typeof rawLetter === "string") {
      try {
        const parsed = JSON.parse(rawLetter);
        if (Array.isArray(parsed) && parsed.length > 0) cfg.letterLines = parsed;
      } catch (e) {}
    }

    // 2. Reasons (Issue N)
    const rawReasons = record.reasons_json || record.reasons || record.r;
    if (Array.isArray(rawReasons) && rawReasons.length > 0) {
      cfg.reasons = deepClone(rawReasons);
    } else if (typeof rawReasons === "string") {
      try {
        const parsed = JSON.parse(rawReasons);
        if (Array.isArray(parsed) && parsed.length > 0) cfg.reasons = parsed;
      } catch (e) {}
    }

    // 3. Wishes (Issue N)
    const rawWishes = record.wishes_json || record.wishes || record.w;
    if (Array.isArray(rawWishes) && rawWishes.length > 0) {
      cfg.wishes = deepClone(rawWishes);
    } else if (typeof rawWishes === "string") {
      try {
        const parsed = JSON.parse(rawWishes);
        if (Array.isArray(parsed) && parsed.length > 0) cfg.wishes = parsed;
      } catch (e) {}
    }

    // 4. Gallery (Issue N)
    const rawGallery = record.gallery_json || record.gallery || record.g;
    if (Array.isArray(rawGallery) && rawGallery.length > 0) {
      cfg.gallery = deepClone(rawGallery);
    } else if (typeof rawGallery === "string") {
      try {
        const parsed = JSON.parse(rawGallery);
        if (Array.isArray(parsed) && parsed.length > 0) cfg.gallery = parsed;
      } catch (e) {}
    }

    // 5. Timeline (Issue N)
    const rawTimeline = record.timeline_json || record.timeline || record.t;
    if (Array.isArray(rawTimeline) && rawTimeline.length > 0) {
      cfg.timeline = deepClone(rawTimeline);
    } else if (typeof rawTimeline === "string") {
      try {
        const parsed = JSON.parse(rawTimeline);
        if (Array.isArray(parsed) && parsed.length > 0) cfg.timeline = parsed;
      } catch (e) {}
    }

    // 6. Gift (Issue O)
    let giftObj = record.gift_json || record.gift || record.gft;
    if (typeof giftObj === "string") {
      try { giftObj = JSON.parse(giftObj); } catch (e) { giftObj = {}; }
    }
    giftObj = giftObj || {};
    cfg.gift = {
      message: giftObj.message || giftObj.m || record.gift_message || "",
      coupon: giftObj.coupon || giftObj.c || record.gift_coupon || ""
    };

    // 7. Music / Audio (Issue P)
    const rawMusicUrl = record.music_url || record.audio_url || record.music?.file || record.msc?.file || record.msc?.f || "assets/music/happy-birthday-song.mpeg";
    const decodedMusicStart = (window.MediaService && typeof window.MediaService.decodeMediaStartTime === "function")
      ? window.MediaService.decodeMediaStartTime(rawMusicUrl)
      : (typeof window.decodeMediaStartTime === "function" ? window.decodeMediaStartTime(rawMusicUrl) : 0);
    const cleanMusicUrl = (window.MediaService && typeof window.MediaService.stripMediaMetadata === "function")
      ? window.MediaService.stripMediaMetadata(rawMusicUrl)
      : (typeof window.stripMediaMetadata === "function" ? window.stripMediaMetadata(rawMusicUrl) : rawMusicUrl.replace(/#bw-start=\d+/i, "").trim());
    const musicStartTime = record.music?.startTime || record.msc?.startTime || record.msc?.t || decodedMusicStart || 0;
    cfg.music = {
      file: cleanMusicUrl || "assets/music/happy-birthday-song.mpeg",
      startTime: parseTime(musicStartTime)
    };

    // 8. Video Wish (Issue Q)
    const rawVideoUrl = record.video_url || record.videoWish?.url || record.videoWish?.file || record.v?.url || record.v?.u || "";
    const decodedVideoStart = (window.MediaService && typeof window.MediaService.decodeMediaStartTime === "function")
      ? window.MediaService.decodeMediaStartTime(rawVideoUrl)
      : (typeof window.decodeMediaStartTime === "function" ? window.decodeMediaStartTime(rawVideoUrl) : 0);
    const cleanVideoUrl = (window.MediaService && typeof window.MediaService.stripMediaMetadata === "function")
      ? window.MediaService.stripMediaMetadata(rawVideoUrl)
      : (typeof window.stripMediaMetadata === "function" ? window.stripMediaMetadata(rawVideoUrl) : rawVideoUrl.replace(/#bw-start=\d+/i, "").trim());
    const videoStartTime = record.videoWish?.startTime || record.v?.startTime || record.v?.t || decodedVideoStart || 0;
    cfg.videoWish = {
      url: cleanVideoUrl || "",
      startTime: parseTime(videoStartTime)
    };

    return cfg;
  }

  /* ============================================================
     5. FORM RENDERING & BINDINGS
     ============================================================ */
  function renderForm() {
    const cfg = editorState.config;
    if (!cfg) return;

    // 1. Basic Info
    const nameEl = document.getElementById("adm-input-name");
    const dateDisplayEl = document.getElementById("adm-input-birthdate-display");
    const dateHiddenEl = document.getElementById("adm-input-birthdate");
    const cakeEl = document.getElementById("adm-input-cake");
    const passEl = document.getElementById("adm-input-passcode");

    if (nameEl) nameEl.value = cfg.name || "";
    if (cfg.birthDate) {
      if (dateDisplayEl) dateDisplayEl.value = formatDisplayDate(cfg.birthDate);
      if (dateHiddenEl) dateHiddenEl.value = `${cfg.birthDate.year}-${pad(cfg.birthDate.month)}-${pad(cfg.birthDate.day)}`;
    }
    if (cakeEl) cakeEl.value = cfg.cakeFlavor || "default";
    if (passEl) passEl.value = cfg.passcode?.code || "1234";

    // 2. Sender Info
    const fromEl = document.getElementById("adm-input-from");
    if (fromEl) fromEl.value = cfg.from || "";

    // 3. Birthday Letter
    const themeEl = document.getElementById("adm-input-letter-theme");
    const fontEl = document.getElementById("adm-input-letter-font");
    if (themeEl) themeEl.value = cfg.letterTheme || "default";
    if (fontEl) fontEl.value = cfg.letterFont || "default";
    renderLetterLines();

    // 4. Memory
    const memEl = document.getElementById("adm-input-memory");
    if (memEl) memEl.value = cfg.memory || "";

    // 5. Reasons
    renderReasons();

    // 6. Wishes
    renderWishes();

    // 7. Gallery
    renderGallery();

    // 8. Timeline
    renderTimeline();

    // 9. Gift
    const gftMsgEl = document.getElementById("adm-input-gift-message");
    const gftCpnEl = document.getElementById("adm-input-gift-coupon");
    if (gftMsgEl) gftMsgEl.value = cfg.gift?.message || "";
    if (gftCpnEl) gftCpnEl.value = cfg.gift?.coupon || "";

    // 10. Music
    updateAudioUI();

    // 11. Video
    updateVideoUI();

    // Header & Badges
    const titleEl = document.getElementById("admin-editor-title");
    const subEl = document.getElementById("admin-editor-subtitle");
    const dirtyBadge = document.getElementById("admin-editor-dirty-badge");

    if (titleEl) {
      titleEl.textContent = editorState.mode === "new" ? "Create New Wish" : "Edit Birthday Wish";
    }
    if (subEl) {
      subEl.textContent = editorState.mode === "new"
        ? "Craft and customize a full celebration experience"
        : `Editing Wish UUID: ${editorState.activeWishUuid || ""}`;
    }
    if (dirtyBadge) {
      dirtyBadge.style.display = editorState.isDirty ? "inline-block" : "none";
    }

    updateSummaryPanel();
  }

  function renderLetterLines() {
    const container = document.getElementById("adm-letter-lines-container");
    if (!container) return;
    const lines = editorState.config.letterLines || [];

    container.innerHTML = "";
    lines.forEach((line, idx) => {
      const div = document.createElement("div");
      div.className = "repeater-item";
      div.style.marginBottom = "8px";
      div.innerHTML = `
        <div class="repeater-header">
          <span class="repeater-title">Paragraph ${idx + 1}</span>
          ${lines.length > 1 ? `<button type="button" class="btn-remove-item" data-action="remove-line" data-index="${idx}">🗑️ Remove</button>` : ""}
        </div>
        <textarea class="form-control adm-letter-line" rows="2" data-index="${idx}">${escapeHtml(line)}</textarea>
      `;
      container.appendChild(div);
    });
  }

  function renderReasons() {
    const container = document.getElementById("adm-reasons-container");
    if (!container) return;
    const reasons = editorState.config.reasons || [];

    container.innerHTML = "";
    reasons.forEach((r, idx) => {
      const div = document.createElement("div");
      div.className = "repeater-item";
      div.innerHTML = `
        <div class="repeater-header">
          <span class="repeater-title">Reason #${idx + 1}</span>
          <button type="button" class="btn-remove-item" data-action="remove-reason" data-index="${idx}">🗑️ Remove</button>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label>Icon Emoji</label>
            <input type="text" class="form-control adm-reason-icon" data-index="${idx}" value="${escapeHtml(r.icon || '✨')}" maxlength="4">
          </div>
          <div class="form-group">
            <label>Card Title</label>
            <input type="text" class="form-control adm-reason-title" data-index="${idx}" value="${escapeHtml(r.title || '')}" placeholder="Title">
          </div>
        </div>
        <div class="form-group">
          <label>Reason Description</label>
          <textarea class="form-control adm-reason-text" data-index="${idx}" rows="2" placeholder="Why they are special...">${escapeHtml(r.text || '')}</textarea>
        </div>
      `;
      container.appendChild(div);
    });
  }

  function renderWishes() {
    const container = document.getElementById("adm-wishes-container");
    if (!container) return;
    const wishes = editorState.config.wishes || [];

    container.innerHTML = "";
    wishes.forEach((w, idx) => {
      const div = document.createElement("div");
      div.className = "repeater-item";
      div.innerHTML = `
        <div class="repeater-header">
          <span class="repeater-title">Wish Quote #${idx + 1}</span>
          <button type="button" class="btn-remove-item" data-action="remove-wish" data-index="${idx}">🗑️ Remove</button>
        </div>
        <textarea class="form-control adm-wish-text" data-index="${idx}" rows="2" placeholder="Birthday wish quote...">${escapeHtml(w || '')}</textarea>
      `;
      container.appendChild(div);
    });
  }

  function renderGallery() {
    const container = document.getElementById("adm-gallery-container");
    if (!container) return;
    const gallery = editorState.config.gallery || [];
    const defaults = (window.WishDefaults && typeof window.WishDefaults.getSectionDefault === "function")
      ? window.WishDefaults.getSectionDefault("gallery")
      : [];

    container.innerHTML = "";
    gallery.forEach((g, idx) => {
      const defItem = defaults[idx] || {};
      const capVal = g.cap || g.caption || defItem.cap || "A special moment ✨";
      const noteVal = g.secretNote || defItem.secretNote || "Remember this day? 💫";
      const emojiVal = g.emoji || defItem.emoji || "🎈";
      const imgVal = g.image || g.img || null;

      const div = document.createElement("div");
      div.className = "repeater-item";
      div.dataset.galleryIndex = String(idx);
      div.innerHTML = `
        <div class="repeater-header">
          <span class="repeater-title">Photo #${idx + 1}</span>
          <button type="button" class="btn-remove-item" data-action="remove-gallery" data-index="${idx}">🗑️ Remove Card</button>
        </div>

        <div class="gallery-thumb-box" data-index="${idx}">
          <div class="gallery-thumb-preview-wrap">
            ${imgVal 
              ? `<img src="${escapeHtml(imgVal)}" class="gallery-thumb-img" alt="Thumbnail" data-index="${idx}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'gallery-emoji-tile\\'>${escapeHtml(emojiVal)}</div>';">`
              : `<div class="gallery-emoji-tile" data-index="${idx}">${escapeHtml(emojiVal)}</div>`
            }
          </div>
          <div class="gallery-actions-inline">
            <input type="file" class="adm-gallery-file-input" data-index="${idx}" accept="image/*" style="display:none;">
            <button type="button" class="btn-sm adm-gallery-upload-btn" data-index="${idx}">📷 Upload Photo</button>
            <button type="button" class="btn-sm adm-gallery-clear-img-btn" data-index="${idx}" style="${imgVal ? '' : 'display:none;'}">❌ Clear Image</button>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label>Image Link (HTTPS URL)</label>
            <input type="text" class="form-control adm-gallery-image" data-index="${idx}" value="${escapeHtml(imgVal || '')}" placeholder="Paste Image Link or Upload from Device">
          </div>
          <div class="form-group">
            <label>Fallback Emoji</label>
            <input type="text" class="form-control adm-gallery-emoji" data-index="${idx}" value="${escapeHtml(emojiVal)}" maxlength="4" style="text-align:center;">
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label>Caption</label>
            <input type="text" class="form-control adm-gallery-caption" data-index="${idx}" value="${escapeHtml(capVal)}" placeholder="${escapeHtml(defItem.cap || 'Polaroid caption')}">
          </div>
          <div class="form-group">
            <label>Secret Flip Note</label>
            <input type="text" class="form-control adm-gallery-secret" data-index="${idx}" value="${escapeHtml(noteVal)}" placeholder="${escapeHtml(defItem.secretNote || 'Note on back of card')}">
          </div>
        </div>
      `;
      container.appendChild(div);
    });

    // Bind Instant Gallery URL Input preview
    container.querySelectorAll(".adm-gallery-image").forEach(inp => {
      const updatePreview = () => {
        const idx = parseInt(inp.dataset.index, 10);
        if (isNaN(idx) || !editorState.config.gallery[idx]) return;
        const val = inp.value.trim();
        editorState.config.gallery[idx].image = val || null;
        editorState.isDirty = true;

        const thumbWrap = container.querySelector(`.gallery-thumb-box[data-index="${idx}"] .gallery-thumb-preview-wrap`);
        const clearBtn = container.querySelector(`.adm-gallery-clear-img-btn[data-index="${idx}"]`);
        const emojiVal = editorState.config.gallery[idx].emoji || "🎈";

        if (thumbWrap) {
          if (val) {
            thumbWrap.innerHTML = `<img src="${escapeHtml(val)}" class="gallery-thumb-img" alt="Thumbnail" data-index="${idx}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'gallery-emoji-tile\\'>${escapeHtml(emojiVal)}</div>';">`;
            if (clearBtn) clearBtn.style.display = "inline-flex";
          } else {
            thumbWrap.innerHTML = `<div class="gallery-emoji-tile" data-index="${idx}">${escapeHtml(emojiVal)}</div>`;
            if (clearBtn) clearBtn.style.display = "none";
          }
        }
        updateSummaryPanel();
      };

      inp.addEventListener("input", updatePreview);
      inp.addEventListener("change", updatePreview);
    });

    // Bind Gallery upload & clear buttons
    container.querySelectorAll(".adm-gallery-upload-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = btn.dataset.index;
        const fileInp = container.querySelector(`.adm-gallery-file-input[data-index="${idx}"]`);
        if (fileInp) fileInp.click();
      });
    });

    container.querySelectorAll(".adm-gallery-file-input").forEach(inp => {
      inp.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        const idx = parseInt(inp.dataset.index, 10);
        if (!file || isNaN(idx) || !editorState.config.gallery[idx]) return;

        try {
          if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
            window.AdminCore.showToast("Compressing and uploading photo... ⏳");
          }

          // 1. Client-side Canvas Compression
          let blobToUpload = file;
          if (window.MediaService && typeof window.MediaService.compressImageFile === "function") {
            const dataUrl = await window.MediaService.compressImageFile(file, 400, 0.7);
            if (dataUrl && window.MediaService.dataURLtoBlob) {
              const compressedBlob = window.MediaService.dataURLtoBlob(dataUrl);
              if (compressedBlob) blobToUpload = compressedBlob;
            }
          }

          // 2. Upload to StorageModule (File/Blob)
          let publicUrl = null;
          if (window.StorageModule && typeof window.StorageModule.uploadMedia === "function") {
            publicUrl = await window.StorageModule.uploadMedia(blobToUpload, "photos");
          } else if (window.StorageModule && typeof window.StorageModule.uploadMediaFile === "function") {
            publicUrl = await window.StorageModule.uploadMediaFile(blobToUpload, "photos");
          }

          if (publicUrl) {
            editorState.config.gallery[idx].image = publicUrl;
            editorState.isDirty = true;
            renderGallery();
            updateSummaryPanel();
            if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
              window.AdminCore.showToast("Photo uploaded successfully! 📸✨");
            }
          } else {
            throw new Error("Storage upload returned null");
          }
        } catch (err) {
          console.warn("⚠️ Gallery photo upload error:", err);
          if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
            window.AdminCore.showToast(`Photo upload failed: ${err.message || "Network/Storage error"} ⚠️`);
          }
        }
      });
    });

    container.querySelectorAll(".adm-gallery-clear-img-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (!isNaN(idx) && editorState.config.gallery[idx]) {
          editorState.config.gallery[idx].image = null;
          editorState.isDirty = true;
          renderGallery();
          updateSummaryPanel();
        }
      });
    });
  }

  function renderTimeline() {
    const container = document.getElementById("adm-timeline-container");
    if (!container) return;
    const timeline = editorState.config.timeline || [];

    container.innerHTML = "";
    timeline.forEach((t, idx) => {
      const div = document.createElement("div");
      div.className = "repeater-item";
      div.innerHTML = `
        <div class="repeater-header">
          <span class="repeater-title">Milestone #${idx + 1}</span>
          <button type="button" class="btn-remove-item" data-action="remove-timeline" data-index="${idx}">🗑️ Remove</button>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label>Icon Emoji</label>
            <input type="text" class="form-control adm-timeline-icon" data-index="${idx}" value="${escapeHtml(t.icon || '👶')}" maxlength="4">
          </div>
          <div class="form-group">
            <label>Date / Time Period</label>
            <input type="text" class="form-control adm-timeline-date" data-index="${idx}" value="${escapeHtml(t.date || '')}" placeholder="e.g. 2015 or Childhood">
          </div>
        </div>
        <div class="form-group" style="margin-top:8px;">
          <label>Milestone Title</label>
          <input type="text" class="form-control adm-timeline-title" data-index="${idx}" value="${escapeHtml(t.title || '')}" placeholder="Title">
        </div>
        <div class="form-group">
          <label>Milestone Description</label>
          <textarea class="form-control adm-timeline-text" data-index="${idx}" rows="2" placeholder="Story text...">${escapeHtml(t.text || '')}</textarea>
        </div>
      `;
      container.appendChild(div);
    });
  }

  /* ============================================================
     6. AUDIO & VIDEO PARITY ENGINES
     ============================================================ */
  let ytAudioPlayerInstance = null;
  let ytVideoPlayerInstance = null;

  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) {
      return Promise.resolve(window.YT);
    }
    if (window.loadYouTubeIFrameAPI && typeof window.loadYouTubeIFrameAPI === "function") {
      return window.loadYouTubeIFrameAPI();
    }
    return new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api-script";
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
      const check = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(check);
          resolve(window.YT);
        }
      }, 150);
    });
  }

  async function updateAudioUI() {
    const cfg = editorState.config;
    if (!cfg) return;

    const mscUrlEl = document.getElementById("adm-input-music-url");
    const mscYtUrlEl = document.getElementById("adm-input-music-yt-url");
    const mscTimeEl = document.getElementById("adm-input-music-time");
    const player = document.getElementById("adm-audio-player");
    const ytPreview = document.getElementById("adm-audio-yt-preview");
    const durDisplay = document.getElementById("adm-audio-dur-display");
    const durTimeEl = document.getElementById("adm-audio-dur-time");
    const curTimeEl = document.getElementById("adm-audio-cur-time");
    const seekbar = document.getElementById("adm-audio-seekbar");

    const rawAudioUrl = cfg.music?.file || "assets/music/happy-birthday-song.mpeg";
    const audioUrl = (window.MediaService && typeof window.MediaService.stripMediaMetadata === "function")
      ? window.MediaService.stripMediaMetadata(rawAudioUrl)
      : rawAudioUrl.replace(/#bw-start=\d+/i, "").trim();

    const startSec = parseTime(cfg.music?.startTime || 0);

    const isYouTube = window.MediaService && typeof window.MediaService.isYouTubeVideoUrl === "function" && window.MediaService.isYouTubeVideoUrl(audioUrl);

    if (isYouTube) {
      if (mscYtUrlEl && document.activeElement !== mscYtUrlEl) mscYtUrlEl.value = audioUrl;
      if (mscUrlEl && document.activeElement !== mscUrlEl) mscUrlEl.value = "";
      if (player) {
        player.style.display = "none";
        if (typeof player.pause === "function") player.pause();
      }
      if (ytPreview) {
        ytPreview.style.display = "block";
        const ytId = window.MediaService?.extractYouTubeId ? window.MediaService.extractYouTubeId(audioUrl) : "";
        ytPreview.innerHTML = `
          <div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:12px;border:1px solid rgba(255,215,0,0.3);margin-top:6px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <span style="font-size:0.85rem;color:var(--gold);font-weight:700;">🎵 YouTube Audio Track Attached</span>
              <span style="font-size:0.75rem;color:var(--text-muted);">${ytId ? `ID: ${escapeHtml(ytId)}` : ''}</span>
            </div>
            <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
              <button type="button" id="adm-btn-yt-audio-play" class="btn-sm" style="background:linear-gradient(135deg,rgba(255,215,0,0.3),rgba(247,201,74,0.15));border:1px solid rgba(255,215,0,0.5);color:var(--gold,#ffd700);padding:6px 14px;border-radius:8px;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:6px;">▶️ Play Audio Track</button>
              <span id="adm-yt-audio-status" style="font-size:0.78rem;color:var(--text-muted);">Ready at start offset</span>
            </div>
            <div id="adm-audio-yt-player-slot" style="width:100%;height:140px;border-radius:8px;overflow:hidden;background:#000;"></div>
          </div>
        `;

        // Wire Play/Pause button
        const ytPlayBtn = document.getElementById("adm-btn-yt-audio-play");
        if (ytPlayBtn) {
          ytPlayBtn.addEventListener("click", () => {
            if (!ytAudioPlayerInstance || typeof ytAudioPlayerInstance.getPlayerState !== "function") return;
            const curState = ytAudioPlayerInstance.getPlayerState();
            const curStart = parseTime(editorState.config?.music?.startTime || 0);
            if (curState === 1) {
              ytAudioPlayerInstance.pauseVideo();
            } else {
              try { ytAudioPlayerInstance.seekTo(curStart, true); } catch (e) {}
              ytAudioPlayerInstance.playVideo();
            }
          });
        }

        if (ytId) {
          loadYouTubeApi().then((YT) => {
            if (!YT || !YT.Player) return;
            try {
              if (ytAudioPlayerInstance && typeof ytAudioPlayerInstance.destroy === "function") {
                ytAudioPlayerInstance.destroy();
              }
            } catch(e) {}
            try {
              ytAudioPlayerInstance = new YT.Player("adm-audio-yt-player-slot", {
                height: '140',
                width: '100%',
                videoId: ytId,
                playerVars: {
                  playsinline: 1,
                  enablejsapi: 1,
                  start: startSec > 0 ? startSec : 0
                },
                events: {
                  onReady: (event) => {
                    const dur = Math.floor(event.target.getDuration() || 0);
                    if (dur > 0) {
                      editorState.audioDuration = dur;
                      if (durDisplay) durDisplay.textContent = `YouTube Track (${formatTime(dur)})`;
                      if (durTimeEl) durTimeEl.textContent = formatTime(dur);
                      if (seekbar) {
                        seekbar.max = dur;
                        seekbar.value = Math.min(startSec, dur);
                        updateSeekbarFill(seekbar);
                      }
                    }
                    if (startSec > 0) {
                      try { event.target.seekTo(startSec, true); } catch (e) {}
                    }
                  },
                  onStateChange: (event) => {
                    const playBtn = document.getElementById("adm-btn-yt-audio-play");
                    const statusSpan = document.getElementById("adm-yt-audio-status");
                    if (event.data === 1) { // PLAYING
                      if (playBtn) playBtn.innerHTML = "⏸️ Pause Audio Track";
                      if (statusSpan) statusSpan.textContent = "Playing...";
                    } else if (event.data === 2) { // PAUSED
                      if (playBtn) playBtn.innerHTML = "▶️ Play Audio Track";
                      if (statusSpan) statusSpan.textContent = "Paused";
                    } else if (event.data === 0) { // ENDED
                      if (playBtn) playBtn.innerHTML = "▶️ Play Audio Track";
                      if (statusSpan) statusSpan.textContent = "Ended";
                    }
                  }
                }
              });
            } catch (err) {
              console.warn("⚠️ YouTube Audio Player init notice:", err);
            }
          });
        }
      }
      if (durDisplay && !durDisplay.textContent.includes("(")) durDisplay.textContent = "YouTube Song Attached";
      if (durTimeEl && durTimeEl.textContent === "00:00") durTimeEl.textContent = "YouTube Track";
      if (curTimeEl) curTimeEl.textContent = formatTime(startSec);
      if (mscTimeEl && document.activeElement !== mscTimeEl) mscTimeEl.value = formatTime(startSec);
      if (seekbar) {
        if (!seekbar.max || seekbar.max === "100") seekbar.max = 300;
        seekbar.value = startSec;
        updateSeekbarFill(seekbar);
      }
    } else {
      if (ytPreview) {
        ytPreview.style.display = "none";
        ytPreview.innerHTML = "";
      }
      try {
        if (ytAudioPlayerInstance && typeof ytAudioPlayerInstance.destroy === "function") {
          ytAudioPlayerInstance.destroy();
          ytAudioPlayerInstance = null;
        }
      } catch(e) {}

      if (mscUrlEl && document.activeElement !== mscUrlEl) mscUrlEl.value = audioUrl.includes("happy-birthday-song.mpeg") ? "" : audioUrl;
      if (mscYtUrlEl && document.activeElement !== mscYtUrlEl) mscYtUrlEl.value = "";
      if (player) {
        player.style.display = "block";
        if (player.src !== audioUrl && (!player.src || typeof player.src !== "string" || !player.src.endsWith(audioUrl))) {
          player.src = audioUrl;
        }
        if (startSec > 0 && Math.abs(player.currentTime - startSec) > 1) {
          try { player.currentTime = startSec; } catch (e) {}
        }
      }

      // Duration detection
      let duration = 0;
      if (window.MediaService && typeof window.MediaService.detectAudioDuration === "function") {
        duration = await window.MediaService.detectAudioDuration(audioUrl);
      }
      editorState.audioDuration = duration;

      if (durDisplay) {
        durDisplay.textContent = audioUrl.includes("happy-birthday") ? "Default Melody" : (duration > 0 ? `Duration: ${formatTime(duration)}` : "Custom Audio");
      }
      if (durTimeEl) {
        durTimeEl.textContent = duration > 0 ? formatTime(duration) : "03:00";
      }
      if (curTimeEl) {
        curTimeEl.textContent = formatTime(startSec);
      }
      if (mscTimeEl && document.activeElement !== mscTimeEl) {
        mscTimeEl.value = formatTime(startSec);
      }
      if (seekbar) {
        seekbar.max = duration > 0 ? duration : 180;
        seekbar.value = startSec;
        updateSeekbarFill(seekbar);
      }
    }
  }

  async function updateVideoUI() {
    const cfg = editorState.config;
    if (!cfg) return;

    const vidUrlEl = document.getElementById("adm-input-video-url");
    const vidYtUrlEl = document.getElementById("adm-input-video-yt-url");
    const vidTimeEl = document.getElementById("adm-input-video-time");
    const player = document.getElementById("adm-video-player");
    const ytPreview = document.getElementById("adm-video-yt-preview");
    const emptyPreview = document.getElementById("adm-video-empty-preview");
    const durDisplay = document.getElementById("adm-video-dur-display");
    const durTimeEl = document.getElementById("adm-video-dur-time");
    const curTimeEl = document.getElementById("adm-video-cur-time");
    const seekbar = document.getElementById("adm-video-seekbar");

    const rawVideoUrl = cfg.videoWish?.url || "";
    const videoUrl = (window.MediaService && typeof window.MediaService.stripMediaMetadata === "function")
      ? window.MediaService.stripMediaMetadata(rawVideoUrl)
      : rawVideoUrl.replace(/#bw-start=\d+/i, "").trim();

    const startSec = parseTime(cfg.videoWish?.startTime || 0);

    if (vidTimeEl && document.activeElement !== vidTimeEl) vidTimeEl.value = formatTime(startSec);
    if (curTimeEl) curTimeEl.textContent = formatTime(startSec);

    const isYouTube = window.MediaService && typeof window.MediaService.isYouTubeVideoUrl === "function" && window.MediaService.isYouTubeVideoUrl(videoUrl);

    if (!videoUrl) {
      if (vidUrlEl && document.activeElement !== vidUrlEl) vidUrlEl.value = "";
      if (vidYtUrlEl && document.activeElement !== vidYtUrlEl) vidYtUrlEl.value = "";
      if (player) {
        player.style.display = "none";
        if (typeof player.pause === "function") player.pause();
      }
      if (ytPreview) {
        ytPreview.style.display = "none";
        ytPreview.innerHTML = "";
      }
      try {
        if (ytVideoPlayerInstance && typeof ytVideoPlayerInstance.destroy === "function") {
          ytVideoPlayerInstance.destroy();
          ytVideoPlayerInstance = null;
        }
      } catch(e) {}
      if (emptyPreview) {
        emptyPreview.style.display = "block";
        emptyPreview.textContent = "No custom video selected (Optional surprise element)";
      }
      if (durDisplay) durDisplay.textContent = "No Video";
      if (durTimeEl) durTimeEl.textContent = "00:00";
      if (seekbar) {
        seekbar.max = 100;
        seekbar.value = 0;
        updateSeekbarFill(seekbar);
      }
      return;
    }

    if (isYouTube) {
      if (vidYtUrlEl && document.activeElement !== vidYtUrlEl) vidYtUrlEl.value = videoUrl;
      if (vidUrlEl && document.activeElement !== vidUrlEl) vidUrlEl.value = "";
      if (player) {
        player.style.display = "none";
        if (typeof player.pause === "function") player.pause();
      }
      if (emptyPreview) emptyPreview.style.display = "none";
      if (ytPreview) {
        ytPreview.style.display = "block";
        const ytId = window.MediaService?.extractYouTubeId ? window.MediaService.extractYouTubeId(videoUrl) : "";
        ytPreview.innerHTML = `<div id="adm-video-yt-player-slot" style="width:100%;height:220px;border-radius:8px;overflow:hidden;background:#000;"></div>`;

        if (ytId) {
          loadYouTubeApi().then((YT) => {
            if (!YT || !YT.Player) return;
            try {
              if (ytVideoPlayerInstance && typeof ytVideoPlayerInstance.destroy === "function") {
                ytVideoPlayerInstance.destroy();
              }
            } catch(e) {}
            try {
              ytVideoPlayerInstance = new YT.Player("adm-video-yt-player-slot", {
                height: '220',
                width: '100%',
                videoId: ytId,
                playerVars: {
                  playsinline: 1,
                  enablejsapi: 1,
                  start: startSec > 0 ? startSec : 0
                },
                events: {
                  onReady: (event) => {
                    const dur = Math.floor(event.target.getDuration() || 0);
                    if (dur > 0) {
                      editorState.videoDuration = dur;
                      if (durDisplay) durDisplay.textContent = `YouTube Video (${formatTime(dur)})`;
                      if (durTimeEl) durTimeEl.textContent = formatTime(dur);
                      if (seekbar) {
                        seekbar.max = dur;
                        seekbar.value = Math.min(startSec, dur);
                        updateSeekbarFill(seekbar);
                      }
                    }
                    if (startSec > 0) {
                      try { event.target.seekTo(startSec, true); } catch (e) {}
                    }
                  },
                  onStateChange: (event) => {
                    if (event.data === 1) { // PLAYING
                      const curStart = parseTime(editorState.config?.videoWish?.startTime || 0);
                      if (curStart > 0) {
                        const playedTime = event.target.getCurrentTime();
                        if (playedTime < curStart - 1) {
                          try { event.target.seekTo(curStart, true); } catch (e) {}
                        }
                      }
                    }
                  }
                }
              });
            } catch (err) {
              console.warn("⚠️ YouTube Video Player init notice:", err);
            }
          });
        }
      }
      if (durDisplay && !durDisplay.textContent.includes("(")) durDisplay.textContent = "YouTube Video";
      if (durTimeEl && durTimeEl.textContent === "00:00") durTimeEl.textContent = "YouTube";
      if (seekbar) {
        if (!seekbar.max || seekbar.max === "100") seekbar.max = 300;
        seekbar.value = startSec;
        updateSeekbarFill(seekbar);
      }
    } else {
      if (vidUrlEl && document.activeElement !== vidUrlEl) vidUrlEl.value = videoUrl;
      if (vidYtUrlEl && document.activeElement !== vidYtUrlEl) vidYtUrlEl.value = "";
      if (emptyPreview) emptyPreview.style.display = "none";
      if (ytPreview) {
        ytPreview.style.display = "none";
        ytPreview.innerHTML = "";
      }
      try {
        if (ytVideoPlayerInstance && typeof ytVideoPlayerInstance.destroy === "function") {
          ytVideoPlayerInstance.destroy();
          ytVideoPlayerInstance = null;
        }
      } catch(e) {}

      if (player) {
        player.style.display = "block";
        if (player.src !== videoUrl && (!player.src || typeof player.src !== "string" || !player.src.endsWith(videoUrl))) {
          player.src = videoUrl;
        }
        if (startSec > 0 && Math.abs(player.currentTime - startSec) > 1) {
          try { player.currentTime = startSec; } catch (e) {}
        }
      }

      let duration = 0;
      if (window.MediaService && typeof window.MediaService.detectVideoDuration === "function") {
        duration = await window.MediaService.detectVideoDuration(videoUrl);
      }
      editorState.videoDuration = duration;

      if (durDisplay) durDisplay.textContent = duration > 0 ? `Duration: ${formatTime(duration)}` : "MP4 Video";
      if (durTimeEl) durTimeEl.textContent = duration > 0 ? formatTime(duration) : "02:00";
      if (seekbar) {
        seekbar.max = duration > 0 ? duration : 120;
        seekbar.value = startSec;
        updateSeekbarFill(seekbar);
      }
    }
  }

  /* ============================================================
     7. DOM -> CONFIG SYNCHRONIZATION
     ============================================================ */
  function syncFormToConfig() {
    if (!editorState.config) return;
    const cfg = editorState.config;

    const nameEl = document.getElementById("adm-input-name");
    const fromEl = document.getElementById("adm-input-from");
    const dateDisplayEl = document.getElementById("adm-input-birthdate-display");
    const cakeEl = document.getElementById("adm-input-cake");
    const passEl = document.getElementById("adm-input-passcode");
    const themeEl = document.getElementById("adm-input-letter-theme");
    const fontEl = document.getElementById("adm-input-letter-font");
    const memEl = document.getElementById("adm-input-memory");
    const gftMsgEl = document.getElementById("adm-input-gift-message");
    const gftCpnEl = document.getElementById("adm-input-gift-coupon");
    const mscUrlEl = document.getElementById("adm-input-music-url");
    const mscYtUrlEl = document.getElementById("adm-input-music-yt-url");
    const mscTimeEl = document.getElementById("adm-input-music-time");
    const vidUrlEl = document.getElementById("adm-input-video-url");
    const vidYtUrlEl = document.getElementById("adm-input-video-yt-url");
    const vidTimeEl = document.getElementById("adm-input-video-time");

    if (nameEl) cfg.name = nameEl.value.trim();
    if (fromEl) cfg.from = fromEl.value.trim();

    if (dateDisplayEl && dateDisplayEl.value) {
      const parsedDate = parseUserDisplayDate(dateDisplayEl.value);
      if (parsedDate) {
        cfg.birthDate = parsedDate;
        const hiddenEl = document.getElementById("adm-input-birthdate");
        if (hiddenEl) hiddenEl.value = `${parsedDate.year}-${pad(parsedDate.month)}-${pad(parsedDate.day)}`;
      }
    }

    if (cakeEl) cfg.cakeFlavor = cakeEl.value;
    if (passEl) cfg.passcode = { code: passEl.value.trim() || "1234" };
    if (themeEl) cfg.letterTheme = themeEl.value;
    if (fontEl) cfg.letterFont = fontEl.value;
    if (memEl) cfg.memory = memEl.value;

    // Letter lines
    const lineEls = document.querySelectorAll(".adm-letter-line");
    if (lineEls.length > 0) {
      cfg.letterLines = Array.from(lineEls).map(el => el.value);
    }

    // Reasons
    const reasonEls = document.querySelectorAll("#adm-reasons-container .repeater-item");
    if (reasonEls.length > 0) {
      cfg.reasons = Array.from(reasonEls).map(item => ({
        icon: item.querySelector(".adm-reason-icon")?.value || "✨",
        title: item.querySelector(".adm-reason-title")?.value || "",
        text: item.querySelector(".adm-reason-text")?.value || ""
      }));
    }

    // Wishes
    const wishEls = document.querySelectorAll(".adm-wish-text");
    if (wishEls.length > 0) {
      cfg.wishes = Array.from(wishEls).map(el => el.value);
    }

    // Gallery
    const galEls = document.querySelectorAll("#adm-gallery-container .repeater-item");
    if (galEls.length > 0) {
      cfg.gallery = Array.from(galEls).map((item, idx) => ({
        image: item.querySelector(".adm-gallery-image")?.value.trim() || null,
        emoji: item.querySelector(".adm-gallery-emoji")?.value.trim() || "🎈",
        cap: item.querySelector(".adm-gallery-caption")?.value.trim() || "",
        secretNote: item.querySelector(".adm-gallery-secret")?.value.trim() || "",
        rot: idx % 2 === 0 ? -6 : 4
      }));
    }

    // Timeline
    const timeEls = document.querySelectorAll("#adm-timeline-container .repeater-item");
    if (timeEls.length > 0) {
      cfg.timeline = Array.from(timeEls).map(item => ({
        icon: item.querySelector(".adm-timeline-icon")?.value || "👶",
        date: item.querySelector(".adm-timeline-date")?.value || "",
        title: item.querySelector(".adm-timeline-title")?.value || "",
        text: item.querySelector(".adm-timeline-text")?.value || ""
      }));
    }

    // Gift
    cfg.gift = {
      message: gftMsgEl?.value || "",
      coupon: gftCpnEl?.value || ""
    };

    // Music: prioritize YouTube URL if filled, else direct URL
    const ytUrl = mscYtUrlEl?.value.trim() || "";
    const directUrl = mscUrlEl?.value.trim() || "";
    const chosenAudio = ytUrl || directUrl || "assets/music/happy-birthday-song.mpeg";

    cfg.music = {
      file: chosenAudio,
      startTime: parseTime(mscTimeEl?.value || 0)
    };

    // Video: prioritize YouTube URL if filled, else direct URL
    const ytVidUrl = vidYtUrlEl?.value.trim() || "";
    const directVidUrl = vidUrlEl?.value.trim() || "";
    const chosenVideo = ytVidUrl || directVidUrl || "";

    cfg.videoWish = {
      url: chosenVideo,
      startTime: parseTime(vidTimeEl?.value || 0)
    };

    editorState.isDirty = true;
    const dirtyBadge = document.getElementById("admin-editor-dirty-badge");
    if (dirtyBadge) dirtyBadge.style.display = "inline-block";

    updateSummaryPanel();
  }

  /* ============================================================
     8. LIVE SUMMARY PANEL
     ============================================================ */
  function updateSummaryPanel() {
    const cfg = editorState.config;
    if (!cfg) return;

    const modeEl = document.getElementById("adm-summary-mode");
    const statusEl = document.getElementById("adm-summary-status");
    const nameEl = document.getElementById("adm-sum-name");
    const fromEl = document.getElementById("adm-sum-from");
    const dateEl = document.getElementById("adm-sum-date");
    const cakeEl = document.getElementById("adm-sum-cake");
    const passEl = document.getElementById("adm-sum-passcode") || document.getElementById("adm-sum-pass");
    const letterEl = document.getElementById("adm-sum-letter");
    const themeEl = document.getElementById("adm-sum-theme");
    const fontEl = document.getElementById("adm-sum-font");
    const memEl = document.getElementById("adm-sum-memory");
    const reasonsEl = document.getElementById("adm-sum-reasons");
    const wishesEl = document.getElementById("adm-sum-wishes");
    const galEl = document.getElementById("adm-sum-gallery");
    const timeEl = document.getElementById("adm-sum-timeline");
    const giftEl = document.getElementById("adm-sum-gift");
    const musicEl = document.getElementById("adm-sum-music");
    const videoEl = document.getElementById("adm-sum-video");
    const uuidEl = document.getElementById("adm-sum-uuid");

    if (modeEl) {
      modeEl.textContent = editorState.mode === "new" ? "NEW WISH" : "EDITING";
      modeEl.className = `status-badge ${editorState.mode === "new" ? "active" : "gold"}`;
    }

    if (statusEl) {
      statusEl.textContent = editorState.isSaving ? "Saving..." : (editorState.isDirty ? "Unsaved Changes" : "Synced");
    }

    if (nameEl) nameEl.textContent = cfg.name ? cfg.name : "—";
    if (fromEl) fromEl.textContent = cfg.from ? cfg.from : "—";
    if (dateEl && cfg.birthDate) dateEl.textContent = formatDisplayDate(cfg.birthDate);
    if (cakeEl) {
      const cakeNames = {
        default: "Classic Pink",
        strawberry: "Pink Strawberry",
        chocolate: "Dark Velvet",
        vanilla: "Golden Vanilla"
      };
      cakeEl.textContent = cakeNames[cfg.cakeFlavor] || "Classic";
    }
    if (passEl) passEl.textContent = cfg.passcode?.code || "1234";

    if (letterEl) {
      const count = Array.isArray(cfg.letterLines) ? cfg.letterLines.length : 0;
      letterEl.textContent = `${count} para${count === 1 ? '' : 's'}`;
    }

    if (themeEl) {
      const themeNames = {
        default: "Original",
        royalgold: "Royal Gold",
        galaxy: "Midnight Galaxy",
        rosegold: "Rose Gold"
      };
      themeEl.textContent = themeNames[cfg.letterTheme] || "Original";
    }

    if (fontEl) {
      const fontNames = {
        default: "Sacramento",
        cursive: "Romantic",
        serif: "Royal Serif",
        script: "Playful Script",
        poppins: "Poppins",
        nunito: "Nunito",
        sans: "Outfit"
      };
      fontEl.textContent = fontNames[cfg.letterFont] || "Default";
    }

    if (memEl) {
      memEl.textContent = (cfg.memory && cfg.memory.trim()) ? "Configured" : "None";
    }

    if (reasonsEl) {
      const count = Array.isArray(cfg.reasons) ? cfg.reasons.length : 0;
      reasonsEl.textContent = `${count} reason${count === 1 ? '' : 's'}`;
    }

    if (wishesEl) {
      const count = Array.isArray(cfg.wishes) ? cfg.wishes.length : 0;
      wishesEl.textContent = `${count} quote${count === 1 ? '' : 's'}`;
    }

    if (galEl) {
      const count = Array.isArray(cfg.gallery) ? cfg.gallery.length : 0;
      galEl.textContent = `${count} photo${count === 1 ? '' : 's'}`;
    }

    if (timeEl) {
      const count = Array.isArray(cfg.timeline) ? cfg.timeline.length : 0;
      timeEl.textContent = `${count} milestone${count === 1 ? '' : 's'}`;
    }

    if (giftEl) {
      const hasMsg = !!(cfg.gift?.message && cfg.gift.message.trim());
      const hasCpn = !!(cfg.gift?.coupon && cfg.gift.coupon.trim());
      giftEl.textContent = (hasMsg || hasCpn) ? "Configured" : "None";
    }

    if (musicEl) {
      const audioUrl = cfg.music?.file || "";
      const isYT = window.MediaService && typeof window.MediaService.isYouTubeVideoUrl === "function" && window.MediaService.isYouTubeVideoUrl(audioUrl);
      if (isYT) {
        musicEl.textContent = "YouTube Song";
      } else if (audioUrl.includes("happy-birthday-song")) {
        musicEl.textContent = "Default Melody";
      } else if (audioUrl) {
        musicEl.textContent = "Custom Audio";
      } else {
        musicEl.textContent = "Default Melody";
      }
    }

    if (videoEl) {
      const vidUrl = cfg.videoWish?.url || "";
      const isYT = window.MediaService && typeof window.MediaService.isYouTubeVideoUrl === "function" && window.MediaService.isYouTubeVideoUrl(vidUrl);
      if (isYT) {
        videoEl.textContent = "YouTube Video";
      } else if (vidUrl) {
        videoEl.textContent = "Uploaded MP4";
      } else {
        videoEl.textContent = "None";
      }
    }

    if (uuidEl) {
      uuidEl.textContent = editorState.activeWishUuid || "Not Assigned (New)";
    }
  }

  /* ============================================================
     9. ACTIONS: OPEN, CLOSE, PREVIEW, SAVE & SHARE
     ============================================================ */
  function openNew() {
    if (!checkAuth()) return;

    editorState.isOpen = true;
    editorState.mode = "new";
    editorState.activeWishUuid = null;
    editorState.isDirty = false;
    editorState.isSaving = false;
    editorState.config = deepClone(DEFAULT_ADMIN_CONFIG);

    renderForm();
    switchTab("wish-editor");
  }

  async function openEdit(wishId) {
    if (!checkAuth()) return;
    if (!wishId) return openNew();

    editorState.isOpen = true;
    editorState.mode = "edit";
    editorState.activeWishUuid = wishId;
    editorState.isDirty = false;
    editorState.isSaving = false;

    switchTab("wish-editor");
    const subEl = document.getElementById("admin-editor-subtitle");
    if (subEl) subEl.textContent = `Loading wish data for UUID: ${wishId}...`;

    try {
      let record = null;

      if (window.AdminWishes && typeof window.AdminWishes.getWishes === "function") {
        const wishes = window.AdminWishes.getWishes();
        record = wishes.find(w => w.id === wishId);
      }

      if (!record && window.DatabaseModule && typeof window.DatabaseModule.getWishRecordById === "function") {
        record = await window.DatabaseModule.getWishRecordById(wishId);
      }

      if (!record && window.SupabaseModule) {
        const client = window.SupabaseModule.getClient();
        if (client) {
          const { data } = await client.from("wishes").select("*").eq("id", wishId).single();
          record = data;
        }
      }

      editorState.config = normalizeWishRecordToConfig(record);
    } catch (e) {
      console.warn("⚠️ AdminWishEditor: Failed to load wish record:", e);
      editorState.config = deepClone(DEFAULT_ADMIN_CONFIG);
    }

    renderForm();
  }

  function preview() {
    syncFormToConfig();
    const cfg = editorState.config;
    if (!cfg) return;

    try {
      const serialized = JSON.stringify(cfg);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("admin_preview_wish", serialized);
        sessionStorage.setItem("admin_preview_config", serialized);
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("admin_preview_wish", serialized);
        localStorage.setItem("admin_preview_config", serialized);
      }
      window.open("index.html?preview=admin", "_blank");
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast("Opening live preview in new tab... 👁️✨");
      }
    } catch (e) {
      console.warn("⚠️ Failed to open admin preview:", e);
    }
  }

  function close() {
    if (editorState.isDirty) {
      if (typeof window.confirm === "function" && !window.confirm("You have unsaved changes. Discard them and exit editor?")) {
        return false;
      }
    }
    editorState.isOpen = false;
    editorState.isDirty = false;
    switchTab("wishes");
    return true;
  }

  async function save() {
    if (!checkAuth()) return { success: false, error: "Unauthorized" };
    if (editorState.isSaving) return { success: false, error: "Save in progress" };

    syncFormToConfig();
    const cfg = editorState.config;

    // Validation
    if (!cfg.name || !cfg.name.trim()) {
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast("Recipient Name is required! ⚠️");
      }
      const nameEl = document.getElementById("adm-input-name");
      if (nameEl) nameEl.focus();
      return { success: false, error: "Recipient name is required" };
    }

    editorState.isSaving = true;
    updateSummaryPanel();

    try {
      // 1. Wait for any pending media uploads to finish
      if (editorState.pendingAudioUploadPromise) {
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Waiting for audio upload to complete... 🎙️⏳");
        }
        await editorState.pendingAudioUploadPromise;
      }
      if (editorState.pendingVideoUploadPromise) {
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Waiting for video upload to complete... 📹⏳");
        }
        await editorState.pendingVideoUploadPromise;
      }

      // 2. Safety check: do not persist temporary blob/object URLs
      if (typeof cfg.music?.file === "string" && cfg.music.file.startsWith("blob:")) {
        cfg.music.file = "assets/music/happy-birthday-song.mpeg";
      }
      if (typeof cfg.videoWish?.url === "string" && cfg.videoWish.url.startsWith("blob:")) {
        cfg.videoWish.url = "";
      }

      if (!window.DatabaseModule) {
        throw new Error("DatabaseModule unavailable");
      }

      let savedId = null;

      if (editorState.mode === "new" || !editorState.activeWishUuid) {
        // Single atomic INSERT
        savedId = await window.DatabaseModule.saveWish(cfg);
        if (!savedId) throw new Error("Failed to insert new wish record into database");

        editorState.activeWishUuid = savedId;
        editorState.mode = "edit";
      } else {
        // Single atomic UPDATE
        savedId = await window.DatabaseModule.updateWish(editorState.activeWishUuid, cfg);
        if (!savedId) throw new Error(`Failed to update wish record UUID: ${editorState.activeWishUuid}`);
      }

      editorState.isDirty = false;
      editorState.isSaving = false;

      const dirtyBadge = document.getElementById("admin-editor-dirty-badge");
      if (dirtyBadge) dirtyBadge.style.display = "none";

      renderForm();

      if (typeof onStateChangeHook === "function") {
        await onStateChangeHook("WISH_SAVED", `Wish saved: ${cfg.name} (UUID: ${savedId})`, cfg);
      }

      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast(`Wish saved successfully! 💾 (UUID: ${savedId.substring(0, 8)}...)`);
      }

      return { success: true, id: savedId };
    } catch (err) {
      console.error("❌ AdminWishEditor save error:", err);
      editorState.isSaving = false;
      updateSummaryPanel();

      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast(`Save failed: ${err.message} ⚠️`);
      }

      return { success: false, error: err.message };
    }
  }

  async function saveAndShare() {
    const res = await save();
    if (!res.success) return res;

    const wishId = res.id;
    if (wishId) {
      const shareUrl = `${window.location.origin}/index.html?id=${wishId}`;
      if (window.AdminCore && typeof window.AdminCore.copyWishUrl === "function") {
        window.AdminCore.copyWishUrl(shareUrl);
      } else if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
          await navigator.clipboard.writeText(shareUrl);
          if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
            window.AdminCore.showToast("Wish saved & shareable link copied to clipboard! 📋🚀");
          }
        } catch (e) {}
      }
    }

    return res;
  }

  function checkAuth() {
    const isAuth = (typeof window !== "undefined" && window.sessionStorage)
      ? window.sessionStorage.getItem("admin_authenticated") === "true"
      : (typeof sessionStorage !== "undefined" && sessionStorage.getItem("admin_authenticated") === "true");
    if (!isAuth) {
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast("Admin session expired. Please log in again 🔒");
      }
      return false;
    }
    return true;
  }

  function getState() {
    return {
      isOpen: editorState.isOpen,
      mode: editorState.mode,
      activeWishUuid: editorState.activeWishUuid,
      isDirty: editorState.isDirty,
      isSaving: editorState.isSaving,
      config: deepClone(editorState.config)
    };
  }

  /* ============================================================
     10. CALENDAR CONTROLLER (Quick Editor Masking & Parity)
     ============================================================ */
  function initAdminCalendar() {
    const modal = document.getElementById("adm-date-picker-modal");
    const openBtn = document.getElementById("adm-btn-datepicker");
    const displayInput = document.getElementById("adm-input-birthdate-display");
    const hiddenInput = document.getElementById("adm-input-birthdate");

    if (!modal || !displayInput) return;

    const monthSelect = document.getElementById("adm-mdp-month-select");
    const yearSelect = document.getElementById("adm-mdp-year-select");
    const prevMonthBtn = document.getElementById("adm-mdp-prev-month");
    const nextMonthBtn = document.getElementById("adm-mdp-next-month");
    const prevYearBtn = document.getElementById("adm-mdp-prev-year");
    const nextYearBtn = document.getElementById("adm-mdp-next-year");
    const daysGrid = document.getElementById("adm-mdp-days-grid");
    const todayBtn = document.getElementById("adm-mdp-today-btn");
    const cancelBtn = document.getElementById("adm-mdp-cancel-btn");
    const okBtn = document.getElementById("adm-mdp-ok-btn");

    let selectedDate = new Date(2001, 0, 1);
    let viewDate = new Date(2001, 0, 1);

    // Populate Year Select (1900 to currentYear + 10)
    if (yearSelect && yearSelect.options.length === 0) {
      const curYear = new Date().getFullYear();
      for (let y = curYear + 10; y >= 1900; y--) {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        opt.style.background = "#1B1530";
        opt.style.color = "#fff";
        yearSelect.appendChild(opt);
      }
    }

    function renderGrid() {
      if (!daysGrid) return;
      daysGrid.innerHTML = "";

      const yr = viewDate.getFullYear();
      const mo = viewDate.getMonth();

      if (monthSelect) monthSelect.value = mo;
      if (yearSelect) yearSelect.value = yr;

      const firstDayIndex = new Date(yr, mo, 1).getDay();
      const totalDays = new Date(yr, mo + 1, 0).getDate();
      const prevMonthDays = new Date(yr, mo, 0).getDate();

      const today = new Date();

      // Render Prev Month Days
      for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dayNum = prevMonthDays - i;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mdp-day-btn prev-month";
        btn.textContent = dayNum;
        btn.style.cssText = "background:none;border:none;color:rgba(255,255,255,0.25);font-size:0.85rem;padding:8px 0;border-radius:10px;cursor:pointer;";
        btn.addEventListener("click", () => {
          viewDate.setMonth(mo - 1);
          viewDate.setDate(dayNum);
          selectedDate = new Date(viewDate);
          renderGrid();
        });
        daysGrid.appendChild(btn);
      }

      // Render Current Month Days
      for (let d = 1; d <= totalDays; d++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mdp-day-btn";
        btn.textContent = d;

        const isSelected = selectedDate.getFullYear() === yr && selectedDate.getMonth() === mo && selectedDate.getDate() === d;
        const isToday = today.getFullYear() === yr && today.getMonth() === mo && today.getDate() === d;

        let style = "background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;font-size:0.85rem;font-weight:600;padding:8px 0;border-radius:10px;cursor:pointer;transition:all 0.2s;";

        if (isSelected) {
          style = "background:linear-gradient(135deg, #F7C94A, #e5b630);border:1px solid #ffd700;color:#120D24;font-size:0.85rem;font-weight:800;padding:8px 0;border-radius:10px;cursor:pointer;box-shadow:0 0 15px rgba(247,201,74,0.6);transform:scale(1.05);";
        } else if (isToday) {
          style = "background:rgba(168,85,247,0.2);border:1px solid rgba(247,201,74,0.6);color:#ffd700;font-size:0.85rem;font-weight:700;padding:8px 0;border-radius:10px;cursor:pointer;";
        }

        btn.style.cssText = style;
        btn.addEventListener("click", () => {
          selectedDate = new Date(yr, mo, d);
          viewDate = new Date(selectedDate);
          renderGrid();
        });

        daysGrid.appendChild(btn);
      }

      // Render Next Month Days
      const currentRendered = firstDayIndex + totalDays;
      const nextMonthDaysCount = (7 - (currentRendered % 7)) % 7;
      for (let n = 1; n <= nextMonthDaysCount; n++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mdp-day-btn next-month";
        btn.textContent = n;
        btn.style.cssText = "background:none;border:none;color:rgba(255,255,255,0.25);font-size:0.85rem;padding:8px 0;border-radius:10px;cursor:pointer;";
        btn.addEventListener("click", () => {
          viewDate.setMonth(mo + 1);
          viewDate.setDate(n);
          selectedDate = new Date(viewDate);
          renderGrid();
        });
        daysGrid.appendChild(btn);
      }
    }

    function openCalendar() {
      const curObj = (editorState.config && editorState.config.birthDate) ? editorState.config.birthDate : { year: 2001, month: 1, day: 1 };
      selectedDate = new Date(curObj.year || 2001, (curObj.month || 1) - 1, curObj.day || 1);
      viewDate = new Date(selectedDate);
      renderGrid();
      modal.style.display = "flex";
    }

    function closeCalendar() {
      modal.style.display = "none";
    }

    function applySelectedDate() {
      const yr = selectedDate.getFullYear();
      const mo = selectedDate.getMonth() + 1;
      const dy = selectedDate.getDate();

      if (editorState.config) {
        editorState.config.birthDate = { year: yr, month: mo, day: dy };
      }

      displayInput.value = formatDisplayDate({ year: yr, month: mo, day: dy });
      if (hiddenInput) {
        hiddenInput.value = `${yr}-${pad(mo)}-${pad(dy)}`;
      }

      editorState.isDirty = true;
      updateSummaryPanel();
      closeCalendar();
    }

    if (openBtn && !openBtn.__calBound) {
      openBtn.__calBound = true;
      openBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openCalendar();
      });
    }

    if (prevMonthBtn && !prevMonthBtn.__calBound) {
      prevMonthBtn.__calBound = true;
      prevMonthBtn.addEventListener("click", () => {
        viewDate.setMonth(viewDate.getMonth() - 1);
        renderGrid();
      });
    }

    if (nextMonthBtn && !nextMonthBtn.__calBound) {
      nextMonthBtn.__calBound = true;
      nextMonthBtn.addEventListener("click", () => {
        viewDate.setMonth(viewDate.getMonth() + 1);
        renderGrid();
      });
    }

    if (prevYearBtn && !prevYearBtn.__calBound) {
      prevYearBtn.__calBound = true;
      prevYearBtn.addEventListener("click", () => {
        viewDate.setFullYear(viewDate.getFullYear() - 1);
        renderGrid();
      });
    }

    if (nextYearBtn && !nextYearBtn.__calBound) {
      nextYearBtn.__calBound = true;
      nextYearBtn.addEventListener("click", () => {
        viewDate.setFullYear(viewDate.getFullYear() + 1);
        renderGrid();
      });
    }

    if (monthSelect && !monthSelect.__calBound) {
      monthSelect.__calBound = true;
      monthSelect.addEventListener("change", () => {
        viewDate.setMonth(parseInt(monthSelect.value, 10));
        renderGrid();
      });
    }

    if (yearSelect && !yearSelect.__calBound) {
      yearSelect.__calBound = true;
      yearSelect.addEventListener("change", () => {
        viewDate.setFullYear(parseInt(yearSelect.value, 10));
        renderGrid();
      });
    }

    if (todayBtn && !todayBtn.__calBound) {
      todayBtn.__calBound = true;
      todayBtn.addEventListener("click", () => {
        selectedDate = new Date();
        viewDate = new Date(selectedDate);
        renderGrid();
      });
    }

    if (cancelBtn && !cancelBtn.__calBound) {
      cancelBtn.__calBound = true;
      cancelBtn.addEventListener("click", closeCalendar);
    }

    if (okBtn && !okBtn.__calBound) {
      okBtn.__calBound = true;
      okBtn.addEventListener("click", applySelectedDate);
    }

    if (!modal.__backdropBound) {
      modal.__backdropBound = true;
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeCalendar();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.style.display === "flex") {
          closeCalendar();
        }
      });
    }

    // Segment-Aware Keyboard Navigation & Masking Handler
    if (displayInput && !displayInput.__keyMaskBound) {
      displayInput.__keyMaskBound = true;

      displayInput.addEventListener("keydown", (e) => {
        if (
          ["Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) ||
          e.ctrlKey || e.metaKey
        ) {
          return;
        }

        const pos = displayInput.selectionStart || 0;

        // Backspace handling: prevent slash removal and auto-skip back
        if (e.key === "Backspace") {
          if (pos === 3 || pos === 6) {
            e.preventDefault();
            displayInput.setSelectionRange(pos - 1, pos - 1);
            return;
          }
          return;
        }

        // Delete handling: prevent slash removal and auto-advance
        if (e.key === "Delete") {
          if (pos === 2 || pos === 5) {
            e.preventDefault();
            displayInput.setSelectionRange(pos + 1, pos + 1);
            return;
          }
          return;
        }

        // Allow only numeric digits
        if (!/^\d$/.test(e.key)) {
          e.preventDefault();
          return;
        }

        // Auto-advance past slashes
        if (pos === 2 || pos === 5) {
          displayInput.setSelectionRange(pos + 1, pos + 1);
        }
      });

      function syncTypedValue() {
        const val = displayInput.value;
        const initialPos = displayInput.selectionStart || 0;
        const wasAtEnd = (initialPos >= val.length - 1);
        let masked = "";

        let rawDay = "";
        let rawMonth = "";
        let rawYear = "";

        if (val.includes("/") || val.includes("-") || val.includes(".")) {
          const parts = val.split(/[\/\-\.]/);
          let p0 = (parts[0] || "").replace(/\D/g, "").slice(0, 2);
          let p1 = (parts[1] || "").replace(/\D/g, "").slice(0, 2);
          let p2 = (parts[2] || "").replace(/\D/g, "").slice(0, 4);

          if (parts.length >= 3) {
            masked = `${p0}/${p1}/${p2}`;
          } else if (parts.length === 2) {
            masked = `${p0}/${p1}`;
            if (p1.length === 2 && !val.endsWith("/")) {
              masked += "/";
            }
          } else {
            masked = p0;
            if (p0.length === 2) {
              masked += "/";
            }
          }
        } else {
          let raw = val.replace(/\D/g, "").slice(0, 8);
          if (raw.length > 0) {
            let p0 = raw.slice(0, 2);
            let p1 = raw.slice(2, 4);
            let p2 = raw.slice(4, 8);
            if (raw.length <= 2) {
              masked = p0 + (p0.length === 2 ? "/" : "");
            } else if (raw.length <= 4) {
              masked = p0 + "/" + p1 + (p1.length === 2 ? "/" : "");
            } else {
              masked = p0 + "/" + p1 + "/" + p2;
            }
          }
        }

        let newPos = initialPos;
        if (wasAtEnd) {
          newPos = masked.length;
        } else if (initialPos === 2 && masked.length > 2 && masked[2] === "/") {
          newPos = 3;
        } else if (initialPos === 5 && masked.length > 5 && masked[5] === "/") {
          newPos = 6;
        }

        displayInput.value = masked;
        if (typeof displayInput.setSelectionRange === "function") {
          try { displayInput.setSelectionRange(newPos, newPos); } catch (err) {}
        }

        const parsed = parseUserDisplayDate(masked);
        if (parsed) {
          selectedDate = new Date(parsed.year, parsed.month - 1, parsed.day);
          viewDate = new Date(selectedDate);
          if (editorState.config) editorState.config.birthDate = parsed;
          if (hiddenInput) hiddenInput.value = `${parsed.year}-${pad(parsed.month)}-${pad(parsed.day)}`;
          displayInput.classList.remove("input-error");
          editorState.isDirty = true;
          updateSummaryPanel();
        } else if (masked.replace(/\D/g, "").length === 8) {
          displayInput.classList.add("input-error");
        } else {
          displayInput.classList.remove("input-error");
        }
      }

      displayInput.addEventListener("input", syncTypedValue);

      displayInput.addEventListener("blur", () => {
        syncTypedValue();
        const val = displayInput.value.trim();
        if (!val) return;
        const parsed = parseUserDisplayDate(val);
        if (parsed) {
          displayInput.value = formatDisplayDate(parsed);
          displayInput.classList.remove("input-error");
        } else {
          displayInput.classList.add("input-error");
          if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
            window.AdminCore.showToast("Please enter a valid calendar date (DD/MM/YYYY) ⚠️");
          }
          if (editorState.config && editorState.config.birthDate) {
            displayInput.value = formatDisplayDate(editorState.config.birthDate);
          }
        }
      });
    }
  }

  /* ============================================================
     11. EVENT INITIALIZATION
     ============================================================ */
  function init(onStateChangeCallback) {
    if (typeof onStateChangeCallback === "function") {
      onStateChangeHook = onStateChangeCallback;
    }

    initAdminCalendar();

    // Relationship Presets V2
    const applyRelBtn = document.getElementById("adm-btn-apply-relationship");
    const relSelect = document.getElementById("adm-select-relationship");
    const relLangSelect = document.getElementById("adm-select-relationship-lang");
    const resetRelBtn = document.getElementById("adm-btn-reset-relationship");

    const applyAdminRelPreset = (relKey, lang = "en", isManual = false) => {
      if (!relKey) {
        if (isManual && window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Please choose a relationship template first! ⚠️");
        }
        return;
      }

      if (!window.RelationshipPresets || typeof window.RelationshipPresets.getPreset !== "function") {
        console.warn("⚠️ RelationshipPresets unavailable");
        return;
      }

      const preset = window.RelationshipPresets.getPreset(relKey, lang);
      if (!preset) {
        if (isManual && window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Relationship preset not found! ⚠️");
        }
        return;
      }

      // Apply preset content while strictly preserving basic metadata and uploaded media
      const cfg = editorState.config || deepClone(DEFAULT_ADMIN_CONFIG);
      cfg.letterLines = deepClone(preset.letterLines || cfg.letterLines);
      cfg.memory = preset.memory || cfg.memory;
      cfg.reasons = deepClone(preset.reasons || cfg.reasons);
      cfg.wishes = deepClone(preset.wishes || cfg.wishes);
      if (preset.gift) {
        cfg.gift = {
          message: preset.gift.message || cfg.gift?.message || "",
          coupon: preset.gift.coupon || cfg.gift?.coupon || ""
        };
      }
      if (Array.isArray(preset.timeline)) {
        cfg.timeline = deepClone(preset.timeline);
      }
      if (Array.isArray(preset.gallery) && Array.isArray(cfg.gallery)) {
        // Preserve existing uploaded photos while applying tailored captions, emojis & notes
        cfg.gallery.forEach((g, idx) => {
          const pG = preset.gallery[idx];
          if (pG) {
            g.emoji = pG.emoji || g.emoji;
            g.cap = pG.cap || g.cap;
            g.secretNote = pG.secretNote || g.secretNote;
          }
        });
      }

      editorState.config = cfg;
      editorState.isDirty = true;

      renderForm();
      updateSummaryPanel();

      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast(`Applied ${preset.label} style! ✨`);
      }
    };

    if (applyRelBtn && !applyRelBtn.__editorBound) {
      applyRelBtn.__editorBound = true;
      applyRelBtn.addEventListener("click", () => {
        applyAdminRelPreset(relSelect ? relSelect.value : "", relLangSelect ? relLangSelect.value : "en", true);
      });
    }

    if (relSelect && !relSelect.__changeBound) {
      relSelect.__changeBound = true;
      relSelect.addEventListener("change", () => {
        if (relSelect.value) {
          applyAdminRelPreset(relSelect.value, relLangSelect ? relLangSelect.value : "en", false);
        }
      });
    }

    if (relLangSelect && !relLangSelect.__changeBound) {
      relLangSelect.__changeBound = true;
      relLangSelect.addEventListener("change", () => {
        if (relSelect && relSelect.value) {
          applyAdminRelPreset(relSelect.value, relLangSelect.value, false);
        }
      });
    }

    // Relationship Reset (Issue C: preserves uploaded gallery image URLs)
    if (resetRelBtn && !resetRelBtn.__editorBound) {
      resetRelBtn.__editorBound = true;
      resetRelBtn.addEventListener("click", () => {
        const def = (window.WishDefaults && typeof window.WishDefaults.getDefaultConfig === "function")
          ? window.WishDefaults.getDefaultConfig()
          : DEFAULT_ADMIN_CONFIG;

        const cfg = editorState.config || deepClone(DEFAULT_ADMIN_CONFIG);
        cfg.letterLines = deepClone(def.letterLines);
        cfg.memory = def.memory;
        cfg.reasons = deepClone(def.reasons);
        cfg.wishes = deepClone(def.wishes);
        cfg.gift = deepClone(def.gift);
        cfg.timeline = deepClone(def.timeline);

        // Reset gallery metadata while preserving uploaded photos (Issue C)
        const defGallery = (window.WishDefaults && typeof window.WishDefaults.getSectionDefault === "function")
          ? window.WishDefaults.getSectionDefault("gallery")
          : def.gallery;
        if (Array.isArray(cfg.gallery) && Array.isArray(defGallery)) {
          cfg.gallery.forEach((g, idx) => {
            const defCard = defGallery[idx] || {};
            g.emoji = defCard.emoji || "🎈";
            g.cap = defCard.cap || "A special moment ✨";
            g.secretNote = defCard.secretNote || "Remember this day? 💫";
          });
        }

        if (relSelect) relSelect.value = "";

        editorState.config = cfg;
        editorState.isDirty = true;

        renderForm();
        updateSummaryPanel();

        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Reset relationship style to baseline defaults ↺");
        }
      });
    }

    // Basic Info Reset (Issue A)
    const resetBasicBtn = document.getElementById("adm-btn-reset-basic");
    if (resetBasicBtn && !resetBasicBtn.__editorBound) {
      resetBasicBtn.__editorBound = true;
      resetBasicBtn.addEventListener("click", () => {
        const cfg = editorState.config || deepClone(DEFAULT_ADMIN_CONFIG);
        cfg.name = "";
        cfg.birthDate = { year: 2001, month: 1, day: 1 };
        cfg.cakeFlavor = "default";
        cfg.passcode = { code: "1234" };

        const nameEl = document.getElementById("adm-input-name");
        const dateDisplayEl = document.getElementById("adm-input-birthdate-display");
        const dateHiddenEl = document.getElementById("adm-input-birthdate");
        const cakeEl = document.getElementById("adm-input-cake");
        const passEl = document.getElementById("adm-input-passcode");

        if (nameEl) nameEl.value = "";
        if (dateDisplayEl) dateDisplayEl.value = "01/01/2001";
        if (dateHiddenEl) dateHiddenEl.value = "2001-01-01";
        if (cakeEl) cakeEl.value = "default";
        if (passEl) passEl.value = "1234";

        editorState.config = cfg;
        editorState.isDirty = true;
        updateSummaryPanel();

        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Restored basic info to defaults ↺");
        }
      });
    }

    // Sender Info Reset (Issue A)
    const resetSenderBtn = document.getElementById("adm-btn-reset-sender");
    if (resetSenderBtn && !resetSenderBtn.__editorBound) {
      resetSenderBtn.__editorBound = true;
      resetSenderBtn.addEventListener("click", () => {
        const defFrom = (window.WishDefaults && typeof window.WishDefaults.getSectionDefault === "function")
          ? window.WishDefaults.getSectionDefault("from")
          : "your friends who adore you";

        const cfg = editorState.config || deepClone(DEFAULT_ADMIN_CONFIG);
        cfg.from = defFrom;

        const fromEl = document.getElementById("adm-input-from");
        if (fromEl) fromEl.value = defFrom;

        editorState.config = cfg;
        editorState.isDirty = true;
        updateSummaryPanel();

        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Restored sender info to defaults ↺");
        }
      });
    }

    // Top & Live Summary Action Buttons (Issue 2)
    const previewBtns = document.querySelectorAll("#btn-editor-preview, #btn-sum-preview");
    previewBtns.forEach(btn => {
      if (btn && !btn.__editorBound) {
        btn.__editorBound = true;
        btn.addEventListener("click", () => { preview(); });
      }
    });

    const saveBtns = document.querySelectorAll("#btn-editor-save, #btn-sum-save, #btn-editor-side-save");
    saveBtns.forEach(btn => {
      if (btn && !btn.__editorBound) {
        btn.__editorBound = true;
        btn.addEventListener("click", () => { save(); });
      }
    });

    const shareBtns = document.querySelectorAll("#btn-editor-save-share, #btn-sum-save-share, #btn-editor-side-save-share");
    shareBtns.forEach(btn => {
      if (btn && !btn.__editorBound) {
        btn.__editorBound = true;
        btn.addEventListener("click", () => { saveAndShare(); });
      }
    });

    const cancelBtns = document.querySelectorAll("#btn-editor-cancel, #btn-editor-side-cancel, #btn-editor-back");
    cancelBtns.forEach(btn => {
      if (btn && !btn.__editorBound) {
        btn.__editorBound = true;
        btn.addEventListener("click", () => { close(); });
      }
    });

    // Add Item Buttons
    const addLineBtn = document.getElementById("adm-btn-add-letter-line");
    if (addLineBtn && !addLineBtn.__editorBound) {
      addLineBtn.__editorBound = true;
      addLineBtn.addEventListener("click", () => {
        syncFormToConfig();
        editorState.config.letterLines.push("New heartfelt birthday paragraph...");
        renderLetterLines();
        updateSummaryPanel();
      });
    }

    const addReasonBtn = document.getElementById("adm-btn-add-reason");
    if (addReasonBtn && !addReasonBtn.__editorBound) {
      addReasonBtn.__editorBound = true;
      addReasonBtn.addEventListener("click", () => {
        syncFormToConfig();
        editorState.config.reasons.push({ icon: "💖", title: "New Reason", text: "Why you mean so much..." });
        renderReasons();
        updateSummaryPanel();
      });
    }

    const addWishBtn = document.getElementById("adm-btn-add-wish");
    if (addWishBtn && !addWishBtn.__editorBound) {
      addWishBtn.__editorBound = true;
      addWishBtn.addEventListener("click", () => {
        syncFormToConfig();
        editorState.config.wishes.push("May your special year be blessed with laughter and happiness!");
        renderWishes();
        updateSummaryPanel();
      });
    }

    const addGalleryBtn = document.getElementById("adm-btn-add-gallery");
    if (addGalleryBtn && !addGalleryBtn.__editorBound) {
      addGalleryBtn.__editorBound = true;
      addGalleryBtn.addEventListener("click", () => {
        syncFormToConfig();
        editorState.config.gallery.push({
          image: null,
          emoji: "🎈",
          cap: "Special memory ✨",
          secretNote: "Sweet vibes",
          rot: -6
        });
        renderGallery();
        updateSummaryPanel();
      });
    }

    const addTimelineBtn = document.getElementById("adm-btn-add-timeline");
    if (addTimelineBtn && !addTimelineBtn.__editorBound) {
      addTimelineBtn.__editorBound = true;
      addTimelineBtn.addEventListener("click", () => {
        syncFormToConfig();
        editorState.config.timeline.push({
          icon: "🌟",
          date: "Milestone",
          title: "New Chapter",
          text: "A special moment in time..."
        });
        renderTimeline();
        updateSummaryPanel();
      });
    }

    // Section Defaults Reset Buttons
    const resetLetterBtn = document.getElementById("adm-btn-reset-letter");
    if (resetLetterBtn && !resetLetterBtn.__editorBound) {
      resetLetterBtn.__editorBound = true;
      resetLetterBtn.addEventListener("click", () => {
        const def = (window.WishDefaults && typeof window.WishDefaults.getSectionDefault === "function")
          ? window.WishDefaults.getSectionDefault("letterLines")
          : DEFAULT_ADMIN_CONFIG.letterLines;
        editorState.config.letterLines = deepClone(def);
        editorState.config.letterTheme = "default";
        editorState.config.letterFont = "default";
        const themeEl = document.getElementById("adm-input-letter-theme");
        const fontEl = document.getElementById("adm-input-letter-font");
        if (themeEl) themeEl.value = "default";
        if (fontEl) fontEl.value = "default";
        renderLetterLines();
        editorState.isDirty = true;
        updateSummaryPanel();
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Restored letter to defaults ✨");
        }
      });
    }

    const resetMemoryBtn = document.getElementById("adm-btn-reset-memory");
    if (resetMemoryBtn && !resetMemoryBtn.__editorBound) {
      resetMemoryBtn.__editorBound = true;
      resetMemoryBtn.addEventListener("click", () => {
        const def = (window.WishDefaults && typeof window.WishDefaults.getSectionDefault === "function")
          ? window.WishDefaults.getSectionDefault("memory")
          : DEFAULT_ADMIN_CONFIG.memory;
        editorState.config.memory = def;
        const memEl = document.getElementById("adm-input-memory");
        if (memEl) memEl.value = def;
        editorState.isDirty = true;
        updateSummaryPanel();
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Restored memory to defaults 🌟");
        }
      });
    }

    const resetReasonsBtn = document.getElementById("adm-btn-reset-reasons");
    if (resetReasonsBtn && !resetReasonsBtn.__editorBound) {
      resetReasonsBtn.__editorBound = true;
      resetReasonsBtn.addEventListener("click", () => {
        const def = (window.WishDefaults && typeof window.WishDefaults.getSectionDefault === "function")
          ? window.WishDefaults.getSectionDefault("reasons")
          : DEFAULT_ADMIN_CONFIG.reasons;
        editorState.config.reasons = deepClone(def);
        renderReasons();
        editorState.isDirty = true;
        updateSummaryPanel();
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Restored reasons to defaults ⭐");
        }
      });
    }

    const resetWishesBtn = document.getElementById("adm-btn-reset-wishes");
    if (resetWishesBtn && !resetWishesBtn.__editorBound) {
      resetWishesBtn.__editorBound = true;
      resetWishesBtn.addEventListener("click", () => {
        const def = (window.WishDefaults && typeof window.WishDefaults.getSectionDefault === "function")
          ? window.WishDefaults.getSectionDefault("wishes")
          : DEFAULT_ADMIN_CONFIG.wishes;
        editorState.config.wishes = deepClone(def);
        renderWishes();
        editorState.isDirty = true;
        updateSummaryPanel();
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Restored wishes to defaults 💫");
        }
      });
    }

    const resetGalleryBtn = document.getElementById("adm-btn-reset-gallery");
    if (resetGalleryBtn && !resetGalleryBtn.__editorBound) {
      resetGalleryBtn.__editorBound = true;
      resetGalleryBtn.addEventListener("click", () => {
        const def = (window.WishDefaults && typeof window.WishDefaults.getSectionDefault === "function")
          ? window.WishDefaults.getSectionDefault("gallery")
          : DEFAULT_ADMIN_CONFIG.gallery;
        editorState.config.gallery = deepClone(def);
        renderGallery();
        editorState.isDirty = true;
        updateSummaryPanel();
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Restored gallery to defaults 📸");
        }
      });
    }

    const resetTimelineBtn = document.getElementById("adm-btn-reset-timeline");
    if (resetTimelineBtn && !resetTimelineBtn.__editorBound) {
      resetTimelineBtn.__editorBound = true;
      resetTimelineBtn.addEventListener("click", () => {
        const def = (window.WishDefaults && typeof window.WishDefaults.getSectionDefault === "function")
          ? window.WishDefaults.getSectionDefault("timeline")
          : DEFAULT_ADMIN_CONFIG.timeline;
        editorState.config.timeline = deepClone(def);
        renderTimeline();
        editorState.isDirty = true;
        updateSummaryPanel();
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Restored timeline to defaults ⏳");
        }
      });
    }

    const resetGiftBtn = document.getElementById("adm-btn-reset-gift");
    if (resetGiftBtn && !resetGiftBtn.__editorBound) {
      resetGiftBtn.__editorBound = true;
      resetGiftBtn.addEventListener("click", () => {
        const def = (window.WishDefaults && typeof window.WishDefaults.getSectionDefault === "function")
          ? window.WishDefaults.getSectionDefault("gift")
          : DEFAULT_ADMIN_CONFIG.gift;
        editorState.config.gift = deepClone(def);
        const gftMsgEl = document.getElementById("adm-input-gift-message");
        const gftCpnEl = document.getElementById("adm-input-gift-coupon");
        if (gftMsgEl) gftMsgEl.value = def.message || "";
        if (gftCpnEl) gftCpnEl.value = def.coupon || "";
        editorState.isDirty = true;
        updateSummaryPanel();
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Restored gift details to defaults 🎁");
        }
      });
    }

    // Audio Controls (Issue D, E, F, G, H)
    const uploadAudioBtn = document.getElementById("adm-btn-upload-audio");
    const audioFileInp = document.getElementById("adm-audio-file-input");
    const audioPlayer = document.getElementById("adm-audio-player");
    if (uploadAudioBtn && audioFileInp && !uploadAudioBtn.__editorBound) {
      uploadAudioBtn.__editorBound = true;
      uploadAudioBtn.addEventListener("click", () => { audioFileInp.click(); });
      audioFileInp.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          // Instant Local Object URL Fast Preview (Issue D)
          const localUrl = URL.createObjectURL(file);
          editorState.config.music = editorState.config.music || {};
          editorState.config.music.file = localUrl;
          editorState.config.music.startTime = 0; // Source changed -> reset start time (Issue G)

          const ytAudioInp = document.getElementById("adm-input-music-yt-url");
          if (ytAudioInp) ytAudioInp.value = "";
          const mscUrlInp = document.getElementById("adm-input-music-url");
          if (mscUrlInp) mscUrlInp.value = "";

          editorState.isDirty = true;
          await updateAudioUI();
          updateSummaryPanel();

          if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
            window.AdminCore.showToast("Local preview active. Uploading audio to cloud... 🎙️⏳");
          }

          // Asynchronous Background Cloud Upload
          editorState.pendingAudioUploadPromise = (async () => {
            try {
              let publicUrl = null;
              if (window.StorageModule && typeof window.StorageModule.uploadMedia === "function") {
                publicUrl = await window.StorageModule.uploadMedia(file, "audio");
              } else if (window.StorageModule && typeof window.StorageModule.uploadMediaFile === "function") {
                publicUrl = await window.StorageModule.uploadMediaFile(file, "audio");
              }
              if (publicUrl && editorState.config?.music?.file === localUrl) {
                editorState.config.music.file = publicUrl;
                if (mscUrlInp) mscUrlInp.value = publicUrl;
                updateSummaryPanel();
              }
              try { URL.revokeObjectURL(localUrl); } catch (e) {}
              if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
                window.AdminCore.showToast("Audio synced to cloud storage! 🎵✨");
              }
            } catch (err) {
              console.warn("⚠️ Audio upload failed:", err);
            } finally {
              editorState.pendingAudioUploadPromise = null;
            }
          })();
        } catch (err) {
          console.warn("⚠️ Audio preview error:", err);
        }
      });
    }

    if (audioPlayer && !audioPlayer.__offsetBound) {
      audioPlayer.__offsetBound = true;
      audioPlayer.addEventListener("play", () => {
        const startSec = parseTime(editorState.config?.music?.startTime || 0);
        if (startSec > 0 && audioPlayer.currentTime < startSec) {
          audioPlayer.currentTime = startSec;
        }
      });
    }

    // Remove Uploaded Audio
    const removeAudioBtn = document.getElementById("adm-btn-remove-audio");
    if (removeAudioBtn && !removeAudioBtn.__editorBound) {
      removeAudioBtn.__editorBound = true;
      removeAudioBtn.addEventListener("click", async () => {
        editorState.config.music = {
          file: "assets/music/happy-birthday-song.mpeg",
          startTime: 0
        };
        const mscUrlInp = document.getElementById("adm-input-music-url");
        if (mscUrlInp) mscUrlInp.value = "";
        const mscTimeInp = document.getElementById("adm-input-music-time");
        if (mscTimeInp) mscTimeInp.value = "00:00";
        editorState.isDirty = true;
        await updateAudioUI();
        updateSummaryPanel();
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Reset to default birthday melody 🎵");
        }
      });
    }

    // Clear Direct Audio Link Button
    const clearDirectAudioBtn = document.getElementById("adm-btn-clear-direct-audio");
    if (clearDirectAudioBtn && !clearDirectAudioBtn.__editorBound) {
      clearDirectAudioBtn.__editorBound = true;
      clearDirectAudioBtn.addEventListener("click", async () => {
        const mscUrlInp = document.getElementById("adm-input-music-url");
        if (mscUrlInp) mscUrlInp.value = "";

        const ytAudioInp = document.getElementById("adm-input-music-yt-url");
        const ytVal = ytAudioInp?.value.trim() || "";

        if (ytVal && window.MediaService?.isYouTubeVideoUrl && window.MediaService.isYouTubeVideoUrl(ytVal)) {
          editorState.config.music = {
            file: ytVal,
            startTime: parseTime(editorState.config.music?.startTime || 0)
          };
        } else {
          editorState.config.music = {
            file: "assets/music/happy-birthday-song.mpeg",
            startTime: 0
          };
        }

        editorState.isDirty = true;
        await updateAudioUI();
        updateSummaryPanel();
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Direct audio link cleared ✨");
        }
      });
    }

    // Clear YouTube Song (must NOT clear custom direct audio)
    const clearYtAudioBtn = document.getElementById("adm-btn-clear-yt-audio");
    if (clearYtAudioBtn && !clearYtAudioBtn.__editorBound) {
      clearYtAudioBtn.__editorBound = true;
      clearYtAudioBtn.addEventListener("click", async () => {
        const ytAudioInp = document.getElementById("adm-input-music-yt-url");
        if (ytAudioInp) ytAudioInp.value = "";

        const mscUrlInp = document.getElementById("adm-input-music-url");
        const directUrl = mscUrlInp?.value.trim() || "";

        if (directUrl && (!window.MediaService?.isYouTubeVideoUrl || !window.MediaService.isYouTubeVideoUrl(directUrl))) {
          editorState.config.music = {
            file: directUrl,
            startTime: parseTime(editorState.config.music?.startTime || 0)
          };
        } else {
          editorState.config.music = {
            file: "assets/music/happy-birthday-song.mpeg",
            startTime: 0
          };
        }

        editorState.isDirty = true;
        await updateAudioUI();
        updateSummaryPanel();
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("YouTube song link cleared ✨");
        }
      });
    }

    // Live Audio URL change handlers (Mutual Exclusivity + Reset Start Time on Source Switch)
    const mscUrlInp = document.getElementById("adm-input-music-url");
    const mscYtUrlInp = document.getElementById("adm-input-music-yt-url");

    if (mscUrlInp && !mscUrlInp.__liveBound) {
      mscUrlInp.__liveBound = true;
      const handleDirectAudioChange = async () => {
        const val = mscUrlInp.value.trim();
        if (val && val !== editorState.config?.music?.file) {
          editorState.config.music = { file: val, startTime: 0 };
          if (mscYtUrlInp && document.activeElement !== mscYtUrlInp) mscYtUrlInp.value = "";
          const mscTimeInp = document.getElementById("adm-input-music-time");
          if (mscTimeInp) mscTimeInp.value = "00:00";
          editorState.isDirty = true;
          await updateAudioUI();
          updateSummaryPanel();
        }
      };
      mscUrlInp.addEventListener("change", handleDirectAudioChange);
      mscUrlInp.addEventListener("input", () => {
        const val = mscUrlInp.value.trim();
        if (!val || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:") || val.startsWith("assets/")) {
          handleDirectAudioChange();
        }
      });
    }

    if (mscYtUrlInp && !mscYtUrlInp.__liveBound) {
      mscYtUrlInp.__liveBound = true;
      const handleYtAudioChange = async () => {
        const val = mscYtUrlInp.value.trim();
        if (val && val !== editorState.config?.music?.file) {
          editorState.config.music = { file: val, startTime: 0 };
          if (mscUrlInp && document.activeElement !== mscUrlInp) mscUrlInp.value = "";
          const mscTimeInp = document.getElementById("adm-input-music-time");
          if (mscTimeInp) mscTimeInp.value = "00:00";
          editorState.isDirty = true;
          await updateAudioUI();
          updateSummaryPanel();
        }
      };
      mscYtUrlInp.addEventListener("change", handleYtAudioChange);
      mscYtUrlInp.addEventListener("input", () => {
        const val = mscYtUrlInp.value.trim();
        if (!val || (window.MediaService?.isYouTubeVideoUrl && window.MediaService.isYouTubeVideoUrl(val))) {
          handleYtAudioChange();
        }
      });
    }

    const audioSeekbar = document.getElementById("adm-audio-seekbar");
    const audioTimeInp = document.getElementById("adm-input-music-time");
    const audioCurTime = document.getElementById("adm-audio-cur-time");
    if (audioSeekbar && !audioSeekbar.__editorBound) {
      audioSeekbar.__editorBound = true;
      audioSeekbar.addEventListener("input", () => {
        const sec = parseInt(audioSeekbar.value, 10) || 0;
        if (audioTimeInp && document.activeElement !== audioTimeInp) audioTimeInp.value = formatTime(sec);
        if (audioCurTime) audioCurTime.textContent = formatTime(sec);
        if (editorState.config.music) editorState.config.music.startTime = sec;
        if (ytAudioPlayerInstance && typeof ytAudioPlayerInstance.seekTo === "function") {
          try { ytAudioPlayerInstance.seekTo(sec, true); } catch (e) {}
        }
        if (audioPlayer && audioPlayer.src && !audioPlayer.src.includes("youtube")) {
          try { audioPlayer.currentTime = sec; } catch (e) {}
        }
        updateSeekbarFill(audioSeekbar);
        editorState.isDirty = true;
      });
    }
    if (audioTimeInp && !audioTimeInp.__editorBound) {
      audioTimeInp.__editorBound = true;
      audioTimeInp.addEventListener("input", () => {
        const sec = parseTime(audioTimeInp.value);
        if (audioSeekbar) {
          audioSeekbar.value = sec;
          updateSeekbarFill(audioSeekbar);
        }
        if (audioCurTime) audioCurTime.textContent = formatTime(sec);
        if (editorState.config.music) editorState.config.music.startTime = sec;
        if (ytAudioPlayerInstance && typeof ytAudioPlayerInstance.seekTo === "function") {
          try { ytAudioPlayerInstance.seekTo(sec, true); } catch (e) {}
        }
        if (audioPlayer && audioPlayer.src && !audioPlayer.src.includes("youtube")) {
          try { audioPlayer.currentTime = sec; } catch (e) {}
        }
        editorState.isDirty = true;
      });
    }

    // Video Controls (Issue I, J, K, L, M)
    const uploadVideoBtn = document.getElementById("adm-btn-upload-video");
    const videoFileInp = document.getElementById("adm-video-file-input");
    const videoPlayer = document.getElementById("adm-video-player");
    if (uploadVideoBtn && videoFileInp && !uploadVideoBtn.__editorBound) {
      uploadVideoBtn.__editorBound = true;
      uploadVideoBtn.addEventListener("click", () => { videoFileInp.click(); });
      videoFileInp.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          // Instant Local Object URL Fast Preview (Issue I)
          const localUrl = URL.createObjectURL(file);
          editorState.config.videoWish = editorState.config.videoWish || {};
          editorState.config.videoWish.url = localUrl;
          editorState.config.videoWish.startTime = 0; // Source change -> reset start time (Issue L)

          const vidUrlInp = document.getElementById("adm-input-video-url");
          if (vidUrlInp) vidUrlInp.value = "";
          const vidYtUrlInp = document.getElementById("adm-input-video-yt-url");
          if (vidYtUrlInp) vidYtUrlInp.value = "";
          const vidTimeInp = document.getElementById("adm-input-video-time");
          if (vidTimeInp) vidTimeInp.value = "00:00";

          editorState.isDirty = true;
          await updateVideoUI();
          updateSummaryPanel();

          if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
            window.AdminCore.showToast("Local preview active. Uploading video surprise to cloud... 📹⏳");
          }

          // Asynchronous Background Cloud Upload
          editorState.pendingVideoUploadPromise = (async () => {
            try {
              let publicUrl = null;
              if (window.StorageModule && typeof window.StorageModule.uploadMedia === "function") {
                publicUrl = await window.StorageModule.uploadMedia(file, "videos");
              } else if (window.StorageModule && typeof window.StorageModule.uploadMediaFile === "function") {
                publicUrl = await window.StorageModule.uploadMediaFile(file, "videos");
              }
              if (publicUrl && editorState.config?.videoWish?.url === localUrl) {
                editorState.config.videoWish.url = publicUrl;
                if (vidUrlInp) vidUrlInp.value = publicUrl;
                updateSummaryPanel();
              }
              try { URL.revokeObjectURL(localUrl); } catch (e) {}
              if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
                window.AdminCore.showToast("Video surprise synced to cloud storage! 🎬✨");
              }
            } catch (err) {
              console.warn("⚠️ Video upload failed:", err);
            } finally {
              editorState.pendingVideoUploadPromise = null;
            }
          })();
        } catch (err) {
          console.warn("⚠️ Video preview error:", err);
        }
      });
    }

    if (videoPlayer && !videoPlayer.__offsetBound) {
      videoPlayer.__offsetBound = true;
      videoPlayer.addEventListener("play", () => {
        const startSec = parseTime(editorState.config?.videoWish?.startTime || 0);
        if (startSec > 0 && videoPlayer.currentTime < startSec) {
          videoPlayer.currentTime = startSec;
        }
      });
    }

    // Remove Uploaded Video
    const removeVideoBtn = document.getElementById("adm-btn-remove-video");
    if (removeVideoBtn && !removeVideoBtn.__editorBound) {
      removeVideoBtn.__editorBound = true;
      removeVideoBtn.addEventListener("click", async () => {
        editorState.config.videoWish = { url: "", startTime: 0 };
        const vidUrlInp = document.getElementById("adm-input-video-url");
        if (vidUrlInp) vidUrlInp.value = "";
        const vidYtUrlInp = document.getElementById("adm-input-video-yt-url");
        if (vidYtUrlInp) vidYtUrlInp.value = "";
        const vidTimeInp = document.getElementById("adm-input-video-time");
        if (vidTimeInp) vidTimeInp.value = "00:00";
        editorState.isDirty = true;
        await updateVideoUI();
        updateSummaryPanel();
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Video wish removed 🗑️");
        }
      });
    }

    // Clear Direct Video Button
    const clearDirectVideoBtn = document.getElementById("adm-btn-clear-direct-video");
    if (clearDirectVideoBtn && !clearDirectVideoBtn.__editorBound) {
      clearDirectVideoBtn.__editorBound = true;
      clearDirectVideoBtn.addEventListener("click", async () => {
        const vidUrlInp = document.getElementById("adm-input-video-url");
        if (vidUrlInp) vidUrlInp.value = "";

        const vidYtUrlInp = document.getElementById("adm-input-video-yt-url");
        const ytVal = vidYtUrlInp?.value.trim() || "";

        if (ytVal && window.MediaService?.isYouTubeVideoUrl && window.MediaService.isYouTubeVideoUrl(ytVal)) {
          editorState.config.videoWish = { url: ytVal, startTime: parseTime(editorState.config.videoWish?.startTime || 0) };
        } else {
          editorState.config.videoWish = { url: "", startTime: 0 };
          const vidTimeInp = document.getElementById("adm-input-video-time");
          if (vidTimeInp) vidTimeInp.value = "00:00";
        }

        editorState.isDirty = true;
        await updateVideoUI();
        updateSummaryPanel();
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("Direct video URL cleared ✨");
        }
      });
    }

    // Clear YouTube Video Button
    const clearYtVideoBtn = document.getElementById("adm-btn-clear-yt-video");
    if (clearYtVideoBtn && !clearYtVideoBtn.__editorBound) {
      clearYtVideoBtn.__editorBound = true;
      clearYtVideoBtn.addEventListener("click", async () => {
        const vidYtUrlInp = document.getElementById("adm-input-video-yt-url");
        if (vidYtUrlInp) vidYtUrlInp.value = "";

        const vidUrlInp = document.getElementById("adm-input-video-url");
        const directVal = vidUrlInp?.value.trim() || "";

        if (directVal && (!window.MediaService?.isYouTubeVideoUrl || !window.MediaService.isYouTubeVideoUrl(directVal))) {
          editorState.config.videoWish = { url: directVal, startTime: parseTime(editorState.config.videoWish?.startTime || 0) };
        } else {
          editorState.config.videoWish = { url: "", startTime: 0 };
          const vidTimeInp = document.getElementById("adm-input-video-time");
          if (vidTimeInp) vidTimeInp.value = "00:00";
        }

        editorState.isDirty = true;
        await updateVideoUI();
        updateSummaryPanel();
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast("YouTube video link cleared ✨");
        }
      });
    }

    // Live Video URL change handlers (Mutual Exclusivity + Reset Start Time on Source Switch)
    const vidUrlInp = document.getElementById("adm-input-video-url");
    const vidYtUrlInp = document.getElementById("adm-input-video-yt-url");

    if (vidUrlInp && !vidUrlInp.__liveBound) {
      vidUrlInp.__liveBound = true;
      const handleDirectVidChange = async () => {
        const val = vidUrlInp.value.trim();
        if (val !== editorState.config?.videoWish?.url) {
          editorState.config.videoWish = { url: val, startTime: 0 };
          if (vidYtUrlInp && document.activeElement !== vidYtUrlInp) vidYtUrlInp.value = "";
          const vidTimeInp = document.getElementById("adm-input-video-time");
          if (vidTimeInp) vidTimeInp.value = "00:00";
          editorState.isDirty = true;
          await updateVideoUI();
          updateSummaryPanel();
        }
      };
      vidUrlInp.addEventListener("change", handleDirectVidChange);
      vidUrlInp.addEventListener("input", () => {
        const val = vidUrlInp.value.trim();
        if (!val || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:") || val.startsWith("assets/")) {
          handleDirectVidChange();
        }
      });
    }

    if (vidYtUrlInp && !vidYtUrlInp.__liveBound) {
      vidYtUrlInp.__liveBound = true;
      const handleYtVidChange = async () => {
        const val = vidYtUrlInp.value.trim();
        if (val !== editorState.config?.videoWish?.url) {
          editorState.config.videoWish = { url: val, startTime: 0 };
          if (vidUrlInp && document.activeElement !== vidUrlInp) vidUrlInp.value = "";
          const vidTimeInp = document.getElementById("adm-input-video-time");
          if (vidTimeInp) vidTimeInp.value = "00:00";
          editorState.isDirty = true;
          await updateVideoUI();
          updateSummaryPanel();
        }
      };
      vidYtUrlInp.addEventListener("change", handleYtVidChange);
      vidYtUrlInp.addEventListener("input", () => {
        const val = vidYtUrlInp.value.trim();
        if (!val || (window.MediaService?.isYouTubeVideoUrl && window.MediaService.isYouTubeVideoUrl(val))) {
          handleYtVidChange();
        }
      });
    }

    const videoSeekbar = document.getElementById("adm-video-seekbar");
    const videoTimeInp = document.getElementById("adm-input-video-time");
    const videoCurTime = document.getElementById("adm-video-cur-time");
    if (videoSeekbar && !videoSeekbar.__editorBound) {
      videoSeekbar.__editorBound = true;
      videoSeekbar.addEventListener("input", () => {
        const sec = parseInt(videoSeekbar.value, 10) || 0;
        if (videoTimeInp && document.activeElement !== videoTimeInp) videoTimeInp.value = formatTime(sec);
        if (videoCurTime) videoCurTime.textContent = formatTime(sec);
        if (editorState.config.videoWish) editorState.config.videoWish.startTime = sec;
        if (ytVideoPlayerInstance && typeof ytVideoPlayerInstance.seekTo === "function") {
          try { ytVideoPlayerInstance.seekTo(sec, true); } catch (e) {}
        }
        if (videoPlayer && videoPlayer.src && !videoPlayer.src.includes("youtube")) {
          try { videoPlayer.currentTime = sec; } catch (e) {}
        }
        updateSeekbarFill(videoSeekbar);
        editorState.isDirty = true;
      });
    }
    if (videoTimeInp && !videoTimeInp.__editorBound) {
      videoTimeInp.__editorBound = true;
      videoTimeInp.addEventListener("input", () => {
        const sec = parseTime(videoTimeInp.value);
        if (videoSeekbar) {
          videoSeekbar.value = sec;
          updateSeekbarFill(videoSeekbar);
        }
        if (videoCurTime) videoCurTime.textContent = formatTime(sec);
        if (editorState.config.videoWish) editorState.config.videoWish.startTime = sec;
        if (ytVideoPlayerInstance && typeof ytVideoPlayerInstance.seekTo === "function") {
          try { ytVideoPlayerInstance.seekTo(sec, true); } catch (e) {}
        }
        if (videoPlayer && videoPlayer.src && !videoPlayer.src.includes("youtube")) {
          try { videoPlayer.currentTime = sec; } catch (e) {}
        }
        editorState.isDirty = true;
      });
    }

    // Input Change Delegation
    const viewEditor = document.getElementById("view-wish-editor");
    if (viewEditor && !viewEditor.__editorInputBound) {
      viewEditor.__editorInputBound = true;

      viewEditor.addEventListener("input", (e) => {
        if (e.target.matches(".form-control") || e.target.matches("textarea") || e.target.matches("select")) {
          syncFormToConfig();
        }
      });

      viewEditor.addEventListener("change", (e) => {
        if (e.target.matches(".form-control") || e.target.matches("textarea") || e.target.matches("select")) {
          syncFormToConfig();
          if (e.target.id === "adm-input-music-url" || e.target.id === "adm-input-music-yt-url") updateAudioUI();
          if (e.target.id === "adm-input-video-url" || e.target.id === "adm-input-video-yt-url") updateVideoUI();
          if (e.target.id === "adm-input-letter-theme" || e.target.id === "adm-input-letter-font") updateSummaryPanel();
        }
      });

      // Remove Repeater Items Delegation
      viewEditor.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        const idx = parseInt(btn.dataset.index, 10);
        if (isNaN(idx)) return;

        syncFormToConfig();

        if (action === "remove-line") {
          editorState.config.letterLines.splice(idx, 1);
          renderLetterLines();
        } else if (action === "remove-reason") {
          editorState.config.reasons.splice(idx, 1);
          renderReasons();
        } else if (action === "remove-wish") {
          editorState.config.wishes.splice(idx, 1);
          renderWishes();
        } else if (action === "remove-gallery") {
          editorState.config.gallery.splice(idx, 1);
          renderGallery();
        } else if (action === "remove-timeline") {
          editorState.config.timeline.splice(idx, 1);
          renderTimeline();
        }

        updateSummaryPanel();
      });
    }
  }

  /* ============================================================
     12. AUTHORITATIVE EXPORT
     ============================================================ */
  window.AdminWishEditor = Object.freeze({
    init,
    openNew,
    openEdit,
    preview,
    close,
    save,
    saveAndShare,
    getState,
    DEFAULT_ADMIN_CONFIG
  });

})(typeof window !== "undefined" ? window : globalThis);
