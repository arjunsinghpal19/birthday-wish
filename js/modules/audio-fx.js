/**
 * ============================================================================
 * MODULE: Audio & Visual Effects (js/modules/audio-fx.js)
 *
 * Purpose:
 * Owns reusable audio engines, Web Audio effects, particle effects,
 * ambient effects, fireworks, balloons, and music-widget behavior.
 *
 * Owns:
 * - Starfield / Ambient Canvas (initStars)
 * - Web Audio Context synthesizer (getAudioCtx)
 * - UI Sound Effects (playPopSound, playPaperRustle, playChimeSound, playBlowSound)
 * - Floating Emoji / Ambient Particles (spawnFloaty, initAmbientLayer)
 * - Confetti / Firework Particle Engine (confettiBurst, fireworkBurst, animateBursts, launchFireworksShow)
 * - Balloon Effects (launchBalloons)
 * - Music Engine (MusicEngine)
 * - Music Widget UI (updateMusicWidgetUI, initMusicWidget)
 *
 * Dependencies:
 * - CONFIG (background music settings)
 * - utils.js / repairMojibake() (floating emoji text repair)
 * - renderers.js / parseYouTubeStartSec() (music timestamp parsing)
 *
 * Does NOT Own:
 * - Passcode
 * - Envelope flow
 * - Letter typewriter
 * - Customizer
 * - Editor inputs
 * - Database
 * - Admin security
 * - Route restoration
 * ============================================================================
 */

