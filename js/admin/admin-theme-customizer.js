/**
 * ============================================================================
 * ADMIN THEME CUSTOMIZER CONTROLLER (js/admin/admin-theme-customizer.js)
 * Phase 31F-5: Controlled Theme Customization & Safe Palette Extensions.
 * Dedicated module for controlled visual fine-tuning of the 6 canonical themes.
 * ============================================================================
 */

(function (window) {
  "use strict";

  /* ============================================================
     1. STORAGE KEY & DEFAULT CONFIGURATION
     ============================================================ */
  const CUSTOMIZATION_STORAGE_KEY = "bw_admin_theme_customization";

  const DEFAULT_CUSTOMIZATION = Object.freeze({
    glowIntensity: "balanced", // subtle (0.6), balanced (1.0), vibrant (1.4)
    ornamentMode: "quad",      // quad (4), header-only (2), minimal (1), hidden (0)
    parchmentTone: "default",  // default, soft, deep
    borderWeight: "standard"   // delicate (1px), standard (2px), ornate (3px double)
  });

  const GLOW_MULTIPLIERS = Object.freeze({
    subtle: 0.6,
    balanced: 1.0,
    vibrant: 1.4
  });

  /* ============================================================
     2. CURATED PER-THEME PARCHMENT PALETTES
     ============================================================ */
  const CURATED_PARCHMENT_TONES = Object.freeze({
    default: {
      default: { name: "Ivory Warm", gradient: "linear-gradient(180deg, #fffaf3 0%, #fff3e6 100%)", previewBg: "#fff8ee" },
      soft:    { name: "Pearl Light", gradient: "linear-gradient(180deg, #fffdf8 0%, #fff5ea 100%)", previewBg: "#fffcf5" },
      deep:    { name: "Antique Gold", gradient: "linear-gradient(180deg, #f7ebd9 0%, #ecd7b9 100%)", previewBg: "#f0dfc7" }
    },
    royalgold: {
      default: { name: "Bronze Dark", gradient: "linear-gradient(135deg, #1c170d 0%, #261e10 100%)", previewBg: "#211a0f" },
      soft:    { name: "Amber Velvet", gradient: "linear-gradient(135deg, #2a2215 0%, #352a1a 100%)", previewBg: "#2e2517" },
      deep:    { name: "Regal Charcoal", gradient: "linear-gradient(135deg, #120e08 0%, #19130a 100%)", previewBg: "#151009" }
    },
    galaxy: {
      default: { name: "Nebula Dark", gradient: "linear-gradient(135deg, #090317 0%, #15062d 50%, #220030 100%)", previewBg: "#15062d" },
      soft:    { name: "Cosmic Violet", gradient: "linear-gradient(135deg, #14092b 0%, #200d40 50%, #300642 100%)", previewBg: "#200d40" },
      deep:    { name: "Deep Space", gradient: "linear-gradient(135deg, #05020d 0%, #0c031c 50%, #14001d 100%)", previewBg: "#0c031c" }
    },
    rosegold: {
      default: { name: "Romantic Wine", gradient: "linear-gradient(135deg, #24131b 0%, #3d1b2a 100%)", previewBg: "#311723" },
      soft:    { name: "Blush Berry", gradient: "linear-gradient(135deg, #321c27 0%, #4c2537 100%)", previewBg: "#3f202f" },
      deep:    { name: "Velvet Plum", gradient: "linear-gradient(135deg, #170b11 0%, #29101b 100%)", previewBg: "#200e16" }
    },
    sapphire: {
      default: { name: "Polar Midnight", gradient: "linear-gradient(135deg, #071326 0%, #0e274a 50%, #153966 100%)", previewBg: "#0e274a" },
      soft:    { name: "Aurora Cyan", gradient: "linear-gradient(135deg, #0c203d 0%, #153561 50%, #1e4a7f 100%)", previewBg: "#153561" },
      deep:    { name: "Abyss Blue", gradient: "linear-gradient(135deg, #040a14 0%, #071529 50%, #0c213d 100%)", previewBg: "#071529" }
    },
    "emerald-luxe": {
      default: { name: "Ivory Luxe", gradient: "linear-gradient(135deg, #fffbf0 0%, #fef7e6 100%)", previewBg: "#fef9ec" },
      soft:    { name: "Mint Mist", gradient: "linear-gradient(135deg, #f3faef 0%, #e5f5df 100%)", previewBg: "#ecf7e7" },
      deep:    { name: "Botanical Sage", gradient: "linear-gradient(135deg, #e6eee2 0%, #d4e3ce 100%)", previewBg: "#dce8d8" }
    }
  });

  /* ============================================================
     3. INTERNAL WORKSPACE STATE
     ============================================================ */
  const customizerState = {
    isOpen: false,
    activeThemeId: "default",
    current: { ...DEFAULT_CUSTOMIZATION },
    initial: { ...DEFAULT_CUSTOMIZATION },
    onApplyCallback: null
  };

  /* ============================================================
     4. VALIDATION & CLAMPING HELPERS
     ============================================================ */
  function clampGlowMultiplier(val) {
    const num = typeof val === "number" ? val : (GLOW_MULTIPLIERS[val] || 1.0);
    if (isNaN(num)) return 1.0;
    return Math.max(0.5, Math.min(1.5, num));
  }

  function isValidOrnamentMode(mode) {
    return ["quad", "header-only", "minimal", "hidden"].includes(String(mode).toLowerCase());
  }

  function isValidParchmentTone(tone) {
    return ["default", "soft", "deep"].includes(String(tone).toLowerCase());
  }

  function isValidBorderWeight(weight) {
    return ["delicate", "standard", "ornate"].includes(String(weight).toLowerCase());
  }

  function getCuratedTone(themeId, toneKey) {
    const cleanId = String(themeId || "default").trim().toLowerCase();
    const cleanTone = String(toneKey || "default").trim().toLowerCase();
    const tones = CURATED_PARCHMENT_TONES[cleanId] || CURATED_PARCHMENT_TONES.default;
    return tones[cleanTone] || tones.default;
  }

  /* ============================================================
     5. STORAGE PERSISTENCE HELPERS
     ============================================================ */
  function getStoredCustomizationMap() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(CUSTOMIZATION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") return parsed;
        }
      }
    } catch (e) {
      console.warn("⚠️ AdminThemeCustomizer: Failed to read from localStorage:", e);
    }
    return {};
  }

  function getStoredThemeCustomization(themeId) {
    const cleanId = String(themeId || "default").trim().toLowerCase();
    const map = getStoredCustomizationMap();
    if (map && map[cleanId]) {
      return {
        glowIntensity: GLOW_MULTIPLIERS[map[cleanId].glowIntensity] ? map[cleanId].glowIntensity : DEFAULT_CUSTOMIZATION.glowIntensity,
        ornamentMode: isValidOrnamentMode(map[cleanId].ornamentMode) ? map[cleanId].ornamentMode : DEFAULT_CUSTOMIZATION.ornamentMode,
        parchmentTone: isValidParchmentTone(map[cleanId].parchmentTone) ? map[cleanId].parchmentTone : DEFAULT_CUSTOMIZATION.parchmentTone,
        borderWeight: isValidBorderWeight(map[cleanId].borderWeight) ? map[cleanId].borderWeight : DEFAULT_CUSTOMIZATION.borderWeight
      };
    }
    return { ...DEFAULT_CUSTOMIZATION };
  }

  function saveStoredThemeCustomization(themeId, customData) {
    const cleanId = String(themeId || "default").trim().toLowerCase();
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const map = getStoredCustomizationMap();
        map[cleanId] = {
          glowIntensity: customData.glowIntensity || DEFAULT_CUSTOMIZATION.glowIntensity,
          ornamentMode: customData.ornamentMode || DEFAULT_CUSTOMIZATION.ornamentMode,
          parchmentTone: customData.parchmentTone || DEFAULT_CUSTOMIZATION.parchmentTone,
          borderWeight: customData.borderWeight || DEFAULT_CUSTOMIZATION.borderWeight,
          updatedAt: new Date().toISOString()
        };
        window.localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify(map));
      }
    } catch (e) {
      console.warn("⚠️ AdminThemeCustomizer: Failed to save to localStorage:", e);
    }
  }

  /* ============================================================
     6. DIALOG RENDERING & BINDING
     ============================================================ */
  function ensureCustomizerModalInDOM() {
    let modal = document.getElementById("modal-theme-customizer");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "modal-theme-customizer";
    modal.className = "theme-customizer-backdrop";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="theme-customizer-dialog" role="dialog" aria-labelledby="customizer-modal-title">
        <div class="theme-customizer-header">
          <div class="theme-customizer-header-left">
            <div id="customizer-theme-badge" class="theme-customizer-badge-pill">✨ Theme Customizer</div>
            <div>
              <h3 id="customizer-modal-title" class="theme-customizer-title">Controlled Theme Customization</h3>
              <p id="customizer-modal-sub" class="theme-customizer-subtitle">Fine-tune safe visual variations while preserving theme identity</p>
            </div>
          </div>
          <button type="button" class="btn-modal-close" id="btn-close-theme-customizer" aria-label="Close Customizer" title="Close Customizer">✕</button>
        </div>

        <div class="theme-customizer-body">
          <!-- Left Controls Column -->
          <div class="theme-customizer-controls">
            
            <!-- Control 1: Glow & Ambient Intensity -->
            <div class="customizer-control-group">
              <div class="customizer-group-header">
                <label class="customizer-group-label">✨ Glow & Ambient Intensity</label>
                <span class="customizer-group-badge" id="customizer-val-glow">1.0x</span>
              </div>
              <p class="customizer-group-desc">Controls title neon aura and parchment luminous glow.</p>
              <div class="customizer-seg-group" id="customizer-glow-group">
                <button type="button" class="customizer-seg-btn" data-glow="subtle">Subtle (0.6x)</button>
                <button type="button" class="customizer-seg-btn active" data-glow="balanced">Balanced (1.0x)</button>
                <button type="button" class="customizer-seg-btn" data-glow="vibrant">Vibrant (1.4x)</button>
              </div>
            </div>

            <!-- Control 2: Corner Ornament Arrangement -->
            <div class="customizer-control-group">
              <div class="customizer-group-header">
                <label class="customizer-group-label">🌸 Corner Ornaments</label>
                <span class="customizer-group-badge" id="customizer-val-ornament">Quad (4)</span>
              </div>
              <p class="customizer-group-desc">Select corner decorative icon distribution on the letter paper.</p>
              <div class="customizer-seg-group" id="customizer-ornament-group">
                <button type="button" class="customizer-seg-btn active" data-ornament="quad">Quad (4)</button>
                <button type="button" class="customizer-seg-btn" data-ornament="header-only">Top 2</button>
                <button type="button" class="customizer-seg-btn" data-ornament="minimal">Minimal</button>
                <button type="button" class="customizer-seg-btn" data-ornament="hidden">Hidden</button>
              </div>
            </div>

            <!-- Control 3: Parchment Tone / Texture -->
            <div class="customizer-control-group">
              <div class="customizer-group-header">
                <label class="customizer-group-label">📜 Curated Parchment Tone</label>
                <span class="customizer-group-badge" id="customizer-val-parchment">Default Tone</span>
              </div>
              <p class="customizer-group-desc">Select from safe, curated tone variations of this theme's palette.</p>
              <div class="customizer-swatch-group" id="customizer-parchment-group">
                <div class="customizer-swatch-card active" data-tone="default">
                  <div class="customizer-swatch-preview" id="swatch-tone-default"></div>
                  <span class="customizer-swatch-name" id="swatch-label-default">Default</span>
                </div>
                <div class="customizer-swatch-card" data-tone="soft">
                  <div class="customizer-swatch-preview" id="swatch-tone-soft"></div>
                  <span class="customizer-swatch-name" id="swatch-label-soft">Soft Tint</span>
                </div>
                <div class="customizer-swatch-card" data-tone="deep">
                  <div class="customizer-swatch-preview" id="swatch-tone-deep"></div>
                  <span class="customizer-swatch-name" id="swatch-label-deep">Deep Tint</span>
                </div>
              </div>
            </div>

            <!-- Control 4: Letter Border Weight -->
            <div class="customizer-control-group">
              <div class="customizer-group-header">
                <label class="customizer-group-label">🖼️ Letter Border Treatment</label>
                <span class="customizer-group-badge" id="customizer-val-border">Standard</span>
              </div>
              <p class="customizer-group-desc">Select letter edge border thickness and gilded outline style.</p>
              <div class="customizer-seg-group" id="customizer-border-group">
                <button type="button" class="customizer-seg-btn" data-border="delicate">Delicate (1px)</button>
                <button type="button" class="customizer-seg-btn active" data-border="standard">Standard (2px)</button>
                <button type="button" class="customizer-seg-btn" data-border="ornate">Ornate (Double)</button>
              </div>
            </div>

          </div>

          <!-- Right Live Preview Column -->
          <div class="theme-customizer-preview-pane">
            <div class="customizer-canvas-card">
              <div id="customizer-live-paper" class="customizer-live-paper">
                <span class="customizer-corner-ornament customizer-corner-tl" id="cz-ornament-tl">🌸</span>
                <span class="customizer-corner-ornament customizer-corner-tr" id="cz-ornament-tr">🌸</span>
                <span class="customizer-corner-ornament customizer-corner-bl" id="cz-ornament-bl">🌸</span>
                <span class="customizer-corner-ornament customizer-corner-br" id="cz-ornament-br">🌸</span>
                
                <h4 id="customizer-live-title" class="customizer-live-title">Dearest Friend,</h4>
                
                <div id="customizer-live-body" class="customizer-live-body">
                  May your birthday sparkle with boundless joy, laughter, and unforgettable moments.<br>
                  Here is to another year of wondrous adventures and cherished dreams!
                </div>

                <div id="customizer-live-highlight" class="customizer-live-highlight">
                  ✨ "A truly magical celebration of happiness"
                </div>

                <div id="customizer-live-signoff" class="customizer-live-signoff">
                  With Love & Warm Wishes ❤️
                </div>
              </div>
            </div>

            <div class="customizer-preview-info-strip">
              <span>🔒 100% In-Memory Live Preview &bull; 0 Database Writes</span>
              <span id="customizer-theme-identity-subtext">Theme: Default Golden Luxe</span>
            </div>
          </div>

        </div>

        <div class="theme-customizer-footer">
          <div class="theme-customizer-footer-left">
            <button type="button" class="btn-customizer-reset" id="btn-customizer-reset" title="Reset this theme to default customization values">↺ Reset to Theme Defaults</button>
          </div>
          <div class="theme-customizer-footer-right">
            <button type="button" class="btn-secondary" id="btn-customizer-cancel">Cancel</button>
            <button type="button" class="btn-primary btn-gold" id="btn-customizer-save">Apply & Save Preset</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Bind Close & Cancel
    const closeBtn = modal.querySelector("#btn-close-theme-customizer");
    const cancelBtn = modal.querySelector("#btn-customizer-cancel");
    const resetBtn = modal.querySelector("#btn-customizer-reset");
    const saveBtn = modal.querySelector("#btn-customizer-save");

    if (closeBtn) closeBtn.onclick = () => close();
    if (cancelBtn) cancelBtn.onclick = () => close();
    if (resetBtn) resetBtn.onclick = () => reset();
    if (saveBtn) saveBtn.onclick = () => apply();

    modal.onclick = (e) => {
      if (e.target === modal) close();
    };

    // Bind Glow Buttons
    modal.querySelectorAll("#customizer-glow-group button").forEach(btn => {
      btn.onclick = () => {
        setGlowIntensity(btn.dataset.glow);
      };
    });

    // Bind Ornament Buttons
    modal.querySelectorAll("#customizer-ornament-group button").forEach(btn => {
      btn.onclick = () => {
        setOrnamentMode(btn.dataset.ornament);
      };
    });

    // Bind Parchment Tone Swatches
    modal.querySelectorAll("#customizer-parchment-group .customizer-swatch-card").forEach(card => {
      card.onclick = () => {
        setParchmentTone(card.dataset.tone);
      };
    });

    // Bind Border Weight Buttons
    modal.querySelectorAll("#customizer-border-group button").forEach(btn => {
      btn.onclick = () => {
        setBorderWeight(btn.dataset.border);
      };
    });

    return modal;
  }

  /* ============================================================
     7. LIVE PREVIEW UPDATE LOGIC
     ============================================================ */
  function updateLivePreview() {
    const modal = document.getElementById("modal-theme-customizer");
    if (!modal) return;

    const themeId = customizerState.activeThemeId || "default";
    const registry = window.ThemeRegistry || (window.AdminThemes && window.AdminThemes.ThemeRegistry);
    const theme = (registry && typeof registry.getById === "function")
      ? registry.getById(themeId)
      : null;

    if (!theme) return;

    const current = customizerState.current;
    const toneInfo = getCuratedTone(themeId, current.parchmentTone);
    const glowMult = clampGlowMultiplier(current.glowIntensity);

    // Update Control Value Badges
    const valGlow = modal.querySelector("#customizer-val-glow");
    if (valGlow) valGlow.textContent = `${glowMult}x`;

    const valOrnament = modal.querySelector("#customizer-val-ornament");
    if (valOrnament) {
      const names = { quad: "Quad (4)", "header-only": "Top 2", minimal: "Minimal (1)", hidden: "Hidden (0)" };
      valOrnament.textContent = names[current.ornamentMode] || current.ornamentMode;
    }

    const valParchment = modal.querySelector("#customizer-val-parchment");
    if (valParchment) valParchment.textContent = toneInfo.name;

    const valBorder = modal.querySelector("#customizer-val-border");
    if (valBorder) {
      const bNames = { delicate: "Delicate (1px)", standard: "Standard (2px)", ornate: "Ornate (Double)" };
      valBorder.textContent = bNames[current.borderWeight] || current.borderWeight;
    }

    // Update Segmented Button Active Classes
    modal.querySelectorAll("#customizer-glow-group button").forEach(b => {
      b.classList.toggle("active", b.dataset.glow === current.glowIntensity);
    });

    modal.querySelectorAll("#customizer-ornament-group button").forEach(b => {
      b.classList.toggle("active", b.dataset.ornament === current.ornamentMode);
    });

    modal.querySelectorAll("#customizer-parchment-group .customizer-swatch-card").forEach(c => {
      c.classList.toggle("active", c.dataset.tone === current.parchmentTone);
    });

    modal.querySelectorAll("#customizer-border-group button").forEach(b => {
      b.classList.toggle("active", b.dataset.border === current.borderWeight);
    });

    // Update Swatch Cards Previews & Labels for Current Theme
    const tones = CURATED_PARCHMENT_TONES[themeId] || CURATED_PARCHMENT_TONES.default;
    ["default", "soft", "deep"].forEach(tKey => {
      const sw = tones[tKey];
      const previewEl = modal.querySelector(`#swatch-tone-${tKey}`);
      const labelEl = modal.querySelector(`#swatch-label-${tKey}`);
      if (previewEl && sw) previewEl.style.background = sw.previewBg || sw.gradient;
      if (labelEl && sw) labelEl.textContent = sw.name;
    });

    // Update Header Pill & Identity Subtext
    const badgeEl = modal.querySelector("#customizer-theme-badge");
    const subtextEl = modal.querySelector("#customizer-theme-identity-subtext");
    if (badgeEl) badgeEl.textContent = `${theme.icon || "✨"} ${theme.displayName}`;
    if (subtextEl) subtextEl.textContent = `Theme: ${theme.displayName} (#${theme.id})`;

    // Target Live Paper Elements
    const paperEl = modal.querySelector("#customizer-live-paper");
    const titleEl = modal.querySelector("#customizer-live-title");
    const bodyEl = modal.querySelector("#customizer-live-body");
    const highlightEl = modal.querySelector("#customizer-live-highlight");
    const signoffEl = modal.querySelector("#customizer-live-signoff");

    if (paperEl) {
      paperEl.style.background = toneInfo.gradient;
      paperEl.style.color = theme.visuals.textColor || theme.palette.text;

      // Border Weight Treatment
      const accentColor = theme.palette.accent || "#ffd700";
      if (current.borderWeight === "delicate") {
        paperEl.style.border = `1px solid ${accentColor}`;
      } else if (current.borderWeight === "ornate") {
        paperEl.style.border = `3px double ${accentColor}`;
      } else {
        paperEl.style.border = theme.visuals.borderStyle || `2px solid ${accentColor}`;
      }

      // Box Shadow with Glow Multiplier
      paperEl.style.boxShadow = `0 25px 50px rgba(0, 0, 0, 0.4), 0 0 ${Math.round(30 * glowMult)}px ${accentColor}66`;
    }

    if (titleEl) {
      titleEl.style.color = theme.visuals.titleColor || theme.palette.accent;
      titleEl.style.textShadow = `0 0 ${Math.round(16 * glowMult)}px ${theme.visuals.titleColor || theme.palette.accent}cc`;
    }

    if (bodyEl) {
      bodyEl.style.color = theme.visuals.textColor || theme.palette.text;
    }

    if (highlightEl) {
      highlightEl.style.background = theme.palette.highlight ? `${theme.palette.highlight}26` : "rgba(255,215,0,0.15)";
      highlightEl.style.color = theme.palette.highlight || theme.palette.accent;
      highlightEl.style.border = `1px solid ${theme.palette.highlight || theme.palette.accent}40`;
    }

    if (signoffEl) {
      signoffEl.style.color = theme.visuals.textColor || theme.palette.text;
    }

    // Corner Ornaments
    const cornerIcon = theme.visuals.cornerOrnament || theme.icon || "✨";
    const cornerFilter = theme.visuals.cornerFilter || "none";

    const ornaments = {
      tl: modal.querySelector("#cz-ornament-tl"),
      tr: modal.querySelector("#cz-ornament-tr"),
      bl: modal.querySelector("#cz-ornament-bl"),
      br: modal.querySelector("#cz-ornament-br")
    };

    Object.values(ornaments).forEach(el => {
      if (el) {
        el.textContent = cornerIcon;
        el.style.filter = cornerFilter;
      }
    });

    if (current.ornamentMode === "hidden") {
      ornaments.tl?.classList.add("is-hidden");
      ornaments.tr?.classList.add("is-hidden");
      ornaments.bl?.classList.add("is-hidden");
      ornaments.br?.classList.add("is-hidden");
    } else if (current.ornamentMode === "minimal") {
      ornaments.tl?.classList.remove("is-hidden");
      ornaments.tr?.classList.add("is-hidden");
      ornaments.bl?.classList.add("is-hidden");
      ornaments.br?.classList.add("is-hidden");
    } else if (current.ornamentMode === "header-only") {
      ornaments.tl?.classList.remove("is-hidden");
      ornaments.tr?.classList.remove("is-hidden");
      ornaments.bl?.classList.add("is-hidden");
      ornaments.br?.classList.add("is-hidden");
    } else {
      // Quad
      ornaments.tl?.classList.remove("is-hidden");
      ornaments.tr?.classList.remove("is-hidden");
      ornaments.bl?.classList.remove("is-hidden");
      ornaments.br?.classList.remove("is-hidden");
    }
  }

  /* ============================================================
     8. PUBLIC API & CONTROLLER METHODS
     ============================================================ */
  function setGlowIntensity(intensityKey) {
    if (!GLOW_MULTIPLIERS[intensityKey]) return;
    customizerState.current.glowIntensity = intensityKey;
    updateLivePreview();
  }

  function setOrnamentMode(modeKey) {
    if (!isValidOrnamentMode(modeKey)) return;
    customizerState.current.ornamentMode = modeKey;
    updateLivePreview();
  }

  function setParchmentTone(toneKey) {
    if (!isValidParchmentTone(toneKey)) return;
    customizerState.current.parchmentTone = toneKey;
    updateLivePreview();
  }

  function setBorderWeight(weightKey) {
    if (!isValidBorderWeight(weightKey)) return;
    customizerState.current.borderWeight = weightKey;
    updateLivePreview();
  }

  function open(themeId = "default", options = {}) {
    const registry = window.ThemeRegistry || (window.AdminThemes && window.AdminThemes.ThemeRegistry);
    let resolvedId = "default";

    if (registry && typeof registry.resolveTheme === "function") {
      resolvedId = registry.resolveTheme(themeId);
    } else if (registry && typeof registry.isValid === "function" && registry.isValid(themeId)) {
      resolvedId = String(themeId).trim().toLowerCase();
    }

    customizerState.activeThemeId = resolvedId;
    customizerState.onApplyCallback = typeof options.onApply === "function" ? options.onApply : null;

    // Load stored customization or fallback to defaults
    const stored = getStoredThemeCustomization(resolvedId);
    customizerState.current = { ...stored };
    customizerState.initial = { ...stored };
    customizerState.isOpen = true;

    const modal = ensureCustomizerModalInDOM();
    modal.style.display = "flex";

    updateLivePreview();
  }

  function close() {
    customizerState.isOpen = false;
    customizerState.current = { ...customizerState.initial };
    const modal = document.getElementById("modal-theme-customizer");
    if (modal) modal.style.display = "none";
  }

  function reset() {
    customizerState.current = { ...DEFAULT_CUSTOMIZATION };
    updateLivePreview();
    if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
      window.AdminCore.showToast("Customization reset to theme defaults ↺");
    }
  }

  function apply() {
    const themeId = customizerState.activeThemeId || "default";
    const customCopy = { ...customizerState.current };

    // 1. Save to localStorage for Admin preset preferences
    saveStoredThemeCustomization(themeId, customCopy);
    customizerState.initial = { ...customCopy };

    // 2. Invoke callback if opened from Wish Studio
    if (typeof customizerState.onApplyCallback === "function") {
      try {
        customizerState.onApplyCallback(themeId, customCopy);
      } catch (e) {
        console.warn("⚠️ AdminThemeCustomizer onApply callback error:", e);
      }
    }

    // 3. Log event and show toast
    if (window.AdminLogs && typeof window.AdminLogs.logEvent === "function") {
      window.AdminLogs.logEvent("THEME_CUSTOMIZATION_SAVED", `Theme #${themeId} customized (Glow: ${customCopy.glowIntensity}, Ornaments: ${customCopy.ornamentMode}, Tone: ${customCopy.parchmentTone}, Border: ${customCopy.borderWeight})`);
    }

    if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
      window.AdminCore.showToast(`Theme customization saved for #${themeId} 🎨`);
    }

    close();
  }

  function getState() {
    return {
      isOpen: customizerState.isOpen,
      activeThemeId: customizerState.activeThemeId,
      current: { ...customizerState.current },
      initial: { ...customizerState.initial }
    };
  }

  /* ============================================================
     9. EXPORT AUTHORITATIVE OBJECT
     ============================================================ */
  window.AdminThemeCustomizer = Object.freeze({
    open,
    close,
    reset,
    apply,
    getState,
    setGlowIntensity,
    setOrnamentMode,
    setParchmentTone,
    setBorderWeight,
    clampGlow: clampGlowMultiplier,
    isValidOrnamentMode,
    isValidParchmentTone,
    isValidBorderWeight,
    getCuratedTone,
    getStoredThemeCustomization,
    saveStoredThemeCustomization,
    DEFAULT_CUSTOMIZATION,
    CURATED_PARCHMENT_TONES,
    GLOW_MULTIPLIERS
  });

})(window);
