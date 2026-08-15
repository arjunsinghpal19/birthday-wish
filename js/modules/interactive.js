/**
 * ============================================================================
 * MODULE: Interactive Birthday Experience (js/modules/interactive.js)
 *
 * Purpose:
 * Owns user-driven interactive birthday experience flows.
 *
 * Owns:
 * - Passcode / Intro Flow (initPasscode, enterIntro, typeLine, enterMain)
 * - Experience Startup Effects (startExperienceEffects)
 * - Envelope Interaction (initEnvelope)
 * - Letter Typewriter Lifecycle (typeLetterBody)
 * - Post-Letter Reveal (revealPostLetterContent)
 * - Surprise Experience (initSurprise)
 * - Scratch Card (initScratchCard)
 * - Gift Box (initGiftbox)
 * - Cake Experience (cakeSound, cakeParticles, initCake, positionCakeBeforeSurprise, playCakeBirthdayMelody)
 * - Wishing Star (launchRealisticShootingStar, initWishingStar)
 * - Final Scene (triggerFinalScene)
 *
 * Cross-Module Dependencies:
 * - confettiBurst() → audio-fx.js
 * - launchFireworksShow() → audio-fx.js
 * - launchBalloons() → audio-fx.js
 * - spawnFloaty() → audio-fx.js
 * - MusicEngine → audio-fx.js
 * - updateMusicWidgetUI() → audio-fx.js
 * - getAudioCtx() → audio-fx.js
 * - initStars() → audio-fx.js
 * - initAmbientLayer() → audio-fx.js
 * - repairMojibake() → utils.js
 * - isWishCustomized() → renderers.js
 * - updateTimelineLine() → renderers.js
 * - formatName() → renderers.js
 * ============================================================================
 */

