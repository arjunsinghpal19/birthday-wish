/**
 * ============================================================================
 * MODULE: Customizer Video Wish Editor (js/modules/editor/video.js)
 * Phase 12 Extraction + UX Hotfix
 *
 * Purpose:
 * Owns Customizer Video Wish editor and video media handling, including
 * IndexedDB storage/retrieval via VideoStorage, Supabase Cloud Storage uploads,
 * non-blocking local fallback, blob URL lifecycle management, video removal,
 * YouTube video URL clearing, video source separation (Supabase URLs never populate
 * YouTube input), immediate Video B instant preview, and video start-time seekbar.
 *
 * Owns:
 * - VideoStorage (IndexedDB database wrapper for video blobs)
 * - isYouTubeVideoUrl()
 * - parseTimeToSeconds(), formatSecondsToMMSS()
 * - restoreLocalVideo()
 * - updateVideoWishUI()
 * - initVideoEditorListeners()
 * ============================================================================
 */

(function (root) {
  "use strict";

  /**
   * Safe helper resolving global CONFIG object across window/script scopes.
   */
  function getConfig() {
    if (typeof CONFIG !== "undefined") return CONFIG;
    if (root.CONFIG) return root.CONFIG;
    return {};
  }

  /**
   * Checks whether a URL is a valid YouTube or YouTube Shorts link.
   */
  function isYouTubeVideoUrl(url) {
    if (!url || typeof url !== "string") return false;
    const lower = url.toLowerCase();
    return lower.includes("youtube.com") || lower.includes("youtu.be");
  }

  /**
   * Parses time input (e.g., "30", ":30", "1:15", "1.30", "1m15s") into total seconds.
   */
  function parseTimeToSeconds(input) {
    if (typeof input === "number") return isNaN(input) ? 0 : Math.max(0, Math.floor(input));
    if (!input || typeof input !== "string") return 0;
    const str = input.trim();
    if (!str) return 0;

    if (str.includes(":")) {
      const parts = str.split(":");
      const m = parseInt(parts[0], 10) || 0;
      const s = parseInt(parts[1], 10) || 0;
      return Math.max(0, m * 60 + s);
    }
    if (str.includes(".")) {
      const parts = str.split(".");
      const m = parseInt(parts[0], 10) || 0;
      const s = parseInt(parts[1], 10) || 0;
      return Math.max(0, m * 60 + s);
    }
    if (str.includes("m") || str.includes("s")) {
      const mMatch = str.match(/(\d+)m/);
      const sMatch = str.match(/(\d+)s/);
      const m = mMatch ? parseInt(mMatch[1], 10) || 0 : 0;
      const s = sMatch ? parseInt(sMatch[1], 10) || 0 : 0;
      return Math.max(0, m * 60 + s);
    }
    const sec = parseInt(str, 10);
    return isNaN(sec) ? 0 : Math.max(0, sec);
  }

  /**
   * Formats total seconds into MM:SS display string (e.g. 90 -> "01:30").
   */
  function formatSecondsToMMSS(seconds) {
    const total = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // ============================================================
  // INDEXEDDB LOCAL VIDEO STORAGE WRAPPER
  // ============================================================

  const VideoStorage = {
    dbName: "BirthdayWishVideoDB",
    storeName: "videos",

    openDB() {
      return new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") {
          return reject(new Error("IndexedDB is not available in this environment"));
        }
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },

    async saveVideo(file) {
      try {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.storeName, "readwrite");
          tx.objectStore(this.storeName).put(file, "customVideo");
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (e) {}
    },

    async getVideo() {
      try {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.storeName, "readonly");
          const req = tx.objectStore(this.storeName).get("customVideo");
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      } catch (e) { return null; }
    },

    async removeVideo() {
      try {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.storeName, "readwrite");
          tx.objectStore(this.storeName).delete("customVideo");
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (e) {}
    }
  };

  // ============================================================
  // VIDEO EDITOR UI SYNCHRONIZATION & DURATION SEEKBAR
  // ============================================================

  /**
   * Configures and displays the video duration seekbar slider for device videos.
   */
  function setupVideoSeekbar(durationInSec) {
    const wrap = document.getElementById("video-seekbar-wrap");
    const seekbar = document.getElementById("video-start-seekbar");
    const durDisplay = document.getElementById("video-duration-display");
    const seekMaxDisplay = document.getElementById("video-seek-max");
    const timeDisplay = document.getElementById("video-selected-time-display");
    const vidStartInput = document.getElementById("input-video-start");

    if (!wrap || !seekbar) return;

    if (durationInSec && durationInSec > 0) {
      wrap.style.display = "block";
      seekbar.max = Math.floor(durationInSec);
      const mmss = formatSecondsToMMSS(durationInSec);
      if (durDisplay) durDisplay.textContent = `Duration: ${mmss}`;
      if (seekMaxDisplay) seekMaxDisplay.textContent = mmss;

      const currentStartSec = parseTimeToSeconds(vidStartInput ? vidStartInput.value : "");
      seekbar.value = Math.min(currentStartSec, durationInSec);
      const formattedStart = formatSecondsToMMSS(seekbar.value);
      if (timeDisplay) timeDisplay.textContent = formattedStart;
      const updateProg = root.updateSeekbarProgress || (typeof updateSeekbarProgress === "function" ? updateSeekbarProgress : null);
      if (updateProg) updateProg(seekbar);
    } else {
      wrap.style.display = "none";
    }
  }

  const videoDurationCache = new Map();

  /**
   * Detects video duration from a media URL or file object with caching & readyState handling.
   */
  async function detectVideoDuration(mediaUrl) {
    if (!mediaUrl) return 0;

    const cfg = getConfig();

    if (videoDurationCache.has(mediaUrl)) {
      const cachedDur = videoDurationCache.get(mediaUrl);
      if (cfg.videoWish) cfg.videoWish.duration = cachedDur;
      setupVideoSeekbar(cachedDur);
      return cachedDur;
    }

    if (cfg.videoWish && cfg.videoWish.duration && cfg.videoWish.duration > 0) {
      videoDurationCache.set(mediaUrl, cfg.videoWish.duration);
      setupVideoSeekbar(cfg.videoWish.duration);
      return cfg.videoWish.duration;
    }

    return new Promise((resolve) => {
      const tempVid = document.createElement("video");
      tempVid.preload = "metadata";

      let done = false;
      const handleLoaded = () => {
        if (done) return;
        done = true;
        if (tempVid.duration && !isNaN(tempVid.duration) && Number.isFinite(tempVid.duration) && tempVid.duration > 0) {
          const dur = Math.floor(tempVid.duration);
          videoDurationCache.set(mediaUrl, dur);
          if (cfg.videoWish) cfg.videoWish.duration = dur;
          setupVideoSeekbar(dur);
          resolve(dur);
        } else {
          resolve(0);
        }
      };

      const handleError = () => {
        if (done) return;
        done = true;
        resolve(0);
      };

      tempVid.addEventListener("loadedmetadata", handleLoaded, { once: true });
      tempVid.addEventListener("error", handleError, { once: true });
      tempVid.src = mediaUrl;

      if (tempVid.readyState >= 1) {
        handleLoaded();
      } else {
        try { tempVid.load(); } catch (e) { handleError(); }
      }
    });
  }

  /**
   * Detects YouTube video duration via official YouTube IFrame Player API.
   */
  async function detectYouTubeVideoDuration(ytUrl) {
    if (!isYouTubeVideoUrl(ytUrl)) return;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = ytUrl.match(regExp);
    const ytId = (match && match[2].length === 11) ? match[2] : null;
    if (!ytId) return;

    try {
      const loadFn = root.loadYouTubeIFrameAPI || (typeof loadYouTubeIFrameAPI === "function" ? loadYouTubeIFrameAPI : null);
      if (!loadFn) return;
      const YT = await loadFn();
      if (!YT || !YT.Player) return;

      let probeDiv = document.getElementById("yt-video-probe-container");
      if (!probeDiv) {
        probeDiv = document.createElement("div");
        probeDiv.id = "yt-video-probe-container";
        probeDiv.style.cssText = "position:fixed;bottom:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
        document.body.appendChild(probeDiv);
      }
      probeDiv.innerHTML = `<div id="yt-video-probe-player"></div>`;

      new YT.Player("yt-video-probe-player", {
        videoId: ytId,
        events: {
          onReady: (event) => {
            const dur = Math.floor(event.target.getDuration() || 0);
            if (dur > 0) {
              const cfg = getConfig();
              const startSec = parseTimeToSeconds(cfg.videoWish?.startTime);
              if (startSec > dur && cfg.videoWish) {
                const clamped = formatSecondsToMMSS(dur);
                cfg.videoWish.startTime = clamped;
                const vidStartInput = document.getElementById("input-video-start");
                if (vidStartInput) vidStartInput.value = clamped;
              }
              setupVideoSeekbar(dur);
            } else {
              setupVideoSeekbar(0);
            }
          },
          onError: () => {
            setupVideoSeekbar(0);
          }
        }
      });
    } catch(e) {
      setupVideoSeekbar(0);
    }
  }

  /**
   * Updates Video Wish Customizer input elements (text, remove button, YouTube URL field, seekbar)
   * based on current CONFIG.videoWish state.
   */
  function updateVideoWishUI() {
    const cfg = getConfig();
    const videoWish = cfg.videoWish || {};
    const hasCustomVid = videoWish.file || (typeof videoWish.url === "string" && videoWish.url.startsWith("blob:")) || videoWish.fileName;

    const vidText = document.getElementById("video-upload-text");
    if (vidText) {
      vidText.textContent = hasCustomVid ? `📹 Attached: ${(videoWish.fileName || "video").substring(0, 18)}` : `📹 Select Video from Device`;
    }
    const vidRemoveBtn = document.getElementById("remove-video-file-btn");
    if (vidRemoveBtn) {
      vidRemoveBtn.style.display = hasCustomVid ? "inline-block" : "none";
    }

    // Populate YouTube URL field ONLY if current URL is a genuine YouTube link
    const vidUrlInput = document.getElementById("input-video-url");
    if (vidUrlInput) {
      const urlVal = videoWish.url || "";
      vidUrlInput.value = isYouTubeVideoUrl(urlVal) ? urlVal : "";
    }

    // Populate start time field if set
    const vidStartInput = document.getElementById("input-video-start");
    if (vidStartInput && videoWish.startTime !== undefined) {
      const sec = parseTimeToSeconds(videoWish.startTime);
      if (sec > 0) {
        vidStartInput.value = formatSecondsToMMSS(sec);
      }
    }

    // Priority 1: If videoWish.duration is already saved > 0, initialize seekbar immediately!
    if (videoWish.duration && videoWish.duration > 0 && !isYouTubeVideoUrl(videoWish.url)) {
      setupVideoSeekbar(videoWish.duration);
    }

    // Detect duration for attached video media or YouTube video
    const activeMedia = videoWish.file || (typeof videoWish.url === "string" && !isYouTubeVideoUrl(videoWish.url) ? videoWish.url : null);
    if (activeMedia) {
      detectVideoDuration(activeMedia).then((dur) => {
        if (dur > 0) setupVideoSeekbar(dur);
      });
    } else if (isYouTubeVideoUrl(videoWish.url)) {
      detectYouTubeVideoDuration(videoWish.url);
    } else {
      setupVideoSeekbar(0);
    }
  }

  /**
   * Restores locally stored IndexedDB video blob if CONFIG is unconfigured or points to an expired blob URL.
   */
  async function restoreLocalVideo() {
    const cfg = getConfig();
    if (!cfg.videoWish?.url || (typeof cfg.videoWish.url === "string" && cfg.videoWish.url.startsWith("blob:"))) {
      try {
        const savedVidBlob = await VideoStorage.getVideo();
        if (savedVidBlob) {
          const revokeFn = root.revokeMediaBlobUrl || (typeof revokeMediaBlobUrl === "function" ? revokeMediaBlobUrl : null);
          if (revokeFn) revokeFn(cfg.videoWish?.file || cfg.videoWish?.url);
          const blobUrl = URL.createObjectURL(savedVidBlob);
          const vidName = savedVidBlob.name || cfg.videoWish?.fileName || "video.mp4";
          const existingDur = cfg.videoWish?.duration || 0;
          const existingStart = cfg.videoWish?.startTime || "";
          cfg.videoWish = cfg.videoWish || {};
          cfg.videoWish.file = blobUrl;
          cfg.videoWish.url = blobUrl;
          cfg.videoWish.fileName = vidName;
          cfg.videoWish.duration = existingDur;
          cfg.videoWish.startTime = existingStart;

          const resolvedDur = await detectVideoDuration(blobUrl);
          if (resolvedDur > 0) {
            cfg.videoWish.duration = resolvedDur;
            setupVideoSeekbar(resolvedDur);
          }

          updateVideoWishUI();
          const renderVidFn = root.renderVideoWishSection || (typeof renderVideoWishSection === "function" ? renderVideoWishSection : null);
          if (renderVidFn) renderVidFn();
        }
      } catch (e) {}
    }
  }

  // ============================================================
  // VIDEO EDITOR EVENT LISTENERS
  // ============================================================

  /**
   * Binds Customizer Video Wish input listeners (file change, remove button, clear URL button, seekbar).
   */
  function initVideoEditorListeners() {
    const vidFileInput = document.getElementById("input-video-file");
    const vidRemoveBtn = document.getElementById("remove-video-file-btn");
    const vidUploadText = document.getElementById("video-upload-text");
    const clearVidUrlBtn = document.getElementById("clear-video-url-btn");
    const vidStartInput = document.getElementById("input-video-start");
    const seekbar = document.getElementById("video-start-seekbar");
    const timeDisplay = document.getElementById("video-selected-time-display");

    const toastFn = (msg) => {
      const fn = root.showToast || (typeof showToast === "function" ? showToast : null);
      if (fn) fn(msg);
    };
    const renderVidFn = () => {
      const fn = root.renderVideoWishSection || (typeof renderVideoWishSection === "function" ? renderVideoWishSection : null);
      if (fn) fn();
    };
    const revokeFn = (url) => {
      const fn = root.revokeMediaBlobUrl || (typeof revokeMediaBlobUrl === "function" ? revokeMediaBlobUrl : null);
      if (fn) fn(url);
    };

    // Video Seekbar Slider Input Listener
    if (seekbar) {
      seekbar.addEventListener("input", () => {
        const sec = parseInt(seekbar.value, 10) || 0;
        const formatted = formatSecondsToMMSS(sec);
        if (vidStartInput) vidStartInput.value = formatted;
        if (timeDisplay) timeDisplay.textContent = formatted;
        const cfg = getConfig();
        cfg.videoWish = cfg.videoWish || {};
        cfg.videoWish.startTime = formatted;
        const updateProg = root.updateSeekbarProgress || (typeof updateSeekbarProgress === "function" ? updateSeekbarProgress : null);
        if (updateProg) updateProg(seekbar);
        renderVidFn();
      });
    }

    // Manual Video Start Time Input Listener
    if (vidStartInput) {
      const syncManualStartLive = () => {
        const val = vidStartInput.value;
        if (val === undefined || val === null) return;
        const sec = parseTimeToSeconds(val);
        const maxSec = seekbar ? (parseInt(seekbar.max, 10) || sec) : sec;
        const clampedSec = Math.min(sec, maxSec);
        if (seekbar) {
          seekbar.value = clampedSec;
          const updateProg = root.updateSeekbarProgress || (typeof updateSeekbarProgress === "function" ? updateSeekbarProgress : null);
          if (updateProg) updateProg(seekbar);
        }
        const formatted = formatSecondsToMMSS(clampedSec);
        if (timeDisplay) timeDisplay.textContent = formatted;
        const cfg = getConfig();
        cfg.videoWish = cfg.videoWish || {};
        cfg.videoWish.startTime = val;
        renderVidFn();
      };

      const syncManualStartBlur = () => {
        const val = vidStartInput.value;
        const sec = parseTimeToSeconds(val);
        const formatted = formatSecondsToMMSS(sec);
        vidStartInput.value = formatted;
        if (seekbar) {
          seekbar.value = Math.min(sec, parseInt(seekbar.max, 10) || sec);
          const updateProg = root.updateSeekbarProgress || (typeof updateSeekbarProgress === "function" ? updateSeekbarProgress : null);
          if (updateProg) updateProg(seekbar);
        }
        if (timeDisplay) timeDisplay.textContent = formatted;
        const cfg = getConfig();
        cfg.videoWish = cfg.videoWish || {};
        cfg.videoWish.startTime = formatted;
        renderVidFn();
      };

      vidStartInput.addEventListener("input", syncManualStartLive);
      vidStartInput.addEventListener("change", syncManualStartBlur);
      vidStartInput.addEventListener("blur", syncManualStartBlur);
    }

    // Device Video File Change Listener
    if (vidFileInput) {
      vidFileInput.addEventListener("change", async (e) => {
        const f = e.target.files[0];
        if (!f) return;

        // ISSUE 2 FIX: Immediately clear YouTube input and activate instant local video preview for Video B
        const vidUrlInput = document.getElementById("input-video-url");
        if (vidUrlInput) vidUrlInput.value = "";

        const cfg = getConfig();
        const prevMedia = cfg.videoWish?.file || cfg.videoWish?.url;
        if (typeof prevMedia === "string" && prevMedia.startsWith("blob:")) {
          revokeFn(prevMedia);
        }

        const localBlobUrl = URL.createObjectURL(f);
        cfg.videoWish = cfg.videoWish || {};
        cfg.videoWish.file = localBlobUrl;
        cfg.videoWish.url = localBlobUrl;
        cfg.videoWish.fileName = f.name;

        if (vidRemoveBtn) vidRemoveBtn.style.display = "inline-block";
        if (vidUploadText) vidUploadText.textContent = `📹 Attached: ${f.name.substring(0, 18)}`;

        // Instantly detect duration and update seekbar + preview
        detectVideoDuration(localBlobUrl);
        renderVidFn();

        toastFn("Uploading video to Supabase Storage... ☁️");

        // Background Cloud Upload
        const uploadId = "video_" + Date.now();
        const uploadPromise = (async () => {
          let cloudUrl = null;
          if (root.StorageModule || typeof StorageModule !== "undefined") {
            const storageMod = root.StorageModule || StorageModule;
            cloudUrl = await storageMod.uploadMedia(f, "videos");
          }
          return { cloudUrl, f };
        })();

        root.pendingUploadsMap = root.pendingUploadsMap || new Map();
        root.pendingUploadsMap.set(uploadId, uploadPromise);

        let result = null;
        try {
          result = await uploadPromise;
        } finally {
          root.pendingUploadsMap.delete(uploadId);
        }

        const cloudUrl = result ? result.cloudUrl : null;
        if (cloudUrl) {
          revokeFn(localBlobUrl);
          cfg.videoWish.url = cloudUrl;
          cfg.videoWish.file = cloudUrl;
          cfg.videoWish.fileName = f.name;
          toastFn("Video uploaded & saved to Cloud! ☁️📹");
        } else {
          await VideoStorage.saveVideo(f);
          toastFn("Video attached locally 📹");
        }

        renderVidFn();
      });
    }

    // Remove Video Button Listener
    if (vidRemoveBtn) {
      vidRemoveBtn.addEventListener("click", async () => {
        const cfg = getConfig();
        revokeFn(cfg.videoWish?.file || cfg.videoWish?.url);
        if (cfg.videoWish) {
          cfg.videoWish.file = null;
          cfg.videoWish.url = "";
          cfg.videoWish.fileName = null;
          cfg.videoWish.startTime = "";
          cfg.videoWish.duration = 0;
        }
        await VideoStorage.removeVideo();
        if (vidFileInput) vidFileInput.value = "";
        if (vidUploadText) vidUploadText.textContent = `📹 Select Video from Device`;
        if (vidStartInput) vidStartInput.value = "";
        const vidUrlInput = document.getElementById("input-video-url");
        if (vidUrlInput) vidUrlInput.value = "";
        vidRemoveBtn.style.display = "none";
        setupVideoSeekbar(0);
        renderVidFn();
        toastFn("Video removed ✨");
      });
    }

    // YouTube URL Input Listener (Fix 2 & Fix 3: Mutually Exclusive YouTube vs Device Source)
    const vidUrlInput = document.getElementById("input-video-url");
    if (vidUrlInput) {
      const handleUrlInput = () => {
        const val = vidUrlInput.value.trim();
        const cfg = getConfig();
        cfg.videoWish = cfg.videoWish || {};
        if (val && isYouTubeVideoUrl(val)) {
          // Explicitly switch to YouTube source -> clear device video state
          if (cfg.videoWish.file) {
            revokeFn(cfg.videoWish.file);
            cfg.videoWish.file = null;
            cfg.videoWish.fileName = null;
            try { VideoStorage.removeVideo(); } catch (e) {}
            if (vidFileInput) vidFileInput.value = "";
            if (vidUploadText) vidUploadText.textContent = `📹 Select Video from Device`;
            if (vidRemoveBtn) vidRemoveBtn.style.display = "none";
            setupVideoSeekbar(0);
          }
          cfg.videoWish.url = val;
        } else if (!val) {
          // If YouTube URL field was manually cleared and no device video is active, clear url
          if (!cfg.videoWish.file) {
            cfg.videoWish.url = "";
          }
        }
        renderVidFn();
      };
      vidUrlInput.addEventListener("input", handleUrlInput);
      vidUrlInput.addEventListener("change", handleUrlInput);
    }

    // Clear YouTube URL Button Listener
    if (clearVidUrlBtn) {
      clearVidUrlBtn.addEventListener("click", () => {
        const vidInput = document.getElementById("input-video-url");
        if (vidInput) vidInput.value = "";
        const cfg = getConfig();
        cfg.videoWish = cfg.videoWish || {};

        const hasDeviceVideo = !!(cfg.videoWish.file || (cfg.videoWish.url && !isYouTubeVideoUrl(cfg.videoWish.url)));

        if (hasDeviceVideo) {
          // Device video is active -> ONLY clear YouTube link input field, PRESERVE device video, startTime, seekbar
          cfg.videoWish.url = cfg.videoWish.file;
          toastFn("YouTube link cleared ✨");
        } else {
          // YouTube video was active -> clear YouTube state & startTime & hide seekbar
          cfg.videoWish.url = "";
          cfg.videoWish.startTime = "";
          cfg.videoWish.duration = 0;
          if (vidStartInput) vidStartInput.value = "";
          setupVideoSeekbar(0);
          renderVidFn();
          toastFn("Video link & start time cleared ✨");
        }
      });
    }
  }

  // Export public symbols globally on root (window)
  root.VideoStorage = VideoStorage;
  root.isYouTubeVideoUrl = isYouTubeVideoUrl;
  root.parseTimeToSeconds = parseTimeToSeconds;
  root.formatSecondsToMMSS = formatSecondsToMMSS;
  root.setupVideoSeekbar = setupVideoSeekbar;
  root.updateVideoWishUI = updateVideoWishUI;
  root.restoreLocalVideo = restoreLocalVideo;
  root.initVideoEditorListeners = initVideoEditorListeners;

})(typeof window !== "undefined" ? window : globalThis);
