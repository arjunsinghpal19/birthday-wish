/* Unicode-safe icon repair: keeps emoji/icons working in Live Server and hosting. */

const CP1252_BYTES = {

  0x20ac: 0x80,

  0x201a: 0x82,

  0x0192: 0x83,

  0x201e: 0x84,

  0x2026: 0x85,

  0x2020: 0x86,

  0x2021: 0x87,

  0x02c6: 0x88,

  0x2030: 0x89,

  0x0160: 0x8a,

  0x2039: 0x8b,

  0x0152: 0x8c,

  0x017d: 0x8e,

  0x2018: 0x91,

  0x2019: 0x92,

  0x201c: 0x93,

  0x201d: 0x94,

  0x2022: 0x95,

  0x2013: 0x96,

  0x2014: 0x97,

  0x02dc: 0x98,

  0x2122: 0x99,

  0x0161: 0x9a,

  0x203a: 0x9b,

  0x0153: 0x9c,

  0x017e: 0x9e,

  0x0178: 0x9f,

};

function repairMojibake(value) {

  if (typeof value !== "string" || !/[\u00C2\u00C3\u00E2\u00F0]/.test(value))

    return value;

  let output = value;

  for (

    let pass = 0;

    pass < 3 && /[\u00C2\u00C3\u00E2\u00F0]/.test(output);

    pass++

  ) {

    try {

      const bytes = Uint8Array.from([...output], (char) => {

        const point = char.codePointAt(0);

        return CP1252_BYTES[point] ?? (point <= 255 ? point : 63);

      });

      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

      if (!decoded || decoded === output) break;

      output = decoded;

    } catch (e) {

      break;

    }

  }

  return output;

}

function repairObjectText(object) {

  if (!object || typeof object !== "object") return;

  Object.keys(object).forEach((key) => {

    if (typeof object[key] === "string")

      object[key] = repairMojibake(object[key]);

    else if (object[key] && typeof object[key] === "object")

      repairObjectText(object[key]);

  });

}

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



/* ==========================================================================

   EASY CONFIGURATION — edit everything below, nothing else

   ========================================================================== */

/* ==========================================================================

   INITIAL POPULATE FROM CONFIG

   ========================================================================== */

function formatName(name) {

  if (!name || typeof name !== "string") return "";

  const trimmed = name.trim();

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

}



function isWishCustomized() {
  const nameVal = (CONFIG.name || "").trim();
  const codeVal = (CONFIG.passcode?.code || "1234").trim();
  const yVal = CONFIG.birthDate?.year || 2001;
  const mVal = CONFIG.birthDate?.month || 1;
  const dVal = CONFIG.birthDate?.day || 1;

  return !!(nameVal || codeVal !== "1234" || yVal !== 2001 || mVal !== 1 || dVal !== 1);
}

function populateContent() {

  const nameVal = (CONFIG.name || "").trim();

  const displayName = nameVal ? formatName(nameVal) : "";

  document.title = displayName ? `Happy Birthday, ${displayName}! ❤️` : "Happy Birthday! ❤️";

  const slot1 = document.getElementById("name-slot-1");

  if (slot1) slot1.textContent = displayName ? `, ${displayName}` : "";

  const slot2 = document.getElementById("name-slot-2");

  if (slot2) slot2.textContent = displayName || "You";

  const fromSlot = document.getElementById("from-slot");

  if (fromSlot) fromSlot.textContent = CONFIG.from || "your friends";

  const logoEl = document.getElementById("loading-logo-glow") || document.querySelector(".logo-glow");

  if (logoEl) {
    logoEl.textContent = displayName ? `✨ Happy Birthday ${displayName} ✨` : "✨ Happy Birthday ✨";
  }

  const pcTitle = document.querySelector(".pc-title");

  if (pcTitle) {
    pcTitle.textContent = displayName ? `Secret Code for ${displayName}` : "Secret Birthday Code";
  }

  const sealEl = document.getElementById("seal-initial");

  if (sealEl) sealEl.textContent = displayName ? displayName.charAt(0).toUpperCase() : "❤️";

  const peekEl = document.getElementById("letter-peek-text");

  if (peekEl) peekEl.textContent = displayName ? `For ${displayName} ❤️` : "For You ❤️";

  const hintEl = document.getElementById("pc-hint");

  if (hintEl) {
    if (isWishCustomized()) {
      hintEl.textContent = CONFIG.passcode?.customHint || "Hint: think of a date that matters 💕";
    } else {
      hintEl.textContent = CONFIG.passcode?.defaultHint || "Hint: 1234 💕";
    }
  }



  updateBirthdayCard();



  // Letter body — typed in later, just seed the DOM nodes now

  const letterBody = document.getElementById("letter-body");

  CONFIG.letterLines.forEach(() => {

    const p = document.createElement("p");

    letterBody.appendChild(p);

  });



  document.getElementById("memory-text").textContent = CONFIG.memory;



  const reasonsGrid = document.getElementById("reasons-grid");

  CONFIG.reasons.forEach((r, i) => {

    const el = document.createElement("div");

    el.className = "info-card glass reveal";

    el.style.setProperty("--i", i);

    el.innerHTML = `<span class="icon">${r.icon}</span><h3>${r.title}</h3><p>${r.text}</p>`;

    reasonsGrid.appendChild(el);

  });



  showRandomWish();



  const deck = document.getElementById("gallery-deck");

  deck.innerHTML = "";

  CONFIG.gallery.forEach((g, i) => {

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
      }
      const zoomBtn = el.querySelector(".photo-zoom-btn");
      if (zoomBtn) {
        zoomBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openPhotoLightbox(g.image, g.cap);
        });
      }
    }

    el.addEventListener("click", () => {
      el.classList.toggle("flipped");
      playPaperRustle();
    });



    deck.appendChild(el);

  });



  const tl = document.getElementById("timeline-wrap");

  CONFIG.timeline.forEach((t, i) => {

    const el = document.createElement("div");

    el.className = "timeline-item reveal";

    el.dataset.icon = t.icon;

    el.style.setProperty("--i", i);

    el.innerHTML = `<span class="t-date">${t.date}</span><h4>${t.title}</h4><p>${t.text}</p>`;

    tl.appendChild(el);

  });

  updateTimelineLine();
  setTimeout(updateTimelineLine, 300);
  setTimeout(updateTimelineLine, 1000);
  window.addEventListener("resize", updateTimelineLine);
  window.addEventListener("load", updateTimelineLine);

  document.getElementById("gift-message").textContent = CONFIG.gift.message;
  document.getElementById("gift-coupon").textContent = CONFIG.gift.coupon;
  buildCountdown();
  buildDynamicGreeting();
}

function updateTimelineLine() {
  const tl = document.getElementById("timeline-wrap");
  if (!tl) return;
  const items = tl.querySelectorAll(".timeline-item");
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const firstCenter = first.offsetTop + 15;
  const lastCenter = last.offsetTop + 15;
  tl.style.setProperty("--timeline-line-start", `${firstCenter}px`);
  tl.style.setProperty("--timeline-line-height", `${lastCenter - firstCenter}px`);
}