(function(root) {
  'use strict';

  // ============================================================
  // PASSCODE / INTRO
  // ============================================================

  let experienceEffectsStarted = false;

  function initPasscode() {
    let entered = "";
    const dotsWrap = document.getElementById("passcode-dots");
    const dots = [...dotsWrap.querySelectorAll(".pc-dot")];
    const passWrap = document.getElementById("passcode-wrap");
    const hint = document.getElementById("pc-hint");

    if (typeof isWishCustomized === "function" && isWishCustomized()) {
      hint.textContent = CONFIG.passcode?.customHint || "Hint: think of a date that matters 💕";
    } else {
      if (CONFIG.passcode) CONFIG.passcode.code = "1234";
      hint.textContent = CONFIG.passcode?.defaultHint || "Hint: 1234 💕";
    }

    let locked = false;

    function updateDots() {
      dots.forEach((d, i) => {
        d.classList.remove("error", "success");
        d.classList.toggle("filled", i < entered.length);
      });
    }

    function pressDigit(n) {
      if (locked || entered.length >= (CONFIG.passcode?.code || "1234").length) return;
      entered += n;
      updateDots();
      if (entered.length === (CONFIG.passcode?.code || "1234").length) {
        locked = true;
        setTimeout(checkCode, 220);
      }
    }

    function backspace() {
      if (locked) return;
      entered = entered.slice(0, -1);
      updateDots();
    }

    function checkCode() {
      if (entered === (CONFIG.passcode?.code || "1234")) {
        dots.forEach((d) => {
          d.classList.add("success");
        });
        if (typeof confettiBurst === "function") confettiBurst(innerWidth / 2, innerHeight * 0.35, 50);
        passWrap.classList.add("unlocked");
        setTimeout(enterIntro, 550);
      } else {
        dots.forEach((d) => d.classList.add("error"));
        passWrap.classList.add("shake");
        setTimeout(() => {
          passWrap.classList.remove("shake");
          entered = "";
          locked = false;
          updateDots();
        }, 500);
      }
    }

    document.querySelectorAll(".key[data-num]").forEach((btn) => {
      btn.addEventListener("click", () => pressDigit(btn.dataset.num));
    });

    const pcBack = document.getElementById("pc-back");
    if (pcBack) pcBack.addEventListener("click", backspace);

    window.addEventListener("keydown", (e) => {
      const wrap = document.getElementById("passcode-wrap");
      if (!wrap || !wrap.classList.contains("show")) return;
      if (e.target && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (/^[0-9]$/.test(e.key)) pressDigit(e.key);
      if (e.key === "Backspace") backspace();
    });
  }

  function enterIntro() {
    const loading = document.getElementById("loading-screen");
    if (loading) {
      loading.style.filter = "blur(12px)";
      setTimeout(() => {
        loading.style.display = "none";
      }, 900);
    }

    const intro = document.getElementById("intro-scene");
    if (!intro) return;
    intro.classList.add("active");

    typeLine(
      document.getElementById("typewriter"),
      "Someone made something\nspecial for you ❤️",
      () => {
        setTimeout(() => {
          const hint = document.createElement("div");
          hint.className = "tap-enter show";
          hint.textContent = "Tap anywhere to continue";
          hint.style.marginTop = "30px";
          intro.appendChild(hint);
          intro.addEventListener("click", enterMain, { once: true });
        }, 400);
      }
    );
  }

  function typeLine(el, text, done) {
    if (!el) return;
    let i = 0;
    text = typeof repairMojibake === "function" ? repairMojibake(text) : text;
    el.textContent = "";
    el.classList.remove("done");

    (function step() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(step, 42);
      } else {
        el.classList.add("done");
        if (done) done();
      }
    })();
  }

  function enterMain() {
    const intro = document.getElementById("intro-scene");
    if (intro) {
      intro.style.opacity = "0";
      intro.style.filter = "blur(16px)";
      setTimeout(() => {
        intro.style.display = "none";
      }, 900);
    }

    const exp = document.getElementById("experience");
    if (exp) exp.classList.add("revealed");

    const musicWidget = document.getElementById("music-widget");
    if (musicWidget) musicWidget.classList.add("show");

    if (root.MusicEngine && typeof root.MusicEngine.play === "function") {
      root.MusicEngine.play();
    }
    if (typeof updateMusicWidgetUI === "function") {
      updateMusicWidgetUI(true);
    }

    setTimeout(startExperienceEffects, 80);
  }

  // ============================================================
  // EXPERIENCE STARTUP EFFECTS
  // ============================================================

  function startExperienceEffects() {
    if (experienceEffectsStarted) return;
    experienceEffectsStarted = true;

    if (typeof initStars === "function") initStars();
    if (typeof initAmbientLayer === "function") initAmbientLayer();
    if (typeof initCursor === "function") initCursor();
    if (typeof initMagnetic === "function") initMagnetic();
    if (typeof initTilt === "function") initTilt();
  }

  // ============================================================
  // ENVELOPE INTERACTION
  // ============================================================

  function initEnvelope() {
    const env = document.getElementById("envelope");
    const letterScene = document.getElementById("letter-scene");
    if (!env) return;

    env.addEventListener("click", () => {
      if (env.classList.contains("open")) return;
      env.classList.add("open");
      if (typeof confettiBurst === "function") confettiBurst(innerWidth / 2, innerHeight * 0.35, 40);

      const exp = document.getElementById("experience");
      if (exp) exp.classList.add("unlocked-all");
      if (typeof updateTimelineLine === "function") updateTimelineLine();

      if (letterScene) {
        setTimeout(() => {
          letterScene.classList.add("letter-ready");
        }, 900);

        setTimeout(() => {
          letterScene.scrollIntoView({ behavior: "smooth" });
          setTimeout(typeLetterBody, 750);
        }, 1900);
      }
    });
  }

  // ============================================================
  // LETTER TYPEWRITER LIFECYCLE
  // IMPORTANT:
  // typeLetterBody() owns the initial animated letter reveal.
  // It must work together with renderers.js updateLetterBody()
  // and window.letterTyped.
  // Do not change this lifecycle.
  // ============================================================

  function typeLetterBody() {
    if (root.letterTyped || root.letterTyping) return;
    root.letterTyping = true;

    const paras = document.querySelectorAll("#letter-body p");
    paras.forEach(p => { p.innerHTML = ""; p.style.opacity = "1"; });
    let i = 0;

    (function nextLine() {
      if (i >= paras.length) {
        root.letterTyped = true;
        return;
      }

      const p = paras[i];
      const getHighlight = root.ensureLineHighlight || (typeof ensureLineHighlight === "function" ? ensureLineHighlight : null);
      const html = getHighlight ? getHighlight(CONFIG.letterLines[i]) : (CONFIG.letterLines[i] || "");
      p.innerHTML = html;

      const textNodes = [];
      const getLeafNodes = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          if (node.textContent) textNodes.push(node);
        } else {
          node.childNodes.forEach(getLeafNodes);
        }
      };
      getLeafNodes(p);

      const fullString = textNodes.map(n => n.textContent).join("");
      textNodes.forEach(n => { n.originalText = n.textContent; n.textContent = ""; });
      p.style.opacity = "1";

      let charIdx = 0;
      function typeChar() {
        if (charIdx <= fullString.length) {
          let currentCount = 0;
          for (let tn of textNodes) {
            const len = tn.originalText.length;
            if (charIdx <= currentCount) {
              tn.textContent = "";
            } else if (charIdx >= currentCount + len) {
              tn.textContent = tn.originalText;
            } else {
              tn.textContent = tn.originalText.slice(0, charIdx - currentCount);
            }
            currentCount += len;
          }
          charIdx += 2;
          setTimeout(typeChar, 20);
        } else {
          p.innerHTML = html;
          i++;
          if (i >= paras.length) {
            root.letterTyped = true;
            setTimeout(() => {
              revealPostLetterContent();
            }, 400);
          }
          setTimeout(nextLine, 300);
        }
      }

      typeChar();
    })();
  }

  // ============================================================
  // POST-LETTER REVEAL
  // ============================================================

  function revealPostLetterContent() {
    const container = document.getElementById("post-letter-content");
    if (container && container.classList.contains("post-letter-hidden")) {
      container.classList.remove("post-letter-hidden");
      container.classList.add("post-letter-revealed");
      if (typeof initReveal === "function") {
        initReveal();
      }
      if (typeof updateTimelineLine === "function") {
        requestAnimationFrame(() => {
          requestAnimationFrame(updateTimelineLine);
        });
      }
    }
  }

  // ============================================================
  // SURPRISE EXPERIENCE
  // ============================================================

  function initSurprise() {
    const btn = document.getElementById("surprise-btn");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      if (typeof launchFireworksShow === "function") launchFireworksShow(3000);
      if (typeof launchBalloons === "function") launchBalloons(12);
      if (typeof confettiBurst === "function") confettiBurst(innerWidth / 2, innerHeight / 2, 160);

      if (root.MusicEngine && typeof root.MusicEngine.isPlaying === "function" && !root.MusicEngine.isPlaying()) {
        root.MusicEngine.play();
        if (typeof updateMusicWidgetUI === "function") updateMusicWidgetUI(true);
      }
    });
  }

  // ============================================================
  // SCRATCH CARD
  // ============================================================

  function initScratchCard() {
    const canvas = document.getElementById("scratch-card-canvas");
    const coupon = document.getElementById("gift-coupon");
    const wrapper = document.getElementById("scratch-card-wrapper");
    if (!canvas || !coupon || !wrapper) return;

    function renderFoilTexture(width, height) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.opacity = "1";
      canvas.style.pointerEvents = "auto";

      const ctx = canvas.getContext("2d");

      ctx.save();
      ctx.globalCompositeOperation = "source-over";

      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#8a640f");
      grad.addColorStop(0.2, "#d4af37");
      grad.addColorStop(0.4, "#fff8dc");
      grad.addColorStop(0.65, "#ffd700");
      grad.addColorStop(0.85, "#b8860b");
      grad.addColorStop(1, "#664700");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const sheen = ctx.createLinearGradient(0, 0, width * 0.8, height);
      sheen.addColorStop(0, "rgba(255, 255, 255, 0)");
      sheen.addColorStop(0.4, "rgba(255, 255, 255, 0.45)");
      sheen.addColorStop(0.6, "rgba(255, 255, 255, 0.45)");
      sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      for (let i = 0; i < 90; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2 + 1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(6, 6, width - 12, height - 12);

      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = "#1a0826";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
      ctx.shadowBlur = 4;
      ctx.fillText("🪙 SCRATCH WITH FINGER TO REVEAL ✨", width / 2, height / 2);
      ctx.restore();
    }

    requestAnimationFrame(() => {
      const width = wrapper.offsetWidth || coupon.offsetWidth || 340;
      const height = wrapper.offsetHeight || coupon.offsetHeight || 80;
      renderFoilTexture(width, height);

      const ctx = canvas.getContext("2d");
      let isScratching = false;

      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: (clientX - rect.left) * (canvas.width / rect.width),
          y: (clientY - rect.top) * (canvas.height / rect.height)
        };
      }

      function scratch(e) {
        if (!isScratching) return;
        if (e.cancelable) e.preventDefault();
        const pos = getPos(e);
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        checkScratchProgress();
      }

      function checkScratchProgress() {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;
        let transparent = 0;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] === 0) transparent++;
        }
        const ratio = transparent / (canvas.width * canvas.height);
        if (ratio > 0.38) {
          canvas.style.transition = "opacity 0.6s ease";
          canvas.style.opacity = "0";
          canvas.style.pointerEvents = "none";
          const copyWrapper = document.getElementById("copy-voucher-wrapper");
          if (copyWrapper) copyWrapper.style.display = "block";
        }
      }

      canvas.onmousedown = (e) => { isScratching = true; scratch(e); };
      canvas.onmousemove = scratch;
      window.onmouseup = () => { isScratching = false; };

      canvas.ontouchstart = (e) => { isScratching = true; scratch(e); };
      canvas.ontouchmove = scratch;
      window.ontouchend = () => { isScratching = false; };

      if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => {
          if (canvas.style.opacity !== "0") {
            const w = wrapper.offsetWidth || coupon.offsetWidth || 340;
            const h = wrapper.offsetHeight || coupon.offsetHeight || 80;
            if (Math.abs(canvas.width - w) > 2 || Math.abs(canvas.height - h) > 2) {
              renderFoilTexture(w, h);
            }
          }
        });
        ro.observe(coupon);
      }
    });

    const copyVoucherBtn = document.getElementById("copy-voucher-btn");
    if (copyVoucherBtn) {
      copyVoucherBtn.onclick = async () => {
        const couponText = CONFIG.gift?.coupon || "";
        try {
          await navigator.clipboard.writeText(couponText);
          if (typeof showToast === "function") showToast("Voucher code copied to clipboard! 📋");
        } catch(err) {
          if (typeof showToast === "function") showToast("Voucher code: " + couponText);
        }
      };
    }
  }

  // ============================================================
  // GIFT BOX
  // ============================================================

  function initGiftbox() {
    const box = document.getElementById("giftbox");
    const reveal = document.getElementById("gift-reveal");
    if (!box || !reveal) return;
    box.addEventListener("click", () => {
      box.classList.toggle("open");
      if (box.classList.contains("open")) {
        if (typeof confettiBurst === "function") {
          confettiBurst(
            box.getBoundingClientRect().left + 80,
            box.getBoundingClientRect().top,
            60
          );
        }
        reveal.classList.add("show");
        initScratchCard();
      } else {
        reveal.classList.remove("show");
      }
    });
  }

  // ============================================================
  // CAKE EXPERIENCE
  // ============================================================

  function cakeSound(kind) {
    try {
      const getAC = root.getAudioCtx || (typeof getAudioCtx === "function" ? getAudioCtx : null);
      if (!getAC) return;
      const ac = getAC();
      if (!ac) return;

      const now = ac.currentTime,
        osc = ac.createOscillator(),
        gain = ac.createGain();

      osc.connect(gain);
      gain.connect(ac.destination);

      const tones = {
        chime: [880, 0.12],
        whoosh: [150, 0.26],
        pop: [370, 0.1],
        cut: [220, 0.16],
        cheer: [520, 0.34],
      };

      const [freq, dur] = tones[kind] || tones.pop;
      osc.type = kind === "whoosh" ? "sawtooth" : "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(50, freq * 0.48),
        now + dur
      );

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(
        kind === "cheer" ? 0.08 : 0.05,
        now + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.start(now);
      osc.stop(now + dur);
    } catch (e) {}
  }

  function cakeParticles(x, y, emoji, count = 16) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      const rep = root.repairMojibake || (typeof repairMojibake === "function" ? repairMojibake : null);
      p.textContent = rep ? rep(emoji[i % emoji.length]) : emoji[i % emoji.length];
      p.style.cssText = `position:fixed;z-index:80;left:${x}px;top:${y}px;font-size:${10 + Math.random() * 12}px;pointer-events:none;transition:transform ${0.65 + Math.random() * 0.6}s ease-out,opacity 1s ease-out`;
      document.body.appendChild(p);

      requestAnimationFrame(() => {
        p.style.transform = `translate(${(Math.random() - 0.5) * 170}px,${-30 - Math.random() * 150}px) rotate(${Math.random() * 480}deg)`;
        p.style.opacity = "0";
      });

      setTimeout(() => p.remove(), 1300);
    }
  }

  function initCake() {
    const candles = [...document.querySelectorAll(".candle")],
      hint = document.getElementById("cake-hint");
    const blowBtn = document.getElementById("blow-candles-btn"),
      cutBtn = document.getElementById("cut-cake-btn"),
      saveBtn = document.getElementById("save-memory-btn");

    let completed = false,
      stream,
      audioCtx,
      analyser,
      blowingFrames = 0;

    cakeSound("chime");

    function extinguish(candle) {
      if (candle.classList.contains("out")) return;
      candle.classList.add("out");
      cakeSound("pop");

      const r = candle.getBoundingClientRect();
      cakeParticles(r.left + r.width / 2, r.top, ["✦", "·", "♡"], 7);

      if (candles.every((c) => c.classList.contains("out"))) allCandlesOut();
    }

    function allCandlesOut() {
      if (completed) return;
      completed = true;
      stopMic();

      if (hint) hint.textContent = "Your wish is in the stars...";
      if (blowBtn) blowBtn.style.display = "none";
      if (cutBtn) cutBtn.classList.add("show");

      const wish = document.getElementById("cake-wish");
      if (wish) {
        wish.textContent = "✨ Make a Wish ✨";
        wish.classList.add("show");
      }

      document.body.classList.add("cake-night");

      setTimeout(() => {
        cakeSound("cheer");
        playCakeBirthdayMelody();

        if (typeof launchFireworksShow === "function") launchFireworksShow(4200);
        if (typeof confettiBurst === "function") confettiBurst(innerWidth / 2, innerHeight * 0.42, 220);
        if (typeof launchBalloons === "function") launchBalloons(12);

        const flash = document.createElement("div");
        flash.style.cssText =
          "position:fixed;inset:0;z-index:90;background:#fff;pointer-events:none;animation:cakeFlash .7s ease-out forwards";
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 750);

        const layer = document.getElementById("ambient-layer");
        if (layer && typeof spawnFloaty === "function") {
          let n = 0;
          const rain = setInterval(() => {
            spawnFloaty(layer, ["💖", "🦋", "🌸", "✨"], { duration: 6, size: 18 });
            if (++n > 32) clearInterval(rain);
          }, 140);
        }

        if (wish) {
          const nameVal = CONFIG.name ? (typeof formatName === "function" ? formatName(CONFIG.name) : CONFIG.name) : "";
          wish.textContent = `Happy Birthday, ${nameVal}`;
          wish.classList.add("cinematic");
        }
      }, 1000);
    }

    candles.forEach((c) => c.addEventListener("click", () => extinguish(c)));

    function stopMic() {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx) audioCtx.close().catch(() => {});
      stream = null;
      audioCtx = null;
    }

    async function requestBlow() {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (hint) hint.textContent = "Microphone is unavailable — tap each candle to make your wish.";
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const getAC = root.getAudioCtx || (typeof getAudioCtx === "function" ? getAudioCtx : null);
        audioCtx = getAC ? getAC() : null;
        if (!audioCtx) return;

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        audioCtx.createMediaStreamSource(stream).connect(analyser);

        if (hint) hint.textContent = "Blow gently toward your microphone...";
        if (blowBtn) blowBtn.textContent = "Listening for your wish...";

        const data = new Uint8Array(analyser.fftSize);

        (function listen() {
          if (!stream || completed) return;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const v of data) {
            const d = (v - 128) / 128;
            sum += d * d;
          }
          const volume = Math.sqrt(sum / data.length);
          const luxuryCake = document.getElementById("luxury-cake");

          if (volume > 0.09) {
            blowingFrames++;
            if (luxuryCake) luxuryCake.style.filter = "drop-shadow(0 18px 16px rgba(255,118,36,.7))";
            if (blowingFrames > 7) {
              const on = candles.filter((c) => !c.classList.contains("out"));
              if (on.length) {
                extinguish(on[0]);
                blowingFrames = 0;
                cakeSound("whoosh");
              }
            }
          } else {
            blowingFrames = Math.max(0, blowingFrames - 1);
            if (luxuryCake) luxuryCake.style.filter = "";
          }
          requestAnimationFrame(listen);
        })();
      } catch (e) {
        if (hint) hint.textContent = "Microphone permission was not granted — tap the candles instead.";
        if (blowBtn) blowBtn.style.display = "none";
      }
    }

    if (blowBtn) blowBtn.addEventListener("click", requestBlow);

    if (cutBtn) {
      cutBtn.addEventListener("click", () => {
        const stage = document.getElementById("cake-stage");
        if (!stage || stage.classList.contains("cutting")) return;

        stage.classList.add("cutting");
        cakeSound("cut");
        const r = stage.getBoundingClientRect();
        cakeParticles(
          r.left + r.width * 0.58,
          r.top + r.height * 0.63,
          ["🍰", "✦", "♡", "✨"],
          34
        );
        if (hint) hint.textContent = "Here's your first slice ❤️";

        const slicePlate = document.getElementById("cake-slice-plate-container");
        if (slicePlate) {
          slicePlate.style.display = "block";
          slicePlate.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        if (typeof showToast === "function") showToast("🍰 Cake slice served on plate! Enjoy! ✨");

        setTimeout(() => {
          cakeParticles(
            innerWidth / 2,
            innerHeight * 0.55,
            ["❤️", "💖", "💕"],
            26
          );
          const wish = document.getElementById("cake-wish");
          if (wish) wish.textContent = "A slice of happiness, just for you";
          if (saveBtn) saveBtn.classList.add("show");
        }, 1200);
      });
    }

    function triggerCakeMemorySave() {
      const saveFn = root.saveCakeMemory || (typeof saveCakeMemory === "function" ? saveCakeMemory : null);
      if (saveFn) {
        saveFn();
      } else {
        if (typeof showToast === "function") showToast("📸 Memory Saved to Gallery! ✨");
      }
      if (typeof launchFireworksShow === "function") launchFireworksShow(2500);
      if (typeof confettiBurst === "function") confettiBurst(innerWidth / 2, innerHeight * 0.45, 150);
    }

    if (saveBtn) saveBtn.addEventListener("click", () => triggerCakeMemorySave());
  }

  function positionCakeBeforeSurprise() {
    const cake = document.getElementById("cake-scene");
    const surprise = document.getElementById("surprise-scene");
    if (cake && surprise) surprise.parentNode.insertBefore(cake, surprise);
  }

  function playCakeBirthdayMelody() {
    const notes = [
      261.63, 261.63, 293.66, 261.63, 349.23, 329.63, 261.63, 261.63, 293.66,
      261.63, 392, 349.23,
    ];

    notes.forEach((note, i) =>
      setTimeout(() => {
        try {
          const getAC = root.getAudioCtx || (typeof getAudioCtx === "function" ? getAudioCtx : null);
          if (!getAC) return;
          const ac = getAC();
          if (!ac) return;

          const o = ac.createOscillator(),
            g = ac.createGain();
          o.connect(g);
          g.connect(ac.destination);
          o.frequency.value = note;
          g.gain.setValueAtTime(0.0001, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.07, ac.currentTime + 0.04);
          g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.32);
          o.start();
          o.stop(ac.currentTime + 0.34);
        } catch (e) {}
      }, i * 340)
    );
  }

  // ============================================================
  // WISHING STAR
  // ============================================================

  function launchRealisticShootingStar() {
    const count = 5;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const streak = document.createElement("div");
        streak.className = "shooting-star-streak";
        const head = document.createElement("div");
        head.className = "shooting-star-head";
        streak.appendChild(head);
        document.body.appendChild(streak);

        const fromX = -60;
        const isMobile = window.innerWidth < 600;
        const startYPositions = isMobile 
          ? [window.innerHeight * 0.18, window.innerHeight * 0.25, window.innerHeight * 0.20, window.innerHeight * 0.30, window.innerHeight * 0.22]
          : [-30, window.innerHeight * 0.12, -10, window.innerHeight * 0.20, window.innerHeight * 0.05];
        const fromY = (startYPositions[i % startYPositions.length]) + (Math.random() * 20 - 10);
        const angle = 21 + (Math.random() * 6 - 3);
        const distance = Math.hypot(window.innerWidth + 200, window.innerHeight + 100);

        streak.style.left = `${fromX}px`;
        streak.style.top = `${fromY}px`;
        streak.style.transform = `rotate(${angle}deg)`;
        streak.style.opacity = "1";

        const anim = streak.animate([
          { transform: `rotate(${angle}deg) translateX(0px)`, opacity: 1, width: "180px" },
          { transform: `rotate(${angle}deg) translateX(${distance}px)`, opacity: 0, width: "400px" }
        ], {
          duration: 2000,
          easing: "cubic-bezier(0.2, 0.8, 0.4, 1)"
        });

        const particleCount = 36;
        for (let p = 0; p < particleCount; p++) {
          setTimeout(() => {
            const progress = p / particleCount;
            const rad = angle * (Math.PI / 180);
            const currentX = fromX + Math.cos(rad) * (distance * progress) + (Math.random() * 50 - 25);
            const currentY = fromY + Math.sin(rad) * (distance * progress) + (Math.random() * 50 - 25);

            const spark = document.createElement("div");
            spark.className = "stardust-particle";
            const size = Math.random() * 7 + 3;
            spark.style.width = `${size}px`;
            spark.style.height = `${size}px`;
            spark.style.left = `${currentX}px`;
            spark.style.top = `${currentY}px`;
            const colors = ["#ffffff", "#ffd700", "#ff8ea9", "#70d6ff", "#ffae34"];
            const color = colors[Math.floor(Math.random() * colors.length)];
            spark.style.background = color;
            spark.style.boxShadow = `0 0 12px ${color}, 0 0 24px ${color}`;
            spark.style.setProperty("--dx", `${(Math.random() - 0.5) * 80}px`);
            spark.style.setProperty("--dy", `${(Math.random() - 0.5) * 80}px`);
            document.body.appendChild(spark);

            setTimeout(() => spark.remove(), 1400);
          }, p * 50);
        }

        anim.onfinish = () => streak.remove();
      }, i * 2200);
    }
  }

  function initWishingStar() {
    const btn = document.getElementById("wishing-star-btn");
    const promptContainer = document.getElementById("wishing-star-prompt");
    const result = document.getElementById("wishing-star-result");
    const replayBtn = document.getElementById("replay-wishing-star-btn");

    if (btn && result) {
      btn.onclick = (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX || (rect.left + rect.width / 2);
        const y = e.clientY || (rect.top + rect.height / 2);
        if (typeof confettiBurst === "function") confettiBurst(x, y, 40);
        launchRealisticShootingStar();
        btn.style.transform = "scale(0) rotate(180deg)";
        btn.style.opacity = "0";
        btn.style.transition = "all 0.4s ease";
        if (promptContainer) {
          promptContainer.style.transition = "all 0.4s ease";
          promptContainer.style.opacity = "0";
          promptContainer.style.transform = "scale(0.95)";
        }
        setTimeout(() => {
          if (promptContainer) promptContainer.style.display = "none";
          result.style.display = "block";
        }, 400);
        if (typeof showToast === "function") showToast("🌟 Shooting stars filling the sky! Make a wish ✨");
      };
    }

    if (replayBtn) {
      replayBtn.onclick = (e) => {
        const rect = replayBtn.getBoundingClientRect();
        const x = e.clientX || (rect.left + rect.width / 2);
        const y = e.clientY || (rect.top + rect.height / 2);
        if (typeof confettiBurst === "function") confettiBurst(x, y, 40);
        launchRealisticShootingStar();
        if (typeof showToast === "function") showToast("✨ A new meteor shower is passing across the sky! 🌠");
      };
    }
  }

  // ============================================================
  // FINAL SCENE
  // ============================================================

  let finalTriggered = false;

  function triggerFinalScene() {
    if (finalTriggered) return;
    finalTriggered = true;

    if (typeof launchFireworksShow === "function") launchFireworksShow(4500);
    if (typeof launchBalloons === "function") launchBalloons(16);
    if (typeof confettiBurst === "function") confettiBurst(innerWidth / 2, innerHeight * 0.3, 200);

    setTimeout(
      () => { if (typeof confettiBurst === "function") confettiBurst(innerWidth * 0.2, innerHeight * 0.4, 120); },
      500
    );

    setTimeout(
      () => { if (typeof confettiBurst === "function") confettiBurst(innerWidth * 0.8, innerHeight * 0.4, 120); },
      900
    );

    const layer = document.getElementById("ambient-layer");
    if (layer && typeof spawnFloaty === "function") {
      let n = 0;
      const petalTimer = setInterval(() => {
        spawnFloaty(layer, ["🌸", "🌺", "💮"], { duration: 8, size: 18 });
        spawnFloaty(layer, ["💖", "💕"], { duration: 7, size: 16 });
        n++;
        if (n > 30) clearInterval(petalTimer);
      }, 200);
    }

    setTimeout(
      () => {
        const sig = document.getElementById("signature");
        if (sig) sig.classList.add("show");
      },
      800
    );
  }

  /* Expose functions globally on window / root */
  root.initPasscode = initPasscode;
  root.enterIntro = enterIntro;
  root.typeLine = typeLine;
  root.enterMain = enterMain;
  root.startExperienceEffects = startExperienceEffects;
  root.initEnvelope = initEnvelope;
  root.typeLetterBody = typeLetterBody;
  root.revealPostLetterContent = revealPostLetterContent;
  root.initSurprise = initSurprise;
  root.initScratchCard = initScratchCard;
  root.initGiftbox = initGiftbox;
  root.cakeSound = cakeSound;
  root.cakeParticles = cakeParticles;
  root.initCake = initCake;
  root.positionCakeBeforeSurprise = positionCakeBeforeSurprise;
  root.playCakeBirthdayMelody = playCakeBirthdayMelody;
  root.launchRealisticShootingStar = launchRealisticShootingStar;
  root.initWishingStar = initWishingStar;
  root.triggerFinalScene = triggerFinalScene;

})(typeof window !== "undefined" ? window : globalThis);
