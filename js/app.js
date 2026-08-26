/**
 * ============================================================================
 * MAIN APPLICATION ORCHESTRATOR (js/app.js)
 * ============================================================================
 *
 * Responsibility:
 *   - Master application boot lifecycle & component initialization
 *   - URL parameter parsing, routing & CONFIG state hydration
 *   - Public Share UI orchestration & recipient link generation
 *   - Legacy JSONBlob URL fallback compatibility
 *   - Centralized UI toast notifications
 *
 * Architecture Note:
 *   Dedicated feature systems are modularized into js/modules/:
 *   - utils.js            → pure string, date & line highlight utilities
 *   - wish-codec.js       → Base64 serialization, sanitization & decoding
 *   - renderers.js        → live public DOM rendering
 *   - content-renderer.js → initial public DOM hydration & section coordinator
 *   - audio-fx.js         → MusicEngine, sound effects & canvas confetti/balloons
 *   - interactive.js      → birthday interaction flows (envelope, cake, candles)
 *   - visual-effects.js   → custom cursor, magnetic buttons, tilt & gyro parallax
 *   - loading.js          → loader progress simulation & passcode/intro transition
 *   - canvas-export.js    → high-res memory (1200x800) & story (1080x1920) export
 *   - photo-lightbox.js   → full-screen photo zoom modal & caption viewer
 *   - scroll-reveal.js    → scroll reveals & dawn sky gradient observer
 *   - admin-security.js   → admin authentication modal, master PIN & recovery
 *   - editor/* (11 files) → customizer UI, accordion, datepicker, sub-editors
 * ============================================================================
 */

/* ─── HIGH-FREQUENCY DOM QUERY CACHE MANAGER ─── */
const DOM = {
  _cache: new Map(),
  get(id) {
    let el = this._cache.get(id);
    if (!el || !el.isConnected) {
      el = document.getElementById(id);
      if (el) this._cache.set(id, el);
    }
    return el;
  }
};

/**
 * Scans static DOM text nodes to repair UTF-8 multi-byte emoji encoding.
 */
function repairStaticIcons() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const tag = node.parentElement?.tagName;
    if (tag !== "SCRIPT" && tag !== "STYLE") textNodes.push(node);
  }
  textNodes.forEach((node) => {
    node.nodeValue = repairMojibake(node.nodeValue);
  });
}

/**
 * Watches DOM mutations to automatically repair dynamically injected emoji text.
 */
function observeDynamicIconText() {
  const repairNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const repaired = repairMojibake(node.nodeValue);
      if (repaired !== node.nodeValue) node.nodeValue = repaired;
      return;
    }
    if (
      node.nodeType !== Node.ELEMENT_NODE ||
      ["SCRIPT", "STYLE"].includes(node.tagName)
    )
      return;

    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((text) => {
      const repaired = repairMojibake(text.nodeValue);
      if (repaired !== text.nodeValue) text.nodeValue = repaired;
    });
  };

  new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === "characterData") repairNode(record.target);
      record.addedNodes.forEach(repairNode);
    });
  }).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

/**
 * Fallback fetcher for historical wish URLs created with JSONBlob before Supabase migration.
 * @param {string} uuid - Legacy JSONBlob identifier.
 * @returns {Promise<Object|null>} Decoded wish configuration or null if not found.
 */
async function fetchWishFromDatabase(uuid) {
  try {
    if (!uuid) return null;
    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${uuid}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Cloud DB fetch fallback:", e);
  }
  return null;
}

/**
 * Core Application URL Router & CONFIG State Hydrator.
 *
 * Routing & Deserialization Order:
 *   1. ShareModule.parseRoute() → Resolves Supabase UUID from `?w={uuid}` or `?id=...`.
 *   2. fetchWishFromDatabase()   → Legacy JSONBlob fallback for historical dash-separated IDs.
 *   3. decodeWishData()          → Permanent backward compatibility for compact Base64 tokens.
 *   4. Direct query parameters   → Compatibility overrides for `&name=`, `&code=`, `&music=`, `&v=`.
 *
 * Side Effects:
 *   - Hydrates global `CONFIG` with decoded recipient data.
 *   - Triggers UI rendering: `populateContent()`, `reRenderPage()`, `renderVideoWishSection()`, `populateEditorFields()`.
 *
 * @returns {Promise<void>}
 */
