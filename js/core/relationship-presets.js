/**
 * ============================================================================
 * RELATIONSHIP PRESETS SYSTEM V2 (js/core/relationship-presets.js)
 * Comprehensive, deterministic content templates for all 12 relationship categories
 * in both English and Hinglish curated modes.
 *
 * Each preset provides:
 * - Letter Lines (3-4 paragraphs)
 * - Memory
 * - Reasons (4-5 items)
 * - Wishes (5 quotes)
 * - Gift (message + coupon)
 * - Timeline (4 milestones)
 * - Gallery (5 cards with caption, secretNote & emoji)
 * ============================================================================
 */

(function (root) {
  "use strict";

  const PRESETS_EN = {
    "friend": {
      id: "friend",
      label: "Friend 🤝",
      letterLines: [
        "Some people just make the world feel a little warmer and a lot more fun — you're definitely one of them.",
        "Today isn't just about cake and candles, it's about celebrating the fantastic energy, kindness, and laughs you bring into everyone's life.",
        "May this upcoming year be packed with spontaneous adventures, unforgettable conversations, and everything you've been working towards.",
        "Happy Birthday, my friend! Here's to making this year the most memorable one yet. 🎂✨"
      ],
      memory: "That spontaneous day out when we had zero plans, just talked and laughed for hours, and it turned into one of my absolute favorite memories.",
      reasons: [
        { icon: "✨", title: "Your Positive Energy", text: "You always bring an uplifting vibe that makes any gathering ten times better." },
        { icon: "🤝", title: "True Dependability", text: "Whenever anyone needs support or advice, you're always there with open ears." },
        { icon: "😂", title: "Contagious Laughter", text: "Your sense of humor and quick wit make everyday moments genuinely joyful." },
        { icon: "🌟", title: "Authentic Kindness", text: "You stay true to who you are, inspiring everyone around you to do the same." },
        { icon: "🎯", title: "Always Ambitious", text: "Your focus and determination to achieve your dreams is truly motivating." }
      ],
      wishes: [
        "May your year be filled with big wins, peaceful days, and countless reasons to smile!",
        "Wishing you 365 days of good health, thriving adventures, and unstoppable momentum!",
        "May every goal you set this year turn into an even bigger celebration!",
        "May your path ahead be blessed with true happiness, bright opportunities, and peace!",
        "Here's to celebrating you today and welcoming another fantastic chapter in your life!"
      ],
      gift: {
        message: "Here is your Official Friendship VIP Pass! Redeemable for unlimited coffee catchups, movie nights, and celebration treats.",
        coupon: "BEST-FRIEND-TREAT-2026"
      },
      timeline: [
        { icon: "👋", date: "First Meet", title: "How It All Began", text: "From a simple hello to an awesome friendship that grew with every conversation." },
        { icon: "🍕", date: "Hangouts", title: "Unfiltered Talks & Good Food", text: "Countless chai breaks, food runs, and memories we'll cherish forever." },
        { icon: "🚀", date: "Leveling Up", title: "Cheering Your Wins", text: "Watching you grow, tackle challenges, and constantly achieve new heights." },
        { icon: "🎂", date: "Today", title: "Celebrating You!", text: "Here's to another year of great memories, unstoppable laughter, and big wins." }
      ],
      gallery: [
        { image: null, emoji: "🎈", rot: -6, cap: "Good vibes only", secretNote: "That day we had zero agenda and the most fun!" },
        { image: null, emoji: "📸", rot: 4, cap: "Golden moments", secretNote: "Proof that we take great photos together!" },
        { image: null, emoji: "🍕", rot: -3, cap: "Food run champions", secretNote: "Half the bill was extra dessert, no regrets." },
        { image: null, emoji: "✨", rot: 5, cap: "Iconic duo", secretNote: "Every conversation with you leaves me in good spirits." },
        { image: null, emoji: "🎉", rot: -4, cap: "Birthday crew", secretNote: "Cheers to another 365 days of being awesome!" }
      ]
    },

    "best_friend": {
      id: "best_friend",
      label: "Best Friend (Close & Funny) 💖",
      letterLines: [
        "Happy Birthday to my favorite human, unpaid therapist, and lifelong partner in bad decisions!",
        "Life would be exceptionally boring (and honestly far too responsible) without you around to roast me, cheer for me, and make every single situation hilarious.",
        "On a serious note: having you in my corner is one of life's greatest blessings. You know all my quirks, all my stories, and you still stick around.",
        "May this year bring you heaps of cash, zero drama, endless good food, and everything you've ever wanted. Now hurry up and give us the birthday party! 🎂🥂"
      ],
      memory: "That legendary late-night call where we laughed until our stomachs hurt over the most ridiculous inside joke. Pure gold.",
      reasons: [
        { icon: "💎", title: "One in a Million", text: "A bond like ours is rare — you understand what I'm thinking with just a single look." },
        { icon: "🛡️", title: "Always Having My Back", text: "Through the highest highs and lowest lows, you have never hesitated to stand with me." },
        { icon: "🚀", title: "Partner in Chaos", text: "Every adventure we embark on turns into a wild story we'll be telling for decades." },
        { icon: "😂", title: "Chief Roaster", text: "Nobody roasts me harder, and nobody defends me faster when anyone else tries." },
        { icon: "💖", title: "Pure Gold Heart", text: "Behind all the teasing is the most loyal, caring, and genuine person I know." }
      ],
      wishes: [
        "May this year bring you all the magic, success, and endless laughter you deserve!",
        "Wishing you a year where your bank account grows and your stress disappears!",
        "Here's to another 365 days of being completely iconic and chaotic together!",
        "May every door you knock on open with huge opportunities and big wins!",
        "Happy Birthday! May your cake be sweet, your gifts be expensive, and your year be legendary!"
      ],
      gift: {
        message: "Lifetime Bestie Privilege Voucher: Valid for 24/7 rant sessions, emergency midnight food runs, and unconditional hype.",
        coupon: "BESTIE-FOR-LIFE-VIP"
      },
      timeline: [
        { icon: "🔥", date: "The Spark", title: "When We Clicked", text: "Realized in 5 minutes that we share the exact same chaotic brain cells." },
        { icon: "🌙", date: "Late Nights", title: "Midnight Adventures", text: "Deep talks, endless gossip, and food cravings at 2 AM." },
        { icon: "🏆", date: "Winning Together", title: "Surviving & Thriving", text: "Through every phase and challenge, we made it through together." },
        { icon: "👑", date: "Today", title: "Birthday Royalty!", text: "Celebrating the one and only best friend who makes life legendary." }
      ],
      gallery: [
        { image: null, emoji: "🤪", rot: -6, cap: "Certified chaotic", secretNote: "We look unhinged here, but it's my favorite picture!" },
        { image: null, emoji: "🍕", rot: 5, cap: "Midnight cravings", secretNote: "Eating junk food and talking about life goals." },
        { image: null, emoji: "📸", rot: -4, cap: "Looking iconic", secretNote: "Took 40 photos to get this one right!" },
        { image: null, emoji: "🌟", rot: 4, cap: "Day one energy", secretNote: "No matter how much time passes, nothing changes." },
        { image: null, emoji: "🎉", rot: -5, cap: "Party mode on", secretNote: "Ready to celebrate your special day in style!" }
      ]
    },

    "boyfriend": {
      id: "boyfriend",
      label: "Boyfriend 💙",
      letterLines: [
        "Happy Birthday to the most incredible guy who makes my world brighter and my heart fuller every single day.",
        "From our quietest moments to our biggest adventures, being with you is my favorite part of life. Thank you for your warmth, strength, and endless love.",
        "May this upcoming year bring you closer to all your big dreams, filled with laughter, success, and peaceful happiness.",
        "I am so grateful to celebrate you today. Here's to making today as special and handsome as you are! ❤️✨"
      ],
      memory: "That quiet evening we spent just talking about our future, listening to music, and laughing together — feeling completely at home with you.",
      reasons: [
        { icon: "🌟", title: "Your Gentle Strength", text: "You handle everything with patience, calm confidence, and genuine care." },
        { icon: "🥰", title: "How You Make Me Smile", text: "Even on the longest days, your presence instantly brings comfort and joy." },
        { icon: "🎯", title: "Your Drive & Ambition", text: "The dedication and passion you pour into your goals inspires me every day." },
        { icon: "❤️", title: "The Way You Love", text: "Attentive, thoughtful, and always making me feel deeply cherished and secure." },
        { icon: "🛡️", title: "My Safe Space", text: "With you, I can be 100% myself without any hesitation." }
      ],
      wishes: [
        "May this year open new doors, fulfill your biggest passions, and bring you endless joy!",
        "Wishing you a birthday full of celebration, great food, and everything you love!",
        "May the year ahead be as handsome, kind, and wonderful as you are!",
        "May every goal you've set turn into a proud victory this year!",
        "Happy Birthday, my love! I'm so excited for everything the future holds for us."
      ],
      gift: {
        message: "All-Access Birthday Privilege: Valid for a custom date night of your choice, your favorite meal, and unlimited pampering.",
        coupon: "LOVE-DATE-NIGHT-2026"
      },
      timeline: [
        { icon: "💫", date: "First Spark", title: "When I Fell for You", text: "That first conversation where I knew you were truly someone special." },
        { icon: "🌹", date: "Our Dates", title: "Creating Our Story", text: "Every drive, every dinner, and every little moment we've shared." },
        { icon: "🚀", date: "Growing Closer", title: "Side by Side", text: "Supporting each other through everything and building something real." },
        { icon: "🎂", date: "Today", title: "Celebrating My Favorite Person", text: "Wishing the happiest birthday to the guy who owns my heart." }
      ],
      gallery: [
        { image: null, emoji: "❤️", rot: -5, cap: "My favorite smile", secretNote: "You looked so handsome here!" },
        { image: null, emoji: "🌅", rot: 4, cap: "Golden hour memories", secretNote: "One of my absolute favorite days with you." },
        { image: null, emoji: "☕", rot: -4, cap: "Simple coffee dates", secretNote: "Just you, me, and endless conversations." },
        { image: null, emoji: "✨", rot: 6, cap: "Holding hands", secretNote: "Wherever we are, you feel like home." },
        { image: null, emoji: "🎂", rot: -3, cap: "Birthday boy", secretNote: "Celebrating the most special man in my world!" }
      ]
    },

    "girlfriend": {
      id: "girlfriend",
      label: "Girlfriend 🌸",
      letterLines: [
        "Happy Birthday to the most beautiful, radiant, and wonderful girl in my life!",
        "You bring so much sweetness, color, and warmth into every single day we share. Seeing your smile is genuinely my favorite thing in the world.",
        "I hope today treats you like the absolute queen you are — with all the love, surprises, and happiness your heart can hold.",
        "Thank you for being my constant joy, my sweetest companion, and my greatest blessing. I love you endlessly! 💖✨"
      ],
      memory: "That day we laughed until tears came out over something so small, and I looked at you and realized how deeply lucky I am.",
      reasons: [
        { icon: "🌸", title: "Your Gentle Warmth", text: "You have a heart so full of kindness that it touches everyone around you." },
        { icon: "✨", title: "Your Radiant Smile", text: "Your smile can brighten the darkest day and instantly melt any stress away." },
        { icon: "🎨", title: "Your Creative Soul", text: "The elegance, thoughtfulness, and beauty you bring to life is breathtaking." },
        { icon: "💖", title: "How Deeply You Care", text: "The love and consideration you show in the little details makes me so proud." },
        { icon: "👑", title: "My Absolute Queen", text: "Smart, gorgeous, strong, and effortlessly graceful in everything you do." }
      ],
      wishes: [
        "May this year bring you all the romance, success, and sweet surprises you deserve!",
        "Wishing you 365 days of blooming happiness, thriving dreams, and boundless love!",
        "May every candle you blow out bring a blessing that stays with you all year!",
        "May your life be as radiant, joyful, and gorgeous as you are today!",
        "Happy Birthday, my beautiful! Here's to making all your sweetest dreams come true."
      ],
      gift: {
        message: "Queen For The Day Pass: Valid for a dream pampering day, your favorite shopping spree, and unlimited cuddles.",
        coupon: "QUEEN-BIRTHDAY-TREAT"
      },
      timeline: [
        { icon: "✨", date: "First Glance", title: "The Moment I Knew", text: "The moment you smiled at me and made my entire world stop." },
        { icon: "🌷", date: "Sweet Memories", title: "Falling in Love", text: "Every walk, every laugh, and every sweet text that brought us closer." },
        { icon: "💖", date: "Our Journey", title: "Building Our World", text: "Making memories, supporting dreams, and growing together each day." },
        { icon: "🎂", date: "Today", title: "Celebrating My Queen", text: "Here's to treating you like royalty on your most special day!" }
      ],
      gallery: [
        { image: null, emoji: "🌸", rot: -5, cap: "Breathtaking", secretNote: "The prettiest smile I have ever seen." },
        { image: null, emoji: "🌹", rot: 4, cap: "Date night magic", secretNote: "You looked so stunning that whole evening." },
        { image: null, emoji: "📸", rot: -3, cap: "Candid sweetness", secretNote: "Pure, unscripted happiness right here." },
        { image: null, emoji: "✨", rot: 5, cap: "My whole world", secretNote: "Grateful for every single moment by your side." },
        { image: null, emoji: "🎉", rot: -4, cap: "Birthday Princess", secretNote: "Today and always, all my love is yours!" }
      ]
    },

    "husband": {
      id: "husband",
      label: "Husband 💍",
      letterLines: [
        "Happy Birthday to my life partner, my greatest strength, and the love of my life.",
        "Building this life and family with you is the greatest joy I could have ever asked for. Thank you for your unwavering hard work, kindness, and love.",
        "May this year bring you deep peace, abundant success, thriving health, and moments of relaxation you so richly deserve.",
        "I am so proud to stand by your side today and always. Happy Birthday, my love! 🥂❤️"
      ],
      memory: "That quiet evening after a long week where we just sat together, held hands, and felt completely thankful for the home we've built.",
      reasons: [
        { icon: "🛡️", title: "Our Solid Pillar", text: "You face every responsibility with steady courage, wisdom, and strength." },
        { icon: "❤️", title: "Your Devoted Heart", text: "You put our happiness first and show your love in countless everyday ways." },
        { icon: "🌟", title: "My Best Friend", text: "Beyond everything, you are the person I love sharing every single thought with." },
        { icon: "💼", title: "Your Work Ethic", text: "Your dedication to our family's future and dreams inspires me constantly." },
        { icon: "🏡", title: "The Heart of Home", text: "Home is wherever you are, filled with your warmth and gentle protection." }
      ],
      wishes: [
        "May this year bring you big achievements, smooth sailing, and peace of mind!",
        "Wishing you vibrant health, boundless energy, and deep joy throughout the year!",
        "May your hard work be rewarded with the greatest success and recognition!",
        "Here's to another wonderful year of growing, loving, and thriving together!",
        "Happy Birthday, my wonderful husband! You deserve the best of everything."
      ],
      gift: {
        message: "Ultimate Husband Relaxation Voucher: Valid for a stress-free weekend, your favorite homemade dinner, and complete pampering.",
        coupon: "BEST-HUSBAND-RELAX-2026"
      },
      timeline: [
        { icon: "💍", date: "The Vow", title: "Our New Beginning", text: "Promising forever and stepping hand in hand into our shared journey." },
        { icon: "🏡", date: "Building Home", title: "Everyday Magic", text: "Creating a warm space filled with love, laughter, and shared dreams." },
        { icon: "🌟", date: "Side by Side", title: "Weathering Storms", text: "Standing together through every challenge and coming out even stronger." },
        { icon: "🎂", date: "Today", title: "Honoring You", text: "Celebrating the amazing husband, partner, and man that you are." }
      ],
      gallery: [
        { image: null, emoji: "💍", rot: -5, cap: "My partner in life", secretNote: "Grateful for every single day with you." },
        { image: null, emoji: "🌅", rot: 4, cap: "Golden memories", secretNote: "Our weekend getaway was pure bliss." },
        { image: null, emoji: "🏡", rot: -3, cap: "Home sweet home", secretNote: "The coziest moments are the ones we share." },
        { image: null, emoji: "✨", rot: 5, cap: "Always by my side", secretNote: "My rock, my anchor, my favorite person." },
        { image: null, emoji: "🥂", rot: -4, cap: "Cheers to you", secretNote: "Happy Birthday to my incredible husband!" }
      ]
    },

    "wife": {
      id: "wife",
      label: "Wife 💍",
      letterLines: [
        "Happy Birthday to my wonderful wife, my guiding star, and the beating heart of our home.",
        "You bring so much grace, warmth, and magic into our lives. Every single day with you is a reminder of how blessed I truly am.",
        "May this year reward you with the same unconditional love, joy, and peace that you give so selflessly to everyone around you.",
        "I love you more with every passing year. Happy Birthday, my beautiful wife! 🌸💖"
      ],
      memory: "Our quiet anniversary walk where we looked back on everything we've overcome and felt so excited for all the years ahead.",
      reasons: [
        { icon: "💖", title: "The Heart of Home", text: "You create an atmosphere of warmth, love, and comfort that makes home a sanctuary." },
        { icon: "👑", title: "Grace & Wisdom", text: "You handle every situation with elegance, intelligence, and a caring perspective." },
        { icon: "✨", title: "Your Beautiful Spirit", text: "Your smile still brightens my entire world just like the day we first met." },
        { icon: "🤝", title: "My True Companion", text: "You understand me better than anyone and support me in every step I take." },
        { icon: "🌟", title: "Endless Selflessness", text: "The love and care you pour into our family is truly beyond measure." }
      ],
      wishes: [
        "May your birthday be as serene, beautiful, and joyful as you make our lives!",
        "Wishing you a year filled with good health, glowing happiness, and fulfilled dreams!",
        "May all the love you pour into the world come back to you tenfold this year!",
        "Here's to celebrating the most extraordinary woman and my forever partner!",
        "Happy Birthday, my darling wife! Today and every day, you are cherished."
      ],
      gift: {
        message: "Queen of My Heart Pass: Valid for a luxury spa day, a romantic dinner of your choice, and all my love.",
        coupon: "WIFE-QUEEN-SPA-2026"
      },
      timeline: [
        { icon: "💍", date: "The Vow", title: "Starting Our Forever", text: "The best day of my life when you became my wife and life partner." },
        { icon: "🌸", date: "Together", title: "Making Memories", text: "Countless shared laughs, holidays, and cozy moments together." },
        { icon: "🏡", date: "Our Sanctuary", title: "Growing Together", text: "Building a life of deep trust, joy, and unconditional support." },
        { icon: "🎂", date: "Today", title: "Celebrating My Queen", text: "Giving you all the appreciation, love, and pampering you deserve." }
      ],
      gallery: [
        { image: null, emoji: "🌸", rot: -5, cap: "My radiant wife", secretNote: "You look more beautiful every single day." },
        { image: null, emoji: "💍", rot: 4, cap: "Forever & always", secretNote: "The greatest decision I ever made." },
        { image: null, emoji: "🌅", rot: -4, cap: "Vacation glow", secretNote: "One of our most peaceful trips together." },
        { image: null, emoji: "✨", rot: 5, cap: "Pure elegance", secretNote: "Always carrying yourself with such grace." },
        { image: null, emoji: "🎂", rot: -3, cap: "Birthday Queen", secretNote: "Celebrating the woman who makes life beautiful!" }
      ]
    },

    "father": {
      id: "father",
      label: "Father / Dad 👔",
      letterLines: [
        "Happy Birthday to my greatest role model, my strongest protector, and the best Dad in the world.",
        "Thank you for every silent sacrifice, every piece of wise advice, and the unconditional support you've given me through every stage of life.",
        "May this year bring you good health, genuine peace of mind, and the relaxation and happiness you so truly deserve.",
        "I am who I am today because of you. Happy Birthday, Dad! 🌟🎂"
      ],
      memory: "The quiet moments we shared when you taught me to stay patient, work hard, and never give up on my values.",
      reasons: [
        { icon: "🛡️", title: "Our Shield of Strength", text: "You always carried our family forward with silent strength and courage." },
        { icon: "💡", title: "Priceless Wisdom", text: "Your advice and life lessons remain my guiding compass through every crossroad." },
        { icon: "❤️", title: "Unconditional Support", text: "Knowing you have my back gives me the confidence to take on any challenge." },
        { icon: "👔", title: "True Integrity", text: "You taught me the value of honesty, hard work, and respecting others." },
        { icon: "🌟", title: "My Lifelong Hero", text: "No cape needed — you have always been the greatest hero in my life." }
      ],
      wishes: [
        "Wishing you thriving health, lasting peace, and happiness in the year ahead!",
        "May your days be filled with quiet contentment, great moments, and joy!",
        "May all your hard work and sacrifices bear the sweetest fruits of pride!",
        "Wishing the happiest birthday to the most dependable and loving father!",
        "Happy Birthday, Dad! May this year be your healthiest and most joyful yet."
      ],
      gift: {
        message: "Dad VIP Privilege: Valid for a day of pure relaxation, no chores, and your favorite feast.",
        coupon: "BEST-DAD-RELAX-2026"
      },
      timeline: [
        { icon: "👶", date: "Guiding Hand", title: "Teaching Me to Walk", text: "Always holding my hand and teaching me right from wrong." },
        { icon: "🎓", date: "Growing Up", title: "Pillars of Wisdom", text: "Cheering for every milestone and supporting every single ambition." },
        { icon: "👔", date: "Adulthood", title: "Standing as Friends", text: "Appreciating your sacrifices and wisdom more with every passing day." },
        { icon: "🎂", date: "Today", title: "Honoring Dad", text: "Celebrating the man whose strength and love made everything possible." }
      ],
      gallery: [
        { image: null, emoji: "👔", rot: -5, cap: "The best Dad", secretNote: "Always looking sharp and leading by example." },
        { image: null, emoji: "🌟", rot: 4, cap: "My role model", secretNote: "Learning life lessons from the very best." },
        { image: null, emoji: "🏡", rot: -3, cap: "Family cornerstone", secretNote: "The heart and strength of our household." },
        { image: null, emoji: "✨", rot: 5, cap: "Proud moment", secretNote: "Seeing that proud smile is my biggest motivation." },
        { image: null, emoji: "🎂", rot: -4, cap: "Happy Birthday Dad", secretNote: "Wishing you the absolute best day!" }
      ]
    },

    "mother": {
      id: "mother",
      label: "Mother / Mom 🌸",
      letterLines: [
        "Happy Birthday to my greatest blessing, my sweetest comfort, and the world's most loving Mom.",
        "There are no words that can capture the depth of your selfless love, your soothing warmth, and the countless ways you make life beautiful.",
        "May this year shower you with vibrant health, serene peace, pure happiness, and all the love you give so generously.",
        "Thank you for being my constant prayer and greatest cheer. Happy Birthday, Maa! 💖🌸"
      ],
      memory: "Coming home to your warm food and comforting smile after a exhausting day — feeling instantly safe and loved.",
      reasons: [
        { icon: "💖", title: "Unconditional Love", text: "Your love has been my constant shelter through every storm in life." },
        { icon: "🌸", title: "Endless Selflessness", text: "You always think of everyone else first with pure grace and dedication." },
        { icon: "🍲", title: "Warmth & Care", text: "Nobody cooks with as much love or makes home feel as safe as you do." },
        { icon: "✨", title: "Gentle Strength", text: "The quiet resilience and patience you possess inspires me every single day." },
        { icon: "🕊️", title: "My Greatest Blessing", text: "Having you as my mother is the most precious gift life has given me." }
      ],
      wishes: [
        "May God bless you with glowing health, long life, and endless peace!",
        "Wishing you a year filled with pure joy, blooming smiles, and relaxation!",
        "May every day ahead bring you as much happiness as you bring into our home!",
        "Wishing the happiest birthday to the most wonderful mother in the universe!",
        "Happy Birthday, Mom! May your heart always be as full and happy as you make ours."
      ],
      gift: {
        message: "Mom's Royal Day Off: Valid for complete pampering, zero household worries, and all the treats you love.",
        coupon: "BEST-MOM-TREAT-2026"
      },
      timeline: [
        { icon: "🍼", date: "Gentle Start", title: "Purest Love", text: "Holding me close and filling my earliest memories with pure warmth." },
        { icon: "🎒", date: "School Days", title: "Everyday Care", text: "Packing lunchboxes, healing scrapes, and checking on every worry." },
        { icon: "🌸", date: "Growing Up", title: "My Best Friend", text: "Becoming my confidante, my prayer warrior, and my greatest cheerleader." },
        { icon: "🎂", date: "Today", title: "Celebrating Mom", text: "Honoring the woman whose unconditional love shaped my entire world." }
      ],
      gallery: [
        { image: null, emoji: "🌸", rot: -5, cap: "The sweetest smile", secretNote: "Her smile instantly lights up our entire home." },
        { image: null, emoji: "💖", rot: 4, cap: "Pure love", secretNote: "No love in the world compares to Mom's." },
        { image: null, emoji: "🏡", rot: -4, cap: "Home is with Mom", secretNote: "Warmth, comfort, and good food always." },
        { image: null, emoji: "✨", rot: 5, cap: "My guiding angel", secretNote: "Grateful for all your prayers and blessings." },
        { image: null, emoji: "🎂", rot: -3, cap: "Happy Birthday Mom", secretNote: "Wishing you infinite happiness today and always!" }
      ]
    },

    "brother": {
      id: "brother",
      label: "Brother 🤜🤛",
      letterLines: [
        "Happy Birthday to my built-in best friend, partner in crime, and forever brother!",
        "From fighting over the TV remote to having each other's backs through thick and thin, I wouldn't trade our brotherhood for anything.",
        "May this year bring you massive success, boundless energy, great adventures, and all the goals you've been working so hard for.",
        "Proud to call you my brother. Let's make this birthday epic! 🥂🎉"
      ],
      memory: "That legendary adventure where we got into silly trouble together and ended up laughing about it for weeks.",
      reasons: [
        { icon: "🛡️", title: "Brotherly Loyalty", text: "No matter how much we tease each other, I know you will always have my back." },
        { icon: "😂", title: "Unmatched Humor", text: "Our inside jokes and childhood memories make our bond truly one of a kind." },
        { icon: "🚀", title: "Your Ambition", text: "Watching you chase your dreams with dedication makes me super proud." },
        { icon: "🤜🤛", title: "Partners in Crime", text: "Every family gathering or trip is ten times more fun with you around." },
        { icon: "🌟", title: "A Solid Guy", text: "Dependable, strong-willed, and genuinely a great human being." }
      ],
      wishes: [
        "May your upcoming year be packed with promotions, big wins, and new adventures!",
        "Wishing you vibrant health, high spirits, and unstoppable momentum!",
        "May every goal you set turn into a massive milestone this year!",
        "Here's to another year of legendary memories and brotherly bonding!",
        "Happy Birthday, bro! May this year be your biggest and best one yet."
      ],
      gift: {
        message: "Brotherhood VIP Voucher: Valid for one free pass on borrowing anything, a gaming marathon, and a round of treats.",
        coupon: "BROTHER-VIP-PASS-2026"
      },
      timeline: [
        { icon: "🎮", date: "Childhood", title: "Games & Rivalry", text: "Endless wrestling matches, video games, and fighting over snacks." },
        { icon: "🚀", date: "Teens & Beyond", title: "Growing Together", text: "Figuring out life, sharing secrets, and backing each other up." },
        { icon: "🤝", date: "Brotherhood", title: "Stronger Than Ever", text: "Standing together as adults with mutual respect and unbroken loyalty." },
        { icon: "🎂", date: "Today", title: "Celebrating Bro!", text: "Raising a toast to the best brother anyone could ask for." }
      ],
      gallery: [
        { image: null, emoji: "🤜🤛", rot: -5, cap: "Brothers in arms", secretNote: "Through thick and thin, always." },
        { image: null, emoji: "🎮", rot: 4, cap: "Game night chaos", secretNote: "Still mad about who won that match!" },
        { image: null, emoji: "📸", rot: -3, cap: "Dapper look", secretNote: "Looking sharp for the family celebration." },
        { image: null, emoji: "🌟", rot: 5, cap: "Proud of you", secretNote: "Watching you grow into a great man." },
        { image: null, emoji: "🎉", rot: -4, cap: "Birthday Mode", secretNote: "Time to celebrate in a big way!" }
      ]
    },

    "sister": {
      id: "sister",
      label: "Sister 🌸",
      letterLines: [
        "Happy Birthday to my sweetest sister, my secret keeper, and the brightest spark in our family!",
        "Growing up with you has been the best journey. Thank you for all the shared laughs, late-night talks, and for always being my biggest cheerleader.",
        "May this year bring you glowing happiness, exciting opportunities, and all the dreams your heart has been wishing for.",
        "Stay as fabulous, caring, and radiant as you are today. Happy Birthday! 💖✨"
      ],
      memory: "That time we stayed up all night talking about our dreams, laughing at old family photos, and eating late-night snacks.",
      reasons: [
        { icon: "🌸", title: "Your Warm Heart", text: "You bring so much cheer and kindness to everyone who knows you." },
        { icon: "💎", title: "My Secret Keeper", text: "I can tell you anything without fear of judgment, and you always understand." },
        { icon: "✨", title: "Your Radiant Style", text: "Effortlessly elegant, charming, and lighting up every room you enter." },
        { icon: "💖", title: "Always Caring", text: "You check in, remember the little things, and show your love in sweet ways." },
        { icon: "👑", title: "Pure Sunshine", text: "Life is so much more joyful and colorful with a sister like you." }
      ],
      wishes: [
        "May your year be filled with glamorous moments, blooming smiles, and big wins!",
        "Wishing you 365 days of good health, sweet surprises, and thriving happiness!",
        "May all your ambitions turn into proud milestones this year!",
        "Wishing the happiest birthday to the most fabulous sister in the world!",
        "Happy Birthday, sis! Here's to making all your sweetest dreams come true."
      ],
      gift: {
        message: "Sister VIP Shopping Voucher: Valid for a shopping spree, custom coffee dates, and zero sibling teasing for a week.",
        coupon: "SISTER-SHOPPING-SPREE-2026"
      },
      timeline: [
        { icon: "🎀", date: "Childhood", title: "Shared Secrets", text: "Playing dress up, stealing clothes, and building childhood memories." },
        { icon: "🌷", date: "Growing Up", title: "My Trusted Ally", text: "Navigating teenage years, heartbreaks, and celebrations together." },
        { icon: "💖", date: "Sisterhood", title: "Unbreakable Bond", text: "Becoming best friends whose bond only deepens with time." },
        { icon: "🎂", date: "Today", title: "Celebrating Sister", text: "Wishing the happiest birthday to the one and only sister!" }
      ],
      gallery: [
        { image: null, emoji: "🌸", rot: -5, cap: "Sisterly love", secretNote: "The prettiest smile in the family!" },
        { image: null, emoji: "📸", rot: 4, cap: "Picture perfect", secretNote: "Took 50 selfies and this was the winner." },
        { image: null, emoji: "🎀", rot: -4, cap: "Sweet moments", secretNote: "Always laughing together no matter what." },
        { image: null, emoji: "✨", rot: 5, cap: "Glowing bright", secretNote: "So proud of everything you are becoming." },
        { image: null, emoji: "🎉", rot: -3, cap: "Party Princess", secretNote: "Happy Birthday to my favorite sister!" }
      ]
    },

    "colleague": {
      id: "colleague",
      label: "Colleague / Workmate 💼",
      letterLines: [
        "Happy Birthday to an outstanding colleague and a truly great teammate!",
        "Working alongside you makes the busy days easier and the projects so much more enjoyable. Thank you for your sharp insights and great energy.",
        "May this upcoming year bring you well-deserved promotions, rewarding projects, and a great work-life balance.",
        "Wishing you a fantastic celebration today and continued success in the year ahead! 🚀🎂"
      ],
      memory: "That intense project deadline we successfully conquered together with teamwork, quick thinking, and lots of coffee.",
      reasons: [
        { icon: "💡", title: "Sharp Problem Solver", text: "You bring clear perspective and smart solutions to every complex challenge." },
        { icon: "🤝", title: "True Team Player", text: "Always ready to collaborate, share knowledge, and lift up the entire team." },
        { icon: "☕", title: "Great Work Energy", text: "Your positive attitude and humor keep the workplace vibrant and enjoyable." },
        { icon: "🎯", title: "Reliable & Focused", text: "When you take on a task, everyone knows it will be executed with excellence." },
        { icon: "🌟", title: "Natural Leadership", text: "You lead by example with calm professionalism and mutual respect." }
      ],
      wishes: [
        "May your year be filled with career milestones, exciting projects, and big achievements!",
        "Wishing you vibrant health, peaceful weekends, and fulfilling balance!",
        "May your talent and dedication be recognized with top accolades and success!",
        "Here's to celebrating you today and achieving even bigger goals together!",
        "Happy Birthday! May your day be productive in fun and full of celebration."
      ],
      gift: {
        message: "Workplace VIP Privilege: Valid for one free coffee run, zero meeting interruptions on your birthday, and celebration treats.",
        coupon: "COLLEAGUE-COFFEE-PASS-2026"
      },
      timeline: [
        { icon: "👋", date: "First Sprint", title: "Joining the Team", text: "Stepping in and immediately bringing great energy and sharp skills." },
        { icon: "🚀", date: "Big Projects", title: "Crushing Deadlines", text: "Working side by side and celebrating successful launches together." },
        { icon: "🏆", date: "Milestones", title: "Consistent Excellence", text: "Earning respect across the team with high-impact contributions." },
        { icon: "🎂", date: "Today", title: "Celebrating You", text: "Wishing a very Happy Birthday to our valued teammate and friend." }
      ],
      gallery: [
        { image: null, emoji: "💼", rot: -5, cap: "Team excellence", secretNote: "Always bringing top-tier energy to work." },
        { image: null, emoji: "☕", rot: 4, cap: "Coffee break crew", secretNote: "Essential fuel for high-output days!" },
        { image: null, emoji: "🏆", rot: -3, cap: "Launch celebration", secretNote: "Celebrating a major project milestone." },
        { image: null, emoji: "💡", rot: 5, cap: "Brainstorming session", secretNote: "Great ideas turn into great results." },
        { image: null, emoji: "🎉", rot: -4, cap: "Birthday at work", secretNote: "Wishing you big success in the year ahead!" }
      ]
    },

    "teacher": {
      id: "teacher",
      label: "Teacher / Mentor 🎓",
      letterLines: [
        "Happy Birthday to an exceptional mentor and an inspiring teacher who changes lives with dedication and wisdom.",
        "Thank you for your patience, your encouragement, and for believing in your students even when challenges seemed daunting.",
        "May this year bring you deep fulfillment, radiant health, and the joy of seeing your wisdom flourish across so many bright minds.",
        "With immense respect and gratitude, wishing you the happiest of birthdays! 📚🌟"
      ],
      memory: "That inspiring lesson where you encouraged us to think critically and believe in our own unique potential.",
      reasons: [
        { icon: "📚", title: "Beacon of Knowledge", text: "You share wisdom with passion, making complex ideas clear and fascinating." },
        { icon: "🌱", title: "Nurturing Growth", text: "You inspire students to push their boundaries and unlock their true abilities." },
        { icon: "💡", title: "Guiding Light", text: "Your advice and mentorship provide clarity and guidance during crucial decisions." },
        { icon: "✨", title: "Patience & Empathy", text: "You listen with understanding and always encourage positive learning." },
        { icon: "🎓", title: "Lifelong Inspiration", text: "The values and lessons you impart stay with your students for a lifetime." }
      ],
      wishes: [
        "May you be blessed with enduring health, peace of mind, and immense joy!",
        "Wishing you a year filled with honor, gratitude, and proud accomplishments!",
        "May your passion for teaching continue to illuminate and inspire many more generations!",
        "Wishing the happiest birthday to our most respected and cherished mentor!",
        "Happy Birthday! May your day be filled with warm smiles and heartfelt respect."
      ],
      gift: {
        message: "Mentor Tribute Certificate: In honor of your dedication, wisdom, and the countless lives you've positively touched.",
        coupon: "HONORED-TEACHER-TRIBUTE"
      },
      timeline: [
        { icon: "📚", date: "First Lesson", title: "Opening New Horizons", text: "Inspiring curiosity from the very first lecture and setting high standards." },
        { icon: "💡", date: "Mentorship", title: "Guiding the Path", text: "Providing constructive feedback, encouragement, and invaluable life advice." },
        { icon: "🎓", date: "Success", title: "Sharing Achievements", text: "Every student's accomplishment is a reflection of your dedication." },
        { icon: "🎂", date: "Today", title: "Honoring Our Teacher", text: "Celebrating the wonderful educator whose impact will last forever." }
      ],
      gallery: [
        { image: null, emoji: "🎓", rot: -5, cap: "Inspiring educator", secretNote: "Leading with knowledge, patience, and grace." },
        { image: null, emoji: "📚", rot: 4, cap: "In the classroom", secretNote: "Where curiosity turns into understanding." },
        { image: null, emoji: "💡", rot: -4, cap: "Wise words", secretNote: "Lessons that stay with us for a lifetime." },
        { image: null, emoji: "🌟", rot: 5, cap: "Proud students", secretNote: "Grateful for your constant encouragement." },
        { image: null, emoji: "🎂", rot: -3, cap: "Happy Birthday!", secretNote: "Wishing our respected mentor the very best!" }
      ]
    }
  };

  const PRESETS_HINGLISH = {
    "friend": {
      id: "friend",
      label: "Friend 🤝 (Hinglish)",
      letterLines: [
        "Happy Birthday yaar! Kuch log life me aate hain aur har moment ko thoda aur mast bana dete hain — tu bilkul waisa hi hai.",
        "Aaj ka din sirf cake aur candles ka nahi hai, balki teri positivity, kindness aur endless baaton ko celebrate karne ka hai.",
        "Umeed hai ye aane wala saal tere liye bohot saari nayi opportunities, unplanned trips aur full-on success lekar aayega.",
        "Happy Birthday mere dost! Chal ab jaldi se party plan kar aur treats khila! 🎂✨"
      ],
      memory: "Woh din jab koi plan nahi tha, par humne ghanto baith kar baatein ki aur has-has ke pagal ho gaye... Best memory yaar!",
      reasons: [
        { icon: "✨", title: "Full Positive Vibe", text: "Tu jahan bhi hota hai, wahan ka mahaul instantly energetic aur fun ban jata hai." },
        { icon: "🤝", title: "Saccha Dost", text: "Jab bhi kisi advice ya support ki zaroorat ho, tu hamesha sunne ke liye ready rehta hai." },
        { icon: "😂", title: "Top Level Comedy", text: "Tera sense of humor aur quick timing har boring din ko lively bana deta hai." },
        { icon: "🌟", title: "Real & Genuine", text: "Tu jaisa hai waisa hi rehta hai — no fake drama, pure authenticity." },
        { icon: "🎯", title: "Focus & Ambition", text: "Apne goals ke liye teri dedication dekh kar sach me motivation milti hai." }
      ],
      wishes: [
        "Ye saal tere liye bohot saari khushiyan, big wins aur peace lekar aaye!",
        "Wishing you 365 days of solid health, super adventures aur non-stop fun!",
        "Tu jo bhi target set kare, usme tujhe double success mile!",
        "Teri life hamesha good vibes aur genuine logon se bhari rahe!",
        "Happy Birthday bhai! Enjoy your special day to the absolute fullest!"
      ],
      gift: {
        message: "Dosti VIP Treat Pass: Valid for unlimited chai-sutta breaks, movie nights, aur weekend celebrations.",
        coupon: "DOST-PARTY-PASS-2026"
      },
      timeline: [
        { icon: "👋", date: "Pehli Mulaqat", title: "Kahaani Shuru", text: "Ek simple hello se shuru hui dosti jo har conversation ke saath strong hoti gayi." },
        { icon: "🍕", date: "Chai & Hangouts", title: "Endless Bakchodi", text: "Bina kisi filter ke ghanto baatein aur food runs jo hamesha yaad rahenge." },
        { icon: "🚀", date: "Level Up", title: "Teri Kamiyabi", text: "Tujhe mehnat karte aur naye milestones achieve karte dekhna bohot proud feel karata hai." },
        { icon: "🎂", date: "Aaj Ka Din", title: "Party Time!", text: "Tere birthday pe full celebration aur naye saal ka zabardast welcome." }
      ],
      gallery: [
        { image: null, emoji: "🎈", rot: -6, cap: "Vibe check passed", secretNote: "Bina kisi plan ke sabse best din tha ye!" },
        { image: null, emoji: "📸", rot: 4, cap: "Squad goals", secretNote: "Dosti ka sabse solid proof!" },
        { image: null, emoji: "🍕", rot: -3, cap: "Foodies forever", secretNote: "Adha bill extra snacks ka tha, no regrets!" },
        { image: null, emoji: "✨", rot: 5, cap: "Solid duo", secretNote: "Har conversation ke baad mood fresh ho jata hai." },
        { image: null, emoji: "🎉", rot: -4, cap: "Birthday boy", secretNote: "Agla saal aur bhi dhamakedaar hoga!" }
      ]
    },

    "best_friend": {
      id: "best_friend",
      label: "Best Friend (Close & Funny) 💖 (Hinglish)",
      letterLines: [
        "Bhai/Behen, sabse pehle toh Happy Birthday! Meri life ke free therapist, crime partner aur chief roaster ko bohot saara pyaar.",
        "Agar tu meri life me nahi hota/hoti na, toh sach me life bohot boring aur thodi zyaada sensible hoti. Teri bakchodi hi sabse best hai!",
        "Jokes apart: tere jaisa best friend milna life ki sabse badi blessing hai. Tu meri har ajeeb aadat jaanta hai aur phir bhi saath khada rehta hai.",
        "Bhagwan kare is saal tere paas bohot saara paisa aaye, zero stress ho, aur party hamesha on rahe. Chal ab jaldi party de! 🎂🥂"
      ],
      memory: "Woh late-night call aur bina kisi reason ke pet dukhne tak hasna... Wo memory sach me priceless hai!",
      reasons: [
        { icon: "💎", title: "Ek Hi Piece Hai", text: "Tere jaisa bond kisi aur ke saath ho hi nahi sakta — bina bole sab samajh jata hai." },
        { icon: "🛡️", title: "Hamesha Saath", text: "Har acche aur bure time me tu hamesha bina soche mere saath khada raha hai." },
        { icon: "🚀", title: "Partner in Crime", text: "Humara koi bhi plan ho, end me ek zabardast memorable story ban hi jaati hai." },
        { icon: "😂", title: "Top Level Roaster", text: "Tu jitni meri leg-pulling karta hai, utna hi doosron ke saamne support bhi karta hai." },
        { icon: "💖", title: "Dil Ka Saaf", text: "Saari masti ke peeche sabse loyal aur caring insaan tu hi hai." }
      ],
      wishes: [
        "Is saal tujhe wo sab mile jo tu deserve karta hai — success, happiness aur full fun!",
        "Wishing you a year jahan bank balance badhe aur tension bilkul gayab ho jaye!",
        "Humari iconic dosti aur chaotic memories aise hi agle saal bhi continue rahein!",
        "Har wo sapna jo tune socha hai, is saal sach ho jaye!",
        "Happy Birthday mere bhai/behen! Cake meetha ho aur saal legendary ho!"
      ],
      gift: {
        message: "Lifetime Bestie VIP Voucher: Valid for 24/7 rant sessions, midnight Maggi runs, aur unconditional support.",
        coupon: "BESTIE-FOREVER-VIP"
      },
      timeline: [
        { icon: "🔥", date: "Pehla Connection", title: "Jab Hum Mile", text: "Pehle 5 minute me hi samajh aa gaya tha ki hum dono ka dimaag ek jaisa hi crazy hai." },
        { icon: "🌙", date: "Late Nights", title: "Midnight Plans", text: "Raat ke 2 baje ki baatein, deep talks aur random food adventures." },
        { icon: "🏆", date: "Saath Me Jeetna", title: "Unstoppable Bond", text: "Har phase aur problem ko humne saath me face kiya aur aage badhe." },
        { icon: "👑", date: "Aaj Ka Din", title: "Best Friend's Birthday!", text: "Celebrating the one and only bestie jo meri life ko zabardast banata hai." }
      ],
      gallery: [
        { image: null, emoji: "🤪", rot: -6, cap: "Full pagalpan", secretNote: "Thode ajeeb lag rahe hain par photo zabardast hai!" },
        { image: null, emoji: "🍕", rot: 5, cap: "Midnight food", secretNote: "Khana khate hue life ke bade plans banana." },
        { image: null, emoji: "📸", rot: -4, cap: "Iconic look", secretNote: "Ye photo lene me 40 attempts lage the!" },
        { image: null, emoji: "🌟", rot: 4, cap: "Day one energy", secretNote: "Kitna bhi time nikal jaye, humari dosti wahi rehti hai." },
        { image: null, emoji: "🎉", rot: -5, cap: "Party mode on", secretNote: "Tere birthday pe full celebration hoga!" }
      ]
    },

    "boyfriend": {
      id: "boyfriend",
      label: "Boyfriend 💙 (Hinglish)",
      letterLines: [
        "Happy Birthday to the most special person who makes my world so much brighter and happier every day!",
        "Humari choti-choti baaton se lekar bade adventures tak, tere saath hona meri life ka sabse favourite part hai. Thank you for your love and care.",
        "Umeed hai ye aane wala saal tere saare dreams ko pura karega aur bohot saari khushiyan aur success lekar aayega.",
        "Tere birthday ko celebrate karne ke liye bohot excited hoon. You deserve the best of everything! ❤️✨"
      ],
      memory: "Woh shaam jab humne ghanto baith kar future ke baare me baat ki thi aur bina kisi tension ke khush the... Always special.",
      reasons: [
        { icon: "🌟", title: "Calm & Caring", text: "Tu har situation ko bohot patience aur care ke saath handle karta hai." },
        { icon: "🥰", title: "Meri Smile Ka Reason", text: "Kitna bhi thaka hua din ho, teri ek smile se sab theek ho jata hai." },
        { icon: "🎯", title: "Hardworking & Dedicated", text: "Apne goals ke liye teri lagan sach me inspire karti hai." },
        { icon: "❤️", title: "Pure Love", text: "Tu hamesha mujhe special aur loved feel karata hai in little everyday ways." },
        { icon: "🛡️", title: "My Safe Space", text: "Tere saath main bina kisi hesitation ke bilkul real reh sakti hoon." }
      ],
      wishes: [
        "Ye saal tere career aur life me bohot saari nayi heights lekar aaye!",
        "Wishing you a birthday full of great food, celebrations aur happiness!",
        "Tu jitna accha aur kind hai, tera aane wala saal bhi utna hi wonderful ho!",
        "Har wo target jo tune banaya hai, is saal proud achievement ban jaye!",
        "Happy Birthday my love! Looking forward to making more memories together."
      ],
      gift: {
        message: "Special Birthday Date Voucher: Valid for your favorite food, custom date night, aur unlimited pampering.",
        coupon: "LOVE-DATE-NIGHT-2026"
      },
      timeline: [
        { icon: "💫", date: "Pehla Spark", title: "Jab Dil Connect Hua", text: "Pehli conversation me hi feel ho gaya tha ki tu bohot special hai." },
        { icon: "🌹", date: "Dates & Drives", title: "Humari Memories", text: "Har drive, dinner aur sath bitaya hua chota moment jo memorable ban gaya." },
        { icon: "🚀", date: "Growing Closer", title: "Saath Chalna", text: "Ek doosre ko support karte hue ek strong bond build karna." },
        { icon: "🎂", date: "Aaj Ka Din", title: "Celebrating You", text: "Wishing the happiest birthday to the most special guy!" }
      ],
      gallery: [
        { image: null, emoji: "❤️", rot: -5, cap: "Favorite smile", secretNote: "Is photo me tu bohot handsome lag raha tha!" },
        { image: null, emoji: "🌅", rot: 4, cap: "Sunset vibes", secretNote: "Tere saath bitaya hua ek bohot peaceful din." },
        { image: null, emoji: "☕", rot: -4, cap: "Coffee dates", secretNote: "Bas tu, main aur endless baatein." },
        { image: null, emoji: "✨", rot: 6, cap: "Together", secretNote: "Jahan bhi ho, tere saath sab accha lagta hai." },
        { image: null, emoji: "🎂", rot: -3, cap: "Birthday boy", secretNote: "Celebrating the most wonderful person today!" }
      ]
    },

    "girlfriend": {
      id: "girlfriend",
      label: "Girlfriend 🌸 (Hinglish)",
      letterLines: [
        "Happy Birthday to the most beautiful, sweet aur pyaari girl in my life!",
        "Tu meri life me itna color, warmth aur khushi lekar aayi hai ki tere bina sab adhura lagta hai. Teri smile dekhna meri sabse badi khushi hai.",
        "I hope aaj ka din tere liye ekdum royal aur memorable ho — full of love, flowers aur sweet surprises.",
        "Thank you for being my constant support, my sweetest partner aur my greatest blessing. Love you so much! 💖✨"
      ],
      memory: "Woh din jab hum choti si baat pe itna hase ki aankho me paani aa gaya... Looked at you and felt so lucky.",
      reasons: [
        { icon: "🌸", title: "Gentle & Kind", text: "Tera dil itna saaf aur caring hai ki har koi teri respect karta hai." },
        { icon: "✨", title: "Pyaari Smile", text: "Teri ek smile se pura din accha ho jata hai aur saara stress gayab." },
        { icon: "🎨", title: "Creative & Sweet", text: "Tu har choti cheez me jo thoughtfulness daalti hai wo lajawab hai." },
        { icon: "💖", title: "Pure Caring Nature", text: "Tu meri har choti aadat aur baat ka itna khayal rakhti hai." },
        { icon: "👑", title: "My Queen", text: "Smart, gorgeous aur graceful in everything you do." }
      ],
      wishes: [
        "Ye saal tere liye bohot saari sweet surprises aur success lekar aaye!",
        "Wishing you 365 days of blooming happiness aur true love!",
        "Tu jo bhi wish maange, wo sab is saal sach ho jaye!",
        "Teri life hamesha utni hi bright rahe jitni tu khud hai!",
        "Happy Birthday my princess! Here's to making all your dreams come true."
      ],
      gift: {
        message: "Princess Birthday Treat Pass: Valid for dream shopping, favorite dinner, and royal pampering all day.",
        coupon: "PRINCESS-BIRTHDAY-TREAT"
      },
      timeline: [
        { icon: "✨", date: "Pehli Nazar", title: "The Special Moment", text: "Jab pehli baar dekha tha aur dil ne bola tha ye bohot special hai." },
        { icon: "🌷", date: "Sweet Memories", title: "Pyaar Ka Safar", text: "Har walk, har hasi aur har message jo hume aur close laya." },
        { icon: "💖", date: "Humari Duniya", title: "Saath Badhna", text: "Ek doosre ko samajhna, respect karna aur sapne sajhana." },
        { icon: "🎂", date: "Aaj Ka Din", title: "Celebrating My Queen", text: "Tere birthday pe tujhe wo sab mile jo tujhe khush kare." }
      ],
      gallery: [
        { image: null, emoji: "🌸", rot: -5, cap: "Most beautiful", secretNote: "Duniya ki sabse pyaari smile!" },
        { image: null, emoji: "🌹", rot: 4, cap: "Date night", secretNote: "Is din tu bohot stunning lag rahi thi." },
        { image: null, emoji: "📸", rot: -3, cap: "Candid moment", secretNote: "Bina pose kiye sabse acchi photo!" },
        { image: null, emoji: "✨", rot: 5, cap: "My world", secretNote: "Tere saath har moment valuable hai." },
        { image: null, emoji: "🎉", rot: -4, cap: "Birthday Princess", secretNote: "Happy Birthday my love!" }
      ]
    },

    "husband": {
      id: "husband",
      label: "Husband 💍 (Hinglish)",
      letterLines: [
        "Happy Birthday to my dearest husband, my biggest support aur meri life ka sabse strong pillar.",
        "Humara ye ghar aur ye life tere saath build karna meri life ka sabse bada sukh hai. Thank you for your hard work, patience aur pyaar.",
        "Umeed hai ye saal tere liye bohot saari peace of mind, great health aur success lekar aayega jo tu deserve karta hai.",
        "Proud to stand with you always. Happy Birthday my love! 🥂❤️"
      ],
      memory: "Woh shaam jab humne future ke baare me baat ki aur realize kiya ki humne kitna pyara safar saath tay kiya hai.",
      reasons: [
        { icon: "🛡️", title: "Humara Strong Pillar", text: "Tu har responsibility ko bina kisi shikayat ke himmat se sambhalta hai." },
        { icon: "❤️", title: "Devoted Heart", text: "Apne family ki khushi ke liye tu hamesha aage rehta hai." },
        { icon: "🌟", title: "My Best Friend", text: "Husband hone ke saath tu mera sabse accha confidante bhi hai." },
        { icon: "💼", title: "Hardworking", text: "Tere dedication aur focus pe mujhe hamesha garv rehta hai." },
        { icon: "🏡", title: "Ghar Ki Jaan", text: "Ghar wahan hai jahan tu hai — full of security aur warmth." }
      ],
      wishes: [
        "Is saal tujhe apne career aur health me zabardast success mile!",
        "Wishing you peace of mind, vibrant energy aur bohot saari khushiyan!",
        "Teri har mehnat ka tujhe best reward mile!",
        "Humara ye bond saal-dar-saal aur mazboot hota rahe!",
        "Happy Birthday my wonderful husband! Enjoy your special day."
      ],
      gift: {
        message: "Husband Relaxation Pass: Valid for full day off from worries, special homemade dinner, and complete pampering.",
        coupon: "BEST-HUSBAND-RELAX-2026"
      },
      timeline: [
        { icon: "💍", date: "Shaadi", title: "Nayi Shuruat", text: "Haath thaam kar ek nayi zindagi ka aaghaaz kiya." },
        { icon: "🏡", date: "Ghar Basana", title: "Pyari Memories", text: "Choti-choti khushiyon se apna pyara aashiyana sajaya." },
        { icon: "🌟", date: "Saath-Saath", title: "Har Mod Par", text: "Har challenge me ek doosre ki takat bankar khade rahe." },
        { icon: "🎂", date: "Aaj Ka Din", title: "Celebrating You", text: "Aapke birthday par bohot saara pyaar aur respect." }
      ],
      gallery: [
        { image: null, emoji: "💍", rot: -5, cap: "Hamesha Saath", secretNote: "Aapke saath har din special hai." },
        { image: null, emoji: "🌅", rot: 4, cap: "Vacation time", secretNote: "Ek bohot pyari trip ki memory." },
        { image: null, emoji: "🏡", rot: -3, cap: "Ghar ki warmth", secretNote: "Simple moments with you are the best." },
        { image: null, emoji: "✨", rot: 5, cap: "Together", secretNote: "My rock, my support system." },
        { image: null, emoji: "🥂", rot: -4, cap: "Cheers to you", secretNote: "Happy Birthday my love!" }
      ]
    },

    "wife": {
      id: "wife",
      label: "Wife 💍 (Hinglish)",
      letterLines: [
        "Happy Birthday to my lovely wife, mere ghar ki rounak aur meri life ki sabse badi blessing!",
        "Aapke aane se meri zindagi me jo khushi aur sukoon aaya hai, wo shabdon me bayaan nahi ho sakta. Your smile is my daily motivation.",
        "Bhagwan kare ye saal aapke liye acchi health, deep happiness aur saari khushiyan lekar aaye.",
        "I love you more with every single day. Happy Birthday my beautiful wife! 🌸💖"
      ],
      memory: "Humari anniversary walk jab humne purani baaton ko yaad kiya aur aane wale saalon ke liye sapne sajaye.",
      reasons: [
        { icon: "💖", title: "Ghar Ki Jaan", text: "Aapne is ghar ko itne pyaar aur care se sajaya hai." },
        { icon: "👑", title: "Graceful & Wise", text: "Har situation ko aap itne maturity aur patience se handle karti hain." },
        { icon: "✨", title: "Beautiful Smile", text: "Aapki smile se pura din khushnuma ho jata hai." },
        { icon: "🤝", title: "Sacchi Saathi", text: "Har mod par mera saath dene ke liye thank you." },
        { icon: "🌟", title: "Caring Nature", text: "Sabka itna khayal rakhna aapke alawa koi nahi kar sakta." }
      ],
      wishes: [
        "Aapka birthday utna hi pyara ho jitni aap hamari zindagi banati hain!",
        "Wishing you glowing health, peace aur bohot saari khushiyan!",
        "Jo pyaar aap sabko deti hain, wo sab aapko double hokar mile!",
        "Aap hamesha aise hi khush aur muskurati rahein!",
        "Happy Birthday my darling wife! You deserve the world."
      ],
      gift: {
        message: "Queen's Special Voucher: Valid for luxury spa day, favorite shopping, and romantic dinner date.",
        coupon: "WIFE-QUEEN-TREAT-2026"
      },
      timeline: [
        { icon: "💍", date: "Shaadi", title: "Nayi Zindagi", text: "Meri life ka sabse accha decision jab aap meri humsafar bani." },
        { icon: "🌸", date: "Saath Me", title: "Pyara Safar", text: "Haste-muskurate hue bohot saari sweet memories banayi." },
        { icon: "🏡", date: "Humara Aashiyana", title: "Khushiyon Ka Ghar", text: "Pyaar, vishwas aur respect ke saath aage badhna." },
        { icon: "🎂", date: "Aaj Ka Din", title: "Celebrating Wife", text: "Aapko birthday par bohot saara pyaar aur respect." }
      ],
      gallery: [
        { image: null, emoji: "🌸", rot: -5, cap: "Meri rounak", secretNote: "Aap hamesha bohot pyari lagti hain." },
        { image: null, emoji: "💍", rot: 4, cap: "Forever together", secretNote: "Best partnership of my life." },
        { image: null, emoji: "🌅", rot: -4, cap: "Vacation glow", secretNote: "A memorable holiday with you." },
        { image: null, emoji: "✨", rot: 5, cap: "Elegance", secretNote: "Always graceful and kind." },
        { image: null, emoji: "🎂", rot: -3, cap: "Birthday Queen", secretNote: "Happy Birthday to my lovely wife!" }
      ]
    },

    "father": {
      id: "father",
      label: "Father / Dad 👔 (Hinglish)",
      letterLines: [
        "Happy Birthday Papa! Mere sabse bade role model, humare protector aur duniya ke sabse best father.",
        "Aapke har silent sacrifice, aapki seekh aur aapke unconditional support ke bina main aaj yahan nahi hota/hoti.",
        "Bhagwan aapko hamesha fit, healthy aur bohot saari peace of mind de. Aapka aashirwad hi humari sabse badi takat hai.",
        "Thank you for everything Papa. Happy Birthday! 🌟🎂"
      ],
      memory: "Woh time jab aapne mujhe sikhaya tha ki mushkilon se darna nahi, balki mehnat aur imaandari se aage badhna hai.",
      reasons: [
        { icon: "🛡️", title: "Humara Protector", text: "Aapne hamesha hume protect kiya aur strong banaya." },
        { icon: "💡", title: "Anmol Seekh", text: "Aapki baatein aur values meri life ka sabse bada compass hain." },
        { icon: "❤️", title: "Silent Sacrifices", text: "Aapne bina jataye humari har khushi ke liye kitni mehnat ki hai." },
        { icon: "👔", title: "Imaandari & Mehnat", text: "Aapka lifestyle hi mere liye sabse badi inspiration hai." },
        { icon: "🌟", title: "Real Life Hero", text: "Aap bina kisi cape ke mere hamesha se hero rahe hain." }
      ],
      wishes: [
        "Aapki health hamesha acchi rahe aur chehre par smile rahe!",
        "Wishing you peaceful days, relaxation aur bohot saari khushiyan!",
        "Aapki saari mehnat ka proud result hum aapko de sakein!",
        "Duniya ke sabse best Papa ko Happy Birthday!",
        "May this year be your healthiest and happiest one yet, Papa!"
      ],
      gift: {
        message: "Papa VIP Day Pass: Valid for complete rest, favorite food, and family time with zero stress.",
        coupon: "BEST-PAPA-RELAX-2026"
      },
      timeline: [
        { icon: "👶", date: "Pehla Kadam", title: "Ungli Pakad Ke Chalna", text: "Aapne haath thaam kar sahi aur galat ka fark sikhaya." },
        { icon: "🎓", date: "Padhai & Dreams", title: "Support System", text: "Har milestone par encourage kiya aur mere sapno ko pankh diye." },
        { icon: "👔", date: "Bada Hona", title: "Respect & Bond", text: "Aapki sacrifices ko ab aur zyaada samajh kar respect badh gayi hai." },
        { icon: "🎂", date: "Aaj Ka Din", title: "Papa Ka Birthday", text: "Celebrating the man whose strength made everything possible." }
      ],
      gallery: [
        { image: null, emoji: "👔", rot: -5, cap: "Best Papa", secretNote: "Always leading by example." },
        { image: null, emoji: "🌟", rot: 4, cap: "My Role Model", secretNote: "Learning life lessons from the very best." },
        { image: null, emoji: "🏡", rot: -3, cap: "Family Pillar", secretNote: "Ghar ki takat aur aashirwad." },
        { image: null, emoji: "✨", rot: 5, cap: "Proud moment", secretNote: "Aapki smile dekhna meri sabse badi khushi hai." },
        { image: null, emoji: "🎂", rot: -4, cap: "Happy Birthday Papa", secretNote: "Wishing you the best health and happiness!" }
      ]
    },

    "mother": {
      id: "mother",
      label: "Mother / Mom 🌸 (Hinglish)",
      letterLines: [
        "Happy Birthday Maa! Meri sabse pyari Maa, mera sukoon aur duniya ka sabse anmol tohfa.",
        "Aapke selfless pyaar, aapki mamta aur aapke haath ke swad ka koi comparison hi nahi hai. Aap ho toh sab accha lagta hai.",
        "Bhagwan aapko lambi umar, glowing health aur endless khushiyan de. Aap hamesha aise hi hasti muskurati rahein.",
        "Thank you for all your prayers and blessings. Happy Birthday Maa! 💖🌸"
      ],
      memory: "Thak kar aane ke baad aapka pyaar se poochna 'Beta khana khaya?'... Wo warmth duniya ki koi cheez nahi de sakti.",
      reasons: [
        { icon: "💖", title: "Saccha Pyaar", text: "Aapka pyaar bina kisi shart ke hamesha mere saath raha hai." },
        { icon: "🌸", title: "Selfless Nature", text: "Aap hamesha sabse pehle humara khayal rakhti hain." },
        { icon: "🍲", title: "Maa Ke Haath Ka Khana", text: "Aapke haath ke khane me jo pyaar hai, wo kahin aur nahi milta." },
        { icon: "✨", title: "Ghar Ki Shanti", text: "Aapki presence se hi ghar me sukoon aur rounak aati hai." },
        { icon: "🕊️", title: "Sabse Badi Blessing", text: "Aapko Maa ke roop me paana meri kismat ka sabse bada reward hai." }
      ],
      wishes: [
        "Maa aap hamesha healthy aur khush rahein!",
        "Aapke jeevan me hamesha sukoon aur muskurahat bani rahe!",
        "Jo pyaar aap sabko deti hain, wo sab aapko wapas mile!",
        "Duniya ki sabse pyaari Maa ko bohot bohot Happy Birthday!",
        "May God bless you with infinite health and peace, Maa!"
      ],
      gift: {
        message: "Maa Ka Special Relax Pass: Zero kitchen duty, complete rest, and special family treat today.",
        coupon: "BEST-MAA-TREAT-2026"
      },
      timeline: [
        { icon: "🍼", date: "Bachpan", title: "Mamta Ka Aanchal", text: "Godi me lekar har dukh-dard ko gayab kar dena." },
        { icon: "🎒", date: "School Days", title: "Care & Tiffin", text: "Subah uthakar tiffin pack karna aur har choti baat ka khayal." },
        { icon: "🌸", date: "Bade Hona", title: "Best Friend & Dua", text: "Meri har mushkil me aapki duaayein hi kaam aayi hain." },
        { icon: "🎂", date: "Aaj Ka Din", title: "Maa Ka Birthday", text: "Celebrating the most wonderful mother in the universe." }
      ],
      gallery: [
        { image: null, emoji: "🌸", rot: -5, cap: "Maa ki muskaan", secretNote: "Aapki smile se ghar roshan hota hai." },
        { image: null, emoji: "💖", rot: 4, cap: "Pure Love", secretNote: "Maa ke pyaar jaisa kuch nahi." },
        { image: null, emoji: "🏡", rot: -4, cap: "Ghar ka sukoon", secretNote: "Aapke paas hamesha shanti milti hai." },
        { image: null, emoji: "✨", rot: 5, cap: "Guiding Angel", secretNote: "Aapka aashirwad hamesha saath hai." },
        { image: null, emoji: "🎂", rot: -3, cap: "Happy Birthday Maa", secretNote: "Wishing you infinite happiness always!" }
      ]
    },

    "brother": {
      id: "brother",
      label: "Brother 🤜🤛 (Hinglish)",
      letterLines: [
        "Happy Birthday mere bhai! Mera default partner in crime, boxing opponent aur lifetime supporter.",
        "TV remote ke liye ladne se lekar ek doosre ke liye khade hone tak, humari brotherhood jaisi koi cheez nahi hai.",
        "Umeed hai ye saal tere liye bohot saara paisa, career me big jump aur non-stop party lekar aayega.",
        "Proud to have you as my brother. Chal ab jaldi party nikaal! 🥂🎉"
      ],
      memory: "Woh time jab hum dono ne milke koi kaand kiya tha aur baad me ghanto has rahe the... Priceless bhai!",
      reasons: [
        { icon: "🛡️", title: "Bhai Ka Support", text: "Chahe jitni bhi ladai ho, koi bahar ka kuch bole toh tu sabse aage hota hai." },
        { icon: "😂", title: "Solid Bakchodi", text: "Humari mutual roasting aur inside jokes ka koi match nahi." },
        { icon: "🚀", title: "Bhai Ki Mehnat", text: "Tujhe aage badhte aur goals achieve karte dekh kar bohot proud feel hota hai." },
        { icon: "🤜🤛", title: "Built-in Dost", text: "Har family event ya outing tere bina adhoori lagti hai." },
        { icon: "🌟", title: "Dil Ka Saaf", text: "Solid insaan aur hamesha dependable bhai." }
      ],
      wishes: [
        "Bhai is saal tera har goal easily complete ho jaye!",
        "Wishing you solid health, fitness aur big career wins!",
        "Zindagi me hamesha full energy aur positive vibes rahein!",
        "Humara bhai-bhai ka bond hamesha aise hi rock kare!",
        "Happy Birthday bro! Make this year unforgettable."
      ],
      gift: {
        message: "Brotherhood VIP Pass: Valid for borrowing clothes without asking, gaming night, and treats.",
        coupon: "BHAI-VIP-PASS-2026"
      },
      timeline: [
        { icon: "🎮", date: "Bachpan", title: "Games & Fights", text: "Video games, wrestling aur snacks ke liye continuous ladai." },
        { icon: "🚀", date: "Teens", title: "Saath me Samajhna", text: "Life ke baare me seekhna aur secret baatein share karna." },
        { icon: "🤝", date: "Bhai-Bhai", title: "Strong Bond", text: "Bade hokar ek doosre ke sabse solid supporters banna." },
        { icon: "🎂", date: "Aaj Ka Din", title: "Bhai Ka Birthday", text: "Time to celebrate with full energy!" }
      ],
      gallery: [
        { image: null, emoji: "🤜🤛", rot: -5, cap: "Brothers", secretNote: "Thick and thin me hamesha saath." },
        { image: null, emoji: "🎮", rot: 4, cap: "Gaming mode", secretNote: "Scores chahe jo bhi hon, maze pure the!" },
        { image: null, emoji: "📸", rot: -3, cap: "Sharp look", secretNote: "Looking dapper for the event." },
        { image: null, emoji: "🌟", rot: 5, cap: "Proud of bro", secretNote: "Keep shining and leveling up." },
        { image: null, emoji: "🎉", rot: -4, cap: "Party Time", secretNote: "Happy Birthday bhai!" }
      ]
    },

    "sister": {
      id: "sister",
      label: "Sister 🌸 (Hinglish)",
      letterLines: [
        "Happy Birthday meri pyaari behen! Meri secret keeper, drama queen aur family ki sabse brightest spark.",
        "Tere saath bade hona sach me best experience tha. Ladai-jhagde se lekar late-night talks tak, tu hamesha meri best friend rahi hai.",
        "Bhagwan kare is saal tere saare dreams pure hon, bohot saari shopping karne ko mile aur life me bas khushiyan hi khushiyan hon.",
        "Stay as fabulous, sweet and awesome as you are. Happy Birthday! 💖✨"
      ],
      memory: "Woh raat jab humne bina kisi reason ke baith kar puraane kisse yaad kiye aur late-night snacks khaye... Pure golden memory!",
      reasons: [
        { icon: "🌸", title: "Sweet & Caring", text: "Tu sabka itna khayal rakhti hai aur ghar ka mahaul cheerful banati hai." },
        { icon: "💎", title: "Secret Keeper", text: "Tujhe main kuch bhi bata sakta/sakti hoon bina kisi worry ke." },
        { icon: "✨", title: "Stylish & Smart", text: "Har cheez me tera style aur elegance alag hi chamakta hai." },
        { icon: "💖", title: "Always Supportive", text: "Tu hamesha cheer karti hai aur support deti hai jab zaroorat ho." },
        { icon: "👑", title: "Ghar Ki Princess", text: "Tere bina humara ghar sach me itna lively nahi hota." }
      ],
      wishes: [
        "Ye saal tere liye bohot saari khushiyan aur achievements lekar aaye!",
        "Wishing you glowing health, stylish moments aur sweet surprises!",
        "Tu jo bhi target decide kare, usme tujhe top success mile!",
        "Duniya ki sabse best behen ko Happy Birthday!",
        "Happy Birthday sis! May all your wishes come true."
      ],
      gift: {
        message: "Sister VIP Shopping Pass: Valid for shopping spree, coffee date, and zero teasing for a whole week.",
        coupon: "BEHEN-SHOPPING-2026"
      },
      timeline: [
        { icon: "🎀", date: "Bachpan", title: "Sweet Fights", text: "Toys ke liye ladna aur 5 minute baad phir dost ban jana." },
        { icon: "🌷", date: "Growing Up", title: "True Confidante", text: "Ek doosre ke secrets protect karna aur dreams share karna." },
        { icon: "💖", date: "Sisterhood", title: "Unbreakable", text: "Time ke saath aur bhi gehra aur pyara hota bond." },
        { icon: "🎂", date: "Aaj Ka Din", title: "Sister's Birthday", text: "Celebrating the sweetest sister in the world!" }
      ],
      gallery: [
        { image: null, emoji: "🌸", rot: -5, cap: "Sisterly love", secretNote: "Ghar ki sabse pyari muskaan!" },
        { image: null, emoji: "📸", rot: 4, cap: "Selfie time", secretNote: "50 photos me se ye sabse best thi." },
        { image: null, emoji: "🎀", rot: -4, cap: "Cute moments", secretNote: "Always laughing together." },
        { image: null, emoji: "✨", rot: 5, cap: "Glowing", secretNote: "Proud of everything you do." },
        { image: null, emoji: "🎉", rot: -3, cap: "Happy Birthday", secretNote: "Enjoy your special day sis!" }
      ]
    },

    "colleague": {
      id: "colleague",
      label: "Colleague / Workmate 💼 (Hinglish)",
      letterLines: [
        "Happy Birthday to an awesome colleague aur bohot hi badhiya teammate!",
        "Tere saath work karna busy days ko bhi light aur enjoyable bana deta hai. Thanks for your sharp solutions aur great energy.",
        "Umeed hai ye aane wala saal tere liye career growth, promotions aur great work-life balance lekar aayega.",
        "Wishing you a fantastic celebration today and continued success ahead! 🚀🎂"
      ],
      memory: "Woh tight deadline jab humne teamwork aur bohot saari chai-coffee ke sahare project successfully deliver kiya tha... Good times!",
      reasons: [
        { icon: "💡", title: "Smart Problem Solver", text: "Har complex issue me clear perspective aur quick solutions nikaalna." },
        { icon: "🤝", title: "Great Teammate", text: "Hamesha team ko support karna aur collaborative spirit maintain karna." },
        { icon: "☕", title: "Positive Work Vibe", text: "Tera cheerful attitude office ke mahaul ko lively rakhta hai." },
        { icon: "🎯", title: "Focused & Reliable", text: "Jab tu koi task leta hai toh sabko pata hota hai ki result top hoga." },
        { icon: "🌟", title: "High Potential", text: "Calm professionalism aur hard work se sabko inspire karna." }
      ],
      wishes: [
        "Ye saal tere career me bohot saare promotions aur milestones lekar aaye!",
        "Wishing you great health, relaxing weekends aur peace of mind!",
        "Teri dedication ko har jagah recognition aur appreciation mile!",
        "Team ke sabse valued colleague ko Happy Birthday!",
        "Happy Birthday! Have a productive year in fun and success."
      ],
      gift: {
        message: "Workplace VIP Treat Voucher: Valid for free coffee treat, zero meeting stress on birthday, and celebration snacks.",
        coupon: "TEAM-COFFEE-TREAT-2026"
      },
      timeline: [
        { icon: "👋", date: "First Sprint", title: "Joining the Team", text: "Team me aate hi great energy aur strong skills display karna." },
        { icon: "🚀", date: "Big Projects", title: "Delivering Wins", text: "Tight deadlines me saath kaam karke milestones hit karna." },
        { icon: "🏆", date: "Excellence", title: "Building Trust", text: "Consistent performance se sabka respect earn karna." },
        { icon: "🎂", date: "Aaj Ka Din", title: "Celebrating You", text: "Wishing a very Happy Birthday to our awesome teammate!" }
      ],
      gallery: [
        { image: null, emoji: "💼", rot: -5, cap: "Work vibes", secretNote: "Always bringing great energy." },
        { image: null, emoji: "☕", rot: 4, cap: "Chai break", secretNote: "Essential fuel for busy sprints!" },
        { image: null, emoji: "🏆", rot: -3, cap: "Project success", secretNote: "Celebrating a big milestone." },
        { image: null, emoji: "💡", rot: 5, cap: "Brainstorming", secretNote: "Great ideas turning into results." },
        { image: null, emoji: "🎉", rot: -4, cap: "Birthday at work", secretNote: "Wishing you big success ahead!" }
      ]
    },

    "teacher": {
      id: "teacher",
      label: "Teacher / Mentor 🎓 (Hinglish)",
      letterLines: [
        "Happy Birthday to our most respected teacher aur inspiring mentor!",
        "Aapke guidance, patience aur encouragement ke bina humari learning journey itni meaningful nahi hoti. Thank you for always believing in us.",
        "Bhagwan kare aapko lambi umar, acchi health aur bohot saari khushiyan milein. Aapka aashirwad hamesha humare saath rahe.",
        "With immense respect and gratitude, wishing you a very Happy Birthday! 📚🌟"
      ],
      memory: "Aapka woh inspirational lecture jab aapne hume sikhaya tha ki hard work aur self-belief se koi bhi goal achieve kiya ja sakta hai.",
      reasons: [
        { icon: "📚", title: "Gyaan Ka Sagar", text: "Aap har complex topic ko itni clarity aur passion se samjhate hain." },
        { icon: "🌱", title: "Nurturing Mindset", text: "Aap hamesha students ko unki best capabilities tak pahuchne ke liye motivate karte hain." },
        { icon: "💡", title: "Guiding Light", text: "Aapki advice hamesha sahi disha dikhati hai." },
        { icon: "✨", title: "Patience & Care", text: "Aap har student ko understanding aur encouragement ke saath guide karte hain." },
        { icon: "🎓", title: "Lifelong Lessons", text: "Aapki sikhayi hui baatein zindagi bhar kaam aati hain." }
      ],
      wishes: [
        "Aapko glowing health, peace aur bohot saari khushiyan milein!",
        "Aapka aane wala saal samman aur proud moments se bhara ho!",
        "Aapki wisdom aise hi anek generations ko guide karti rahe!",
        "Humare sabse respected teacher ko Happy Birthday!",
        "May this year bring you the best health and fulfillment!"
      ],
      gift: {
        message: "Mentor Tribute Certificate: In deep honor of your wisdom, dedication, and inspiring teachings.",
        coupon: "HONORED-TEACHER-TRIBUTE"
      },
      timeline: [
        { icon: "📚", date: "Pehla Lesson", title: "Nayi Seekh", text: "Pehle lecture se hi curiosity jagana aur high standards set karna." },
        { icon: "💡", date: "Mentorship", title: "Sahi Disha", text: "Har challenge me encourage karna aur valuable advice dena." },
        { icon: "🎓", date: "Success", title: "Aapka Contribution", text: "Har student ki kamiyabi me aapki mehnat ka bada hissa hai." },
        { icon: "🎂", date: "Aaj Ka Din", title: "Honoring Our Teacher", text: "Celebrating our revered mentor with utmost respect." }
      ],
      gallery: [
        { image: null, emoji: "🎓", rot: -5, cap: "Inspiring Mentor", secretNote: "Knowledge aur grace ke saath guide karna." },
        { image: null, emoji: "📚", rot: 4, cap: "Classroom moments", secretNote: "Where learning turns into wisdom." },
        { image: null, emoji: "💡", rot: -4, cap: "Anmol Baatein", secretNote: "Lessons that stay with us forever." },
        { image: null, emoji: "🌟", rot: 5, cap: "Proud Students", secretNote: "Grateful for your constant encouragement." },
        { image: null, emoji: "🎂", rot: -3, cap: "Happy Birthday Sir/Ma'am", secretNote: "Wishing you the very best!" }
      ]
    }
  };

  /**
   * Retrieves preset by key and language.
   * @param {string} key - e.g. "best_friend"
   * @param {string} lang - "en" | "hi_en" | "hinglish"
   */
  function getPreset(key, lang = "en") {
    if (!key) return null;
    const isHinglish = String(lang).toLowerCase().includes("hi") || String(lang).toLowerCase().includes("hing");
    const dict = isHinglish ? PRESETS_HINGLISH : PRESETS_EN;
    return dict[key] || PRESETS_EN[key] || null;
  }

  /**
   * Lists available presets with id and label.
   * @param {string} lang - "en" | "hi_en"
   */
  function listPresets(lang = "en") {
    const isHinglish = String(lang).toLowerCase().includes("hi") || String(lang).toLowerCase().includes("hing");
    const dict = isHinglish ? PRESETS_HINGLISH : PRESETS_EN;
    return Object.keys(dict).map(k => ({
      id: dict[k].id,
      label: dict[k].label
    }));
  }

  // Authoritative Export
  root.RelationshipPresets = Object.freeze({
    getPreset,
    listPresets,
    languages: ["en", "hi_en"],
    presetsEn: PRESETS_EN,
    presetsHinglish: PRESETS_HINGLISH
  });

})(typeof window !== "undefined" ? window : globalThis);
