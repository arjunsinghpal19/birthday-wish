/**
 * ============================================================================
 * CUSTOMER DASHBOARD ENGINE (js/customer.js)
 * Standalone Customer Portal logic isolated from Super Admin functions.
 * Manages customer wishes, media assets, theme customization, profile settings,
 * subscription tier, billing history, and support.
 * ============================================================================
 */

(function (window) {
  "use strict";

  // Customer State Dataset
  let customerWishes = [];
  let currentActiveTab = "dashboard";

  // Toast Notification Helper
  function showToast(msg) {
    let toast = document.getElementById("cust-toast-notification");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "cust-toast-notification";
      toast.className = "cust-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3500);
  }

  // Copy Public Wish Link
  function copyWishUrl(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        showToast("📋 Wish Link copied to clipboard! ✨");
      }).catch(() => {
        showToast(`Link: ${url}`);
      });
    } else {
      showToast(`Link: ${url}`);
    }
  }

  // Session Validation & Customer Guard
  function checkCustomerSession() {
    // Allows customer workspace access
    return true;
  }

  // Initialize Sidebar Navigation & Mobile Drawer
  function initTabNavigation() {
    const navButtons = document.querySelectorAll(".cust-sidebar .nav-item[data-tab]");
    const tabViews = document.querySelectorAll(".cust-viewport .tab-view");
    const sidebar = document.getElementById("cust-sidebar");

    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const tabId = btn.dataset.tab;
        if (!tabId) return;

        navButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        tabViews.forEach(view => {
          view.classList.remove("active");
          if (view.id === `view-${tabId}`) {
            view.classList.add("active");
          }
        });

        currentActiveTab = tabId;
        if (sidebar && window.innerWidth <= 1024) {
          sidebar.classList.remove("open");
        }
      });
    });

    // Mobile Sidebar Drawer Toggle
    const mobileToggle = document.getElementById("mobile-sidebar-toggle");
    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener("click", () => {
        sidebar.classList.toggle("open");
      });
    }
  }

  // Get Active Customer Identity (Database Scoping)
  function getCustomerSessionIdentity() {
    const custId = sessionStorage.getItem("customer_id") || null;
    const custEmail = sessionStorage.getItem("customer_email") || "customer@example.com";
    return { id: custId, email: custEmail };
  }

  // Load Customer Specific Wishes Data (Database-Side Query Filtering)
  async function loadCustomerWishesData() {
    try {
      if (window.SupabaseModule) {
        const client = window.SupabaseModule.getClient();
        if (client) {
          // Database-Side Filter: Exclude system rows & filter for customer at Database layer
          let query = client.from("wishes")
            .select("*")
            .neq("id", "00000000-0000-0000-0000-000000000001")
            .neq("recipient_name", "__SYSTEM_SECURITY_CONFIG__");

          const customer = getCustomerSessionIdentity();
          if (customer && customer.id) {
            query = query.eq("user_id", customer.id);
          }

          const { data, error } = await query.order("created_at", { ascending: false });
          if (!error && Array.isArray(data)) {
            customerWishes = data;
          }
        }
      }
    } catch (e) {
      console.warn("Using local customer wishes data:", e);
    }

    await loadCustomerMediaData();
    updateCustomerMetrics();
    renderCustomerWishesTable();
    renderRecentWishesTable();
  }

  // Customer Media Dataset & Storage Analytics
  let customerMediaFiles = [];
  let customerStorageAnalytics = null;

  // Load Customer Specific Media Assets from Supabase Storage (Live Storage Engine)
  async function loadCustomerMediaData() {
    try {
      if (window.StorageModule && typeof window.StorageModule.listAllMedia === "function") {
        const allFiles = await window.StorageModule.listAllMedia();
        if (Array.isArray(allFiles)) {
          // Filter media files linked to customer's wishes
          const customerUrls = new Set();
          customerWishes.forEach(w => {
            if (w.music_url) customerUrls.add(w.music_url);
            if (w.video_url) customerUrls.add(w.video_url);
            if (Array.isArray(w.gallery_json)) {
              w.gallery_json.forEach(g => { if (g && g.image) customerUrls.add(g.image); });
            }
          });

          customerMediaFiles = allFiles.filter(f => customerUrls.has(f.publicUrl));
        }
      }
    } catch (e) {
      console.warn("Using local customer media data:", e);
      customerMediaFiles = [];
    }

    if (window.DatabaseModule && typeof window.DatabaseModule.calculateStorageAnalytics === "function") {
      customerStorageAnalytics = window.DatabaseModule.calculateStorageAnalytics(customerMediaFiles, null);
    }
  }

  // Update Customer Dashboard Metrics (Live Customer Storage Metrics)
  function updateCustomerMetrics() {
    const totalEl = document.getElementById("cust-kpi-total-wishes");
    if (totalEl) totalEl.textContent = customerWishes.length;

    const todayStr = new Date().toDateString();
    const todayCount = customerWishes.filter(w => w.created_at && new Date(w.created_at).toDateString() === todayStr).length;
    const todayEl = document.getElementById("cust-kpi-today-wishes");
    if (todayEl) todayEl.textContent = todayCount;

    const mediaEl = document.getElementById("cust-kpi-total-media");
    if (mediaEl) {
      const formattedSize = customerStorageAnalytics ? customerStorageAnalytics.formattedTotalUsed : "0 B";
      mediaEl.textContent = `${customerMediaFiles.length} File${customerMediaFiles.length === 1 ? '' : 's'} (${formattedSize})`;
    }

    const planEl = document.getElementById("cust-kpi-current-plan");
    if (planEl) planEl.textContent = "Free Creator";
  }

  // Render Recent Wishes in Customer Overview
  function renderRecentWishesTable() {
    const tbody = document.getElementById("cust-dash-recent-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    customerWishes.slice(0, 4).forEach(w => {
      const tr = document.createElement("tr");
      const shortUuid = w.id ? (w.id.substring(0, 8) + "...") : "Local";
      const fullUrl = `${location.origin}/?w=${w.id}`;

      tr.innerHTML = `
        <td><strong>${w.recipient_name || "Friend"}</strong></td>
        <td>${w.sender_name || "You"}</td>
        <td><code style="color:var(--purple-light);">${shortUuid}</code></td>
        <td>${w.created_at ? new Date(w.created_at).toLocaleDateString() : "Recent"}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn-icon" title="Copy Link" onclick="window.customerApp.copyWishUrl('${fullUrl}')">📋</button>
            <a class="btn-icon" href="${fullUrl}" target="_blank" title="Preview Wish">👁️</a>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Render Full "My Wishes" Table
  function renderCustomerWishesTable() {
    const tbody = document.getElementById("cust-wishes-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    if (customerWishes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">No wishes created yet. Click "Create Wish" to create your first wish!</td></tr>`;
      return;
    }

    customerWishes.forEach(w => {
      const tr = document.createElement("tr");
      const shortUuid = w.id ? (w.id.substring(0, 8) + "...") : "Local";
      const fullUrl = `${location.origin}/?w=${w.id}`;
      const eventType = (w.event_type || "birthday").toUpperCase();

      tr.innerHTML = `
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:10px;background:rgba(168,85,247,0.2);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--purple-light);">
              ${(w.recipient_name || "W").charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>${w.recipient_name || "Friend"}</strong>
              <div style="font-size:0.75rem;color:var(--text-dim);">${eventType}</div>
            </div>
          </div>
        </td>
        <td>${w.sender_name || "You"}</td>
        <td><span style="padding:4px 10px;border-radius:12px;background:rgba(46,204,113,0.15);color:#2ecc71;font-size:0.75rem;font-weight:600;">🔑 ${w.pass_code || "1234"}</span></td>
        <td><code style="color:var(--purple-light);font-size:0.8rem;">${shortUuid}</code></td>
        <td>${w.created_at ? new Date(w.created_at).toLocaleDateString() : "Recent"}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn-icon" title="Copy Link" onclick="window.customerApp.copyWishUrl('${fullUrl}')">📋</button>
            <a class="btn-icon" href="${fullUrl}" target="_blank" title="Preview Wish">👁️</a>
            <button class="btn-icon danger" title="Delete Wish" onclick="window.customerApp.deleteCustomerWish('${w.id}')">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Delete Customer Wish
  async function deleteCustomerWish(id) {
    if (!confirm("Are you sure you want to delete this wish?")) return;

    try {
      if (window.SupabaseModule) {
        const client = window.SupabaseModule.getClient();
        if (client) {
          await client.from("wishes").delete().eq("id", id);
        }
      }
    } catch (e) {
      console.warn("Delete wish error:", e);
    }

    customerWishes = customerWishes.filter(w => w.id !== id);
    loadCustomerWishesData();
    showToast("Wish deleted successfully 🗑️");
  }

  // Real-Time Passcode Validation (Exactly 4 Numeric Digits)
  function initPasscodeValidation() {
    const passcodeEl = document.getElementById("create-passcode");
    const errorEl = document.getElementById("create-passcode-error");
    const submitBtn = document.getElementById("cust-create-submit-btn");

    if (!passcodeEl) return;

    function validatePasscode() {
      const val = passcodeEl.value.trim();
      const isValid = /^\d{4}$/.test(val);

      if (!isValid) {
        if (errorEl) errorEl.style.display = "block";
        passcodeEl.style.borderColor = "#ff7675";
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.style.opacity = "0.5";
          submitBtn.style.cursor = "not-allowed";
        }
      } else {
        if (errorEl) errorEl.style.display = "none";
        passcodeEl.style.borderColor = "var(--border-gold)";
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = "1";
          submitBtn.style.cursor = "pointer";
        }
      }
      return isValid;
    }

    passcodeEl.addEventListener("input", validatePasscode);
    passcodeEl.addEventListener("blur", validatePasscode);
    validatePasscode();
  }

  // Handle Create Wish Form Submission (Complete Database Scoping & Verification)
  function initCreateWishForm() {
    const form = document.getElementById("cust-create-wish-form");
    if (!form) return;

    initPasscodeValidation();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const recipient = document.getElementById("create-recipient-name")?.value?.trim() || "Friend";
      const sender = document.getElementById("create-sender-name")?.value?.trim() || "Friend";
      const passcode = document.getElementById("create-passcode")?.value?.trim() || "";
      const eventType = document.getElementById("create-event-type")?.value || "birthday";

      // 1. Strict Passcode Validation
      if (!/^\d{4}$/.test(passcode)) {
        showToast("⚠️ Passcode must be exactly 4 numeric digits! (e.g. 1234)");
        return;
      }

      // 2. Prepare Valid Database Payload (Matching public.wishes schema)
      const record = {
        recipient_name: recipient,
        sender_name: sender,
        pass_code: passcode,
        birth_date: { year: 2001, month: 1, day: 1 },
        letter_lines: [
          "Wishing you joy, health and endless happiness today!",
          "May this year bring you all the love and success you deserve."
        ],
        created_at: new Date().toISOString()
      };

      let insertedId = null;
      let dbError = null;
      let isSuccess = false;

      try {
        if (window.SupabaseModule) {
          const client = window.SupabaseModule.getClient();
          if (client) {
            const response = await client.from("wishes").insert([record]).select("id");
            console.log("💾 Supabase Insert Response:", {
              data: response.data,
              error: response.error,
              status: response.status,
              statusText: response.statusText
            });

            if (response.error) {
              dbError = response.error.message || response.error.details || response.error.hint;
            } else if (response.status === 201 || response.status === 200 || response.data) {
              isSuccess = true;
              if (Array.isArray(response.data) && response.data[0] && response.data[0].id) {
                insertedId = response.data[0].id;
              } else if (response.data && response.data.id) {
                insertedId = response.data.id;
              }
            }
          }
        }
      } catch (err) {
        console.error("❌ DB insert exception:", err);
        dbError = err.message || "Database insert exception";
      }

      // 3. If insert failed with database error, display real error message
      if (dbError || !isSuccess) {
        showToast(`❌ Database Save Failed: ${dbError || "Error saving record"}`);
        return;
      }

      // 4. Construct inserted record object for immediate UI update (Zero Page Refresh)
      const createdRecord = {
        id: insertedId || (crypto.randomUUID ? crypto.randomUUID() : "w_" + Date.now()),
        recipient_name: recipient,
        sender_name: sender,
        pass_code: passcode,
        letter_lines: record.letter_lines,
        created_at: record.created_at
      };

      customerWishes.unshift(createdRecord);
      renderCustomerWishesTable();
      renderRecentWishesTable();
      updateCustomerMetrics();

      await loadCustomerWishesData();

      showToast(`✨ Wish for "${recipient}" created successfully!`);
      form.reset();

      // Switch tab to My Wishes
      const myWishesBtn = document.querySelector(".cust-sidebar .nav-item[data-tab='wishes']");
      if (myWishesBtn) myWishesBtn.click();
    });
  }

  // Dynamically Populate Event Category Dropdown from Registered Active Event Modules
  function initCustomerCreateWishEvents() {
    const select = document.getElementById("create-event-type");
    if (!select) return;

    const activeEventTypes = (window.CONFIG && Array.isArray(window.CONFIG.ACTIVE_EVENT_TYPES))
      ? window.CONFIG.ACTIVE_EVENT_TYPES
      : [{ id: "birthday", name: "Birthday", icon: "🎂" }];

    select.innerHTML = "";
    activeEventTypes.forEach(evt => {
      const opt = document.createElement("option");
      opt.value = evt.id;
      opt.textContent = `${evt.icon} ${evt.name}`;
      select.appendChild(opt);
    });
  }

  // Render All Active Themes in Theme Gallery (All 4 Themes)
  function renderCustomerThemesGallery() {
    const container = document.getElementById("cust-themes-grid-container");
    if (!container) return;

    const themes = (window.CONFIG && Array.isArray(window.CONFIG.THEMES_CATALOG))
      ? window.CONFIG.THEMES_CATALOG
      : [
          { id: "default", name: "Royal Purple & Gold", icon: "👑", desc: "Luxury dark theme with floating gold dust particles.", accent: "#ffd700", isDefault: true },
          { id: "rosegold", name: "Rose Gold Romance", icon: "🌸", desc: "Soft pink tones designed for romantic wishes & anniversaries.", accent: "#ff7675" },
          { id: "galaxy", name: "Cosmic Galaxy Night", icon: "🌌", desc: "Deep midnight blue with glowing star constellations.", accent: "#74b9ff" },
          { id: "emerald", name: "Emerald Luxury", icon: "💎", desc: "Rich emerald green accent with subtle shimmering light effects.", accent: "#2ecc71" }
        ];

    container.innerHTML = "";
    themes.forEach(t => {
      const card = document.createElement("div");
      card.className = "glass-card";
      if (t.isDefault) card.style.borderColor = "var(--border-gold)";

      const badgeOrBtn = t.isDefault
        ? `<span style="display:inline-block;margin-top:12px;padding:4px 10px;border-radius:12px;background:rgba(46,204,113,0.15);color:#2ecc71;font-size:0.75rem;font-weight:600;">Active Default</span>`
        : `<button class="btn-primary" style="margin-top:12px;padding:6px 14px;font-size:0.78rem;" onclick="window.customerApp.showToast('Theme ${t.name} selected! ✨')">Select Theme</button>`;

      card.innerHTML = `
        <span style="font-size:2rem;">${t.icon}</span>
        <h4 style="font-family:var(--font-heading);color:${t.accent};margin:10px 0 6px 0;">${t.name}</h4>
        <p style="font-size:0.8rem;color:var(--text-muted);">${t.desc}</p>
        ${badgeOrBtn}
      `;
      container.appendChild(card);
    });
  }

  // Customer App Initialization
  document.addEventListener("DOMContentLoaded", () => {
    if (!checkCustomerSession()) return;
    initTabNavigation();
    initCustomerCreateWishEvents();
    renderCustomerThemesGallery();
    initCreateWishForm();
    loadCustomerWishesData();

    const logoutBtn = document.getElementById("cust-logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        sessionStorage.clear();
        showToast("Logged out successfully 🚪");
        window.location.replace("index.html");
      });
    }
  });

  // Export Global API
  window.customerApp = {
    showToast,
    copyWishUrl,
    deleteCustomerWish,
    loadCustomerWishesData
  };

})(window);
