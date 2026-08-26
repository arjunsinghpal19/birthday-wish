/**
 * ============================================================================
 * ADMIN STUDIO DASHBOARD ANALYTICS MODULE (js/admin/admin-dashboard-analytics.js)
 * High-performance analytics, real-data snapshot generation, chronological
 * trend chart visualization, content mix distribution, and actionable insights.
 * ============================================================================
 */

(function (window) {
  "use strict";

  const { formatBytes, showToast } = window.AdminCore || {};

  const SELECTORS = {
    trendContainer: "dash-trend-chart-container",
    contentMixContainer: "dash-content-mix-container",
    insightsContainer: "dash-operational-insights",
    periodBtns: ".btn-dash-period",
    copySummaryBtn: "btn-dash-copy-summary",
    exportReportBtn: "btn-dash-export-report",
    exportPopover: "dash-export-popover",
    exportJsonBtn: "btn-dash-export-json",
    exportCsvBtn: "btn-dash-export-csv"
  };

  let activePeriodDays = 7;
  let cachedSnapshot = null;

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ============================================================
     DATA SNAPSHOT GENERATION (SINGLE SOURCE OF TRUTH)
     ============================================================ */
  function createDashboardSnapshot(wishes = [], storageFiles = []) {
    const safeWishes = Array.isArray(wishes) ? wishes : [];
    const safeFiles = Array.isArray(storageFiles) ? storageFiles : [];
    const totalWishes = safeWishes.length;

    // 1. Content Mix Calculation (Phase 31K: Canonical schema fields & validation)
    let photosCount = 0;
    let videosCount = 0;
    let audioCount = 0;
    let letterCount = 0;
    let passcodeCount = 0;

    function hasGalleryContent(w) {
      if (!w) return false;
      let val = w.gallery_json !== undefined ? w.gallery_json : (w.gallery || w.photos || w.media_photos || w.photo);
      if (val === null || val === undefined) return false;
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (!trimmed || trimmed === "[]" || trimmed === "{}" || trimmed === "null") return false;
        try { val = JSON.parse(trimmed); } catch (e) { return trimmed.length > 0; }
      }
      if (Array.isArray(val)) {
        return val.some(item => {
          if (!item) return false;
          if (typeof item === "string") return item.trim().length > 0;
          if (typeof item === "object") {
            return (item.src && String(item.src).trim().length > 0) ||
                   (item.url && String(item.url).trim().length > 0) ||
                   (item.file && String(item.file).trim().length > 0) ||
                   Object.keys(item).length > 0;
          }
          return true;
        });
      }
      if (typeof val === "object") return Object.keys(val).length > 0;
      return false;
    }

    function hasVideoContent(w) {
      if (!w) return false;
      const url = w.video_url !== undefined ? w.video_url : (w.videoWish?.url || w.videoWish?.file || w.video || w.youtube_url);
      if (url === null || url === undefined) return false;
      return typeof url === "string" && url.trim().length > 0;
    }

    function hasAudioContent(w) {
      if (!w) return false;
      const url = w.music_url !== undefined ? w.music_url : (w.music?.file || w.audio_url || w.music);
      if (url === null || url === undefined) return false;
      return typeof url === "string" && url.trim().length > 0;
    }

    function hasLetterContent(w) {
      if (!w) return false;
      let val = w.letter_lines !== undefined ? w.letter_lines : (w.letterLines || w.letter_body || w.message || w.custom_message);
      if (val === null || val === undefined) return false;
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (!trimmed || trimmed === "[]" || trimmed === "{}" || trimmed === "null") return false;
        try { val = JSON.parse(trimmed); } catch (e) { return trimmed.length > 0; }
      }
      if (Array.isArray(val)) {
        return val.some(line => {
          if (typeof line === "string") return line.trim().length > 0;
          if (typeof line === "object" && line !== null) return Object.keys(line).length > 0;
          return false;
        });
      }
      return false;
    }

    function hasPasscodeContent(w) {
      if (!w) return false;
      let code = w.pass_code !== undefined ? w.pass_code : (w.passcode?.code !== undefined ? w.passcode.code : w.passcode);
      if (code === null || code === undefined) return false;
      if (typeof code === "number") code = String(code);
      return typeof code === "string" && code.trim().length > 0;
    }

    safeWishes.forEach(w => {
      if (!w) return;
      if (hasGalleryContent(w)) photosCount++;
      if (hasVideoContent(w)) videosCount++;
      if (hasAudioContent(w)) audioCount++;
      if (hasLetterContent(w)) letterCount++;
      if (hasPasscodeContent(w)) passcodeCount++;
    });

    const contentMix = {
      totalWishes,
      photos: { count: photosCount, pct: totalWishes > 0 ? Math.round((photosCount / totalWishes) * 100) : 0 },
      videos: { count: videosCount, pct: totalWishes > 0 ? Math.round((videosCount / totalWishes) * 100) : 0 },
      audio: { count: audioCount, pct: totalWishes > 0 ? Math.round((audioCount / totalWishes) * 100) : 0 },
      letters: { count: letterCount, pct: totalWishes > 0 ? Math.round((letterCount / totalWishes) * 100) : 0 },
      passcode: { count: passcodeCount, pct: totalWishes > 0 ? Math.round((passcodeCount / totalWishes) * 100) : 0 }
    };

    // 2. Storage & Unused Media Calculation
    let totalStorageBytes = 0;
    let photosStorageBytes = 0;
    let videosStorageBytes = 0;
    let audioStorageBytes = 0;
    let photosFilesCount = 0;
    let videosFilesCount = 0;
    let audioFilesCount = 0;
    let usedFilesCount = 0;
    let unusedFilesCount = 0;
    let unusedStorageBytes = 0;

    const refEngine = (typeof MediaReferenceEngine !== "undefined" && MediaReferenceEngine) ||
                      (window.MediaReferenceEngine || (window.AdminMedia && window.AdminMedia.ReferenceEngine));
    const refMap = (refEngine && typeof refEngine.buildReferenceMap === "function" && safeWishes.length > 0)
      ? refEngine.buildReferenceMap(safeWishes)
      : null;

    safeFiles.forEach(f => {
      const size = f.size || 0;
      totalStorageBytes += size;

      if (f.folder === "photos") {
        photosFilesCount++;
        photosStorageBytes += size;
      } else if (f.folder === "videos") {
        videosFilesCount++;
        videosStorageBytes += size;
      } else if (f.folder === "audio") {
        audioFilesCount++;
        audioStorageBytes += size;
      }

      let isReferenced = !!f.isUsed;
      if (refMap) {
        const refs = refMap.getReferences(f.path || f.canonicalPath);
        if (refs && refs.length > 0) isReferenced = true;
      } else if (Array.isArray(f.references) && f.references.length > 0) {
        isReferenced = true;
      }

      if (isReferenced) {
        usedFilesCount++;
      } else {
        unusedFilesCount++;
        unusedStorageBytes += size;
      }
    });

    const totalCapacityBytes = 1024 * 1024 * 1024; // Standard Supabase 1 GB allocation
    const usedBytes = totalStorageBytes;
    const remainingBytes = Math.max(0, totalCapacityBytes - usedBytes);
    const usagePct = totalCapacityBytes > 0 ? Math.round((usedBytes / totalCapacityBytes) * 1000) / 10 : 0;
    const remainingPct = Math.max(0, Math.round((100 - usagePct) * 10) / 10);

    const storageDistribution = {
      totalCapacityBytes,
      usedBytes,
      remainingBytes,
      usagePct,
      remainingPct,
      totalFiles: safeFiles.length,
      usedCount: usedFilesCount,
      unused: { count: unusedFilesCount, bytes: unusedStorageBytes },
      photos: { count: photosFilesCount, bytes: photosStorageBytes },
      videos: { count: videosFilesCount, bytes: videosStorageBytes },
      audio: { count: audioFilesCount, bytes: audioStorageBytes }
    };

    const snapshot = {
      timestamp: new Date().toISOString(),
      totalWishes,
      wishes: safeWishes,
      storageFiles: safeFiles,
      contentMix,
      storageDistribution,
      insights: []
    };

    snapshot.insights = generateOperationalInsights(snapshot);
    cachedSnapshot = snapshot;
    return snapshot;
  }

  /* ============================================================
     TREND AGGREGATION ENGINE (7D, 30D, 90D)
     ============================================================ */
  function calculateTrendSeries(wishes = [], periodDays = 7) {
    const safeWishes = Array.isArray(wishes) ? wishes : [];
    const days = Math.max(1, parseInt(periodDays, 10) || 7);
    const now = new Date();

    const dateBuckets = [];
    const dateCounts = new Map();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().split("T")[0];
      dateBuckets.push(isoDate);
      dateCounts.set(isoDate, 0);
    }

    let totalInPeriod = 0;
    safeWishes.forEach(w => {
      if (!w) return;
      const rawDate = w.created_at || w.createdAt || w.date;
      if (!rawDate) return;
      const isoDate = String(rawDate).split("T")[0];
      if (dateCounts.has(isoDate)) {
        dateCounts.set(isoDate, dateCounts.get(isoDate) + 1);
        totalInPeriod++;
      }
    });

    const series = dateBuckets.map(isoDate => {
      const d = new Date(isoDate);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const count = dateCounts.get(isoDate) || 0;
      return { date: isoDate, label, count };
    });

    const counts = series.map(s => s.count);
    const maxCount = Math.max(...counts, 0);
    const minCount = Math.min(...counts, 0);
    const avgCount = days > 0 ? Math.round((totalInPeriod / days) * 10) / 10 : 0;

    return {
      periodDays: days,
      totalInPeriod,
      maxCount,
      minCount,
      avgCount,
      series,
      hasData: totalInPeriod > 0
    };
  }

  /* ============================================================
     OPERATIONAL INSIGHTS ENGINE
     ============================================================ */
  function generateOperationalInsights({ totalWishes = 0, safeWishes = [], contentMix = {}, storageDistribution = {} } = {}) {
    const insights = [];

    if (storageDistribution.unused && storageDistribution.unused.count > 0) {
      const unusedCount = storageDistribution.unused.count;
      const unusedBytes = storageDistribution.unused.bytes || 0;
      const formattedSize = typeof formatBytes === "function" ? formatBytes(unusedBytes) : `${unusedBytes} B`;
      insights.push({
        id: "unused-storage",
        type: "warning",
        icon: "⚠️",
        title: "Storage Cleanup",
        desc: `${unusedCount} unused files (${formattedSize}) can be removed to optimize storage.`,
        actionLabel: "Review Unused →",
        actionTab: "media",
        actionFilter: "unused"
      });
    }

    const todayIso = new Date().toISOString().split("T")[0];
    const wishesToday = (safeWishes || []).filter(w => {
      const d = w.created_at || w.createdAt || w.date;
      return d && String(d).startsWith(todayIso);
    }).length;

    if (wishesToday > 0) {
      insights.push({
        id: "daily-activity",
        type: "info",
        icon: "📈",
        title: "Daily Activity",
        desc: `${wishesToday} new wish${wishesToday === 1 ? '' : 'es'} created today.`,
        actionLabel: "View Wishes →",
        actionTab: "wishes"
      });
    }

    if (contentMix.photos && contentMix.photos.pct >= 50) {
      insights.push({
        id: "high-photos",
        type: "info",
        icon: "📸",
        title: "High Photo Adoption",
        desc: `${contentMix.photos.pct}% of active wishes include personalized photo memories.`,
        actionLabel: "View Gallery Files →",
        actionTab: "media",
        actionFilter: "images"
      });
    } else if (contentMix.videos && contentMix.videos.pct >= 30) {
      insights.push({
        id: "high-videos",
        type: "info",
        icon: "🎥",
        title: "Strong Video Engagement",
        desc: `${contentMix.videos.pct}% of wishes feature video greetings or YouTube embeds.`,
        actionLabel: "View Videos →",
        actionTab: "media",
        actionFilter: "videos"
      });
    }

    if (contentMix.passcode && contentMix.passcode.count > 0) {
      insights.push({
        id: "passcode-security",
        type: "success",
        icon: "🔒",
        title: "Privacy Protected Wishes",
        desc: `${contentMix.passcode.count} ${contentMix.passcode.count === 1 ? 'wish has' : 'wishes have'} custom passcode protection enabled.`,
        actionLabel: "Inspect Wishes →",
        actionTab: "wishes"
      });
    }

    if (insights.length === 0) {
      insights.push({
        id: "system-healthy",
        type: "success",
        icon: "✨",
        title: "System Healthy & In Sync",
        desc: "All wishes, media assets, and storage references are operating optimally.",
        actionLabel: "Create New Wish →",
        actionTab: "wishes"
      });
    }

    return insights;
  }

  /* ============================================================
     6. CHRONOLOGICAL TREND CHART RENDERER (NATIVE SVG)
     ============================================================ */
  /**
   * Renders a lightweight, responsive SVG line chart visualizing wish creation trend over time.
   * @param {string|HTMLElement} container - Target container ID or element.
   * @param {Array} wishes - Active wishes list.
   * @param {number} [periodDays=7] - Period in days (7, 30, 90).
   */
  function renderTrendChart(container, wishes = [], periodDays = activePeriodDays) {
    const el = typeof container === "string" ? document.getElementById(container) : container;
    if (!el) return;

    activePeriodDays = periodDays;
    const trend = calculateTrendSeries(wishes, periodDays);

    // Empty / Insufficient data state
    if (!trend.hasData || trend.series.length === 0) {
      el.innerHTML = `
        <div class="dash-empty-chart" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:220px;color:var(--text-muted);text-align:center;padding:24px;">
          <div style="font-size:2.2rem;margin-bottom:8px;opacity:0.8;">📈</div>
          <strong style="color:#fff;font-size:0.95rem;margin-bottom:4px;">No wishes created in the last ${periodDays} days</strong>
          <span style="font-size:0.78rem;color:var(--text-dim);">New wish creation activity will automatically populate this chronological chart.</span>
        </div>
      `;
      return;
    }

    // SVG Chart Geometry Constants
    const svgWidth = 600;
    const svgHeight = 200;
    const padLeft = 40;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 35;
    const chartW = svgWidth - padLeft - padRight;
    const chartH = svgHeight - padTop - padBottom;

    const maxVal = Math.max(4, Math.ceil(trend.maxCount * 1.25)); // Provide headroom
    const n = trend.series.length;

    // Generate Coordinate Points
    const points = trend.series.map((item, idx) => {
      const x = padLeft + (idx / Math.max(1, n - 1)) * chartW;
      const y = padTop + chartH - (item.count / maxVal) * chartH;
      return { x, y, ...item };
    });

    // Build SVG Path Strings
    const pathD = points.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
    const firstP = points[0];
    const lastP = points[points.length - 1];
    const areaD = `${pathD} L ${lastP.x} ${padTop + chartH} L ${firstP.x} ${padTop + chartH} Z`;

    // Horizontal Gridlines (4 levels)
    let gridLinesHtml = "";
    for (let l = 0; l <= 4; l++) {
      const lineVal = Math.round((l / 4) * maxVal);
      const lineY = padTop + chartH - (l / 4) * chartH;
      gridLinesHtml += `
        <line x1="${padLeft}" y1="${lineY}" x2="${svgWidth - padRight}" y2="${lineY}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4" />
        <text x="${padLeft - 8}" y="${lineY + 4}" fill="var(--text-dim, #94a3b8)" font-size="10" text-anchor="end" font-family="sans-serif">${lineVal}</text>
      `;
    }

    // X-Axis Date Labels (Sample 5-7 labels to prevent overcrowding)
    let xLabelsHtml = "";
    const step = Math.max(1, Math.floor(n / 6));
    points.forEach((p, idx) => {
      if (idx % step === 0 || idx === n - 1) {
        xLabelsHtml += `
          <text x="${p.x}" y="${svgHeight - 10}" fill="var(--text-dim, #94a3b8)" font-size="10" text-anchor="middle" font-family="sans-serif">${escapeHtml(p.label)}</text>
        `;
      }
    });

    // Data Nodes and Tooltip Circles
    let nodesHtml = "";
    points.forEach((p) => {
      nodesHtml += `
        <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#ffd700" stroke="#1c1033" stroke-width="2" class="dash-chart-node" style="cursor:pointer;transition:transform 0.15s ease;">
          <title>${escapeHtml(p.date)}: ${p.count} ${p.count === 1 ? 'wish' : 'wishes'}</title>
        </circle>
      `;
    });

    el.innerHTML = `
      <div class="dash-chart-wrapper" style="width:100%;overflow-x:auto;">
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="none" style="width:100%;height:220px;display:block;">
          <defs>
            <linearGradient id="dashTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(168, 85, 247, 0.45)" />
              <stop offset="100%" stop-color="rgba(168, 85, 247, 0.0)" />
            </linearGradient>
          </defs>
          ${gridLinesHtml}
          <path d="${areaD}" fill="url(#dashTrendGrad)" />
          <path d="${pathD}" fill="none" stroke="var(--gold, #ffd700)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          ${xLabelsHtml}
          ${nodesHtml}
        </svg>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding:0 8px;font-size:0.75rem;color:var(--text-dim);">
        <span>Total created in period: <strong style="color:#fff;">${trend.totalInPeriod}</strong></span>
        <span>Peak daily volume: <strong style="color:var(--gold);">${trend.maxCount}</strong></span>
      </div>
    `;
  }

  /* ============================================================
     CONTENT MIX DISTRIBUTION RENDERER
     ============================================================ */
  function renderContentMix(container, contentMix) {
    const el = typeof container === "string" ? document.getElementById(container) : container;
    if (!el || !contentMix) return;

    const total = contentMix.totalWishes || 0;

    const items = [
      { key: "photos", icon: "📸", label: "Photos / Gallery", data: contentMix.photos, color: "linear-gradient(90deg, #a855f7, #ec4899)" },
      { key: "videos", icon: "🎥", label: "Video Memories", data: contentMix.videos, color: "linear-gradient(90deg, #3b82f6, #06b6d4)" },
      { key: "audio", icon: "🎙️", label: "Voice / Audio", data: contentMix.audio, color: "linear-gradient(90deg, #f59e0b, #ffd700)" },
      { key: "letters", icon: "💌", label: "Birthday Letters", data: contentMix.letters, color: "linear-gradient(90deg, #10b981, #34d399)" },
      { key: "passcode", icon: "🔑", label: "Passcode Protection", data: contentMix.passcode, color: "linear-gradient(90deg, #8b5cf6, #c084fc)" }
    ];

    let rowsHtml = items.map(item => {
      const count = item.data ? item.data.count : 0;
      const pct = item.data ? item.data.pct : 0;
      return `
        <div class="dash-mix-row" style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.82rem;margin-bottom:5px;">
            <span style="color:#fff;display:flex;align-items:center;gap:6px;">
              <span>${item.icon}</span> <span>${item.label}</span>
            </span>
            <span style="color:var(--text-dim);font-size:0.78rem;">
              <strong style="color:#fff;">${count}</strong> <span style="font-size:0.72rem;">(${pct}%)</span>
            </span>
          </div>
          <div style="width:100%;height:6px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
            <div style="width:${Math.min(100, Math.max(0, pct))}%;height:100%;background:${item.color};border-radius:4px;transition:width 0.4s ease;"></div>
          </div>
        </div>
      `;
    }).join("");

    el.innerHTML = `
      <div class="dash-content-mix-wrapper">
        ${rowsHtml}
        <div style="margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);text-align:right;font-size:0.74rem;color:var(--text-dim);">
          Base: <strong style="color:#fff;">${total}</strong> total active wishes
        </div>
      </div>
    `;
  }

  /* ============================================================
     OPERATIONAL INSIGHTS RENDERER
     ============================================================ */
  function renderOperationalInsights(container, insights = []) {
    const el = typeof container === "string" ? document.getElementById(container) : container;
    if (!el) return;

    if (!Array.isArray(insights) || insights.length === 0) {
      el.innerHTML = "";
      return;
    }

    const cardsHtml = insights.map(item => {
      const isWarn = item.type === "warning";
      const bg = isWarn ? "rgba(239, 68, 68, 0.08)" : "rgba(168, 85, 247, 0.08)";
      const border = isWarn ? "rgba(239, 68, 68, 0.25)" : "rgba(168, 85, 247, 0.25)";
      const titleColor = isWarn ? "#fca5a5" : "#ffd700";

      return `
        <div class="dash-insight-card" style="background:${bg};border:1px solid ${border};border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:14px;">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
            <span style="font-size:1.3rem;flex-shrink:0;">${item.icon || "💡"}</span>
            <div style="min-width:0;">
              <strong style="color:${titleColor};font-size:0.85rem;display:block;">${escapeHtml(item.title)}</strong>
              <span style="color:var(--text-muted);font-size:0.78rem;display:block;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.desc)}</span>
            </div>
          </div>
          ${item.actionLabel ? `
            <button type="button" class="btn-dash-insight-action" data-tab="${item.actionTab || 'dashboard'}" data-filter="${item.actionFilter || ''}">
              ${escapeHtml(item.actionLabel)}
            </button>
          ` : ""}
        </div>
      `;
    }).join("");

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px;">
        ${cardsHtml}
      </div>
    `;

    el.querySelectorAll(".btn-dash-insight-action").forEach(btn => {
      btn.onclick = () => {
        const tab = btn.dataset.tab;
        const filter = btn.dataset.filter;
        if (tab && window.AdminNavigation && typeof window.AdminNavigation.switchTab === "function") {
          window.AdminNavigation.switchTab(tab);
        }
        if (filter && tab === "media" && window.AdminMedia && typeof window.AdminMedia.setFilter === "function") {
          window.AdminMedia.setFilter(filter);
        }
      };
    });
  }

  /* ============================================================
     PERIOD CONTROLS & EXPORT HELPERS
     ============================================================ */
  function initPeriodControls() {
    const periodButtons = document.querySelectorAll(SELECTORS.periodBtns);
    periodButtons.forEach(btn => {
      if (btn.__bound) return;
      btn.__bound = true;

      btn.addEventListener("click", () => {
        const p = parseInt(btn.dataset.period, 10) || 7;
        activePeriodDays = p;

        periodButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        if (cachedSnapshot && cachedSnapshot.wishes) {
          renderTrendChart(SELECTORS.trendContainer, cachedSnapshot.wishes, activePeriodDays);
        }
      });
    });
  }

  function generateSummaryText(periodDays = activePeriodDays) {
    const s = cachedSnapshot || createDashboardSnapshot([], []);
    const wishes = s.wishes || [];
    const trend = calculateTrendSeries(wishes, periodDays);
    const mix = s.contentMix || { photos: {}, videos: {}, audio: {}, letters: {}, passcode: {} };
    const dist = s.storageDistribution || {};
    const format = typeof formatBytes === "function" ? formatBytes : (b => `${b} B`);

    let nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    if (window.AdminDashboard && typeof window.AdminDashboard.formatActivityTime === "function") {
      const datePart = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
      nowStr = `${datePart}, ${window.AdminDashboard.formatActivityTime(new Date())}`;
    }

    return [
      "========================================",
      "👑 WISH STUDIO — DASHBOARD ANALYTICS REPORT",
      "========================================",
      `Generated: ${nowStr} (IST)`,
      `Analysis Period: Last ${periodDays} Days`,
      "",
      "📊 CORE METRICS:",
      `• Total Active Wishes: ${s.totalWishes}`,
      `• Created in Period (${periodDays}D): ${trend.totalInPeriod}`,
      `• Peak Daily Creation: ${trend.maxCount} wishes/day`,
      "",
      "🎨 CONTENT MIX & FEATURE ADOPTION:",
      `• 📸 Photos / Gallery: ${mix.photos?.count || 0} wishes (${mix.photos?.pct || 0}%)`,
      `• 🎥 Video Memories: ${mix.videos?.count || 0} wishes (${mix.videos?.pct || 0}%)`,
      `• 🎙️ Voice Notes & Music: ${mix.audio?.count || 0} wishes (${mix.audio?.pct || 0}%)`,
      `• 💌 Birthday Letters: ${mix.letters?.count || 0} wishes (${mix.letters?.pct || 0}%)`,
      `• 🔑 Custom Passcode: ${mix.passcode?.count || 0} wishes (${mix.passcode?.pct || 0}%)`,
      "",
      "☁️ STORAGE USAGE & CAPACITY:",
      `• Storage Bucket: wish-media`,
      `• Storage Used: ${format(dist.usedBytes || 0)} (${dist.usagePct || 0}% of 1 GB)`,
      `• Storage Remaining: ${format(dist.remainingBytes || 1073741824)} (${dist.remainingPct || 100}% Free of 1 GB)`,
      `• Total Media Files: ${dist.totalFiles || 0}`,
      `• Unreferenced / Unused: ${dist.unused?.count || 0} files (${format(dist.unused?.bytes || 0)} reclaimable)`,
      "",
      "⚡ SYSTEM STATUS: Operational",
      "========================================"
    ].join("\n");
  }

  async function copyDashboardSummary(periodDays = activePeriodDays) {
    const text = generateSummaryText(periodDays);
    let copied = false;

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (err) {}
    }

    if (!copied && typeof document !== "undefined") {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (e) {
        copied = false;
      }
    }

    if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
      window.AdminCore.showToast("Dashboard summary copied to clipboard 📋");
    }

    if (window.AdminLogs && typeof window.AdminLogs.logEvent === "function") {
      window.AdminLogs.logEvent("DASHBOARD_SHARE", `Copied dashboard analytics summary (${periodDays}D period)`);
    }

    return text;
  }

  function exportDashboardReport(format = "json", periodDays = activePeriodDays) {
    const s = cachedSnapshot || createDashboardSnapshot([], []);
    const wishes = s.wishes || [];
    const trend = calculateTrendSeries(wishes, periodDays);
    const mix = s.contentMix || {};
    const dist = s.storageDistribution || {};

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const filename = `wish_studio_dashboard_report_${periodDays}d_${dateStr}.${format.toLowerCase()}`;

    let content = "";
    let mimeType = "application/json";

    if (format.toLowerCase() === "csv") {
      mimeType = "text/csv;charset=utf-8;";
      const rows = [
        ["Report", "Wish Studio Dashboard Analytics Report"],
        ["Generated", now.toISOString()],
        ["Period Days", String(periodDays)],
        ["Total Active Wishes", String(s.totalWishes)],
        ["Period Wishes Created", String(trend.totalInPeriod)],
        ["Peak Daily Wishes", String(trend.maxCount)],
        ["Avg Daily Wishes", String(trend.avgCount)],
        ["Photos Wishes Count", String(mix.photos?.count || 0)],
        ["Photos Wishes Pct", String(mix.photos?.pct || 0)],
        ["Videos Wishes Count", String(mix.videos?.count || 0)],
        ["Videos Wishes Pct", String(mix.videos?.pct || 0)],
        ["Audio Wishes Count", String(mix.audio?.count || 0)],
        ["Audio Wishes Pct", String(mix.audio?.pct || 0)],
        ["Letters Wishes Count", String(mix.letters?.count || 0)],
        ["Letters Wishes Pct", String(mix.letters?.pct || 0)],
        ["Passcode Wishes Count", String(mix.passcode?.count || 0)],
        ["Passcode Wishes Pct", String(mix.passcode?.pct || 0)],
        ["Storage Total Capacity (Bytes)", String(dist.totalCapacityBytes || 1073741824)],
        ["Storage Used (Bytes)", String(dist.usedBytes || 0)],
        ["Storage Used (%)", String(dist.usagePct || 0)],
        ["Storage Remaining (Bytes)", String(dist.remainingBytes || 1073741824)],
        ["Storage Total Files", String(dist.totalFiles || 0)],
        ["Storage Unused Files", String(dist.unused?.count || 0)],
        ["Storage Unused (Bytes)", String(dist.unused?.bytes || 0)],
        [],
        ["Date", "Wishes Created In Date"],
        ...trend.series.map(s => [s.date, String(s.count)])
      ];

      content = rows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(",")).join("\n");
    } else {
      mimeType = "application/json";
      content = JSON.stringify({
        title: "Wish Studio Dashboard Analytics Report",
        report: "Wish Studio Dashboard Analytics",
        generatedAt: now.toISOString(),
        periodDays,
        metrics: {
          totalActiveWishes: s.totalWishes,
          totalWishes: s.totalWishes,
          periodCreated: trend.totalInPeriod,
          peakDaily: trend.maxCount,
          avgDaily: trend.avgCount,
          storageTotalCapacityBytes: dist.totalCapacityBytes || 1073741824,
          storageUsedBytes: dist.usedBytes || 0,
          storageUsedPct: dist.usagePct || 0
        },
        contentMix: mix,
        storage: dist,
        trendSeries: trend.series
      }, null, 2);
    }

    if (typeof document !== "undefined") {
      try {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } catch (err) {
        console.error("Export download failed:", err);
      }
    }

    if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
      window.AdminCore.showToast(`Exported ${format.toUpperCase()} analytics report 📊`);
    }

    if (window.AdminLogs && typeof window.AdminLogs.logEvent === "function") {
      window.AdminLogs.logEvent("DASHBOARD_EXPORT", `Exported ${format.toUpperCase()} report (${periodDays}D period)`);
    }

    return content;
  }

  function initShareControls() {
    const copyBtn = document.getElementById(SELECTORS.copySummaryBtn);
    if (copyBtn && !copyBtn.__bound) {
      copyBtn.__bound = true;
      copyBtn.addEventListener("click", () => copyDashboardSummary(activePeriodDays));
    }

    const exportBtn = document.getElementById(SELECTORS.exportReportBtn);
    const popover = document.getElementById(SELECTORS.exportPopover);

    if (exportBtn && popover && !exportBtn.__bound) {
      exportBtn.__bound = true;
      exportBtn.addEventListener("click", (e) => {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        const isHidden = popover.style.display === "none" || !popover.style.display;
        popover.style.display = isHidden ? "flex" : "none";
      });
    }

    const jsonBtn = document.getElementById(SELECTORS.exportJsonBtn);
    if (jsonBtn && !jsonBtn.__bound) {
      jsonBtn.__bound = true;
      jsonBtn.addEventListener("click", () => {
        exportDashboardReport("json", activePeriodDays);
        if (popover) popover.style.display = "none";
      });
    }

    const csvBtn = document.getElementById(SELECTORS.exportCsvBtn);
    if (csvBtn && !csvBtn.__bound) {
      csvBtn.__bound = true;
      csvBtn.addEventListener("click", () => {
        exportDashboardReport("csv", activePeriodDays);
        if (popover) popover.style.display = "none";
      });
    }

    if (typeof document !== "undefined" && !document.__popoverBound) {
      document.__popoverBound = true;
      document.addEventListener("click", (e) => {
        if (popover && popover.style.display === "flex") {
          if (!popover.contains(e.target) && (!exportBtn || !exportBtn.contains(e.target))) {
            popover.style.display = "none";
          }
        }
      });
    }
  }

  /* ============================================================
     MODULE INITIALIZATION & SNAPSHOT REFRESH
     ============================================================ */
  function renderAll(wishes = [], storageFiles = []) {
    let snapshot;
    if (wishes && Array.isArray(wishes.wishes)) {
      snapshot = wishes;
    } else {
      snapshot = createDashboardSnapshot(wishes, storageFiles);
    }

    renderTrendChart(SELECTORS.trendContainer, snapshot.wishes, activePeriodDays);
    renderContentMix(SELECTORS.contentMixContainer, snapshot.contentMix);
    renderOperationalInsights(SELECTORS.insightsContainer, snapshot.insights);

    initPeriodControls();
    initShareControls();
    return snapshot;
  }

  function init() {
    initPeriodControls();
    initShareControls();
  }

  window.AdminDashboardAnalytics = {
    init,
    initShareControls,
    renderAll,
    renderAllAnalytics: renderAll,
    createDashboardSnapshot,
    calculateTrendSeries,
    calculateContentMix: (wishes) => createDashboardSnapshot(wishes, []).contentMix,
    generateOperationalInsights,
    renderTrendChart,
    renderContentMix,
    renderOperationalInsights,
    generateSummaryText,
    copyDashboardSummary,
    exportDashboardReport,
    getActivePeriod: () => activePeriodDays,
    setActivePeriod: (p) => { activePeriodDays = p; },
    getCachedSnapshot: () => cachedSnapshot
  };

})(typeof window !== "undefined" ? window : globalThis);
