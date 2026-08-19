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
    sortSelect: "wishes-sort-select",
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
     4. ADMIN CREATE / EDIT BRIDGE
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
     5. DATA LOADING & SYNCHRONIZATION
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
     6. SEARCH, SORT & FILTERING
     ============================================================ */
  /**
   * Filters and sorts the wishes list based on toolbar search term and sort selection.
   * @returns {Array} Processed wishes array ready for display.
   */
  function getProcessedWishes() {
    const searchInput = document.getElementById(SELECTORS.searchInput);
    const sortSelect = document.getElementById(SELECTORS.sortSelect);

    const searchTerm = (searchInput?.value || "").toLowerCase().trim();
    const sortVal = sortSelect?.value || "newest";

    let filtered = wishesState.filter(w => {
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

    return filtered;
  }

  /* ============================================================
     7. TABLE RENDERING
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

    // Error State
    if (isQueryError) {
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

    tbody.innerHTML = "";

    // Empty State
    if (filtered.length === 0) {
      const searchInput = document.getElementById(SELECTORS.searchInput);
      const isSearching = !!searchInput?.value?.trim();
      const emptyMsg = isSearching
        ? "No wishes match your search criteria. 🔍"
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
    openWishEditor
  });

})(window);
