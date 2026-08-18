/**
 * ============================================================================
 * MODULE: Live Page Renderers (js/modules/renderers.js)
 *
 * Purpose:
 * Converts current CONFIG/state into visible birthday-page DOM.
 *
 * Owns:
 * - Live page section rendering
 * - Birthday/date card updates
 * - Age/countdown updates
 * - Greeting generation
 * - Name/sender slot updates
 * - Letter body rendering
 * - Wishes rendering
 * - Reasons rendering
 * - Gallery rendering
 * - Timeline rendering
 * - Video rendering
 * - Gift/memory/cake-related display updates
 * - Section dispatching
 *
 * Does NOT Own:
 * - Database writes / Supabase CRUD
 * - IndexedDB storage
 * - Authentication / Admin security
 * - Editor input management
 * - Application boot
 * - Audio engine
 * - Major interaction flows
 * ============================================================================
 */

(function (root) {
  "use strict";

  const MONTH_NAMES = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ];

  const MONTH_FULL_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // ============================================================
  // VIDEO WISH UTILITIES
  // ============================================================

  function parseYouTubeStartSec(url, customStart) {
    let sec = 0;
    if (customStart) {
      const str = String(customStart).trim();
      if (str.includes(":")) {
        const parts = str.split(":");
        sec = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
      } else {
        sec = parseInt(str, 10) || 0;
      }
    }
    if (!sec && url) {
      if (root.MediaService && typeof root.MediaService.decodeMediaStartTime === "function") {
        sec = root.MediaService.decodeMediaStartTime(url);
      } else if (typeof root.decodeMediaStartTime === "function") {
        sec = root.decodeMediaStartTime(url);
      } else {
        const bwMatch = url.match(/#bw-start=(\d+)/i);
        if (bwMatch && bwMatch[1]) {
          sec = parseInt(bwMatch[1], 10) || 0;
        }
      }
    }
    if (!sec && url) {
      try {
        const match = url.match(/[?&](?:t|start)=([^&#]+)/);
        if (match && match[1]) {
          const t = match[1];
          if (t.includes("m") || t.includes("s")) {
            const m = t.match(/(?:(\d+)m)?(?:(\d+)s)?/);
            if (m) {
              sec = (parseInt(m[1], 10) || 0) * 60 + (parseInt(m[2], 10) || 0);
            }
          } else {
            sec = parseInt(t, 10) || 0;
          }
        }
      } catch(e){}
    }
    return (sec && sec > 0) ? sec : 0;
  }

  function isWishCustomized() {
    const nameVal = (CONFIG.name || "").trim();
    const codeVal = (CONFIG.passcode?.code || "1234").trim();
    const yVal = CONFIG.birthDate?.year || 2001;
    const mVal = CONFIG.birthDate?.month || 1;
    const dVal = CONFIG.birthDate?.day || 1;

    return !!(nameVal || codeVal !== "1234" || yVal !== 2001 || mVal !== 1 || dVal !== 1);
  }

  function updateTimelineLine() {
    const tl = document.getElementById("timeline-wrap");
    if (!tl) return;
    const items = tl.querySelectorAll(".timeline-item");
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const firstCenter = first.offsetTop + 16;
    const lastCenter = last.offsetTop + 16;
    tl.style.setProperty("--timeline-line-start", `${firstCenter}px`);
    tl.style.setProperty("--timeline-line-height", `${lastCenter - firstCenter}px`);
  }

  // ============================================================
  // WISHES / REASONS
  // ============================================================

  function showRandomWish() {
    const wishes = CONFIG.wishes || [];
    if (wishes.length === 0) return;
    const w = wishes[Math.floor(Math.random() * wishes.length)];
    const el = document.getElementById("wish-quote-text");
    if (el) el.textContent = w;
  }

  // ============================================================
  // COUNTDOWN / DYNAMIC TIME HELPERS
  // ============================================================

  function buildCountdown() {
    const grid = document.getElementById("countdown-grid");
    if (!grid) return;

    grid.innerHTML = [
      { label: "Days", id: "cd-days" },
      { label: "Hours", id: "cd-hours" },
      { label: "Mins", id: "cd-min" },
      { label: "Secs", id: "cd-sec", highlight: true },
    ]
      .map(
        (u) => `
        <div class="age-unit ${u.highlight ? "highlight-unit" : ""}" style="flex:1 1 110px;">
          <span class="age-num" id="${u.id}">00</span>
          <span class="age-label">${u.label}</span>
        </div>`
      )
      .join("");

    updateCountdown();
    updateAgeCounter();

    setInterval(() => {
      updateCountdown();
      updateAgeCounter();
    }, 1000);
  }

  // ============================================================
  // BIRTHDAY / DATE / AGE RENDERING
  // ============================================================

  function updateBirthdayCard() {
    const d = CONFIG.birthDate?.day || 1;
    const m = CONFIG.birthDate?.month || 1;
    const nameVal = (CONFIG.name || "").trim();
    const fmt = root.formatName || formatName;
    const displayName = nameVal ? fmt(nameVal) : "";
    const monthShort = MONTH_NAMES[(m - 1) % 12];
    const monthFull = MONTH_FULL_NAMES[(m - 1) % 12];
    const getOrd = root.getOrdinalDay || getOrdinalDay;
    const getZod = root.getZodiacSign || getZodiacSign;
    const ordinalDay = getOrd(d);
    const zodiac = getZod(d, m);

    const envBadge = document.getElementById("envelope-date-badge");
    if (envBadge) envBadge.textContent = `🗓️ ${ordinalDay} ${monthFull}`;

    const dayEl = document.getElementById("bday-card-day");
    if (dayEl) dayEl.textContent = String(d).padStart(2, "0");

    const monthEl = document.getElementById("bday-card-month");
    if (monthEl) monthEl.textContent = monthShort;

    const zodiacEl = document.getElementById("bday-card-zodiac");
    if (zodiacEl) zodiacEl.textContent = zodiac;

    const nameEl = document.getElementById("bday-card-name");
    if (nameEl) nameEl.textContent = displayName || "Special Someone";

    const subEl = document.getElementById("bday-card-sub");
    if (subEl) subEl.textContent = `Mark your calendar for ${ordinalDay} ${monthFull} 🎉`;
  }

  function updateAgeCounter() {
    updateBirthdayCard();

    const birthYear = CONFIG.birthDate?.year || CONFIG.seedYear || 2001;
    const birthMonth = ((CONFIG.birthDate?.month || 1) - 1);
    const birthDay = CONFIG.birthDate?.day || 1;

    const now = new Date();
    const birthDateObj = new Date(birthYear, birthMonth, birthDay, 0, 0, 0);

    if (now < birthDateObj) return;

    let years = now.getFullYear() - birthDateObj.getFullYear();
    let months = now.getMonth() - birthDateObj.getMonth();
    let days = now.getDate() - birthDateObj.getDate();

    if (days < 0) {
      months--;
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonthDate.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const hours = now.getHours();
    const mins = now.getMinutes();
    const secs = now.getSeconds();
    const totalMs = now - birthDateObj;
    const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));
    const heartbeats = ((totalDays * 24 * 60 * 75) / 1000000).toFixed(1);

    const setT = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(v).padStart(2, "0");
    };

    setT("age-years", years);
    setT("age-months", months);
    setT("age-days", days);
    setT("age-hours", hours);
    setT("age-min", mins);
    setT("age-sec", secs);

    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };

    setVal("stat-days", totalDays.toLocaleString());
    setVal("stat-heartbeats", heartbeats + "M");
    setVal("stat-trips", years);
  }

  function updateCountdown() {
    const now = new Date();
    let next = new Date(
      now.getFullYear(),
      CONFIG.birthDate.month - 1,
      CONFIG.birthDate.day,
      0, 0, 0
    );

    if (next < now)
      next = new Date(
        now.getFullYear() + 1,
        CONFIG.birthDate.month - 1,
        CONFIG.birthDate.day
      );

    const diff = next - now;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(v).padStart(2, "0");
    };

    set("cd-days", d);
    set("cd-hours", h);
    set("cd-min", m);
    set("cd-sec", s);
  }

  // ============================================================
  // NAME / SENDER / GREETING
  // ============================================================

  function buildDynamicGreeting() {
    const h = new Date().getHours();
    const g =
      h < 5
        ? "Still up this late? Even now, happy birthday 🌙"
        : h < 12
          ? "Good morning — go make today count ☀️"
          : h < 17
            ? "Hope your afternoon is as good as you deserve 🌤️"
            : h < 21
              ? "Good evening — the celebration is just getting started 🌅"
              : "A little late-night birthday magic, just for you 🌌";

    const el = document.getElementById("dynamic-greeting");
    if (el) el.textContent = g;
  }

  // ============================================================
  // GIFT / MEMORY / THEME HELPERS
  // ============================================================

  function updateLetterThemeAndFont() {
    const domGet = (root.DOM && root.DOM.get) ? root.DOM.get.bind(root.DOM) : (id) => document.getElementById(id);
    const exp = domGet("experience");
    if (exp) {
      exp.classList.remove("font-style-cursive", "font-style-serif", "font-style-script", "font-style-poppins", "font-style-nunito", "font-style-sans");
      if (CONFIG.letterFont && CONFIG.letterFont !== "default") {
        exp.classList.add(`font-style-${CONFIG.letterFont}`);
      }

      exp.classList.remove("theme-royalgold", "theme-galaxy", "theme-rosegold");
      if (CONFIG.letterTheme && CONFIG.letterTheme !== "default") {
        exp.classList.add(`theme-${CONFIG.letterTheme}`);
      }
    }
  }

  function updateCakeTheme() {
    const cake = document.getElementById("luxury-cake");
    if (cake) {
      cake.classList.remove("cake-theme-chocolate", "cake-theme-vanilla", "cake-theme-strawberry");
      if (CONFIG.cakeFlavor && CONFIG.cakeFlavor !== "default") {
        cake.classList.add(`cake-theme-${CONFIG.cakeFlavor}`);
      }
      const numRow = cake.querySelector(".number-candles-row");
      if (numRow) numRow.remove();
    }
  }

  function updatePasscodeHint() {
    const hintEl = document.getElementById("pc-hint");
    if (hintEl) {
      if (isWishCustomized()) {
        hintEl.textContent = CONFIG.passcode?.customHint || "Hint: think of a date that matters 💕";
      } else {
        hintEl.textContent = CONFIG.passcode?.defaultHint || "Hint: 1234 💕";
      }
    }
  }

  function updateGiftSection() {
    const giftMsg = document.getElementById("gift-message");
    if (giftMsg) giftMsg.textContent = CONFIG.gift.message;
    const giftCoupon = document.getElementById("gift-coupon");
    if (giftCoupon) giftCoupon.textContent = CONFIG.gift.coupon;
  }

  function updateNameSlots(displayName) {
    const nameVal = (CONFIG.name || "").trim();
    const fmt = root.formatName || formatName;
    const name = displayName !== undefined ? displayName : (nameVal ? fmt(nameVal) : "");

    document.title = name ? `Happy Birthday, ${name}! ❤️` : "Happy Birthday! ❤️";

    const slot1 = document.getElementById("name-slot-1");
    if (slot1) slot1.textContent = name ? `, ${name}` : "";

    const slot2 = document.getElementById("name-slot-2");
    if (slot2) slot2.textContent = name || "You";

    const logoEl = document.getElementById("loading-logo-glow") || document.querySelector(".logo-glow");
    if (logoEl) logoEl.textContent = name ? `✨ ${name}'s Birthday ✨` : "✨ Happy Birthday ✨";

    const sealEl = document.getElementById("seal-initial");
    if (sealEl) sealEl.textContent = name ? name.charAt(0).toUpperCase() : "❤️";

    const peekEl = document.getElementById("letter-peek-text");
    if (peekEl) peekEl.textContent = name ? `For ${name} ❤️` : "For You ❤️";
  }

  function updateSenderSlots() {
    const fromSlot = document.getElementById("from-slot");
    if (fromSlot) fromSlot.textContent = CONFIG.from || "your friends";
  }

  function updateMemorySection() {
    const memText = document.getElementById("memory-text");
    if (memText) memText.textContent = CONFIG.memory;
  }

  function updateWishesSection() {
    showRandomWish();
  }

  function updateDateAndAge() {
    updateBirthdayCard();
    updateAgeCounter();
    buildDynamicGreeting();
  }

  // ============================================================
  // LETTER RENDERING
  // IMPORTANT:
  // updateLetterBody() participates in the letter lifecycle.
  // Before typewriter completion it preserves empty paragraph
  // structure; after window.letterTyped becomes true it renders
  // the current CONFIG.letterLines.
  // Do not remove this lifecycle behavior.
  // ============================================================
  function updateLetterBody() {
    const letterBody = document.getElementById("letter-body");
    if (letterBody) {
      letterBody.innerHTML = "";
      (CONFIG.letterLines || []).forEach(line => {
        const p = document.createElement("p");
        if (window.letterTyped) {
          const getHighlight = window.ensureLineHighlight || (typeof ensureLineHighlight === "function" ? ensureLineHighlight : null);
          if (getHighlight) {
            p.innerHTML = getHighlight(line);
          } else {
            p.textContent = line;
          }
        }
        letterBody.appendChild(p);
      });
    }
  }

  function renderReasonsGrid() {
    const reasonsGrid = document.getElementById("reasons-grid");
    if (reasonsGrid) {
      reasonsGrid.innerHTML = "";
      (CONFIG.reasons || []).forEach((r, i) => {
        const el = document.createElement("div");
        el.className = "info-card glass reveal";
        el.style.setProperty("--i", i);
        el.innerHTML = `<span class="icon">${r.icon}</span><h3>${r.title}</h3><p>${r.text}</p>`;
        reasonsGrid.appendChild(el);
      });
    }
  }

  // ============================================================
  // GALLERY
  // ============================================================

  function renderGalleryDeck() {
    const deck = document.getElementById("gallery-deck");
    if (deck) {
      deck.innerHTML = "";
      (CONFIG.gallery || []).forEach((g, i) => {
        const el = document.createElement("div");
        el.className = "polaroid reveal";
        el.style.setProperty("--rot", g.rot + "deg");
        el.style.setProperty("--i", i);
        const bg = `hsl(${(i * 47) % 360} 70% 75%)`;
        const zoomSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
        const zoomBtnHtml = g.image ? `<button class="photo-zoom-btn" type="button" title="Expand Photo HD">${zoomSvg}</button>` : "";
        const frontContent = g.image
          ? `<div class="frame"><img src="${g.image}" alt="${g.cap}">${zoomBtnHtml}</div><div class="cap">${g.cap}</div>`
          : `<div class="frame" style="background:linear-gradient(135deg,${bg},#fff0f6);">${g.emoji}</div><div class="cap">${g.cap}</div>`;
        const backContent = `<div class="polaroid-back"><p>${g.secretNote || "A special memory ❤️"}</p><span class="tap-hint">Tap to flip back</span></div>`;
        el.innerHTML = `<div class="polaroid-inner"><div class="polaroid-front">${frontContent}</div>${backContent}</div>`;
        if (g.image) {
          const img = el.querySelector("img");
          if (img) {
            img.addEventListener("error", () => {
              const front = el.querySelector(".polaroid-front");
              if (front) front.innerHTML = `<div class="frame" style="background:linear-gradient(135deg,${bg},#fff0f6);">${g.emoji}</div><div class="cap">${g.cap}</div>`;
            });
            img.addEventListener("click", (e) => {
              e.stopPropagation();
              if (typeof openPhotoLightbox === "function") openPhotoLightbox(g.image, g.cap);
            });
          }
          const zoomBtn = el.querySelector(".photo-zoom-btn");
          if (zoomBtn) {
            zoomBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              if (typeof openPhotoLightbox === "function") openPhotoLightbox(g.image, g.cap);
            });
          }
        }
        el.addEventListener("click", () => {
          el.classList.toggle("flipped");
          if (typeof playPaperRustle === "function") playPaperRustle();
        });
        deck.appendChild(el);
      });
      window.RENDERED_GALLERY_JSON = JSON.stringify(CONFIG.gallery);
    }
  }

  // ============================================================
  // TIMELINE
  // ============================================================

  function renderTimelineSection() {
    const tl = document.getElementById("timeline-wrap");
    if (tl) {
      const postContent = document.getElementById("post-letter-content");
      const isRevealed = Boolean(window.letterTyped || (postContent && !postContent.classList.contains("post-letter-hidden")));

      tl.innerHTML = "";
      (CONFIG.timeline || []).forEach((t, i) => {
        const el = document.createElement("div");
        el.className = isRevealed ? "timeline-item reveal in-view" : "timeline-item reveal";
        el.dataset.icon = t.icon;
        el.style.setProperty("--i", i);
        el.innerHTML = `<span class="t-date">${t.date}</span><h4>${t.title}</h4><p>${t.text}</p>`;
        tl.appendChild(el);
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(updateTimelineLine);
      });
      window.RENDERED_TIMELINE_JSON = JSON.stringify(CONFIG.timeline);
    }
  }

  function updateCornerFlowers() {
    const flowers = document.querySelectorAll(".corner-flower");
    if (flowers.length) {
      flowers.forEach(f => f.textContent = "🌸");
    }
  }

  // ============================================================
  // SECTION DISPATCHER
  // ============================================================

  const RenderDispatcher = {
    theme: () => updateLetterThemeAndFont(),
    flowers: () => updateCornerFlowers(),
    cake: () => updateCakeTheme(),
    name: (displayName) => updateNameSlots(displayName),
    sender: () => updateSenderSlots(),
    passcode: () => updatePasscodeHint(),
    date: () => updateDateAndAge(),
    letter: () => updateLetterBody(),
    memory: () => updateMemorySection(),
    reasons: () => renderReasonsGrid(),
    wishes: () => updateWishesSection(),
    gallery: () => renderGalleryDeck(),
    timeline: () => renderTimelineSection(),
    gift: () => updateGiftSection(),
    video: () => renderVideoWishSection(),
    share: () => typeof updateShareSection === "function" && updateShareSection(),
    reveal: () => typeof initReveal === "function" && initReveal()
  };

  const ALL_SECTION_KEYS = [
    "theme", "flowers", "cake", "name", "sender", "passcode",
    "date", "letter", "memory", "reasons", "wishes", "gallery",
    "timeline", "gift", "video", "share", "reveal"
  ];

  function renderSections(sectionNames, displayName) {
    if (!Array.isArray(sectionNames) || sectionNames.length === 0) return;
    
    sectionNames.forEach(key => {
      if (typeof RenderDispatcher[key] === "function") {
        RenderDispatcher[key](displayName);
      }
    });

    if (window.letterTyped && typeof revealPostLetterContent === "function") {
      revealPostLetterContent();
    }

    if (typeof initReveal === "function") {
      initReveal();
    }

    const postContent = document.getElementById("post-letter-content");
    const isPostRevealed = postContent && !postContent.classList.contains("post-letter-hidden");
    if (isPostRevealed) {
      document.querySelectorAll(".reveal").forEach(el => {
        const rect = el.getBoundingClientRect();
        if ((rect.top < window.innerHeight + 200 && rect.bottom > -200) || postContent.contains(el)) {
          el.classList.add("in-view");
        }
      });
    }
  }

  function detectChangedSections(prevConfig, newVals) {
    const changed = [];
    if (!prevConfig || !newVals) return changed;

    const nameChanged = (prevConfig.name || "") !== (newVals.nameVal || "");
    const yChanged = (prevConfig.birthDate?.year || 2001) !== newVals.yVal;
    const mChanged = (prevConfig.birthDate?.month || 1) !== newVals.mVal;
    const dChanged = (prevConfig.birthDate?.day || 1) !== newVals.dVal;
    const passChanged = (prevConfig.passcode?.code || "1234") !== newVals.passVal;
    const cakeChanged = (prevConfig.cakeFlavor || "default") !== newVals.cakeFlavor;

    if (nameChanged) changed.push("name", "date", "share");
    if (yChanged || mChanged || dChanged) changed.push("date");
    if (passChanged) changed.push("passcode");
    if (cakeChanged) changed.push("cake");

    if ((prevConfig.from || "") !== (newVals.fromVal || "")) changed.push("sender");

    const letterFontChanged = (prevConfig.letterFont || "default") !== newVals.letterFont;
    const letterThemeChanged = (prevConfig.letterTheme || "default") !== newVals.letterTheme;
    const letterLinesChanged = JSON.stringify(prevConfig.letterLines || []) !== JSON.stringify(newVals.letterLines || []);

    if (letterFontChanged || letterThemeChanged) changed.push("theme");
    if (letterLinesChanged) changed.push("letter");

    if ((prevConfig.memory || "") !== (newVals.memoryVal || "")) changed.push("memory");

    if (JSON.stringify(prevConfig.reasons || []) !== JSON.stringify(newVals.reasons || [])) changed.push("reasons");
    if (JSON.stringify(prevConfig.wishes || []) !== JSON.stringify(newVals.wishes || [])) changed.push("wishes");

    const prevGalleryJson = window.RENDERED_GALLERY_JSON || JSON.stringify(prevConfig.gallery || []);
    if (prevGalleryJson !== JSON.stringify(newVals.gallery || [])) changed.push("gallery");

    const prevTimelineJson = window.RENDERED_TIMELINE_JSON || JSON.stringify(prevConfig.timeline || []);
    if (prevTimelineJson !== JSON.stringify(newVals.timeline || [])) changed.push("timeline");

    const giftMsgChanged = (prevConfig.gift?.message || "") !== (newVals.giftMsg || "");
    const giftCpnChanged = (prevConfig.gift?.coupon || "") !== (newVals.giftCoupon || "");
    if (giftMsgChanged || giftCpnChanged) changed.push("gift");

    const vidUrlChanged = (prevConfig.videoWish?.url || "") !== (newVals.videoUrlVal || "");
    const vidStartChanged = (prevConfig.videoWish?.startTime || "") !== (newVals.videoStartVal || "");
    if (vidUrlChanged || vidStartChanged) changed.push("video");

    return changed;
  }

  function renderAllSections(displayName) {
    renderSections(ALL_SECTION_KEYS, displayName);
  }

  function reRenderPage() {
    if (window.letterTyped && typeof revealPostLetterContent === "function") revealPostLetterContent();
    const nameVal = (CONFIG.name || "").trim();
    const fmt = root.formatName || formatName;
    const displayName = nameVal ? fmt(nameVal) : "";

    renderAllSections(displayName);
  }

  // ============================================================
  // VIDEO WISH
  // ============================================================

  function renderVideoWishSection() {
    const domGet = (root.DOM && root.DOM.get) ? root.DOM.get.bind(root.DOM) : (id) => document.getElementById(id);
    const section = domGet("video-wish-scene");
    const container = domGet("video-wish-player-container");
    if (!section || !container) return;

    const file = CONFIG.videoWish?.file;
    const url = CONFIG.videoWish?.url;
    const isYT = (typeof isYouTubeVideoUrl === "function") ? isYouTubeVideoUrl : (u) => (u && (u.includes("youtube.com") || u.includes("youtu.be")));

    // Mutually exclusive target resolution:
    // If YouTube URL is active in CONFIG.videoWish.url, YouTube target is chosen.
    // Otherwise if device video file is present, device file is chosen.
    let targetUrl = null;
    if (isYT(url)) {
      targetUrl = url;
    } else if (file) {
      targetUrl = file;
    } else if (url) {
      targetUrl = url;
    }

    console.log("🎬 renderVideoWishSection CONFIG.videoWish:", JSON.stringify(CONFIG.videoWish), "Resolved video target:", targetUrl);

    if (!targetUrl) {
      console.log("🎬 renderVideoWishSection: No video URL -> Hiding video section.");
      section.style.display = "none";
      container.innerHTML = "";
      return;
    }

    const startSec = parseYouTubeStartSec(targetUrl, CONFIG.videoWish?.startTime);
    const startParam = startSec > 0 ? `&start=${startSec}` : "";

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = typeof targetUrl === "string" ? targetUrl.match(regExp) : null;
    const ytId = (match && match[2].length === 11) ? match[2] : null;

    section.style.display = "flex";
    if (ytId) {
      console.log("🎬 renderVideoWishSection: YouTube URL detected -> Rendering iframe with ID:", ytId);
      container.innerHTML = `<iframe width="100%" height="380" src="https://www.youtube.com/embed/${ytId}?enablejsapi=1${startParam}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius:12px;display:block;"></iframe>`;
    } else {
      const cleanTargetUrl = (root.MediaService && typeof root.MediaService.stripMediaMetadata === "function")
        ? root.MediaService.stripMediaMetadata(targetUrl)
        : (typeof root.stripMediaMetadata === "function" ? root.stripMediaMetadata(targetUrl) : String(targetUrl).replace(/#bw-start=\d+/i, "").trim());
      console.log("🎬 renderVideoWishSection: Direct video MP4/WebM URL detected -> Rendering native <video> element:", cleanTargetUrl);
      container.innerHTML = `<video id="wish-video-element" controls playsinline style="width:100%;max-height:420px;border-radius:12px;display:block;" src="${cleanTargetUrl}"></video>`;
      if (startSec > 0) {
        const vid = document.getElementById("wish-video-element");
        if (vid) {
          vid.onloadedmetadata = () => { vid.currentTime = startSec; };
        }
      }
    }
  }

  // Export all public symbols globally on root
  root.renderSections = renderSections;
  root.renderAllSections = renderAllSections;
  root.reRenderPage = reRenderPage;
  root.detectChangedSections = detectChangedSections;
  root.renderReasonsGrid = renderReasonsGrid;
  root.renderGalleryDeck = renderGalleryDeck;
  root.renderTimelineSection = renderTimelineSection;
  root.renderVideoWishSection = renderVideoWishSection;
  root.updateBirthdayCard = updateBirthdayCard;
  root.updateAgeCounter = updateAgeCounter;
  root.updateCountdown = updateCountdown;
  root.buildDynamicGreeting = buildDynamicGreeting;
  root.updateNameSlots = updateNameSlots;
  root.updateSenderSlots = updateSenderSlots;
  root.updatePasscodeHint = updatePasscodeHint;
  root.updateLetterThemeAndFont = updateLetterThemeAndFont;
  root.updateCakeTheme = updateCakeTheme;
  root.updateGiftSection = updateGiftSection;
  root.updateMemorySection = updateMemorySection;
  root.updateWishesSection = updateWishesSection;
  root.updateDateAndAge = updateDateAndAge;
  root.updateLetterBody = updateLetterBody;
  root.updateCornerFlowers = updateCornerFlowers;
  root.updateTimelineLine = updateTimelineLine;
  root.showRandomWish = showRandomWish;
  root.buildCountdown = buildCountdown;
  root.parseYouTubeStartSec = parseYouTubeStartSec;
  root.isWishCustomized = isWishCustomized;
  root.RenderDispatcher = RenderDispatcher;
  root.ALL_SECTION_KEYS = ALL_SECTION_KEYS;

})(typeof window !== "undefined" ? window : globalThis);
