/**
 * ============================================================================
 * AUTHORITATIVE BIRTHDAY WISH DEFAULTS (js/core/wish-defaults.js)
 * Single Source of Truth for Default Wish Configuration & Section Templates.
 * ============================================================================
 */

(function (root) {
  "use strict";

  const DEFAULT_WISH_CONFIG = {
    name: "",
    from: "your friends who adore you",
    birthDate: { year: 2001, month: 1, day: 1 },
    seedYear: 2001,

    passcode: {
      enabled: true,
      code: "1234",
      defaultHint: "Hint: 1234 💕",
      customHint: "Hint: think of a date that matters 💕",
      hint: "Hint: 1234 💕"
    },

    letterLines: [
      "Some people just make the world feel a little warmer — you're one of them.",
      "Today isn't just about cake and candles, it's about celebrating <span class=\"highlight\">everything you are.</span>",
      "So here's to another year of your laugh, your kindness, and your beautifully chaotic energy.",
      "Happy Birthday. This one's just for you. 🎂"
    ],

    memory:
      "That one late night we didn't plan anything, just talked for hours and somehow it turned into one of the best memories I have. You have a way of turning ordinary moments into ones worth keeping.",

    reasons: [
      {
        icon: "💫",
        title: "Your energy",
        text: "You walk into a room and things just feel lighter."
      },
      {
        icon: "🤝",
        title: "You show up",
        text: "Every single time, without needing to be asked."
      },
      {
        icon: "😂",
        title: "That laugh",
        text: "Loud, unfiltered, and honestly contagious."
      },
      {
        icon: "🌱",
        title: "You keep growing",
        text: "Watching you become more yourself is the best part."
      }
    ],

    wishes: [
      "May this year hand you everything last year taught you to deserve.",
      "Wishing you a year as bright and unstoppable as you are.",
      "May your birthday be the gentle start of your best year yet.",
      "Here's to more laughter, less overthinking, and everything you're working towards.",
      "May you keep choosing yourself this year, the way you choose everyone else."
    ],

    gallery: [
      {
        image: null,
        emoji: "🎈",
        rot: -6,
        cap: "That day out",
        secretNote: "Remember this day? The vibe was so unmatchable! ✨"
      },
      {
        image: null,
        emoji: "🌇",
        rot: 4,
        cap: "Golden hour",
        secretNote: "Getting 50 photos, and this one was the best 📸"
      },
      {
        image: null,
        emoji: "🍰",
        rot: -3,
        cap: "Cake attempt #1",
        secretNote: "Half of the icing went on your nose before we cut it 🎂"
      },
      {
        image: null,
        emoji: "📸",
        rot: 6,
        cap: "Candid chaos",
        secretNote: "Pure unscripted laughter. Top 3 favorite moments!"
      },
      {
        image: null,
        emoji: "🎉",
        rot: -8,
        cap: "Last celebration",
        secretNote: "Here's to making this year's party 10x bigger! 🥂"
      }
    ],

    timeline: [
      {
        icon: "🌱",
        date: "Where it started",
        title: "First hello",
        text: "A small moment that quietly became something bigger."
      },
      {
        icon: "🎈",
        date: "Somewhere along the way",
        title: "The inside jokes began",
        text: "The kind only the two of us understand."
      },
      {
        icon: "🌟",
        date: "More recently",
        title: "Showing up, always",
        text: "Through the good weeks and the messy ones."
      },
      {
        icon: "🎂",
        date: "Today",
        title: "Another year, together",
        text: "And many more still to come."
      }
    ],

    gift: {
      message:
        "This isn't much, but it's from the heart — a small reminder that you're appreciated more than you know.",
      coupon: "🎟️ Redeem: one free hangout, no excuses allowed."
    },

    music: {
      file: "assets/music/happy-birthday-song.mpeg",
      startTime: "",
      duration: 0
    },

    videoWish: {
      url: "",
      startTime: "",
      duration: 0
    },

    letterFont: "default",
    letterTheme: "default",
    cakeFlavor: "default"
  };

  /**
   * Helper producing a fresh, deep-cloned copy of the default wish config.
   * @returns {Object} Deep clone of DEFAULT_WISH_CONFIG.
   */
  function getDefaultConfig() {
    return JSON.parse(JSON.stringify(DEFAULT_WISH_CONFIG));
  }

  /**
   * Helper producing a fresh, deep-cloned copy of a specific section default.
   * @param {string} sectionKey - Section property name (e.g. 'reasons', 'letterLines', 'gallery').
   * @returns {*} Deep clone of requested section default.
   */
  function getSectionDefault(sectionKey) {
    if (sectionKey in DEFAULT_WISH_CONFIG) {
      return JSON.parse(JSON.stringify(DEFAULT_WISH_CONFIG[sectionKey]));
    }
    return null;
  }

  /**
   * Checks whether a given memory string matches the default memory template.
   * @param {string} text - Memory text to test.
   * @returns {boolean} True if matching default memory text.
   */
  function isDefaultMemory(text) {
    if (!text || typeof text !== "string") return false;
    return text.includes("That one late night we didn't plan anything");
  }

  /**
   * Export authoritative WishDefaults namespace.
   */
  const WishDefaults = Object.freeze({
    DEFAULT_WISH_CONFIG: Object.freeze(JSON.parse(JSON.stringify(DEFAULT_WISH_CONFIG))),
    getDefaultConfig,
    getSectionDefault,
    isDefaultMemory
  });

  root.WishDefaults = WishDefaults;
  root.DEFAULT_CONFIG_BACKUP = WishDefaults.DEFAULT_WISH_CONFIG;

})(typeof window !== "undefined" ? window : globalThis);
