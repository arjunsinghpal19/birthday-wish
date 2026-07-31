/**
 * ============================================================================
 * FULL-FEATURED WISH EDITOR ENGINE (js/editor.js)
 * Restores the complete original customizer experience:
 * Recipient, Sender, Event, Passcode, Letter & Fonts, Memory, Reasons,
 * Wishes, Gallery (Image Upload), Timeline, Gift, Music/Audio & Video Wish.
 * Includes default content fallback system and dynamic template resetters.
 * ============================================================================
 */

(function (window) {
  "use strict";

  let currentWishId = null;
  let isEditMode = false;

  // Helper to fetch Golden Version Classic Template reliably
  function getClassicTemplate() {
    if (typeof window !== "undefined" && window.CONFIG && window.CONFIG.templates && window.CONFIG.templates.classic) {
      return window.CONFIG.templates.classic;
    }
    if (typeof window !== "undefined" && window.CONFIG) {
      return window.CONFIG;
    }
    if (typeof CONFIG !== "undefined" && CONFIG.templates && CONFIG.templates.classic) {
      return CONFIG.templates.classic;
    }
    if (typeof CONFIG !== "undefined") {
      return CONFIG;
    }
    return {};
  }

  // Local working copy initialized dynamically from Golden Version Classic Template
  let workingConfig = JSON.parse(JSON.stringify(getClassicTemplate() || {}));

  // Toast Notification Helper
  function showToast(message) {
    const toast = document.getElementById("editor-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3500);
  }

  // Strip HTML Tags Helper
  function stripHtml(html) {
    if (!html) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  // Accordion Toggle Handler
  function initAccordion() {
    document.querySelectorAll(".editor-section-header").forEach(header => {
      header.addEventListener("click", () => {
        const body = header.nextElementSibling;
        const wasOpen = header.classList.contains("active");

        // Close all sections
        document.querySelectorAll(".editor-section-header").forEach(h => {
          h.classList.remove("active");
          if (h.nextElementSibling) h.nextElementSibling.classList.remove("open");
        });

        // Toggle clicked section
        if (!wasOpen && body) {
          header.classList.add("active");
          body.classList.add("open");
        }
      });
    });
  }

  // Populate Dynamic Event Categories Dropdown
  function populateEventTypes() {
    const select = document.getElementById("input-event-type");
    if (!select) return;
    select.innerHTML = "";

    const activeEvents = (window.CONFIG && Array.isArray(window.CONFIG.ACTIVE_EVENT_TYPES))
      ? window.CONFIG.ACTIVE_EVENT_TYPES
      : [{ id: "birthday", name: "Birthday", icon: "🎂" }];

    activeEvents.forEach(evt => {
      const option = document.createElement("option");
      option.value = evt.id;
      option.textContent = `${evt.icon || "🎂"} ${evt.name}`;
      select.appendChild(option);
    });
  }

  // Passcode Real-Time Validation
  function initPasscodeValidation() {
    const passInput = document.getElementById("input-passcode");
    const errorEl = document.getElementById("input-passcode-error");
    const saveBtn = document.getElementById("customizer-save-btn");
    const topSaveBtn = document.getElementById("top-save-btn");

    if (!passInput) return;

    function validate() {
      const val = (passInput.value || "").trim();
      const isValid = val === "" || /^\d{4}$/.test(val);

      if (!isValid) {
        if (errorEl) errorEl.style.display = "block";
        passInput.style.borderColor = "#ff7675";
        if (saveBtn) saveBtn.disabled = true;
        if (topSaveBtn) topSaveBtn.disabled = true;
      } else {
        if (errorEl) errorEl.style.display = "none";
        passInput.style.borderColor = "rgba(255, 255, 255, 0.2)";
        if (saveBtn) saveBtn.disabled = false;
        if (topSaveBtn) topSaveBtn.disabled = false;
      }
      return isValid;
    }

    passInput.addEventListener("input", validate);
    validate();
  }

  // ─── DYNAMIC RENDERERS FOR REPEATING SECTIONS ───

  function renderLetterInputs() {
    const container = document.getElementById("letter-inputs-container");
    if (!container) return;
    container.innerHTML = "";

    const classic = getClassicTemplate();
    const lines = (Array.isArray(workingConfig.letterLines) && workingConfig.letterLines.length > 0)
      ? workingConfig.letterLines
      : (classic.letterLines || []);

    lines.forEach((line, i) => {
      const group = document.createElement("div");
      group.className = "form-group";
      group.innerHTML = `
        <label>Letter Line ${i + 1}</label>
        <small class="field-hint">Paragraph ${i + 1} of birthday letter</small>
        <textarea class="letter-line-input" rows="2" data-index="${i}">${stripHtml(line)}</textarea>
      `;
      container.appendChild(group);
    });
  }

  function renderReasonInputs() {
    const container = document.getElementById("reasons-inputs-container");
    if (!container) return;
    container.innerHTML = "";

    const classic = getClassicTemplate();
    const reasons = (Array.isArray(workingConfig.reasons) && workingConfig.reasons.length > 0)
      ? workingConfig.reasons
      : (classic.reasons || []);

    reasons.forEach((r, i) => {
      const group = document.createElement("div");
      group.className = "editor-item-group";
      const descVal = r.text || r.desc || "";
      group.innerHTML = `
        <div class="item-header">
          <span class="item-label">Reason Card ${i + 1}</span>
          <button type="button" class="item-delete-btn" data-type="reason" data-index="${i}" title="Delete">✕</button>
        </div>
        <div class="form-group">
          <div class="emoji-text-row">
            <div>
              <label>Icon</label>
              <input type="text" class="emoji-input reason-icon" value="${r.icon || '⭐'}" data-index="${i}" maxlength="4">
            </div>
            <div class="text-input">
              <label>Title</label>
              <input type="text" class="reason-title" value="${r.title || ''}" data-index="${i}">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea class="reason-desc" rows="2" data-index="${i}">${descVal}</textarea>
        </div>
      `;
      container.appendChild(group);
    });

    container.querySelectorAll(".item-delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index);
        workingConfig.reasons.splice(idx, 1);
        renderReasonInputs();
      });
    });
  }

  function renderWishInputs() {
    const container = document.getElementById("wishes-inputs-container");
    if (!container) return;
    container.innerHTML = "";

    const classic = getClassicTemplate();
    const wishes = (Array.isArray(workingConfig.wishes) && workingConfig.wishes.length > 0)
      ? workingConfig.wishes
      : (classic.wishes || []);

    wishes.forEach((w, i) => {
      const group = document.createElement("div");
      group.className = "editor-item-group";
      const quoteText = typeof w === "string" ? w : (w.quote || w.text || "");
      group.innerHTML = `
        <div class="item-header">
          <span class="item-label">Wish Quote ${i + 1}</span>
          <button type="button" class="item-delete-btn" data-type="wish" data-index="${i}" title="Delete">✕</button>
        </div>
        <div class="form-group">
          <textarea class="wish-text-input" rows="2" data-index="${i}">${quoteText}</textarea>
        </div>
      `;
      container.appendChild(group);
    });

    container.querySelectorAll(".item-delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index);
        workingConfig.wishes.splice(idx, 1);
        renderWishInputs();
      });
    });
  }

  function renderGalleryInputs() {
    const container = document.getElementById("gallery-inputs-container");
    if (!container) return;
    container.innerHTML = "";

    const classic = getClassicTemplate();
    const gallery = (Array.isArray(workingConfig.gallery) && workingConfig.gallery.length > 0)
      ? workingConfig.gallery
      : (classic.gallery || []);

    gallery.forEach((g, i) => {
      const group = document.createElement("div");
      group.className = "editor-item-group";
      const noteVal = g.secretNote || g.note || "";
      const capVal = g.cap || g.caption || "";
      const imgVal = g.image || "";
      const isHttp = imgVal.startsWith("http");

      group.innerHTML = `
        <div class="item-header">
          <span class="item-label">Photo Tile ${i + 1}</span>
          <button type="button" class="item-delete-btn" data-type="gallery" data-index="${i}" title="Delete">✕</button>
        </div>
        <div class="form-group">
          <label>Photo Image</label>
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:6px;flex-wrap:wrap;">
            <label style="background:rgba(255,215,0,0.1);border:1px dashed var(--gold,#ffd700);color:var(--gold,#ffd700);padding:6px 12px;border-radius:8px;font-size:0.75rem;cursor:pointer;">
              📸 Choose File
              <input type="file" class="gallery-file-input" accept="image/*" data-index="${i}" style="display:none;">
            </label>
            <input type="url" class="gallery-url-input" placeholder="Paste Image Link (https://...)" value="${isHttp ? imgVal : ''}" data-index="${i}" style="flex:1;min-width:180px;font-size:0.8rem;">
          </div>
          <div class="gallery-img-preview-row" style="display:${imgVal ? 'flex' : 'none'};align-items:center;gap:10px;margin-top:6px;background:rgba(255,255,255,0.05);padding:6px 10px;border-radius:8px;border:1px solid rgba(255,215,0,0.2);">
            <img class="gallery-preview-thumb" src="${imgVal}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid rgba(255,215,0,0.5);">
            <span style="font-size:0.75rem;color:var(--gold,#ffd700);flex:1;word-break:break-all;">${imgVal ? (imgVal.startsWith('data:') ? '📸 Photo File Selected' : imgVal) : ''}</span>
            <button type="button" class="remove-gallery-img-btn" data-index="${i}" style="background:rgba(255,0,80,0.2);border:1px solid rgba(255,0,80,0.4);color:#ff6b9d;padding:4px 8px;border-radius:6px;font-size:0.7rem;cursor:pointer;">✕ Remove</button>
          </div>
        </div>
        <div class="form-group">
          <div class="emoji-text-row">
            <div>
              <label>Emoji</label>
              <input type="text" class="emoji-input gallery-emoji" value="${g.emoji || '🎈'}" data-index="${i}" maxlength="4">
            </div>
            <div class="text-input">
              <label>Caption</label>
              <input type="text" class="gallery-cap" value="${capVal}" data-index="${i}">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Secret Note (Back of card)</label>
          <input type="text" class="gallery-note" value="${noteVal}" data-index="${i}">
        </div>
      `;
      container.appendChild(group);
    });

    container.querySelectorAll(".item-delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index);
        workingConfig.gallery.splice(idx, 1);
        renderGalleryInputs();
      });
    });

    // Image File Upload Listener
    container.querySelectorAll(".gallery-file-input").forEach(input => {
      input.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const idx = parseInt(input.dataset.index);
        showToast("⏳ Processing photo thumbnail...");

        try {
          const reader = new FileReader();
          reader.onload = (evt) => {
            workingConfig.gallery[idx].image = evt.target.result;
            renderGalleryInputs();
            showToast(`Photo thumbnail loaded into Tile ${idx + 1}! 📸`);
          };
          reader.readAsDataURL(file);
        } catch (err) {
          console.error(err);
        }
      });
    });

    // Image Remove Listener
    container.querySelectorAll(".remove-gallery-img-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index);
        workingConfig.gallery[idx].image = "";
        renderGalleryInputs();
        showToast(`Photo removed from Tile ${idx + 1}!`);
      });
    });
  }

  function renderTimelineInputs() {
    const container = document.getElementById("timeline-inputs-container");
    if (!container) return;
    container.innerHTML = "";

    const classic = getClassicTemplate();
    const timeline = (Array.isArray(workingConfig.timeline) && workingConfig.timeline.length > 0)
      ? workingConfig.timeline
      : (classic.timeline || []);

    timeline.forEach((t, i) => {
      const group = document.createElement("div");
      group.className = "editor-item-group";
      const dateVal = t.date || t.year || "";
      group.innerHTML = `
        <div class="item-header">
          <span class="item-label">Milestone ${i + 1}</span>
          <button type="button" class="item-delete-btn" data-type="timeline" data-index="${i}" title="Delete">✕</button>
        </div>
        <div class="form-group">
          <div class="emoji-text-row">
            <div style="width:110px;">
              <label>Date / Period</label>
              <input type="text" class="timeline-year" value="${dateVal}" data-index="${i}">
            </div>
            <div class="emoji-input-wrap" style="width:50px;">
              <label>Emoji</label>
              <input type="text" class="emoji-input timeline-icon" value="${t.icon || '✨'}" data-index="${i}" maxlength="4">
            </div>
            <div class="text-input">
              <label>Title</label>
              <input type="text" class="timeline-title" value="${t.title || ''}" data-index="${i}">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Memory Story</label>
          <textarea class="timeline-text" rows="2" data-index="${i}">${t.text || ''}</textarea>
        </div>
      `;
      container.appendChild(group);
    });

    container.querySelectorAll(".item-delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index);
        workingConfig.timeline.splice(idx, 1);
        renderTimelineInputs();
      });
    });
  }

  // Populate All Form Fields from workingConfig
  function populateFormFields() {
    const classic = getClassicTemplate();
    if (classic) {
      if (!workingConfig.letterLines || workingConfig.letterLines.length === 0) {
        workingConfig.letterLines = JSON.parse(JSON.stringify(classic.letterLines || []));
      }
      if (!workingConfig.memory) {
        workingConfig.memory = classic.memory || "";
      }
      if (!workingConfig.reasons || workingConfig.reasons.length === 0) {
        workingConfig.reasons = JSON.parse(JSON.stringify(classic.reasons || []));
      }
      if (!workingConfig.wishes || workingConfig.wishes.length === 0) {
        workingConfig.wishes = JSON.parse(JSON.stringify(classic.wishes || []));
      }
      if (!workingConfig.gallery || workingConfig.gallery.length === 0) {
        workingConfig.gallery = JSON.parse(JSON.stringify(classic.gallery || []));
      }
      if (!workingConfig.timeline || workingConfig.timeline.length === 0) {
        workingConfig.timeline = JSON.parse(JSON.stringify(classic.timeline || []));
      }
      if (!workingConfig.gift || !workingConfig.gift.message) {
        workingConfig.gift = JSON.parse(JSON.stringify(classic.gift || {}));
      }
      if (!workingConfig.birthDate) {
        workingConfig.birthDate = classic.birthDate || { year: 2001, month: 1, day: 1 };
      }
    }

    // In CREATE Mode, Recipient Name is EMPTY (placeholder e.g. Arjun), Sender Name is pre-filled ("your friends who adore you"), Passcode is EMPTY (placeholder 1234)
    if (!isEditMode) {
      const nameIn = document.getElementById("input-name");
      if (nameIn) nameIn.value = "";
      const fromIn = document.getElementById("input-from");
      if (fromIn) fromIn.value = workingConfig.from || "your friends who adore you";
      const passIn = document.getElementById("input-passcode");
      if (passIn) passIn.value = "";
    } else {
      const nameIn = document.getElementById("input-name");
      if (nameIn) nameIn.value = workingConfig.name || "";
      const fromIn = document.getElementById("input-from");
      if (fromIn) fromIn.value = workingConfig.from || "your friends who adore you";
      const passIn = document.getElementById("input-passcode");
      if (passIn) passIn.value = workingConfig.pass_code || "";
    }

    if (workingConfig.birthDate) {
      const y = workingConfig.birthDate.year || 2001;
      const m = String(workingConfig.birthDate.month || 1).padStart(2, "0");
      const d = String(workingConfig.birthDate.day || 1).padStart(2, "0");
      const bdateInput = document.getElementById("input-birthdate");
      if (bdateInput) bdateInput.value = `${y}-${m}-${d}`;
    }

    if (workingConfig.cakeFlavor) {
      const cakeSel = document.getElementById("input-cake-flavor");
      if (cakeSel) cakeSel.value = workingConfig.cakeFlavor;
    }
    if (workingConfig.letterTheme) {
      const themeSel = document.getElementById("input-letter-theme");
      if (themeSel) themeSel.value = workingConfig.letterTheme;
    }
    if (workingConfig.letterFont) {
      const fontSel = document.getElementById("input-letter-font");
      if (fontSel) fontSel.value = workingConfig.letterFont;
    }
    if (workingConfig.memory) {
      const memArea = document.getElementById("input-memory");
      if (memArea) memArea.value = workingConfig.memory;
    }

    if (workingConfig.gift) {
      const giftMsg = document.getElementById("input-gift-message");
      if (giftMsg) giftMsg.value = workingConfig.gift.message || "";
      const giftCpn = document.getElementById("input-gift-coupon");
      if (giftCpn) giftCpn.value = workingConfig.gift.coupon || "";
    }

    // Default Music URL: keep text input EMPTY by default, do NOT expose assets/music/happy-birthday-song.mpeg
    const musicUrlEl = document.getElementById("input-music-url");
    if (musicUrlEl) {
      const rawUrl = workingConfig.music?.url || workingConfig.music?.file || "";
      if (rawUrl === "assets/music/happy-birthday-song.mpeg") {
        musicUrlEl.value = "";
      } else {
        musicUrlEl.value = rawUrl;
      }
    }
    const musicStartEl = document.getElementById("input-music-start");
    if (musicStartEl) musicStartEl.value = workingConfig.music?.start || "";

    // Audio file preview update
    if (workingConfig.music?.file && workingConfig.music.file.startsWith("data:")) {
      const audioContainer = document.getElementById("audio-preview-container");
      const audioNameEl = document.getElementById("audio-file-name");
      const audioPlayer = document.getElementById("audio-preview-player");
      const removeAudioBtn = document.getElementById("remove-audio-file-btn");

      if (audioContainer) audioContainer.style.display = "block";
      if (audioNameEl) audioNameEl.textContent = `🎙️ ${workingConfig.music.name || 'Custom Audio Voice Note'}`;
      if (audioPlayer) audioPlayer.src = workingConfig.music.file;
      if (removeAudioBtn) removeAudioBtn.style.display = "inline-flex";
    }

    const videoUrlEl = document.getElementById("input-video-url");
    if (videoUrlEl) videoUrlEl.value = workingConfig.videoWish?.url || workingConfig.videoWish?.file || "";
    const videoStartEl = document.getElementById("input-video-start");
    if (videoStartEl) videoStartEl.value = workingConfig.videoWish?.start || "";

    // Video file preview update
    if (workingConfig.videoWish?.file && workingConfig.videoWish.file.startsWith("data:")) {
      const videoContainer = document.getElementById("video-preview-container");
      const videoNameEl = document.getElementById("video-file-name");
      const videoPlayer = document.getElementById("video-preview-player");
      const removeVideoBtn = document.getElementById("remove-video-file-btn");

      if (videoContainer) videoContainer.style.display = "block";
      if (videoNameEl) videoNameEl.textContent = `📹 ${workingConfig.videoWish.name || 'Custom Recorded Video'}`;
      if (videoPlayer) videoPlayer.src = workingConfig.videoWish.file;
      if (removeVideoBtn) removeVideoBtn.style.display = "inline-flex";
    }

    renderLetterInputs();
    renderReasonInputs();
    renderWishInputs();
    renderGalleryInputs();
    renderTimelineInputs();
  }

  // Read Inputs from DOM into workingConfig
  function harvestInputs() {
    workingConfig.name = (document.getElementById("input-name")?.value || "").trim();
    workingConfig.from = (document.getElementById("input-from")?.value || "").trim() || "your friends who adore you";
    workingConfig.eventType = document.getElementById("input-event-type")?.value || "birthday";

    const passInputVal = (document.getElementById("input-passcode")?.value || "").trim();
    const passcodeVal = passInputVal || "1234";
    workingConfig.passcode = { code: passcodeVal };
    workingConfig.pass_code = passcodeVal;

    const bdateVal = document.getElementById("input-birthdate")?.value;
    if (bdateVal) {
      const parts = bdateVal.split("-");
      if (parts.length === 3) {
        workingConfig.birthDate = {
          year: parseInt(parts[0]),
          month: parseInt(parts[1]),
          day: parseInt(parts[2])
        };
      }
    }

    workingConfig.cakeFlavor = document.getElementById("input-cake-flavor")?.value || "default";
    workingConfig.letterTheme = document.getElementById("input-letter-theme")?.value || "default";
    workingConfig.letterFont = document.getElementById("input-letter-font")?.value || "default";
    workingConfig.memory = (document.getElementById("input-memory")?.value || "").trim();

    // Harvest letter lines
    const letterInputs = document.querySelectorAll(".letter-line-input");
    if (letterInputs.length > 0) {
      workingConfig.letterLines = Array.from(letterInputs).map(textarea => textarea.value.trim()).filter(Boolean);
    }

    // Harvest reasons
    const reasonGroups = document.querySelectorAll("#reasons-inputs-container .editor-item-group");
    workingConfig.reasons = Array.from(reasonGroups).map(g => ({
      icon: g.querySelector(".reason-icon")?.value?.trim() || "⭐",
      title: g.querySelector(".reason-title")?.value?.trim() || "",
      desc: g.querySelector(".reason-desc")?.value?.trim() || ""
    }));

    // Harvest wishes
    const wishInputs = document.querySelectorAll("#wishes-inputs-container .wish-text-input");
    workingConfig.wishes = Array.from(wishInputs).map(t => t.value.trim()).filter(Boolean);

    // Harvest gallery
    const galleryGroups = document.querySelectorAll("#gallery-inputs-container .editor-item-group");
    workingConfig.gallery = Array.from(galleryGroups).map((g, i) => {
      const existing = workingConfig.gallery[i] || {};
      const urlVal = g.querySelector(".gallery-url-input")?.value?.trim();
      return {
        image: urlVal || existing.image || "",
        emoji: g.querySelector(".gallery-emoji")?.value?.trim() || "🎈",
        cap: g.querySelector(".gallery-cap")?.value?.trim() || "",
        secretNote: g.querySelector(".gallery-note")?.value?.trim() || ""
      };
    });

    // Harvest timeline
    const timelineGroups = document.querySelectorAll("#timeline-inputs-container .editor-item-group");
    workingConfig.timeline = Array.from(timelineGroups).map(g => ({
      year: g.querySelector(".timeline-year")?.value?.trim() || "",
      icon: g.querySelector(".timeline-icon")?.value?.trim() || "✨",
      title: g.querySelector(".timeline-title")?.value?.trim() || "",
      text: g.querySelector(".timeline-text")?.value?.trim() || ""
    }));

    // Harvest gift
    workingConfig.gift = {
      message: (document.getElementById("input-gift-message")?.value || "").trim(),
      coupon: (document.getElementById("input-gift-coupon")?.value || "").trim()
    };

    // Harvest music & video
    const musicUrl = (document.getElementById("input-music-url")?.value || "").trim();
    const musicStart = (document.getElementById("input-music-start")?.value || "").trim();
    if (musicUrl) {
      workingConfig.music = { file: musicUrl, url: musicUrl, start: musicStart };
    } else if (!workingConfig.music?.file) {
      workingConfig.music = { file: null, url: null, start: musicStart };
    }

    const videoUrl = (document.getElementById("input-video-url")?.value || "").trim();
    const videoStart = (document.getElementById("input-video-start")?.value || "").trim();
    if (videoUrl) {
      workingConfig.videoWish = { file: videoUrl, url: videoUrl, start: videoStart };
    } else if (!workingConfig.videoWish?.file) {
      workingConfig.videoWish = { file: null, url: null, start: videoStart };
    }
  }

  // Load Existing Remote Wish for Editing
  async function loadRemoteWish(id) {
    showToast("⏳ Loading wish details from database...");
    try {
      if (window.SupabaseModule) {
        const client = window.SupabaseModule.getClient();
        if (client) {
          const { data, error } = await client.from("wishes").select("*").eq("id", id).single();
          if (!error && data) {
            workingConfig.name = data.recipient_name || "";
            workingConfig.from = data.sender_name || "your friends who adore you";
            workingConfig.pass_code = data.pass_code || "1234";
            workingConfig.passcode = { code: data.pass_code || "1234" };
            workingConfig.eventType = data.event_type || "birthday";

            if (data.birth_date) workingConfig.birthDate = data.birth_date;
            if (Array.isArray(data.letter_lines)) workingConfig.letterLines = data.letter_lines;
            if (data.memory_text) workingConfig.memory = data.memory_text;
            if (Array.isArray(data.reasons_json)) workingConfig.reasons = data.reasons_json;
            if (Array.isArray(data.wishes_json)) workingConfig.wishes = data.wishes_json;
            if (Array.isArray(data.gallery_json)) workingConfig.gallery = data.gallery_json;
            if (Array.isArray(data.timeline_json)) workingConfig.timeline = data.timeline_json;
            if (data.gift_json) workingConfig.gift = data.gift_json;

            workingConfig.music = { file: data.music_url, url: data.music_url };
            workingConfig.videoWish = { file: data.video_url, url: data.video_url };
            workingConfig.cakeFlavor = data.cake_flavor || "default";
            workingConfig.letterFont = data.letter_font || "default";
            workingConfig.letterTheme = data.letter_theme || "default";

            populateFormFields();
            showToast("✨ Remote wish loaded successfully!");
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Remote wish load exception:", e);
    }
    populateFormFields();
  }

  // Save Record to Supabase
  async function saveWishRecord(options = {}) {
    const isSilent = options && options.isSilent;
    harvestInputs();

    const passCodeToSave = workingConfig.pass_code || "1234";
    if (!/^\d{4}$/.test(passCodeToSave)) {
      if (!isSilent) showToast("⚠️ Access Passcode must be exactly 4 numeric digits! (e.g. 1234)");
      return null;
    }

    if (!isSilent) showToast("⏳ Saving wish to database...");

    const payload = {
      recipient_name: workingConfig.name || "",
      sender_name: workingConfig.from || "your friends who adore you",
      event_type: workingConfig.eventType || "birthday",
      pass_code: passCodeToSave,
      status: "published",
      birth_date: workingConfig.birthDate || { year: 2001, month: 1, day: 1 },
      letter_lines: (workingConfig.letterLines && workingConfig.letterLines.length > 0) ? workingConfig.letterLines : (getClassicTemplate().letterLines || []),
      memory_text: workingConfig.memory || getClassicTemplate().memory || "",
      reasons_json: (workingConfig.reasons && workingConfig.reasons.length > 0) ? workingConfig.reasons : (getClassicTemplate().reasons || []),
      wishes_json: (workingConfig.wishes && workingConfig.wishes.length > 0) ? workingConfig.wishes : (getClassicTemplate().wishes || []),
      gallery_json: (workingConfig.gallery && workingConfig.gallery.length > 0) ? workingConfig.gallery : (getClassicTemplate().gallery || []),
      timeline_json: (workingConfig.timeline && workingConfig.timeline.length > 0) ? workingConfig.timeline : (getClassicTemplate().timeline || []),
      gift_json: workingConfig.gift || getClassicTemplate().gift || {},
      music_url: workingConfig.music?.url || workingConfig.music?.file || null,
      video_url: workingConfig.videoWish?.url || workingConfig.videoWish?.file || null,
      cake_flavor: workingConfig.cakeFlavor || "default",
      letter_font: workingConfig.letterFont || "default",
      letter_theme: workingConfig.letterTheme || "default",
      updated_at: new Date().toISOString()
    };

    try {
      if (window.SupabaseModule) {
        const client = window.SupabaseModule.getClient();
        if (client) {
          let res;
          if (isEditMode && currentWishId) {
            res = await client.from("wishes").update(payload).eq("id", currentWishId).select("id");
          } else {
            payload.created_at = new Date().toISOString();
            res = await client.from("wishes").insert([payload]).select("id");
          }

          if (res.error) {
            if (!isSilent) showToast(`❌ Database Error: ${res.error.message}`);
            return null;
          }

          if (res.data && res.data[0] && res.data[0].id) {
            currentWishId = res.data[0].id;
            isEditMode = true;
          }
        }
      }
    } catch (err) {
      console.error("Save exception:", err);
      if (!isSilent) showToast("❌ Save Error!");
      return null;
    }

    if (!isSilent) showToast("🎉 Wish saved and applied successfully!");

    return currentWishId;
  }

  // Bind Buttons & Events
  function bindEditorEvents() {
    initAccordion();
    populateEventTypes();
    initPasscodeValidation();

    // Add buttons
    document.getElementById("add-reason-btn")?.addEventListener("click", () => {
      harvestInputs();
      workingConfig.reasons.push({ icon: "⭐", title: "New Reason", desc: "Write description..." });
      renderReasonInputs();
    });

    document.getElementById("add-wish-btn")?.addEventListener("click", () => {
      harvestInputs();
      workingConfig.wishes.push("May all your dreams come true today! ✨");
      renderWishInputs();
    });

    document.getElementById("add-gallery-btn")?.addEventListener("click", () => {
      harvestInputs();
      workingConfig.gallery.push({ emoji: "📸", cap: "Happy Memory", image: "", secretNote: "" });
      renderGalleryInputs();
    });

    document.getElementById("add-timeline-btn")?.addEventListener("click", () => {
      harvestInputs();
      workingConfig.timeline.push({ year: "2026", icon: "✨", title: "New Milestone", text: "Special memory..." });
      renderTimelineInputs();
    });

    // Audio file upload listener
    const audioInput = document.getElementById("input-audio-file");
    if (audioInput) {
      audioInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        showToast("⏳ Reading audio file...");
        const reader = new FileReader();
        reader.onload = (evt) => {
          const dataUrl = evt.target.result;
          workingConfig.music = { file: dataUrl, url: dataUrl, name: file.name };

          const container = document.getElementById("audio-preview-container");
          const nameEl = document.getElementById("audio-file-name");
          const player = document.getElementById("audio-preview-player");
          const removeBtn = document.getElementById("remove-audio-file-btn");

          if (container) container.style.display = "block";
          if (nameEl) nameEl.textContent = `🎙️ ${file.name}`;
          if (player) player.src = dataUrl;
          if (removeBtn) removeBtn.style.display = "inline-flex";

          showToast("🎙️ Audio file loaded!");
        };
        reader.readAsDataURL(file);
      });
    }

    // Remove audio listener
    document.getElementById("remove-audio-file-btn")?.addEventListener("click", () => {
      workingConfig.music = { file: null, url: null, name: "" };
      const container = document.getElementById("audio-preview-container");
      const player = document.getElementById("audio-preview-player");
      const removeBtn = document.getElementById("remove-audio-file-btn");
      const audioInput = document.getElementById("input-audio-file");

      if (container) container.style.display = "none";
      if (player) player.src = "";
      if (removeBtn) removeBtn.style.display = "none";
      if (audioInput) audioInput.value = "";
      showToast("🗑️ Audio file removed!");
    });

    // Video file upload listener
    const videoInput = document.getElementById("input-video-file");
    if (videoInput) {
      videoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        showToast("⏳ Reading video file...");
        const reader = new FileReader();
        reader.onload = (evt) => {
          const dataUrl = evt.target.result;
          workingConfig.videoWish = { file: dataUrl, url: dataUrl, name: file.name };

          const container = document.getElementById("video-preview-container");
          const nameEl = document.getElementById("video-file-name");
          const player = document.getElementById("video-preview-player");
          const removeBtn = document.getElementById("remove-video-file-btn");

          if (container) container.style.display = "block";
          if (nameEl) nameEl.textContent = `📹 ${file.name}`;
          if (player) player.src = dataUrl;
          if (removeBtn) removeBtn.style.display = "inline-flex";

          showToast("📹 Video file loaded!");
        };
        reader.readAsDataURL(file);
      });
    }

    // Remove video listener
    document.getElementById("remove-video-file-btn")?.addEventListener("click", () => {
      workingConfig.videoWish = { file: null, url: null, name: "" };
      const container = document.getElementById("video-preview-container");
      const player = document.getElementById("video-preview-player");
      const removeBtn = document.getElementById("remove-video-file-btn");
      const videoInput = document.getElementById("input-video-file");

      if (container) container.style.display = "none";
      if (player) player.src = "";
      if (removeBtn) removeBtn.style.display = "none";
      if (videoInput) videoInput.value = "";
      showToast("🗑️ Video file removed!");
    });

    // Save buttons
    document.getElementById("customizer-save-btn")?.addEventListener("click", () => saveWishRecord());
    document.getElementById("top-save-btn")?.addEventListener("click", () => saveWishRecord());

    // Preview Button (Auto-saves draft if unsaved, then opens preview)
    document.getElementById("btn-preview-wish")?.addEventListener("click", async () => {
      harvestInputs();
      sessionStorage.setItem("preview_wish_config", JSON.stringify(workingConfig));

      if (currentWishId) {
        saveWishRecord({ isSilent: true });
        window.open(`index.html?w=${currentWishId}`, "_blank");
      } else {
        showToast("⏳ Opening preview...");
        const savedId = await saveWishRecord({ isSilent: true });
        if (savedId) {
          window.open(`index.html?w=${savedId}`, "_blank");
        } else {
          window.open(`index.html?preview=1`, "_blank");
        }
      }
    });

    // Share button
    document.getElementById("customizer-share-link-btn")?.addEventListener("click", () => {
      harvestInputs();
      const targetId = currentWishId || "preview";
      const fullUrl = `${location.origin}/?w=${targetId}`;
      navigator.clipboard.writeText(fullUrl).then(() => {
        showToast("📋 Shareable Link copied to clipboard!");
      }).catch(() => {
        showToast(`Link: ${fullUrl}`);
      });
    });

    // Restore Default Messages button
    document.getElementById("reset-default-messages-btn")?.addEventListener("click", () => {
      if (confirm("Restore all text, reasons, wishes & timeline back to default template messages?")) {
        const defaults = JSON.parse(JSON.stringify(getClassicTemplate()));
        workingConfig = Object.assign({}, defaults);
        populateFormFields();
        showToast("🔄 All messages restored to original defaults!");
      }
    });

    // Reset Section Buttons
    document.querySelectorAll(".reset-section-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const sec = btn.dataset.reset;
        const defaults = JSON.parse(JSON.stringify(getClassicTemplate()));
        if (sec && defaults[sec] !== undefined) {
          workingConfig[sec] = defaults[sec];
          populateFormFields();
          showToast(`🔄 Section '${sec}' restored to defaults!`);
        }
      });
    });

    // Back button
    document.getElementById("btn-back-dashboard")?.addEventListener("click", () => {
      if (document.referrer && (document.referrer.includes("admin.html") || document.referrer.includes("dashboard.html"))) {
        window.location.href = document.referrer;
      } else {
        window.location.href = "admin.html";
      }
    });
  }

  // Initialize Page
  document.addEventListener("DOMContentLoaded", () => {
    bindEditorEvents();

    const urlParams = new URLSearchParams(window.location.search);
    const wishId = urlParams.get("id");

    const pageTitle = document.getElementById("page-title");
    const pageSubtitle = document.getElementById("page-subtitle");

    if (wishId) {
      currentWishId = wishId;
      isEditMode = true;
      if (pageTitle) pageTitle.textContent = "✏️ Edit Wish Record";
      if (pageSubtitle) pageSubtitle.textContent = `Full customizer — wish ID: ${wishId}`;
      loadRemoteWish(wishId);
    } else {
      isEditMode = false;
      if (pageTitle) pageTitle.textContent = "✨ Customize New Birthday Wish";
      if (pageSubtitle) pageSubtitle.textContent = "Full-featured editor — pre-filled with default templates";
      populateFormFields();
    }
  });

})(window);