(function (root) {
  "use strict";

  // ============================================================
  // STARFIELD / AMBIENT CANVAS
  // ============================================================

  function initStars() {
    const canvas = document.getElementById("stars-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let stars = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.floor((canvas.width * canvas.height) / 18000);
      stars = Array.from({ length: Math.min(count, 110) }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.4 + 0.3,
        a: Math.random(),
        speed: Math.random() * 0.015 + 0.003,
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((st) => {
        st.a += st.speed;
        const op = ((Math.sin(st.a) + 1) / 2) * 0.8 + 0.2;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${op})`;
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    resize();
    draw();
  }

  // ============================================================
  // WEB AUDIO CONTEXT
  // ============================================================

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx && AudioCtx) audioCtx = new AudioCtx();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  // ============================================================
  // UI SOUND EFFECTS (Pop, Paper rustle, Chime, Candle blow)
  // ============================================================

  function playPopSound() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  }

  function playPaperRustle() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1200;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch (e) {}
  }

  function playChimeSound() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.4);
      });
    } catch (e) {}
  }

  function playBlowSound() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const sCtx = new AC();
      const bufferSize = Math.round(sCtx.sampleRate * 0.35);
      const buffer = sCtx.createBuffer(1, bufferSize, sCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = sCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = sCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 750;
      filter.Q.value = 2.5;
      const gain = sCtx.createGain();
      gain.gain.setValueAtTime(0.01, sCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, sCtx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, sCtx.currentTime + 0.35);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(sCtx.destination);
      noise.start();
    } catch (e) {}
  }

  // ============================================================
  // FLOATING EMOJI / AMBIENT PARTICLES
  // ============================================================

  function spawnFloaty(container, emojiList, opts = {}) {
    if (!container) return;
    const el = document.createElement("div");
    el.className = "floaty";
    el.style.pointerEvents = "auto";
    el.style.cursor = "pointer";

    const repair = root.repairMojibake || ((str) => str);
    el.textContent = repair(
      emojiList[Math.floor(Math.random() * emojiList.length)]
    );

    const size = opts.size || 14 + Math.random() * 16;
    el.style.left = Math.random() * 100 + "%";
    el.style.fontSize = size + "px";
    el.style.setProperty("--drift", Math.random() * 140 - 70 + "px");

    const dur = opts.duration || 10 + Math.random() * 8;
    el.style.animationDuration = dur + "s";

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      playPopSound();
      const rect = el.getBoundingClientRect();
      confettiBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 20);
      el.remove();
    });

    container.appendChild(el);
    setTimeout(() => el.remove(), dur * 1000 + 200);
  }

  function initAmbientLayer() {
    const layer = document.getElementById("ambient-layer");
    if (!layer) return;

    for (let i = 0; i < 8; i++) {
      const b = document.createElement("div");
      b.className = "bokeh";
      const size = 6 + Math.random() * 18;
      b.style.width = size + "px";
      b.style.height = size + "px";
      b.style.left = Math.random() * 100 + "%";
      b.style.bottom = "-20px";
      b.style.animationDuration = 10 + Math.random() * 14 + "s";
      b.style.animationDelay = Math.random() * 10 + "s";
      layer.appendChild(b);
    }

    for (let i = 0; i < 3; i++) {
      const b = document.createElement("div");
      b.className = "blob";
      const size = 120 + Math.random() * 180;
      b.style.width = size + "px";
      b.style.height = size + "px";
      b.style.left = Math.random() * 90 + "%";
      b.style.top = Math.random() * 90 + "%";
      b.style.animationDelay = Math.random() * 6 + "s";
      layer.appendChild(b);
    }

    for (let i = 0; i < 6; i++) {
      const f = document.createElement("div");
      f.className = "firefly";
      f.style.left = Math.random() * 100 + "%";
      f.style.top = 20 + Math.random() * 70 + "%";
      f.style.animationDelay = Math.random() * 6 + "s";
      layer.appendChild(f);
    }

    setInterval(
      () =>
        spawnFloaty(layer, ["💖", "💕", "✨"], {
          duration: 9 + Math.random() * 6,
        }),
      2600
    );

    setInterval(
      () => spawnFloaty(layer, ["🦋"], { duration: 14, size: 22 }),
      6200
    );

    setInterval(
      () => spawnFloaty(layer, ["🌸", "🌺"], { duration: 11, size: 16 }),
      4800
    );
  }

  // ============================================================
  // CONFETTI / FIREWORK PARTICLE ENGINE
  // ============================================================

  let burstCanvas = document.getElementById("burst-canvas");
  if (!burstCanvas && typeof document !== "undefined" && document.body) {
    burstCanvas = document.createElement("canvas");
    burstCanvas.id = "burst-canvas";
    burstCanvas.style.cssText =
      "position:fixed;inset:0;z-index:80;pointer-events:none;width:100%;height:100%;";
    document.body.appendChild(burstCanvas);
  }

  let bctx = burstCanvas ? burstCanvas.getContext("2d") : null;

  function resizeBurst() {
    if (!burstCanvas) return;
    burstCanvas.width = window.innerWidth;
    burstCanvas.height = window.innerHeight;
  }

  if (typeof window !== "undefined") {
    window.addEventListener("resize", resizeBurst);
    resizeBurst();
  }

  let burstParticles = [];

  function confettiBurst(originX, originY, count = 120) {
    const colors = [
      "#FF5FA2",
      "#FFB6D9",
      "#A855F7",
      "#7C3AED",
      "#FFD700",
      "#FFF7FB",
    ];

    for (let i = 0; i < count; i++) {
      burstParticles.push({
        x: originX,
        y: originY,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * -10 - 4,
        g: 0.28,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 14,
        size: 5 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      });
    }
  }

  function fireworkBurst(x, y) {
    const colors = ["#FF5FA2", "#FFD700", "#A855F7", "#FFFFFF", "#FFB6D9"];
    const color = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60;
      const speed = 3 + Math.random() * 3;

      burstParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        g: 0.05,
        rot: 0,
        vr: 0,
        size: 3,
        color,
        life: 1,
        shape: "circle",
        fade: 0.014,
      });
    }
  }

  function animateBursts() {
    if (!bctx || !burstCanvas) return;
    bctx.clearRect(0, 0, burstCanvas.width, burstCanvas.height);
    burstParticles = burstParticles.filter((p) => p.life > 0);

    burstParticles.forEach((p) => {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= p.fade || 0.012;

      bctx.save();
      bctx.globalAlpha = Math.max(p.life, 0);
      bctx.translate(p.x, p.y);
      bctx.rotate((p.rot * Math.PI) / 180);
      bctx.fillStyle = p.color;

      if (p.shape === "rect")
        bctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
      else {
        bctx.beginPath();
        bctx.arc(0, 0, p.size, 0, Math.PI * 2);
        bctx.fill();
      }
      bctx.restore();
    });

    requestAnimationFrame(animateBursts);
  }

  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(animateBursts);
  }

  function launchFireworksShow(duration = 3200) {
    const end = Date.now() + duration;
    (function tick() {
      fireworkBurst(
        Math.random() * window.innerWidth,
        window.innerHeight * 0.2 + Math.random() * window.innerHeight * 0.35
      );
      if (Date.now() < end) setTimeout(tick, 420);
    })();
  }

  // ============================================================
  // BALLOON EFFECTS
  // ============================================================

  function launchBalloons(n = 10) {
    const colors = ["#FF5FA2", "#A855F7", "#FFD700", "#FFB6D9", "#7C3AED"];

    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const b = document.createElement("div");
        b.className = "balloon";
        b.style.left = Math.random() * 90 + "vw";
        b.style.background = `radial-gradient(circle at 35% 30%, #fff8, ${colors[i % colors.length]})`;
        b.style.setProperty("--sway", Math.random() * 80 - 40 + "px");
        b.style.animationDuration = 7 + Math.random() * 4 + "s";

        const pop = (event) => {
          if (b.classList.contains("popping")) return;
          b.classList.add("popping");
          const x = event?.clientX ?? b.getBoundingClientRect().left + 25;
          const y = event?.clientY ?? b.getBoundingClientRect().top + 32;
          confettiBurst(x, y, 22);
          setTimeout(() => b.remove(), 320);
        };

        b.addEventListener("pointerdown", pop, { once: true });
        document.body.appendChild(b);
        setTimeout(() => b.remove(), 12000);
      }, i * 180);
    }
  }

  // ============================================================
  // MUSIC ENGINE (synthesizer + audio file + YouTube fallback)
  // ============================================================

  const MusicEngine = (() => {
    let ctx,
      gainNode,
      playing = false,
      timer = null,
      audioEl = null;

    const notes = [
      523.25, 587.33, 659.25, 523.25, 659.25, 783.99, 880.0, 783.99, 659.25,
      523.25, 587.33, 659.25, 523.25, 587.33, 440.0, 392.0, 523.25, 587.33,
      659.25, 523.25, 659.25, 783.99, 880.0, 1046.5, 987.77, 880.0, 783.99,
      659.25, 523.25, 587.33, 523.25,
    ];

    function initCtx() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        gainNode = ctx.createGain();
        gainNode.gain.value = 0.28;
        gainNode.connect(ctx.destination);
      }
    }

    function playNote(freq, dur = 0.5) {
      if (!ctx || ctx.state === "suspended") return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(g);
      g.connect(gainNode);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    }

    function playSequence() {
      let idx = 0;
      timer = setInterval(() => {
        if (idx >= notes.length) idx = 0;
        playNote(notes[idx], 0.7);
        idx++;
      }, 450);
    }

    let currentYtId = null;

    function extractYouTubeId(url) {
      if (!url) return null;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    }

    function play() {
      if (playing) return;

      const parseStart = root.parseYouTubeStartSec || ((url, start) => 0);

      let fileOrUrl = CONFIG.music ? CONFIG.music.file : null;
      if (!fileOrUrl || fileOrUrl === "null" || fileOrUrl === "undefined") {
        fileOrUrl = "assets/music/happy-birthday-song.mpeg";
        if (CONFIG.music) CONFIG.music.file = fileOrUrl;
        else CONFIG.music = { file: fileOrUrl, startTime: "" };
      }

      console.log("🎵 MusicEngine.play resolved CONFIG.music.file:", fileOrUrl);

      const ytId = extractYouTubeId(fileOrUrl);

      if (ytId) {
        const container = document.getElementById("yt-player-container");
        const existingIframe = document.getElementById("yt-iframe");
        if (container) {
          if (audioEl) { audioEl.pause(); }

          if (existingIframe && currentYtId === ytId) {
            try {
              existingIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            } catch(e){}
            playing = true;
            return;
          }

          currentYtId = ytId;
          const startSec = parseStart(fileOrUrl, CONFIG.music ? CONFIG.music.startTime : null);
          const startParam = startSec > 0 ? `&start=${startSec}` : "";
          container.style.display = "block";
          container.innerHTML = `<iframe id="yt-iframe" width="300" height="200" src="https://www.youtube.com/embed/${ytId}?enablejsapi=1&autoplay=1&loop=1&playlist=${ytId}&playsinline=1${startParam}" allow="autoplay"></iframe>`;
          playing = true;
          return;
        }
      }

      if (fileOrUrl) {
        currentYtId = null;
        const container = document.getElementById("yt-player-container");
        if (container) { container.innerHTML = ""; container.style.display = "none"; }

        const cleanFileOrUrl = (root.MediaService && typeof root.MediaService.stripMediaMetadata === "function")
          ? root.MediaService.stripMediaMetadata(fileOrUrl)
          : (typeof root.stripMediaMetadata === "function" ? root.stripMediaMetadata(fileOrUrl) : String(fileOrUrl).replace(/#bw-start=\d+/i, "").trim());

        const applyAudioStartTime = (el) => {
          const startSec = parseStart(fileOrUrl, CONFIG.music ? CONFIG.music.startTime : null);
          if (startSec > 0) {
            const seekHandler = () => {
              if (Number.isFinite(el.duration) && el.duration > 0 && startSec < el.duration) {
                el.currentTime = startSec;
              }
            };
            if (el.readyState >= 1 && Number.isFinite(el.duration) && el.duration > 0) {
              seekHandler();
            } else {
              el.addEventListener("loadedmetadata", seekHandler, { once: true });
            }
          }
        };

        if (!audioEl) {
          audioEl = new Audio(cleanFileOrUrl);
          audioEl.loop = true;
          audioEl.volume = currentVolume;
          audioEl.load();
          applyAudioStartTime(audioEl);
          audioEl.addEventListener("error", (e) => {
            console.warn("Audio load error fallback:", e);
            if (cleanFileOrUrl !== "assets/music/happy-birthday-song.mpeg") {
              const fallbackUrl = "assets/music/happy-birthday-song.mpeg";
              // Redirect playback to fallback melody WITHOUT corrupting the persisted CONFIG.music.file!
              audioEl.src = fallbackUrl;
              audioEl.load();
              audioEl.play().then(() => { playing = true; }).catch(() => {});
            }
          });
        } else if (audioEl.src !== cleanFileOrUrl && !audioEl.src.endsWith(cleanFileOrUrl)) {
          audioEl.src = cleanFileOrUrl;
          audioEl.load();
          applyAudioStartTime(audioEl);
        } else {
          applyAudioStartTime(audioEl);
        }

        audioEl.play().then(() => {
          playing = true;
        }).catch((e) => {
          console.warn("Autoplay interaction pending:", e);
          playing = false;
        });
        return;
      }

      currentYtId = null;
      initCtx();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().then(() => {
          playing = true;
          playSequence();
        });
      } else {
        playing = true;
        playSequence();
      }
    }

    function pause() {
      playing = false;
      if (audioEl) {
        audioEl.pause();
      }

      const existingIframe = document.getElementById("yt-iframe");
      if (existingIframe) {
        try {
          existingIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        } catch(e){}
      }

      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    let currentVolume = 0.7;

    function setVolume(val) {
      currentVolume = Math.max(0, Math.min(1, val));
      if (gainNode) gainNode.gain.value = currentVolume;
      if (audioEl) audioEl.volume = currentVolume;

      const existingIframe = document.getElementById("yt-iframe");
      if (existingIframe) {
        try {
          const ytVol = Math.floor(currentVolume * 100);
          existingIframe.contentWindow.postMessage(`{"event":"command","func":"setVolume","args":[${ytVol}]}`, '*');
          if (currentVolume === 0) {
            existingIframe.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
          } else {
            existingIframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
          }
        } catch(e){}
      }
    }

    function getVolume() {
      return currentVolume;
    }

    return { play, pause, setVolume, getVolume, isPlaying: () => playing };
  })();

  // ============================================================
  // MUSIC WIDGET UI
  // ============================================================

  function updateMusicWidgetUI(playing) {
    const widget = document.getElementById("music-widget");
    if (widget) widget.classList.toggle("paused", !playing);

    const toggleBtn = document.getElementById("music-toggle-btn");
    const musicIcon = document.getElementById("music-icon");
    const musicLabel = document.getElementById("music-label");

    if (toggleBtn) toggleBtn.classList.toggle("paused", !playing);
    if (musicIcon) musicIcon.textContent = playing ? "🎵" : "🔇";
    if (musicLabel) musicLabel.textContent = playing ? "Birthday Music" : "Music Paused";

    const secToggle = document.getElementById("music-toggle");
    if (secToggle) secToggle.textContent = playing ? "\u23F8" : "\u25B6";
  }

  function initMusicWidget() {
    const toggleBtn = document.getElementById("music-toggle-btn");
    const secToggle = document.getElementById("music-toggle");
    const volBtn = document.getElementById("music-volume-btn");
    const popover = document.getElementById("music-volume-popover");
    const volSlider = document.getElementById("public-volume-slider");
    const muteBtn = document.getElementById("volume-mute-toggle-btn");
    const volPctDisplay = document.getElementById("volume-pct-display");
    const volIcon = document.getElementById("volume-icon");

    let savedVol = parseFloat(localStorage.getItem("birthday_music_volume"));
    if (isNaN(savedVol) || savedVol < 0 || savedVol > 1) savedVol = 0.7;

    let lastNonZeroVol = parseFloat(localStorage.getItem("birthday_music_last_nonzero_volume"));
    if (isNaN(lastNonZeroVol) || lastNonZeroVol <= 0 || lastNonZeroVol > 1) lastNonZeroVol = 0.7;
    if (savedVol > 0) lastNonZeroVol = savedVol;

    const applyVolumeState = (vol) => {
      const clamped = Math.max(0, Math.min(1, vol));
      const pct = Math.round(clamped * 100);

      if (clamped > 0) {
        lastNonZeroVol = clamped;
        try { localStorage.setItem("birthday_music_last_nonzero_volume", lastNonZeroVol); } catch(e){}
      }

      try { localStorage.setItem("birthday_music_volume", clamped); } catch(e){}

      if (volPctDisplay) volPctDisplay.textContent = `${pct}%`;
      if (volSlider) {
        volSlider.value = pct;
        volSlider.style.setProperty("--volume-progress", `${pct}%`);
      }
      if (volIcon) volIcon.textContent = clamped === 0 ? "🔇" : clamped <= 0.5 ? "🔉" : "🔊";
      if (muteBtn) muteBtn.textContent = clamped === 0 ? "🔇" : "🔈";

      MusicEngine.setVolume(clamped);
    };

    applyVolumeState(savedVol);

    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        if (MusicEngine.isPlaying()) {
          MusicEngine.pause();
          updateMusicWidgetUI(false);
        } else {
          MusicEngine.play();
          updateMusicWidgetUI(true);
        }
      });
    }

    if (secToggle) {
      secToggle.addEventListener("click", () => {
        if (MusicEngine.isPlaying()) {
          MusicEngine.pause();
          updateMusicWidgetUI(false);
        } else {
          MusicEngine.play();
          updateMusicWidgetUI(true);
        }
      });
    }

    if (volBtn && popover) {
      volBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = popover.style.display === "block";
        popover.style.display = isOpen ? "none" : "block";
      });

      document.addEventListener("click", (e) => {
        if (popover && popover.style.display === "block" && !popover.contains(e.target) && !volBtn.contains(e.target)) {
          popover.style.display = "none";
        }
      });
    }

    if (volSlider) {
      volSlider.addEventListener("input", () => {
        const pct = parseInt(volSlider.value, 10) || 0;
        const vol = pct / 100;
        applyVolumeState(vol);
      });
    }

    if (muteBtn) {
      muteBtn.addEventListener("click", () => {
        const currentVol = (typeof MusicEngine.getVolume === "function") ? MusicEngine.getVolume() : (parseInt(volSlider ? volSlider.value : "70") / 100);
        if (currentVol > 0) {
          lastNonZeroVol = currentVol;
          try { localStorage.setItem("birthday_music_last_nonzero_volume", lastNonZeroVol); } catch(e){}
          applyVolumeState(0);
        } else {
          applyVolumeState(lastNonZeroVol || 0.7);
        }
      });
    }
  }

  // Export all public symbols globally on root (window)
  root.initStars = initStars;
  root.getAudioCtx = getAudioCtx;
  root.playPopSound = playPopSound;
  root.playPaperRustle = playPaperRustle;
  root.playChimeSound = playChimeSound;
  root.playBlowSound = playBlowSound;
  root.spawnFloaty = spawnFloaty;
  root.initAmbientLayer = initAmbientLayer;
  root.resizeBurst = resizeBurst;
  root.confettiBurst = confettiBurst;
  root.fireworkBurst = fireworkBurst;
  root.animateBursts = animateBursts;
  root.launchFireworksShow = launchFireworksShow;
  root.launchBalloons = launchBalloons;
  root.MusicEngine = MusicEngine;
  root.updateMusicWidgetUI = updateMusicWidgetUI;
  root.initMusicWidget = initMusicWidget;

})(typeof window !== "undefined" ? window : globalThis);
