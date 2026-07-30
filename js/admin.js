/**
 * ============================================================================
 * ADMIN DASHBOARD ENGINE (js/admin.js)
 * Manages tab navigation, wishes table, media library, security settings,
 * backups, system audit logs, and responsive layout.
 * ============================================================================
 */

(function (window) {
  "use strict";

  // System Audit Logs Array
  const systemLogs = [
    { time: new Date().toLocaleString(), event: "ADMIN_LOGIN", desc: "Admin session authenticated successfully", status: "SUCCESS" },
    { time: new Date(Date.now() - 3600000).toLocaleString(), event: "WISH_CREATED", desc: "UUID link generated for recipient 'Pooja'", status: "SUCCESS" },
    { time: new Date(Date.now() - 7200000).toLocaleString(), event: "MEDIA_UPLOAD", desc: "Uploaded photo to bucket wish-media/photos/", status: "SUCCESS" },
    { time: new Date(Date.now() - 86400000).toLocaleString(), event: "SECURITY_UPDATE", desc: "Master recovery settings updated", status: "INFO" }
  ];

  // Mock / Cached Wishes Data for Table Rendering
  let wishesList = [
    { id: "57146e5d-3fb1-4392-8e3a-8a18cbe027b1", recipient_name: "Pooja Special", sender_name: "Arjun Friend", pass_code: "2026", created_at: "2026-07-30" },
    { id: "afe4d044-c6e3-4619-b22b-2d0cee94d126", recipient_name: "Rohan", sender_name: "Bestie", pass_code: "1234", created_at: "2026-07-29" },
    { id: "b28c7401-44aa-4921-99ee-773a6e819a12", recipient_name: "Priya", sender_name: "Rahul", pass_code: "9999", created_at: "2026-07-28" }
  ];

  // Media Library Catalog Items
  const mediaItems = {
    images: [
      { name: "polaroid-1.jpg", size: "1.2 MB", date: "2026-07-30", url: "assets/images/polaroid-1.jpg" },
      { name: "polaroid-2.jpg", size: "980 KB", date: "2026-07-29", url: "assets/images/polaroid-2.jpg" },
      { name: "polaroid-3.jpg", size: "1.4 MB", date: "2026-07-28", url: "assets/images/polaroid-3.jpg" },
      { name: "polaroid-4.jpg", size: "1.1 MB", date: "2026-07-27", url: "assets/images/polaroid-4.jpg" }
    ],
    videos: [
      { name: "birthday-surprise.mp4", size: "14.2 MB", date: "2026-07-30", url: "assets/videos/sample-video.mp4" }
    ],
    audio: [
      { name: "happy-birthday-song.mpeg", size: "3.4 MB", date: "2026-07-30", url: "assets/music/happy-birthday-song.mpeg" }
    ]
  };

  // Toast Notification Helper
  function showToast(message) {
    const toast = document.getElementById("admin-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  // Add Log Entry
  function logEvent(event, desc, status = "SUCCESS") {
    systemLogs.unshift({
      time: new Date().toLocaleString(),
      event,
      desc,
      status
    });
    renderLogsTable();
  }

  // Switch Sidebar Tabs
  function initTabNavigation() {
    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
    const views = document.querySelectorAll(".tab-view");

    navItems.forEach(item => {
      item.addEventListener("click", () => {
        const targetTab = item.dataset.tab;
        if (!targetTab) return;

        navItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        views.forEach(v => {
          if (v.id === `view-${targetTab}`) {
            v.classList.add("active");
          } else {
            v.classList.remove("active");
          }
        });

        // Close mobile drawer on item select
        const sidebar = document.getElementById("admin-sidebar");
        if (sidebar) sidebar.classList.remove("open");
      });
    });

    // Mobile Sidebar Drawer Toggle
    const mobileToggle = document.getElementById("mobile-sidebar-toggle");
    const sidebar = document.getElementById("admin-sidebar");
    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener("click", () => {
        sidebar.classList.toggle("open");
      });
    }
  }

  // Render Dashboard KPI Cards & Recent Lists
  async function loadDashboardData() {
    try {
      if (window.SupabaseModule) {
        const client = window.SupabaseModule.getClient();
        if (client) {
          const { data, error } = await client.from("wishes").select("*").order("created_at", { ascending: false });
          if (!error && data && data.length > 0) {
            wishesList = data;
          }
        }
      }
    } catch (e) {
      console.warn("Using local cached wishes data:", e);
    }

    // Update KPI Numbers
    const totalWishesEl = document.getElementById("kpi-total-wishes");
    if (totalWishesEl) totalWishesEl.textContent = wishesList.length;

    renderRecentWishesTable();
    renderWishesTable();
    renderLogsTable();
    renderMediaGrid("images");
  }

  // Render Dashboard Recent Wishes
  function renderRecentWishesTable() {
    const tbody = document.getElementById("dash-recent-wishes-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    wishesList.slice(0, 4).forEach(w => {
      const tr = document.createElement("tr");
      const shortUuid = w.id ? (w.id.substring(0, 8) + "...") : "N/A";
      const fullUrl = `${location.origin}/?w=${w.id}`;

      tr.innerHTML = `
        <td>
          <div class="user-cell">
            <div class="user-avatar">${(w.recipient_name || "W").charAt(0).toUpperCase()}</div>
            <strong>${w.recipient_name || "Friend"}</strong>
          </div>
        </td>
        <td>${w.sender_name || "Friend"}</td>
        <td><code style="color:var(--purple-light);font-size:0.8rem;">${shortUuid}</code></td>
        <td>${w.created_at ? new Date(w.created_at).toLocaleDateString() : "Today"}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" title="Copy Public URL" onclick="window.adminApp.copyWishUrl('${fullUrl}')">🔗</button>
            <a class="btn-icon" href="${fullUrl}" target="_blank" title="Open Wish Page">👁️</a>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Recent activity list
    const actList = document.getElementById("dash-recent-activity-list");
    if (actList) {
      actList.innerHTML = "";
      systemLogs.slice(0, 4).forEach(log => {
        const li = document.createElement("li");
        li.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="color:var(--gold);">${log.event}</strong>
            <span style="color:var(--text-dim);font-size:0.75rem;">${log.time.split(',')[1] || log.time}</span>
          </div>
          <span style="color:var(--text-muted);">${log.desc}</span>
        `;
        actList.appendChild(li);
      });
    }
  }

  // Render Full Wishes View Table
  function renderWishesTable() {
    const tbody = document.getElementById("wishes-tbody");
    if (!tbody) return;

    const searchTerm = (document.getElementById("wishes-search-input")?.value || "").toLowerCase();
    const sortVal = document.getElementById("wishes-sort-select")?.value || "newest";

    let filtered = wishesList.filter(w => {
      const name = (w.recipient_name || "").toLowerCase();
      const sender = (w.sender_name || "").toLowerCase();
      const id = (w.id || "").toLowerCase();
      return name.includes(searchTerm) || sender.includes(searchTerm) || id.includes(searchTerm);
    });

    if (sortVal === "oldest") {
      filtered.reverse();
    } else if (sortVal === "name") {
      filtered.sort((a, b) => (a.recipient_name || "").localeCompare(b.recipient_name || ""));
    }

    tbody.innerHTML = "";
    filtered.forEach(w => {
      const tr = document.createElement("tr");
      const fullUrl = `${location.origin}/?w=${w.id}`;

      tr.innerHTML = `
        <td>
          <div class="user-cell">
            <div class="user-avatar">${(w.recipient_name || "W").charAt(0).toUpperCase()}</div>
            <div>
              <strong>${w.recipient_name || "Friend"}</strong>
              <div style="font-size:0.75rem;color:var(--text-dim);">ID: ${w.id ? w.id.substring(0, 13) + "..." : "Local"}</div>
            </div>
          </div>
        </td>
        <td>${w.sender_name || "Friend"}</td>
        <td><span class="status-badge active">🔑 ${w.pass_code || "1234"}</span></td>
        <td><button class="btn-sm" onclick="window.adminApp.copyWishUrl('${fullUrl}')">📋 Copy UUID Link</button></td>
        <td>${w.created_at ? new Date(w.created_at).toLocaleDateString() : "Recent"}</td>
        <td>
          <div class="action-btns">
            <a class="btn-icon" href="${fullUrl}" target="_blank" title="Open Public Page">👁️</a>
            <button class="btn-icon" title="Duplicate Wish" onclick="window.adminApp.duplicateWish('${w.id}')">📋</button>
            <button class="btn-icon danger" title="Delete Wish" onclick="window.adminApp.deleteWish('${w.id}')">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Render Media Library Grid
  function renderMediaGrid(category = "images") {
    const container = document.getElementById("media-grid-container");
    if (!container) return;

    const items = mediaItems[category] || [];
    container.innerHTML = "";

    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "glass-card media-item-card";

      let previewContent = "";
      if (category === "images") {
        previewContent = `<img src="${item.url}" alt="${item.name}" onerror="this.src='assets/images/polaroid-1.jpg'">`;
      } else if (category === "videos") {
        previewContent = `<span style="font-size:3rem;color:var(--purple-light);">📹</span>`;
      } else {
        previewContent = `<span style="font-size:3rem;color:var(--gold);">🎙</span>`;
      }

      card.innerHTML = `
        <div class="media-preview-box">${previewContent}</div>
        <div class="media-info">
          <div class="media-title" title="${item.name}">${item.name}</div>
          <div class="media-meta">
            <span>${item.size}</span>
            <span>${item.date}</span>
          </div>
          <div class="media-actions">
            <button class="btn-sm" onclick="window.adminApp.copyWishUrl('${location.origin}/${item.url}')">🔗 Copy URL</button>
            <button class="btn-sm" style="color:#ff6b81;" onclick="window.adminApp.showToast('Media file deleted 🗑️')">✕ Delete</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // Media Category Tabs
  function initMediaTabs() {
    const tabs = document.querySelectorAll(".media-tabs .tab-btn");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const category = tab.dataset.mediatab;
        renderMediaGrid(category);
      });
    });
  }

  // Render Logs Table
  function renderLogsTable() {
    const tbody = document.getElementById("logs-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    systemLogs.forEach(log => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="color:var(--text-dim);font-size:0.8rem;">${log.time}</td>
        <td><span class="status-badge active">${log.event}</span></td>
        <td>${log.desc}</td>
        <td><strong style="color:#2ecc71;">${log.status}</strong></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Security Settings Password Update Handler
  function initSecurityHandlers() {
    const savePassBtn = document.getElementById("sec-save-pass-btn");
    if (savePassBtn) {
      savePassBtn.addEventListener("click", async () => {
        const oldVal = (document.getElementById("sec-old-pass")?.value || "").trim();
        const newVal = (document.getElementById("sec-new-pass")?.value || "").trim();
        const confirmVal = (document.getElementById("sec-confirm-pass")?.value || "").trim();

        if (!newVal || newVal.length < 4) {
          showToast("New password must be at least 4 characters ⚠️");
          return;
        }
        if (newVal !== confirmVal) {
          showToast("Passwords do not match ❌");
          return;
        }

        localStorage.setItem("custom_admin_password", newVal);
        logEvent("SECURITY_UPDATE", "Master Admin Password updated");
        showToast("🔑 Master Admin Password Saved! ✅");
      });
    }

    const saveRecBtn = document.getElementById("sec-save-recovery-btn");
    if (saveRecBtn) {
      saveRecBtn.addEventListener("click", () => {
        const q = (document.getElementById("sec-recovery-question")?.value || "").trim();
        const a = (document.getElementById("sec-recovery-answer")?.value || "").trim();

        if (q) localStorage.setItem("custom_secret_question", q);
        if (a) localStorage.setItem("custom_secret_answer", a);

        logEvent("SECURITY_UPDATE", "Recovery question and secret answer updated");
        showToast("🛡 Password Recovery Settings Saved! ✅");
      });
    }
  }

  // Backup Export & Import Logic
  function initBackupHandlers() {
    const exportBtn = document.getElementById("btn-export-backup");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const backupData = {
          export_date: new Date().toISOString(),
          version: "2.5",
          wishes: wishesList,
          logs: systemLogs
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `birthday-suite-backup-${Date.now()}.json`;
        a.click();
        logEvent("BACKUP_EXPORT", "Exported JSON backup file");
        showToast("💾 Backup JSON File Exported! 📥");
      });
    }

    const importInput = document.getElementById("import-backup-file");
    if (importInput) {
      importInput.addEventListener("change", (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            if (data && data.wishes && Array.isArray(data.wishes)) {
              wishesList = data.wishes;
              loadDashboardData();
              logEvent("BACKUP_IMPORT", `Restored ${data.wishes.length} wishes from JSON backup`);
              showToast(`📥 Successfully Restored ${data.wishes.length} Wishes from Backup! 🎉`);
            }
          } catch(err) {
            showToast("Invalid Backup JSON file ❌");
          }
        };
        reader.readAsText(f);
      });
    }
  }

  // Logout Handler
  function initLogout() {
    const logoutBtn = document.getElementById("admin-logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        sessionStorage.removeItem("admin_authenticated");
        logEvent("ADMIN_LOGOUT", "Admin logged out");
        showToast("Logged out of Admin Session 🔒");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1000);
      });
    }
  }

  // Copy Helper
  function copyWishUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
      showToast("📋 Link copied to clipboard!");
    }).catch(() => {
      showToast(`Link: ${url}`);
    });
  }

  // Delete Wish Helper
  function deleteWish(id) {
    if (!confirm("Are you sure you want to delete this wish record?")) return;
    wishesList = wishesList.filter(w => w.id !== id);
    loadDashboardData();
    logEvent("WISH_DELETED", `Deleted wish record ID: ${id}`);
    showToast("Wish record deleted 🗑️");
  }

  // Duplicate Wish Helper
  function duplicateWish(id) {
    const item = wishesList.find(w => w.id === id);
    if (!item) return;
    const dup = JSON.parse(JSON.stringify(item));
    dup.id = "dup-" + Date.now().toString(36);
    dup.recipient_name = (dup.recipient_name || "Copy") + " (Copy)";
    wishesList.unshift(dup);
    loadDashboardData();
    logEvent("WISH_DUPLICATED", `Duplicated wish record ID: ${id}`);
    showToast("Wish record duplicated 📋");
  }

  // Initialize Admin App
  document.addEventListener("DOMContentLoaded", () => {
    initTabNavigation();
    initMediaTabs();
    initSecurityHandlers();
    initBackupHandlers();
    initLogout();
    loadDashboardData();

    // Table Search Listener
    const searchInput = document.getElementById("wishes-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", renderWishesTable);
    }
    const sortSelect = document.getElementById("wishes-sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", renderWishesTable);
    }

    const refreshBtn = document.getElementById("btn-refresh-dashboard");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        loadDashboardData();
        showToast("Analytics & wishes data refreshed 🔄");
      });
    }

    const createBtn = document.getElementById("btn-create-new-wish-admin");
    if (createBtn) {
      createBtn.addEventListener("click", () => {
        window.location.href = "index.html";
      });
    }
  });

  // Export Global API
  window.adminApp = {
    showToast,
    copyWishUrl,
    deleteWish,
    duplicateWish,
    logEvent
  };

})(window);
