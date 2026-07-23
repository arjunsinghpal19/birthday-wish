const CONFIG = {
  // For each new wish, change these two values first.
  name: "", // Person receiving the wish (leave blank for default "Happy Birthday")
  from: "your friends who adore you", // Your name / sender name
  birthDate: { year: 2001, month: 1, day: 1 }, // year, month (1-12), day — used for age counter & countdown
  seedYear: 2001, // optional: used only to show "turning N" if you want, else ignored
  adminPassword: "2001", // Owner Master Secret Password for Admin Editor Access

  passcode: {
    enabled: true, // set to false to skip the lock screen entirely
    code: "1234", // Change these 4 digits anytime to set a new passcode.
    defaultHint: "Hint: 1234 💕", // Default hint when no recipient name is set
    customHint: "Hint: think of a date that matters 💕", // Custom hint when recipient details are added
    hint: "Hint: 1234 💕",
  },

  letterLines: [
    "Some people just make the world feel a little warmer — you're one of them.",
    "Today isn't just about cake and candles, it's about celebrating <span class=\"highlight\">everything you are.</span>",
    "So here's to another year of your laugh, your kindness, and your beautifully chaotic energy.",
    "Happy Birthday. This one's just for you. 🎂",
  ],

  memory:
    "That one late night we didn't plan anything, just talked for hours and somehow it turned into one of the best memories I have. You have a way of turning ordinary moments into ones worth keeping.",

  reasons: [
    {
      icon: "💫",
      title: "Your energy",
      text: "You walk into a room and things just feel lighter.",
    },
    {
      icon: "🤝",
      title: "You show up",
      text: "Every single time, without needing to be asked.",
    },
    {
      icon: "😂",
      title: "That laugh",
      text: "Loud, unfiltered, and honestly contagious.",
    },
    {
      icon: "🌱",
      title: "You keep growing",
      text: "Watching you become more yourself is the best part.",
    },
  ],

  wishes: [
    "May this year hand you everything last year taught you to deserve.",
    "Wishing you a year as bright and unstoppable as you are.",
    "May your birthday be the gentle start of your best year yet.",
    "Here's to more laughter, less overthinking, and everything you're working towards.",
    "May you keep choosing yourself this year, the way you choose everyone else.",
  ],

  // Add image: "assets/photos/1.jpg" to any item below to show a real photo.
  // Keep image null to retain the emoji tile placeholder by default.
  gallery: [
    {
      image: null, // "assets/photos/1.jpg",
      emoji: "🎈",
      rot: -6,
      cap: "That day out",
      secretNote: "Remember this day? The vibe was so unmatchable! ✨"
    },
    {
      image: null, // "assets/photos/2.jpg",
      emoji: "🌇",
      rot: 4,
      cap: "Golden hour",
      secretNote: "Getting 50 photos, and this one was the best 📸"
    },
    {
      image: null, // "assets/photos/3.jpg",
      emoji: "🍰",
      rot: -3,
      cap: "Cake attempt #1",
      secretNote: "Half of the icing went on your nose before we cut it 🎂"
    },
    {
      image: null, // "assets/photos/4.jpg",
      emoji: "📸",
      rot: 6,
      cap: "Candid chaos",
      secretNote: "Pure unscripted laughter. Top 3 favorite moments!"
    },
    {
      image: null, // "assets/photos/5.jpg",
      emoji: "🎉",
      rot: -8,
      cap: "Last celebration",
      secretNote: "Here's to making this year's party 10x bigger! 🥂"
    },
  ],

  timeline: [
    {
      icon: "🌱",
      date: "Where it started",
      title: "First hello",
      text: "A small moment that quietly became something bigger.",
    },
    {
      icon: "🎈",
      date: "Somewhere along the way",
      title: "The inside jokes began",
      text: "The kind only the two of us understand.",
    },
    {
      icon: "🌟",
      date: "More recently",
      title: "Showing up, always",
      text: "Through the good weeks and the messy ones.",
    },
    {
      icon: "🎂",
      date: "Today",
      title: "Another year, together",
      text: "And many more still to come.",
    },
  ],

  gift: {
    message:
      "This isn't much, but it's from the heart — a small reminder that you're appreciated more than you know.",
    coupon: "🎟️ Redeem: one free hangout, no excuses allowed.",
  },

  music: {
    // Use this local song while the file exists. Set this to null (or remove the file)
    // anytime to automatically use the built-in melody instead.
    file: "assets/music/happy-birthday-song.mpeg",
  },
};

/* ==========================================================================
   CDN LOADER WITH AUTOMATIC MULTI-SOURCE FALLBACK
   If every source fails (blocked network, offline, etc.) the site
   still runs fully — GSAP/Lenis are optional enhancements only.
   ========================================================================== */
function loadScript(urls, timeout = 4000) {
  return new Promise((resolve) => {
    let i = 0;
    (function tryNext() {
      if (i >= urls.length) return resolve(false);
      const url = urls[i++];
      const s = document.createElement("script");
      s.src = url;
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          s.remove();
          tryNext();
        }
      }, timeout);
      s.onload = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(true);
        }
      };
      s.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          s.remove();
          tryNext();
        }
      };
      document.head.appendChild(s);
    })();
  });
}

let hasGSAP = false,
  hasLenis = false;

async function loadEnhancements() {
  const gsapOk = await loadScript([
    "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js",
    "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js",
    "https://unpkg.com/gsap@3.12.5/dist/gsap.min.js",
  ]);
  let stOk = false;
  if (gsapOk) {
    stOk = await loadScript([
      "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js",
      "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js",
      "https://unpkg.com/gsap@3.12.5/dist/ScrollTrigger.min.js",
    ]);
  }
  hasGSAP = gsapOk && typeof window.gsap !== "undefined";
  if (hasGSAP && stOk && window.ScrollTrigger)
    gsap.registerPlugin(ScrollTrigger);

  hasLenis = await loadScript([
    "https://cdnjs.cloudflare.com/ajax/libs/lenis/1.1.13/lenis.min.js",
    "https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js",
    "https://unpkg.com/@studio-freight/lenis@1.0.42/dist/lenis.min.js",
  ]);
  hasLenis = hasLenis && typeof window.Lenis !== "undefined";

  // Native browser wheel scrolling is more reliable across Live Server and hosted builds.
  if (false && hasLenis) {
    try {
      const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      function raf(t) {
        lenis.raf(t);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
      if (hasGSAP && window.ScrollTrigger) {
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((time) => {
          lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
      }
    } catch (e) {
      hasLenis = false;
    }
  }
}