function showRandomWish() {

  const w = CONFIG.wishes[Math.floor(Math.random() * CONFIG.wishes.length)];

  document.getElementById("wish-quote-text").textContent = w;

}



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

      </div>`,

    )

    .join("");

  updateCountdown();

  updateAgeCounter();

  setInterval(() => {

    updateCountdown();

    updateAgeCounter();

  }, 1000);

}



const MONTH_NAMES = [

  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",

  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"

];



const MONTH_FULL_NAMES = [

  "January", "February", "March", "April", "May", "June",

  "July", "August", "September", "October", "November", "December"

];



function getZodiacSign(day, month) {

  const zodiacs = [

    { name: "♑ Capricorn", endDay: 19 },

    { name: "♒ Aquarius", endDay: 18 },

    { name: "♓ Pisces", endDay: 20 },

    { name: "♈ Aries", endDay: 19 },

    { name: "♉ Taurus", endDay: 20 },

    { name: "♊ Gemini", endDay: 20 },

    { name: "♋ Cancer", endDay: 22 },

    { name: "♌ Leo", endDay: 22 },

    { name: "♍ Virgo", endDay: 22 },

    { name: "♎ Libra", endDay: 22 },

    { name: "♏ Scorpio", endDay: 21 },

    { name: "♐ Sagittarius", endDay: 21 },

    { name: "♑ Capricorn", endDay: 31 },

  ];

  if (!month || !day) return "✨ Birthday Star";

  const m = parseInt(month);

  const d = parseInt(day);

  if (m < 1 || m > 12) return "✨ Birthday Star";

  return d <= zodiacs[m - 1].endDay ? zodiacs[m - 1].name : zodiacs[m].name;

}



function getOrdinalDay(d) {

  if (!d) return "";

  const n = parseInt(d);

  if (n >= 11 && n <= 13) return n + "th";

  switch (n % 10) {

    case 1: return n + "st";

    case 2: return n + "nd";

    case 3: return n + "rd";

    default: return n + "th";

  }

}



function updateBirthdayCard() {

  const d = CONFIG.birthDate?.day || 1;

  const m = CONFIG.birthDate?.month || 1;

  const nameVal = (CONFIG.name || "").trim();

  const displayName = nameVal ? formatName(nameVal) : "";



  const monthShort = MONTH_NAMES[(m - 1) % 12];

  const monthFull = MONTH_FULL_NAMES[(m - 1) % 12];

  const ordinalDay = getOrdinalDay(d);

  const zodiac = getZodiacSign(d, m);



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

    0,

    0,

    0,

  );

  if (next < now)

    next = new Date(

      now.getFullYear() + 1,

      CONFIG.birthDate.month - 1,

      CONFIG.birthDate.day,

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

  document.getElementById("dynamic-greeting").textContent = g;

}



/* ==========================================================================

   STARS + AMBIENT PARTICLE LAYERS (pure canvas/CSS, zero deps)

   ========================================================================== */

function initStars() {

  const canvas = document.getElementById("stars-canvas");

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



/* SFX Synthesizer Engine */

const AudioCtx = window.AudioContext || window.webkitAudioContext;

let audioCtx = null;

function getAudioCtx() {

  if (!audioCtx) audioCtx = new AudioCtx();

  if (audioCtx.state === "suspended") audioCtx.resume();

  return audioCtx;

}



function playPopSound() {

  try {

    const ctx = getAudioCtx();

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



function spawnFloaty(container, emojiList, opts = {}) {

  const el = document.createElement("div");

  el.className = "floaty";

  el.style.pointerEvents = "auto";

  el.style.cursor = "pointer";

  el.textContent = repairMojibake(

    emojiList[Math.floor(Math.random() * emojiList.length)],

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



  // bokeh

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

  // glass blobs

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

  // fireflies

  for (let i = 0; i < 6; i++) {

    const f = document.createElement("div");

    f.className = "firefly";

    f.style.left = Math.random() * 100 + "%";

    f.style.top = 20 + Math.random() * 70 + "%";

    f.style.animationDelay = Math.random() * 6 + "s";

    layer.appendChild(f);

  }

  // periodic ambient floaties: hearts / butterflies / petals / sparkles

  setInterval(

    () =>

      spawnFloaty(layer, ["💖", "💕", "✨"], {

        duration: 9 + Math.random() * 6,

      }),

    2600,

  );

  setInterval(

    () => spawnFloaty(layer, ["🦋"], { duration: 14, size: 22 }),

    6200,

  );

  setInterval(

    () => spawnFloaty(layer, ["🌸", "🌺"], { duration: 11, size: 16 }),

    4800,

  );

}



/* ==========================================================================

   CONFETTI / FIREWORKS / BALLOONS (custom canvas physics)

   ========================================================================== */

const burstCanvas = document.createElement("canvas");

burstCanvas.style.cssText =

  "position:fixed;inset:0;z-index:80;pointer-events:none;width:100%;height:100%;";

document.body.appendChild(burstCanvas);

const bctx = burstCanvas.getContext("2d");

function resizeBurst() {

  burstCanvas.width = innerWidth;

  burstCanvas.height = innerHeight;

}

window.addEventListener("resize", resizeBurst);

resizeBurst();



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

animateBursts();



function launchFireworksShow(duration = 3200) {

  const end = Date.now() + duration;

  (function tick() {

    fireworkBurst(

      Math.random() * innerWidth,

      innerHeight * 0.2 + Math.random() * innerHeight * 0.35,

    );

    if (Date.now() < end) setTimeout(tick, 420);

  })();

}

function playPopSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const sCtx = new AudioCtx();
    const osc = sCtx.createOscillator();
    const gain = sCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(480, sCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, sCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.35, sCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, sCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(sCtx.destination);
    osc.start();
    osc.stop(sCtx.currentTime + 0.09);
  } catch(e){}
}

function playBlowSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const sCtx = new AudioCtx();
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
  } catch(e){}
}

function parseYouTubeStartSec(url, customStart) {
  let sec = 0;
  if (customStart) {
    const str = String(customStart).trim();
    if (str.includes(":")) {
      const parts = str.split(":");
      sec = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
    } else {
      sec = parseInt(str) || 0;
    }
  }
  if (!sec && url) {
    try {
      const match = url.match(/[?&](?:t|start)=([^&]+)/);
      if (match && match[1]) {
        const t = match[1];
        if (t.includes("m") || t.includes("s")) {
          const m = t.match(/(?:(\d+)m)?(?:(\d+)s)?/);
          if (m) {
            sec = (parseInt(m[1]) || 0) * 60 + (parseInt(m[2]) || 0);
          }
        } else {
          sec = parseInt(t) || 0;
        }
      }
    } catch(e){}
  }
  return (sec && sec > 0) ? sec : 0;
}

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



/* ==========================================================================

   WEB AUDIO — soft original piano melody (no external files)

   ========================================================================== */

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

    const fileOrUrl = CONFIG.music ? CONFIG.music.file : null;
    const ytId = extractYouTubeId(fileOrUrl);

    if (ytId) {
      const container = document.getElementById("yt-player-container");
      const existingIframe = document.getElementById("yt-iframe");
      if (container) {
        if (audioEl) { audioEl.pause(); }

        // If iframe for the same video already exists, resume without restarting!
        if (existingIframe && currentYtId === ytId) {
          try {
            existingIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          } catch(e){}
          playing = true;
          return;
        }

        // New YouTube video: embed iframe with optional start time parameter
        currentYtId = ytId;
        const startSec = parseYouTubeStartSec(fileOrUrl, CONFIG.music ? CONFIG.music.startTime : null);
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

      if (!audioEl) {
        audioEl = new Audio(fileOrUrl);
        audioEl.loop = true;
        audioEl.volume = 0.5;
        audioEl.addEventListener("error", () => {
          console.warn("Local audio file failed or missing. Falling back to Web Audio melody.");
          CONFIG.music.file = null;
          playing = false;
          play();
        });
      } else if (audioEl.src !== fileOrUrl && !audioEl.src.endsWith(fileOrUrl)) {
        audioEl.src = fileOrUrl;
      }

      audioEl.play().then(() => {
        playing = true;
      }).catch(() => {
        CONFIG.music.file = null;
        playing = false;
        play();
      });
      return;
    }

    currentYtId = null;
    initCtx();
    if (ctx.state === "suspended") {
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
      // Pause YouTube player without destroying iframe
      try {
        existingIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      } catch(e){}
    }

    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }



  function setVolume(val) {

    if (gainNode) gainNode.gain.value = val;

    if (audioEl) audioEl.volume = val;

  }

  return { play, pause, setVolume, isPlaying: () => playing };

})();






function initCursor() {

  if (window.matchMedia("(hover:none), (pointer:coarse)").matches) return;

  const dot = document.getElementById("cursor-dot");

  const ring = document.getElementById("cursor-ring");

  let mx = innerWidth / 2,

    my = innerHeight / 2,

    rx = mx,

    ry = my;

  window.addEventListener("mousemove", (e) => {

    mx = e.clientX;

    my = e.clientY;

    dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;

    if (Math.random() < 0.12) {

      const s = document.createElement("div");

      s.className = "sparkle-trail";

      const size = 3 + Math.random() * 4;

      s.style.width = size + "px";

      s.style.height = size + "px";

      s.style.left = mx + "px";

      s.style.top = my + "px";

      document.body.appendChild(s);

      setTimeout(() => s.remove(), 850);

    }

  });

  (function raf() {

    rx += (mx - rx) * 0.48;

    ry += (my - ry) * 0.48;

    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;

    requestAnimationFrame(raf);

  })();

  document

    .querySelectorAll("a,button,.tilt-card,.polaroid,.envelope,.giftbox")

    .forEach((el) => {

      el.addEventListener("mouseenter", () =>

        document.body.classList.add("cursor-hover"),

      );

      el.addEventListener("mouseleave", () =>

        document.body.classList.remove("cursor-hover"),

      );

    });

  document.addEventListener("click", (e) => {

    const r = document.createElement("div");

    r.className = "click-ripple";

    r.style.left = e.clientX + "px";

    r.style.top = e.clientY + "px";

    document.body.appendChild(r);

    setTimeout(() => r.remove(), 650);

  });

}



function initMagnetic() {

  document.querySelectorAll(".magnetic").forEach((btn) => {

    btn.addEventListener("mousemove", (e) => {

      const r = btn.getBoundingClientRect();

      const x = e.clientX - r.left - r.width / 2,

        y = e.clientY - r.top - r.height / 2;

      btn.style.transform = `translate(${x * 0.28}px, ${y * 0.35}px)`;

    });

    btn.addEventListener("mouseleave", () => {

      btn.style.transform = "translate(0,0)";

    });

  });

}



function initTilt() {

  document

    .querySelectorAll(".info-card, .polaroid, .letter-paper")

    .forEach((card) => {

      card.classList.add("tilt-card");

      card.addEventListener("mousemove", (e) => {

        const r = card.getBoundingClientRect();

        const px = (e.clientX - r.left) / r.width - 0.5,

          py = (e.clientY - r.top) / r.height - 0.5;

        card.style.transform = `perspective(700px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg)`;

      });

      card.addEventListener("mouseleave", () => {

        card.style.transform = "perspective(700px) rotateY(0) rotateX(0)";

      });

    });

}



function initGyro() {

  if (!window.DeviceOrientationEvent) return;

  function handle(e) {

    const beta = e.beta || 0,

      gamma = e.gamma || 0;

    document.querySelectorAll(".blob").forEach((b, i) => {

      b.style.transform = `translate(${gamma * 0.6}px, ${beta * 0.4}px)`;

    });

  }

  if (typeof DeviceOrientationEvent.requestPermission === "function") {

    document.getElementById("envelope").addEventListener(

      "click",

      () => {

        DeviceOrientationEvent.requestPermission()

          .then((res) => {

            if (res === "granted")

              window.addEventListener("deviceorientation", handle);

          })

          .catch(() => {});

      },

      { once: true },

    );

  } else {

    window.addEventListener("deviceorientation", handle);

  }

}



/* ==========================================================================

   SCROLL REVEAL (IntersectionObserver — works with or without GSAP)

   ========================================================================== */

function initReveal() {

  const io = new IntersectionObserver(

    (entries) => {

      entries.forEach((en) => {

        if (en.isIntersecting) en.target.classList.add("in-view");

      });

    },

    { threshold: 0.18 },

  );

  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));



  // final scene trigger

  const finalIO = new IntersectionObserver(

    (entries) => {

      entries.forEach((en) => {

        if (en.isIntersecting) {

          triggerFinalScene();

          finalIO.disconnect();

        }

      });

    },

    { threshold: 0.5 },

  );

  finalIO.observe(document.getElementById("final-scene"));



  // dawn transition: interpolate sky colors with scroll progress

  window.addEventListener(

    "scroll",

    () => {

      const doc = document.documentElement;

      const progress =

        doc.scrollTop / (doc.scrollHeight - doc.clientHeight || 1);

      const root = document.documentElement.style;

      if (progress > 0.55) {

        const t = Math.min((progress - 0.55) / 0.45, 1);

        root.setProperty("--sky-bot", mixColor("#170b30", "#2a0f3d", t));

        root.setProperty(

          "--sky-mid",

          mixColor("#0a0618", "#170b30", Math.min(t * 1.3, 1)),

        );

      }

    },

    { passive: true },

  );

}

function mixColor(a, b, t) {

  const ah = a

    .replace("#", "")

    .match(/.{2}/g)

    .map((x) => parseInt(x, 16));

  const bh = b

    .replace("#", "")

    .match(/.{2}/g)

    .map((x) => parseInt(x, 16));

  const rc = ah.map((v, i) => Math.round(v + (bh[i] - v) * t));

  return `rgb(${rc.join(",")})`;

}



/* ==========================================================================

   SCENE LOGIC: loading -> intro -> envelope -> open experience

   ========================================================================== */

function runLoadingSequence() {

  const fill = document.getElementById("loader-fill");

  const pct = document.getElementById("loader-pct");

  let p = 0;

  const timer = setInterval(() => {

    p += 12;

    if (p >= 100) {

      p = 100;

      clearInterval(timer);

      onLoadComplete();

    }

    fill.style.width = p + "%";

    pct.textContent = `Loading memories... ${Math.floor(p)}%`;

  }, 140);

}



function onLoadComplete() {

  document.getElementById("loader-track").style.display = "none";

  document.getElementById("loader-pct").style.display = "none";

  if (CONFIG.passcode.enabled) {

    document.getElementById("passcode-wrap").classList.add("show");

    initPasscode();

  } else {

    document.getElementById("tap-enter").classList.add("show");

    document

      .getElementById("loading-screen")

      .addEventListener("click", enterIntro, { once: true });

  }

}



function initPasscode() {

  let entered = "";

  const dotsWrap = document.getElementById("passcode-dots");

  const dots = [...dotsWrap.querySelectorAll(".pc-dot")];

  const passWrap = document.getElementById("passcode-wrap");

  const hint = document.getElementById("pc-hint");



  if (isWishCustomized()) {
    hint.textContent = CONFIG.passcode?.customHint || "Hint: think of a date that matters 💕";
  } else {
    CONFIG.passcode.code = "1234";
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

    if (locked || entered.length >= CONFIG.passcode.code.length) return;

    entered += n;

    updateDots();

    if (entered.length === CONFIG.passcode.code.length) {

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

    if (entered === CONFIG.passcode.code) {

      dots.forEach((d) => {

        d.classList.add("success");

      });

      confettiBurst(innerWidth / 2, innerHeight * 0.35, 50);

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

  document.getElementById("pc-back").addEventListener("click", backspace);



  window.addEventListener("keydown", (e) => {

    if (!document.getElementById("passcode-wrap").classList.contains("show"))

      return;

    if (/^[0-9]$/.test(e.key)) pressDigit(e.key);

    if (e.key === "Backspace") backspace();

  });

}



function enterIntro() {

  const loading = document.getElementById("loading-screen");

  loading.style.opacity = "0";

  loading.style.filter = "blur(12px)";

  setTimeout(() => {

    loading.style.display = "none";

  }, 900);



  const intro = document.getElementById("intro-scene");

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

    },

  );

}



function typeLine(el, text, done) {

  let i = 0;

  text = repairMojibake(text);

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

  intro.style.opacity = "0";

  intro.style.filter = "blur(16px)";

  setTimeout(() => {

    intro.style.display = "none";

  }, 900);

  document.getElementById("experience").classList.add("revealed");

  document.getElementById("music-widget").classList.add("show");

  MusicEngine.play();

  updateMusicWidgetUI(true);

  setTimeout(startExperienceEffects, 80);

}



let experienceEffectsStarted = false;

function startExperienceEffects() {

  if (experienceEffectsStarted) return;

  experienceEffectsStarted = true;

  initStars();

  initAmbientLayer();

  initCursor();

  initMagnetic();

  initTilt();

}



function initEnvelope() {

  const env = document.getElementById("envelope");

  const letterScene = document.getElementById("letter-scene");

  env.addEventListener("click", () => {
    if (env.classList.contains("open")) return;
    env.classList.add("open");
    confettiBurst(innerWidth / 2, innerHeight * 0.35, 40);

    // Unlock all subsequent sections now that envelope seal is opened!
    const exp = document.getElementById("experience");
    if (exp) exp.classList.add("unlocked-all");
    if (typeof updateTimelineLine === "function") updateTimelineLine();

    setTimeout(() => {
      letterScene.classList.add("letter-ready");
    }, 900);

    setTimeout(() => {

      document

        .getElementById("letter-scene")

        .scrollIntoView({ behavior: "smooth" });

      setTimeout(typeLetterBody, 750);

    }, 1900);

  });

}



function typeLetterBody() {

  const paras = document.querySelectorAll("#letter-body p");

  let i = 0;

  (function next() {

    if (i >= paras.length) {
      window.letterTyped = true;
      return;
    }

    const p = paras[i];

    p.innerHTML = "";

    const html = CONFIG.letterLines[i];

    // strip tags for typing speed calc but type raw text safely

    const temp = document.createElement("div");

    temp.innerHTML = html;

    const text = temp.textContent;

    let c = 0;

    (function type() {

      if (c <= text.length) {

        p.textContent = text.slice(0, c);

        c += 2;

        setTimeout(type, 18);

      } else {

        p.innerHTML = html; // restore formatting (highlight spans) once fully typed

        i++;

        if (i >= paras.length) {
          window.letterTyped = true;
        }

        setTimeout(next, 260);

      }

    })();

  })();

}



/* ==========================================================================

   SURPRISE + GIFT BOX + WIDGETS

   ========================================================================== */

function initSurprise() {

  document.getElementById("surprise-btn").addEventListener("click", (e) => {

    launchFireworksShow(3000);

    launchBalloons(12);

    confettiBurst(innerWidth / 2, innerHeight / 2, 160);

    if (!MusicEngine.isPlaying()) {

      MusicEngine.play();

      updateMusicWidgetUI(true);

    }

  });

}

function initGiftbox() {

  const box = document.getElementById("giftbox");

  const reveal = document.getElementById("gift-reveal");

  box.addEventListener("click", () => {

    box.classList.toggle("open");

    if (box.classList.contains("open")) {

      confettiBurst(

        box.getBoundingClientRect().left + 80,

        box.getBoundingClientRect().top,

        60,

      );

      reveal.classList.add("show");

    } else {

      reveal.classList.remove("show");

    }

  });

}



/* ==================== PREMIUM CAKE INTERACTION ==================== */

function cakeSound(kind) {

  try {

    const AC = window.AudioContext || window.webkitAudioContext;

    const ac = cakeSound.ac || (cakeSound.ac = new AC());

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

      now + dur,

    );

    gain.gain.setValueAtTime(0.0001, now);

    gain.gain.exponentialRampToValueAtTime(

      kind === "cheer" ? 0.08 : 0.05,

      now + 0.02,

    );

    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.start(now);

    osc.stop(now + dur);

  } catch (e) {}

}

function cakeParticles(x, y, emoji, count = 16) {

  const layer = document.getElementById("ambient-layer");

  for (let i = 0; i < count; i++) {

    const p = document.createElement("span");

    p.textContent = repairMojibake(emoji[i % emoji.length]);

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

    hint.textContent = "Your wish is in the stars...";

    blowBtn.style.display = "none";

    cutBtn.classList.add("show");

    const wish = document.getElementById("cake-wish");

    wish.textContent = "✨ Make a Wish ✨";

    wish.classList.add("show");

    document.body.classList.add("cake-night");

    setTimeout(() => {

      cakeSound("cheer");

      playCakeBirthdayMelody();

      launchFireworksShow(4200);

      confettiBurst(innerWidth / 2, innerHeight * 0.42, 220);

      launchBalloons(12);

      const flash = document.createElement("div");

      flash.style.cssText =

        "position:fixed;inset:0;z-index:90;background:#fff;pointer-events:none;animation:cakeFlash .7s ease-out forwards";

      document.body.appendChild(flash);

      setTimeout(() => flash.remove(), 750);

      const layer = document.getElementById("ambient-layer");

      let n = 0;

      const rain = setInterval(() => {

        spawnFloaty(layer, ["💖", "🦋", "🌸", "✨"], {

          duration: 6,

          size: 18,

        });

        if (++n > 32) clearInterval(rain);

      }, 140);

      wish.textContent = `Happy Birthday, ${CONFIG.name}`;

      wish.classList.add("cinematic");

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

      hint.textContent =

        "Microphone is unavailable — tap each candle to make your wish.";

      return;

    }

    try {

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      analyser = audioCtx.createAnalyser();

      analyser.fftSize = 512;

      audioCtx.createMediaStreamSource(stream).connect(analyser);

      hint.textContent = "Blow gently toward your microphone...";

      blowBtn.textContent = "Listening for your wish...";

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

        if (volume > 0.09) {

          blowingFrames++;

          document.getElementById("luxury-cake").style.filter =

            "drop-shadow(0 18px 16px rgba(255,118,36,.7))";

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

          document.getElementById("luxury-cake").style.filter = "";

        }

        requestAnimationFrame(listen);

      })();

    } catch (e) {

      hint.textContent =

        "Microphone permission was not granted — tap the candles instead.";

      blowBtn.style.display = "none";

    }

  }

  blowBtn.addEventListener("click", requestBlow);

  cutBtn.addEventListener("click", () => {

    const stage = document.getElementById("cake-stage");

    if (stage.classList.contains("cutting")) return;

    stage.classList.add("cutting");

    cakeSound("cut");

    const r = stage.getBoundingClientRect();

    cakeParticles(

      r.left + r.width * 0.58,

      r.top + r.height * 0.63,

      ["•", "✦", "♡"],

      34,

    );

    hint.textContent = "Here's your first slice ❤️";

    setTimeout(() => {

      cakeParticles(

        innerWidth / 2,

        innerHeight * 0.55,

        ["❤️", "💖", "💕"],

        26,

      );

      document.getElementById("cake-wish").textContent =

        "A slice of happiness, just for you";

      saveBtn.classList.add("show");

    }, 1200);

  });

  saveBtn.addEventListener("click", () => saveCakeMemory());

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

        const AC = window.AudioContext || window.webkitAudioContext,

          ac = cakeSound.ac || (cakeSound.ac = new AC()),

          o = ac.createOscillator(),

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

    }, i * 340),

  );

}

function saveCakeMemory() {

  showToast("Saving Memory Snapshot... 📸");

  const displayName = formatName(CONFIG.name || "Happy Birthday");

  const c = document.createElement("canvas");

  c.width = 1200;

  c.height = 800;

  const ctx = c.getContext("2d");



  // 1. Deep Luxury Radial Aurora Background

  const grad = ctx.createRadialGradient(600, 420, 40, 600, 400, 750);

  grad.addColorStop(0, "#320f48");

  grad.addColorStop(0.5, "#17082e");

  grad.addColorStop(1, "#090314");

  ctx.fillStyle = grad;

  ctx.fillRect(0, 0, 1200, 800);



  // Floating ambient sparkles

  for (let i = 0; i < 50; i++) {

    const sx = Math.random() * 1200;

    const sy = Math.random() * 800;

    const sr = Math.random() * 2.8 + 0.5;

    ctx.fillStyle = `rgba(255, 248, 252, ${Math.random() * 0.7 + 0.3})`;

    ctx.beginPath();

    ctx.arc(sx, sy, sr, 0, Math.PI * 2);

    ctx.fill();

  }



  // Double Golden Frame

  ctx.strokeStyle = "rgba(255, 215, 0, 0.55)";

  ctx.lineWidth = 3.5;

  ctx.strokeRect(36, 36, 1128, 728);

  ctx.strokeStyle = "rgba(255, 95, 162, 0.35)";

  ctx.lineWidth = 1.5;

  ctx.strokeRect(48, 48, 1104, 704);



  // Top Title

  ctx.fillStyle = "#FFD700";

  ctx.font = "italic 700 34px 'Playfair Display', Georgia, serif";

  ctx.textAlign = "center";

  ctx.fillText("✦ A BIRTHDAY MEMORY WORTH KEEPING ✦", 600, 100);



  // Main Greeting Name

  const greetingText = (CONFIG.name && CONFIG.name.trim()) 

    ? `Happy Birthday, ${displayName} ❤️` 

    : "Happy Birthday ❤️";



  ctx.shadowColor = "rgba(255, 95, 162, 0.8)";

  ctx.shadowBlur = 25;

  ctx.fillStyle = nameGrad;

  ctx.font = "bold 64px 'Dancing Script', 'Great Vibes', cursive, serif";

  ctx.fillText(greetingText, 600, 185);

  ctx.shadowBlur = 0;



  // Cake Stand & Plate Base

  ctx.fillStyle = "rgba(214, 182, 93, 0.35)";

  ctx.beginPath();

  ctx.ellipse(600, 680, 290, 48, 0, 0, Math.PI * 2);

  ctx.fill();



  const standGrad = ctx.createLinearGradient(350, 0, 850, 0);

  standGrad.addColorStop(0, "#FFF9E6");

  standGrad.addColorStop(0.5, "#FFFFFF");

  standGrad.addColorStop(1, "#FFE8B3");



  ctx.fillStyle = standGrad;

  ctx.strokeStyle = "#FFD700";

  ctx.lineWidth = 4;

  ctx.beginPath();

  ctx.ellipse(600, 670, 250, 34, 0, 0, Math.PI * 2);

  ctx.fill();

  ctx.stroke();



  // Tier 1 (Bottom Cake Layer)

  const cakeGrad1 = ctx.createLinearGradient(430, 0, 770, 0);

  cakeGrad1.addColorStop(0, "#FFF7FB");

  cakeGrad1.addColorStop(0.5, "#FFE8F3");

  cakeGrad1.addColorStop(1, "#FFD6EC");

  ctx.fillStyle = cakeGrad1;

  ctx.strokeStyle = "#E2A4C4";

  ctx.lineWidth = 3;

  ctx.beginPath();

  ctx.roundRect(430, 550, 340, 115, 20);

  ctx.fill();

  ctx.stroke();



  // Tier 2 (Middle Cake Layer)

  const cakeGrad2 = ctx.createLinearGradient(470, 0, 730, 0);

  cakeGrad2.addColorStop(0, "#FFFDF5");

  cakeGrad2.addColorStop(0.5, "#FFF5DC");

  cakeGrad2.addColorStop(1, "#FFE7BD");

  ctx.fillStyle = cakeGrad2;

  ctx.strokeStyle = "#D4AF37";

  ctx.lineWidth = 3;

  ctx.beginPath();

  ctx.roundRect(470, 455, 260, 100, 18);

  ctx.fill();

  ctx.stroke();



  // Tier 3 (Top Cake Layer)

  const cakeGrad3 = ctx.createLinearGradient(505, 0, 695, 0);

  cakeGrad3.addColorStop(0, "#FFF7FC");

  cakeGrad3.addColorStop(0.5, "#FFDDF0");

  cakeGrad3.addColorStop(1, "#FFB8DE");

  ctx.fillStyle = cakeGrad3;

  ctx.strokeStyle = "#E286B7";

  ctx.lineWidth = 3;

  ctx.beginPath();

  ctx.roundRect(505, 370, 190, 90, 16);

  ctx.fill();

  ctx.stroke();



  // Wavy Scalloped Drips for each Tier

  const drawDrips = (x, y, width, dripColor) => {

    ctx.fillStyle = dripColor;

    ctx.beginPath();

    ctx.moveTo(x, y);

    const numDrips = 6;

    const step = width / numDrips;

    for (let i = 0; i < numDrips; i++) {

      const cx1 = x + i * step + step * 0.3;

      const cy1 = y + (i % 2 === 0 ? 22 : 12);

      const cx2 = x + i * step + step * 0.7;

      const cy2 = y + (i % 2 === 0 ? 22 : 12);

      const ex = x + (i + 1) * step;

      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, ex, y);

    }

    ctx.lineTo(x + width, y - 10);

    ctx.lineTo(x, y - 10);

    ctx.closePath();

    ctx.fill();

  };

  drawDrips(430, 560, 340, "#FF4081");

  drawDrips(470, 465, 260, "#A855F7");

  drawDrips(505, 380, 190, "#FF4081");



  // Gold Pearl Borders at base of each tier

  const drawPearlBorder = (x, y, width) => {

    ctx.fillStyle = "#FFD700";

    const count = Math.floor(width / 14);

    for (let i = 0; i <= count; i++) {

      ctx.beginPath();

      ctx.arc(x + (i * width) / count, y, 4, 0, Math.PI * 2);

      ctx.fill();

    }

  };

  drawPearlBorder(430, 662, 340);

  drawPearlBorder(470, 552, 260);

  drawPearlBorder(505, 457, 190);



  // Top Tier Fruit Toppings & Roses

  ctx.font = "28px sans-serif";

  ctx.fillText("🍓 🍒 🌹 🍒 🍓", 600, 355);



  // Glowing Lit Candles

  [550, 600, 650].forEach((cx) => {

    // Candle Body

    const cGrad = ctx.createLinearGradient(cx - 5, 0, cx + 5, 0);

    cGrad.addColorStop(0, "#FFF");

    cGrad.addColorStop(0.5, "#FFB6D9");

    cGrad.addColorStop(1, "#FF80BF");

    ctx.fillStyle = cGrad;

    ctx.beginPath();

    ctx.roundRect(cx - 5, 298, 10, 55, 3);

    ctx.fill();



    // Candle Wick

    ctx.fillStyle = "#222";

    ctx.fillRect(cx - 1, 290, 2, 8);



    // Outer Flame Glow

    ctx.shadowColor = "#FF5722";

    ctx.shadowBlur = 22;

    ctx.fillStyle = "#FFD700";

    ctx.beginPath();

    ctx.ellipse(cx, 280, 8, 14, 0, 0, Math.PI * 2);

    ctx.fill();



    // Inner Flame Core

    ctx.fillStyle = "#FFFFFF";

    ctx.beginPath();

    ctx.ellipse(cx, 282, 3.5, 7, 0, 0, Math.PI * 2);

    ctx.fill();

    ctx.shadowBlur = 0;

  });



  // Bottom Signature

  ctx.fillStyle = "#FFB6D9";

  ctx.font = "italic 32px 'Dancing Script', cursive, serif";

  ctx.fillText(`Made with love for ${displayName} • ${new Date().toLocaleDateString()}`, 600, 745);



  const a = document.createElement("a");

  a.download = `birthday-memory-${displayName.toLowerCase()}.png`;

  a.href = c.toDataURL("image/png");

  a.click();

  showToast("Memory Snapshot Saved! 📸");

}



function updateMusicWidgetUI(playing) {

  const widget = document.getElementById("music-widget");

  widget.classList.toggle("paused", !playing);

  document.getElementById("music-toggle").textContent = playing

    ? "\u23F8"

    : "\u25B6";

}

function initMusicWidget() {

  const html = `<button id="music-toggle">\u25B6</button><div class="eq-bars"><span></span><span></span><span></span><span></span></div><input type="range" id="vol-slider" min="0" max="1" step="0.01" value="0.5">`;

  const widget = document.createElement("div");

  widget.id = "music-widget";

  widget.className = "glass";

  widget.innerHTML = html;

  document.body.appendChild(widget);

  widget.querySelector("#music-toggle").addEventListener("click", () => {

    if (MusicEngine.isPlaying()) {

      MusicEngine.pause();

      updateMusicWidgetUI(false);

    } else {

      MusicEngine.play();

      updateMusicWidgetUI(true);

    }

  });

  widget

    .querySelector("#vol-slider")

    .addEventListener("input", (e) =>

      MusicEngine.setVolume(parseFloat(e.target.value)),

    );

  MusicEngine.setVolume(0.5);

}



function exportInstaStory() {

  showToast("Generating HD Insta Story... ✨");

  const displayName = formatName(CONFIG.name || "Happy Birthday");

  const c = document.createElement("canvas");

  c.width = 1080;

  c.height = 1920;

  const ctx = c.getContext("2d");



  // 1. Deep Luxury Aurora Gradient Background

  const grad = ctx.createLinearGradient(0, 0, 1080, 1920);

  grad.addColorStop(0, "#0c061e");

  grad.addColorStop(0.35, "#240a3e");

  grad.addColorStop(0.7, "#17082c");

  grad.addColorStop(1, "#080314");

  ctx.fillStyle = grad;

  ctx.fillRect(0, 0, 1080, 1920);



  // 2. Glowing Radial Ambient Bokeh Lights

  const addBokeh = (x, y, r, color) => {

    const bg = ctx.createRadialGradient(x, y, 0, x, y, r);

    bg.addColorStop(0, color);

    bg.addColorStop(1, "transparent");

    ctx.fillStyle = bg;

    ctx.fillRect(x - r, y - r, r * 2, r * 2);

  };

  addBokeh(300, 400, 350, "rgba(255, 95, 162, 0.25)");

  addBokeh(800, 900, 400, "rgba(168, 85, 247, 0.25)");

  addBokeh(540, 1400, 380, "rgba(255, 215, 0, 0.2)");



  // 3. Floating Stars & Sparkles

  for (let i = 0; i < 40; i++) {

    const sx = Math.random() * 1080;

    const sy = Math.random() * 1920;

    const sr = Math.random() * 3 + 1;

    const sa = Math.random() * 0.7 + 0.3;

    ctx.fillStyle = `rgba(255, 247, 251, ${sa})`;

    ctx.beginPath();

    ctx.arc(sx, sy, sr, 0, Math.PI * 2);

    ctx.fill();

  }



  // 4. Double Golden & Pink Ornamental Frame

  ctx.lineWidth = 3;

  ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";

  ctx.beginPath();

  ctx.roundRect(50, 50, 980, 1820, 24);

  ctx.stroke();



  ctx.lineWidth = 1.5;

  ctx.strokeStyle = "rgba(255, 95, 162, 0.4)";

  ctx.beginPath();

  ctx.roundRect(68, 68, 944, 1784, 18);

  ctx.stroke();



  // Corner Sparkle Diamonds

  const drawCornerSparkle = (cx, cy) => {

    ctx.fillStyle = "#FFD700";

    ctx.font = "24px sans-serif";

    ctx.textAlign = "center";

    ctx.fillText("✦", cx, cy);

  };

  drawCornerSparkle(90, 105);

  drawCornerSparkle(990, 105);

  drawCornerSparkle(90, 1825);

  drawCornerSparkle(990, 1825);



  // 5. Header: "✦ HAPPY BIRTHDAY ✦"

  ctx.shadowColor = "rgba(255, 215, 0, 0.6)";

  ctx.shadowBlur = 18;

  ctx.fillStyle = "#FFD700";

  ctx.font = "bold 44px sans-serif";

  ctx.textAlign = "center";

  ctx.fillText("✦ HAPPY BIRTHDAY ✦", 540, 260);

  ctx.shadowBlur = 0;



  // 6. Recipient Name (Calligraphy & Glow)

  ctx.shadowColor = "rgba(255, 95, 162, 0.7)";

  ctx.shadowBlur = 30;

  ctx.fillStyle = "#FFF7FB";

  ctx.font = "700 105px 'Dancing Script', 'Great Vibes', cursive, serif";

  ctx.fillText(displayName, 540, 400);

  ctx.shadowBlur = 0;



  // 7. Dynamic Text Measurement & Lines Wrapping

  ctx.font = "400 36px 'Outfit', 'Poppins', sans-serif";

  const wrappedLines = [];

  CONFIG.letterLines.forEach((line) => {

    const clean = line.replace(/<[^>]*>/g, "");

    const words = clean.split(" ");

    let currentLine = "";

    words.forEach((w) => {

      const testLine = currentLine + w + " ";

      if (ctx.measureText(testLine).width > 720) {

        wrappedLines.push(currentLine.trim());

        currentLine = w + " ";

      } else {

        currentLine = testLine;

      }

    });

    if (currentLine) wrappedLines.push(currentLine.trim());

  });



  const lineHeight = 56;

  const textContentHeight = wrappedLines.length * lineHeight;

  const cardPaddingTop = 75;

  const cardPaddingBottom = 55;

  const cardHeight = textContentHeight + cardPaddingTop + cardPaddingBottom;

  const cardY = 480;



  // Render Middle Glassmorphism Card Box with DYNAMIC Height

  ctx.save();

  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";

  ctx.shadowBlur = 35;

  ctx.shadowOffsetY = 15;

  ctx.fillStyle = "rgba(255, 255, 255, 0.07)";

  ctx.strokeStyle = "rgba(255, 214, 236, 0.28)";

  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.roundRect(110, cardY, 860, cardHeight, 36);

  ctx.fill();

  ctx.stroke();

  ctx.restore();



  // Decorative Card Top Flowers

  ctx.fillStyle = "rgba(255, 182, 217, 0.9)";

  ctx.font = "30px sans-serif";

  ctx.fillText("🌸 ✦ 🌸", 540, cardY + 45);



  // Render Text Lines inside Card

  ctx.fillStyle = "#FFF7FB";

  ctx.font = "400 36px 'Outfit', 'Poppins', sans-serif";

  let curY = cardY + 110;

  wrappedLines.forEach((l) => {

    ctx.fillText(l, 540, curY);

    curY += lineHeight;

  });



  // Card Bottom Divider Line

  const dividerY = cardY + cardHeight - 25;

  ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";

  ctx.lineWidth = 1;

  ctx.beginPath();

  ctx.moveTo(340, dividerY);

  ctx.lineTo(740, dividerY);

  ctx.stroke();



  // 8. Sender Signature

  const sigY = cardY + cardHeight + 85;

  ctx.shadowColor = "rgba(255, 95, 162, 0.5)";

  ctx.shadowBlur = 12;

  ctx.fillStyle = "#FFB6D9";

  ctx.font = "italic 44px 'Dancing Script', cursive, serif";

  ctx.fillText(`With love, ${CONFIG.from}`, 540, sigY);

  ctx.shadowBlur = 0;



  // 9. Bottom Festive Tag

  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";

  ctx.font = "500 24px sans-serif";

  ctx.fillText("🎂 CELEBRATING ANOTHER BEAUTIFUL YEAR ✨", 540, sigY + 70);



  const a = document.createElement("a");

  a.download = `insta-story-${displayName.toLowerCase()}.png`;

  a.href = c.toDataURL("image/png");

  a.click();

  showToast("HD Insta Story Saved! 📸");

}



function encodeWishData(name, code, y, m, d) {
  try {
    const data = {
      n: name,
      c: (code && code !== "1234") ? code : undefined,
      y: (y && y !== 2001) ? y : undefined,
      m: (m && m !== 1) ? m : undefined,
      d: (d && d !== 1) ? d : undefined
    };
    const str = JSON.stringify(data);
    return btoa(encodeURIComponent(str))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  } catch (e) {
    return "";
  }
}

function decodeWishData(token) {
  try {
    let base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const str = decodeURIComponent(atob(base64));
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

function parseQueryParams() {
  const params = new URLSearchParams(location.search);
  const nameParam = params.get("name");
  const tokenParam = params.get("w") || params.get("wish");
  
  const rawCode = params.get("code");
  const rawY = params.get("y");
  const rawM = params.get("m");
  const rawD = params.get("d");

  if (tokenParam) {
    const decoded = decodeWishData(tokenParam);
    if (decoded) {
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
      return;
    }
  }

  if (nameParam) {
    CONFIG.name = formatName(nameParam);
    if (rawCode) {
      CONFIG.passcode.code = rawCode.trim();
    } else {
      CONFIG.passcode.code = "1234";
    }

    if (rawY || rawM || rawD) {
      CONFIG.birthDate = {
        year: parseInt(rawY) || CONFIG.birthDate.year || 2001,
        month: parseInt(rawM) || CONFIG.birthDate.month || 1,
        day: parseInt(rawD) || CONFIG.birthDate.day || 1
      };
    }
  } else {
    // If no name parameter in URL, ensure default passcode is 1234
    CONFIG.name = "";
    CONFIG.passcode.code = "1234";
  }
}



function checkAdminAccess() {
  const params = new URLSearchParams(location.search);
  const isEditParam = params.has("edit") || params.has("admin");

  const fab = document.getElementById("customizer-toggle-btn");
  if (!fab) return;

  if (isEditParam) {
    fab.classList.add("admin-visible");
  } else {
    fab.classList.remove("admin-visible");
    localStorage.removeItem("is_admin_user");
  }

  // Keyboard shortcut: Ctrl + Shift + E toggles admin mode
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e") {
      e.preventDefault();
      fab.classList.toggle("admin-visible");
      const active = fab.classList.contains("admin-visible");
      showToast(active ? "Admin Edit Mode Enabled ✏️" : "Admin Edit Mode Hidden 🔒");
    }
  });

  // Secret Double-Tap Gesture on Title/Logo -> Admin Password Prompt (2001)
  const logoEls = document.querySelectorAll(".logo-glow, .letter-title, h1");
  logoEls.forEach(el => {
    let tapCount = 0;
    let tapTimer = null;
    el.addEventListener("click", () => {
      tapCount++;
      clearTimeout(tapTimer);
      if (tapCount >= 2) {
        tapCount = 0;
        const pwd = prompt("🔑 Enter Admin Password:");
        if (pwd === "2001") {
          fab.classList.add("admin-visible");
          showToast("👑 Admin Mode Activated!");
          const modal = document.getElementById("customizer-modal");
          if (modal) modal.classList.add("open");
        } else if (pwd !== null) {
          showToast("Incorrect Admin Password ❌");
        }
      } else {
        tapTimer = setTimeout(() => { tapCount = 0; }, 400);
      }
    });
  });

  // Footer triple-click shortcut
  const footer = document.querySelector("footer");
  if (footer) {
    let clicks = 0;
    let timer = null;
    footer.addEventListener("click", () => {
      clicks++;
      clearTimeout(timer);
      if (clicks >= 3) {
        clicks = 0;
        fab.classList.toggle("admin-visible");
        const active = fab.classList.contains("admin-visible");
        showToast(active ? "Admin Edit Mode Enabled ✏️" : "Admin Edit Mode Hidden 🔒");
      } else {
        timer = setTimeout(() => { clicks = 0; }, 400);
      }
    });
  }
}

function initCustomizerModal() {

  parseQueryParams();

  checkAdminAccess();

  const backdrop = document.getElementById("customizer-modal");
  const toggleBtn = document.getElementById("customizer-toggle-btn");
  const closeBtn = document.getElementById("customizer-close-btn");
  const saveBtn = document.getElementById("customizer-save-btn");
  const shareLinkBtn = document.getElementById("customizer-share-link-btn");

  if (!backdrop || !toggleBtn) return;

  // Load saved config if available
  const savedMod = localStorage.getItem("custom_birthday_config");
  if (savedMod) {
    try {
      const parsed = JSON.parse(savedMod);
      if (parsed && typeof parsed === "object") Object.assign(CONFIG, parsed);
    } catch(e){}
  }

  // ─── ACCORDION TOGGLE ───
  function initAccordion() {
    document.querySelectorAll(".editor-section-header").forEach(header => {
      header.addEventListener("click", () => {
        const body = header.nextElementSibling;
        const wasOpen = header.classList.contains("active");
        // Close all sections
        document.querySelectorAll(".editor-section-header").forEach(h => {
          h.classList.remove("active");
          h.nextElementSibling.classList.remove("open");
        });
        // Toggle clicked one
        if (!wasOpen) {
          header.classList.add("active");
          body.classList.add("open");
        }
      });
    });
  }

  // ─── STRIP HTML TAGS (for CONFIG.letterLines which may contain <span> tags) ───
  function stripHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  // ─── RENDER LETTER INPUTS ───
  function renderLetterInputs() {
    const container = document.getElementById("letter-inputs-container");
    container.innerHTML = "";
    CONFIG.letterLines.forEach((line, i) => {
      const group = document.createElement("div");
      group.className = "form-group";
      group.innerHTML = `
        <label>Letter Line ${i + 1}</label>
        <small class="field-hint">Birthday letter ka ${i === 0 ? "pehla" : i === 1 ? "doosra" : i === 2 ? "teesra" : "last"} paragraph</small>
        <textarea class="letter-line-input" rows="2" data-index="${i}">${stripHtml(line)}</textarea>
      `;
      container.appendChild(group);
    });
  }

  // ─── RENDER REASON INPUTS ───
  function renderReasonInputs() {
    const container = document.getElementById("reasons-inputs-container");
    container.innerHTML = "";
    CONFIG.reasons.forEach((r, i) => {
      const group = document.createElement("div");
      group.className = "editor-item-group";
      group.innerHTML = `
        <div class="item-header">
          <span class="item-label">Reason Card ${i + 1}</span>
          <button type="button" class="item-delete-btn" data-type="reason" data-index="${i}" title="Delete">✕</button>
        </div>
        <div class="form-group">
          <div class="emoji-text-row">
            <div>
              <label>Icon</label>
              <input type="text" class="emoji-input reason-icon" value="${r.icon}" data-index="${i}" maxlength="4">
            </div>
            <div class="text-input">
              <label>Title</label>
              <input type="text" class="reason-title" value="${r.title}" data-index="${i}">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" class="reason-text" value="${r.text}" data-index="${i}">
        </div>
      `;
      container.appendChild(group);
    });
    // Bind delete buttons
    container.querySelectorAll(".item-delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index);
        if (CONFIG.reasons.length > 1) {
          CONFIG.reasons.splice(idx, 1);
          renderReasonInputs();
        } else {
          showToast("At least 1 reason required ⭐");
        }
      });
    });
  }

  // ─── RENDER WISH INPUTS ───
  function renderWishInputs() {
    const container = document.getElementById("wishes-inputs-container");
    container.innerHTML = "";
    CONFIG.wishes.forEach((w, i) => {
      const group = document.createElement("div");
      group.className = "editor-item-group";
      group.innerHTML = `
        <div class="item-header">
          <span class="item-label">Wish Quote ${i + 1}</span>
          <button type="button" class="item-delete-btn" data-type="wish" data-index="${i}" title="Delete">✕</button>
        </div>
        <div class="form-group">
          <textarea class="wish-input" rows="2" data-index="${i}">${w}</textarea>
        </div>
      `;
      container.appendChild(group);
    });
    container.querySelectorAll(".item-delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index);
        if (CONFIG.wishes.length > 1) {
          CONFIG.wishes.splice(idx, 1);
          renderWishInputs();
        } else {
          showToast("At least 1 wish required ✨");
        }
      });
    });
  }

  function compressImageFile(file, maxSide = 600, quality = 0.7) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
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
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
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

  // ─── RENDER GALLERY INPUTS ───
  function renderGalleryInputs() {
    const container = document.getElementById("gallery-inputs-container");
    container.innerHTML = "";
    CONFIG.gallery.forEach((g, i) => {
      const group = document.createElement("div");
      group.className = "editor-item-group";
      group.innerHTML = `
        <div class="item-header">
          <span class="item-label">Photo Tile ${i + 1}</span>
          <button type="button" class="item-delete-btn" data-type="gallery" data-index="${i}" title="Delete">✕</button>
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label style="font-size:0.75rem;opacity:0.85;">Photo Image (Upload real photo or leave empty for Emoji tile)</label>
          <div class="gallery-photo-row" style="display:flex;align-items:center;gap:10px;margin-top:6px;flex-wrap:wrap;">
            ${g.image ? `
              <div style="position:relative;width:50px;height:50px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,215,0,0.6);flex-shrink:0;">
                <img src="${g.image}" style="width:100%;height:100%;object-fit:cover;">
              </div>
              <button type="button" class="btn-remove-gallery-photo" data-index="${i}" style="background:rgba(255,0,80,0.2);border:1px solid rgba(255,0,80,0.4);color:#ff6b9d;padding:6px 12px;border-radius:6px;font-size:0.75rem;cursor:pointer;">✕ Remove Photo</button>
            ` : `
              <label style="background:rgba(255,215,0,0.1);border:1px dashed var(--gold, #ffd700);color:var(--gold,#ffd700);padding:8px 14px;border-radius:8px;font-size:0.8rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                📷 Select Photo from Device
                <input type="file" class="gallery-file-input" accept="image/*" data-index="${i}" style="display:none;">
              </label>
            `}
          </div>
        </div>
        <div class="form-group">
          <div class="emoji-text-row">
            <div>
              <label>Emoji Icon</label>
              <input type="text" class="emoji-input gallery-emoji" value="${g.emoji || '🎈'}" data-index="${i}" maxlength="4">
            </div>
            <div class="text-input">
              <label>Caption</label>
              <input type="text" class="gallery-cap" value="${g.cap || ''}" data-index="${i}">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Secret Note (back of card)</label>
          <input type="text" class="gallery-note" value="${g.secretNote || ""}" data-index="${i}">
        </div>
      `;
      container.appendChild(group);
    });

    // Bind file inputs
    container.querySelectorAll(".gallery-file-input").forEach(input => {
      input.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const idx = parseInt(input.dataset.index);
        const dataUrl = await compressImageFile(file);
        if (dataUrl) {
          CONFIG.gallery[idx].image = dataUrl;
          renderGalleryInputs();
          reRenderPage();
          showToast(`Photo added to Tile ${idx + 1}! 📸`);
        }
      });
    });

    // Bind remove photo buttons
    container.querySelectorAll(".btn-remove-gallery-photo").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index);
        CONFIG.gallery[idx].image = null;
        renderGalleryInputs();
        reRenderPage();
        showToast("Photo removed — Emoji tile restored ✨");
      });
    });

    // Bind delete item
    container.querySelectorAll(".item-delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index);
        if (CONFIG.gallery.length > 1) {
          CONFIG.gallery.splice(idx, 1);
          renderGalleryInputs();
          reRenderPage();
        } else {
          showToast("At least 1 gallery item required 📸");
        }
      });
    });
  }

  // ─── RENDER TIMELINE INPUTS ───
  function renderTimelineInputs() {
    const container = document.getElementById("timeline-inputs-container");
    container.innerHTML = "";
    CONFIG.timeline.forEach((t, i) => {
      const group = document.createElement("div");
      group.className = "editor-item-group";
      group.innerHTML = `
        <div class="item-header">
          <span class="item-label">Milestone ${i + 1}</span>
          <button type="button" class="item-delete-btn" data-type="timeline" data-index="${i}" title="Delete">✕</button>
        </div>
        <div class="form-group">
          <div class="emoji-text-row">
            <div>
              <label>Icon</label>
              <input type="text" class="emoji-input timeline-icon" value="${t.icon}" data-index="${i}" maxlength="4">
            </div>
            <div class="text-input">
              <label>Date / Period Label</label>
              <input type="text" class="timeline-date" value="${t.date}" data-index="${i}">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Title</label>
          <input type="text" class="timeline-title" value="${t.title}" data-index="${i}">
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" class="timeline-text" value="${t.text}" data-index="${i}">
        </div>
      `;
      container.appendChild(group);
    });
    container.querySelectorAll(".item-delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index);
        if (CONFIG.timeline.length > 1) {
          CONFIG.timeline.splice(idx, 1);
          renderTimelineInputs();
        } else {
          showToast("At least 1 milestone required 🕐");
        }
      });
    });
  }

  // ─── POPULATE ALL FIELDS ───
  function populateEditorFields() {
    // Basic Info starts completely blank with placeholders
    document.getElementById("input-name").value = "";
    document.getElementById("input-year").value = "";
    document.getElementById("input-month").value = "";
    document.getElementById("input-day").value = "";
    document.getElementById("input-passcode").value = "";

    // Sender
    document.getElementById("input-from").value = CONFIG.from || "";

    // Memory
    document.getElementById("input-memory").value = CONFIG.memory || "";

    // Gift
    document.getElementById("input-gift-message").value = CONFIG.gift?.message || "";
    document.getElementById("input-gift-coupon").value = CONFIG.gift?.coupon || "";

    // Music
    const musicInput = document.getElementById("input-music-url");
    if (musicInput) {
      const curFile = CONFIG.music?.file || "";
      musicInput.value = (curFile && !curFile.includes("assets/music/happy-birthday-song.mpeg")) ? curFile : "";
    }
    const musicStartInput = document.getElementById("input-music-start");
    if (musicStartInput) {
      musicStartInput.value = CONFIG.music?.startTime || "";
    }

    // Video Wish
    const vidUrlInput = document.getElementById("input-video-url");
    if (vidUrlInput) {
      vidUrlInput.value = CONFIG.videoWish?.url || "";
    }
    const vidStartInput = document.getElementById("input-video-start");
    if (vidStartInput) {
      vidStartInput.value = CONFIG.videoWish?.startTime || "";
    }
    const audText = document.getElementById("audio-upload-text");
    if (audText) {
      audText.textContent = (CONFIG.music?.file && CONFIG.music.isBlob) ? `🎙️ Attached: ${CONFIG.music.fileName || 'audio'}` : `🎙️ Select Audio / Voice Note`;
    }
    const vidText = document.getElementById("video-upload-text");
    if (vidText) {
      vidText.textContent = (CONFIG.videoWish?.file) ? `📹 Attached: ${CONFIG.videoWish.fileName || 'video'}` : `📹 Select Video from Device`;
    }

    const cakeFlavorSelect = document.getElementById("input-cake-flavor");
    if (cakeFlavorSelect) cakeFlavorSelect.value = CONFIG.cakeFlavor || "default";
    const letterFontSelect = document.getElementById("input-letter-font");
    if (letterFontSelect) letterFontSelect.value = CONFIG.letterFont || "cursive";

    // Dynamic sections
    renderLetterInputs();
    renderReasonInputs();
    renderWishInputs();
    renderGalleryInputs();
    renderTimelineInputs();
  }

  // ─── READ ALL VALUES FROM FORM ───
  function readAllValues() {
    const rawName = document.getElementById("input-name").value.trim();
    const nameVal = rawName ? formatName(rawName) : "";
    const yVal = parseInt(document.getElementById("input-year").value) || 2001;
    const mVal = parseInt(document.getElementById("input-month").value) || 1;
    const dVal = parseInt(document.getElementById("input-day").value) || 1;
    const rawPass = document.getElementById("input-passcode").value.trim();
    const passVal = nameVal ? (rawPass || "1234") : "1234";

    const fromVal = document.getElementById("input-from").value.trim() || CONFIG.from;
    const memoryVal = document.getElementById("input-memory").value.trim() || CONFIG.memory;
    const giftMsg = document.getElementById("input-gift-message").value.trim() || CONFIG.gift.message;
    const giftCoupon = document.getElementById("input-gift-coupon").value.trim() || CONFIG.gift.coupon;
    const musicInput = document.getElementById("input-music-url");
    const musicUrlVal = musicInput ? musicInput.value.trim() : "";
    const musicStartInput = document.getElementById("input-music-start");
    const musicStartVal = musicStartInput ? musicStartInput.value.trim() : "";

    const vidUrlInput = document.getElementById("input-video-url");
    const videoUrlVal = vidUrlInput ? vidUrlInput.value.trim() : "";
    const vidStartInput = document.getElementById("input-video-start");
    const videoStartVal = vidStartInput ? vidStartInput.value.trim() : "";

    // Letter lines
    const letterInputs = document.querySelectorAll(".letter-line-input");
    const letterLines = [];
    letterInputs.forEach((input, i) => {
      letterLines.push(input.value.trim() || CONFIG.letterLines[i] || "");
    });

    // Reasons (read from current inputs)
    const reasonIcons = document.querySelectorAll(".reason-icon");
    const reasonTitles = document.querySelectorAll(".reason-title");
    const reasonTexts = document.querySelectorAll(".reason-text");
    const reasons = [];
    reasonIcons.forEach((el, i) => {
      reasons.push({
        icon: el.value.trim() || CONFIG.reasons[i]?.icon || "💫",
        title: reasonTitles[i]?.value.trim() || CONFIG.reasons[i]?.title || "Special",
        text: reasonTexts[i]?.value.trim() || CONFIG.reasons[i]?.text || "",
      });
    });

    // Wishes
    const wishInputs = document.querySelectorAll(".wish-input");
    const wishes = [];
    wishInputs.forEach((el, i) => {
      wishes.push(el.value.trim() || CONFIG.wishes[i] || "");
    });

    // Gallery (read from current inputs)
    const galleryEmojis = document.querySelectorAll(".gallery-emoji");
    const galleryCaps = document.querySelectorAll(".gallery-cap");
    const galleryNotes = document.querySelectorAll(".gallery-note");
    const gallery = [];
    galleryEmojis.forEach((el, i) => {
      gallery.push({
        image: CONFIG.gallery[i]?.image || null,
        emoji: el.value.trim() || CONFIG.gallery[i]?.emoji || "🎈",
        rot: CONFIG.gallery[i]?.rot || ((i % 2 === 0 ? -1 : 1) * (3 + i * 2)),
        cap: galleryCaps[i]?.value.trim() || CONFIG.gallery[i]?.cap || "Memory",
        secretNote: galleryNotes[i]?.value.trim() || CONFIG.gallery[i]?.secretNote || "",
      });
    });

    // Timeline
    const tlIcons = document.querySelectorAll(".timeline-icon");
    const tlDates = document.querySelectorAll(".timeline-date");
    const tlTitles = document.querySelectorAll(".timeline-title");
    const tlTexts = document.querySelectorAll(".timeline-text");
    const timeline = [];
    tlIcons.forEach((el, i) => {
      timeline.push({
        icon: el.value.trim() || CONFIG.timeline[i]?.icon || "🌟",
        date: tlDates[i]?.value.trim() || CONFIG.timeline[i]?.date || "",
        title: tlTitles[i]?.value.trim() || CONFIG.timeline[i]?.title || "",
        text: tlTexts[i]?.value.trim() || CONFIG.timeline[i]?.text || "",
      });
    });

    const cakeFlavor = document.getElementById("input-cake-flavor")?.value || "default";
    const letterFont = document.getElementById("input-letter-font")?.value || "cursive";

    return { nameVal, yVal, mVal, dVal, passVal, fromVal, memoryVal, giftMsg, giftCoupon, musicUrlVal, musicStartVal, videoUrlVal, videoStartVal, letterLines, reasons, wishes, gallery, timeline, cakeFlavor, letterFont };
  }

  // ─── APPLY VALUES TO CONFIG & RE-RENDER PAGE ───
  function applyAllValues(vals) {
    CONFIG.name = vals.nameVal;
    CONFIG.birthDate = { year: vals.yVal, month: vals.mVal, day: vals.dVal };
    CONFIG.passcode.code = vals.nameVal ? vals.passVal : "1234";
    CONFIG.from = vals.fromVal;
    CONFIG.memory = vals.memoryVal;
    CONFIG.letterLines = vals.letterLines;
    CONFIG.reasons = vals.reasons;
    CONFIG.wishes = vals.wishes;
    CONFIG.gallery = vals.gallery;
    CONFIG.timeline = vals.timeline;
    CONFIG.gift = { message: vals.giftMsg, coupon: vals.giftCoupon };
    CONFIG.cakeFlavor = vals.cakeFlavor;
    CONFIG.letterFont = vals.letterFont;
    if (vals.musicUrlVal) {
      CONFIG.music = { file: vals.musicUrlVal, startTime: vals.musicStartVal };
    } else if (!CONFIG.music || !CONFIG.music.file) {
      CONFIG.music = { file: "assets/music/happy-birthday-song.mpeg", startTime: vals.musicStartVal };
    } else {
      CONFIG.music.startTime = vals.musicStartVal;
    }

    CONFIG.videoWish = CONFIG.videoWish || {};
    CONFIG.videoWish.url = vals.videoUrlVal;
    CONFIG.videoWish.startTime = vals.videoStartVal;

    // Re-render entire page content
    reRenderPage();
  }

  // Clear Music URL / YouTube Link
  const clearUrlBtn = document.getElementById("clear-music-url-btn");
  if (clearUrlBtn) {
    clearUrlBtn.addEventListener("click", () => {
      const urlInput = document.getElementById("input-music-url");
      if (urlInput) urlInput.value = "";
      const startInput = document.getElementById("input-music-start");
      if (startInput) startInput.value = "";
      CONFIG.music = { file: "assets/music/happy-birthday-song.mpeg", startTime: "" };
      MusicEngine.pause();
      showToast("YouTube link & start time cleared 🎵");
    });
  }

  // ─── SECTION RESET LOGIC ───
  function resetSection(sec) {
    if (!window.DEFAULT_CONFIG_BACKUP) return;
    const def = window.DEFAULT_CONFIG_BACKUP;

    switch (sec) {
      case "basic":
        CONFIG.name = "";
        CONFIG.birthDate = { year: 2001, month: 1, day: 1 };
        CONFIG.cakeFlavor = "default";
        CONFIG.passcode.code = "1234";
        const nInput = document.getElementById("input-name");
        if (nInput) nInput.value = "";
        const yInput = document.getElementById("input-year");
        if (yInput) yInput.value = "2001";
        const mInput = document.getElementById("input-month");
        if (mInput) mInput.value = "1";
        const dInput = document.getElementById("input-day");
        if (dInput) dInput.value = "1";
        const cakeSelect = document.getElementById("input-cake-flavor");
        if (cakeSelect) cakeSelect.value = "default";
        const passInput = document.getElementById("input-passcode");
        if (passInput) passInput.value = "1234";
        showToast("Basic Info reset to defaults 👤");
        break;

      case "sender":
        CONFIG.from = "your friends who adore you";
        const sInput = document.getElementById("input-from");
        if (sInput) sInput.value = "your friends who adore you";
        showToast("Sender Info reset to default 💌");
        break;

      case "letter":
        CONFIG.letterLines = JSON.parse(JSON.stringify(def.letterLines));
        CONFIG.letterFont = "default";
        const fontSelect = document.getElementById("input-letter-font");
        if (fontSelect) fontSelect.value = "default";
        renderLetterInputs();
        showToast("Birthday Letter reset to defaults 📝");
        break;

      case "memory":
        CONFIG.memory = def.memory;
        const memInput = document.getElementById("input-memory");
        if (memInput) memInput.value = def.memory;
        showToast("Special Memory reset to default 💭");
        break;

      case "reasons":
        CONFIG.reasons = JSON.parse(JSON.stringify(def.reasons));
        renderReasonInputs();
        showToast("Reasons reset to defaults ⭐");
        break;

      case "wishes":
        CONFIG.wishes = JSON.parse(JSON.stringify(def.wishes));
        renderWishInputs();
        showToast("Birthday Wishes reset to defaults ✨");
        break;

      case "gallery":
        CONFIG.gallery = JSON.parse(JSON.stringify(def.gallery));
        renderGalleryInputs();
        showToast("Photo Gallery reset to default emojis 📸");
        break;

      case "timeline":
        CONFIG.timeline = JSON.parse(JSON.stringify(def.timeline));
        renderTimelineInputs();
        showToast("Timeline reset to defaults 🕐");
        break;

      case "gift":
        CONFIG.gift = JSON.parse(JSON.stringify(def.gift));
        const gMsg = document.getElementById("input-gift-message");
        if (gMsg) gMsg.value = def.gift.message;
        const gCpn = document.getElementById("input-gift-coupon");
        if (gCpn) gCpn.value = def.gift.coupon;
        showToast("Gift Message reset to defaults 🎁");
        break;

      case "music":
        CONFIG.music = { file: "assets/music/happy-birthday-song.mpeg", startTime: "" };
        AudioStorage.removeAudio();
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
        MusicEngine.pause();
        showToast("Music reset to default melody 🎵");
        break;

      case "videowish":
        if (CONFIG.videoWish) {
          CONFIG.videoWish.url = "";
          CONFIG.videoWish.startTime = "";
          CONFIG.videoWish.file = null;
          CONFIG.videoWish.fileName = null;
        }
        VideoStorage.removeVideo();
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
        renderVideoWishSection();
        showToast("Video Wish reset 📹");
        break;
    }
  }

  // Attach individual section reset button listeners
  const sectionResetBtns = document.querySelectorAll(".reset-section-btn");
  sectionResetBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevents accordion expand/collapse toggle
      const sec = btn.dataset.reset;
      if (sec) resetSection(sec);
    });
  });

  // Restore All Default Messages button in header
  const resetMsgsBtn = document.getElementById("reset-default-messages-btn");
  if (resetMsgsBtn) {
    resetMsgsBtn.addEventListener("click", () => {
      const allSections = ["basic", "sender", "letter", "memory", "reasons", "wishes", "gallery", "timeline", "gift", "music", "videowish"];
      allSections.forEach(s => resetSection(s));
      showToast("Entire Wish reset to defaults! ✨");
    });
  }

  // ─── ADD ITEM HANDLERS ───
  document.getElementById("add-reason-btn").addEventListener("click", () => {
    CONFIG.reasons.push({ icon: "💫", title: "New Reason", text: "Write something special..." });
    renderReasonInputs();
  });

  document.getElementById("add-wish-btn").addEventListener("click", () => {
    CONFIG.wishes.push("Write a beautiful birthday wish...");
    renderWishInputs();
  });

  document.getElementById("add-gallery-btn").addEventListener("click", () => {
    CONFIG.gallery.push({
      image: null, emoji: "🎈", rot: Math.floor(Math.random() * 12 - 6),
      cap: "New Memory", secretNote: "A special moment ❤️"
    });
    renderGalleryInputs();
  });

  document.getElementById("add-timeline-btn").addEventListener("click", () => {
    CONFIG.timeline.push({ icon: "🌟", date: "Some time", title: "New Milestone", text: "Write about this moment..." });
    renderTimelineInputs();
  });

  // ─── OPEN MODAL ───
  toggleBtn.addEventListener("click", () => {
    playChimeSound();
    populateEditorFields();
    backdrop.classList.add("active");
    // Open first section by default
    const headers = document.querySelectorAll(".editor-section-header");
    const bodies = document.querySelectorAll(".editor-section-body");
    headers.forEach(h => h.classList.remove("active"));
    bodies.forEach(b => b.classList.remove("open"));
    if (headers[0]) headers[0].classList.add("active");
    if (bodies[0]) bodies[0].classList.add("open");
  });

  closeBtn.addEventListener("click", () => {
    backdrop.classList.remove("active");
  });

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) backdrop.classList.remove("active");
  });

  // ─── SAVE ───
  saveBtn.addEventListener("click", () => {
    const values = readAllValues();
    applyAllValues(values);

    // Save to localStorage (excluding large base64 images for URL, but keep for local)
    const saveData = JSON.parse(JSON.stringify(CONFIG));
    localStorage.setItem("custom_birthday_config", JSON.stringify(saveData));

    backdrop.classList.remove("active");
    playChimeSound();
    showToast(CONFIG.name ? `Wish updated for ${CONFIG.name}! ✨` : "Wish updated with defaults ✨");
  });

  // ─── SHARE LINK ───
  if (shareLinkBtn) {
    shareLinkBtn.addEventListener("click", async () => {
      const values = readAllValues();
      applyAllValues(values);

      const customUrl = buildRecipientShareUrl(values.nameVal);

      try {
        await navigator.clipboard.writeText(customUrl);
        showToast(values.nameVal ? `Custom link copied for ${values.nameVal}! 🔗` : "Custom link copied! 🔗");
      } catch(e) {
        showToast(`Link: ${customUrl}`);
      }

      backdrop.classList.remove("active");
    });
  }

  // Init accordion toggle
  initAccordion();
}


// ─── PHOTO LIGHTBOX HELPER FUNCTIONS ───
function openPhotoLightbox(src, caption) {
  const modal = document.getElementById("photo-lightbox");
  const img = document.getElementById("photo-lightbox-img");
  const cap = document.getElementById("photo-lightbox-caption");
  if (!modal || !img) return;
  img.src = src;
  if (cap) cap.textContent = caption || "";
  modal.classList.add("show");
}

function initPhotoLightbox() {
  const modal = document.getElementById("photo-lightbox");
  const closeBtn = document.getElementById("photo-lightbox-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => modal.classList.remove("show"));
  }
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("show");
    });
  }
}

// ─── RE-RENDER ENTIRE PAGE (called after Save & Apply) ───
function reRenderPage() {
  const nameVal = (CONFIG.name || "").trim();
  const displayName = nameVal ? formatName(nameVal) : "";

  // Letter Font Style
  const exp = document.getElementById("experience");
  if (exp) {
    exp.classList.remove("font-style-cursive", "font-style-serif", "font-style-script", "font-style-poppins", "font-style-nunito", "font-style-sans");
    if (CONFIG.letterFont && CONFIG.letterFont !== "default") {
      exp.classList.add(`font-style-${CONFIG.letterFont}`);
    }
  }

  // Cake Theme
  const cake = document.getElementById("luxury-cake");
  if (cake) {
    cake.classList.remove("cake-theme-chocolate", "cake-theme-vanilla", "cake-theme-strawberry");
    if (CONFIG.cakeFlavor && CONFIG.cakeFlavor !== "default") {
      cake.classList.add(`cake-theme-${CONFIG.cakeFlavor}`);
    }
    const numRow = cake.querySelector(".number-candles-row");
    if (numRow) numRow.remove();
  }

  // Title & Name slots
  document.title = displayName ? `Happy Birthday, ${displayName}! ❤️` : "Happy Birthday! ❤️";
  const slot1 = document.getElementById("name-slot-1");
  if (slot1) slot1.textContent = displayName ? `, ${displayName}` : "";
  const slot2 = document.getElementById("name-slot-2");
  if (slot2) slot2.textContent = displayName || "You";

  const fromSlot = document.getElementById("from-slot");
  if (fromSlot) fromSlot.textContent = CONFIG.from || "your friends";

  // Loading logo
  const logoEl = document.getElementById("loading-logo-glow") || document.querySelector(".logo-glow");
  if (logoEl) logoEl.textContent = displayName ? `✨ ${displayName}'s Birthday ✨` : "✨ Happy Birthday ✨";

  // Envelope
  const sealEl = document.getElementById("seal-initial");
  if (sealEl) sealEl.textContent = displayName ? displayName.charAt(0).toUpperCase() : "❤️";
  const peekEl = document.getElementById("letter-peek-text");
  if (peekEl) peekEl.textContent = displayName ? `For ${displayName} ❤️` : "For You ❤️";

  // Passcode hint
  const hintEl = document.getElementById("pc-hint");
  if (hintEl) {
    if (isWishCustomized()) {
      hintEl.textContent = CONFIG.passcode?.customHint || "Hint: think of a date that matters 💕";
    } else {
      hintEl.textContent = CONFIG.passcode?.defaultHint || "Hint: 1234 💕";
    }
  }

  // Birthday card
  updateBirthdayCard();

  // Letter body — re-render
  const letterBody = document.getElementById("letter-body");
  if (letterBody) {
    letterBody.innerHTML = "";
    CONFIG.letterLines.forEach(line => {
      const p = document.createElement("p");
      if (window.letterTyped) {
        p.innerHTML = line;
      }
      letterBody.appendChild(p);
    });
  }

  // Memory
  const memText = document.getElementById("memory-text");
  if (memText) memText.textContent = CONFIG.memory;

  // Reasons grid — re-render
  const reasonsGrid = document.getElementById("reasons-grid");
  if (reasonsGrid) {
    reasonsGrid.innerHTML = "";
    CONFIG.reasons.forEach((r, i) => {
      const el = document.createElement("div");
      el.className = "info-card glass reveal";
      el.style.setProperty("--i", i);
      el.innerHTML = `<span class="icon">${r.icon}</span><h3>${r.title}</h3><p>${r.text}</p>`;
      reasonsGrid.appendChild(el);
    });
  }

  // Wishes
  showRandomWish();

  // Gallery — re-render
  const deck = document.getElementById("gallery-deck");
  if (deck) {
    deck.innerHTML = "";
    CONFIG.gallery.forEach((g, i) => {
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
        }
        const zoomBtn = el.querySelector(".photo-zoom-btn");
        if (zoomBtn) {
          zoomBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openPhotoLightbox(g.image, g.cap);
          });
        }
      }
      el.addEventListener("click", () => {
        el.classList.toggle("flipped");
        playPaperRustle();
      });
      deck.appendChild(el);
    });
  }

  // Timeline — re-render
  const tl = document.getElementById("timeline-wrap");
  if (tl) {
    tl.innerHTML = "";
    CONFIG.timeline.forEach((t, i) => {
      const el = document.createElement("div");
      el.className = "timeline-item reveal";
      el.dataset.icon = t.icon;
      el.style.setProperty("--i", i);
      el.innerHTML = `<span class="t-date">${t.date}</span><h4>${t.title}</h4><p>${t.text}</p>`;
      tl.appendChild(el);
    });
    updateTimelineLine();
    setTimeout(updateTimelineLine, 300);
  }

  // Gift
  const giftMsg = document.getElementById("gift-message");
  if (giftMsg) giftMsg.textContent = CONFIG.gift.message;
  const giftCoupon = document.getElementById("gift-coupon");
  if (giftCoupon) giftCoupon.textContent = CONFIG.gift.coupon;

  // Video Wish & Age counter
  renderVideoWishSection();
  updateAgeCounter();
  buildDynamicGreeting();
  updateShareSection();

  // Re-init reveal for new elements
  initReveal();
}

