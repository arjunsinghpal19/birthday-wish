/**
 * ============================================================================
 * CUSTOMER WISHES HUB CONTROLLER (js/customer/customer-wishes.js)
 * Architecture: Phase 32D Customer Platform Foundation
 *
 * Dedicated client-side controller managing customer wishes loading, search,
 * filtering, sorting, card rendering, and quick actions (View, Edit, Copy Link, Delete).
 *
 * CRITICAL ARCHITECTURAL INVARIANTS:
 * 1. Queries public.wishes directly via authenticated client; strictly relies on
 *    PostgreSQL RLS (wishes_select_policy: auth.uid() = owner_id).
 * 2. Never trusts client-provided owner_id; never queries unowned records.
 * 3. Delete operations scoped by RLS (wishes_delete_policy: auth.uid() = owner_id).
 * 4. 100% Isolated from Admin Dashboard & HMAC authentication.
 * 5. Strictly respects the < 35 KB file size ceiling.
 * ============================================================================
 */

(function (root) {
  "use strict";

  // In-memory state for customer wishes
  let customerWishes = [];
  let filteredWishes = [];
  let searchQuery = "";
  let activeFilter = "all";
  let activeSort = "newest";
  let targetDeleteWish = null;
  let isDeleting = false;

  // DOM Selector Map
  const DOM = {
    // Hub container
    viewWishes: "view-wishes",
    wishesGrid: "customer-wishes-grid",
    overviewList: "customer-wishes-list-container",
    resultsCountBadge: "wishes-results-count",

    // Toolbar
    searchInput: "wishes-search-input",
    searchClear: "wishes-search-clear",
    sortSelect: "wishes-sort-select",
    filterPills: ".filter-pill",

    // KPI Metrics
    kpiTotalWishes: "kpi-total-wishes",
    kpiActiveWishes: "kpi-active-wishes",
    modalPlanWishes: "modal-plan-wishes-count",

    // Delete Modal
    modalDeleteWish: "modal-delete-wish-confirm",
    deleteWishName: "delete-wish-recipient-name",
    deleteWishUuid: "delete-wish-uuid",
    btnConfirmDeleteWish: "btn-confirm-delete-wish",
    btnCancelDeleteWish: "btn-cancel-delete-wish",

    // Toast
    toast: "customer-toast"
  };

  /**
   * Helper to retrieve element safely.
   * @param {string} id
   * @returns {HTMLElement|null}
   */
  function el(id) {
    return document.getElementById(id);
  }

  /**
   * Displays non-intrusive toast notification.
   * @param {string} message
   * @param {string} [type="info"]
   */
  function showToast(message, type = "info") {
    const toast = el(DOM.toast);
    if (!toast) return;
    toast.textContent = message;
    toast.className = `customer-toast active ${type}`;
    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.className = "customer-toast";
    }, 3800);
  }

  /**
   * Formats ISO timestamp to human-friendly exact date.
   * Example: "24 Aug 2026"
   * @param {string} isoString
   * @returns {string}
   */
  function formatExactDate(isoString) {
    if (!isoString) return "Recently";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "Recently";
      const day = d.getDate();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (_) {
      return "Recently";
    }
  }

  /**
   * Parses celebration birth date object/string.
   * @param {Object|string} birthDate
   * @returns {string}
   */
  function formatBirthDate(birthDate) {
    if (!birthDate) return "";
    try {
      if (typeof birthDate === "object" && birthDate.day && birthDate.month) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const m = monthNames[(birthDate.month || 1) - 1] || "Jan";
        return `${birthDate.day} ${m}${birthDate.year ? ` ${birthDate.year}` : ""}`;
      }
      if (typeof birthDate === "string" && birthDate.length >= 4) {
        return formatExactDate(birthDate);
      }
    } catch (_) {}
    return "";
  }

  /**
   * Helper to count gallery photos safely.
   * @param {any} gallery
   * @returns {number}
   */
  function countPhotos(gallery) {
    if (!gallery) return 0;
    if (Array.isArray(gallery)) return gallery.length;
    if (typeof gallery === "string") {
      try {
        const parsed = JSON.parse(gallery);
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch (_) {}
    }
    return 0;
  }

  /**
   * Helper to count letter lines safely.
   * @param {any} lines
   * @returns {number}
   */
  function countLetterLines(lines) {
    if (!lines) return 0;
    if (Array.isArray(lines)) return lines.filter(l => typeof l === "string" && l.trim().length > 0).length;
    if (typeof lines === "string") {
      try {
        const parsed = JSON.parse(lines);
        if (Array.isArray(parsed)) return parsed.length;
      } catch (_) {}
      return lines.split("\n").filter(l => l.trim().length > 0).length;
    }
    return 0;
  }

  /**
   * Helper to count timeline milestones safely.
   * @param {any} timeline
   * @returns {number}
   */
  function countMilestones(timeline) {
    if (!timeline) return 0;
    if (Array.isArray(timeline)) return timeline.length;
    if (typeof timeline === "string") {
      try {
        const parsed = JSON.parse(timeline);
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch (_) {}
    }
    return 0;
  }

  /**
   * Queries Supabase for the authenticated customer's owned wishes.
   * PostgreSQL RLS (wishes_select_policy: auth.uid() = owner_id) automatically
   * scopes this query to the authenticated customer only.
   * @param {boolean} [forceRefresh=false]
   * @returns {Promise<Array>}
   */
  async function loadWishes(forceRefresh = false) {
    if (customerWishes.length > 0 && !forceRefresh) {
      return customerWishes;
    }

    try {
      const client = (root.SupabaseModule && typeof root.SupabaseModule.getClient === "function")
        ? root.SupabaseModule.getClient()
        : null;

      if (!client) {
        console.warn("⚠️ CustomerWishes: Supabase client unavailable.");
        return [];
      }

      let customerId = null;
      if (root.CustomerAuth && typeof root.CustomerAuth.getCurrentUser === "function") {
        try {
          const u = await root.CustomerAuth.getCurrentUser();
          if (u && u.id) customerId = u.id;
        } catch (authErr) {}
      }

      if (!customerId) {
        customerWishes = [];
        applyFiltersAndSorting();
        updateKpis();
        return [];
      }

      const CUSTOMER_WISH_COLUMNS = "id, owner_id, recipient_name, sender_name, pass_code, birth_date, letter_lines, memory_text, reasons_json, wishes_json, gallery_json, timeline_json, gift_json, music_url, video_url, cake_flavor, letter_font, letter_theme, status, event_type, created_at, updated_at";

      const { data, error } = await client
        .from("wishes")
        .select(CUSTOMER_WISH_COLUMNS)
        .eq("owner_id", customerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("⚠️ CustomerWishes: Error querying wishes:", error.message);
        customerWishes = [];
      } else {
        customerWishes = Array.isArray(data) ? data : [];
      }

      applyFiltersAndSorting();
      updateKpis();
      return customerWishes;
    } catch (err) {
      console.warn("⚠️ CustomerWishes: loadWishes exception:", err);
      customerWishes = [];
      return [];
    }
  }

  /**
   * Applies active search, filter, and sorting criteria over loaded customer wishes.
   */
  function applyFiltersAndSorting() {
    let result = [...customerWishes];

    // 1. Search Query Filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((w) => {
        const name = (w.recipient_name || "").toLowerCase();
        const from = (w.sender_name || "").toLowerCase();
        const id = (w.id || "").toLowerCase();
        return name.includes(q) || from.includes(q) || id.includes(q);
      });
    }

    // 2. Tab / Pill Filter
    if (activeFilter === "media") {
      result = result.filter((w) => {
        return Boolean(w.music_url || w.video_url || countPhotos(w.gallery_json) > 0);
      });
    } else if (activeFilter === "music") {
      result = result.filter((w) => Boolean(w.music_url));
    } else if (activeFilter === "photos") {
      result = result.filter((w) => countPhotos(w.gallery_json) > 0);
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (activeSort === "newest") {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (activeSort === "oldest") {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (activeSort === "name-asc") {
        return (a.recipient_name || "").localeCompare(b.recipient_name || "");
      }
      if (activeSort === "name-desc") {
        return (b.recipient_name || "").localeCompare(a.recipient_name || "");
      }
      return 0;
    });

    filteredWishes = result;
  }

  /**
   * Updates KPI counts across dashboard overview and modals.
   */
  function updateKpis() {
    const totalKpi = el(DOM.kpiTotalWishes);
    if (totalKpi) totalKpi.textContent = customerWishes.length;

    const activeKpi = el(DOM.kpiActiveWishes);
    if (activeKpi) {
      const activeCount = customerWishes.filter(w => !w.status || w.status === "published" || w.status === "active").length;
      activeKpi.textContent = activeCount;
    }

    const modalPlanWishes = el(DOM.modalPlanWishes);
    if (modalPlanWishes) modalPlanWishes.textContent = `${customerWishes.length} Wishes`;

    const countBadge = el(DOM.resultsCountBadge);
    if (countBadge) {
      if (customerWishes.length === 0) {
        countBadge.textContent = "0 celebrations";
      } else if (filteredWishes.length === customerWishes.length) {
        countBadge.textContent = `${customerWishes.length} ${customerWishes.length === 1 ? "celebration" : "celebrations"}`;
      } else {
        countBadge.textContent = `Showing ${filteredWishes.length} of ${customerWishes.length}`;
      }
    }
  }

  /**
   * Copies public celebration URL to clipboard with fallback.
   * @param {string} wishId
   */
  async function copyWishLink(wishId) {
    if (!wishId) return;
    const origin = (typeof window !== "undefined" && window.location && window.location.origin)
      ? window.location.origin
      : "";
    const publicUrl = `${origin}/?w=${encodeURIComponent(wishId)}`;

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(publicUrl);
      } else {
        const temp = document.createElement("input");
        temp.value = publicUrl;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      showToast("Celebration link copied to clipboard! 📋", "success");
    } catch (_) {
      showToast("Failed to copy link automatically.", "error");
    }
  }

  /**
   * Opens the confirmation modal for deleting a specific celebration.
   * @param {Object} wish
   */
  function confirmDeleteWish(wish) {
    if (!wish || !wish.id) return;
    targetDeleteWish = wish;

    const nameEl = el(DOM.deleteWishName);
    if (nameEl) nameEl.textContent = wish.recipient_name || "Untitled Celebration";

    const uuidEl = el(DOM.deleteWishUuid);
    if (uuidEl) uuidEl.textContent = wish.id;

    const modal = el(DOM.modalDeleteWish);
    if (modal) {
      modal.classList.add("open");
      modal.classList.add("active");
    }
  }

  /**
   * Executes RLS-scoped deletion for the target celebration.
   */
  async function executeDeleteWish() {
    if (!targetDeleteWish || !targetDeleteWish.id || isDeleting) return;

    const btnConfirm = el(DOM.btnConfirmDeleteWish);
    const origText = btnConfirm ? btnConfirm.textContent : "Delete Celebration";

    try {
      isDeleting = true;
      if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.textContent = "Deleting...";
      }

      const client = (root.SupabaseModule && typeof root.SupabaseModule.getClient === "function")
        ? root.SupabaseModule.getClient()
        : null;

      if (!client) {
        throw new Error("Supabase client unavailable.");
      }

      const targetId = targetDeleteWish.id;

      // Execute RLS-scoped delete (PostgreSQL RLS ensures auth.uid() = owner_id)
      const { error } = await client
        .from("wishes")
        .delete()
        .eq("id", targetId);

      if (error) {
        throw new Error(error.message || "Failed to delete celebration record.");
      }

      // Remove locally from state
      customerWishes = customerWishes.filter(w => w.id !== targetId);
      applyFiltersAndSorting();
      updateKpis();

      // Close modal
      const modal = el(DOM.modalDeleteWish);
      if (modal) {
        modal.classList.remove("open");
        modal.classList.remove("active");
      }

      targetDeleteWish = null;
      showToast("Celebration deleted successfully.", "info");

      // Re-render views
      renderMyWishesHub();
      renderRecentOverviewList();
    } catch (err) {
      showToast(err.message || "An error occurred while deleting celebration.", "error");
    } finally {
      isDeleting = false;
      if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.textContent = origText;
      }
    }
  }

  /**
   * Generates HTML markup for rich media indicators on a wish card.
   * @param {Object} w
   * @returns {string}
   */
  function renderMediaChips(w) {
    const photoCount = countPhotos(w.gallery_json);
    const letterCount = countLetterLines(w.letter_lines);
    const timelineCount = countMilestones(w.timeline_json);
    const chips = [];

    if (w.music_url) {
      chips.push(`<span class="media-chip chip-music" title="Background Music Attached">🎵 Music</span>`);
    }
    if (w.video_url) {
      chips.push(`<span class="media-chip chip-video" title="Video Attached">🎥 Video</span>`);
    }
    if (photoCount > 0) {
      chips.push(`<span class="media-chip chip-photos" title="${photoCount} Photos in Gallery">📸 ${photoCount} Photos</span>`);
    }
    if (letterCount > 0) {
      chips.push(`<span class="media-chip chip-letter" title="${letterCount} Letter Lines">📜 Letter</span>`);
    }
    if (timelineCount > 0) {
      chips.push(`<span class="media-chip chip-timeline" title="${timelineCount} Milestones">⏳ ${timelineCount} Events</span>`);
    }

    if (chips.length === 0) {
      chips.push(`<span class="media-chip chip-simple" title="Text Celebration">📝 Simple Wish</span>`);
    }

    return chips.join(" ");
  }

  /**
   * Renders celebration card HTML.
   * @param {Object} w
   * @returns {string}
   */
  function createWishCardHtml(w) {
    const name = w.recipient_name || "Untitled Celebration";
    const sender = w.sender_name ? `From: ${w.sender_name}` : "Created via Celebration Studio";
    const dateStr = formatExactDate(w.created_at);
    const bdayStr = formatBirthDate(w.birth_date);
    const mediaChipsHtml = renderMediaChips(w);
    const maskedId = w.id ? `${w.id.slice(0, 8)}...${w.id.slice(-4)}` : "—";

    return `
      <div class="customer-wish-card" data-wish-id="${w.id}">
        <div class="wish-card-top">
          <div class="wish-card-title-group">
            <div class="wish-card-avatar">🎂</div>
            <div class="wish-card-title-meta">
              <h4 class="wish-card-name" title="${name}">${name}</h4>
              <span class="wish-card-sender">${sender}</span>
            </div>
          </div>
          <span class="wish-card-date">📅 ${dateStr}</span>
        </div>

        ${bdayStr ? `<div class="wish-card-bday-badge">🎉 Celebration Date: <strong>${bdayStr}</strong></div>` : ""}

        <div class="wish-card-chips">
          ${mediaChipsHtml}
        </div>

        <div class="wish-card-uuid-row">
          <span class="uuid-label">Link UUID:</span>
          <code class="uuid-code">${maskedId}</code>
          <button type="button" class="btn-copy-uuid" data-action="copy-link" data-id="${w.id}" title="Copy Public Link">
            📋 Copy
          </button>
        </div>

        <div class="wish-card-actions">
          <a href="/?w=${encodeURIComponent(w.id)}" target="_blank" rel="noopener noreferrer" class="btn-card-action primary" title="View live celebration">
            👁️ View
          </a>
          <button type="button" class="btn-card-action secondary" data-action="edit-wish" data-id="${w.id}" title="Edit celebration in dashboard">
            ✏️ Edit
          </button>
          <button type="button" class="btn-card-action secondary" data-action="copy-link" data-id="${w.id}" title="Copy public link">
            🔗 Share
          </button>
          <button type="button" class="btn-card-action danger" data-action="delete-wish" data-id="${w.id}" title="Delete this celebration">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renders the primary "My Wishes" Hub grid view.
   */
  function renderMyWishesHub() {
    const grid = el(DOM.wishesGrid);
    if (!grid) return;

    applyFiltersAndSorting();
    updateKpis();

    // 1. Zero Total Wishes State
    if (customerWishes.length === 0) {
      grid.innerHTML = `
        <div class="empty-state-card full-span">
          <div class="empty-state-icon">🎁</div>
          <h4>No Celebrations Created Yet</h4>
          <p>You haven't crafted any birthday celebrations under this account. Create your first magical celebration to get started!</p>
          <button type="button" class="banner-action-btn" data-action="create-new-wish" style="display: inline-flex;">
            <span>✨</span> Create Your First Celebration
          </button>
        </div>
      `;

      grid.querySelectorAll("[data-action='create-new-wish']").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (root.CustomerWishEditor && typeof root.CustomerWishEditor.openNew === "function") {
            root.CustomerWishEditor.openNew();
          }
        });
      });
      return;
    }

    // 2. Zero Search / Filter Results State
    if (filteredWishes.length === 0) {
      grid.innerHTML = `
        <div class="empty-state-card full-span">
          <div class="empty-state-icon">🔍</div>
          <h4>No Matching Celebrations</h4>
          <p>No celebrations matched your current search query <em>"${searchQuery}"</em> or active filter.</p>
          <button type="button" class="btn-quick-action secondary" id="btn-reset-wishes-filters" style="margin: 0 auto; display: inline-flex;">
            Reset Search & Filters
          </button>
        </div>
      `;

      const btnReset = el("btn-reset-wishes-filters");
      if (btnReset) {
        btnReset.addEventListener("click", () => {
          searchQuery = "";
          activeFilter = "all";
          const input = el(DOM.searchInput);
          if (input) input.value = "";
          document.querySelectorAll(DOM.filterPills).forEach(p => {
            p.classList.toggle("active", p.getAttribute("data-filter") === "all");
          });
          renderMyWishesHub();
        });
      }
      return;
    }

    // 3. Render Celebration Cards Grid
    let cardsHtml = "";
    filteredWishes.forEach((w) => {
      cardsHtml += createWishCardHtml(w);
    });
    grid.innerHTML = cardsHtml;

    // Attach card event listeners
    grid.querySelectorAll("[data-action='copy-link']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.getAttribute("data-id");
        copyWishLink(id);
      });
    });

    grid.querySelectorAll("[data-action='edit-wish']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.getAttribute("data-id");
        if (root.CustomerWishEditor && typeof root.CustomerWishEditor.openEdit === "function") {
          root.CustomerWishEditor.openEdit(id);
        }
      });
    });

    grid.querySelectorAll("[data-action='delete-wish']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.getAttribute("data-id");
        const wish = customerWishes.find(w => w.id === id);
        if (wish) confirmDeleteWish(wish);
      });
    });
  }

  /**
   * Renders the recent celebrations list on the Overview tab.
   */
  function renderRecentOverviewList() {
    const container = el(DOM.overviewList);
    if (!container) return;

    if (customerWishes.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">🎁</div>
          <h4>No Celebrations Created Yet</h4>
          <p>You haven't crafted any birthday wishes under this account. Create your first magical celebration to get started!</p>
          <button type="button" class="banner-action-btn" data-action="create-new-wish" style="display: inline-flex;">
            <span>✨</span> Create Your First Celebration
          </button>
        </div>
      `;

      container.querySelectorAll("[data-action='create-new-wish']").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (root.CustomerWishEditor && typeof root.CustomerWishEditor.openNew === "function") {
            root.CustomerWishEditor.openNew();
          }
        });
      });
      return;
    }

    const recent = customerWishes.slice(0, 5);
    let listHtml = `<div class="overview-wishes-list">`;

    recent.forEach((w) => {
      const dateStr = formatExactDate(w.created_at);
      const name = w.recipient_name || "Untitled Celebration";
      const chips = renderMediaChips(w);

      listHtml += `
        <div class="overview-wish-item">
          <div class="overview-wish-info">
            <div class="overview-wish-name">🎂 ${name}</div>
            <div class="overview-wish-meta">Created on ${dateStr} • ${chips}</div>
          </div>
          <div class="overview-wish-actions">
            <a href="/?w=${encodeURIComponent(w.id)}" target="_blank" rel="noopener noreferrer" class="btn-quick-action secondary" style="padding: 6px 12px; font-size: 0.82rem;">
              👁️ View
            </a>
            <button type="button" class="btn-quick-action primary" data-action="overview-edit" data-id="${w.id}" style="padding: 6px 12px; font-size: 0.82rem;">
              ✏️ Edit
            </button>
            <button type="button" class="btn-quick-action secondary" data-action="overview-copy" data-id="${w.id}" style="padding: 6px 10px; font-size: 0.82rem;">
              📋
            </button>
          </div>
        </div>
      `;
    });

    listHtml += `</div>`;
    container.innerHTML = listHtml;

    container.querySelectorAll("[data-action='overview-copy']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        copyWishLink(id);
      });
    });

    container.querySelectorAll("[data-action='overview-edit']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (root.CustomerWishEditor && typeof root.CustomerWishEditor.openEdit === "function") {
          root.CustomerWishEditor.openEdit(id);
        }
      });
    });
  }

  /**
   * Initializes event listeners for search, filter pills, sorting, and deletion modal.
   */
  function initEvents() {
    // 1. Search Input & Clear
    const searchInput = el(DOM.searchInput);
    const searchClear = el(DOM.searchClear);

    if (searchInput) {
      let debounceTimer = null;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          searchQuery = e.target.value;
          if (searchClear) {
            searchClear.style.display = searchQuery.length > 0 ? "flex" : "none";
          }
          renderMyWishesHub();
        }, 150);
      });
    }

    if (searchClear) {
      searchClear.addEventListener("click", () => {
        searchQuery = "";
        if (searchInput) searchInput.value = "";
        searchClear.style.display = "none";
        renderMyWishesHub();
      });
    }

    // 2. Filter Pills
    document.querySelectorAll(DOM.filterPills).forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(DOM.filterPills).forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        activeFilter = pill.getAttribute("data-filter") || "all";
        renderMyWishesHub();
      });
    });

    // 3. Sort Select
    const sortSelect = el(DOM.sortSelect);
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        activeSort = e.target.value || "newest";
        renderMyWishesHub();
      });
    }

    // 4. Deletion Modal Confirm & Cancel Buttons
    const btnConfirmDelete = el(DOM.btnConfirmDeleteWish);
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener("click", executeDeleteWish);
    }

    const btnCancelDelete = el(DOM.btnCancelDeleteWish);
    if (btnCancelDelete) {
      btnCancelDelete.addEventListener("click", () => {
        const modal = el(DOM.modalDeleteWish);
        if (modal) {
          modal.classList.remove("open");
          modal.classList.remove("active");
        }
        targetDeleteWish = null;
      });
    }
  }

  /**
   * Main Initialization
   */
  function init() {
    initEvents();
  }

  // Public Interface
  root.CustomerWishes = {
    init,
    loadWishes,
    renderMyWishesHub,
    renderRecentOverviewList,
    copyWishLink,
    confirmDeleteWish,
    executeDeleteWish,
    formatExactDate,
    getWishes: () => customerWishes,
    getFilteredWishes: () => filteredWishes
  };

})(typeof window !== "undefined" ? window : globalThis);
