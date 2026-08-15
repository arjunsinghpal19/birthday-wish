// ============================================================
// MODULE: Canvas Export
// LOCATION: js/modules/canvas-export.js
//
// OWNS:
// - Cake Memory canvas export (1200x800 luxury landscape keepsake card)
// - Instagram Story canvas export (1080x1920 9:16 portrait story card)
// - Responsive text fitting & word wrapping for canvas titles/messages
// - User-triggered downloadable visual-card generation
//
// DOES NOT OWN:
// - Page rendering
// - Editor logic
// - Audio
// - Video
// - Database
// - Admin Security
// - Application boot
// - Visual interaction effects
// ============================================================

(function (root) {
  "use strict";

  /**
   * Resolves the global CONFIG object across window/script scopes.
   */
  function getConfig() {
    if (typeof CONFIG !== "undefined") return CONFIG;
    if (root.CONFIG) return root.CONFIG;
    return {};
  }

  /**
   * Resolves formatName helper across window/script scopes.
   */
  function getFormatName() {
    if (typeof formatName === "function") return formatName;
    if (root.formatName && typeof root.formatName === "function") return root.formatName;
    return (n) => n || "";
  }

  /**
   * Safely shows a toast notification across window/script scopes.
   */
  function notifyToast(msg) {
    if (typeof showToast === "function") {
      showToast(msg);
    } else if (root.showToast && typeof root.showToast === "function") {
      root.showToast(msg);
    }
  }

  /**
   * Sanitizes a string for use in downloadable filenames.
   */
  function sanitizeFilename(name) {
    if (!name || typeof name !== "string") return "birthday-wish";
    return name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "birthday-wish";
  }

  /**
   * Helper: Wraps text into multiple lines fitting within maxWidth.
   */
  function wrapTextLines(ctx, text, maxWidth) {
    if (!text) return [];
    const words = text.trim().split(/\s+/);
    const lines = [];
    let currentLine = "";

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /**
   * Helper: Fits and wraps a title or recipient heading to fit within maxWidth and maxHeight.
   * Returns { lines, fontSize, lineHeight, totalHeight }.
   */
  function fitHeadingText(ctx, text, maxWidth, initialFontSize, minFontSize, fontFamily, maxLines = 3) {
    let fontSize = initialFontSize;
    let lines = [];
    let lineHeight = Math.round(fontSize * 1.18);

    while (fontSize >= minFontSize) {
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
      lines = wrapTextLines(ctx, text, maxWidth);

      // Check if all lines fit within maxWidth and line count is within maxLines
      const allFit = lines.every((l) => ctx.measureText(l).width <= maxWidth);
      if (allFit && lines.length <= maxLines) {
        lineHeight = Math.round(fontSize * 1.18);
        return {
          lines,
          fontSize,
          lineHeight,
          totalHeight: lines.length * lineHeight
        };
      }

      fontSize -= 2;
    }

    // Fallback at minFontSize
    fontSize = minFontSize;
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    lines = wrapTextLines(ctx, text, maxWidth);
    lineHeight = Math.round(fontSize * 1.18);
    return {
      lines,
      fontSize,
      lineHeight,
      totalHeight: lines.length * lineHeight
    };
  }

  // ============================================================
  // 1. SAVE CAKE MEMORY EXPORT (1200 x 800 LANDSCAPE KEEPSAKE)
  // ============================================================

  /**
   * Generates and downloads a clean, elegant 1200x800 2D canvas keepsake card.
   */
  function saveCakeMemory() {
    notifyToast("Saving Memory Snapshot... 📸");

    const cfg = getConfig();
    const fmt = getFormatName();
    const rawName = (cfg.name || "Happy Birthday").trim();
    const displayName = fmt(rawName);

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

    // Main Greeting Name with Responsive Text-Fitting Safety
    const greetingText = rawName ? `Happy Birthday, ${displayName} ❤️` : "Happy Birthday ❤️";
    const nameFit = fitHeadingText(
      ctx,
      greetingText,
      1020,
      58,
      28,
      "'Dancing Script', 'Great Vibes', cursive, serif",
      2
    );

    const nameGrad = ctx.createLinearGradient(300, 0, 900, 0);
    nameGrad.addColorStop(0, "#FFD700");
    nameGrad.addColorStop(0.5, "#FFF7FC");
    nameGrad.addColorStop(1, "#FF5FA2");

    ctx.save();
    ctx.shadowColor = "rgba(255, 95, 162, 0.8)";
    ctx.shadowBlur = 25;
    ctx.fillStyle = nameGrad;
    ctx.textAlign = "center";
    ctx.font = `bold ${nameFit.fontSize}px 'Dancing Script', 'Great Vibes', cursive, serif`;

    let curNameY = nameFit.lines.length === 1 ? 185 : 160;
    nameFit.lines.forEach((line) => {
      ctx.fillText(line, 600, curNameY);
      curNameY += nameFit.lineHeight;
    });
    ctx.restore();

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

    // Initiate PNG Download
    const safeName = sanitizeFilename(rawName);
    const a = document.createElement("a");
    a.download = `birthday-memory-${safeName}.png`;
    a.href = c.toDataURL("image/png");
    a.click();

    notifyToast("Memory Snapshot Saved! 📸");
  }

  // ============================================================
  // 2. INSTAGRAM STORY EXPORT (1080 x 1920 9:16 PORTRAIT STORY)
  // ============================================================

  /**
   * Generates and downloads a responsive, non-overflowing 1080x1920 (9:16 vertical portrait) Instagram Story graphics card.
   */
  function exportInstaStory() {
    notifyToast("Generating HD Insta Story... ✨");

    const cfg = getConfig();
    const fmt = getFormatName();
    const rawName = (cfg.name || "Happy Birthday").trim();
    const displayName = fmt(rawName);

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
    for (let i = 0; i < 45; i++) {
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
    ctx.fillText("✦ HAPPY BIRTHDAY ✦", 540, 240);
    ctx.shadowBlur = 0;

    // ─── 6. RESPONSIVE RECIPIENT NAME / TITLE FITTING (NO OVERFLOW) ───
    // Safe width inside story frame: 880px max
    const maxTitleWidth = 860;
    const nameFit = fitHeadingText(
      ctx,
      displayName,
      maxTitleWidth,
      96,
      36,
      "'Dancing Script', 'Great Vibes', cursive, serif",
      3
    );

    ctx.save();
    ctx.shadowColor = "rgba(255, 95, 162, 0.75)";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#FFF7FB";
    ctx.font = `700 ${nameFit.fontSize}px 'Dancing Script', 'Great Vibes', cursive, serif`;
    ctx.textAlign = "center";

    // Center vertical distribution for recipient name block
    const nameBlockStartY = 330;
    let curTitleY = nameBlockStartY;
    nameFit.lines.forEach((line) => {
      ctx.fillText(line, 540, curTitleY);
      curTitleY += nameFit.lineHeight;
    });
    ctx.restore();

    // ─── 7. DYNAMIC GLASSMORPHISM MESSAGE CARD ───
    // Position message card dynamically right below the name block
    const cardY = Math.max(450, curTitleY + 25);

    ctx.font = "400 36px 'Outfit', 'Poppins', sans-serif";
    const wrappedLines = [];
    const letterLines = cfg.letterLines || [
      "Wishing you a day filled with love, laughter, and unforgettable moments.",
      "May all your dreams and wishes come true this year!"
    ];

    letterLines.forEach((line) => {
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

    const lineHeight = 54;
    const textContentHeight = wrappedLines.length * lineHeight;
    const cardPaddingTop = 68;
    const cardPaddingBottom = 50;
    const cardHeight = textContentHeight + cardPaddingTop + cardPaddingBottom;

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
    ctx.fillText("🌸 ✦ 🌸", 540, cardY + 42);

    // Render Text Lines inside Card
    ctx.fillStyle = "#FFF7FB";
    ctx.font = "400 36px 'Outfit', 'Poppins', sans-serif";
    let curY = cardY + 104;
    wrappedLines.forEach((l) => {
      ctx.fillText(l, 540, curY);
      curY += lineHeight;
    });

    // Card Bottom Divider Line
    const dividerY = cardY + cardHeight - 24;
    ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(340, dividerY);
    ctx.lineTo(740, dividerY);
    ctx.stroke();

    // ─── 8. SENDER SIGNATURE ───
    const sigY = cardY + cardHeight + 78;
    ctx.shadowColor = "rgba(255, 95, 162, 0.5)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#FFB6D9";
    ctx.font = "italic 44px 'Dancing Script', cursive, serif";
    ctx.fillText(`With love, ${cfg.from || "Your Best Friend"}`, 540, sigY);
    ctx.shadowBlur = 0;

    // ─── 9. LOWER CELEBRATION AREA (PRIORITY-BASED DYNAMIC RESPONSIVE COMPOSITION) ───
    const bottomLimitY = 1790;
    const celebrationStartY = sigY + 45;
    const availableLowerHeight = bottomLimitY - celebrationStartY;

    // Feature Flags & Proportions based on available space:
    // Plentiful space (>= 340): Show Full Cake, Balloons, Subtitle Line, Bottom Tag
    // Moderate space (220 <= h < 340): Show Scaled Cake, Balloons, Subtitle Line, Bottom Tag
    // Limited space (140 <= h < 220): Show Scaled Cake, Minimal Balloons, HIDE Subtitle Line, Bottom Tag
    // Very limited space (80 <= h < 140): Show Small Cake only (HIDE Balloons, HIDE Subtitle, HIDE Bottom Tag)
    // Extremely limited space (< 80): HIDE ALL lower decorations (Message & Sender retain 100% space & clarity, 0 collision with frame)

    if (availableLowerHeight >= 80) {
      // Calculate responsive scale factor
      const scale = Math.min(1.0, Math.max(0.48, availableLowerHeight / 480));
      const showBalloons = availableLowerHeight >= 200;
      const showSubtitle = availableLowerHeight >= 240;
      const celebrationCenterY = celebrationStartY + (availableLowerHeight * (showSubtitle ? 0.42 : 0.48));

      // (A) Floating Balloons on Sides (Priority 2)
      if (showBalloons) {
        const drawBalloon = (bx, by, br, color, angle) => {
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(angle);

          // Balloon Body
          const bGrad = ctx.createRadialGradient(-br * 0.3, -br * 0.3, br * 0.1, 0, 0, br);
          bGrad.addColorStop(0, "#FFFFFF");
          bGrad.addColorStop(0.3, color.glow);
          bGrad.addColorStop(0.85, color.base);
          bGrad.addColorStop(1, color.dark);
          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.ellipse(0, 0, br * 0.82, br, 0, 0, Math.PI * 2);
          ctx.fill();

          // Knot
          ctx.fillStyle = color.dark;
          ctx.beginPath();
          ctx.moveTo(-br * 0.15, br + 2);
          ctx.lineTo(br * 0.15, br + 2);
          ctx.lineTo(0, br + 8);
          ctx.closePath();
          ctx.fill();

          // String
          ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, br + 8);
          ctx.bezierCurveTo(8, br + 25, -8, br + 45, 4, br + 70);
          ctx.stroke();

          ctx.restore();
        };

        // Left Balloons
        drawBalloon(220, celebrationCenterY - (30 * scale), 40 * scale, {
          glow: "rgba(255, 140, 195, 0.85)",
          base: "rgba(255, 64, 129, 0.7)",
          dark: "rgba(194, 24, 91, 0.65)"
        }, -0.12);

        drawBalloon(290, celebrationCenterY + (20 * scale), 34 * scale, {
          glow: "rgba(255, 235, 150, 0.85)",
          base: "rgba(255, 215, 0, 0.7)",
          dark: "rgba(184, 134, 11, 0.65)"
        }, 0.08);

        // Right Balloons
        drawBalloon(860, celebrationCenterY - (30 * scale), 40 * scale, {
          glow: "rgba(216, 180, 254, 0.85)",
          base: "rgba(168, 85, 247, 0.7)",
          dark: "rgba(107, 33, 168, 0.65)"
        }, 0.12);

        drawBalloon(790, celebrationCenterY + (20 * scale), 34 * scale, {
          glow: "rgba(255, 140, 195, 0.85)",
          base: "rgba(255, 64, 129, 0.7)",
          dark: "rgba(194, 24, 91, 0.65)"
        }, -0.08);
      }

      // (B) Elegant 2-Tier Birthday Cake in Center (Priority 2)
      const cakeBaseY = celebrationCenterY + (65 * scale);

      // Cake Stand Plate
      ctx.save();
      const standGrad = ctx.createLinearGradient(540 - 150 * scale, 0, 540 + 150 * scale, 0);
      standGrad.addColorStop(0, "#FFF9E6");
      standGrad.addColorStop(0.5, "#FFFFFF");
      standGrad.addColorStop(1, "#FFE8B3");
      ctx.fillStyle = standGrad;
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.ellipse(540, cakeBaseY, 150 * scale, 22 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tier 1 (Bottom Tier)
      const t1W = 210 * scale;
      const t1H = 65 * scale;
      const t1X = 540 - t1W / 2;
      const t1Y = cakeBaseY - t1H;
      const cGrad1 = ctx.createLinearGradient(t1X, 0, t1X + t1W, 0);
      cGrad1.addColorStop(0, "#FFF5FA");
      cGrad1.addColorStop(0.5, "#FFE3F0");
      cGrad1.addColorStop(1, "#FFD1E8");
      ctx.fillStyle = cGrad1;
      ctx.strokeStyle = "#E298BF";
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.roundRect(t1X, t1Y, t1W, t1H, 12 * scale);
      ctx.fill();
      ctx.stroke();

      // Tier 1 Drips
      ctx.fillStyle = "#FF4081";
      ctx.beginPath();
      ctx.moveTo(t1X, t1Y);
      const dStep1 = t1W / 5;
      for (let i = 0; i < 5; i++) {
        const cx1 = t1X + i * dStep1 + dStep1 * 0.3;
        const cy1 = t1Y + (i % 2 === 0 ? 14 * scale : 8 * scale);
        const cx2 = t1X + i * dStep1 + dStep1 * 0.7;
        const cy2 = t1Y + (i % 2 === 0 ? 14 * scale : 8 * scale);
        const ex = t1X + (i + 1) * dStep1;
        ctx.bezierCurveTo(cx1, cy1, cx2, cy2, ex, t1Y);
      }
      ctx.lineTo(t1X + t1W, t1Y - 4);
      ctx.lineTo(t1X, t1Y - 4);
      ctx.closePath();
      ctx.fill();

      // Tier 2 (Top Tier)
      const t2W = 140 * scale;
      const t2H = 50 * scale;
      const t2X = 540 - t2W / 2;
      const t2Y = t1Y - t2H + (6 * scale);
      const cGrad2 = ctx.createLinearGradient(t2X, 0, t2X + t2W, 0);
      cGrad2.addColorStop(0, "#FFFDF7");
      cGrad2.addColorStop(0.5, "#FFF7E3");
      cGrad2.addColorStop(1, "#FFEBC2");
      ctx.fillStyle = cGrad2;
      ctx.strokeStyle = "#D4AF37";
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.roundRect(t2X, t2Y, t2W, t2H, 10 * scale);
      ctx.fill();
      ctx.stroke();

      // Tier 2 Drips
      ctx.fillStyle = "#A855F7";
      ctx.beginPath();
      ctx.moveTo(t2X, t2Y);
      const dStep2 = t2W / 4;
      for (let i = 0; i < 4; i++) {
        const cx1 = t2X + i * dStep2 + dStep2 * 0.3;
        const cy1 = t2Y + (i % 2 === 0 ? 12 * scale : 6 * scale);
        const cx2 = t2X + i * dStep2 + dStep2 * 0.7;
        const cy2 = t2Y + (i % 2 === 0 ? 12 * scale : 6 * scale);
        const ex = t2X + (i + 1) * dStep2;
        ctx.bezierCurveTo(cx1, cy1, cx2, cy2, ex, t2Y);
      }
      ctx.lineTo(t2X + t2W, t2Y - 4);
      ctx.lineTo(t2X, t2Y - 4);
      ctx.closePath();
      ctx.fill();

      // Fruit/Rose Toppings on Top Tier
      ctx.font = `${Math.round(20 * scale)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("🍓 🍒 🌹", 540, t2Y - 6 * scale);

      // 3 Glowing Lit Candles
      [-32 * scale, 0, 32 * scale].forEach((offX, idx) => {
        const cx = 540 + offX;
        const cHeight = (idx === 1 ? 32 : 26) * scale;
        const cTopY = t2Y - 14 * scale - cHeight;

        // Candle Body
        ctx.fillStyle = idx === 1 ? "#FFD700" : "#FF80BF";
        ctx.beginPath();
        ctx.roundRect(cx - 3 * scale, cTopY, 6 * scale, cHeight, 2 * scale);
        ctx.fill();

        // Candle Wick
        ctx.fillStyle = "#222";
        ctx.fillRect(cx - 1, cTopY - 4 * scale, 2, 4 * scale);

        // Candle Flame Glow
        ctx.shadowColor = "#FF5722";
        ctx.shadowBlur = 18 * scale;
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.ellipse(cx, cTopY - 10 * scale, 5 * scale, 9 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner Core
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.ellipse(cx, cTopY - 9 * scale, 2.2 * scale, 4.5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      ctx.restore();

      // (C) Decorative Subtitle Line: "✦ CELEBRATE • SMILE • SHINE ✦" (Priority 3 - Only if space >= 240)
      if (showSubtitle) {
        const subTextY = cakeBaseY + (46 * scale);
        ctx.save();
        ctx.fillStyle = "#FFD700";
        ctx.font = `italic 600 ${Math.round(22 * scale)}px 'Playfair Display', Georgia, serif`;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(255, 215, 0, 0.5)";
        ctx.shadowBlur = 10;
        ctx.fillText("✦ CELEBRATE • SMILE • SHINE ✦", 540, subTextY);
        ctx.restore();
      }
    }

    // ─── 10. BOTTOM FESTIVE TAG (Priority 4 - Only render if space permits and no collision with sender signature) ───
    if (availableLowerHeight >= 110 && sigY + 60 <= 1765) {
      const tagY = Math.min(1760, Math.max(sigY + 70, 1720));
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.font = "500 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🎂 CELEBRATING ANOTHER BEAUTIFUL YEAR ✨", 540, tagY);
      ctx.restore();
    }

    // ─── 11. INITIATE DOWNLOAD ───
    const safeName = sanitizeFilename(rawName);
    const a = document.createElement("a");
    a.download = `insta-story-${safeName}.png`;
    a.href = c.toDataURL("image/png");
    a.click();

    notifyToast("HD Insta Story Saved! 📸");
  }

  // Export public API on root (window)
  root.saveCakeMemory = saveCakeMemory;
  root.exportInstaStory = exportInstaStory;

})(typeof window !== "undefined" ? window : globalThis);