function launchRealisticShootingStar() {
  const count = 5; // 5 shooting stars
  for (let i = 0; i < count; i++) {
    // 2.2 seconds stagger delay gap between each shooting star!
    setTimeout(() => {
      const streak = document.createElement("div");
      streak.className = "shooting-star-streak";
      const head = document.createElement("div");
      head.className = "shooting-star-head";
      streak.appendChild(head);
      document.body.appendChild(streak);

      // Start from near top-left corner with dynamic height variation (some higher, some slightly lower)
      const fromX = -60;
      const startYPositions = [-30, window.innerHeight * 0.12, -10, window.innerHeight * 0.20, window.innerHeight * 0.05];
      const fromY = (startYPositions[i % startYPositions.length]) + (Math.random() * 20 - 10);
      const angle = 21 + (Math.random() * 6 - 3); // shallow elegant angle across upper sky
      const distance = Math.hypot(window.innerWidth + 200, window.innerHeight + 100);

      streak.style.left = `${fromX}px`;
      streak.style.top = `${fromY}px`;
      streak.style.transform = `rotate(${angle}deg)`;
      streak.style.opacity = "1";

      // 2000ms (2.0s) duration for smooth & majestic slow movement
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
      confettiBurst(x, y, 40);
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
      showToast("🌟 Shooting stars filling the sky! Make a wish ✨");
    };
  }

  if (replayBtn) {
    replayBtn.onclick = (e) => {
      const rect = replayBtn.getBoundingClientRect();
      const x = e.clientX || (rect.left + rect.width / 2);
      const y = e.clientY || (rect.top + rect.height / 2);
      confettiBurst(x, y, 40);
      launchRealisticShootingStar();
      showToast("✨ A new meteor shower is passing across the sky! 🌠");
    };
  }
}

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

const VideoStorage = {
  dbName: "BirthdayWishVideoDB",
  storeName: "videos",
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
  async saveVideo(file) {
    try {
      const db = await this.openDB();
      const tx = db.transaction(this.storeName, "readwrite");
      tx.objectStore(this.storeName).put(file, "customVideo");
      return new Promise((res) => { tx.oncomplete = () => res(true); });
    } catch(e) { return false; }
  },
  async getVideo() {
    try {
      const db = await this.openDB();
      const tx = db.transaction(this.storeName, "readonly");
      const req = tx.objectStore(this.storeName).get("customVideo");
      return new Promise((res) => { req.onsuccess = () => res(req.result); });
    } catch(e) { return null; }
  },
  async removeVideo() {
    try {
      const db = await this.openDB();
      const tx = db.transaction(this.storeName, "readwrite");
      tx.objectStore(this.storeName).delete("customVideo");
    } catch(e){}
  }
};

function renderVideoWishSection() {
  const section = document.getElementById("video-wish-scene");
  const container = document.getElementById("video-wish-player-container");
  if (!section || !container) return;

  const file = CONFIG.videoWish?.file;
  const url = CONFIG.videoWish?.url;
  const startSec = parseYouTubeStartSec(url, CONFIG.videoWish?.startTime);
  const startParam = startSec > 0 ? `&start=${startSec}` : "";

  if (file) {
    section.style.display = "flex";
    container.innerHTML = `<video id="local-wish-video" controls playsinline style="width:100%;max-height:420px;border-radius:12px;display:block;" src="${file}"></video>`;
    if (startSec > 0) {
      const vid = document.getElementById("local-wish-video");
      if (vid) {
        vid.onloadedmetadata = () => { vid.currentTime = startSec; };
      }
    }
  } else if (url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const ytId = (match && match[2].length === 11) ? match[2] : null;
    if (ytId) {
      section.style.display = "flex";
      container.innerHTML = `<iframe width="100%" height="380" src="https://www.youtube.com/embed/${ytId}?enablejsapi=1${startParam}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius:12px;display:block;"></iframe>`;
    } else {
      section.style.display = "none";
      container.innerHTML = "";
    }
  } else {
    section.style.display = "none";
    container.innerHTML = "";
  }
}



function isHostedOnline() {

  return ["http:", "https:"].includes(location.protocol);

}



function buildRecipientShareUrl(overrideName) {
  const nameVal = (overrideName !== undefined ? overrideName : (CONFIG.name || "")).trim();
  let baseUrl = location.origin + location.pathname;
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = location.href.split("?")[0];
  }

  if (!nameVal) return baseUrl;

  const codeVal = (CONFIG.passcode?.code || "1234").trim();
  const yVal = CONFIG.birthDate?.year || 2001;
  const mVal = CONFIG.birthDate?.month || 1;
  const dVal = CONFIG.birthDate?.day || 1;

  const token = encodeWishData(nameVal, codeVal, yVal, mVal, dVal);

  let shareUrl = `${baseUrl}?name=${encodeURIComponent(nameVal)}`;
  if (token) shareUrl += `&w=${token}`;

  // If custom audio link or YouTube URL is set, append &music=
  if (CONFIG.music?.file && !CONFIG.music.file.startsWith("data:") && !CONFIG.music.file.includes("assets/music/happy-birthday-song.mpeg")) {
    shareUrl += `&music=${encodeURIComponent(CONFIG.music.file)}`;
  }
  if (CONFIG.music?.startTime) {
    shareUrl += `&t=${encodeURIComponent(CONFIG.music.startTime)}`;
  }
  if (CONFIG.videoWish?.url && !CONFIG.videoWish.url.startsWith("data:")) {
    shareUrl += `&v=${encodeURIComponent(CONFIG.videoWish.url)}`;
  }

  return shareUrl;
}

