/**
 * ============================================================================
 * ADMIN STUDIO WISHES MODULE (js/admin/admin-wishes.js)
 * Manages Wishes Management view, live table rendering, real-time search,
 * sorting, row actions (edit, duplicate, delete, copy URL), and state sync.
 * ============================================================================
 */

(function (window) {
  "use strict";

  // Reusable core utilities
  const { showToast, copyWishUrl } = window.AdminCore || {};

  /* ============================================================
     1. CONSTANTS & SELECTORS
     ============================================================ */
  const SELECTORS = {
    tbody: "wishes-tbody",
    searchInput: "wishes-search-input",
    searchClearBtn: "btn-wishes-search-clear",
    sortSelect: "wishes-sort-select",
    filterMedia: "wishes-filter-media",
    filterDate: "wishes-filter-date",
    countBadge: "wishes-count-badge",
    createBtn: "btn-create-new-wish-wishes",
    createBtnFallback: "btn-create-new-wish-admin"
  };

  /* ============================================================
     2. MODULE STATE
     ============================================================ */
  let wishesState = [];
  let isQueryError = false;
  let onStateChangeHook = null;

  /* ============================================================
     3. SANITIZATION HELPER
     ============================================================ */
  /**
   * Sanitizes string against HTML/script injection before inserting into the DOM.
   * @param {string|any} str - Input text.
   * @returns {string} Sanitized safe string.
   */
  function escapeHtml(str) {
    if (window.AdminDashboard && typeof window.AdminDashboard.escapeHtml === "function") {
      return window.AdminDashboard.escapeHtml(str);
    }
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ============================================================
     4. FILTER & MEDIA HELPERS
     ============================================================ */
  /**
   * Checks if a wish record contains stored music.
   * @param {Object} w - Wish record.
   * @returns {boolean}
   */
  function hasMusic(w) {
    return Boolean(w && w.music_url && typeof w.music_url === "string" && w.music_url.trim().length > 0);
  }

  /**
   * Checks if a wish record contains stored video.
   * @param {Object} w - Wish record.
   * @returns {boolean}
   */
  function hasVideo(w) {
    return Boolean(w && w.video_url && typeof w.video_url === "string" && w.video_url.trim().length > 0);
  }

  /**
   * Checks if a wish record contains stored gallery photos.
   * @param {Object} w - Wish record.
   * @returns {boolean}
   */
  function hasPhotos(w) {
    if (!w) return false;
    let raw = w.gallery_json;
    if (typeof raw === "string") {
      try { raw = JSON.parse(raw); } catch (e) { return false; }
    }
    if (!Array.isArray(raw) || raw.length === 0) return false;
    return raw.some(item => {
      if (!item) return false;
      if (typeof item === "string") return item.trim().length > 0;
      return Boolean((item.image && item.image.trim()) || (item.url && item.url.trim()) || (item.file && item.file.trim()) || (item.src && item.src.trim()));
    });
  }

  /**
   * Checks if a wish record matches the selected creation date filter.
   * @param {Object} w - Wish record.
   * @param {string} dateFilter - Filter value ('all', 'today', '7d', '30d').
   * @returns {boolean}
   */
  function matchesDateFilter(w, dateFilter) {
    if (!dateFilter || dateFilter === "all") return true;
    if (!w || !w.created_at) return false;

    const createdTime = new Date(w.created_at).getTime();
    if (isNaN(createdTime)) return false;

    const now = Date.now();

    if (dateFilter === "today") {
      const createdDate = new Date(w.created_at);
      const today = new Date();
      return (
        createdDate.getFullYear() === today.getFullYear() &&
        createdDate.getMonth() === today.getMonth() &&
        createdDate.getDate() === today.getDate()
      );
    }

    if (dateFilter === "7d") {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      return (now - createdTime >= 0) && (now - createdTime <= sevenDaysMs);
    }

    if (dateFilter === "30d") {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      return (now - createdTime >= 0) && (now - createdTime <= thirtyDaysMs);
    }

    return true;
  }

  /* ============================================================
     5. ADMIN CREATE / EDIT BRIDGE
     ============================================================ */
  /**
   * Authoritative Admin -> Quick Editor launcher.
   * Directs to the approved URL flows:
   *   - New Wish: index.html?admin_edit=new&return=admin
   *   - Existing: index.html?w={UUID}&admin_edit=true&return=admin
   * @param {string|null} [wishId=null] - UUID of wish to edit, or null for new wish.
   */
  function openWishEditor(wishId = null) {
    if (window.AdminWishEditor) {
      if (wishId) {
        window.AdminWishEditor.openEdit(wishId);
      } else {
        window.AdminWishEditor.openNew();
      }
      return;
    }
    // Fallback: compatibility route to public editor
    const target = wishId
      ? `index.html?w=${encodeURIComponent(wishId)}&admin_edit=true&return=admin`
      : `index.html?admin_edit=new&return=admin`;
    window.location.href = target;
  }

  /* ============================================================
     6. DATA LOADING & SYNCHRONIZATION
     ============================================================ */
  /**
   * Sets the active wishes data array and refreshes the table view.
   * @param {Array} data - Array of wish records.
   * @param {boolean} [isError=false] - Error flag from query.
   */
  function setWishes(data = [], isError = false) {
    wishesState = Array.isArray(data) ? data : [];
    isQueryError = !!isError;
    render();
  }

  /**
   * Returns a copy of the current in-memory wishes list.
   * @returns {Array} Wishes array.
   */
  function getWishes() {
    return [...wishesState];
  }

  /* ============================================================
     7. SEARCH, SORT & FILTERING
     ============================================================ */
  /**
   * Filters and sorts the wishes list based on toolbar search term, media filter, date filter, and sort selection.
   * @returns {Array} Processed wishes array ready for display.
   */
  function getProcessedWishes() {
    const searchInput = document.getElementById(SELECTORS.searchInput);
    const sortSelect = document.getElementById(SELECTORS.sortSelect);
    const mediaSelect = document.getElementById(SELECTORS.filterMedia);
    const dateSelect = document.getElementById(SELECTORS.filterDate);

    const searchTerm = (searchInput?.value || "").toLowerCase().trim();
    const sortVal = sortSelect?.value || "newest";
    const mediaVal = mediaSelect?.value || "all";
    const dateVal = dateSelect?.value || "all";

    // 1. Search filter (Recipient Name, Sender Name, UUID)
    let filtered = wishesState.filter(w => {
      if (!searchTerm) return true;
      const name = (w.recipient_name || "").toLowerCase();
      const sender = (w.sender_name || "").toLowerCase();
      const id = (w.id || "").toLowerCase();
      return name.includes(searchTerm) || sender.includes(searchTerm) || id.includes(searchTerm);
    });

    // 2. Media presence filter
    if (mediaVal === "music") {
      filtered = filtered.filter(hasMusic);
    } else if (mediaVal === "video") {
      filtered = filtered.filter(hasVideo);
    } else if (mediaVal === "photos") {
      filtered = filtered.filter(hasPhotos);
    } else if (mediaVal === "text_only") {
      filtered = filtered.filter(w => !hasMusic(w) && !hasVideo(w) && !hasPhotos(w));
    }

    // 3. Creation date filter
    if (dateVal !== "all") {
      filtered = filtered.filter(w => matchesDateFilter(w, dateVal));
    }

    // 4. Existing Sort
    if (sortVal === "oldest") {
      filtered.reverse();
    } else if (sortVal === "name") {
      filtered.sort((a, b) => (a.recipient_name || "").localeCompare(b.recipient_name || ""));
    }

    return filtered;
  }

  /* ============================================================
     8. TABLE RENDERING
     ============================================================ */
  /**
   * Renders the Wishes table in the Admin Studio view.
   * @param {Array} [data] - Optional override dataset.
   * @param {boolean} [isError] - Optional override error state.
   */
  function render(data, isError) {
    const tbody = document.getElementById(SELECTORS.tbody);
    if (!tbody) return;

    if (typeof data !== "undefined") wishesState = Array.isArray(data) ? data : [];
    if (typeof isError !== "undefined") isQueryError = !!isError;

    // Update search clear button visibility
    const searchInput = document.getElementById(SELECTORS.searchInput);
    const searchClearBtn = document.getElementById(SELECTORS.searchClearBtn);
    if (searchClearBtn) {
      const hasSearchVal = Boolean(searchInput && searchInput.value && searchInput.value.trim().length > 0);
      searchClearBtn.style.display = hasSearchVal ? "inline-flex" : "none";
    }

    // Error State
    if (isQueryError) {
      const countBadge = document.getElementById(SELECTORS.countBadge);
      if (countBadge) {
        countBadge.textContent = "Showing 0 of 0 wishes";
      }
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;color:#ef4444;padding:32px;">
            ⚠️ Unable to load wishes from Supabase database. Check database connectivity.
          </td>
        </tr>
      `;
      return;
    }

    const filtered = getProcessedWishes();

    // Update live count badge: Showing X of Y wishes
    const countBadge = document.getElementById(SELECTORS.countBadge);
    if (countBadge) {
      countBadge.textContent = `Showing ${filtered.length} of ${wishesState.length} wishes`;
    }

    tbody.innerHTML = "";

    // Empty State
    if (filtered.length === 0) {
      const isSearchingOrFiltering = Boolean(
        (searchInput?.value?.trim()) ||
        (document.getElementById(SELECTORS.filterMedia)?.value && document.getElementById(SELECTORS.filterMedia)?.value !== "all") ||
        (document.getElementById(SELECTORS.filterDate)?.value && document.getElementById(SELECTORS.filterDate)?.value !== "all")
      );
      const emptyMsg = isSearchingOrFiltering
        ? "No wishes match your search or filter criteria. 🔍"
        : "No stored wishes found. Create a wish using the public wish generator! ✨";

      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">
            ${emptyMsg}
          </td>
        </tr>
      `;
      return;
    }

    // Populate rows
    filtered.forEach(w => {
      const tr = document.createElement("tr");
      const shortId = w.id ? (w.id.substring(0, 13) + "...") : "Local";
      const fullUrl = `${window.location.origin}/?w=${encodeURIComponent(w.id || "")}`;
      const recipientName = escapeHtml(w.recipient_name || "Friend");
      const senderName = escapeHtml(w.sender_name || "Friend");
      const avatarInitial = escapeHtml((w.recipient_name || "W").charAt(0).toUpperCase());
      const passcodeText = escapeHtml(w.pass_code || "1234");
      const dateText = w.created_at ? new Date(w.created_at).toLocaleDateString() : "Recent";
      const rawId = escapeHtml(w.id || "");

      tr.innerHTML = `
        <td>
          <div class="user-cell">
            <div class="user-avatar">${avatarInitial}</div>
            <div>
              <strong>${recipientName}</strong>
              <div style="font-size:0.75rem;color:var(--text-dim);">ID: ${escapeHtml(shortId)}</div>
            </div>
          </div>
        </td>
        <td>${senderName}</td>
        <td><span class="status-badge active">🔑 ${passcodeText}</span></td>
        <td><button class="btn-sm" onclick="window.adminApp ? window.adminApp.copyWishUrl('${fullUrl}') : (window.AdminCore && window.AdminCore.copyWishUrl('${fullUrl}'))">📋 Copy UUID Link</button></td>
        <td>${escapeHtml(dateText)}</td>
        <td>
          <div class="action-btns">
            <a class="btn-icon" href="${fullUrl}" target="_blank" title="Open Public Page">👁️</a>
            <button class="btn-icon" title="Edit Wish" data-action="edit" data-id="${rawId}">✏️</button>
            <button class="btn-icon" title="Duplicate Wish" data-action="duplicate" data-id="${rawId}">📋</button>
            <button class="btn-icon danger" title="Delete Wish" data-action="delete" data-id="${rawId}">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  const SYSTEM_CONFIG_UUID = "00000000-0000-0000-0000-000000000001";

  /* ============================================================
     8. ROW ACTIONS (REAL DELETE & REAL DUPLICATE)
     ============================================================ */
  /**
   * Deletes a wish record from Supabase table 'public.wishes' and refreshes live dashboard state.
   * @param {string} id - Wish primary UUID.
   * @param {HTMLElement} [triggeringBtn=null] - Optional button element for loading indicator.
   */
  async function deleteWish(id, triggeringBtn = null) {
    if (!id || typeof id !== "string") return;
    const cleanId = id.trim();
    if (cleanId === SYSTEM_CONFIG_UUID) {
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast("Cannot delete system configuration record ⚠️");
      }
      return;
    }

    const item = wishesState.find(w => w.id === cleanId);
    const wishName = item ? (item.recipient_name || "Friend") : "this wish";

    const confirmMsg = `Delete "${wishName}"?\n\nThis action cannot be undone.`;
    if (typeof window.confirm === "function" && !window.confirm(confirmMsg)) return;

    if (triggeringBtn) {
      triggeringBtn.disabled = true;
      triggeringBtn.style.opacity = "0.5";
      triggeringBtn.dataset.originalText = triggeringBtn.textContent;
      triggeringBtn.textContent = "⏳";
    }

    try {
      if (!window.DatabaseModule || typeof window.DatabaseModule.deleteWish !== "function") {
        throw new Error("DatabaseModule.deleteWish is unavailable");
      }

      const res = await window.DatabaseModule.deleteWish(cleanId);
      if (!res || !res.success) {
        throw new Error(res?.error || "Failed to delete wish from database");
      }

      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast("Wish record deleted 🗑️");
      }

      if (typeof onStateChangeHook === "function") {
        await onStateChangeHook("WISH_DELETED", `Deleted wish record ID: ${cleanId}`, cleanId);
      }
    } catch (err) {
      console.error("❌ AdminWishes: Delete error:", err);
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast(`Delete failed: ${err.message} ⚠️`);
      }
      if (triggeringBtn) {
        triggeringBtn.disabled = false;
        triggeringBtn.style.opacity = "1";
        triggeringBtn.textContent = triggeringBtn.dataset.originalText || "🗑️";
      }
    }
  }

  /**
   * Duplicates an existing wish record with a real new UUID in Supabase and refreshes live dashboard state.
   * @param {string} id - Wish primary UUID to duplicate.
   * @param {HTMLElement} [triggeringBtn=null] - Optional button element for loading indicator.
   */
  async function duplicateWish(id, triggeringBtn = null) {
    if (!id || typeof id !== "string") return;
    const cleanId = id.trim();
    if (cleanId === SYSTEM_CONFIG_UUID) {
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast("Cannot duplicate system configuration record ⚠️");
      }
      return;
    }

    if (triggeringBtn) {
      triggeringBtn.disabled = true;
      triggeringBtn.style.opacity = "0.5";
      triggeringBtn.dataset.originalText = triggeringBtn.textContent;
      triggeringBtn.textContent = "⏳";
    }

    try {
      if (!window.DatabaseModule || typeof window.DatabaseModule.duplicateWish !== "function") {
        throw new Error("DatabaseModule.duplicateWish is unavailable");
      }

      const res = await window.DatabaseModule.duplicateWish(cleanId);
      if (!res || !res.success || !res.newId) {
        throw new Error(res?.error || "Failed to duplicate wish in database");
      }

      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast(`Wish record duplicated 📋 (UUID: ${res.newId.substring(0, 8)}...)`);
      }

      if (typeof onStateChangeHook === "function") {
        await onStateChangeHook("WISH_DUPLICATED", `Duplicated wish record ID: ${cleanId} -> ${res.newId}`, res.newId);
      }
    } catch (err) {
      console.error("❌ AdminWishes: Duplicate error:", err);
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast(`Duplication failed: ${err.message} ⚠️`);
      }
      if (triggeringBtn) {
        triggeringBtn.disabled = false;
        triggeringBtn.style.opacity = "1";
        triggeringBtn.textContent = triggeringBtn.dataset.originalText || "📋";
      }
    }
  }

  /* ============================================================
     9. EVENT HANDLERS & INITIALIZATION
     ============================================================ */
  /**
   * Initializes Wishes toolbar event listeners (search, sort, create) and table action delegation.
   * @param {Function} [onStateChangeCallback] - Callback triggered when state mutates.
   */
  function init(onStateChangeCallback) {
    if (typeof onStateChangeCallback === "function") {
      onStateChangeHook = onStateChangeCallback;
    }

    // Search Input Listener
    const searchInput = document.getElementById(SELECTORS.searchInput);
    if (searchInput && !searchInput.__wishesBound) {
      searchInput.__wishesBound = true;
      searchInput.addEventListener("input", () => { render(); });
    }

    // Search Clear Button Listener
    const searchClearBtn = document.getElementById(SELECTORS.searchClearBtn);
    if (searchClearBtn && !searchClearBtn.__wishesBound) {
      searchClearBtn.__wishesBound = true;
      searchClearBtn.addEventListener("click", () => {
        if (searchInput) {
          searchInput.value = "";
          searchInput.focus();
        }
        render();
      });
    }

    // Media Filter Dropdown Listener
    const mediaFilter = document.getElementById(SELECTORS.filterMedia);
    if (mediaFilter && !mediaFilter.__wishesBound) {
      mediaFilter.__wishesBound = true;
      mediaFilter.addEventListener("change", () => { render(); });
    }

    // Date Filter Dropdown Listener
    const dateFilter = document.getElementById(SELECTORS.filterDate);
    if (dateFilter && !dateFilter.__wishesBound) {
      dateFilter.__wishesBound = true;
      dateFilter.addEventListener("change", () => { render(); });
    }

    // Sort Dropdown Listener
    const sortSelect = document.getElementById(SELECTORS.sortSelect);
    if (sortSelect && !sortSelect.__wishesBound) {
      sortSelect.__wishesBound = true;
      sortSelect.addEventListener("change", () => { render(); });
    }

    // Create New Wish Button Listener
    const createBtn = document.getElementById(SELECTORS.createBtn) || document.getElementById(SELECTORS.createBtnFallback);
    if (createBtn && !createBtn.__wishesBound) {
      createBtn.__wishesBound = true;
      createBtn.addEventListener("click", () => {
        openWishEditor(null);
      });
    }

    // Event Delegation for Table Action Buttons
    const tbody = document.getElementById(SELECTORS.tbody);
    if (tbody && !tbody.__wishesActionsBound) {
      tbody.__wishesActionsBound = true;
      tbody.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === "edit") {
          openWishEditor(id);
        } else if (action === "duplicate") {
          await duplicateWish(id, btn);
        } else if (action === "delete") {
          await deleteWish(id, btn);
        }
      });
    }
  }

  /* ============================================================
     10. AUTHORITATIVE PUBLIC API
     ============================================================ */
  window.AdminWishes = Object.freeze({
    init,
    render,
    setWishes,
    getWishes,
    deleteWish,
    duplicateWish,
    getProcessedWishes,
    openWishEditor,
    hasMusic,
    hasVideo,
    hasPhotos,
    matchesDateFilter
  });

})(window);
