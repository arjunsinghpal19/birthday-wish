/**
 * ============================================================================
 * ADMIN STUDIO THEME REGISTRY & MANAGEMENT (js/admin/admin-themes.js)
 * Single source of truth for the authoritative Theme Registry, metadata,
 * theme resolution, and non-destructive Admin Theme Foundation UI.
 * ============================================================================
 */

(function (window) {
  "use strict";

  /* ============================================================
     1. AUTHORITATIVE THEME DEFINITIONS
     ============================================================ */
  const THEME_DEFINITIONS = [
    {
      id: "default",
      displayName: "Default Golden Luxe",
      description: "Classic Warm Gold & Light Parchment with sparkling gold accents and timeless cursive typography.",
      category: "classic",
      badge: "✨ Classic",
      icon: "✨",
      isDefault: true,
      isAvailable: true,
      className: "theme-default",
      palette: {
        background: "#1f1122",
        envelope: "#2a162b",
        paperBg: "#fffef5",
        text: "#3a1c28",
        accent: "#ffd700",
        highlight: "#ff9f43",
        border: "rgba(255, 215, 0, 0.4)"
      },
      visuals: {
        cornerOrnament: "🌸",
        cornerDescription: "Delicate Golden Blossoms & Soft Sparkles",
        atmosphere: "Classic Warm Gold & Light Parchment",
        envelopeGradient: "linear-gradient(135deg, #1f1122 0%, #2a162b 50%, #150918 100%)",
        paperBackground: "linear-gradient(180deg, #fffaf3 0%, #fff3e6 100%)",
        borderStyle: "1px solid rgba(255, 215, 0, 0.45)",
        textColor: "#3a2440",
        accentColor: "#ffd700",
        titleColor: "#ff5fa2",
        titleShadow: "0 0 18px rgba(255, 95, 162, 0.4)",
        paperShadow: "0 25px 50px rgba(0, 0, 0, 0.35), 0 0 25px rgba(255, 215, 0, 0.2)",
        envelopeShadow: "0 0 30px rgba(255, 215, 0, 0.25)",
        cornerFilter: "drop-shadow(0 2px 8px rgba(255, 95, 162, 0.5)) drop-shadow(0 0 10px rgba(255, 215, 0, 0.4))"
      },
      preview: {
        gradient: "linear-gradient(135deg, #1f1122 0%, #2a162b 50%, #150918 100%)",
        paperStyle: "background: #fffef5; color: #3a1c28; border: 1px solid rgba(255, 215, 0, 0.4);",
        accentStyle: "color: #ffd700;",
        highlightStyle: "background: rgba(255, 159, 67, 0.2); color: #e67e22;",
        envelopeStyle: "background: #2a162b; border: 1px solid rgba(255, 215, 0, 0.3);"
      }
    },
    {
      id: "royalgold",
      displayName: "Vintage Royal Gold",
      description: "Antique Gold Foil & Deep Dark Parchment with gilded borders and regal ballroom elegance.",
      category: "luxury",
      badge: "👑 Regal",
      icon: "👑",
      isDefault: false,
      isAvailable: true,
      className: "theme-royalgold",
      palette: {
        background: "#18140c",
        envelope: "#2c2313",
        paperBg: "#1c170d",
        text: "#f5e6c8",
        accent: "#f59e0b",
        highlight: "#fbbf24",
        border: "rgba(245, 158, 11, 0.5)"
      },
      visuals: {
        cornerOrnament: "⚜️",
        cornerDescription: "Ornate Royal Gold Filigree & Baroque Flourishes",
        atmosphere: "Antique Gilded Gold & Regal Dark Velvet",
        envelopeGradient: "linear-gradient(135deg, #18140c 0%, #2c2313 50%, #110d07 100%)",
        paperBackground: "linear-gradient(135deg, #1c170d 0%, #261e10 100%)",
        borderStyle: "2px solid #f59e0b",
        textColor: "#f5e6c8",
        accentColor: "#f59e0b",
        titleColor: "#ffe600",
        titleShadow: "0 0 16px rgba(255, 230, 0, 0.85), 0 0 32px rgba(245, 158, 11, 0.5)",
        paperShadow: "0 30px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(245, 158, 11, 0.4)",
        envelopeShadow: "0 0 35px rgba(245, 158, 11, 0.45)",
        cornerFilter: "drop-shadow(0 0 10px rgba(245, 158, 11, 0.95)) drop-shadow(0 0 20px rgba(251, 191, 36, 0.7))"
      },
      preview: {
        gradient: "linear-gradient(135deg, #18140c 0%, #241d10 50%, #110d07 100%)",
        paperStyle: "background: #1c170d; color: #f5e6c8; border: 1px solid rgba(245, 158, 11, 0.5);",
        accentStyle: "color: #f59e0b;",
        highlightStyle: "background: rgba(245, 158, 11, 0.25); color: #fbbf24;",
        envelopeStyle: "background: #2c2313; border: 1px solid rgba(245, 158, 11, 0.4);"
      }
    },
    {
      id: "galaxy",
      displayName: "Midnight Galaxy Glow",
      description: "Cosmic Night & Vibrant Neon Violet with glowing constellation highlights and dark velvet parchment.",
      category: "vibrant",
      badge: "🌌 Cosmic",
      icon: "🌌",
      isDefault: false,
      isAvailable: true,
      className: "theme-galaxy",
      palette: {
        background: "#090817",
        envelope: "#1a153b",
        paperBg: "#0d0b21",
        text: "#e0d8ff",
        accent: "#a855f7",
        highlight: "#c084fc",
        border: "rgba(168, 85, 247, 0.5)"
      },
      visuals: {
        cornerOrnament: "✨",
        cornerDescription: "Constellation Star Clusters & Nebula Glow",
        atmosphere: "Deep Space Nebula & Vibrant Cosmic Glow",
        envelopeGradient: "linear-gradient(135deg, #090317 0%, #15062d 50%, #220030 100%)",
        paperBackground: "linear-gradient(135deg, #090317 0%, #130726 50%, #1c052e 100%)",
        borderStyle: "2px solid #a855f7",
        textColor: "#e0f7fa",
        accentColor: "#a855f7",
        titleColor: "#ff2a85",
        titleShadow: "0 0 18px rgba(255, 42, 133, 0.95), 0 0 32px rgba(181, 23, 158, 0.7)",
        paperShadow: "0 30px 60px rgba(0, 0, 0, 0.65), 0 0 40px rgba(168, 85, 247, 0.5)",
        envelopeShadow: "0 0 40px rgba(247, 37, 133, 0.6)",
        cornerFilter: "drop-shadow(0 0 12px rgba(247, 37, 133, 0.95)) drop-shadow(0 0 18px rgba(168, 85, 247, 0.85))"
      },
      preview: {
        gradient: "linear-gradient(135deg, #090817 0%, #120f2e 50%, #060511 100%)",
        paperStyle: "background: #0d0b21; color: #e0d8ff; border: 1px solid rgba(168, 85, 247, 0.5);",
        accentStyle: "color: #a855f7;",
        highlightStyle: "background: rgba(168, 85, 247, 0.25); color: #c084fc;",
        envelopeStyle: "background: #1a153b; border: 1px solid rgba(168, 85, 247, 0.4);"
      }
    },
    {
      id: "rosegold",
      displayName: "Rose Gold Pastel",
      description: "Soft Pearl Pink & Elegant Rose Gold with blush tones, gentle pastel gradients, and delicate roses.",
      category: "pastel",
      badge: "🌸 Romantic",
      icon: "🌸",
      isDefault: false,
      isAvailable: true,
      className: "theme-rosegold",
      palette: {
        background: "#1f0f18",
        envelope: "#3a182b",
        paperBg: "#fff0f5",
        text: "#4a192c",
        accent: "#f472b6",
        highlight: "#fb7185",
        border: "rgba(244, 114, 182, 0.5)"
      },
      visuals: {
        cornerOrnament: "🌹",
        cornerDescription: "Romantic Rose Blooms & Floating Blush Petals",
        atmosphere: "Soft Pearl Pink & Elegant Rose Gold Gilded Glow",
        envelopeGradient: "linear-gradient(135deg, #24131b 0%, #3d1b2a 100%)",
        paperBackground: "linear-gradient(135deg, #fff0f5 0%, #fde2ec 100%)",
        borderStyle: "2px solid #f472b6",
        textColor: "#4a192c",
        accentColor: "#f472b6",
        titleColor: "#ff8ea9",
        titleShadow: "0 0 16px rgba(255, 142, 169, 0.85), 0 0 28px rgba(255, 182, 193, 0.55)",
        paperShadow: "0 30px 60px rgba(0, 0, 0, 0.35), 0 0 30px rgba(244, 114, 182, 0.4)",
        envelopeShadow: "0 0 35px rgba(255, 142, 169, 0.5)",
        cornerFilter: "drop-shadow(0 0 10px rgba(255, 142, 169, 0.85)) drop-shadow(0 0 16px rgba(251, 113, 133, 0.6))"
      },
      preview: {
        gradient: "linear-gradient(135deg, #1f0f18 0%, #2d1322 50%, #170912 100%)",
        paperStyle: "background: #fff0f5; color: #4a192c; border: 1px solid rgba(244, 114, 182, 0.5);",
        accentStyle: "color: #f472b6;",
        highlightStyle: "background: rgba(244, 114, 182, 0.25); color: #fb7185;",
        envelopeStyle: "background: #3a182b; border: 1px solid rgba(244, 114, 182, 0.4);"
      }
    },
    {
      id: "sapphire",
      displayName: "Sapphire Aurora",
      description: "Deep Sapphire Midnight & Polar Aurora Glow with royal navy envelope and cool cyan-blue highlights.",
      category: "celestial",
      badge: "💎 Aurora",
      icon: "💎",
      isDefault: false,
      isAvailable: true,
      className: "theme-sapphire",
      palette: {
        background: "#07111e",
        envelope: "#0d223a",
        paperBg: "#0a192f",
        text: "#e2f1ff",
        accent: "#38bdf8",
        highlight: "#67e8f9",
        border: "rgba(56, 189, 248, 0.5)"
      },
      visuals: {
        cornerOrnament: "💎",
        cornerDescription: "Crystalline Starbursts & Aurora Streaks",
        atmosphere: "Deep Midnight Navy & Cyan Aurora Glow",
        envelopeGradient: "linear-gradient(135deg, #071326 0%, #0e274a 50%, #153966 100%)",
        paperBackground: "linear-gradient(135deg, #0a192f 0%, #0c2340 50%, #102d52 100%)",
        borderStyle: "2px solid #38bdf8",
        textColor: "#f0f9ff",
        accentColor: "#38bdf8",
        titleColor: "#38bdf8",
        titleShadow: "0 0 16px rgba(56, 189, 248, 0.95), 0 0 30px rgba(14, 165, 233, 0.7)",
        paperShadow: "0 30px 60px rgba(0, 0, 0, 0.65), 0 0 38px rgba(56, 189, 248, 0.45)",
        envelopeShadow: "0 0 38px rgba(56, 189, 248, 0.5)",
        cornerFilter: "drop-shadow(0 0 10px rgba(56, 189, 248, 0.9)) drop-shadow(0 0 18px rgba(6, 182, 212, 0.75))"
      },
      preview: {
        gradient: "linear-gradient(135deg, #07111e 0%, #0d223a 50%, #040913 100%)",
        paperStyle: "background: #0a192f; color: #e2f1ff; border: 1px solid rgba(56, 189, 248, 0.5);",
        accentStyle: "color: #38bdf8;",
        highlightStyle: "background: rgba(56, 189, 248, 0.25); color: #67e8f9;",
        envelopeStyle: "background: #0d223a; border: 1px solid rgba(56, 189, 248, 0.4);"
      }
    },
    {
      id: "emerald-luxe",
      displayName: "Emerald Luxe",
      description: "Deep Forest Emerald & Warm Champagne Gold with velvet green envelope and botanical elegance.",
      category: "luxury",
      badge: "🌿 Luxe",
      icon: "🌿",
      isDefault: false,
      isAvailable: true,
      className: "theme-emerald-luxe",
      palette: {
        background: "#071a12",
        envelope: "#0e2e21",
        paperBg: "#fffbf0",
        text: "#14291e",
        accent: "#10b981",
        highlight: "#fbbf24",
        border: "rgba(16, 185, 129, 0.5)"
      },
      visuals: {
        cornerOrnament: "🌿",
        cornerDescription: "Botanical Emerald Leaves & Champagne Gold Vines",
        atmosphere: "Deep Forest Emerald & Warm Champagne Gold",
        envelopeGradient: "linear-gradient(135deg, #071a12 0%, #0e2e21 50%, #133a2a 100%)",
        paperBackground: "linear-gradient(135deg, #fffbf0 0%, #fef7e6 100%)",
        borderStyle: "2px solid #10b981",
        textColor: "#14291e",
        accentColor: "#10b981",
        titleColor: "#065f46",
        titleShadow: "0 0 12px rgba(16, 185, 129, 0.45), 0 0 20px rgba(245, 158, 11, 0.35)",
        paperShadow: "0 30px 60px rgba(0, 0, 0, 0.35), 0 0 35px rgba(16, 185, 129, 0.4), 0 0 15px rgba(251, 191, 36, 0.3)",
        envelopeShadow: "0 0 35px rgba(16, 185, 129, 0.45)",
        cornerFilter: "drop-shadow(0 0 10px rgba(16, 185, 129, 0.85)) drop-shadow(0 0 16px rgba(251, 191, 36, 0.65))"
      },
      preview: {
        gradient: "linear-gradient(135deg, #071a12 0%, #0f3325 50%, #040d09 100%)",
        paperStyle: "background: #fffbf0; color: #14291e; border: 1px solid rgba(16, 185, 129, 0.5);",
        accentStyle: "color: #065f46;",
        highlightStyle: "background: rgba(16, 185, 129, 0.2); color: #065f46;",
        envelopeStyle: "background: #0e2e21; border: 1px solid rgba(16, 185, 129, 0.4);"
      }
    }
  ];

  /* ============================================================
     2. THEME REGISTRY API
     ============================================================ */
  const ThemeRegistry = {
    getAll: function () {
      return JSON.parse(JSON.stringify(THEME_DEFINITIONS));
    },

    getById: function (id) {
      if (!id || typeof id !== "string") return null;
      const normalized = id.trim().toLowerCase();
      const found = THEME_DEFINITIONS.find(t => t.id.toLowerCase() === normalized);
      return found ? JSON.parse(JSON.stringify(found)) : null;
    },

    isValid: function (id) {
      if (!id || typeof id !== "string") return false;
      const normalized = id.trim().toLowerCase();
      return THEME_DEFINITIONS.some(t => t.id.toLowerCase() === normalized);
    },

    getDefault: function () {
      const def = THEME_DEFINITIONS.find(t => t.isDefault) || THEME_DEFINITIONS[0];
      return JSON.parse(JSON.stringify(def));
    },

    getDisplayName: function (id) {
      const theme = ThemeRegistry.getById(id);
      return theme ? theme.displayName : "Default Golden Luxe";
    },

    getIcon: function (id) {
      const theme = ThemeRegistry.getById(id);
      return theme ? (theme.icon || "✨") : "✨";
    },

    getOptionLabel: function (id) {
      const theme = ThemeRegistry.getById(id);
      if (!theme) return "✨ Default Golden Luxe";
      return `${theme.icon || "✨"} ${theme.displayName}`;
    },

    resolveTheme: function (input) {
      if (!input) return "default";
      let rawId = "";
      if (typeof input === "string") {
        rawId = input;
      } else if (typeof input === "object") {
        rawId = input.letter_theme || input.letterTheme || input.lt || input.theme_id || input.themeId || input.theme || "";
      }
      const clean = String(rawId).trim().toLowerCase();
      return ThemeRegistry.isValid(clean) ? clean : "default";
    }
  };

  /* ============================================================
     3. ADMIN THEMES UI & DEFAULT PRESET MANAGEMENT
     ============================================================ */
  const DEFAULT_THEME_STORAGE_KEY = "bw_admin_default_theme";

  function loadStoredDefaultTheme() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = window.localStorage.getItem(DEFAULT_THEME_STORAGE_KEY);
        if (stored && ThemeRegistry.isValid(stored)) {
          return String(stored).trim().toLowerCase();
        }
      }
    } catch (e) {
      console.warn("⚠️ AdminThemes: Failed to read default theme from storage:", e);
    }
    return "default";
  }

  let activeDefaultThemeId = loadStoredDefaultTheme();

  function init() {
    activeDefaultThemeId = loadStoredDefaultTheme();
    renderThemesUI();
    populateThemePresetSelect();
    bindEvents();
  }

  function populateThemePresetSelect() {
    const select = document.getElementById("admin-theme-preset");
    if (!select) return;

    const themes = ThemeRegistry.getAll();
    select.innerHTML = themes.map(t => {
      const selected = t.id === activeDefaultThemeId ? "selected" : "";
      return `<option value="${escapeAttr(t.id)}" ${selected}>${escapeHtml(ThemeRegistry.getOptionLabel(t.id))}</option>`;
    }).join("");
  }

  function renderThemesUI() {
    let grid = document.getElementById("admin-themes-grid");
    if (!grid) {
      const container = document.querySelector("#view-themes .settings-grid");
      if (container) {
        grid = document.createElement("div");
        grid.id = "admin-themes-grid";
        grid.className = "themes-catalog-grid";
        grid.style.gridColumn = "1 / -1";
        grid.style.marginTop = "16px";
        container.appendChild(grid);
      }
    }
    if (!grid) return;

    const themes = ThemeRegistry.getAll();

    // Dynamically update the Registered Themes count badge
    const countBadge = document.getElementById("admin-themes-count-badge") || (typeof document.querySelector === "function" ? document.querySelector("#view-themes .view-actions .nav-badge.count") : null);
    if (countBadge) {
      countBadge.textContent = `${themes.length} Registered Themes`;
    }

    grid.innerHTML = themes.map(t => {
      const isDefault = t.id === activeDefaultThemeId;
      const statusPill = isDefault
        ? `<span class="theme-status-pill default">★ Active Default</span>`
        : `<span class="theme-status-pill available">Available Preset</span>`;

      const cornerIcon = t.visuals?.cornerOrnament || "🌸";
      const cornerFilter = t.visuals?.cornerFilter ? `filter:${t.visuals.cornerFilter};` : "";

      return `
        <div class="glass-card theme-card ${isDefault ? 'is-default-theme' : ''}" data-theme-id="${escapeAttr(t.id)}">
          <div class="theme-card-header" style="background:${t.preview.gradient};">
            <div class="theme-mini-envelope" style="${t.preview.envelopeStyle}">
              <div class="theme-mini-paper" style="${t.preview.paperStyle};position:relative;overflow:hidden;">
                <span style="position:absolute;top:3px;left:4px;font-size:0.72rem;line-height:1;${cornerFilter}">${cornerIcon}</span>
                <span style="position:absolute;bottom:3px;right:4px;font-size:0.72rem;line-height:1;${cornerFilter}">${cornerIcon}</span>
                <div style="font-size:0.70rem;font-weight:700;${t.preview.accentStyle}">Happy Birthday!</div>
                <div style="font-size:0.62rem;opacity:0.85;margin-top:2px;">Warmest wishes on your special day...</div>
                <div style="margin-top:4px;font-size:0.60rem;display:inline-block;padding:1px 6px;border-radius:4px;${t.preview.highlightStyle}">✨ Cherished Moments</div>
              </div>
            </div>
            <div class="theme-badge-top">${escapeHtml(t.badge)}</div>
          </div>

          <div class="theme-card-body">
            <div class="theme-card-title-row">
              <h3 class="theme-title">${escapeHtml(t.displayName)}</h3>
              <code class="theme-id-chip">#${escapeHtml(t.id)}</code>
            </div>
            <p class="theme-desc">${escapeHtml(t.description)}</p>

            <div class="theme-palette-row">
              <span class="theme-palette-label">Palette:</span>
              <div class="theme-palette-dots">
                <span class="theme-color-dot" style="background:${t.palette.background};" title="Background: ${t.palette.background}"></span>
                <span class="theme-color-dot" style="background:${t.palette.envelope};" title="Envelope: ${t.palette.envelope}"></span>
                <span class="theme-color-dot" style="background:${t.palette.paperBg};" title="Letter Paper: ${t.palette.paperBg}"></span>
                <span class="theme-color-dot" style="background:${t.palette.accent};" title="Accent: ${t.palette.accent}"></span>
                <span class="theme-color-dot" style="background:${t.palette.highlight};" title="Highlight: ${t.palette.highlight}"></span>
              </div>
            </div>
          </div>

          <div class="theme-card-footer">
            <div class="theme-card-footer-top">
              ${statusPill}
              <span class="theme-footer-meta">${escapeHtml(t.badge)}</span>
            </div>
            <div class="theme-card-actions">
              <button type="button" class="btn-sm btn-theme-preview" data-theme-id="${escapeAttr(t.id)}" title="Non-destructive theme preview">👁️ Preview</button>
              <button type="button" class="btn-sm btn-theme-customize" data-theme-id="${escapeAttr(t.id)}" title="Controlled theme customization">🎨 Customize</button>
              ${isDefault 
                ? `<button type="button" class="btn-sm btn-theme-active-default" disabled aria-disabled="true" title="Currently active default preset for new wishes">✓ Default</button>`
                : `<button type="button" class="btn-sm btn-theme-set-default" data-theme-id="${escapeAttr(t.id)}" title="Set as default theme for newly created wishes">★ Set Default</button>`
              }
            </div>
          </div>
        </div>
      `;
    }).join("");

    grid.querySelectorAll(".btn-theme-preview").forEach(btn => {
      btn.onclick = () => openThemePreview(btn.dataset.themeId);
    });

    grid.querySelectorAll(".btn-theme-customize").forEach(btn => {
      btn.onclick = () => {
        if (window.AdminThemeCustomizer && typeof window.AdminThemeCustomizer.open === "function") {
          window.AdminThemeCustomizer.open(btn.dataset.themeId);
        }
      };
    });

    grid.querySelectorAll(".btn-theme-set-default").forEach(btn => {
      btn.onclick = () => setDefaultTheme(btn.dataset.themeId);
    });
  }

  function bindEvents() {
    const saveBtn = document.querySelector("#view-themes button.btn-primary");
    if (saveBtn && !saveBtn.__themesBound) {
      saveBtn.__themesBound = true;
      saveBtn.onclick = () => {
        const select = document.getElementById("admin-theme-preset");
        if (select) setDefaultTheme(select.value, true);
      };
    }

    const select = document.getElementById("admin-theme-preset");
    if (select && !select.__themesBound) {
      select.__themesBound = true;
      select.onchange = () => setDefaultTheme(select.value, false);
    }
  }

  function setDefaultTheme(themeId, showToastFeedback = true) {
    if (!ThemeRegistry.isValid(themeId)) {
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast("⚠️ Invalid theme ID specified.");
      }
      return false;
    }

    const cleanId = String(themeId).trim().toLowerCase();
    activeDefaultThemeId = cleanId;

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(DEFAULT_THEME_STORAGE_KEY, cleanId);
      }
    } catch (e) {
      console.warn("⚠️ AdminThemes: Failed to persist default theme to storage:", e);
    }

    renderThemesUI();
    populateThemePresetSelect();

    if (window.AdminLogs && typeof window.AdminLogs.logEvent === "function") {
      window.AdminLogs.logEvent("THEME_DEFAULT_CHANGE", `Default theme preset set to ${ThemeRegistry.getDisplayName(cleanId)} (#${cleanId})`);
    }

    if (showToastFeedback && window.AdminCore && typeof window.AdminCore.showToast === "function") {
      window.AdminCore.showToast(`Active Theme Preset Saved: ${ThemeRegistry.getDisplayName(cleanId)} 🎨`);
    }

    return true;
  }

  function openThemePreview(themeId) {
    const theme = ThemeRegistry.getById(themeId) || ThemeRegistry.getDefault();
    let modal = document.getElementById("modal-theme-preview");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "modal-theme-preview";
      modal.className = "admin-modal-backdrop theme-preview-backdrop";
      modal.innerHTML = `
        <div class="admin-modal-content theme-preview-dialog">
          <div class="theme-preview-header">
            <div class="theme-preview-header-left">
              <div id="theme-preview-modal-badge" class="theme-preview-badge-pill">✨ Classic</div>
              <div>
                <h3 id="theme-preview-modal-title" class="theme-preview-title">Theme Preview</h3>
                <p id="theme-preview-modal-sub" class="theme-preview-subtitle">Live Non-Destructive Envelope & Letter Styling</p>
              </div>
            </div>
            <button type="button" class="btn-modal-close" id="btn-close-theme-preview" aria-label="Close Preview" title="Close Preview">✕</button>
          </div>

          <div class="theme-preview-body">
            <div id="theme-preview-canvas" class="theme-preview-canvas">
              <div id="theme-preview-envelope" class="theme-preview-envelope">
                <div class="theme-preview-envelope-header">
                  <span class="theme-preview-envelope-seal" id="theme-preview-seal">💌</span>
                  <span class="theme-preview-envelope-tag" id="theme-preview-env-tag">Birthday Letter Sealed With Love</span>
                </div>

                <div id="theme-preview-paper" class="theme-preview-paper">
                  <span class="preview-corner-ornament preview-ornament-tl" id="preview-ornament-tl">🌸</span>
                  <span class="preview-corner-ornament preview-ornament-tr" id="preview-ornament-tr">🌸</span>
                  <span class="preview-corner-ornament preview-ornament-bl" id="preview-ornament-bl">🌸</span>
                  <span class="preview-corner-ornament preview-ornament-br" id="preview-ornament-br">🌸</span>
                  
                  <h4 id="theme-preview-letter-title" class="theme-preview-letter-title">Dearest Friend,</h4>
                  
                  <div id="theme-preview-letter-body" class="theme-preview-letter-body">
                    May your birthday sparkle with boundless joy, laughter, and unforgettable moments.<br>
                    Here is to another year of wondrous adventures and cherished dreams!
                  </div>

                  <div class="theme-preview-highlight-wrapper">
                    <span id="theme-preview-highlight-pill" class="theme-preview-highlight-pill">
                      ✨ "A truly magical celebration of happiness"
                    </span>
                  </div>

                  <div id="theme-preview-signoff" class="theme-preview-signoff">
                    With Love & Warm Wishes ❤️
                  </div>
                </div>
              </div>
            </div>

            <div id="theme-preview-meta-strip" class="theme-preview-meta-strip"></div>
          </div>

          <div class="theme-preview-footer">
            <div class="theme-preview-safety-note">
              <span>🔒 Non-destructive live preview &bull; 0 database writes</span>
            </div>
            <div class="theme-preview-footer-buttons" id="theme-preview-footer-actions">
              <button type="button" class="btn-secondary" id="btn-theme-preview-close">Close</button>
              <button type="button" class="btn-secondary btn-theme-preview-customize" id="btn-theme-preview-customize">🎨 Customize</button>
              <button type="button" class="btn-primary btn-gold" id="btn-theme-preview-set-default">★ Set as Default</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const closeBtn = modal.querySelector("#btn-close-theme-preview");
      const footerCloseBtn = modal.querySelector("#btn-theme-preview-close");
      const customBtn = modal.querySelector("#btn-theme-preview-customize");
      const handleClose = () => closeThemePreview();
      if (closeBtn) closeBtn.onclick = handleClose;
      if (footerCloseBtn) footerCloseBtn.onclick = handleClose;
      if (customBtn) {
        customBtn.onclick = () => {
          const currentThemeId = modal.dataset.activeThemeId || "default";
          closeThemePreview();
          if (window.AdminThemeCustomizer && typeof window.AdminThemeCustomizer.open === "function") {
            window.AdminThemeCustomizer.open(currentThemeId);
          }
        };
      }

      modal.onclick = (e) => {
        if (e.target === modal) closeThemePreview();
      };
    }

    modal.dataset.activeThemeId = theme.id;

    const badgeEl = modal.querySelector("#theme-preview-modal-badge");
    const titleEl = modal.querySelector("#theme-preview-modal-title");
    const subEl = modal.querySelector("#theme-preview-modal-sub");
    const canvasEl = modal.querySelector("#theme-preview-canvas");
    const envEl = modal.querySelector("#theme-preview-envelope");
    const paperEl = modal.querySelector("#theme-preview-paper");
    const letterTitleEl = modal.querySelector("#theme-preview-letter-title");
    const letterBodyEl = modal.querySelector("#theme-preview-letter-body");
    const highlightPill = modal.querySelector("#theme-preview-highlight-pill");
    const signoffEl = modal.querySelector("#theme-preview-signoff");
    const metaStrip = modal.querySelector("#theme-preview-meta-strip");
    const footerActions = modal.querySelector("#theme-preview-footer-actions");

    const ornTl = modal.querySelector("#preview-ornament-tl");
    const ornTr = modal.querySelector("#preview-ornament-tr");
    const ornBl = modal.querySelector("#preview-ornament-bl");
    const ornBr = modal.querySelector("#preview-ornament-br");

    if (badgeEl) badgeEl.textContent = theme.badge || "✨ Classic";
    if (titleEl) titleEl.textContent = `${theme.displayName} (#${theme.id})`;
    if (subEl) subEl.textContent = theme.description;

    const cornerIcon = theme.visuals?.cornerOrnament || "🌸";
    const cornerFilter = theme.visuals?.cornerFilter || "";

    [ornTl, ornTr, ornBl, ornBr].forEach(el => {
      if (el) {
        el.textContent = cornerIcon;
        el.style.filter = cornerFilter;
      }
    });

    if (canvasEl) {
      canvasEl.style.background = theme.preview.gradient;
      canvasEl.style.border = `1px solid ${theme.palette.border}`;
      canvasEl.style.boxShadow = `0 12px 36px rgba(0,0,0,0.6)`;
    }

    if (envEl) {
      envEl.style.background = theme.palette.envelope;
      envEl.style.border = theme.visuals?.borderStyle || `1px solid ${theme.palette.border}`;
      envEl.style.boxShadow = theme.visuals?.envelopeShadow || `0 6px 24px rgba(0,0,0,0.4)`;
    }

    if (paperEl) {
      paperEl.style.background = theme.palette.paperBg;
      paperEl.style.color = theme.palette.text;
      paperEl.style.border = theme.visuals?.borderStyle || `1px solid ${theme.palette.border}`;
      paperEl.style.boxShadow = theme.visuals?.paperShadow || `0 4px 16px rgba(0,0,0,0.2)`;
    }

    if (letterTitleEl) {
      letterTitleEl.style.color = theme.visuals?.titleColor || theme.palette.accent;
      letterTitleEl.style.textShadow = theme.visuals?.titleShadow || "none";
    }
    if (letterBodyEl) {
      letterBodyEl.style.color = theme.palette.text;
    }
    if (highlightPill) {
      highlightPill.style.cssText = `
        display: inline-block;
        padding: 4px 14px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.82rem;
        ${theme.preview.highlightStyle}
      `;
    }
    if (signoffEl) {
      signoffEl.style.color = theme.palette.accent;
    }

    if (metaStrip) {
      metaStrip.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-size:0.76rem;color:var(--text-muted);font-weight:600;">Theme Class:</span>
            <code style="font-size:0.78rem;color:#fcd34d;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);padding:2px 7px;border-radius:6px;">.${theme.className}</code>
            <span style="font-size:0.76rem;color:var(--text-dim);margin-left:6px;">Ornaments:</span>
            <span style="font-size:0.78rem;color:#e2e8f0;">${escapeHtml(theme.visuals?.cornerDescription || "Classic")}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:0.74rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Palette:</span>
            <span class="theme-color-dot" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${theme.palette.accent};border:1px solid rgba(255,255,255,0.4);" title="Accent: ${theme.palette.accent}"></span>
            <span class="theme-color-dot" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${theme.palette.paperBg};border:1px solid rgba(255,255,255,0.4);" title="Paper: ${theme.palette.paperBg}"></span>
            <span class="theme-color-dot" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${theme.palette.envelope};border:1px solid rgba(255,255,255,0.4);" title="Envelope: ${theme.palette.envelope}"></span>
          </div>
        </div>
      `;
    }

    if (footerActions) {
      const isCurrentDefault = theme.id === activeDefaultThemeId;
      footerActions.innerHTML = `
        <button type="button" class="btn-secondary" id="btn-theme-preview-close">Close</button>
        ${isCurrentDefault
          ? `<button type="button" class="btn-sm btn-theme-active-default" disabled aria-disabled="true" title="Currently active default preset">✓ Active Default</button>`
          : `<button type="button" class="btn-primary btn-gold" id="btn-theme-preview-set-default">★ Set as Default</button>`
        }
      `;

      const footerClose = footerActions.querySelector("#btn-theme-preview-close");
      if (footerClose) footerClose.onclick = () => closeThemePreview();

      const setDefBtn = footerActions.querySelector("#btn-theme-preview-set-default");
      if (setDefBtn) {
        setDefBtn.onclick = () => {
          setDefaultTheme(theme.id);
          closeThemePreview();
        };
      }
    }

    modal.classList.add("open");
    modal.style.display = "flex";
  }

  function closeThemePreview() {
    const modal = document.getElementById("modal-theme-preview");
    if (modal) {
      modal.classList.remove("open");
      modal.style.display = "none";
    }
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  /* ============================================================
     4. EXPORT AUTHORITATIVE API
     ============================================================ */
  const AdminThemes = {
    ThemeRegistry,
    init,
    renderThemesUI,
    openThemePreview,
    closeThemePreview,
    setDefaultTheme,
    getActiveDefaultThemeId: () => activeDefaultThemeId,
    getAll: ThemeRegistry.getAll,
    getById: ThemeRegistry.getById,
    isValid: ThemeRegistry.isValid,
    getDefault: ThemeRegistry.getDefault,
    getDisplayName: ThemeRegistry.getDisplayName,
    getIcon: ThemeRegistry.getIcon,
    getOptionLabel: ThemeRegistry.getOptionLabel,
    resolveTheme: ThemeRegistry.resolveTheme
  };

  window.AdminThemes = AdminThemes;
  window.ThemeRegistry = ThemeRegistry;

})(typeof window !== "undefined" ? window : globalThis);