function isHostedOnline() {
  return ["http:", "https:"].includes(location.protocol);
}



function updateShareSection() {

  const shareUrl = buildRecipientShareUrl();



  const qrBox = document.getElementById("qr-box");

  if (qrBox) {

    const qrImg = new Image();

    qrImg.style.maxWidth = "180px";

    qrImg.style.borderRadius = "14px";

    qrImg.style.border = "3px solid rgba(255, 215, 0, 0.4)";

    qrImg.style.boxShadow = "0 8px 25px rgba(0,0,0,0.5)";

    

    const apiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`;

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



function initShare() {

  updateShareSection();



  const instaBtn = document.getElementById("insta-story-btn");
  if (instaBtn) instaBtn.addEventListener("click", exportInstaStory);

  const posterBtn = document.getElementById("download-poster-btn");
  if (posterBtn) posterBtn.addEventListener("click", exportInstaStory);



  // Copy Link Button

  const copyBtn = document.getElementById("copy-link-btn");

  if (copyBtn) {

    copyBtn.addEventListener("click", async () => {

      const shareUrl = buildRecipientShareUrl();

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



  // Native Share / WhatsApp Button
  const shareBtn = document.getElementById("native-share-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const shareUrl = buildRecipientShareUrl();
      const nameVal = (CONFIG.name || "").trim();
      const displayName = nameVal ? formatName(nameVal) : "";
      const greeting = displayName ? `Hey ${displayName}! 🎂✨` : `Hey! 🎂✨`;
      const shareMsg = `${greeting}\n\nMaine tumhare liye ek special Birthday Surprise banaya hai! 🎁💖\n\nKhol kar dekho 🎁:\n${shareUrl}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: displayName ? `Happy Birthday ${displayName}!` : "Happy Birthday Surprise!",
            text: `${greeting}\n\nMaine tumhare liye ek special Birthday Surprise banaya hai! 🎁💖\n\nKhol kar dekho 🎁:`,
            url: shareUrl,
          });
          return;
        } catch (e) {}
      }

      // WhatsApp direct fallback
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMsg)}`;
      window.open(waUrl, "_blank");
    });
  }

  // Dedicated WhatsApp Share Button
  const waBtn = document.getElementById("whatsapp-share-btn");
  if (waBtn) {
    waBtn.addEventListener("click", () => {
      const shareUrl = buildRecipientShareUrl();
      const nameVal = (CONFIG.name || "").trim();
      const displayName = nameVal ? formatName(nameVal) : "";
      const greeting = displayName ? `Hey ${displayName}! 🎂✨` : `Hey! 🎂✨`;
      const waText = `${greeting}\n\nMaine tumhare liye ek special Birthday Surprise banaya hai! 🎁💖\n\nKhol kar dekho 🎁:\n${shareUrl}`;
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
      window.open(waUrl, "_blank");
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



function showToast(msg) {

  const t = document.getElementById("toast");

  t.textContent = msg;

  t.classList.add("show");

  setTimeout(() => t.classList.remove("show"), 2200);

}



/* ==========================================================================

   FINAL SCENE

   ========================================================================== */

let finalTriggered = false;

function triggerFinalScene() {

  if (finalTriggered) return;

  finalTriggered = true;

  launchFireworksShow(4500);

  launchBalloons(16);

  confettiBurst(innerWidth / 2, innerHeight * 0.3, 200);

  setTimeout(

    () => confettiBurst(innerWidth * 0.2, innerHeight * 0.4, 120),

    500,

  );

  setTimeout(

    () => confettiBurst(innerWidth * 0.8, innerHeight * 0.4, 120),

    900,

  );

  const layer = document.getElementById("ambient-layer");

  let n = 0;

  const petalTimer = setInterval(() => {

    spawnFloaty(layer, ["🌸", "🌺", "💮"], { duration: 8, size: 18 });

    spawnFloaty(layer, ["💖", "💕"], { duration: 7, size: 16 });

    n++;

    if (n > 30) clearInterval(petalTimer);

  }, 200);

  setTimeout(

    () => document.getElementById("signature").classList.add("show"),

    800,

  );

}






function initMusicWidget() {
  const widget = document.getElementById("music-widget");
  const toggleBtn = document.getElementById("music-toggle-btn");
  const icon = document.getElementById("music-icon");
  const label = document.getElementById("music-label");

  if (!toggleBtn) return;

  function syncMusicUI() {
    const isPlaying = MusicEngine.isPlaying();
    if (icon) icon.textContent = isPlaying ? "🎶" : "🎵";
    if (label) label.textContent = isPlaying ? "Music Playing" : "Play Music";
    if (widget) widget.classList.toggle("playing", isPlaying);
  }

  toggleBtn.onclick = () => {
    if (MusicEngine.isPlaying()) {
      MusicEngine.pause();
      showToast("Music Paused 🔇");
    } else {
      MusicEngine.play();
      showToast("Playing Music 🎶");
    }
    syncMusicUI();
  };

  setInterval(syncMusicUI, 600);
}

(async function boot() {
  window.DEFAULT_CONFIG_BACKUP = JSON.parse(JSON.stringify(CONFIG));

  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch(e){}
  }

  parseQueryParams();

  const searchParams = new URLSearchParams(location.search);
  const hasRecipientParams = searchParams.has("name") || searchParams.has("w");

  if (hasRecipientParams) {
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
  } else if (!searchParams.has("admin")) {
    // Normal visit to root URL: start clean with default 1234 & default melody for a new recipient!
    localStorage.removeItem("custom_birthday_config");
    CONFIG.name = "";
    CONFIG.passcode.code = "1234";
    CONFIG.music = { file: "assets/music/happy-birthday-song.mpeg" };
  } else {
    // Admin mode (?admin=2001): load saved admin draft
    const savedConfig = localStorage.getItem("custom_birthday_config");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed && typeof parsed === "object") Object.assign(CONFIG, parsed);
      } catch(e){}
    }
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
  initPhotoLightbox();
  renderVideoWishSection();

  // Restore saved audio/voice note from IndexedDB if available
  try {
    const savedAudioBlob = await AudioStorage.getAudio();
    if (savedAudioBlob) {
      const blobUrl = URL.createObjectURL(savedAudioBlob);
      CONFIG.music = { file: blobUrl, isBlob: true, fileName: savedAudioBlob.name };
    }
  } catch(e){}

  // Restore saved video from IndexedDB if available
  try {
    const savedVidBlob = await VideoStorage.getVideo();
    if (savedVidBlob) {
      const blobUrl = URL.createObjectURL(savedVidBlob);
      CONFIG.videoWish = CONFIG.videoWish || {};
      CONFIG.videoWish.file = blobUrl;
      CONFIG.videoWish.fileName = savedVidBlob.name || "video.mp4";
      renderVideoWishSection();
    }
  } catch(e){}

  // Audio / Voice Note file input listeners
  const audFileInput = document.getElementById("input-audio-file");
  const audRemoveBtn = document.getElementById("remove-audio-file-btn");
  const audUploadText = document.getElementById("audio-upload-text");

  if (audFileInput) {
    audFileInput.addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      showToast("Saving audio/voice... ⏳");
      const blobUrl = URL.createObjectURL(f);
      CONFIG.music = { file: blobUrl, isBlob: true, fileName: f.name };

      await AudioStorage.saveAudio(f);

      if (audRemoveBtn) audRemoveBtn.style.display = "inline-block";
      if (audUploadText) audUploadText.textContent = `🎙️ Attached: ${f.name.substring(0, 18)}`;
      showToast("Audio / Voice note attached! 🎙️");
    });
  }

  if (audRemoveBtn) {
    audRemoveBtn.addEventListener("click", async () => {
      CONFIG.music = { file: "assets/music/happy-birthday-song.mpeg", startTime: "" };
      await AudioStorage.removeAudio();
      if (audFileInput) audFileInput.value = "";
      if (audUploadText) audUploadText.textContent = `🎙️ Select Audio / Voice Note`;
      const musicStartInput = document.getElementById("input-music-start");
      if (musicStartInput) musicStartInput.value = "";
      audRemoveBtn.style.display = "none";
      MusicEngine.pause();
      showToast("Custom audio removed — Default melody restored 🎵");
    });
  }

  // Video file input listeners in customizer modal
  const vidFileInput = document.getElementById("input-video-file");
  const vidRemoveBtn = document.getElementById("remove-video-file-btn");
  const vidUploadText = document.getElementById("video-upload-text");

  if (vidFileInput) {
    vidFileInput.addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      showToast("Saving video... ⏳");
      const blobUrl = URL.createObjectURL(f);
      CONFIG.videoWish = CONFIG.videoWish || {};
      CONFIG.videoWish.file = blobUrl;
      CONFIG.videoWish.fileName = f.name;

      await VideoStorage.saveVideo(f);

      if (vidRemoveBtn) vidRemoveBtn.style.display = "inline-block";
      if (vidUploadText) vidUploadText.textContent = `📹 Attached: ${f.name.substring(0, 18)}`;
      renderVideoWishSection();
      showToast("Video attached & saved! 📹");
    });
  }

  if (vidRemoveBtn) {
    vidRemoveBtn.addEventListener("click", async () => {
      if (CONFIG.videoWish) {
        CONFIG.videoWish.file = null;
        CONFIG.videoWish.fileName = null;
        CONFIG.videoWish.startTime = "";
      }
      await VideoStorage.removeVideo();
      if (vidFileInput) vidFileInput.value = "";
      if (vidUploadText) vidUploadText.textContent = `📹 Select Video from Device`;
      const vidStartInput = document.getElementById("input-video-start");
      if (vidStartInput) vidStartInput.value = "";
      vidRemoveBtn.style.display = "none";
      renderVideoWishSection();
      showToast("Video removed ✨");
    });
  }

  // Clear YouTube Video URL button
  const clearVidUrlBtn = document.getElementById("clear-video-url-btn");
  if (clearVidUrlBtn) {
    clearVidUrlBtn.addEventListener("click", () => {
      const vidInput = document.getElementById("input-video-url");
      if (vidInput) vidInput.value = "";
      const vidStartInput = document.getElementById("input-video-start");
      if (vidStartInput) vidStartInput.value = "";
      if (CONFIG.videoWish) {
        CONFIG.videoWish.url = "";
        CONFIG.videoWish.startTime = "";
      }
      renderVideoWishSection();
      showToast("Video link & start time cleared ✨");
    });
  }

  initMusicWidget();

  initShare();

  initCustomizerModal();

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

