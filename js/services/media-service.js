/**
 * ============================================================================
 * SHARED MEDIA SERVICE (js/services/media-service.js)
 * Reusable Media Compression, Format Probing & Duration Detection Services.
 * ============================================================================
 */

(function (root) {
  "use strict";

  const audioDurationCache = new Map();
  const videoDurationCache = new Map();

  /**
   * Asynchronously compresses an image file using HTML5 canvas before storage/upload.
   * @param {File} file - User-selected image file.
   * @param {number} [maxSide=350] - Maximum dimension for scaling down image width/height.
   * @param {number} [quality=0.5] - Compression quality factor (0.0 to 1.0).
   * @returns {Promise<string|null>} Data URL string of compressed image.
   */
  function compressImageFile(file, maxSide = 350, quality = 0.5) {
    return new Promise((resolve) => {
      if (!file || typeof FileReader === "undefined") return resolve(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof Image === "undefined") return resolve(e.target.result);
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxSide || h > maxSide) {
            if (w > h) {
              h = Math.round((h * maxSide) / w);
              w = maxSide;
            } else {
              w = Math.round((w * maxSide) / h);
              h = maxSide;
            }
          }
          if (typeof document === "undefined" || !document.createElement) {
            return resolve(e.target.result);
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext ? canvas.getContext("2d") : null;
          if (!ctx) return resolve(e.target.result);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Detects HTML5 Audio duration in seconds via metadata loading.
   * @param {string} audioUrl - Audio URL string.
   * @returns {Promise<number>} Detected duration in integer seconds (or 0).
   */
  async function detectAudioDuration(audioUrl) {
    if (!audioUrl || typeof audioUrl !== "string") return 0;
    if (audioDurationCache.has(audioUrl)) {
      return audioDurationCache.get(audioUrl);
    }

    return new Promise((resolve) => {
      if (typeof Audio === "undefined") return resolve(0);
      const tempAud = new Audio();
      tempAud.preload = "metadata";

      let done = false;
      const handleLoaded = () => {
        if (done) return;
        done = true;
        if (tempAud.duration && !isNaN(tempAud.duration) && Number.isFinite(tempAud.duration) && tempAud.duration > 0) {
          const dur = Math.floor(tempAud.duration);
          audioDurationCache.set(audioUrl, dur);
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
   * Detects HTML5 Video duration in seconds via metadata loading.
   * @param {string} videoUrl - Video URL string.
   * @returns {Promise<number>} Detected duration in integer seconds (or 0).
   */
  async function detectVideoDuration(videoUrl) {
    if (!videoUrl || typeof videoUrl !== "string") return 0;
    if (videoDurationCache.has(videoUrl)) {
      return videoDurationCache.get(videoUrl);
    }

    return new Promise((resolve) => {
      if (typeof document === "undefined" || !document.createElement) return resolve(0);
      const tempVid = document.createElement("video");
      tempVid.preload = "metadata";

      let done = false;
      const handleLoaded = () => {
        if (done) return;
        done = true;
        if (tempVid.duration && !isNaN(tempVid.duration) && Number.isFinite(tempVid.duration) && tempVid.duration > 0) {
          const dur = Math.floor(tempVid.duration);
          videoDurationCache.set(videoUrl, dur);
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
      tempVid.src = videoUrl;

      if (tempVid.readyState >= 1) {
        handleLoaded();
      } else {
        try { tempVid.load(); } catch (e) { handleError(); }
      }
    });
  }

  /**
   * Checks whether a URL is a valid YouTube or YouTube Shorts link.
   * @param {string} url - URL string to check.
   * @returns {boolean} True if YouTube video link.
   */
  function isYouTubeVideoUrl(url) {
    if (!url || typeof url !== "string") return false;
    const lower = url.toLowerCase();
    return lower.includes("youtube.com") || lower.includes("youtu.be");
  }

  /**
   * Extracts the 11-character YouTube video ID from various YouTube URL formats.
   * @param {string} url - YouTube URL.
   * @returns {string|null} 11-character video ID or null.
   */
  function extractYouTubeId(url) {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  }

  /**
   * Converts a base64/data URL into a standard binary Blob instance for storage upload.
   * @param {string} dataurl - Base64 data URL string.
   * @returns {Blob|null} Binary Blob object or null on error.
   */
  function dataURLtoBlob(dataurl) {
    if (!dataurl || typeof dataurl !== "string") return null;
    try {
      const arr = dataurl.split(",");
      if (arr.length < 2) return null;
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.warn("⚠️ dataURLtoBlob failed:", e);
      return null;
    }
  }

  /**
   * Encodes non-zero start time into URL fragment marker #bw-start=SEC.
   * If startSeconds <= 0, returns clean URL without #bw-start marker.
   * @param {string} url - Base media URL.
   * @param {number|string} startSeconds - Start time offset in seconds or MM:SS.
   * @returns {string} Clean URL with optional #bw-start=SEC fragment.
   */
  function encodeMediaStartTime(url, startSeconds) {
    if (!url || typeof url !== "string") return "";
    const cleanUrl = stripMediaMetadata(url);
    if (!cleanUrl) return "";

    let sec = 0;
    if (typeof startSeconds === "number") {
      sec = isNaN(startSeconds) ? 0 : Math.max(0, Math.floor(startSeconds));
    } else if (typeof startSeconds === "string") {
      if (root.TimeUtils && typeof root.TimeUtils.parseTimeToSeconds === "function") {
        sec = root.TimeUtils.parseTimeToSeconds(startSeconds);
      } else if (typeof root.parseTimeToSeconds === "function") {
        sec = root.parseTimeToSeconds(startSeconds);
      } else if (startSeconds.includes(":")) {
        const parts = startSeconds.split(":");
        sec = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
      } else {
        sec = parseInt(startSeconds, 10) || 0;
      }
    }

    if (sec > 0) {
      return `${cleanUrl}#bw-start=${sec}`;
    }
    return cleanUrl;
  }

  /**
   * Decodes start time in integer seconds from URL fragment marker #bw-start=SEC.
   * Returns 0 if marker is absent.
   * @param {string} url - Media URL.
   * @returns {number} Decoded start offset in integer seconds (0 if none).
   */
  function decodeMediaStartTime(url) {
    if (!url || typeof url !== "string") return 0;
    const match = url.match(/#bw-start=(\d+)/i);
    if (match && match[1]) {
      return parseInt(match[1], 10) || 0;
    }
    return 0;
  }

  /**
   * Strips the #bw-start=SEC metadata fragment from a URL for playback or user-facing display.
   * @param {string} url - Raw media URL.
   * @returns {string} Clean media URL without fragment metadata.
   */
  function stripMediaMetadata(url) {
    if (!url || typeof url !== "string") return "";
    return url.replace(/#bw-start=\d+/i, "").replace(/#+$/, "").trim();
  }

  const MediaService = Object.freeze({
    compressImageFile,
    dataURLtoBlob,
    detectAudioDuration,
    detectVideoDuration,
    isYouTubeVideoUrl,
    extractYouTubeId,
    encodeMediaStartTime,
    decodeMediaStartTime,
    stripMediaMetadata
  });

  root.MediaService = MediaService;
  root.compressImageFile = compressImageFile;
  root.dataURLtoBlob = dataURLtoBlob;
  root.detectAudioDuration = detectAudioDuration;
  root.detectVideoDuration = detectVideoDuration;
  root.isYouTubeVideoUrl = isYouTubeVideoUrl;
  root.extractYouTubeId = extractYouTubeId;
  root.encodeMediaStartTime = encodeMediaStartTime;
  root.decodeMediaStartTime = decodeMediaStartTime;
  root.stripMediaMetadata = stripMediaMetadata;

})(typeof window !== "undefined" ? window : globalThis);