async function parseQueryParams() {
  const params = new URLSearchParams(location.search);
  const nameParam = params.get("name");
  const tokenParam = params.get("w") || params.get("wish") || params.get("id");

  const previewParam = params.get("preview");
  if (previewParam === "admin" || previewParam === "admin_session" || previewParam === "true") {
    try {
      const rawSession = (typeof sessionStorage !== "undefined" && (sessionStorage.getItem("admin_preview_wish") || sessionStorage.getItem("admin_preview_config") || sessionStorage.getItem("antigravity_preview_wish_config")))
        || (typeof localStorage !== "undefined" && (localStorage.getItem("admin_preview_wish") || localStorage.getItem("admin_preview_config")));
      if (rawSession) {
        const previewConfig = JSON.parse(rawSession);
        if (previewConfig && typeof previewConfig === "object") {
          Object.assign(CONFIG, previewConfig);
          CONFIG._isPreview = true;
          console.log("👁️ Hydrated in-memory wish preview from Admin Studio session with 0 database writes/reads!");

          if (typeof populateContent === "function") populateContent();
          if (typeof reRenderPage === "function") reRenderPage();
          if (typeof renderVideoWishSection === "function") renderVideoWishSection();
          if (typeof populateEditorFields === "function") populateEditorFields();
          return;
        }
      }
    } catch (e) {
      console.warn("⚠️ Preview session hydration error:", e);
    }
  }

  if (tokenParam) {
    let decoded = null;

    if (window.ShareModule) {
      decoded = await window.ShareModule.parseRoute(CONFIG);
    }

    if (!decoded && tokenParam.length >= 20 && (tokenParam.includes("-") || !tokenParam.match(/^[A-Za-z0-9_-]+$/))) {
      decoded = await fetchWishFromDatabase(tokenParam);
    }

    // Permanent Backward Compatibility Fallback
    if (!decoded) {
      decoded = decodeWishData(tokenParam);
    }

    if (decoded) {
      if (tokenParam.length >= 20 && (tokenParam.includes("-") || !tokenParam.match(/^[A-Za-z0-9_-]+$/))) {
        CONFIG._activeWishUuid = tokenParam;
      }
      if (decoded.n) CONFIG.name = formatName(decoded.n);
      if (decoded.c) CONFIG.passcode.code = decoded.c.trim();
      else CONFIG.passcode.code = "1234";

      if (decoded.y || decoded.m || decoded.d) {
        CONFIG.birthDate = {
          year: parseInt(decoded.y) || CONFIG.birthDate.year || 2001,
          month: parseInt(decoded.m) || CONFIG.birthDate.month || 1,
          day: parseInt(decoded.d) || CONFIG.birthDate.day || 1
        };
      }
      if (decoded.f) CONFIG.from = decoded.f;
      if (decoded.mem) CONFIG.memory = decoded.mem;
      if (decoded.cf) CONFIG.cakeFlavor = decoded.cf;
      if (decoded.lf) CONFIG.letterFont = decoded.lf;
      if (decoded.lt) CONFIG.letterTheme = decoded.lt;
      if (decoded.gft) CONFIG.gift = decoded.gft;

      if (decoded.l && Array.isArray(decoded.l) && decoded.l.length > 0) {
        CONFIG.letterLines = decoded.l;
      }
      if (decoded.r && Array.isArray(decoded.r) && decoded.r.length > 0) {
        CONFIG.reasons = decoded.r;
      }
      if (decoded.w && Array.isArray(decoded.w) && decoded.w.length > 0) {
        CONFIG.wishes = decoded.w;
      }
      if (decoded.t && Array.isArray(decoded.t) && decoded.t.length > 0) {
        CONFIG.timeline = decoded.t;
      }

      if (decoded.g && Array.isArray(decoded.g) && decoded.g.length > 0) {
        CONFIG.gallery = decoded.g.map((item, i) => {
          const defaultCard = (window.DEFAULT_CONFIG_BACKUP && window.DEFAULT_CONFIG_BACKUP.gallery && window.DEFAULT_CONFIG_BACKUP.gallery[i]) || (CONFIG.gallery && CONFIG.gallery[i]) || {};
          const imageVal = (item.img !== undefined) ? item.img : ((item.image !== undefined) ? item.image : (defaultCard.image || null));
          return {
            image: imageVal,
            emoji: item.e || item.emoji || defaultCard.emoji || "🎈",
            rot: item.rot !== undefined ? item.rot : ((i % 2 === 0 ? -1 : 1) * (3 + i * 2)),
            cap: item.c || item.cap || defaultCard.cap || "Memory",
            secretNote: item.n || item.secretNote || defaultCard.secretNote || ""
          };
        });
      }

      if (decoded.v) {
        CONFIG.videoWish = CONFIG.videoWish || {};
        const rawVUrl = decoded.v.u || decoded.v.url || "";
        const decVStart = (window.MediaService && typeof window.MediaService.decodeMediaStartTime === "function")
          ? window.MediaService.decodeMediaStartTime(rawVUrl)
          : (typeof window.decodeMediaStartTime === "function" ? window.decodeMediaStartTime(rawVUrl) : 0);
        const cleanVUrl = (window.MediaService && typeof window.MediaService.stripMediaMetadata === "function")
          ? window.MediaService.stripMediaMetadata(rawVUrl)
          : rawVUrl.replace(/#bw-start=\d+/i, "").trim();

        CONFIG.videoWish.url = cleanVUrl;
        CONFIG.videoWish.startTime = decoded.v.t || decoded.v.startTime || decVStart || "";
      }

      if (decoded.msc) {
        const rawMUrl = decoded.msc.f || decoded.msc.file || "";
        const decMStart = (window.MediaService && typeof window.MediaService.decodeMediaStartTime === "function")
          ? window.MediaService.decodeMediaStartTime(rawMUrl)
          : (typeof window.decodeMediaStartTime === "function" ? window.decodeMediaStartTime(rawMUrl) : 0);
        const cleanMUrl = (window.MediaService && typeof window.MediaService.stripMediaMetadata === "function")
          ? window.MediaService.stripMediaMetadata(rawMUrl)
          : rawMUrl.replace(/#bw-start=\d+/i, "").trim();

        CONFIG.music = {
          file: cleanMUrl,
          startTime: decoded.msc.t || decoded.msc.startTime || decMStart || ""
        };
      }

      // Re-render UI and populate all DOM slots with decoded wish data!
      if (typeof populateContent === "function") populateContent();
      if (typeof reRenderPage === "function") reRenderPage();
      if (typeof renderVideoWishSection === "function") renderVideoWishSection();
      if (typeof populateEditorFields === "function") populateEditorFields();
    }
  }

  // Also check direct URL params for video (&v=) or music (&music=)
  const musicParam = params.get("music");
  if (musicParam && !musicParam.startsWith("blob:")) {
    CONFIG.music = CONFIG.music || {};
    CONFIG.music.file = musicParam;
  }
  const videoParam = params.get("v");
  if (videoParam && !videoParam.startsWith("blob:")) {
    CONFIG.videoWish = CONFIG.videoWish || {};
    CONFIG.videoWish.url = videoParam;
  }

  if (!tokenParam && nameParam) {
    CONFIG.name = formatName(nameParam);
    const rawCode = params.get("code");
    if (rawCode) CONFIG.passcode.code = rawCode.trim();
  }
}

/* ==========================================================================
   PUBLIC SHARE & SOCIAL EXPORT ENGINE
   ========================================================================== */

/**
 * Utility helper checking if application runtime environment is hosted over HTTP or HTTPS.
 * @returns {boolean} True if loaded over web protocol.
 */
function isHostedOnline() {

  return ["http:", "https:"].includes(location.protocol);

}

/**
 * Generates a clean, publish-safe, shareable public wish URL.
 *
 * Architecture & Protection Rules:
 *   - Builds a sanitized payload via `buildPublishConfig()` without mutating the local draft `CONFIG`.
 *   - Attempts persistent Supabase UUID generation via `ShareModule.buildShareUrl()`.
 *   - Falls back to compact Base64 token serialization (`encodeWishData()`) if offline or unpersisted.
 *   - Strict Media Sanitization: Strips temporary client-only `blob:` and `data:` URLs to prevent broken media links.
 *
 * @param {string} [overrideName] - Optional custom name override.
 * @param {Object} [options] - Persistence options (e.g. `{ persist: true }` on explicit share button click).
 * @returns {Promise<string>} Canonical HTTPS share URL.
 */
async function buildRecipientShareUrl(overrideName, options = { persist: false }) {
  const nameVal = (overrideName !== undefined ? overrideName : (CONFIG.name || "")).trim();
  let baseUrl = location.origin + location.pathname;
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = location.href.split("?")[0];
  }

  // Construct clean publish-only configuration payload (preserves local draft CONFIG untouched)
  const publishConfig = typeof buildPublishConfig === "function" ? buildPublishConfig(CONFIG) : CONFIG;
  if (overrideName !== undefined) {
    publishConfig.name = nameVal;
  }
  if (CONFIG._activeWishUuid) {
    publishConfig._activeWishUuid = CONFIG._activeWishUuid;
  }

  // Try generating / updating short UUID link via ShareModule
  if (window.ShareModule) {
    const uuidUrl = await window.ShareModule.buildShareUrl(publishConfig, nameVal, options);
    if (uuidUrl) {
      if (publishConfig._activeWishUuid) {
        CONFIG._activeWishUuid = publishConfig._activeWishUuid;
      }
      return uuidUrl;
    }
    // If persistence was explicitly requested but failed, do NOT fallback to a misleading unpersisted URL
    const shouldPersist = typeof options === "boolean" ? options : !!(options && options.persist);
    if (shouldPersist) {
      return null;
    }
  }

  const token = encodeWishData(publishConfig);

  if (!token) {
    return nameVal ? `${baseUrl}?name=${encodeURIComponent(nameVal)}` : baseUrl;
  }

  let shareUrl = `${baseUrl}?w=${token}`;
  if (nameVal) shareUrl += `&name=${encodeURIComponent(nameVal)}`;

  // Filter out any blob: URLs from music & video params so blob: URLs NEVER get appended to shareable links!
  if (publishConfig.music?.file && !publishConfig.music.file.startsWith("blob:") && !publishConfig.music.file.startsWith("data:") && !publishConfig.music.file.includes("assets/music/happy-birthday-song.mpeg")) {
    shareUrl += `&music=${encodeURIComponent(publishConfig.music.file)}`;
  }
  if (publishConfig.music?.startTime) {
    shareUrl += `&t=${encodeURIComponent(publishConfig.music.startTime)}`;
  }
  if (publishConfig.videoWish?.url && !publishConfig.videoWish.url.startsWith("blob:") && !publishConfig.videoWish.url.startsWith("data:")) {
    shareUrl += `&v=${encodeURIComponent(publishConfig.videoWish.url)}`;
  }

  return shareUrl;
}

/**
 * Generates and mounts a dynamic QR code in the public share section.
 * Optimizes long URLs to clean recipient URLs to guarantee a crisp, scannable QR code matrix.
 * @returns {Promise<void>}
 */
async function updateShareSection() {
  const fullShareUrl = await buildRecipientShareUrl(undefined, { persist: false });
  const nameVal = (CONFIG.name || "").trim();
  let qrTargetUrl = fullShareUrl;

  // If token URL is long, use clean URL for QR code so QR image is 100% crisp & scannable!
  if (fullShareUrl.length > 350) {
    const baseUrl = location.origin + location.pathname;
    qrTargetUrl = nameVal ? `${baseUrl}?name=${encodeURIComponent(nameVal)}` : baseUrl;
  }

  const qrBox = document.getElementById("qr-box");
  if (qrBox) {
    const qrImg = new Image();
    qrImg.style.maxWidth = "180px";
    qrImg.style.borderRadius = "14px";
    qrImg.style.border = "3px solid rgba(255, 215, 0, 0.4)";
    qrImg.style.boxShadow = "0 8px 25px rgba(0,0,0,0.5)";

    const apiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrTargetUrl)}`;

    qrImg.onload = () => {
      qrBox.innerHTML = "";
      qrBox.appendChild(qrImg);
    };
    qrImg.onerror = () => {
      qrBox.innerHTML = '<span style="color:#b5809b;font-size:.75rem;padding:8px;text-align:center;">QR Code unavailable offline</span>';
    };
    qrImg.src = apiQrUrl;
  }
}

/**
 * Initializes the birthday wish quote rotator card and binds quote shuffle.
 * @returns {void}
 */
function initWishes() {
  const quoteText = document.getElementById("wish-quote-text");
  const newQuoteBtn = document.getElementById("new-quote-btn");
  if (!quoteText || !newQuoteBtn) return;

  const defaultQuotes = [
    "May this year hand you everything last year taught you to deserve.",
    "Wishing you a year as bright and unstoppable as you are.",
    "May your birthday be the gentle start of your best year yet.",
    "Here's to more laughter, less overthinking, and everything you're working towards.",
    "May you keep choosing yourself this year, the way you choose everyone else."
  ];

  const getQuotes = () => (Array.isArray(CONFIG.wishes) && CONFIG.wishes.length > 0 ? CONFIG.wishes : defaultQuotes);

  let currentIdx = Math.floor(Math.random() * getQuotes().length);
  quoteText.textContent = getQuotes()[currentIdx] || defaultQuotes[0];

  newQuoteBtn.addEventListener("click", () => {
    const quotes = getQuotes();
    currentIdx = (currentIdx + 1) % quotes.length;
    quoteText.style.opacity = "0";
    quoteText.style.transform = "translateY(8px)";
    quoteText.style.transition = "all 0.2s ease";
    setTimeout(() => {
      quoteText.textContent = quotes[currentIdx] || defaultQuotes[0];
      quoteText.style.opacity = "1";
      quoteText.style.transform = "translateY(0)";
      if (typeof confettiBurst === "function") confettiBurst(innerWidth / 2, innerHeight * 0.4, 25);
    }, 200);
  });
}

/**
 * Binds public sharing listeners: Copy Link, WhatsApp direct share,
 * Web Share API, SpeechSynthesis voice narrator, and Canvas Story/Poster export triggers.
 * @returns {void}
 */
function initShare() {
  initWishes();
  updateShareSection();

  const instaBtn = document.getElementById("insta-story-btn");
  if (instaBtn) instaBtn.addEventListener("click", exportInstaStory);

  const posterBtn = document.getElementById("download-poster-btn");
  if (posterBtn) posterBtn.addEventListener("click", exportInstaStory);

  // Copy Link Button
  const copyBtn = document.getElementById("copy-link-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const shareUrl = await buildRecipientShareUrl(undefined, { persist: true });
      if (!shareUrl) {
        showToast("⚠️ Could not update share link. Please try again.");
        return;
      }
      const nameVal = (CONFIG.name || "").trim();
      const displayName = nameVal ? formatName(nameVal) : "";

      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast(displayName ? `Wish link copied for ${displayName}! 🔗` : "Wish link copied! 🔗");
      } catch (e) {
        try {
          const ta = document.createElement("textarea");
          ta.value = shareUrl;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          const ok = document.execCommand("copy");
          ta.remove();
          showToast(ok ? "Wish link copied! 🔗" : "Please copy link from address bar");
        } catch (e2) {
          showToast("Copy link failed");
        }
      }
    });
  }

  // Unicode-safe emoji constants for share messages
  const EMOJI_CAKE = "\u{1F382}";
  const EMOJI_SPARKLES = "\u{2728}";
  const EMOJI_GIFT = "\u{1F381}";
  const EMOJI_HEART = "\u{1F496}";

  // Native Share / WhatsApp Button
  const shareBtn = document.getElementById("native-share-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const shareUrl = await buildRecipientShareUrl(undefined, { persist: true });
      if (!shareUrl) {
        showToast("⚠️ Could not update share link. Please try again.");
        return;
      }
      const nameVal = (CONFIG.name || "").trim();
      const displayName = nameVal ? formatName(nameVal) : "";
      const greeting = displayName ? `Hey ${displayName}! ${EMOJI_CAKE}${EMOJI_SPARKLES}` : `Hey! ${EMOJI_CAKE}${EMOJI_SPARKLES}`;
      const shareMsg = `${greeting}\n\nMaine tumhare liye ek special Birthday Surprise banaya hai! ${EMOJI_GIFT}${EMOJI_HEART}\n\nKhol kar dekho ${EMOJI_GIFT}:\n${shareUrl}`;

      if (navigator.share) {
        try {
          const payload = (window.ShareModule && typeof window.ShareModule.buildNativeSharePayload === "function")
            ? window.ShareModule.buildNativeSharePayload(shareUrl, displayName)
            : {
                title: displayName ? `🎁 Birthday Surprise for ${displayName}` : "🎁 Birthday Surprise!",
                text: `🎂✨ Maine tumhare liye ek special Birthday Surprise banaya hai! 🎁💖\n\nEk chhota sa surprise tumhara wait kar raha hai… 💝\n\n👇 Link open karke dekho — I hope tumhe ye pasand aayega! 🥰`,
                url: shareUrl,
              };
          await navigator.share(payload);
          return;
        } catch (e) {
          return;
        }
      }

      // WhatsApp direct fallback
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMsg)}`;
      const win = window.open(waUrl, "_blank");
      if (!win) location.href = waUrl;
    });
  }

  // Dedicated WhatsApp Share Button
  const waBtn = document.getElementById("whatsapp-share-btn");
  if (waBtn) {
    waBtn.addEventListener("click", async () => {
      const shareUrl = await buildRecipientShareUrl(undefined, { persist: true });
      if (!shareUrl) {
        showToast("⚠️ Could not update share link. Please try again.");
        return;
      }
      const nameVal = (CONFIG.name || "").trim();
      const displayName = nameVal ? formatName(nameVal) : "";
      const greeting = displayName ? `Hey ${displayName}! ${EMOJI_CAKE}${EMOJI_SPARKLES}` : `Hey! ${EMOJI_CAKE}${EMOJI_SPARKLES}`;
      const waText = `${greeting}\n\nMaine tumhare liye ek special Birthday Surprise banaya hai! ${EMOJI_GIFT}${EMOJI_HEART}\n\nKhol kar dekho ${EMOJI_GIFT}:\n${shareUrl}`;
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
      const win = window.open(waUrl, "_blank");
      if (!win) location.href = waUrl;
    });
  }

  // Voice Speech Synthesizer
  const voiceBtn = document.getElementById("voice-btn");
  if (voiceBtn) {
    voiceBtn.addEventListener("click", () => {
      if (!("speechSynthesis" in window)) {
        showToast("Voice playback is not supported on this browser");
        return;
      }

      const nameVal = (CONFIG.name || "").trim();
      const displayName = nameVal ? formatName(nameVal) : "";

      const temp = document.createElement("div");
      CONFIG.letterLines.forEach((l) => (temp.innerHTML += l));

      const text = (displayName ? `Happy birthday ${displayName}. ` : "Happy birthday. ") + temp.textContent;

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.pitch = 1.05;

      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    });
  }
}

