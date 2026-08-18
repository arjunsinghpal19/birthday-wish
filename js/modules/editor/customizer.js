// ============================================================
// CUSTOMIZER CORE / STATE-SYNC MODULE
// Location: js/modules/editor/customizer.js
//
// Owns:
// - Customizer lifecycle (open, close, toggle, backdrop handlers)
// - Form DOM ↔ CONFIG serialization & synchronization
// - Editor field population on Customizer open
// - Form value reading & partial section re-rendering
// - Section resets & pristine fresh wish creation
// - Unsaved-changes detection & save/share guards
// - Editor live input event listeners
//
// Does NOT own:
// - Admin Security (admin.js / admin.html / css/admin.css)
// - Database implementation (database.js)
// - Supabase Storage implementation (storage.js)
// - Audio implementation (AudioStorage, MusicEngine, app.js seekbars)
// - Video implementation (video.js)
// - Sub-editor input generators (letter.js, reasons.js, wishes.js, gallery.js, timeline.js, datepicker.js)
// ============================================================

(function (root) {
  "use strict";

  // Helper: Retrieve global CONFIG or window.CONFIG safely
  function getConfig() {
    return typeof CONFIG !== "undefined" ? CONFIG : root.CONFIG || {};
  }

  // ============================================================
  // 1. DOM → CONFIG SYNCHRONIZATION
  // ============================================================

  /**
   * Serializes active Customizer DOM input fields into the global CONFIG object.
   */
  function syncDOMToConfig() {
    const cfg = getConfig();

    // 1. Basic / Main Form Fields
    const nameEl = document.getElementById("input-name");
    if (nameEl) {
      const formatFn = root.formatName || ((n) => n);
      const rawName = nameEl.value.trim();
      cfg.name = rawName ? formatFn(rawName) : "";
      if (cfg.passcode) {
        const passEl = document.getElementById("input-passcode");
        cfg.passcode.code = cfg.name ? (passEl ? passEl.value.trim() : "1234") : "1234";
      }
    }

    const fromEl = document.getElementById("input-from");
    if (fromEl) cfg.from = fromEl.value;

    const memEl = document.getElementById("input-memory");
    if (memEl) cfg.memory = memEl.value;

    const gMsgEl = document.getElementById("input-gift-message");
    const gCpnEl = document.getElementById("input-gift-coupon");
    if (gMsgEl || gCpnEl) {
      cfg.gift = {
        message: gMsgEl ? gMsgEl.value : (cfg.gift?.message || ""),
        coupon: gCpnEl ? gCpnEl.value : (cfg.gift?.coupon || "")
      };
    }

    const musUrlEl = document.getElementById("input-music-url");
    const musStartEl = document.getElementById("input-music-start");
    if (musUrlEl && musUrlEl.value.trim()) {
      cfg.music = cfg.music || {};
      cfg.music.file = musUrlEl.value.trim();
      if (musStartEl) cfg.music.startTime = musStartEl.value.trim();
    } else if (musStartEl && cfg.music) {
      cfg.music.startTime = musStartEl.value.trim();
    }

    const vidUrlEl = document.getElementById("input-video-url");
    const vidStartEl = document.getElementById("input-video-start");
    if (vidUrlEl || vidStartEl) {
      cfg.videoWish = cfg.videoWish || {};
      if (vidUrlEl && vidUrlEl.value.trim()) cfg.videoWish.url = vidUrlEl.value.trim();
      if (vidStartEl) cfg.videoWish.startTime = vidStartEl.value.trim();
    }

    // 2. Letter Lines
    if (typeof root.syncLetterInputsToConfig === "function") {
      root.syncLetterInputsToConfig();
    } else if (typeof syncLetterInputsToConfig === "function") {
      syncLetterInputsToConfig();
    } else {
      const letterInputs = document.querySelectorAll(".letter-line-input");
      if (letterInputs.length > 0) {
        letterInputs.forEach((input, i) => {
          if (cfg.letterLines && cfg.letterLines[i] !== undefined) {
            cfg.letterLines[i] = input.value;
          }
        });
      }
    }

    // 3. Reasons
    if (typeof root.syncReasonInputsToConfig === "function") {
      root.syncReasonInputsToConfig();
    } else if (typeof syncReasonInputsToConfig === "function") {
      syncReasonInputsToConfig();
    } else {
      const reasonIcons = document.querySelectorAll(".reason-icon");
      const reasonTitles = document.querySelectorAll(".reason-title");
      const reasonTexts = document.querySelectorAll(".reason-text");
      if (reasonIcons.length > 0) {
        reasonIcons.forEach((el, i) => {
          if (!cfg.reasons[i]) {
            cfg.reasons[i] = { icon: "💫", title: "", text: "" };
          }
          cfg.reasons[i].icon = el.value;
          if (reasonTitles[i]) cfg.reasons[i].title = reasonTitles[i].value;
          if (reasonTexts[i]) cfg.reasons[i].text = reasonTexts[i].value;
        });
      }
    }

    // 4. Wishes
    if (typeof root.syncWishInputsToConfig === "function") {
      root.syncWishInputsToConfig();
    } else if (typeof syncWishInputsToConfig === "function") {
      syncWishInputsToConfig();
    } else {
      const wishInputs = document.querySelectorAll(".wish-input");
      if (wishInputs.length > 0) {
        wishInputs.forEach((el, i) => {
          cfg.wishes[i] = el.value;
        });
      }
    }

    // 5. Gallery
    if (typeof root.syncGalleryInputsToConfig === "function") {
      root.syncGalleryInputsToConfig();
    } else if (typeof syncGalleryInputsToConfig === "function") {
      syncGalleryInputsToConfig();
    } else {
      const galleryEmojis = document.querySelectorAll(".gallery-emoji");
      const galleryCaps = document.querySelectorAll(".gallery-cap");
      const galleryNotes = document.querySelectorAll(".gallery-note");
      if (galleryEmojis.length > 0) {
        galleryEmojis.forEach((el, i) => {
          if (!cfg.gallery[i]) {
            cfg.gallery[i] = { image: null, emoji: "🎈", rot: 0, cap: "", secretNote: "" };
          }
          cfg.gallery[i].emoji = el.value;
          if (galleryCaps[i]) cfg.gallery[i].cap = galleryCaps[i].value;
          if (galleryNotes[i]) cfg.gallery[i].secretNote = galleryNotes[i].value;
        });
      }
    }

    // 6. Timeline
    if (typeof root.syncTimelineInputsToConfig === "function") {
      root.syncTimelineInputsToConfig();
    } else if (typeof syncTimelineInputsToConfig === "function") {
      syncTimelineInputsToConfig();
    } else {
      const tlIcons = document.querySelectorAll(".timeline-icon");
      const tlDates = document.querySelectorAll(".timeline-date");
      const tlTitles = document.querySelectorAll(".timeline-title");
      const tlTexts = document.querySelectorAll(".timeline-text");
      if (tlIcons.length > 0) {
        tlIcons.forEach((el, i) => {
          if (!cfg.timeline[i]) {
            cfg.timeline[i] = { icon: "🌟", date: "", title: "", text: "" };
          }
          cfg.timeline[i].icon = el.value;
          if (tlDates[i]) cfg.timeline[i].date = tlDates[i].value;
          if (tlTitles[i]) cfg.timeline[i].title = tlTitles[i].value;
          if (tlTexts[i]) cfg.timeline[i].text = tlTexts[i].value;
        });
      }
    }
  }

  // ============================================================
  // 2. CONFIG → DOM FIELD POPULATION
  // ============================================================

  /**
   * Restores current CONFIG values into Customizer modal input elements.
   */
  function populateEditorFields() {
    const cfg = getConfig();

    if (typeof root.initWishStudioCalendar === "function") {
      root.initWishStudioCalendar();
    } else if (typeof initWishStudioCalendar === "function") {
      initWishStudioCalendar();
    }

    const bDateInput = document.getElementById("input-birthdate");
    if (bDateInput && cfg.birthDate) {
      const y = String(cfg.birthDate.year || 2001).padStart(4, "0");
      const m = String(cfg.birthDate.month || 1).padStart(2, "0");
      const d = String(cfg.birthDate.day || 1).padStart(2, "0");
      bDateInput.value = `${d}-${m}-${y}`;
      if (typeof root.syncDatePickerDisplay === "function") root.syncDatePickerDisplay();
    }

    const nameInput = document.getElementById("input-name");
    if (nameInput) nameInput.value = cfg.name || "";

    const passInput = document.getElementById("input-passcode");
    if (passInput) passInput.value = cfg.passcode?.code || "";

    const fromInput = document.getElementById("input-from");
    if (fromInput) fromInput.value = cfg.from || "";

    const memoryInput = document.getElementById("input-memory");
    if (memoryInput) memoryInput.value = cfg.memory || "";

    const giftMsgInput = document.getElementById("input-gift-message");
    if (giftMsgInput) giftMsgInput.value = cfg.gift?.message || "";

    const giftCpnInput = document.getElementById("input-gift-coupon");
    if (giftCpnInput) giftCpnInput.value = cfg.gift?.coupon || "";

    // Music
    if (cfg.music?.file) {
      const decStart = (root.MediaService && typeof root.MediaService.decodeMediaStartTime === "function")
        ? root.MediaService.decodeMediaStartTime(cfg.music.file)
        : (typeof root.decodeMediaStartTime === "function" ? root.decodeMediaStartTime(cfg.music.file) : 0);
      if (decStart > 0 && !cfg.music.startTime) {
        cfg.music.startTime = decStart;
      }
      if (root.MediaService && typeof root.MediaService.stripMediaMetadata === "function") {
        cfg.music.file = root.MediaService.stripMediaMetadata(cfg.music.file);
      } else if (typeof root.stripMediaMetadata === "function") {
        cfg.music.file = root.stripMediaMetadata(cfg.music.file);
      }
    }
    const isYTMusic = (u) => (u && typeof u === "string" && (u.includes("youtube.com/watch") || u.includes("youtube.com/shorts") || u.includes("youtu.be")));
    const musicInput = document.getElementById("input-music-url");
    if (musicInput) {
      const curFile = cfg.music?.file || "";
      musicInput.value = isYTMusic(curFile) ? curFile : "";
    }
    const musicStartInput = document.getElementById("input-music-start");
    if (musicStartInput) {
      const rawStart = cfg.music?.startTime;
      if (rawStart !== undefined && rawStart !== null && rawStart !== "") {
        const sec = (root.TimeUtils && typeof root.TimeUtils.parseTimeToSeconds === "function")
          ? root.TimeUtils.parseTimeToSeconds(rawStart)
          : (parseInt(rawStart, 10) || 0);
        musicStartInput.value = (sec > 0 && root.TimeUtils && typeof root.TimeUtils.formatSecondsToMMSS === "function")
          ? root.TimeUtils.formatSecondsToMMSS(sec)
          : (sec > 0 ? String(sec) : "");
      } else {
        musicStartInput.value = "";
      }
    }

    // Video Wish
    if (cfg.videoWish?.url) {
      const decStart = (root.MediaService && typeof root.MediaService.decodeMediaStartTime === "function")
        ? root.MediaService.decodeMediaStartTime(cfg.videoWish.url)
        : (typeof root.decodeMediaStartTime === "function" ? root.decodeMediaStartTime(cfg.videoWish.url) : 0);
      if (decStart > 0 && !cfg.videoWish.startTime) {
        cfg.videoWish.startTime = decStart;
      }
      if (root.MediaService && typeof root.MediaService.stripMediaMetadata === "function") {
        cfg.videoWish.url = root.MediaService.stripMediaMetadata(cfg.videoWish.url);
      } else if (typeof root.stripMediaMetadata === "function") {
        cfg.videoWish.url = root.stripMediaMetadata(cfg.videoWish.url);
      }
    }
    const vidUrlInput = document.getElementById("input-video-url");
    if (vidUrlInput) {
      const isYT = typeof root.isYouTubeVideoUrl === "function" ? root.isYouTubeVideoUrl : (u) => (u && (u.includes("youtube.com") || u.includes("youtu.be")));
      vidUrlInput.value = isYT(cfg.videoWish?.url) ? cfg.videoWish.url : "";
    }
    const vidStartInput = document.getElementById("input-video-start");
    if (vidStartInput) {
      const rawStart = cfg.videoWish?.startTime;
      if (rawStart !== undefined && rawStart !== null && rawStart !== "") {
        const sec = (root.TimeUtils && typeof root.TimeUtils.parseTimeToSeconds === "function")
          ? root.TimeUtils.parseTimeToSeconds(rawStart)
          : (parseInt(rawStart, 10) || 0);
        vidStartInput.value = (sec > 0 && root.TimeUtils && typeof root.TimeUtils.formatSecondsToMMSS === "function")
          ? root.TimeUtils.formatSecondsToMMSS(sec)
          : (sec > 0 ? String(sec) : "");
      } else {
        vidStartInput.value = "";
      }
    }

    const hasCustomAudio = cfg.music?.file && (
      cfg.music.isBlob ||
      (typeof cfg.music.file === "string" && (
        cfg.music.file.startsWith("blob:") ||
        cfg.music.file.includes("supabase.co") ||
        (!isYTMusic(cfg.music.file) && !cfg.music.file.includes("assets/music/happy-birthday-song.mpeg"))
      )) ||
      cfg.music.fileName
    );
    const audText = document.getElementById("audio-upload-text");
    if (audText) {
      audText.textContent = hasCustomAudio ? `🎙️ Attached: ${(cfg.music.fileName || 'Cloud Audio').substring(0, 18)}` : `🎙️ Select Audio / Voice Note`;
    }

    const audRemoveBtn = document.getElementById("remove-audio-file-btn");
    if (audRemoveBtn) {
      audRemoveBtn.style.display = hasCustomAudio ? "inline-block" : "none";
    }

    // Safely reference window-exposed audio seekbar functions
    const setupSeekbar = typeof root.setupAudioSeekbar === "function" ? root.setupAudioSeekbar : null;
    const detectAudio = typeof root.detectAudioDuration === "function" ? root.detectAudioDuration : null;
    const detectYouTubeAudio = typeof root.detectYouTubeAudioDuration === "function" ? root.detectYouTubeAudioDuration : null;

    const curAudioFile = cfg.music?.file || "";
    if (curAudioFile && !isYTMusic(curAudioFile) && !curAudioFile.includes("assets/music/happy-birthday-song.mpeg")) {
      if (cfg.music?.duration && cfg.music.duration > 0) {
        if (setupSeekbar) setupSeekbar(cfg.music.duration);
      } else if (detectAudio) {
        detectAudio(curAudioFile).then((dur) => {
          if (dur > 0 && typeof root.setupAudioSeekbar === "function") {
            root.setupAudioSeekbar(dur);
          }
        });
      }
    } else if (isYTMusic(curAudioFile)) {
      if (detectYouTubeAudio) {
        detectYouTubeAudio(curAudioFile);
      }
    } else {
      if (typeof root.setupAudioSeekbar === "function") {
        root.setupAudioSeekbar(0);
      }
    }

    const updateVidFn = root.updateVideoWishUI || (typeof updateVideoWishUI === "function" ? updateVideoWishUI : null);
    if (updateVidFn) {
      updateVidFn();
    }

    const cakeFlavorSelect = document.getElementById("input-cake-flavor");
    if (cakeFlavorSelect) cakeFlavorSelect.value = cfg.cakeFlavor || "default";
    const letterFontSelect = document.getElementById("input-letter-font");
    if (letterFontSelect) letterFontSelect.value = cfg.letterFont || "default";
    const letterThemeSelect = document.getElementById("input-letter-theme");
    if (letterThemeSelect) letterThemeSelect.value = cfg.letterTheme || "default";

    // Secret Security Question & Answer
    const secQuestInput = document.getElementById("input-secret-question");
    if (secQuestInput) secQuestInput.value = localStorage.getItem("custom_secret_question") || "What is your Secret Security Keyword?";
    const secAnsInput = document.getElementById("input-secret-answer");
    if (secAnsInput) secAnsInput.value = localStorage.getItem("custom_secret_answer") || "Arjun";

    // Dynamic section input sub-editors
    const rLetter = root.renderLetterInputs || (typeof renderLetterInputs === "function" ? renderLetterInputs : null);
    const rReason = root.renderReasonInputs || (typeof renderReasonInputs === "function" ? renderReasonInputs : null);
    const rWish = root.renderWishInputs || (typeof renderWishInputs === "function" ? renderWishInputs : null);
    const rGallery = root.renderGalleryInputs || (typeof renderGalleryInputs === "function" ? renderGalleryInputs : null);
    const rTimeline = root.renderTimelineInputs || (typeof renderTimelineInputs === "function" ? renderTimelineInputs : null);

    if (rLetter) rLetter();
    if (rReason) rReason();
    if (rWish) rWish();
    if (rGallery) rGallery();
    if (rTimeline) rTimeline();
  }

  // ============================================================
  // 3. READ / APPLY VALUES
  // ============================================================

  /**
   * Reads current values from form DOM input elements and returns raw values object.
   */
  function readAllValues() {
    const cfg = getConfig();
    const formatFn = root.formatName || ((n) => n);

    const rawName = document.getElementById("input-name")?.value.trim() || "";
    const nameVal = rawName ? formatFn(rawName) : "";

    const bDateVal = document.getElementById("input-birthdate")?.value;
    let yVal = cfg.birthDate?.year || 2001;
    let mVal = cfg.birthDate?.month || 1;
    let dVal = cfg.birthDate?.day || 1;

    if (bDateVal) {
      const parts = bDateVal.split("-");
      if (parts.length === 3) {
        let candidateY = 2001, candidateM = 1, candidateD = 1;
        if (parseInt(parts[0]) > 1000) { // YYYY-MM-DD
          candidateY = parseInt(parts[0]) || 2001;
          candidateM = parseInt(parts[1]) || 1;
          candidateD = parseInt(parts[2]) || 1;
        } else { // DD-MM-YYYY
          candidateD = parseInt(parts[0]) || 1;
          candidateM = parseInt(parts[1]) || 1;
          candidateY = parseInt(parts[2]) || 2001;
        }
        const checkValidDate = root.isValidCalendarDate || (typeof isValidCalendarDate === "function" ? isValidCalendarDate : null);
        if (checkValidDate && checkValidDate(candidateY, candidateM - 1, candidateD)) {
          yVal = candidateY;
          mVal = candidateM;
          dVal = candidateD;
        }
      }
    }

    const rawPass = document.getElementById("input-passcode")?.value.trim() || "";
    const passVal = nameVal ? (rawPass || "1234") : "1234";

    const fromVal = document.getElementById("input-from")?.value.trim() || cfg.from;
    const memoryVal = document.getElementById("input-memory")?.value.trim() || cfg.memory;
    const giftMsg = document.getElementById("input-gift-message")?.value.trim() || cfg.gift?.message || "";
    const giftCoupon = document.getElementById("input-gift-coupon")?.value.trim() || cfg.gift?.coupon || "";
    const musicInput = document.getElementById("input-music-url");
    const musicUrlVal = musicInput ? musicInput.value.trim() : "";
    const musicStartInput = document.getElementById("input-music-start");
    const musicStartVal = musicStartInput ? musicStartInput.value.trim() : "";

    const vidUrlInput = document.getElementById("input-video-url");
    const videoUrlVal = vidUrlInput ? vidUrlInput.value.trim() : "";
    const vidStartInput = document.getElementById("input-video-start");
    const videoStartVal = vidStartInput ? vidStartInput.value.trim() : "";

    // Secret Security Question & Answer
    const secQuestVal = document.getElementById("input-secret-question")?.value.trim() || "";
    const secAnsVal = document.getElementById("input-secret-answer")?.value.trim() || "";

    // Letter lines
    const letterInputs = document.querySelectorAll(".letter-line-input");
    const letterLines = [];
    if (letterInputs.length > 0) {
      letterInputs.forEach((input, i) => {
        letterLines.push(input.value.trim() || cfg.letterLines[i] || "");
      });
    } else {
      letterLines.push(...(cfg.letterLines || []));
    }

    // Reasons
    const reasonIcons = document.querySelectorAll(".reason-icon");
    const reasonTitles = document.querySelectorAll(".reason-title");
    const reasonTexts = document.querySelectorAll(".reason-text");
    const reasons = [];
    if (reasonIcons.length > 0) {
      reasonIcons.forEach((el, i) => {
        reasons.push({
          icon: el.value.trim() || cfg.reasons[i]?.icon || "💫",
          title: reasonTitles[i]?.value.trim() || cfg.reasons[i]?.title || "Special",
          text: reasonTexts[i]?.value.trim() || cfg.reasons[i]?.text || "",
        });
      });
    } else {
      reasons.push(...(cfg.reasons || []));
    }

    // Wishes
    const wishInputs = document.querySelectorAll(".wish-input");
    const wishes = [];
    if (wishInputs.length > 0) {
      wishInputs.forEach((el, i) => {
        wishes.push(el.value.trim() || cfg.wishes[i] || "");
      });
    } else {
      wishes.push(...(cfg.wishes || []));
    }

    // Gallery
    const galleryEmojis = document.querySelectorAll(".gallery-emoji");
    const galleryCaps = document.querySelectorAll(".gallery-cap");
    const galleryNotes = document.querySelectorAll(".gallery-note");
    const gallery = [];
    if (galleryEmojis.length > 0) {
      galleryEmojis.forEach((el, i) => {
        gallery.push({
          image: cfg.gallery[i]?.image || null,
          _localDraft: cfg.gallery[i]?._localDraft || null,
          emoji: el.value.trim() || cfg.gallery[i]?.emoji || "🎈",
          rot: cfg.gallery[i]?.rot || ((i % 2 === 0 ? -1 : 1) * (3 + i * 2)),
          cap: galleryCaps[i]?.value.trim() || cfg.gallery[i]?.cap || "Memory",
          secretNote: galleryNotes[i]?.value.trim() || cfg.gallery[i]?.secretNote || "",
        });
      });
    } else {
      gallery.push(...(cfg.gallery || []));
    }

    // Timeline
    const tlIcons = document.querySelectorAll(".timeline-icon");
    const tlDates = document.querySelectorAll(".timeline-date");
    const tlTitles = document.querySelectorAll(".timeline-title");
    const tlTexts = document.querySelectorAll(".timeline-text");
    const timeline = [];
    if (tlIcons.length > 0) {
      tlIcons.forEach((el, i) => {
        timeline.push({
          icon: el.value.trim() || cfg.timeline[i]?.icon || "🌟",
          date: tlDates[i]?.value.trim() || cfg.timeline[i]?.date || "",
          title: tlTitles[i]?.value.trim() || cfg.timeline[i]?.title || "",
          text: tlTexts[i]?.value.trim() || cfg.timeline[i]?.text || "",
        });
      });
    } else {
      timeline.push(...(cfg.timeline || []));
    }

    const cakeFlavor = document.getElementById("input-cake-flavor")?.value || "default";
    const letterFont = document.getElementById("input-letter-font")?.value || "default";
    const letterTheme = document.getElementById("input-letter-theme")?.value || "default";

    return { nameVal, yVal, mVal, dVal, passVal, fromVal, memoryVal, giftMsg, giftCoupon, musicUrlVal, musicStartVal, videoUrlVal, videoStartVal, letterLines, reasons, wishes, gallery, timeline, cakeFlavor, letterFont, letterTheme, secQuestVal, secAnsVal };
  }

  /**
   * Applies raw values object to CONFIG and triggers smart partial re-rendering.
   */
  function applyAllValues(vals) {
    const cfg = getConfig();
    const formatFn = root.formatName || ((n) => n);
    const detectChgFn = root.detectChangedSections || (typeof detectChangedSections === "function" ? detectChangedSections : () => []);
    const renderSecFn = root.renderSections || (typeof renderSections === "function" ? renderSections : null);

    const changedSections = detectChgFn(cfg, vals);

    cfg.name = vals.nameVal;
    cfg.birthDate = { year: vals.yVal, month: vals.mVal, day: vals.dVal };
    if (!cfg.passcode) cfg.passcode = { code: "1234" };
    cfg.passcode.code = vals.nameVal ? vals.passVal : "1234";
    cfg.from = vals.fromVal;
    cfg.memory = vals.memoryVal;

    if (Array.isArray(vals.letterLines) && vals.letterLines.length > 0) {
      cfg.letterLines = vals.letterLines;
    }
    if (Array.isArray(vals.reasons) && vals.reasons.length > 0) {
      cfg.reasons = vals.reasons;
    }
    if (Array.isArray(vals.wishes) && vals.wishes.length > 0) {
      cfg.wishes = vals.wishes;
    }
    if (Array.isArray(vals.gallery) && vals.gallery.length > 0) {
      cfg.gallery = vals.gallery;
    }
    if (Array.isArray(vals.timeline) && vals.timeline.length > 0) {
      cfg.timeline = vals.timeline;
    }
    cfg.gift = {
      message: vals.giftMsg || cfg.gift?.message || "",
      coupon: vals.giftCoupon || cfg.gift?.coupon || ""
    };
    cfg.cakeFlavor = vals.cakeFlavor;
    cfg.letterFont = vals.letterFont;
    cfg.letterTheme = vals.letterTheme;
    if (vals.secQuestVal) localStorage.setItem("custom_secret_question", vals.secQuestVal);
    if (vals.secAnsVal) localStorage.setItem("custom_secret_answer", vals.secAnsVal);

    if (vals.musicUrlVal) {
      cfg.music = cfg.music || {};
      cfg.music.file = vals.musicUrlVal;
      if (vals.musicStartVal !== undefined) cfg.music.startTime = vals.musicStartVal;
    } else if (!cfg.music || !cfg.music.file) {
      cfg.music = { file: "assets/music/happy-birthday-song.mpeg", startTime: vals.musicStartVal || "" };
    } else {
      if (vals.musicStartVal !== undefined) cfg.music.startTime = vals.musicStartVal;
    }

    cfg.videoWish = cfg.videoWish || {};
    if (vals.videoUrlVal) {
      const isYT = typeof root.isYouTubeVideoUrl === "function" ? root.isYouTubeVideoUrl : (u) => (u && (u.includes("youtube.com") || u.includes("youtu.be")));
      if (isYT(vals.videoUrlVal)) {
        cfg.videoWish.url = vals.videoUrlVal;
        cfg.videoWish.file = null;
        cfg.videoWish.fileName = null;
      } else {
        cfg.videoWish.url = vals.videoUrlVal;
      }
    } else if (!cfg.videoWish.file) {
      cfg.videoWish.url = "";
    }
    if (vals.videoStartVal !== undefined) {
      cfg.videoWish.startTime = vals.videoStartVal;
    }

    // Smart Partial Rendering: only dispatch renderers for sections whose values changed
    if (changedSections.length > 0 && renderSecFn) {
      const nameVal = (vals.nameVal || "").trim();
      const displayName = nameVal ? formatFn(nameVal) : "";
      renderSecFn(changedSections, displayName);
    }
  }

  // ============================================================
  // 4. SECTION RESET & FRESH WISH
  // ============================================================

  const resetSectionRenderMap = {
    basic: ["name", "date", "share", "cake"],
    sender: ["sender"],
    letter: ["letter"],
    memory: ["memory"],
    reasons: ["reasons"],
    wishes: ["wishes"],
    gallery: ["gallery"],
    timeline: ["timeline"],
    gift: ["gift"],
    music: ["music"],
    videowish: ["video"]
  };

  /**
   * Resets a specific Customizer section to pristine default values.
   */
  function resetSection(sec) {
    const def = root.DEFAULT_CONFIG_BACKUP || window.DEFAULT_CONFIG_BACKUP;
    if (!def) return;
    const cfg = getConfig();
    const toastFn = root.showToast || ((m) => console.log(m));
    const formatFn = root.formatName || ((n) => n);
    const renderSecFn = root.renderSections || (typeof renderSections === "function" ? renderSections : null);

    switch (sec) {
      case "basic":
        cfg.name = "";
        cfg.birthDate = { year: 2001, month: 1, day: 1 };
        cfg.cakeFlavor = "default";
        if (cfg.passcode) cfg.passcode.code = "1234";
        const nInput = document.getElementById("input-name");
        if (nInput) nInput.value = "";
        const bDateInput = document.getElementById("input-birthdate");
        if (bDateInput) bDateInput.value = "01-01-2001";
        const bDateDisplay = document.getElementById("input-birthdate-display");
        if (bDateDisplay) bDateDisplay.value = "01/01/2001";
        if (typeof root.syncDatePickerDisplay === "function") root.syncDatePickerDisplay();
        const cakeSelect = document.getElementById("input-cake-flavor");
        if (cakeSelect) cakeSelect.value = "default";
        const passInput = document.getElementById("input-passcode");
        if (passInput) passInput.value = "1234";
        toastFn("Basic Info reset to defaults 👤");
        break;

      case "sender":
        cfg.from = "your friends who adore you";
        const sInput = document.getElementById("input-from");
        if (sInput) sInput.value = "your friends who adore you";
        toastFn("Sender Info reset to default 💌");
        break;

      case "letter":
        cfg.letterLines = JSON.parse(JSON.stringify(def.letterLines));
        cfg.letterFont = "default";
        cfg.letterTheme = "default";
        const fontSelect = document.getElementById("input-letter-font");
        if (fontSelect) fontSelect.value = "default";
        const themeSelect = document.getElementById("input-letter-theme");
        if (themeSelect) themeSelect.value = "default";
        if (typeof root.renderLetterInputs === "function") root.renderLetterInputs();
        root.letterTyped = true;
        window.letterTyped = true;
        if (typeof root.updateLetterBody === "function") root.updateLetterBody();
        toastFn("Birthday Letter reset to defaults 📝");
        break;

      case "memory":
        cfg.memory = def.memory;
        const memInput = document.getElementById("input-memory");
        if (memInput) memInput.value = def.memory;
        toastFn("Special Memory reset to default 💭");
        break;

      case "reasons":
        cfg.reasons = JSON.parse(JSON.stringify(def.reasons));
        if (typeof root.renderReasonInputs === "function") root.renderReasonInputs();
        toastFn("Reasons reset to defaults ⭐");
        break;

      case "wishes":
        cfg.wishes = JSON.parse(JSON.stringify(def.wishes));
        if (typeof root.renderWishInputs === "function") root.renderWishInputs();
        toastFn("Birthday Wishes reset to defaults ✨");
        break;

      case "gallery":
        cfg.gallery = JSON.parse(JSON.stringify(def.gallery));
        if (typeof root.renderGalleryInputs === "function") root.renderGalleryInputs();
        toastFn("Photo Gallery reset to default emojis 📸");
        break;

      case "timeline":
        cfg.timeline = JSON.parse(JSON.stringify(def.timeline));
        if (typeof root.renderTimelineInputs === "function") root.renderTimelineInputs();
        toastFn("Timeline reset to defaults 🕐");
        break;

      case "gift":
        cfg.gift = JSON.parse(JSON.stringify(def.gift));
        const gMsg = document.getElementById("input-gift-message");
        if (gMsg) gMsg.value = def.gift.message;
        const gCpn = document.getElementById("input-gift-coupon");
        if (gCpn) gCpn.value = def.gift.coupon;
        const updateGiftFn = root.updateGiftSection || (typeof updateGiftSection === "function" ? updateGiftSection : (typeof window.updateGiftSection === "function" ? window.updateGiftSection : null));
        if (updateGiftFn) updateGiftFn();
        toastFn("Gift Message reset to defaults 🎁");
        break;

      case "music":
        cfg.music = { file: "assets/music/happy-birthday-song.mpeg", startTime: "", duration: 0 };
        if (root.AudioStorage && typeof root.AudioStorage.removeAudio === "function") {
          root.AudioStorage.removeAudio();
        }
        const musUrl = document.getElementById("input-music-url");
        if (musUrl) musUrl.value = "";
        const musStart = document.getElementById("input-music-start");
        if (musStart) musStart.value = "";
        const audFile = document.getElementById("input-audio-file");
        if (audFile) audFile.value = "";
        const audTxt = document.getElementById("audio-upload-text");
        if (audTxt) audTxt.textContent = `🎙️ Select Audio / Voice Note`;
        const audRem = document.getElementById("remove-audio-file-btn");
        if (audRem) audRem.style.display = "none";
        const setupAudSeekbar = root.setupAudioSeekbar || (typeof setupAudioSeekbar === "function" ? setupAudioSeekbar : (typeof window.setupAudioSeekbar === "function" ? window.setupAudioSeekbar : null));
        if (setupAudSeekbar) setupAudSeekbar(0);
        if (root.MusicEngine && typeof root.MusicEngine.pause === "function") {
          root.MusicEngine.pause();
        }
        toastFn("Music reset to default melody 🎵");
        break;

      case "videowish":
        if (cfg.videoWish) {
          cfg.videoWish.url = "";
          cfg.videoWish.startTime = "";
          cfg.videoWish.file = null;
          cfg.videoWish.fileName = null;
          cfg.videoWish.duration = 0;
        }
        if (root.VideoStorage && typeof root.VideoStorage.removeVideo === "function") {
          root.VideoStorage.removeVideo();
        }
        const vidUrl = document.getElementById("input-video-url");
        if (vidUrl) vidUrl.value = "";
        const vidStart = document.getElementById("input-video-start");
        if (vidStart) vidStart.value = "";
        const vidFile = document.getElementById("input-video-file");
        if (vidFile) vidFile.value = "";
        const vidTxt = document.getElementById("video-upload-text");
        if (vidTxt) vidTxt.textContent = `📹 Select Video from Device`;
        const vidRem = document.getElementById("remove-video-file-btn");
        if (vidRem) vidRem.style.display = "none";
        const setupVidSeekbar = root.setupVideoSeekbar || (typeof setupVideoSeekbar === "function" ? setupVideoSeekbar : (typeof window.setupVideoSeekbar === "function" ? window.setupVideoSeekbar : null));
        if (setupVidSeekbar) setupVidSeekbar(0);
        const updateVidUI = root.updateVideoWishUI || (typeof updateVideoWishUI === "function" ? updateVideoWishUI : (typeof window.updateVideoWishUI === "function" ? window.updateVideoWishUI : null));
        if (updateVidUI) updateVidUI();
        toastFn("Video Wish reset 📹");
        break;
    }

    if (resetSectionRenderMap[sec] && renderSecFn) {
      const displayName = cfg.name ? formatName(cfg.name) : "";
      renderSecFn(resetSectionRenderMap[sec], displayName);
    }
  }

  /**
   * Evaluates if active editor form elements contain meaningful unsaved changes compared to default backup.
   */
  function hasUnsavedChanges() {
    const def = root.DEFAULT_CONFIG_BACKUP || window.DEFAULT_CONFIG_BACKUP;
    if (!def) return false;
    const cfg = getConfig();
    const currentVals = readAllValues();

    if (currentVals.nameVal && currentVals.nameVal.trim() !== (def.name || "").trim()) return true;
    if (currentVals.passVal && currentVals.passVal.trim() !== (def.passcode?.code || "1234").trim()) return true;
    if (currentVals.fromVal && currentVals.fromVal.trim() !== (def.from || "").trim()) return true;
    if (Array.isArray(currentVals.letterLines) && currentVals.letterLines.join("\n").trim() !== (def.letterLines || []).join("\n").trim()) return true;

    try {
      if (localStorage.getItem("custom_birthday_config")) return true;
    } catch(e) {}

    if (cfg.reasons?.length !== def.reasons?.length) return true;
    if (cfg.wishes?.length !== def.wishes?.length) return true;
    if (cfg.timeline?.length !== def.timeline?.length) return true;
    if (cfg.gallery?.length !== def.gallery?.length) return true;

    return false;
  }

  /**
   * Resets CONFIG and editor state to a completely fresh New Wish draft (0 DB calls).
   */
  function resetToFreshNewWish() {
    const def = root.DEFAULT_CONFIG_BACKUP || window.DEFAULT_CONFIG_BACKUP;
    if (!def) return;
    const cfg = getConfig();
    const formatFn = root.formatName || ((n) => n);
    const renderSecFn = root.renderSections || (typeof renderSections === "function" ? renderSections : null);
    const revokeFn = root.revokeMediaBlobUrl || (typeof revokeMediaBlobUrl === "function" ? revokeMediaBlobUrl : null);
    const toastFn = root.showToast || ((m) => console.log(m));

    // 1. Deep clone clean default backup into CONFIG
    const cleanDef = JSON.parse(JSON.stringify(def));
    Object.keys(cfg).forEach(k => delete cfg[k]);
    Object.assign(cfg, cleanDef);
    cfg._activeWishUuid = null;
    if (root.CONFIG) root.CONFIG._activeWishUuid = null;

    // 2. Clear localStorage draft keys
    try {
      localStorage.removeItem("custom_birthday_config");
      localStorage.removeItem("custom_secret_question");
      localStorage.removeItem("custom_secret_answer");
    } catch(e) {}

    // Clean URL query parameters in address bar without reload
    try {
      if (typeof window !== "undefined" && window.history && window.history.replaceState) {
        window.history.replaceState(null, "", location.pathname);
      }
    } catch(e) {}

    // 3. Clear audio/video storage & revoke media blob URLs
    if (root.AudioStorage && typeof root.AudioStorage.removeAudio === "function") {
      root.AudioStorage.removeAudio();
    }
    if (root.VideoStorage && typeof root.VideoStorage.removeVideo === "function") {
      root.VideoStorage.removeVideo();
    }
    if (revokeFn) {
      revokeFn(cfg.music?.file);
      revokeFn(cfg.videoWish?.url);
    }

    // Clear pending uploads
    if (root.pendingUploadsMap) {
      root.pendingUploadsMap.clear();
    }

    // 4. Re-render customizer fields cleanly
    populateEditorFields();

    // 5. Re-render main application DOM sections
    if (renderSecFn) {
      const displayName = cfg.name ? formatFn(cfg.name) : "";
      const allKeys = root.ALL_SECTION_KEYS || ["name", "date", "passcode", "sender", "letter", "memory", "reasons", "wishes", "gallery", "timeline", "gift", "music", "video", "cake", "share"];
      renderSecFn(allKeys, displayName);
    }

    toastFn("Started a brand new birthday wish! ✨");
  }

  // ============================================================
  // 5. SAVE / SHARE GUARDS & ITEM AUTO-FOCUS
  // ============================================================

  /**
   * Smooth scrolls and focuses newly appended items in editor sub-sections.
   */
  function focusAndScrollNewItem(container) {
    if (!container) return;
    const lastItem = container.lastElementChild;
    if (!lastItem) return;

    const sectionBody = container.closest(".editor-section-body");
    const sectionHeader = sectionBody ? sectionBody.previousElementSibling : null;
    if (sectionBody && !sectionBody.classList.contains("open")) {
      sectionBody.classList.add("open");
      if (sectionHeader) sectionHeader.classList.add("active");
    }

    lastItem.scrollIntoView({ behavior: "smooth", block: "end" });
    const editorBody = document.getElementById("editor-body");
    if (editorBody) {
      editorBody.scrollTo({ top: editorBody.scrollHeight, behavior: "smooth" });
    }

    const firstInput = lastItem.querySelector("input[type='text'], input[type='url'], textarea, input:not([type='hidden']):not([type='file'])");
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 150);
    }
  }

  /**
   * Validates date input and awaits pending media uploads before Save or Share operations.
   */
  async function handleSaveGuard() {
    const isDateValidFn = root.isCurrentBirthdateValid || (typeof isCurrentBirthdateValid === "function" ? isCurrentBirthdateValid : null);
    const toastFn = root.showToast || ((m) => console.log(m));

    if (isDateValidFn && !isDateValidFn()) {
      const bDateDisplay = document.getElementById("input-birthdate-display");
      if (bDateDisplay) {
        bDateDisplay.classList.add("input-error");

        // Expand Basic Info section if collapsed
        const basicHeader = document.querySelector('.editor-section[data-section="basic"] .editor-section-header');
        const basicBody = document.getElementById("sec-basic");
        if (basicHeader && basicBody && !basicBody.classList.contains("open")) {
          document.querySelectorAll(".editor-section-header").forEach(h => h.classList.remove("active"));
          document.querySelectorAll(".editor-section-body").forEach(b => b.classList.remove("open"));
          basicHeader.classList.add("active");
          basicBody.classList.add("open");
        }

        bDateDisplay.focus();
      }
      toastFn("Please enter a valid calendar date.");
      return false;
    }

    const pendingMap = root.pendingUploadsMap || (typeof window !== "undefined" ? window.pendingUploadsMap : null);
    if (pendingMap && pendingMap.size > 0) {
      toastFn("⏳ Uploading media files to cloud... Please wait ✨");
      try {
        await Promise.all(Array.from(pendingMap.values()));
      } catch(err){}
    }

    return true;
  }

  // ============================================================
  // 6. MASTER CUSTOMIZER LIFECYCLE & EVENT LISTENERS
  // ============================================================

  /**
   * Binds Customizer modal controls, save/share handlers, section resets, and list addition listeners.
   */
  async function initCustomizerModal() {
    const cfg = getConfig();

    if (typeof root.parseQueryParams === "function") {
      await root.parseQueryParams();
    }
    if (typeof root.checkAdminAccess === "function") {
      root.checkAdminAccess();
    }

    const backdrop = document.getElementById("customizer-modal");
    const toggleBtn = document.getElementById("customizer-toggle-btn");
    const closeBtn = document.getElementById("customizer-close-btn");
    const saveBtn = document.getElementById("customizer-save-btn");
    const shareLinkBtn = document.getElementById("customizer-share-link-btn");

    if (!backdrop || !toggleBtn) return;

    // Load saved config from localStorage ONLY for fresh creator sessions (never overwrite active public, UUID wish, or preview routes)
    const searchParams = (typeof window !== "undefined" && window.location) ? new URLSearchParams(window.location.search) : new URLSearchParams("");
    const isPreviewParam = (root.CONFIG && root.CONFIG._isPreview) || searchParams.get("preview") === "admin" || searchParams.get("preview") === "admin_session" || searchParams.get("preview") === "true";
    const hasRecipientParams =
      isPreviewParam ||
      searchParams.has("name") ||
      searchParams.has("w") ||
      searchParams.has("wish") ||
      searchParams.has("id");

    if (!hasRecipientParams && !cfg._activeWishUuid && !(root.CONFIG && root.CONFIG._activeWishUuid)) {
      const savedMod = localStorage.getItem("custom_birthday_config");
      if (savedMod) {
        try {
          const parsed = JSON.parse(savedMod);
          if (parsed && typeof parsed === "object") {
            const runtimeMusic = cfg.music;
            const runtimeVideo = cfg.videoWish;
            Object.assign(cfg, parsed);
            if (parsed._activeWishUuid) {
              cfg._activeWishUuid = parsed._activeWishUuid;
              if (root.CONFIG) root.CONFIG._activeWishUuid = parsed._activeWishUuid;
            }
            if (runtimeMusic && runtimeMusic.file && (!parsed.music || !parsed.music.file || (typeof runtimeMusic.file === "string" && runtimeMusic.file.startsWith("blob:")))) {
              cfg.music = {
                ...runtimeMusic,
                ...(parsed.music || {}),
                file: runtimeMusic.file,
                fileName: runtimeMusic.fileName || (parsed.music && parsed.music.fileName),
                isBlob: runtimeMusic.isBlob !== undefined ? runtimeMusic.isBlob : (parsed.music && parsed.music.isBlob)
              };
            }
            if (runtimeVideo && (runtimeVideo.url || runtimeVideo.file) && (!parsed.videoWish || (!parsed.videoWish.url && !parsed.videoWish.file) || (typeof runtimeVideo.file === "string" && runtimeVideo.file.startsWith("blob:")))) {
              cfg.videoWish = {
                ...runtimeVideo,
                ...(parsed.videoWish || {}),
                url: runtimeVideo.url || (parsed.videoWish && parsed.videoWish.url),
                file: runtimeVideo.file || (parsed.videoWish && parsed.videoWish.file),
                fileName: runtimeVideo.fileName || (parsed.videoWish && parsed.videoWish.fileName)
              };
            }
            if (Array.isArray(cfg.gallery)) {
              cfg.gallery.forEach(item => {
                if (typeof item.image === "string" && item.image.startsWith("blob:")) {
                  item.image = item._localDraft || null;
                }
              });
            }
          }
        } catch(e){}
      }
    }

    // Initialize the dedicated accordion controller after Customizer DOM and event bindings are ready
    const initAccFn = root.initAccordion || (typeof initAccordion === "function" ? initAccordion : null);
    if (initAccFn) {
      initAccFn();
    }

    // Attach individual section reset button listeners
    const sectionResetBtns = document.querySelectorAll(".reset-section-btn");
    sectionResetBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const sec = btn.dataset.reset;
        if (sec) resetSection(sec);
      });
    });

    // Clear Music URL / YouTube Link button
    const clearUrlBtn = document.getElementById("clear-music-url-btn");
    if (clearUrlBtn) {
      clearUrlBtn.addEventListener("click", () => {
        const urlInput = document.getElementById("input-music-url");
        if (urlInput) urlInput.value = "";

        const isYT = (u) => (u && typeof u === "string" && (u.includes("youtube.com/watch") || u.includes("youtube.com/shorts") || u.includes("youtu.be")));
        const hasDeviceAudio = !!(cfg.music && (cfg.music.isBlob || cfg.music.fileName || (typeof cfg.music.file === "string" && (cfg.music.file.startsWith("blob:") || cfg.music.file.includes("supabase.co")))) && !isYT(cfg.music.file));

        if (hasDeviceAudio) {
          // Device audio is active -> ONLY clear YouTube link input field, preserve device audio state, start time, seekbar
          const toastFn = root.showToast || ((m) => console.log(m));
          toastFn("YouTube link cleared 🎵");
        } else {
          // YouTube audio was active (or default song) -> clear YouTube state and restore default birthday song & reset seekbar
          const startInput = document.getElementById("input-music-start");
          if (startInput) startInput.value = "";
          cfg.music = { file: "assets/music/happy-birthday-song.mpeg", startTime: "", duration: 0 };
          const setupAudSeekbar = root.setupAudioSeekbar || (typeof setupAudioSeekbar === "function" ? setupAudioSeekbar : (typeof window.setupAudioSeekbar === "function" ? window.setupAudioSeekbar : null));
          if (setupAudSeekbar) setupAudSeekbar(0);
          const timeDisplay = document.getElementById("audio-selected-time-display");
          if (timeDisplay) timeDisplay.textContent = "00:00";
          if (root.MusicEngine && typeof root.MusicEngine.pause === "function") {
            root.MusicEngine.pause();
          }
          const toastFn = root.showToast || ((m) => console.log(m));
          toastFn("YouTube link & start time cleared 🎵");
        }
      });
    }

    // Add Reason Button
    const addReasonBtn = document.getElementById("add-reason-btn");
    if (addReasonBtn) {
      addReasonBtn.addEventListener("click", () => {
        syncDOMToConfig();
        cfg.reasons.push({ icon: "💫", title: "New Reason", text: "Write something special..." });
        if (typeof root.renderReasonInputs === "function") root.renderReasonInputs();
        if (typeof root.renderSections === "function") root.renderSections(["reasons"]);
        focusAndScrollNewItem(document.getElementById("reasons-inputs-container"));
      });
    }

    // Add Wish Button
    const addWishBtn = document.getElementById("add-wish-btn");
    if (addWishBtn) {
      addWishBtn.addEventListener("click", () => {
        syncDOMToConfig();
        cfg.wishes.push("Write a beautiful birthday wish...");
        if (typeof root.renderWishInputs === "function") root.renderWishInputs();
        focusAndScrollNewItem(document.getElementById("wishes-inputs-container"));
      });
    }

    // Add Gallery Button
    const addGalleryBtn = document.getElementById("add-gallery-btn");
    if (addGalleryBtn) {
      addGalleryBtn.addEventListener("click", () => {
        syncDOMToConfig();
        cfg.gallery.push({
          image: null, emoji: "🎈", rot: Math.floor(Math.random() * 12 - 6),
          cap: "New Memory", secretNote: "A special moment ❤️"
        });
        if (typeof root.renderGalleryInputs === "function") root.renderGalleryInputs();
        focusAndScrollNewItem(document.getElementById("gallery-inputs-container"));
      });
    }

    // Add Timeline Button
    const addTimelineBtn = document.getElementById("add-timeline-btn");
    if (addTimelineBtn) {
      addTimelineBtn.addEventListener("click", () => {
        syncDOMToConfig();
        cfg.timeline.push({ icon: "🌟", date: "Some time", title: "New Milestone", text: "Write about this moment..." });
        if (typeof root.renderTimelineInputs === "function") root.renderTimelineInputs();
        if (typeof root.renderSections === "function") root.renderSections(["timeline"]);
        focusAndScrollNewItem(document.getElementById("timeline-inputs-container"));
      });
    }

    // Open Customizer Modal Toggle Button
    toggleBtn.addEventListener("click", () => {
      if (typeof root.playChimeSound === "function") root.playChimeSound();
      populateEditorFields();
      backdrop.classList.add("active");
      
      const openAccFn = root.openAccordionSection || (typeof openAccordionSection === "function" ? openAccordionSection : null);
      if (openAccFn) {
        openAccFn("basic");
      } else {
        const headers = document.querySelectorAll(".editor-section-header");
        const bodies = document.querySelectorAll(".editor-section-body");
        headers.forEach(h => h.classList.remove("active"));
        bodies.forEach(b => b.classList.remove("open"));
        if (headers[0]) headers[0].classList.add("active");
        if (bodies[0]) bodies[0].classList.add("open");
      }
    });

    closeBtn.addEventListener("click", () => {
      backdrop.classList.remove("active");
    });

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.classList.remove("active");
    });

    // Save & Apply Button
    saveBtn.addEventListener("click", async () => {
      if (!(await handleSaveGuard())) return;

      const values = readAllValues();
      applyAllValues(values);

      // Save to localStorage
      const saveData = JSON.parse(JSON.stringify(cfg));
      if (cfg._activeWishUuid) {
        saveData._activeWishUuid = cfg._activeWishUuid;
      }
      if (saveData.music && typeof saveData.music.file === "string" && saveData.music.file.startsWith("blob:")) {
        saveData.music.file = "";
      }
      if (saveData.videoWish) {
        if (typeof saveData.videoWish.file === "string" && saveData.videoWish.file.startsWith("blob:")) {
          saveData.videoWish.file = "";
        }
        if (typeof saveData.videoWish.url === "string" && saveData.videoWish.url.startsWith("blob:")) {
          saveData.videoWish.url = "";
        }
      }
      if (Array.isArray(saveData.gallery)) {
        saveData.gallery.forEach(item => {
          if (typeof item.image === "string" && item.image.startsWith("blob:")) {
            item.image = item._localDraft || null;
          }
          delete item._localDraft;
        });
      }
      localStorage.setItem("custom_birthday_config", JSON.stringify(saveData));

      if (typeof root.updateShareSection === "function") {
        await root.updateShareSection();
      }

      backdrop.classList.remove("active");
      if (typeof root.playChimeSound === "function") root.playChimeSound();
      const toastFn = root.showToast || ((m) => console.log(m));
      const formatFn = root.formatName || ((n) => n);
      toastFn(cfg.name ? `Wish updated for ${formatFn(cfg.name)}! ✨` : "Wish updated with defaults ✨");
    });

    // Share Link Button
    if (shareLinkBtn) {
      shareLinkBtn.addEventListener("click", async () => {
        if (!(await handleSaveGuard())) return;

        const values = readAllValues();
        applyAllValues(values);
        if (typeof root.updateShareSection === "function") {
          await root.updateShareSection();
        }

        const buildUrlFn = root.buildRecipientShareUrl || (typeof buildRecipientShareUrl === "function" ? buildRecipientShareUrl : async () => window.location.href);
        const customUrl = await buildUrlFn(values.nameVal, { persist: true });
        const toastFn = root.showToast || ((m) => console.log(m));

        if (!customUrl) {
          toastFn("⚠️ Unable to sync wish to cloud. Please check connection and try again.");
          return;
        }

        const match = customUrl.match(/[?&]w=([a-f0-9-]{20,})/i);
        if (match) {
          cfg._activeWishUuid = match[1];
          if (root.CONFIG) root.CONFIG._activeWishUuid = match[1];
        }
        const recipientName = values.nameVal || "Friend";

        // Visual Button Feedback
        const origHTML = shareLinkBtn.innerHTML;
        shareLinkBtn.innerHTML = "✅ Link Copied!";
        shareLinkBtn.style.borderColor = "#2ecc71";
        shareLinkBtn.style.color = "#2ecc71";
        shareLinkBtn.style.boxShadow = "0 0 12px rgba(46,204,113,0.5)";

        setTimeout(() => {
          shareLinkBtn.innerHTML = origHTML;
          shareLinkBtn.style.borderColor = "";
          shareLinkBtn.style.color = "";
          shareLinkBtn.style.boxShadow = "";
        }, 2500);

        // Clipboard copy
        try {
          await navigator.clipboard.writeText(customUrl);
          toastFn("📋 Wish Link copied to clipboard!");
        } catch(e) {
          toastFn(`Link: ${customUrl}`);
        }

        // Expand Inline Share Bar inside Customizer Footer
        const inlineShare = document.getElementById("inline-share-options");
        if (inlineShare) {
          inlineShare.style.display = "block";

          const closeBtn = document.getElementById("close-inline-share-btn");
          if (closeBtn) closeBtn.onclick = () => { inlineShare.style.display = "none"; };

          // WhatsApp Share
          const waBtn = document.getElementById("share-whatsapp-btn");
          if (waBtn) {
            waBtn.onclick = async () => {
              const currentUrl = await buildUrlFn(values.nameVal, { persist: true });
              if (!currentUrl) {
                toastFn("⚠️ Unable to sync wish to cloud. Please try again.");
                return;
              }
              const trimmedName = (recipientName || "").trim();
              let greetingHeader = "Hey! 🎂✨";
              if (trimmedName && trimmedName !== "Friend") {
                greetingHeader = `Hey ${trimmedName}! 🎂✨`;
              }

              const msg = `${greetingHeader}\n\nMaine tumhare liye ek special Birthday Surprise banaya hai! 🎁💖\n\nKhol kar dekho 🎁:\n${currentUrl}`;
              const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
              window.open(waUrl, "_blank");
            };
          }

          // Native System Share
          const nativeBtn = document.getElementById("share-native-btn");
          if (nativeBtn) {
            nativeBtn.onclick = async () => {
              const currentUrl = await buildUrlFn(values.nameVal, { persist: true });
              if (!currentUrl) {
                toastFn("⚠️ Unable to sync wish to cloud. Please try again.");
                return;
              }
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: `Birthday Wish for ${recipientName}`,
                    text: `🎉 Surprise Birthday Wish for ${recipientName}! Click link to open:`,
                    url: currentUrl
                  });
                } catch(e) {}
              } else {
                toastFn("📋 Link copied! Paste anywhere to share.");
              }
            };
          }
        }
      });
    }

    // New Wish Button Handlers
    const newWishBtn = document.getElementById("new-wish-btn");
    const newWishModal = document.getElementById("new-wish-confirm-modal");
    const btnNewWishConfirm = document.getElementById("btn-new-wish-confirm");
    const btnNewWishCancel = document.getElementById("btn-new-wish-cancel");

    if (newWishBtn) {
      newWishBtn.addEventListener("click", () => {
        if (hasUnsavedChanges()) {
          if (newWishModal) {
            newWishModal.style.display = "flex";
            newWishModal.classList.add("open");
          }
        } else {
          resetToFreshNewWish();
        }
      });
    }

    if (btnNewWishCancel && newWishModal) {
      btnNewWishCancel.addEventListener("click", () => {
        newWishModal.classList.remove("open");
        newWishModal.style.display = "none";
      });
    }

    if (btnNewWishConfirm && newWishModal) {
      btnNewWishConfirm.addEventListener("click", () => {
        newWishModal.classList.remove("open");
        newWishModal.style.display = "none";
        resetToFreshNewWish();
      });
    }

    if (newWishModal) {
      newWishModal.addEventListener("click", (e) => {
        if (e.target === newWishModal) {
          newWishModal.classList.remove("open");
          newWishModal.style.display = "none";
        }
      });
    }

    // Restore All Default Messages button in header
    const resetMsgsBtn = document.getElementById("reset-default-messages-btn");
    if (resetMsgsBtn) {
      resetMsgsBtn.addEventListener("click", () => {
        const allSections = ["basic", "sender", "letter", "memory", "reasons", "wishes", "gallery", "timeline", "gift", "music", "videowish"];
        allSections.forEach(s => resetSection(s));
        const renderSecFn = root.renderSections || (typeof renderSections === "function" ? renderSections : null);
        const formatFn = root.formatName || ((n) => n);
        const toastFn = root.showToast || ((m) => console.log(m));
        if (renderSecFn) {
          const displayName = cfg.name ? formatFn(cfg.name) : "";
          const allKeys = root.ALL_SECTION_KEYS || ["name", "date", "passcode", "sender", "letter", "memory", "reasons", "wishes", "gallery", "timeline", "gift", "music", "video", "cake", "share"];
          renderSecFn(allKeys, displayName);
        }
        toastFn("Entire Wish reset to defaults! ✨");
      });
    }

    // Relationship Preset Style in Quick Editor
    function applyQuickRelationshipPreset(relKey, lang = "en", isManualClick = false) {
      const toastFn = root.showToast || ((m) => console.log(m));

      if (!relKey) {
        if (isManualClick) toastFn("Please select a relationship template! ⚠️");
        return;
      }

      if (!root.RelationshipPresets || typeof root.RelationshipPresets.getPreset !== "function") {
        console.warn("⚠️ RelationshipPresets module unavailable");
        return;
      }

      const preset = root.RelationshipPresets.getPreset(relKey, lang);
      if (!preset) {
        if (isManualClick) toastFn("Relationship preset not found! ⚠️");
        return;
      }

      // Apply preset content preserving basic info, uploaded photos, audio & video
      if (preset.letterLines) cfg.letterLines = JSON.parse(JSON.stringify(preset.letterLines));
      if (preset.memory) cfg.memory = preset.memory;
      if (preset.reasons) cfg.reasons = JSON.parse(JSON.stringify(preset.reasons));
      if (preset.wishes) cfg.wishes = JSON.parse(JSON.stringify(preset.wishes));
      if (preset.gift) {
        cfg.gift = {
          message: preset.gift.message || cfg.gift?.message || "",
          coupon: preset.gift.coupon || cfg.gift?.coupon || ""
        };
      }
      if (Array.isArray(preset.timeline)) {
        cfg.timeline = JSON.parse(JSON.stringify(preset.timeline));
      }
      if (Array.isArray(preset.gallery) && Array.isArray(cfg.gallery)) {
        cfg.gallery.forEach((g, idx) => {
          const pG = preset.gallery[idx];
          if (pG) {
            g.emoji = pG.emoji || g.emoji;
            g.cap = pG.cap || g.cap;
            g.secretNote = pG.secretNote || g.secretNote;
          }
        });
      }

      populateEditorFields();

      const renderSecFn = root.renderSections || (typeof renderSections === "function" ? renderSections : null);
      if (renderSecFn) {
        const formatFn = root.formatName || ((n) => n);
        const displayName = cfg.name ? formatFn(cfg.name) : "";
        renderSecFn(["letter", "memory", "reasons", "wishes", "gallery", "timeline", "gift"], displayName);
      }

      toastFn(`Applied ${preset.label} style! ✨`);
    }

    // Direct change on Relationship Template dropdown
    const quickRelSelect = document.getElementById("input-relationship-preset");
    if (quickRelSelect) {
      quickRelSelect.addEventListener("change", () => {
        const langSelect = document.getElementById("input-relationship-lang");
        const lang = langSelect?.value || "en";
        applyQuickRelationshipPreset(quickRelSelect.value, lang, false);
      });
    }

    // Direct change on Language / Tone dropdown
    const quickRelLangSelect = document.getElementById("input-relationship-lang");
    if (quickRelLangSelect) {
      quickRelLangSelect.addEventListener("change", () => {
        const relVal = quickRelSelect?.value;
        if (relVal) {
          applyQuickRelationshipPreset(relVal, quickRelLangSelect.value, false);
        }
      });
    }

    // Explicit Apply Button click
    const applyQuickRelBtn = document.getElementById("btn-apply-quick-relationship");
    if (applyQuickRelBtn) {
      applyQuickRelBtn.addEventListener("click", () => {
        const relKey = quickRelSelect?.value;
        const lang = quickRelLangSelect?.value || "en";
        applyQuickRelationshipPreset(relKey, lang, true);
      });
    }

    // Reset Relationship Style in Quick Editor
    const resetQuickRelBtn = document.getElementById("btn-reset-quick-relationship");
    if (resetQuickRelBtn) {
      resetQuickRelBtn.addEventListener("click", () => {
        const toastFn = root.showToast || ((m) => console.log(m));
        const wishDefaults = root.WishDefaults || (typeof WishDefaults !== "undefined" ? WishDefaults : null);

        if (wishDefaults && typeof wishDefaults.getSectionDefault === "function") {
          cfg.letterLines = JSON.parse(JSON.stringify(wishDefaults.getSectionDefault("letter") || []));
          cfg.memory = wishDefaults.getSectionDefault("memory") || "";
          cfg.reasons = JSON.parse(JSON.stringify(wishDefaults.getSectionDefault("reasons") || []));
          cfg.wishes = JSON.parse(JSON.stringify(wishDefaults.getSectionDefault("wishes") || []));
          cfg.gift = JSON.parse(JSON.stringify(wishDefaults.getSectionDefault("gift") || {}));
          cfg.timeline = JSON.parse(JSON.stringify(wishDefaults.getSectionDefault("timeline") || []));

          const defGallery = wishDefaults.getSectionDefault("gallery") || [];
          if (Array.isArray(cfg.gallery) && Array.isArray(defGallery)) {
            cfg.gallery.forEach((g, idx) => {
              const defCard = defGallery[idx] || {};
              g.emoji = defCard.emoji || "🎈";
              g.cap = defCard.cap || "A special moment ✨";
              g.secretNote = defCard.secretNote || "Remember this day? 💫";
            });
          }
        }

        if (quickRelSelect) quickRelSelect.value = "";

        populateEditorFields();

        const renderSecFn = root.renderSections || (typeof renderSections === "function" ? renderSections : null);
        if (renderSecFn) {
          const formatFn = root.formatName || ((n) => n);
          const displayName = cfg.name ? formatFn(cfg.name) : "";
          renderSecFn(["letter", "memory", "reasons", "wishes", "gallery", "timeline", "gift"], displayName);
        }

        toastFn("Restored relationship style to defaults ↺");
      });
    }

    // Live Editor Input Event Listeners
    const editorBodyEl = document.getElementById("editor-body");
    if (editorBodyEl) {
      editorBodyEl.addEventListener("input", (e) => {
        const target = e.target;
        if (!target) return;
        const id = target.id || "";
        const isLetterLine = target.classList && target.classList.contains("letter-line-input");
        const isReasonField = target.classList && (
          target.classList.contains("reason-icon") ||
          target.classList.contains("reason-title") ||
          target.classList.contains("reason-text")
        );

        if (id === "input-name" || id === "input-from") {
          syncDOMToConfig();
          const formatFn = root.formatName || ((n) => n);
          const displayName = cfg.name ? formatFn(cfg.name) : "";
          if (typeof root.updateNameSlots === "function") root.updateNameSlots(displayName);
          if (typeof root.updateSenderSlots === "function") root.updateSenderSlots();
          if (typeof root.updateBirthdayCard === "function") root.updateBirthdayCard();
        } else if (isLetterLine) {
          syncDOMToConfig();
          if (typeof root.updateLetterBody === "function") root.updateLetterBody();
        } else if (isReasonField) {
          // Reason editor inputs are synchronized through syncDOMToConfig().
          // Public Reasons cards are refreshed through renderSections(["reasons"]).
          // This keeps editor → CONFIG → renderer flow consistent with the existing architecture.
          syncDOMToConfig();
          const renderSecFn = root.renderSections || (typeof renderSections === "function" ? renderSections : null);
          if (renderSecFn) {
            renderSecFn(["reasons"]);
          } else if (typeof root.renderReasonsGrid === "function") {
            root.renderReasonsGrid();
          }
        } else if (id === "input-letter-font" || id === "input-letter-theme") {
          syncDOMToConfig();
          if (typeof root.updateLetterThemeAndFont === "function") root.updateLetterThemeAndFont();
        } else if (id === "input-memory") {
          syncDOMToConfig();
          if (typeof root.updateMemorySection === "function") root.updateMemorySection();
        } else if (id === "input-gift-message" || id === "input-gift-coupon") {
          syncDOMToConfig();
          const updateGiftFn = root.updateGiftSection || (typeof updateGiftSection === "function" ? updateGiftSection : (typeof window.updateGiftSection === "function" ? window.updateGiftSection : null));
          if (updateGiftFn) updateGiftFn();
        }
      });
    }

    // ============================================================
    // ADMIN EDIT MODE DETECTION & RETURN UI (Phase 29B-1)
    // ============================================================
    handleAdminEditLaunch();
  }

  /**
   * Evaluates admin URL parameters and opens Quick Editor if session is authenticated.
   */
  function handleAdminEditLaunch() {
    if (typeof window === "undefined" || !window.location) return;
    const params = new URLSearchParams(window.location.search);
    const adminEdit = params.get("admin_edit");
    const returnParam = params.get("return");

    const isAuthenticated = (typeof sessionStorage !== "undefined" && sessionStorage.getItem("admin_authenticated") === "true");

    // Strict Security Gate: URL parameters NEVER grant privileges without active session
    if (!isAuthenticated) return;

    // 1. Admin Return UI activation
    if (returnParam === "admin") {
      const returnBar = document.getElementById("admin-return-bar");
      if (returnBar) returnBar.style.display = "flex";
      const returnModalBtn = document.getElementById("customizer-return-admin-btn");
      if (returnModalBtn) returnModalBtn.style.display = "inline-flex";
      const returnShareBtn = document.getElementById("share-return-admin-btn");
      if (returnShareBtn) returnShareBtn.style.display = "inline-flex";
    }

    const backdrop = document.getElementById("customizer-modal");

    // 2. New Wish Mode (admin_edit=new)
    if (adminEdit === "new") {
      resetToFreshNewWish();
      if (backdrop) backdrop.classList.add("active");
      const openAccFn = root.openAccordionSection || (typeof openAccordionSection === "function" ? openAccordionSection : null);
      if (openAccFn) {
        openAccFn("basic");
      }
    }
    // 3. Existing Wish Edit Mode (admin_edit=true)
    else if (adminEdit === "true") {
      populateEditorFields();
      if (backdrop) backdrop.classList.add("active");
      const openAccFn = root.openAccordionSection || (typeof openAccordionSection === "function" ? openAccordionSection : null);
      if (openAccFn) {
        openAccFn("basic");
      }
    }
  }

  // Expose core customizer module methods on root (window)
  root.syncDOMToConfig = syncDOMToConfig;
  root.populateEditorFields = populateEditorFields;
  root.readAllValues = readAllValues;
  root.applyAllValues = applyAllValues;
  root.resetSection = resetSection;
  root.hasUnsavedChanges = hasUnsavedChanges;
  root.resetToFreshNewWish = resetToFreshNewWish;
  root.handleSaveGuard = handleSaveGuard;
  root.initCustomizerModal = initCustomizerModal;
  root.handleAdminEditLaunch = handleAdminEditLaunch;

})(typeof window !== "undefined" ? window : this);
