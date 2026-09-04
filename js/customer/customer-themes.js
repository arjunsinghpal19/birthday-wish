/**
 * ============================================================================
 * CUSTOMER THEMES CONTROLLER (js/customer/customer-themes.js)
 * Architecture: Phase 32E Customer Platform Foundation
 *
 * Dedicated controller for the Customer Dashboard Themes section.
 * Renders available celebration themes, live visual swatches, and integrates
 * directly with the CustomerEntitlements access layer.
 *
 * CRITICAL ARCHITECTURAL INVARIANTS:
 * 1. Reuses project theme definitions and styles without mutating public wish styles.
 * 2. Interacts with CustomerEntitlements for available vs locked states.
 * 3. Wires "Apply to New Wish" to open CustomerWishEditor with pre-selected theme.
 * 4. File size strictly under 15 KB ceiling.
 * ============================================================================
 */

(function (root) {
  "use strict";

  const THEMES = [
    {
      id: "default",
      name: "Default Golden Luxe",
      badge: "✨ Classic",
      icon: "✨",
      desc: "Warm Gold & Light Parchment with sparkling accents and timeless romantic elegance.",
      palette: ["#1f1122", "#2a162b", "#fffef5", "#ffd700", "#ff9f43"],
      previewGradient: "linear-gradient(135deg, #1f1122 0%, #2a162b 50%, #150918 100%)",
      textColor: "#f3e8ff",
      accentColor: "#ffd700"
    },
    {
      id: "royalgold",
      name: "Vintage Royal Gold",
      badge: "👑 Regal",
      icon: "👑",
      desc: "Antique Gold Foil & Deep Dark Parchment with gilded borders and regal ballroom majesty.",
      palette: ["#18140c", "#2c2313", "#1c170d", "#f59e0b", "#fbbf24"],
      previewGradient: "linear-gradient(135deg, #18140c 0%, #2c2313 50%, #110d07 100%)",
      textColor: "#f5e6c8",
      accentColor: "#f59e0b"
    },
    {
      id: "galaxy",
      name: "Midnight Galaxy Glow",
      badge: "🌌 Cosmic",
      icon: "🌌",
      desc: "Deep Indigo & Starlit Nebula with luminescent cyan/violet stardust glows.",
      palette: ["#0b0c1e", "#141533", "#0d0f28", "#818cf8", "#38bdf8"],
      previewGradient: "linear-gradient(135deg, #0b0c1e 0%, #141533 50%, #080916 100%)",
      textColor: "#e0e7ff",
      accentColor: "#818cf8"
    },
    {
      id: "rosegold",
      name: "Rose Gold Pastel",
      badge: "🌸 Romantic",
      icon: "🌸",
      desc: "Blushing Rose Petals & Champagne Frost with delicate floral shimmer.",
      palette: ["#24141c", "#381f2c", "#201018", "#f472b6", "#fb7185"],
      previewGradient: "linear-gradient(135deg, #24141c 0%, #381f2c 50%, #1a0b13 100%)",
      textColor: "#fce7f3",
      accentColor: "#f472b6"
    },
    {
      id: "sapphire",
      name: "Sapphire Aurora",
      badge: "💎 Precious",
      icon: "💎",
      desc: "Midnight Ocean Deep & Electric Sapphire with crystalline northern lights ambiance.",
      palette: ["#081726", "#0f2742", "#071421", "#38bdf8", "#0284c7"],
      previewGradient: "linear-gradient(135deg, #081726 0%, #0f2742 50%, #040d17 100%)",
      textColor: "#e0f2fe",
      accentColor: "#38bdf8"
    },
    {
      id: "emerald-luxe",
      name: "Emerald Luxe",
      badge: "🌿 Botanical",
      icon: "🌿",
      desc: "Deep Forest Velvet & Gilded Malachite with rich, organic botanical luster.",
      palette: ["#061a14", "#0d2e23", "#051610", "#34d399", "#10b981"],
      previewGradient: "linear-gradient(135deg, #061a14 0%, #0d2e23 50%, #030f0b 100%)",
      textColor: "#d1fae5",
      accentColor: "#34d399"
    }
  ];

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Renders all themes into the customer themes grid.
   */
  function renderThemes() {
    const grid = el("customer-themes-grid");
    if (!grid) return;

    let profile = null;
    if (root.CustomerDashboard && typeof root.CustomerDashboard.getCurrentProfile === "function") {
      profile = root.CustomerDashboard.getCurrentProfile();
    }

    let html = "";
    THEMES.forEach((theme) => {
      let isAllowed = true;
      let reason = "";
      let reqPlan = "free";

      if (root.CustomerEntitlements && typeof root.CustomerEntitlements.canUseTheme === "function") {
        const check = root.CustomerEntitlements.canUseTheme(theme.id, profile);
        isAllowed = check.allowed;
        reason = check.reason || "";
        reqPlan = check.requiredPlan || "free";
      }

      const swatches = theme.palette.map(c => `<span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${c};border:1px solid rgba(255,255,255,0.2);"></span>`).join(" ");

      html += `
        <div class="customer-theme-card ${!isAllowed ? 'theme-locked' : ''}" style="background:rgba(22,12,36,0.7);border:1px solid var(--customer-border-glass);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:14px;position:relative;overflow:hidden;">
          <div style="height:110px;border-radius:12px;background:${theme.previewGradient};display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.1);position:relative;">
            <span style="font-size:2.4rem;">${theme.icon}</span>
            <span style="position:absolute;top:10px;right:10px;font-size:0.75rem;padding:3px 8px;border-radius:20px;background:rgba(0,0,0,0.5);color:${theme.accentColor};border:1px solid ${theme.accentColor}44;font-weight:600;">${theme.badge}</span>
          </div>

          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <h4 style="font-family:var(--customer-font-heading);font-size:1.1rem;color:#fff;margin:0;">${escapeHtml(theme.name)}</h4>
              ${!isAllowed ? `<span style="font-size:0.75rem;padding:2px 8px;border-radius:10px;background:rgba(255,71,87,0.15);color:#ff4757;font-weight:600;">🔒 ${reqPlan.toUpperCase()}</span>` : ''}
            </div>
            <p style="font-size:0.82rem;color:var(--customer-text-muted);line-height:1.45;margin-bottom:12px;">${escapeHtml(theme.desc)}</p>
            <div style="display:flex;gap:6px;align-items:center;">
              <span style="font-size:0.75rem;color:var(--customer-text-dim);">Palette:</span>
              ${swatches}
            </div>
          </div>

          <div style="border-top:1px solid var(--customer-border-glass);padding-top:12px;">
            ${isAllowed ? `
              <button type="button" class="btn-quick-action primary" data-action="use-theme" data-theme="${theme.id}" style="width:100%;justify-content:center;padding:9px 14px;font-size:0.85rem;">
                ✨ Use in New Celebration
              </button>
            ` : `
              <button type="button" class="btn-quick-action secondary" disabled style="width:100%;justify-content:center;padding:9px 14px;font-size:0.85rem;opacity:0.6;cursor:not-allowed;">
                🔒 Requires ${reqPlan.toUpperCase()} Tier
              </button>
            `}
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;

    // Attach actions
    grid.querySelectorAll("[data-action='use-theme']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const themeId = btn.getAttribute("data-theme");
        if (root.CustomerWishEditor && typeof root.CustomerWishEditor.openNew === "function") {
          root.CustomerWishEditor.openNew({ theme: themeId });
        }
      });
    });
  }

  function init() {
    renderThemes();
  }

  root.CustomerThemes = Object.freeze({
    init,
    renderThemes,
    THEMES
  });

})(typeof window !== "undefined" ? window : globalThis);