/**
 * Displays a temporary UI toast notification banner on the main page.
 * @param {string} msg - Text message to render in the toast banner.
 */
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

/**
 * ============================================================================
 * MAIN APPLICATION BOOT & INITIALIZATION SEQUENCE
 * ============================================================================
 * Asynchronously coordinates the complete application bootstrap lifecycle:
 *
 *   1. SNAPSHOT: Backs up initial template CONFIG into `DEFAULT_CONFIG_BACKUP` for resets.
 *   2. FONTS: Awaits web font readiness (`document.fonts.ready`).
 *   3. ROUTING: Parses URL query params / UUID / Base64 tokens or hydrates local creator draft.
 *   4. SANITIZATION: Scans and repairs UTF-8 mojibake character encoding on text assets.
 *   5. HYDRATION: Mounts DOM components (content-renderer, renderers, envelope, cake, candles).
 *   6. MEDIA & STORAGE: Restores local IndexedDB audio/video assets and launches media listeners.
 *   7. ORCHESTRATION: Initializes customizer, music widget, share UI, scroll reveal, and gyro motion.
 * ============================================================================
 */
(async function boot() {
  window.DEFAULT_CONFIG_BACKUP = JSON.parse(JSON.stringify(CONFIG));

  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch(e){}
  }

  await parseQueryParams();

  const searchParams = new URLSearchParams(location.search);
  const isPreview = (CONFIG && CONFIG._isPreview) || searchParams.get("preview") === "admin" || searchParams.get("preview") === "admin_session" || searchParams.get("preview") === "true";
  const hasRecipientParams = searchParams.has("name") || searchParams.has("w") || searchParams.has("wish") || searchParams.has("id");

  if (isPreview) {
    // PREVIEW MODE: Already hydrated from admin session above, NEVER overwrite with local creator draft!
  } else if (hasRecipientParams) {
    if (searchParams.has("music")) {
      CONFIG.music = CONFIG.music || {};
      CONFIG.music.file = searchParams.get("music");
    }
    if (searchParams.has("t")) {
      CONFIG.music = CONFIG.music || {};
      CONFIG.music.startTime = searchParams.get("t");
    }
    if (searchParams.has("v")) {
      CONFIG.videoWish = CONFIG.videoWish || {};
      CONFIG.videoWish.url = searchParams.get("v");
    }
  } else {
    // Normal visit to root URL or Admin mode: load saved customizer draft if present
    const savedConfig = localStorage.getItem("custom_birthday_config");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed && typeof parsed === "object") {
          const runtimeMusic = CONFIG.music;
          const runtimeVideo = CONFIG.videoWish;
          Object.assign(CONFIG, parsed);
          if (runtimeMusic && runtimeMusic.file && (!parsed.music || !parsed.music.file)) {
            CONFIG.music = {
              ...runtimeMusic,
              ...(parsed.music || {}),
              file: runtimeMusic.file,
              fileName: runtimeMusic.fileName || (parsed.music && parsed.music.fileName),
              isBlob: runtimeMusic.isBlob !== undefined ? runtimeMusic.isBlob : (parsed.music && parsed.music.isBlob)
            };
          }
          if (runtimeVideo && (runtimeVideo.url || runtimeVideo.file) && (!parsed.videoWish || (!parsed.videoWish.url && !parsed.videoWish.file))) {
            CONFIG.videoWish = {
              ...runtimeVideo,
              ...(parsed.videoWish || {}),
              url: runtimeVideo.url || (parsed.videoWish && parsed.videoWish.url),
              file: runtimeVideo.file || (parsed.videoWish && parsed.videoWish.file),
              fileName: runtimeVideo.fileName || (parsed.videoWish && parsed.videoWish.fileName)
            };
          }
        }
      } catch(e){}
    }
  }

  if (Array.isArray(CONFIG.gallery)) {
    CONFIG.gallery.forEach(item => {
      if (typeof item.image === "string" && item.image.startsWith("blob:")) {
        item.image = item._localDraft || null;
      }
    });
  }

  repairStaticIcons();
  observeDynamicIconText();
  repairObjectText(CONFIG);
  positionCakeBeforeSurprise();

  populateContent();
  reRenderPage();

  initEnvelope();
  initSurprise();
  initGiftbox();
  initCake();
  initWishingStar();
  initWishStudioCalendar();
  initPhotoLightbox();
  renderVideoWishSection();

  // Check if opening fresh base URL to create a new wish or opening a shared recipient link
  const urlParams = new URLSearchParams(location.search);
  const isPreviewParam = (CONFIG && CONFIG._isPreview) || urlParams.get("preview") === "admin" || urlParams.get("preview") === "admin_session" || urlParams.get("preview") === "true";
  const hasParams = isPreviewParam || urlParams.has("w") || urlParams.has("wish") || urlParams.has("name") || urlParams.has("music") || urlParams.has("v");

  if (!hasParams) {
    // FRESH NEW WISH CREATION: Only wipe if no local draft is stored in localStorage or CONFIG
    const savedConfig = localStorage.getItem("custom_birthday_config");
    const hasLocalDraft = !!savedConfig || !!(CONFIG.videoWish?.url || CONFIG.videoWish?.file) || !!(CONFIG.music?.file && CONFIG.music.file !== "assets/music/happy-birthday-song.mpeg");
    if (!hasLocalDraft) {
      try { if (window.AudioStorage) await window.AudioStorage.removeAudio(); } catch(e){}
      try { if (window.VideoStorage) await window.VideoStorage.removeVideo(); } catch(e){}
      CONFIG.music = { file: "assets/music/happy-birthday-song.mpeg", startTime: "" };
      CONFIG.videoWish = { url: "", startTime: "", file: null, fileName: null };
      renderVideoWishSection();
    }
  }

  // Restore local IndexedDB audio via audio editor module
  if (typeof restoreLocalAudio === "function") {
    await restoreLocalAudio();
  }

  // Restore local IndexedDB video via video editor module
  if (typeof restoreLocalVideo === "function") {
    await restoreLocalVideo();
  }

  // Initialize audio editor UI listeners (audio.js)
  if (typeof initAudioEditorListeners === "function") {
    initAudioEditorListeners();
  }

  // Video file input and URL listeners in customizer modal (video.js)
  if (typeof initVideoEditorListeners === "function") {
    initVideoEditorListeners();
  }

  // ─── RESTORED GOLDEN VERSION DATE PICKER ───
  const bDateInput = document.getElementById("input-birthdate");
  if (bDateInput) {
    bDateInput.addEventListener("click", () => {
      if (typeof bDateInput.showPicker === "function") {
        try { bDateInput.showPicker(); } catch (err) {}
      }
    });
  }

  initMusicWidget();

  initShare();

  if (typeof window.initCustomizerModal === "function") {
    window.initCustomizerModal();
  } else if (typeof initCustomizerModal === "function") {
    initCustomizerModal();
  }

  initReveal();

  runLoadingSequence();

  initGyro();

  // progressive enhancement — never blocks the experience, hard failsafe below
  const enhancementTimeout = new Promise((res) => setTimeout(res, 4500));

  await Promise.race([loadEnhancements(), enhancementTimeout]);

  if (hasGSAP) {
    document.querySelectorAll(".reveal").forEach((el) => {
      gsap.set(el, { clearProps: "transform,opacity,filter" });
    });
  }
})();

