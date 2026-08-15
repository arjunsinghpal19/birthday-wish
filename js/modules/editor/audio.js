/**
 * ============================================================================
 * AUDIO EDITOR CONTROLLER MODULE (js/modules/editor/audio.js)
 * Single owner of Audio Storage, Duration Detection, Seekbar Setup, and Audio UI Listeners.
 * ============================================================================
 */

(function (root) {
  "use strict";

  // Helper to safely access global configuration
  function getConfig() {
    return typeof CONFIG !== "undefined" ? CONFIG : root.CONFIG || {};
  }

  // Helper to safely display toast notifications
  function toast(msg) {
    const fn = root.showToast || (typeof showToast === "function" ? showToast : (m) => console.log(m));
    fn(msg);
  }

  // ============================================================
  // 1. AUDIO INDEXEDDB STORAGE (AudioStorage)
  // ============================================================

  const AudioStorage = {
    dbName: "BirthdayWishAudioDB",
    storeName: "audios",
    async openDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore(this.storeName);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },
    async saveAudio(file) {
      try {
        const db = await this.openDB();
        const tx = db.transaction(this.storeName, "readwrite");
        tx.objectStore(this.storeName).put(file, "customAudio");
        return new Promise((res) => { tx.oncomplete = () => res(true); });
      } catch(e) { return false; }
    },
    async getAudio() {
      try {
        const db = await this.openDB();
        const tx = db.transaction(this.storeName, "readonly");
        const req = tx.objectStore(this.storeName).get("customAudio");
        return new Promise((res) => { req.onsuccess = () => res(req.result); });
      } catch(e) { return null; }
    },
    async removeAudio() {
      try {
        const db = await this.openDB();
        const tx = db.transaction(this.storeName, "readwrite");
        tx.objectStore(this.storeName).delete("customAudio");
      } catch(e){}
    }
  };

  // ============================================================
  // 2. SHARED MEDIA & SEEKBAR HELPERS
  // ============================================================

  /**
   * Safely revokes blob URLs to prevent memory leaks.
   */
  function revokeMediaBlobUrl(url) {
    if (typeof url === "string" && url.startsWith("blob:")) {
      try { URL.revokeObjectURL(url); } catch(e) {}
    }
  }

  /**
   * Updates range slider progress fill CSS custom property (--seek-progress).
   * Shared by both Audio and Video seekbars.
   */
  function updateSeekbarProgress(seekbar, trackLine) {
    if (!seekbar) return;
    const track = trackLine || (seekbar.parentElement ? seekbar.parentElement.querySelector(".seekbar-track-line") : null);
    if (!track) return;

    const val = parseFloat(seekbar.value) || 0;
    const max = parseFloat(seekbar.max) || 100;
    const pct = max > 0 ? Math.min(100, Math.max(0, (val / max) * 100)) : 0;

    track.style.setProperty("--seek-progress", `${pct}%`);
  }

  /**
   * Configures visibility, max duration, and position of Audio Start Time seekbar.
   */
  function setupAudioSeekbar(durationInSec) {
    const wrap = document.getElementById("audio-seekbar-wrap");
    const seekbar = document.getElementById("audio-start-seekbar");
    const durDisplay = document.getElementById("audio-duration-display");
    const seekMaxDisplay = document.getElementById("audio-seek-max");
    const timeDisplay = document.getElementById("audio-selected-time-display");
    const musicStartInput = document.getElementById("input-music-start");
    const cfg = getConfig();

    if (!wrap || !seekbar) return;

    const parseFn = typeof root.parseTimeToSeconds === "function" ? root.parseTimeToSeconds : (s) => parseInt(s) || 0;
    const fmtFn = typeof root.formatSecondsToMMSS === "function" ? root.formatSecondsToMMSS : (s) => String(s);

    if (durationInSec && durationInSec > 0) {
      wrap.style.display = "block";
      seekbar.max = Math.floor(durationInSec);
      const mmss = fmtFn(durationInSec);
      if (durDisplay) durDisplay.textContent = `Duration: ${mmss}`;
      if (seekMaxDisplay) seekMaxDisplay.textContent = mmss;

      const rawStart = (musicStartInput && musicStartInput.value) ? musicStartInput.value : (cfg.music?.startTime || "");
      const currentStartSec = parseFn(rawStart);
      seekbar.value = Math.min(currentStartSec, durationInSec);
      const formattedStart = fmtFn(seekbar.value);
      if (timeDisplay) timeDisplay.textContent = formattedStart;
      if (musicStartInput && !musicStartInput.value) musicStartInput.value = formattedStart;

      updateSeekbarProgress(seekbar);
    } else {
      wrap.style.display = "none";
    }
  }

  // ============================================================
  // 3. DURATION DETECTION PROBES
  // ============================================================

  const audioDurationCache = new Map();

  /**
   * Detects HTML5 Audio duration in seconds via metadata loading.
   */
  async function detectAudioDuration(audioUrl) {
    if (!audioUrl) return 0;
    const cfg = getConfig();

    if (audioDurationCache.has(audioUrl)) {
      const dur = audioDurationCache.get(audioUrl);
      if (cfg.music) cfg.music.duration = dur;
      setupAudioSeekbar(dur);
      return dur;
    }

    if (cfg.music && cfg.music.duration && cfg.music.duration > 0) {
      audioDurationCache.set(audioUrl, cfg.music.duration);
      setupAudioSeekbar(cfg.music.duration);
      return cfg.music.duration;
    }

    return new Promise((resolve) => {
      const tempAud = new Audio();
      tempAud.preload = "metadata";

      let done = false;
      const handleLoaded = () => {
        if (done) return;
        done = true;
        if (tempAud.duration && !isNaN(tempAud.duration) && Number.isFinite(tempAud.duration) && tempAud.duration > 0) {
          const dur = Math.floor(tempAud.duration);
          audioDurationCache.set(audioUrl, dur);
          if (cfg.music) cfg.music.duration = dur;
          setupAudioSeekbar(dur);
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

      tempAud.addEventListener("loadedmetadata", handleLoaded, { once: true });
      tempAud.addEventListener("error", handleError, { once: true });
      tempAud.src = audioUrl;

      if (tempAud.readyState >= 1) {
        handleLoaded();
      } else {
        try { tempAud.load(); } catch (e) { handleError(); }
      }
    });
  }

  /**
   * Detects YouTube audio duration via official YouTube IFrame Player API.
   */
  async function detectYouTubeAudioDuration(ytUrl) {
    const isYT = (u) => (u && typeof u === "string" && (u.includes("youtube.com/watch") || u.includes("youtube.com/shorts") || u.includes("youtu.be")));
    if (!isYT(ytUrl)) return;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = ytUrl.match(regExp);
    const ytId = (match && match[2].length === 11) ? match[2] : null;
    if (!ytId) return;

    try {
      const loadFn = root.loadYouTubeIFrameAPI || (typeof loadYouTubeIFrameAPI === "function" ? loadYouTubeIFrameAPI : null);
      if (!loadFn) return;
      const YT = await loadFn();
      if (!YT || !YT.Player) return;

      let probeDiv = document.getElementById("yt-audio-probe-container");
      if (!probeDiv) {
        probeDiv = document.createElement("div");
        probeDiv.id = "yt-audio-probe-container";
        probeDiv.style.cssText = "position:fixed;bottom:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
        document.body.appendChild(probeDiv);
      }
      probeDiv.innerHTML = `<div id="yt-audio-probe-player"></div>`;

      new YT.Player("yt-audio-probe-player", {
        videoId: ytId,
        events: {
          onReady: (event) => {
            const dur = Math.floor(event.target.getDuration() || 0);
            if (dur > 0) {
              const cfg = getConfig();
              const parseFn = typeof root.parseTimeToSeconds === "function" ? root.parseTimeToSeconds : (s) => parseInt(s) || 0;
              const fmtFn = typeof root.formatSecondsToMMSS === "function" ? root.formatSecondsToMMSS : (s) => String(s);
              const startSec = parseFn(cfg.music?.startTime);
              if (startSec > dur && cfg.music) {
                const clamped = fmtFn(dur);
                cfg.music.startTime = clamped;
                const musicStartInput = document.getElementById("input-music-start");
                if (musicStartInput) musicStartInput.value = clamped;
              }
              setupAudioSeekbar(dur);
            } else {
              setupAudioSeekbar(0);
            }
          },
          onError: () => {
            setupAudioSeekbar(0);
          }
        }
      });
    } catch(e) {
      setupAudioSeekbar(0);
    }
  }

  // ============================================================
  // 4. AUDIO STATE RESTORATION
  // ============================================================

  /**
   * Restores locally saved IndexedDB voice note if unconfigured or pointing to invalid blob URL.
   */
  async function restoreLocalAudio() {
    const cfg = getConfig();
    const audUploadText = document.getElementById("audio-upload-text");
    const audRemoveBtn = document.getElementById("remove-audio-file-btn");

    if (!cfg.music?.file || cfg.music.file === "assets/music/happy-birthday-song.mpeg" || (typeof cfg.music.file === "string" && cfg.music.file.startsWith("blob:"))) {
      try {
        const savedAudioBlob = await AudioStorage.getAudio();
        if (savedAudioBlob) {
          revokeMediaBlobUrl(cfg.music?.file);
          const blobUrl = URL.createObjectURL(savedAudioBlob);
          const audioName = savedAudioBlob.name || cfg.music?.fileName || "audio.mp3";
          const existingStart = cfg.music?.startTime || "";
          const existingDur = cfg.music?.duration || 0;
          cfg.music = { file: blobUrl, isBlob: true, fileName: audioName, startTime: existingStart, duration: existingDur };
          if (audUploadText) audUploadText.textContent = `🎙️ Attached: ${audioName.substring(0, 18)}`;
          if (audRemoveBtn) audRemoveBtn.style.display = "inline-block";
          const resolvedDur = await detectAudioDuration(blobUrl);
          if (resolvedDur > 0) {
            cfg.music.duration = resolvedDur;
            setupAudioSeekbar(resolvedDur);
          }
          if (root.MusicEngine && typeof root.MusicEngine.isPlaying === "function" && root.MusicEngine.isPlaying()) {
            root.MusicEngine.pause();
            root.MusicEngine.play();
          }
        }
      } catch(e){
        console.warn("Audio restoration note:", e);
      }
    }
  }

  // ============================================================
  // 5. AUDIO EDITOR EVENT LISTENERS INITIALIZATION
  // ============================================================

  /**
   * Binds click, input, and change event listeners to Audio Customizer DOM elements.
   */
  function initAudioEditorListeners() {
    const cfg = getConfig();
    const audFileInput = document.getElementById("input-audio-file");
    const audRemoveBtn = document.getElementById("remove-audio-file-btn");
    const audUploadText = document.getElementById("audio-upload-text");
    const audStartInput = document.getElementById("input-music-start");
    const audSeekbar = document.getElementById("audio-start-seekbar");
    const audTimeDisplay = document.getElementById("audio-selected-time-display");
    const musicUrlInput = document.getElementById("input-music-url");

    // Seekbar range slider drag listener
    if (audSeekbar) {
      audSeekbar.addEventListener("input", () => {
        const sec = parseInt(audSeekbar.value, 10) || 0;
        const fmtFn = typeof root.formatSecondsToMMSS === "function" ? root.formatSecondsToMMSS : (s) => String(s);
        const formatted = fmtFn(sec);
        if (audStartInput) audStartInput.value = formatted;
        if (audTimeDisplay) audTimeDisplay.textContent = formatted;
        cfg.music = cfg.music || {};
        cfg.music.startTime = formatted;
        updateSeekbarProgress(audSeekbar);
      });
    }

    // Manual start-time text input listeners (live sync + blur format)
    if (audStartInput) {
      const parseFn = typeof root.parseTimeToSeconds === "function" ? root.parseTimeToSeconds : (s) => parseInt(s) || 0;
      const fmtFn = typeof root.formatSecondsToMMSS === "function" ? root.formatSecondsToMMSS : (s) => String(s);

      const syncAudioStartLive = () => {
        const val = audStartInput.value;
        if (val === undefined || val === null) return;
        const sec = parseFn(val);
        const maxSec = audSeekbar ? (parseInt(audSeekbar.max, 10) || sec) : sec;
        const clampedSec = Math.min(sec, maxSec);
        if (audSeekbar) {
          audSeekbar.value = clampedSec;
          updateSeekbarProgress(audSeekbar);
        }
        const formatted = fmtFn(clampedSec);
        if (audTimeDisplay) audTimeDisplay.textContent = formatted;
        cfg.music = cfg.music || {};
        cfg.music.startTime = val;
      };

      const syncAudioStartBlur = () => {
        const sec = parseFn(audStartInput.value);
        const formatted = fmtFn(sec);
        audStartInput.value = formatted;
        if (audSeekbar) {
          audSeekbar.value = Math.min(sec, parseInt(audSeekbar.max, 10) || sec);
          updateSeekbarProgress(audSeekbar);
        }
        if (audTimeDisplay) audTimeDisplay.textContent = formatted;
        cfg.music = cfg.music || {};
        cfg.music.startTime = formatted;
      };

      audStartInput.addEventListener("input", syncAudioStartLive);
      audStartInput.addEventListener("change", syncAudioStartBlur);
      audStartInput.addEventListener("blur", syncAudioStartBlur);
    }

    // Device Audio File Upload Listener
    if (audFileInput) {
      audFileInput.addEventListener("change", async (e) => {
        const f = e.target.files[0];
        if (!f) return;

        const wasMusicPlaying = typeof root.MusicEngine !== "undefined" && root.MusicEngine.isPlaying ? root.MusicEngine.isPlaying() : false;

        // Clear YouTube link input field (Mutual Exclusivity)
        if (musicUrlInput) musicUrlInput.value = "";

        const existingStartTime = cfg.music?.startTime || "";
        const prevFile = cfg.music?.file;
        if (prevFile && (prevFile.startsWith("blob:") || cfg.music?.isBlob)) {
          revokeMediaBlobUrl(prevFile);
        }

        const localBlobUrl = URL.createObjectURL(f);
        cfg.music = { file: localBlobUrl, isBlob: true, fileName: f.name, startTime: existingStartTime, duration: cfg.music?.duration || 0 };

        if (audRemoveBtn) audRemoveBtn.style.display = "inline-block";
        if (audUploadText) audUploadText.textContent = `🎙️ Attached: ${f.name.substring(0, 18)}`;

        // Switch live playing MusicEngine to local blob URL immediately
        if (wasMusicPlaying && typeof root.MusicEngine !== "undefined") {
          root.MusicEngine.pause();
          root.MusicEngine.play();
        }

        toast("Uploading audio to Supabase Storage... ☁️");

        const uploadId = "audio_" + Date.now();

        // COMPLETE AUDIO MEDIA STATE TRANSITION PROMISE
        const audioStatePromise = (async () => {
          const durationPromise = detectAudioDuration(localBlobUrl);

          let cloudUrl = null;
          if (window.StorageModule) {
            try {
              cloudUrl = await window.StorageModule.uploadMedia(f, "audio");
            } catch (err) {
              console.warn("Audio cloud upload note:", err);
            }
          }

          let resolvedDur = 0;
          try {
            resolvedDur = await durationPromise;
          } catch (err) {
            resolvedDur = 0;
          }

          const finalDuration = resolvedDur || cfg.music?.duration || 0;

          if (cloudUrl) {
            revokeMediaBlobUrl(localBlobUrl);
            cfg.music = {
              file: cloudUrl,
              isBlob: false,
              fileName: f.name,
              startTime: existingStartTime,
              duration: finalDuration
            };
            if (root.CONFIG) root.CONFIG.music = cfg.music;
            if (finalDuration > 0) setupAudioSeekbar(finalDuration);
            toast("Audio / Voice note uploaded & saved to Cloud! ☁️🎙️");
          } else {
            await AudioStorage.saveAudio(f);
            cfg.music = {
              file: localBlobUrl,
              isBlob: true,
              fileName: f.name,
              startTime: existingStartTime,
              duration: finalDuration
            };
            if (root.CONFIG) root.CONFIG.music = cfg.music;
            if (finalDuration > 0) setupAudioSeekbar(finalDuration);
            toast("Audio attached locally 🎙️");
          }

          if (wasMusicPlaying && typeof root.MusicEngine !== "undefined") {
            root.MusicEngine.pause();
            root.MusicEngine.play();
          }

          return cfg.music;
        })();

        window.pendingUploadsMap = window.pendingUploadsMap || new Map();
        window.pendingUploadsMap.set(uploadId, audioStatePromise);

        try {
          await audioStatePromise;
        } finally {
          window.pendingUploadsMap.delete(uploadId);
        }
      });
    }

    // YouTube Audio URL Listener (Mutually Exclusive YouTube vs Device Audio Source)
    if (musicUrlInput) {
      const handleMusicUrlInput = () => {
        const val = musicUrlInput.value.trim();
        const isYT = (u) => (u && typeof u === "string" && (u.includes("youtube.com/watch") || u.includes("youtube.com/shorts") || u.includes("youtu.be")));
        cfg.music = cfg.music || {};
        const wasMusicPlaying = typeof root.MusicEngine !== "undefined" && root.MusicEngine.isPlaying ? root.MusicEngine.isPlaying() : false;

        if (val && isYT(val)) {
          const curFile = cfg.music?.file;
          if (curFile && (curFile.startsWith("blob:") || cfg.music?.isBlob)) {
            revokeMediaBlobUrl(curFile);
          }
          try { AudioStorage.removeAudio(); } catch (e) {}
          if (audFileInput) audFileInput.value = "";
          if (audUploadText) audUploadText.textContent = `🎙️ Select Audio / Voice Note`;
          if (audRemoveBtn) audRemoveBtn.style.display = "none";
          setupAudioSeekbar(0);

          const existingStart = cfg.music?.startTime || "";
          cfg.music = { file: val, isBlob: false, fileName: null, startTime: existingStart };

          if (typeof detectYouTubeAudioDuration === "function") {
            detectYouTubeAudioDuration(val);
          }

          if (wasMusicPlaying && typeof root.MusicEngine !== "undefined") {
            root.MusicEngine.pause();
            root.MusicEngine.play();
          }
        } else if (!val) {
          // If manually deleted and no device audio active, restore default birthday song
          const isDeviceAudio = cfg.music?.isBlob || (typeof cfg.music?.file === "string" && (cfg.music.file.startsWith("blob:") || cfg.music.file.includes("supabase.co"))) || cfg.music?.fileName;
          if (!isDeviceAudio) {
            const existingStart = cfg.music?.startTime || "";
            cfg.music = { file: "assets/music/happy-birthday-song.mpeg", startTime: existingStart };
            if (wasMusicPlaying && typeof root.MusicEngine !== "undefined") {
              root.MusicEngine.pause();
              root.MusicEngine.play();
            }
          }
        }
      };
      musicUrlInput.addEventListener("input", handleMusicUrlInput);
      musicUrlInput.addEventListener("change", handleMusicUrlInput);
    }

    // Device Audio Remove Button Click Listener
    if (audRemoveBtn) {
      audRemoveBtn.addEventListener("click", async () => {
        revokeMediaBlobUrl(cfg.music?.file);
        await AudioStorage.removeAudio();
        if (audFileInput) audFileInput.value = "";
        if (audUploadText) audUploadText.textContent = `🎙️ Select Audio / Voice Note`;
        audRemoveBtn.style.display = "none";

        const ytVal = musicUrlInput ? musicUrlInput.value.trim() : "";
        const isYT = (u) => (u && typeof u === "string" && (u.includes("youtube.com/watch") || u.includes("youtube.com/shorts") || u.includes("youtu.be")));

        if (ytVal && isYT(ytVal)) {
          // Device audio removed, but YouTube URL is active -> preserve YouTube source
          cfg.music = { file: ytVal, isBlob: false, fileName: null, startTime: cfg.music?.startTime || "" };
          if (typeof detectYouTubeAudioDuration === "function") detectYouTubeAudioDuration(ytVal);
        } else {
          // No custom audio source remaining -> restore default happy birthday song & clear startTime
          cfg.music = { file: "assets/music/happy-birthday-song.mpeg", startTime: "", duration: 0 };
          if (root.CONFIG) root.CONFIG.music = cfg.music;
          const musicStartInput = document.getElementById("input-music-start");
          if (musicStartInput) musicStartInput.value = "";
          setupAudioSeekbar(0);
          if (typeof root.MusicEngine !== "undefined" && root.MusicEngine.pause) root.MusicEngine.pause();
          toast("Custom audio removed — Default melody restored 🎵");
        }
      });
    }
  }

  // ============================================================
  // 6. PUBLIC API EXPORTS
  // ============================================================

  root.AudioStorage = AudioStorage;
  root.revokeMediaBlobUrl = revokeMediaBlobUrl;
  root.updateSeekbarProgress = updateSeekbarProgress;
  root.setupAudioSeekbar = setupAudioSeekbar;
  root.detectAudioDuration = detectAudioDuration;
  root.detectYouTubeAudioDuration = detectYouTubeAudioDuration;
  root.restoreLocalAudio = restoreLocalAudio;
  root.initAudioEditorListeners = initAudioEditorListeners;

})(typeof window !== "undefined" ? window : globalThis);
