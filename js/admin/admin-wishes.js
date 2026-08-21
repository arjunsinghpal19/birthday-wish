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
    selectionBadge: "wishes-selection-badge",
    selectedCount: "wishes-selected-count",
    bulkCopyLinksBtn: "btn-wishes-bulk-copy-links",
    bulkCopyLinksCount: "wishes-bulk-copy-links-count",
    bulkExportBtn: "btn-wishes-bulk-export",
    bulkExportCount: "wishes-bulk-export-count",
    bulkDuplicateBtn: "btn-wishes-bulk-duplicate",
    bulkDuplicateCount: "wishes-bulk-duplicate-count",
    bulkDeleteBtn: "btn-wishes-bulk-delete",
    bulkDeleteCount: "wishes-bulk-delete-count",
    clearSelectionBtn: "btn-wishes-clear-selection",
    selectAllCheckbox: "wishes-select-all",
    createBtn: "btn-create-new-wish-wishes",
    createBtnFallback: "btn-create-new-wish-admin",
    pageSizeSelect: "wishes-page-size",
    prevPageBtn: "btn-wishes-prev-page",
    nextPageBtn: "btn-wishes-next-page",
    pageInfo: "wishes-page-info",
    paginationContainer: "wishes-pagination-container"
  };

  /* ============================================================
     2. MODULE STATE
     ============================================================ */
  let wishesState = [];
  let isQueryError = false;
  let onStateChangeHook = null;
  let selectedWishIds = new Set();
  let currentSort = {
    field: "created",    // "created" | "recipient" | "sender"
    direction: "desc"    // "asc" | "desc"
  };
  let paginationState = {
    currentPage: 1,
    pageSize: 10
  };

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
    return getPhotoCount(w) > 0;
  }

  /**
   * Returns valid photo count in wish record.
   * @param {Object} w - Wish record.
   * @returns {number} Photo count.
   */
  function getPhotoCount(w) {
    if (!w) return 0;
    let raw = w.gallery_json;
    if (typeof raw === "string") {
      try { raw = JSON.parse(raw); } catch (e) { return 0; }
    }
    if (!Array.isArray(raw) || raw.length === 0) return 0;
    return raw.filter(item => {
      if (!item) return false;
      if (typeof item === "string") return item.trim().length > 0;
      return Boolean((item.image && item.image.trim()) || (item.url && item.url.trim()) || (item.file && item.file.trim()) || (item.src && item.src.trim()));
    }).length;
  }

  /**
   * Returns count of letter lines in wish record.
   * @param {Object} w - Wish record.
   * @returns {number} Line count.
   */
  function getLetterCount(w) {
    if (!w) return 0;
    let lines = w.letter_lines || w.letter_json;
    if (typeof lines === "string") {
      try { lines = JSON.parse(lines); } catch (e) { lines = lines.split("\n"); }
    }
    if (!Array.isArray(lines) || lines.length === 0) return 0;
    return lines.filter(l => typeof l === "string" && l.trim().length > 0).length;
  }

  /**
   * Returns count of timeline milestones in wish record.
   * @param {Object} w - Wish record.
   * @returns {number} Milestone count.
   */
  function getTimelineCount(w) {
    if (!w) return 0;
    let raw = w.timeline_json;
    if (typeof raw === "string") {
      try { raw = JSON.parse(raw); } catch (e) { return 0; }
    }
    if (!Array.isArray(raw) || raw.length === 0) return 0;
    return raw.filter(m => m && (m.title || m.date || m.desc || m.year)).length;
  }

  /**
   * Extracts #bw-start offset in seconds from media URL.
   * @param {string} url - Media URL.
   * @returns {number} Start offset in seconds.
   */
  function getMediaOffset(url) {
    if (!url || typeof url !== "string") return 0;
    const match = url.match(/#bw-start=(\d+)/i);
    return match ? (parseInt(match[1], 10) || 0) : 0;
  }

  /**
   * Formats seconds into MM:SS display string.
   * @param {number} sec - Offset seconds.
   * @returns {string} MM:SS string.
   */
  function formatOffset(sec) {
    if (!sec || isNaN(sec) || sec <= 0) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  /**
   * Generates safe HTML string representing content and media badges for a wish.
   * Does NOT mutate the wish object.
   * @param {Object} w - Wish record.
   * @returns {string} HTML string of badges.
   */
  function renderContentBadges(w) {
    if (!w) return `<div class="wish-media-badges"><span class="content-badge badge-text-only" title="📝 Text-only wish">📝 Text Only</span></div>`;
    const badges = [];

    const musicActive = hasMusic(w);
    const videoActive = hasVideo(w);
    const photoCount = getPhotoCount(w);
    const letterCount = getLetterCount(w);
    const timelineCount = getTimelineCount(w);

    // 1. Music Indicator
    if (musicActive) {
      const offset = getMediaOffset(w.music_url);
      const tooltip = offset > 0 ? `🎵 Music attached (starts at ${formatOffset(offset)})` : "🎵 Music attached";
      badges.push(`<span class="content-badge badge-music" title="${escapeHtml(tooltip)}">🎵 Music</span>`);
    }

    // 2. Video Indicator
    if (videoActive) {
      const offset = getMediaOffset(w.video_url);
      const tooltip = offset > 0 ? `🎥 Video attached (starts at ${formatOffset(offset)})` : "🎥 Video attached";
      badges.push(`<span class="content-badge badge-video" title="${escapeHtml(tooltip)}">🎥 Video</span>`);
    }

    // 3. Photos Indicator
    if (photoCount > 0) {
      badges.push(`<span class="content-badge badge-photos" title="📸 ${photoCount} Photos in Gallery">📸 ${photoCount}</span>`);
    }

    // 4. Letter Indicator
    if (letterCount > 0) {
      badges.push(`<span class="content-badge badge-letter" title="📜 ${letterCount} Letter Lines">📜 ${letterCount}</span>`);
    }

    // 5. Timeline Indicator
    if (timelineCount > 0) {
      badges.push(`<span class="content-badge badge-timeline" title="⏳ ${timelineCount} Timeline Milestones">⏳ ${timelineCount}</span>`);
    }

    // 6. Text Only Indicator (if no music, video, or photos)
    if (!musicActive && !videoActive && photoCount === 0) {
      badges.unshift(`<span class="content-badge badge-text-only" title="📝 Text-only wish (no media)">📝 Text Only</span>`);
    }

    return `<div class="wish-media-badges">${badges.join("")}</div>`;
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
     5. SORTING STATE HELPERS & INDICATORS
     ============================================================ */
  /**
   * Sets the authoritative sort state and synchronizes the dropdown control.
   * @param {string} field - Sort field ('created', 'recipient', 'sender').
   * @param {string} direction - Sort direction ('asc', 'desc').
   */
  function setSortState(field, direction) {
    currentSort = {
      field: field || "created",
      direction: direction === "asc" ? "asc" : "desc"
    };

    const sortSelect = document.getElementById(SELECTORS.sortSelect);
    if (sortSelect) {
      if (currentSort.field === "created") {
        sortSelect.value = currentSort.direction === "desc" ? "newest" : "oldest";
      } else if (currentSort.field === "recipient") {
        sortSelect.value = currentSort.direction === "asc" ? "name_asc" : "name_desc";
      } else if (currentSort.field === "sender") {
        sortSelect.value = currentSort.direction === "asc" ? "sender_asc" : "sender_desc";
      }
    }
  }

  /**
   * Parses dropdown value into authoritative sort state.
   * @param {string} val - Dropdown value.
   */
  function setSortFromDropdown(val) {
    if (val === "oldest" || val === "created_asc") {
      currentSort = { field: "created", direction: "asc" };
    } else if (val === "name" || val === "name_asc" || val === "recipient_asc") {
      currentSort = { field: "recipient", direction: "asc" };
    } else if (val === "name_desc" || val === "recipient_desc") {
      currentSort = { field: "recipient", direction: "desc" };
    } else if (val === "sender_asc") {
      currentSort = { field: "sender", direction: "asc" };
    } else if (val === "sender_desc") {
      currentSort = { field: "sender", direction: "desc" };
    } else { // "newest", "created_desc", default
      currentSort = { field: "created", direction: "desc" };
    }
  }

  /**
   * Toggles sort direction for a given field or activates new sort field.
   * @param {string} field - Target column field ('recipient', 'sender', 'created').
   */
  function toggleSortByField(field) {
    if (currentSort.field === field) {
      currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
    } else {
      currentSort.field = field;
      currentSort.direction = (field === "created") ? "desc" : "asc";
    }

    // Sync dropdown
    const sortSelect = document.getElementById(SELECTORS.sortSelect);
    if (sortSelect) {
      if (currentSort.field === "created") {
        sortSelect.value = currentSort.direction === "desc" ? "newest" : "oldest";
      } else if (currentSort.field === "recipient") {
        sortSelect.value = currentSort.direction === "asc" ? "name_asc" : "name_desc";
      } else if (currentSort.field === "sender") {
        sortSelect.value = currentSort.direction === "asc" ? "sender_asc" : "sender_desc";
      }
    }

    render();
  }

  /**
   * Returns current active sort state.
   * @returns {{field: string, direction: string}}
   */
  function getSortState() {
    return { ...currentSort };
  }

  /**
   * Updates sortable table header visual indicators and aria attributes based on currentSort state.
   */
  function updateSortIndicators() {
    const fields = ["recipient", "sender", "created"];
    fields.forEach(f => {
      const iconEl = document.getElementById(`sort-icon-${f}`);
      const thEl = typeof document.querySelector === "function" ? document.querySelector(`th[data-sort="${f}"]`) : null;

      if (currentSort.field === f) {
        if (iconEl) {
          iconEl.textContent = currentSort.direction === "asc" ? "↑" : "↓";
          iconEl.classList.add("active");
        }
        if (thEl) {
          thEl.setAttribute("aria-sort", currentSort.direction === "asc" ? "ascending" : "descending");
          thEl.classList.add("sorted");
        }
      } else {
        if (iconEl) {
          iconEl.textContent = "↕";
          iconEl.classList.remove("active");
        }
        if (thEl) {
          thEl.removeAttribute("aria-sort");
          thEl.classList.remove("sorted");
        }
      }
    });
  }

  /* ============================================================
     6. PAGINATION STATE HELPERS & CONTROLS
     ============================================================ */
  /**
   * Returns current active page number (1-indexed).
   * @returns {number}
   */
  function getPage() {
    return paginationState.currentPage;
  }

  /**
   * Sets active page number (auto-clamped between 1 and totalPages) and triggers re-render.
   * @param {number|string} pageNum - Target page.
   */
  function setPage(pageNum) {
    const num = parseInt(pageNum, 10);
    if (!isNaN(num)) {
      const totalPages = getTotalPages();
      paginationState.currentPage = Math.min(Math.max(1, num), totalPages);
      render();
    }
  }

  /**
   * Returns current page size ('all' or numeric).
   * @returns {number|string}
   */
  function getPageSize() {
    return (paginationState.pageSize === Infinity || paginationState.pageSize === "all") ? "all" : paginationState.pageSize;
  }

  /**
   * Sets page size, resets currentPage to 1, and triggers re-render.
   * @param {number|string} size - Rows per page or 'all'.
   */
  function setPageSize(size) {
    if (size === "all" || size === Infinity || String(size).toLowerCase() === "all") {
      paginationState.pageSize = Infinity;
    } else {
      const num = parseInt(size, 10);
      paginationState.pageSize = (!isNaN(num) && num > 0) ? num : 10;
    }
    paginationState.currentPage = 1;

    const sizeSelect = document.getElementById(SELECTORS.pageSizeSelect);
    if (sizeSelect) {
      sizeSelect.value = (paginationState.pageSize === Infinity) ? "all" : String(paginationState.pageSize);
    }

    render();
  }

  /**
   * Returns total pages for the current filtered and sorted dataset.
   * @returns {number}
   */
  function getTotalPages() {
    const filtered = getFilteredAndSortedWishes();
    if (paginationState.pageSize === Infinity || paginationState.pageSize === "all") return 1;
    return Math.max(1, Math.ceil(filtered.length / paginationState.pageSize));
  }

  /**
   * Updates pagination buttons, page info label, and result count badge.
   * @param {number} totalFiltered - Total count of matching wishes before slicing.
   */
  function updatePaginationControls(totalFiltered) {
    const prevBtn = document.getElementById(SELECTORS.prevPageBtn);
    const nextBtn = document.getElementById(SELECTORS.nextPageBtn);
    const pageInfo = document.getElementById(SELECTORS.pageInfo);
    const countBadge = document.getElementById(SELECTORS.countBadge);
    const sizeSelect = document.getElementById(SELECTORS.pageSizeSelect);

    const isAll = (paginationState.pageSize === Infinity || paginationState.pageSize === "all");
    const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalFiltered / paginationState.pageSize));

    // Clamp current page
    if (paginationState.currentPage > totalPages) {
      paginationState.currentPage = totalPages;
    }
    if (paginationState.currentPage < 1) {
      paginationState.currentPage = 1;
    }

    const curPage = paginationState.currentPage;

    if (totalFiltered === 0) {
      if (countBadge) countBadge.textContent = "Showing 0 of 0 wishes";
      if (pageInfo) pageInfo.textContent = "Page 1 of 1";
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    const start = isAll ? 1 : (curPage - 1) * paginationState.pageSize + 1;
    const end = isAll ? totalFiltered : Math.min(curPage * paginationState.pageSize, totalFiltered);
    const rangeText = (start === end) ? String(start) : `${start}–${end}`;

    if (countBadge) {
      countBadge.textContent = `Showing ${rangeText} of ${totalFiltered} wishes`;
    }

    if (pageInfo) {
      pageInfo.textContent = `Page ${curPage} of ${totalPages}`;
    }

    if (prevBtn) {
      prevBtn.disabled = curPage <= 1;
    }

    if (nextBtn) {
      nextBtn.disabled = curPage >= totalPages;
    }

    if (sizeSelect) {
      sizeSelect.value = isAll ? "all" : String(paginationState.pageSize);
    }
  }

  /* ============================================================
     7. BULK SELECTION HELPERS (PHASE 31B-5)
     ============================================================ */
  /**
   * Returns array of currently selected wish UUIDs.
   * @returns {string[]} Array of selected UUIDs.
   */
  function getSelectedIds() {
    return Array.from(selectedWishIds);
  }

  /**
   * Checks if a wish UUID is currently selected.
   * @param {string} id - Wish UUID.
   * @returns {boolean} True if selected.
   */
  function isWishSelected(id) {
    if (!id || typeof id !== "string") return false;
    return selectedWishIds.has(id.trim());
  }

  /**
   * Selects a single wish by UUID.
   * @param {string} id - Wish UUID.
   */
  function selectWish(id) {
    if (!id || typeof id !== "string") return;
    const cleanId = id.trim();
    if (!cleanId) return;
    selectedWishIds.add(cleanId);
    updateSelectionUI();
  }

  /**
   * Deselects a single wish by UUID.
   * @param {string} id - Wish UUID.
   */
  function deselectWish(id) {
    if (!id || typeof id !== "string") return;
    const cleanId = id.trim();
    selectedWishIds.delete(cleanId);
    updateSelectionUI();
  }

  /**
   * Toggles selection state for a wish UUID.
   * @param {string} id - Wish UUID.
   */
  function toggleWishSelection(id) {
    if (!id || typeof id !== "string") return;
    const cleanId = id.trim();
    if (selectedWishIds.has(cleanId)) {
      selectedWishIds.delete(cleanId);
    } else {
      selectedWishIds.add(cleanId);
    }
    updateSelectionUI();
  }

  /**
   * Selects all wishes currently visible on the active page.
   */
  function selectAllVisible() {
    const visible = getProcessedWishes();
    visible.forEach(w => {
      if (w && w.id) selectedWishIds.add(w.id.trim());
    });
    updateSelectionUI();
  }

  /**
   * Deselects all wishes currently visible on the active page.
   */
  function deselectAllVisible() {
    const visible = getProcessedWishes();
    visible.forEach(w => {
      if (w && w.id) selectedWishIds.delete(w.id.trim());
    });
    updateSelectionUI();
  }

  /**
   * Clears all selected wish UUIDs globally.
   */
  function clearSelection() {
    selectedWishIds.clear();
    updateSelectionUI();
  }

  /**
   * Synchronizes select-all header checkbox, selection counter badge, and row checkboxes.
   */
  function updateSelectionUI() {
    const visible = getProcessedWishes();
    const selectAllBox = document.getElementById(SELECTORS.selectAllCheckbox);
    const selectionBadge = document.getElementById(SELECTORS.selectionBadge);
    const selectedCountEl = document.getElementById(SELECTORS.selectedCount);
    const bulkCopyLinksBtn = document.getElementById(SELECTORS.bulkCopyLinksBtn);
    const bulkCopyLinksCount = document.getElementById(SELECTORS.bulkCopyLinksCount);
    const bulkExportBtn = document.getElementById(SELECTORS.bulkExportBtn);
    const bulkExportCount = document.getElementById(SELECTORS.bulkExportCount);
    const bulkDuplicateBtn = document.getElementById(SELECTORS.bulkDuplicateBtn);
    const bulkDuplicateCount = document.getElementById(SELECTORS.bulkDuplicateCount);
    const bulkDeleteBtn = document.getElementById(SELECTORS.bulkDeleteBtn);
    const bulkDeleteCount = document.getElementById(SELECTORS.bulkDeleteCount);
    const clearBtn = document.getElementById(SELECTORS.clearSelectionBtn);

    const totalSelected = selectedWishIds.size;

    // 1. Update selection badge, counts & bulk action buttons
    if (selectedCountEl) {
      selectedCountEl.textContent = String(totalSelected);
    }
    if (bulkCopyLinksCount) {
      bulkCopyLinksCount.textContent = String(totalSelected);
    }
    if (bulkExportCount) {
      bulkExportCount.textContent = String(totalSelected);
    }
    if (bulkDuplicateCount) {
      bulkDuplicateCount.textContent = String(totalSelected);
    }
    if (bulkDeleteCount) {
      bulkDeleteCount.textContent = String(totalSelected);
    }
    if (selectionBadge) {
      selectionBadge.style.display = totalSelected > 0 ? "inline-flex" : "none";
    }
    if (bulkCopyLinksBtn) {
      bulkCopyLinksBtn.style.display = totalSelected > 0 ? "inline-flex" : "none";
    }
    if (bulkExportBtn) {
      bulkExportBtn.style.display = totalSelected > 0 ? "inline-flex" : "none";
    }
    if (bulkDuplicateBtn) {
      bulkDuplicateBtn.style.display = totalSelected > 0 ? "inline-flex" : "none";
    }
    if (bulkDeleteBtn) {
      bulkDeleteBtn.style.display = totalSelected > 0 ? "inline-flex" : "none";
    }
    if (clearBtn) {
      clearBtn.style.display = totalSelected > 0 ? "inline-block" : "none";
    }

    // 2. Update header select-all checkbox (checked / unchecked / indeterminate)
    if (selectAllBox) {
      if (visible.length === 0) {
        selectAllBox.checked = false;
        selectAllBox.indeterminate = false;
      } else {
        const selectedInVisibleCount = visible.filter(w => w && w.id && selectedWishIds.has(w.id.trim())).length;
        if (selectedInVisibleCount === 0) {
          selectAllBox.checked = false;
          selectAllBox.indeterminate = false;
        } else if (selectedInVisibleCount === visible.length) {
          selectAllBox.checked = true;
          selectAllBox.indeterminate = false;
        } else {
          selectAllBox.checked = false;
          selectAllBox.indeterminate = true;
        }
      }
    }

    // 3. Update row checkboxes in tbody and toggle .selected-row on <tr>
    const tbody = document.getElementById(SELECTORS.tbody);
    const rowCheckboxes = (tbody && typeof tbody.querySelectorAll === "function")
      ? tbody.querySelectorAll(".wish-row-checkbox")
      : ((typeof document !== "undefined" && typeof document.querySelectorAll === "function")
        ? document.querySelectorAll(".wish-row-checkbox")
        : []);
    if (rowCheckboxes && typeof rowCheckboxes.forEach === "function") {
      rowCheckboxes.forEach(cb => {
        const id = cb.dataset ? cb.dataset.id : (typeof cb.getAttribute === "function" ? cb.getAttribute("data-id") : null);
        if (id) {
          const isSel = selectedWishIds.has(id.trim());
          cb.checked = isSel;
          const tr = (typeof cb.closest === "function") ? cb.closest("tr") : null;
          if (tr && tr.classList) {
            if (isSel) {
              tr.classList.add("selected-row");
            } else {
              tr.classList.remove("selected-row");
            }
          }
        }
      });
    }
  }

  /* ============================================================
     8. ADMIN CREATE / EDIT BRIDGE
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
     8. DATA LOADING & SYNCHRONIZATION
     ============================================================ */
  /**
   * Sets the active wishes data array and refreshes the table view.
   * @param {Array} data - Array of wish records.
   * @param {boolean} [isError=false] - Error flag from query.
   */
  function setWishes(data = [], isError = false) {
    wishesState = Array.isArray(data) ? [...data] : [];
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
     9. SEARCH, SORT & FILTERING PIPELINE
     ============================================================ */
  /**
   * Filters and sorts the wishes list based on toolbar search term, media filter, date filter, and sort selection.
   * Does NOT slice by pagination (returns full matching array).
   * @returns {Array} Full filtered and sorted wishes array.
   */
  function getFilteredAndSortedWishes() {
    const searchInput = document.getElementById(SELECTORS.searchInput);
    const sortSelect = document.getElementById(SELECTORS.sortSelect);
    const mediaSelect = document.getElementById(SELECTORS.filterMedia);
    const dateSelect = document.getElementById(SELECTORS.filterDate);

    const searchTerm = (searchInput?.value || "").toLowerCase().trim();
    const mediaVal = mediaSelect?.value || "all";
    const dateVal = dateSelect?.value || "all";

    // Sync sort state from dropdown if value present
    if (sortSelect && sortSelect.value) {
      setSortFromDropdown(sortSelect.value);
    }

    // 1. Search filter (Recipient Name, Sender Name, UUID, Passcode, Memory Text)
    let filtered = wishesState.filter(w => {
      if (!w) return false;
      if (!searchTerm) return true;
      const tokens = searchTerm.split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return true;

      const name = (w.recipient_name || "").toLowerCase();
      const sender = (w.sender_name || "").toLowerCase();
      const id = (w.id || "").toLowerCase();
      const pass = (w.pass_code || "").toLowerCase();
      const memory = (w.memory_text || "").toLowerCase();

      // Every search token must match at least one searchable field
      return tokens.every(token =>
        name.includes(token) ||
        sender.includes(token) ||
        id.includes(token) ||
        pass.includes(token) ||
        memory.includes(token)
      );
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

    // 4. Authoritative Sort
    if (currentSort.field === "recipient") {
      if (currentSort.direction === "desc") {
        filtered.sort((a, b) => (b.recipient_name || "").localeCompare(a.recipient_name || ""));
      } else {
        filtered.sort((a, b) => (a.recipient_name || "").localeCompare(b.recipient_name || ""));
      }
    } else if (currentSort.field === "sender") {
      if (currentSort.direction === "desc") {
        filtered.sort((a, b) => (b.sender_name || "").localeCompare(a.sender_name || ""));
      } else {
        filtered.sort((a, b) => (a.sender_name || "").localeCompare(b.sender_name || ""));
      }
    } else { // "created"
      if (currentSort.direction === "asc") {
        filtered.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      } else {
        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      }
    }

    return filtered;
  }

  /**
   * Returns processed, sorted, and paginated wishes array ready for table row display.
   * @returns {Array} Paginated subset of wishes.
   */
  function getProcessedWishes() {
    const allFiltered = getFilteredAndSortedWishes();
    const isAll = (paginationState.pageSize === Infinity || paginationState.pageSize === "all");
    const totalPages = isAll ? 1 : Math.max(1, Math.ceil(allFiltered.length / paginationState.pageSize));

    // Clamp current page
    if (paginationState.currentPage > totalPages) {
      paginationState.currentPage = totalPages;
    }
    if (paginationState.currentPage < 1) {
      paginationState.currentPage = 1;
    }

    if (isAll) {
      return allFiltered;
    }

    const start = (paginationState.currentPage - 1) * paginationState.pageSize;
    const end = start + paginationState.pageSize;
    return allFiltered.slice(start, end);
  }

  /* ============================================================
     10. TABLE RENDERING
     ============================================================ */
  /**
   * Renders the Wishes table in the Admin Studio view.
   * @param {Array} [data] - Optional override dataset.
   * @param {boolean} [isError] - Optional override error state.
   */
  function render(data, isError) {
    const tbody = document.getElementById(SELECTORS.tbody);
    if (!tbody) return;

    if (typeof data !== "undefined") wishesState = Array.isArray(data) ? [...data] : [];
    if (typeof isError !== "undefined") isQueryError = !!isError;

    // Update sort header indicators
    updateSortIndicators();

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
      const pageInfo = document.getElementById(SELECTORS.pageInfo);
      if (pageInfo) pageInfo.textContent = "Page 1 of 1";
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center;color:#ef4444;padding:32px;">
            ⚠️ Unable to load wishes from Supabase database. Check database connectivity.
          </td>
        </tr>
      `;
      updateSelectionUI();
      return;
    }

    // Prune any stale IDs in selectedWishIds that no longer exist in wishesState
    if (wishesState && wishesState.length > 0 && selectedWishIds.size > 0) {
      const validIdSet = new Set(wishesState.map(w => w && w.id ? w.id.trim() : "").filter(Boolean));
      selectedWishIds.forEach(id => {
        if (!validIdSet.has(id)) {
          selectedWishIds.delete(id);
        }
      });
    }

    const allFiltered = getFilteredAndSortedWishes();
    const paginated = getProcessedWishes();

    // Update pagination controls and live count badge
    updatePaginationControls(allFiltered.length);

    tbody.innerHTML = "";

    // Empty State
    if (allFiltered.length === 0) {
      const isSearchingOrFiltering = Boolean(
        (searchInput?.value?.trim()) ||
        (document.getElementById(SELECTORS.filterMedia)?.value && document.getElementById(SELECTORS.filterMedia)?.value !== "all") ||
        (document.getElementById(SELECTORS.filterDate)?.value && document.getElementById(SELECTORS.filterDate)?.value !== "all")
      );
      const emptyMsg = isSearchingOrFiltering
        ? "No wishes match your search or filter criteria. 🔍"
        : "No stored wishes found. Create a wish using the public wish generator! ✨";
      const resetBtnHtml = isSearchingOrFiltering
        ? `<br><button type="button" class="btn-wishes-reset-filters" id="btn-wishes-empty-reset-filters">✕ Reset Filters</button>`
        : "";

      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">
            <div>${emptyMsg}</div>
            ${resetBtnHtml}
          </td>
        </tr>
      `;
      updateSelectionUI();
      return;
    }

    // Populate rows
    paginated.forEach(w => {
      const tr = document.createElement("tr");
      const shortId = w.id ? (w.id.substring(0, 13) + "...") : "Local";
      const fullUrl = `${window.location.origin}/?w=${encodeURIComponent(w.id || "")}`;
      const recipientName = escapeHtml(w.recipient_name || "Friend");
      const senderName = escapeHtml(w.sender_name || "Friend");
      const avatarInitial = escapeHtml((w.recipient_name || "W").charAt(0).toUpperCase());
      const passcodeText = escapeHtml(w.pass_code || "1234");
      const dateText = w.created_at ? new Date(w.created_at).toLocaleDateString() : "Recent";
      const rawId = escapeHtml(w.id || "");
      const contentBadgesHtml = renderContentBadges(w);
      const isSelected = selectedWishIds.has(rawId);

      if (isSelected) {
        tr.classList.add("selected-row");
      }

      tr.innerHTML = `
        <td class="td-checkbox">
          <input type="checkbox" class="table-checkbox wish-row-checkbox" data-id="${rawId}" ${isSelected ? "checked" : ""} aria-label="Select wish for ${recipientName}">
        </td>
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
        <td>${contentBadgesHtml}</td>
        <td><span class="status-badge active">🔑 ${passcodeText}</span></td>
        <td><button class="btn-sm" onclick="window.adminApp ? window.adminApp.copyWishUrl('${fullUrl}') : (window.AdminCore && window.AdminCore.copyWishUrl('${fullUrl}'))">📋 Copy UUID Link</button></td>
        <td>${escapeHtml(dateText)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" title="Quick View" data-action="view" data-id="${rawId}">👁️</button>
            <button class="btn-icon" title="Edit Wish" data-action="edit" data-id="${rawId}">✏️</button>
            <button class="btn-icon" title="Duplicate Wish" data-action="duplicate" data-id="${rawId}">📋</button>
            <button class="btn-icon danger" title="Delete Wish" data-action="delete" data-id="${rawId}">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Synchronize bulk selection UI controls
    updateSelectionUI();
  }

  const SYSTEM_CONFIG_UUID = "00000000-0000-0000-0000-000000000001";

  /* ============================================================
     10. ROW ACTIONS (REAL DELETE & REAL DUPLICATE)
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

      // Remove from selection Set if present and update UI
      selectedWishIds.delete(cleanId);
      updateSelectionUI();

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
   * Executes secure bulk deletion of all currently selected wishes via DatabaseModule.deleteWishesBulk.
   * Prompts strong confirmation dialog and synchronizes UI, selection state, and pagination.
   * @param {HTMLElement} [triggeringBtn=null] - Optional button element for loading state.
   * @returns {Promise<{success: boolean, deletedCount?: number, deletedIds?: string[], failedIds?: any[], error?: string}>}
   */
  async function deleteSelectedWishes(triggeringBtn = null) {
    const selectedIds = getSelectedIds();
    if (!selectedIds || selectedIds.length === 0) {
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast("No wishes selected for deletion ⚠️");
      }
      return { success: false, error: "No wishes selected for deletion" };
    }

    // Filter out system configuration UUID
    const validIds = selectedIds.filter(id => id !== SYSTEM_CONFIG_UUID);
    if (validIds.length === 0) {
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast("Cannot delete protected system configuration record ⚠️");
      }
      return { success: false, error: "Cannot delete protected system configuration record" };
    }

    const count = validIds.length;
    const confirmMsg = `Delete ${count} selected wish${count === 1 ? "" : "es"}?\n\nThese wish records will be permanently deleted from the database. Storage media will remain untouched.\n\nThis action cannot be undone.`;
    if (typeof window.confirm === "function" && !window.confirm(confirmMsg)) {
      return { success: false, error: "Deletion cancelled by user" };
    }

    const btn = triggeringBtn || document.getElementById(SELECTORS.bulkDeleteBtn);
    let originalHtml = "";
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = "0.6";
      originalHtml = btn.innerHTML;
      btn.textContent = "⏳ Deleting...";
    }

    try {
      if (!window.DatabaseModule || typeof window.DatabaseModule.deleteWishesBulk !== "function") {
        throw new Error("DatabaseModule.deleteWishesBulk is unavailable");
      }

      const res = await window.DatabaseModule.deleteWishesBulk(validIds);
      if (!res || !res.success) {
        throw new Error(res?.error || "Failed to delete selected wishes from database");
      }

      const deletedIds = res.deletedIds || validIds;
      const failedIds = (res.failedIds || []).map(f => typeof f === "object" ? f.id : f);

      // Remove successfully deleted wishes from in-memory state and selection Set
      wishesState = wishesState.filter(w => !deletedIds.includes(w.id));
      deletedIds.forEach(id => selectedWishIds.delete(id));

      // Re-render table and update selection UI (clamps page if needed)
      render();

      if (failedIds.length > 0 && deletedIds.length > 0) {
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast(`Deleted ${deletedIds.length} wish(es). ${failedIds.length} failed ⚠️`);
        }
      } else if (deletedIds.length > 0) {
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast(`${deletedIds.length} wish record(s) deleted 🗑️`);
        }
      }

      if (typeof onStateChangeHook === "function") {
        await onStateChangeHook("WISHES_BULK_DELETED", `Bulk deleted ${deletedIds.length} wish record(s)`, deletedIds);
      }

      return {
        success: true,
        deletedCount: deletedIds.length,
        deletedIds: deletedIds,
        failedIds: res.failedIds || []
      };
    } catch (err) {
      console.error("❌ AdminWishes: Bulk delete error:", err);
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast(`Bulk delete failed: ${err.message} ⚠️`);
      }
      return { success: false, error: err.message };
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.innerHTML = originalHtml || `🗑️ Delete Selected (<span id="wishes-bulk-delete-count">${selectedWishIds.size}</span>)`;
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
    } finally {
      if (triggeringBtn) {
        triggeringBtn.disabled = false;
        triggeringBtn.style.opacity = "1";
        triggeringBtn.textContent = triggeringBtn.dataset.originalText || "📋";
      }
    }
  }

  /**
   * Duplicates all currently selected wishes via DatabaseModule.duplicateWishesBulk.
   * Prompts confirmation dialog, shows loading state, adds new records to wishesState,
   * re-renders the table, and invokes onStateChangeHook to update KPIs.
   * @param {HTMLElement} [triggeringBtn=null] - Optional button element for loading state.
   * @returns {Promise<{success: boolean, createdCount?: number, newWishes?: Array<object>, failedIds?: any[], error?: string}>}
   */
  async function duplicateSelectedWishes(triggeringBtn = null) {
    const selectedIds = getSelectedIds();
    if (!selectedIds || selectedIds.length === 0) {
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast("No wishes selected for duplication ⚠️");
      }
      return { success: false, error: "No wishes selected for duplication" };
    }

    // Filter out system configuration UUID
    const validIds = selectedIds.filter(id => id !== SYSTEM_CONFIG_UUID);
    if (validIds.length === 0) {
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast("Cannot duplicate protected system configuration record ⚠️");
      }
      return { success: false, error: "Cannot duplicate protected system configuration record" };
    }

    const count = validIds.length;
    const confirmMsg = `Duplicate ${count} selected wish${count === 1 ? "" : "es"}?\n\nNew copy records will be created with "(Copy)" appended to their recipient names. Original wishes will remain untouched.`;
    if (typeof window.confirm === "function" && !window.confirm(confirmMsg)) {
      return { success: false, error: "Duplication cancelled by user" };
    }

    const btn = triggeringBtn || document.getElementById(SELECTORS.bulkDuplicateBtn);
    let originalHtml = "";
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = "0.6";
      originalHtml = btn.innerHTML;
      btn.textContent = "⏳ Duplicating...";
    }

    try {
      if (!window.DatabaseModule || typeof window.DatabaseModule.duplicateWishesBulk !== "function") {
        throw new Error("DatabaseModule.duplicateWishesBulk is unavailable");
      }

      const res = await window.DatabaseModule.duplicateWishesBulk(validIds);
      if (!res || (!res.success && (!res.newWishes || res.newWishes.length === 0))) {
        throw new Error(res?.error || "Failed to duplicate selected wishes in database");
      }

      const createdCount = res.createdCount || (res.newWishes ? res.newWishes.length : 0);
      const newWishes = res.newWishes || [];
      const failedIds = (res.failedIds || []).map(f => typeof f === "object" ? f.id : f);

      // Add new duplicate wish records to in-memory state
      if (newWishes.length > 0) {
        newWishes.forEach(nw => {
          if (nw && nw.id && !wishesState.some(w => w.id === nw.id)) {
            wishesState.unshift(nw);
          }
        });
      }

      // Re-render table and update pagination/counts
      render();

      // Show appropriate toast
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        if (failedIds.length > 0 && createdCount > 0) {
          window.AdminCore.showToast(`Duplicated ${createdCount} wish(es). ${failedIds.length} failed ⚠️`);
        } else if (createdCount > 0) {
          window.AdminCore.showToast(`Duplicated ${createdCount} wish record${createdCount === 1 ? "" : "s"} 📋`);
        }
      }

      // Trigger state change hook to refresh Dashboard KPIs and Activity Feed
      if (typeof onStateChangeHook === "function") {
        await onStateChangeHook(
          "WISHES_BULK_DUPLICATED",
          `Bulk duplicated ${createdCount} wish record(s) from ${validIds.length} selected`,
          newWishes.map(w => w.id)
        );
      }

      return {
        success: createdCount > 0,
        createdCount,
        newWishes,
        failedIds: res.failedIds || []
      };
    } catch (err) {
      console.error("❌ AdminWishes: Bulk duplicate error:", err);
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast(`Bulk duplicate failed: ${err.message} ⚠️`);
      }
      return { success: false, error: err.message };
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.innerHTML = originalHtml || `📋 Duplicate Selected (<span id="wishes-bulk-duplicate-count">${selectedWishIds.size}</span>)`;
      }
    }
  }

  /**
   * Generates public canonical wish share URL from UUID.
   * @param {string} id - Wish UUID.
   * @returns {string} Absolute public wish URL.
   */
  function buildPublicWishUrl(id) {
    if (!id || typeof id !== "string") return "";
    return `${window.location.origin}/?w=${encodeURIComponent(id.trim())}`;
  }

  /**
   * Returns array of public URLs for all currently selected valid wishes.
   * Resolves selectedWishIds against in-memory wishesState, filtering out stale/missing entries.
   * @returns {string[]} Array of public URL strings.
   */
  function getSelectedWishLinks() {
    const selectedIds = getSelectedIds();
    if (!selectedIds || selectedIds.length === 0) return [];

    const validLinks = [];
    const staleIds = [];

    selectedIds.forEach(id => {
      const found = wishesState.find(w => w && w.id && w.id.trim() === id);
      if (found && found.id) {
        validLinks.push(buildPublicWishUrl(found.id));
      } else {
        staleIds.push(id);
      }
    });

    if (staleIds.length > 0) {
      staleIds.forEach(id => selectedWishIds.delete(id));
      updateSelectionUI();
    }

    return validLinks;
  }

  /**
   * Copies public share URLs for all selected wishes to the clipboard.
   * One URL per line. Preserves existing selections.
   * @param {HTMLElement} [triggeringBtn=null] - Optional button element for loading indicator.
   * @returns {Promise<{success: boolean, copiedCount: number, links?: string[], error?: string}>}
   */
  async function copySelectedWishLinks(triggeringBtn = null) {
    const links = getSelectedWishLinks();
    if (!links || links.length === 0) {
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast("No valid wishes selected to copy links ⚠️");
      }
      return { success: false, copiedCount: 0, error: "No valid wishes selected" };
    }

    const btn = triggeringBtn || document.getElementById(SELECTORS.bulkCopyLinksBtn);
    let originalHtml = "";
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = "0.6";
      originalHtml = btn.innerHTML;
      btn.textContent = "⏳ Copying...";
    }

    const payloadText = links.join("\n");

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(payloadText);
      } else {
        // Fallback for non-secure contexts or environments without navigator.clipboard
        const ta = document.createElement("textarea");
        ta.value = payloadText;
        ta.style.position = "fixed";
        ta.style.top = "0";
        ta.style.left = "0";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const success = (typeof document.execCommand === "function") ? document.execCommand("copy") : true;
        document.body.removeChild(ta);
        if (!success) {
          throw new Error("Clipboard copy command failed");
        }
      }

      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast(`Copied ${links.length} wish link${links.length === 1 ? "" : "s"} 📋`);
      }

      return {
        success: true,
        copiedCount: links.length,
        links
      };
    } catch (err) {
      console.error("❌ AdminWishes: Bulk copy links error:", err);
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast(`Copy failed: ${err.message || "Clipboard error"} ⚠️`);
      }
      return {
        success: false,
        copiedCount: 0,
        error: err.message || "Clipboard error"
      };
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.innerHTML = originalHtml || `📋 Copy Links (<span id="wishes-bulk-copy-links-count">${selectedWishIds.size}</span>)`;
      }
    }
  }

  /**
   * Returns deep-cloned array of selected wish records from wishesState.
   * Prunes stale IDs from selectedWishIds if any records are no longer present.
   * Preserves deterministic order matching wishesState.
   * @returns {Array<Object>} Array of deep-cloned wish objects.
   */
  function getSelectedWishesData() {
    const selectedIds = getSelectedIds();
    if (!selectedIds || selectedIds.length === 0) return [];

    const validWishes = [];
    const staleIds = [];

    // Keep deterministic order matching wishesState
    wishesState.forEach(w => {
      if (w && w.id && selectedWishIds.has(w.id.trim())) {
        try {
          validWishes.push(JSON.parse(JSON.stringify(w)));
        } catch {
          validWishes.push({ ...w });
        }
      }
    });

    // Check for any selected IDs that weren't found in wishesState
    selectedIds.forEach(id => {
      const found = wishesState.some(w => w && w.id && w.id.trim() === id);
      if (!found) {
        staleIds.push(id);
      }
    });

    if (staleIds.length > 0) {
      staleIds.forEach(id => selectedWishIds.delete(id));
      updateSelectionUI();
    }

    return validWishes;
  }

  /**
   * Converts array of wish records into a standardized, properly escaped CSV string.
   * @param {Array<Object>} wishes - Wish records array.
   * @returns {string} Formatted CSV text.
   */
  function formatWishesToCSV(wishes) {
    if (!Array.isArray(wishes) || wishes.length === 0) {
      return "";
    }

    const headers = [
      "id",
      "recipient_name",
      "sender_name",
      "pass_code",
      "birth_date",
      "cake_flavor",
      "letter_font",
      "letter_theme",
      "letter_lines",
      "memory_text",
      "reasons_json",
      "wishes_json",
      "gallery_json",
      "timeline_json",
      "gift_json",
      "music_url",
      "video_url",
      "created_at"
    ];

    function escapeCSVField(val) {
      if (val === null || val === undefined) {
        return "";
      }
      let str = "";
      if (typeof val === "object") {
        try {
          str = JSON.stringify(val);
        } catch {
          str = String(val);
        }
      } else {
        str = String(val);
      }

      // Check if quotes, commas, or newlines are present
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    const rows = [
      headers.join(",")
    ];

    wishes.forEach(w => {
      if (!w) return;
      const row = headers.map(h => escapeCSVField(w[h]));
      rows.push(row.join(","));
    });

    return rows.join("\r\n");
  }

  /**
   * Exports selected wish records as a downloadable JSON or CSV file.
   * Purely client-side using Blob and object URL. Preserves existing selections.
   * @param {"json"|"csv"} [format="json"] - Export file format.
   * @param {HTMLElement} [triggeringBtn=null] - Optional button for loading indicator.
   * @returns {Promise<{success: boolean, exportedCount: number, format?: string, filename?: string, data?: Array, error?: string}>}
   */
  async function exportSelectedWishes(format = "json", triggeringBtn = null) {
    const wishesData = getSelectedWishesData();
    if (!wishesData || wishesData.length === 0) {
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast("No valid wishes selected to export ⚠️");
      }
      return { success: false, exportedCount: 0, error: "No valid wishes selected" };
    }

    const fmt = String(format).toLowerCase() === "csv" ? "csv" : "json";
    const btn = triggeringBtn || document.getElementById(SELECTORS.bulkExportBtn);
    let originalHtml = "";
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = "0.6";
      originalHtml = btn.innerHTML;
      btn.textContent = "⏳ Exporting...";
    }

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      let payload = "";
      let mimeType = "";
      let filename = "";

      if (fmt === "csv") {
        payload = formatWishesToCSV(wishesData);
        mimeType = "text/csv;charset=utf-8;";
        filename = `wishes-export-${dateStr}.csv`;
      } else {
        payload = JSON.stringify(wishesData, null, 2);
        mimeType = "application/json;charset=utf-8;";
        filename = `wishes-export-${dateStr}.json`;
      }

      if (typeof Blob !== "undefined") {
        const blob = new Blob([payload], { type: mimeType });
        const dlUrl = (window.URL && typeof window.URL.createObjectURL === "function")
          ? window.URL.createObjectURL(blob)
          : (typeof webkitURL !== "undefined" && webkitURL.createObjectURL ? webkitURL.createObjectURL(blob) : "");

        if (dlUrl && typeof document.createElement === "function") {
          const a = document.createElement("a");
          a.href = dlUrl;
          a.download = filename;
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => {
            if (window.URL && typeof window.URL.revokeObjectURL === "function") {
              window.URL.revokeObjectURL(dlUrl);
            }
          }, 1000);
        }
      }

      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast(`Exported ${wishesData.length} wish record${wishesData.length === 1 ? "" : "s"} (${fmt.toUpperCase()}) 📥`);
      }

      return {
        success: true,
        exportedCount: wishesData.length,
        format: fmt,
        filename,
        data: wishesData
      };
    } catch (err) {
      console.error("❌ AdminWishes: Bulk export error:", err);
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast(`Export failed: ${err.message || "Export error"} ⚠️`);
      }
      return {
        success: false,
        exportedCount: 0,
        error: err.message || "Export error"
      };
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.innerHTML = originalHtml || `📥 Export (<span id="wishes-bulk-export-count">${selectedWishIds.size}</span>)`;
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

    // Search Input Listener (resets to page 1)
    const searchInput = document.getElementById(SELECTORS.searchInput);
    if (searchInput && !searchInput.__wishesBound) {
      searchInput.__wishesBound = true;
      searchInput.addEventListener("input", () => {
        paginationState.currentPage = 1;
        render();
      });
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (searchInput.value && searchInput.value.length > 0) {
            e.preventDefault();
            clearSearch();
          } else {
            searchInput.blur();
          }
        }
      });
    }

    // Search Clear Button Listener (resets to page 1, preserves other filters)
    const searchClearBtn = document.getElementById(SELECTORS.searchClearBtn);
    if (searchClearBtn && !searchClearBtn.__wishesBound) {
      searchClearBtn.__wishesBound = true;
      searchClearBtn.addEventListener("click", () => {
        clearSearch();
      });
    }

    // Global Keyboard Shortcut ('/' to focus search, Escape to close lightbox/Quick View, Arrow keys for photo nav)
    if (typeof document !== "undefined" && typeof document.addEventListener === "function" && !document.__wishesGlobalKeyBound) {
      document.__wishesGlobalKeyBound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          const lightbox = document.getElementById("wishes-gallery-lightbox");
          if (lightbox && lightbox.style.display !== "none" && activeGalleryPreviewIndex !== null) {
            e.preventDefault();
            closeGalleryLightbox();
            return;
          }
          const overlay = document.getElementById("wishes-quick-view-overlay");
          if (overlay && overlay.style.display !== "none" && activeQuickViewWishId) {
            e.preventDefault();
            closeQuickView();
            return;
          }
        }

        if (activeGalleryPreviewIndex !== null && currentQuickViewGallery && currentQuickViewGallery.length > 1) {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            navigateGalleryLightbox(-1);
            return;
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            navigateGalleryLightbox(1);
            return;
          }
        }

        if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const activeEl = document.activeElement;
          const targetTag = (activeEl && activeEl.tagName) ? activeEl.tagName.toUpperCase() : "";
          const isEditable = targetTag === "INPUT" || targetTag === "TEXTAREA" || targetTag === "SELECT" || (activeEl && activeEl.isContentEditable);
          if (isEditable) return;

          // Check if Wishes view is active / visible
          const viewWishes = document.getElementById("view-wishes");
          const isWishesActive = viewWishes && (!viewWishes.style.display || viewWishes.style.display !== "none" || viewWishes.classList.contains("active"));
          if (!isWishesActive) return;

          // Check if modal or editor overlay is open
          const modalOpen = typeof document.querySelector === "function" && Boolean(document.querySelector(".modal.active, .admin-editor-panel.active, #wish-editor-modal.active, #modal-overlay.active, #wishes-quick-view-overlay[style*='display: flex'], #wishes-gallery-lightbox[style*='display: flex']"));
          if (modalOpen || activeQuickViewWishId || activeGalleryPreviewIndex !== null) return;

          const searchInputEl = document.getElementById(SELECTORS.searchInput);
          if (searchInputEl) {
            e.preventDefault();
            searchInputEl.focus();
            if (typeof searchInputEl.select === "function") {
              searchInputEl.select();
            }
          }
        }
      });
    }

    // Media Filter Dropdown Listener (resets to page 1)
    const mediaFilter = document.getElementById(SELECTORS.filterMedia);
    if (mediaFilter && !mediaFilter.__wishesBound) {
      mediaFilter.__wishesBound = true;
      mediaFilter.addEventListener("change", () => {
        paginationState.currentPage = 1;
        render();
      });
    }

    // Date Filter Dropdown Listener (resets to page 1)
    const dateFilter = document.getElementById(SELECTORS.filterDate);
    if (dateFilter && !dateFilter.__wishesBound) {
      dateFilter.__wishesBound = true;
      dateFilter.addEventListener("change", () => {
        paginationState.currentPage = 1;
        render();
      });
    }

    // Sort Dropdown Listener
    const sortSelect = document.getElementById(SELECTORS.sortSelect);
    if (sortSelect && !sortSelect.__wishesBound) {
      sortSelect.__wishesBound = true;
      sortSelect.addEventListener("change", () => {
        setSortFromDropdown(sortSelect.value);
        render();
      });
    }

    // Sortable Table Headers Listener (Click & Keyboard Enter/Space)
    const tableThead = typeof document.querySelector === "function"
      ? (document.querySelector("#view-wishes table.admin-table thead") || document.querySelector("table.admin-table thead"))
      : null;
    if (tableThead && !tableThead.__sortBound) {
      tableThead.__sortBound = true;
      tableThead.addEventListener("click", (e) => {
        const th = e.target.closest("th.th-sortable");
        if (th && th.dataset.sort) {
          toggleSortByField(th.dataset.sort);
        }
      });
      tableThead.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          const th = e.target.closest("th.th-sortable");
          if (th && th.dataset.sort) {
            e.preventDefault();
            toggleSortByField(th.dataset.sort);
          }
        }
      });
    }

    // Page Size Selector Listener
    const pageSizeSelect = document.getElementById(SELECTORS.pageSizeSelect);
    if (pageSizeSelect && !pageSizeSelect.__wishesBound) {
      pageSizeSelect.__wishesBound = true;
      pageSizeSelect.addEventListener("change", (e) => {
        const val = (e && e.target && typeof e.target.value !== "undefined") ? e.target.value : (pageSizeSelect.value || "10");
        setPageSize(val);
      });
    }

    // Prev Page Button Listener
    const prevPageBtn = document.getElementById(SELECTORS.prevPageBtn);
    if (prevPageBtn && !prevPageBtn.__wishesBound) {
      prevPageBtn.__wishesBound = true;
      prevPageBtn.addEventListener("click", () => {
        if (paginationState.currentPage > 1) {
          paginationState.currentPage--;
          render();
        }
      });
    }

    // Next Page Button Listener
    const nextPageBtn = document.getElementById(SELECTORS.nextPageBtn);
    if (nextPageBtn && !nextPageBtn.__wishesBound) {
      nextPageBtn.__wishesBound = true;
      nextPageBtn.addEventListener("click", () => {
        const totalPages = getTotalPages();
        if (paginationState.currentPage < totalPages) {
          paginationState.currentPage++;
          render();
        }
      });
    }

    // Select-All Header Checkbox Listener (toggles visible items on active page)
    const selectAllBox = document.getElementById(SELECTORS.selectAllCheckbox);
    if (selectAllBox && !selectAllBox.__wishesBound) {
      selectAllBox.__wishesBound = true;
      selectAllBox.addEventListener("change", () => {
        if (selectAllBox.checked) {
          selectAllVisible();
        } else {
          deselectAllVisible();
        }
      });
    }

    // Bulk Copy Links Button Listener
    const bulkCopyBtn = document.getElementById(SELECTORS.bulkCopyLinksBtn);
    if (bulkCopyBtn && !bulkCopyBtn.__wishesBound) {
      bulkCopyBtn.__wishesBound = true;
      bulkCopyBtn.addEventListener("click", async () => {
        await copySelectedWishLinks(bulkCopyBtn);
      });
    }

    // Bulk Export Button Listener
    const bulkExpBtn = document.getElementById(SELECTORS.bulkExportBtn);
    if (bulkExpBtn && !bulkExpBtn.__wishesBound) {
      bulkExpBtn.__wishesBound = true;
      bulkExpBtn.addEventListener("click", async () => {
        await exportSelectedWishes("json", bulkExpBtn);
      });
    }

    // Bulk Duplicate Button Listener
    const bulkDupBtn = document.getElementById(SELECTORS.bulkDuplicateBtn);
    if (bulkDupBtn && !bulkDupBtn.__wishesBound) {
      bulkDupBtn.__wishesBound = true;
      bulkDupBtn.addEventListener("click", async () => {
        await duplicateSelectedWishes(bulkDupBtn);
      });
    }

    // Bulk Delete Button Listener
    const bulkDelBtn = document.getElementById(SELECTORS.bulkDeleteBtn);
    if (bulkDelBtn && !bulkDelBtn.__wishesBound) {
      bulkDelBtn.__wishesBound = true;
      bulkDelBtn.addEventListener("click", async () => {
        await deleteSelectedWishes(bulkDelBtn);
      });
    }

    // Clear Selection Button Listener
    const clearSelBtn = document.getElementById(SELECTORS.clearSelectionBtn);
    if (clearSelBtn && !clearSelBtn.__wishesBound) {
      clearSelBtn.__wishesBound = true;
      clearSelBtn.addEventListener("click", () => {
        clearSelection();
      });
    }

    // Create New Wish Button Listener
    const createBtn = document.getElementById(SELECTORS.createBtn) || document.getElementById(SELECTORS.createBtnFallback);
    if (createBtn && !createBtn.__wishesBound) {
      createBtn.__wishesBound = true;
      createBtn.addEventListener("click", () => {
        openWishEditor(null);
      });
    }

    // Event Delegation for Table Row Checkboxes & Action Buttons
    const tbody = document.getElementById(SELECTORS.tbody);
    if (tbody && !tbody.__wishesActionsBound) {
      tbody.__wishesActionsBound = true;

      // Click Actions (Edit, Duplicate, Delete, Reset Filters)
      tbody.addEventListener("click", async (e) => {
        if (e.target && (e.target.id === "btn-wishes-empty-reset-filters" || (typeof e.target.closest === "function" && e.target.closest("#btn-wishes-empty-reset-filters")))) {
          resetFilters();
          return;
        }

        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === "view" || action === "quick-view") {
          openQuickView(id);
        } else if (action === "edit") {
          openWishEditor(id);
        } else if (action === "duplicate") {
          await duplicateWish(id, btn);
        } else if (action === "delete") {
          await deleteWish(id, btn);
        }
      });

      // Change Action (Row Checkbox Toggle)
      tbody.addEventListener("change", (e) => {
        const cb = e.target.closest(".wish-row-checkbox");
        if (!cb) return;
        const id = cb.dataset.id;
        if (id) {
          if (cb.checked) {
            selectedWishIds.add(id.trim());
          } else {
            selectedWishIds.delete(id.trim());
          }
          updateSelectionUI();
        }
      });
    }
  }

  /**
   * Clears search input, resets pagination to page 1, and re-renders wishes table.
   * Preserves active media and date filters and selections.
   */
  function clearSearch() {
    const searchInput = document.getElementById(SELECTORS.searchInput);
    if (searchInput) {
      searchInput.value = "";
      if (typeof searchInput.focus === "function") {
        searchInput.focus();
      }
    }
    paginationState.currentPage = 1;
    render();
  }

  /**
   * Resets all search and filter dropdowns to default values and re-renders table at page 1.
   */
  function resetFilters() {
    const searchInput = document.getElementById(SELECTORS.searchInput);
    const mediaSelect = document.getElementById(SELECTORS.filterMedia);
    const dateSelect = document.getElementById(SELECTORS.filterDate);
    if (searchInput) searchInput.value = "";
    if (mediaSelect) mediaSelect.value = "all";
    if (dateSelect) dateSelect.value = "all";
    paginationState.currentPage = 1;
    render();
  }

  /* ============================================================
     13. QUICK VIEW INSPECTOR (PHASE 31B-13 FINAL UX REFINEMENT)
     ============================================================ */
  let activeQuickViewWishId = null;
  let activeQuickViewSection = null; // null = overview, or 'wishes' | 'reasons' | 'memory' | 'letter' | 'gift' | 'music' | 'video' | 'gallery' | 'timeline'
  let quickViewToastTimer = null;
  let activeGalleryPreviewIndex = null;
  let currentQuickViewGallery = [];

  /**
   * Returns the wish object currently opened in Quick View, or null.
   * @returns {Object|null}
   */
  function getQuickViewWish() {
    if (!activeQuickViewWishId) return null;
    return wishesState.find(w => w && w.id && w.id.trim() === activeQuickViewWishId.trim()) || null;
  }

  /**
   * Shows a clearly visible floating feedback toast directly on/above the Quick View modal.
   * Also mirrors to window.AdminCore.showToast if available.
   * @param {string} msg - Toast message string.
   */
  function showQuickViewToast(msg) {
    if (!msg) return;

    // 1. Mirror to AdminCore if present
    if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
      window.AdminCore.showToast(msg);
    }

    // 2. Display dedicated modal toast above Quick View card
    const toastEl = document.getElementById("wishes-quick-view-toast");
    if (toastEl) {
      if (quickViewToastTimer) clearTimeout(quickViewToastTimer);
      toastEl.textContent = msg;
      toastEl.style.display = "inline-flex";
      toastEl.style.opacity = "1";
      quickViewToastTimer = setTimeout(() => {
        toastEl.style.opacity = "0";
        setTimeout(() => {
          toastEl.style.display = "none";
        }, 200);
      }, 2600);
    }
  }

  /**
   * Formats an ISO date/time string to Indian 12-hour format: DD/MM/YYYY, h:mm:ss A (Asia/Kolkata).
   * @param {string|Date} isoString - Date string or Date object.
   * @returns {string} Formatted string.
   */
  function formatIndianDateTime(isoString) {
    if (!isoString) return "Recent";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Recent";

    try {
      return date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    } catch (e) {
      // Manual fallback formatter
      const pad = (n) => String(n).padStart(2, "0");
      const day = pad(date.getDate());
      const month = pad(date.getMonth() + 1);
      const year = date.getFullYear();
      let hours = date.getHours();
      const minutes = pad(date.getMinutes());
      const seconds = pad(date.getSeconds());
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
    }
  }

  /**
   * Normalizes any supported birthday data format into { day, month, year } or null.
   * Supports:
   * A. Direct object: { day: 17, month: 8, year: 2001 } or { year: 2001, month: 8, day: 17 } or with d, m, y
   * B. JSON-stringified object: '{"day":17,"month":8,"year":2001}'
   * C. camelCase object: birthDate: { day: 17, month: 8, year: 2001 }
   * D. camelCase JSON string: birthDate: '{"day":17,"month":8,"year":2001}'
   * E. Legacy fields: w.d, w.m, w.y or w.day, w.month, w.year
   * F. Plain display/date strings: "17/08/2001", "17-08-2001", "2001-08-17", "2001/08/17"
   * @param {Object} w - Wish record.
   * @returns {{day: number, month: number, year: number}|null}
   */
  function normalizeBirthDate(w) {
    if (!w || typeof w !== "object") return null;

    let candidate = w.birth_date ?? w.birthDate ?? null;

    // Check direct legacy fields w.d, w.m, w.y or w.day, w.month, w.year
    if (!candidate && (w.d || w.day) && (w.m || w.month) && (w.y || w.year)) {
      candidate = {
        day: w.day || w.d,
        month: w.month || w.m,
        year: w.year || w.y
      };
    }

    if (!candidate) return null;

    // If candidate is a JSON string, try parsing it
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (!trimmed) return null;

      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          candidate = JSON.parse(trimmed);
        } catch (e) {
          // not valid JSON, proceed as plain string
        }
      }
    }

    // If candidate is an object
    if (typeof candidate === "object" && candidate !== null) {
      const day = parseInt(candidate.day ?? candidate.d, 10);
      const month = parseInt(candidate.month ?? candidate.m, 10);
      const year = parseInt(candidate.year ?? candidate.y, 10);

      if (!isNaN(day) && !isNaN(month) && !isNaN(year) &&
          day >= 1 && day <= 31 &&
          month >= 1 && month <= 12 &&
          year >= 1900 && year <= 2100) {
        return { day, month, year };
      }
    }

    // If candidate is a plain string
    if (typeof candidate === "string") {
      const str = candidate.trim();
      if (!str) return null;

      // Match DD/MM/YYYY or DD-MM-YYYY
      const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10);
        const year = parseInt(dmyMatch[3], 10);
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
          return { day, month, year };
        }
      }

      // Match YYYY-MM-DD or YYYY/MM/DD
      const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (ymdMatch) {
        const year = parseInt(ymdMatch[1], 10);
        const month = parseInt(ymdMatch[2], 10);
        const day = parseInt(ymdMatch[3], 10);
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
          return { day, month, year };
        }
      }
    }

    return null;
  }

  /**
   * Returns formatted birthdate display string or "Not specified".
   * @param {Object} w - Wish record.
   * @returns {string} Formatted DD/MM/YYYY or "Not specified"
   */
  function formatBirthDateDisplay(w) {
    const norm = normalizeBirthDate(w);
    if (!norm) return "Not specified";
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(norm.day)}/${pad(norm.month)}/${norm.year}`;
  }

  /**
   * Authoritatively resolves the letter theme identifier.
   * Priority: letter_theme -> letterTheme -> lt -> theme_id -> themeId -> theme -> "default"
   * @param {Object} w - Wish record.
   * @returns {string} Theme identifier or "default"
   */
  function resolveWishTheme(w) {
    if (!w || typeof w !== "object") return "default";
    const candidates = [
      w.letter_theme,
      w.letterTheme,
      w.lt,
      w.theme_id,
      w.themeId,
      w.theme
    ];
    for (const val of candidates) {
      if (typeof val === "string" && val.trim()) {
        return val.trim();
      }
    }
    return "default";
  }

  /**
   * Authoritatively resolves the letter font identifier.
   * Priority: letter_font -> letterFont -> lf -> font_id -> fontId -> font -> "default"
   * @param {Object} w - Wish record.
   * @returns {string} Font identifier or "default"
   */
  function resolveWishFont(w) {
    if (!w || typeof w !== "object") return "default";
    const candidates = [
      w.letter_font,
      w.letterFont,
      w.lf,
      w.font_id,
      w.fontId,
      w.font
    ];
    for (const val of candidates) {
      if (typeof val === "string" && val.trim()) {
        return val.trim();
      }
    }
    return "default";
  }

  /**
   * Authoritatively resolves the cake flavor identifier.
   * Priority: cake_flavor -> cakeFlavor -> ck -> cake -> "default"
   * @param {Object} w - Wish record.
   * @returns {string} Cake flavor or "default"
   */
  function resolveWishCake(w) {
    if (!w || typeof w !== "object") return "default";
    const candidates = [
      w.cake_flavor,
      w.cakeFlavor,
      w.ck,
      w.cake
    ];
    for (const val of candidates) {
      if (typeof val === "string" && val.trim()) {
        return val.trim();
      }
    }
    return "default";
  }

  /**
   * Parses JSON field safely into array/object or returns fallback.
   */
  function parseJsonField(val, fallback = []) {
    if (!val) return fallback;
    if (Array.isArray(val) || (typeof val === "object" && val !== null)) return val;
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        return parsed || fallback;
      } catch (e) {
        return fallback;
      }
    }
    return fallback;
  }

  /**
   * Extracts clean image URL from gallery item string or object.
   */
  function extractImageUrl(item) {
    if (!item) return "";
    if (typeof item === "string") return item.trim();
    if (typeof item === "object") {
      return (item.image || item.url || item.src || item.img || "").trim();
    }
    return "";
  }

  /**
   * Extracts clean image caption from gallery item or fallback.
   */
  function extractImageCaption(item, idx) {
    if (item && typeof item === "object" && item.caption && typeof item.caption === "string" && item.caption.trim()) {
      return item.caption.trim();
    }
    return `Photo #${idx + 1}`;
  }

  /**
   * Renders the Gallery Lightbox modal DOM.
   */
  function renderGalleryLightbox() {
    if (activeGalleryPreviewIndex === null || !currentQuickViewGallery || !currentQuickViewGallery.length) {
      closeGalleryLightbox();
      return;
    }

    const totalPhotos = currentQuickViewGallery.length;
    const currentIdx = Math.max(0, Math.min(activeGalleryPreviewIndex, totalPhotos - 1));
    activeGalleryPreviewIndex = currentIdx;
    const currentItem = currentQuickViewGallery[currentIdx];
    const imgUrl = extractImageUrl(currentItem);
    const caption = extractImageCaption(currentItem, currentIdx);
    const hasValidUrl = Boolean(imgUrl && imgUrl.length > 0);

    let lightbox = document.getElementById("wishes-gallery-lightbox");
    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.id = "wishes-gallery-lightbox";
      lightbox.className = "wishes-gallery-lightbox";
      lightbox.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(5, 2, 10, 0.94);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 100000;
        padding: 20px;
        opacity: 0;
        transition: opacity 0.2s ease;
      `;
      if (document.body && typeof document.body.appendChild === "function") {
        document.body.appendChild(lightbox);
      }

      lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) {
          closeGalleryLightbox();
        }
      });
    }

    lightbox.innerHTML = `
      <div style="position:relative;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;">
        <!-- Top Bar with Photo Count and Close Button -->
        <div style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;color:#fff;">
          <div style="font-size:0.85rem;font-weight:600;color:var(--text-dim,#cbd5e1);background:rgba(255,255,255,0.08);padding:4px 12px;border-radius:20px;">
            Photo <strong style="color:#fff;">${currentIdx + 1}</strong> of <strong style="color:#fff;">${totalPhotos}</strong>
          </div>
          <button type="button" id="btn-gallery-lightbox-close" class="btn-icon" style="background:rgba(255,255,255,0.1);border:none;color:#fff;font-size:1.2rem;cursor:pointer;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:background 0.15s ease;" title="Close Preview (Esc)">✕</button>
        </div>

        <!-- Main Image Viewer with Prev / Next Navigation -->
        <div style="position:relative;display:flex;align-items:center;justify-content:center;max-width:100%;max-height:75vh;">
          ${totalPhotos > 1 ? `
            <button type="button" id="btn-gallery-lightbox-prev" style="position:absolute;left:-48px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:1.5rem;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;transition:background 0.15s ease;" title="Previous Photo (←)">‹</button>
          ` : ""}

          <div style="position:relative;max-width:85vw;max-height:72vh;display:flex;align-items:center;justify-content:center;border-radius:10px;overflow:hidden;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 50px rgba(0,0,0,0.9);">
            ${hasValidUrl ? `
              <img id="gallery-lightbox-img" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(caption)}" style="max-width:85vw;max-height:72vh;object-fit:contain;display:block;" onerror="this.style.display='none';document.getElementById('gallery-lightbox-fallback').style.display='flex';" />
              <div id="gallery-lightbox-fallback" style="display:none;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:60px 40px;color:var(--text-dim,#94a3b8);text-align:center;">
                <span style="font-size:3rem;">🖼️</span>
                <span style="font-size:0.95rem;font-weight:600;color:#fff;">Image preview unavailable</span>
              </div>
            ` : `
              <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:60px 40px;color:var(--text-dim,#94a3b8);text-align:center;">
                <span style="font-size:3rem;">🖼️</span>
                <span style="font-size:0.95rem;font-weight:600;color:#fff;">Image preview unavailable</span>
              </div>
            `}
          </div>

          ${totalPhotos > 1 ? `
            <button type="button" id="btn-gallery-lightbox-next" style="position:absolute;right:-48px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:1.5rem;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;transition:background 0.15s ease;" title="Next Photo (→)">›</button>
          ` : ""}
        </div>

        <!-- Caption Below Image -->
        <div style="font-size:0.85rem;color:var(--text-main,#f8fafc);text-align:center;max-width:80vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${escapeHtml(caption)}
        </div>
      </div>
    `;

    lightbox.style.display = "flex";
    lightbox.style.opacity = "1";

    const closeBtn = document.getElementById("btn-gallery-lightbox-close");
    if (closeBtn) closeBtn.onclick = () => closeGalleryLightbox();

    const prevBtn = document.getElementById("btn-gallery-lightbox-prev");
    if (prevBtn) prevBtn.onclick = () => navigateGalleryLightbox(-1);

    const nextBtn = document.getElementById("btn-gallery-lightbox-next");
    if (nextBtn) nextBtn.onclick = () => navigateGalleryLightbox(1);
  }

  function openGalleryLightbox(index, list) {
    currentQuickViewGallery = list || [];
    activeGalleryPreviewIndex = typeof index === "number" ? index : 0;
    renderGalleryLightbox();
  }

  function navigateGalleryLightbox(direction) {
    if (!currentQuickViewGallery || !currentQuickViewGallery.length) return;
    const total = currentQuickViewGallery.length;
    let nextIdx = (activeGalleryPreviewIndex + direction) % total;
    if (nextIdx < 0) nextIdx = total - 1;
    activeGalleryPreviewIndex = nextIdx;
    renderGalleryLightbox();
  }

  function closeGalleryLightbox() {
    activeGalleryPreviewIndex = null;
    currentQuickViewGallery = [];
    const lightbox = document.getElementById("wishes-gallery-lightbox");
    if (lightbox) {
      lightbox.style.opacity = "0";
      lightbox.style.display = "none";
    }
  }

  function isGalleryLightboxOpen() {
    const lightbox = document.getElementById("wishes-gallery-lightbox");
    return activeGalleryPreviewIndex !== null && !!lightbox && lightbox.style.display === "flex";
  }

  /**
   * Renders the Quick View modal DOM (Overview or Detail).
   */
  function renderQuickViewModal() {
    const wish = getQuickViewWish();
    if (!wish) {
      closeQuickView();
      return;
    }

    let overlay = document.getElementById("wishes-quick-view-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "wishes-quick-view-overlay";
      overlay.className = "wishes-quick-view-overlay";
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(8, 3, 14, 0.78);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 16px;
        opacity: 0;
        transition: opacity 0.2s ease;
      `;
      if (document.body && typeof document.body.appendChild === "function") {
        document.body.appendChild(overlay);
      }

      // Close on backdrop click
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          closeQuickView();
        }
      });
    }

    const recipientName = escapeHtml(wish.recipient_name || "Friend");
    const senderName = escapeHtml(wish.sender_name || "Friend");
    const fullUrl = `${window.location.origin}/?w=${encodeURIComponent(wish.id || "")}`;
    const formattedCreatedDate = formatIndianDateTime(wish.created_at);
    const birthDateText = formatBirthDateDisplay(wish);
    const rawId = escapeHtml(wish.id || "");
    const themeName = escapeHtml(resolveWishTheme(wish));
    const fontName = escapeHtml(resolveWishFont(wish));
    const cakeFlavor = escapeHtml(resolveWishCake(wish));

    // Parse collections
    const rawWishes = parseJsonField(wish.wishes_json || wish.wishes || wish.w, []);
    const wishesList = Array.isArray(rawWishes) ? rawWishes : [];
    const wishesCount = wishesList.length;

    const rawReasons = parseJsonField(wish.reasons_json || wish.reasons || wish.r, []);
    const reasonsList = Array.isArray(rawReasons) ? rawReasons : [];
    const reasonsCount = reasonsList.length;

    let rawLetter = wish.letter_lines || wish.letter_json || wish.letterLines || wish.l;
    let letterLinesList = [];
    if (Array.isArray(rawLetter)) {
      letterLinesList = rawLetter;
    } else if (typeof rawLetter === "string") {
      try {
        const parsed = JSON.parse(rawLetter);
        letterLinesList = Array.isArray(parsed) ? parsed : rawLetter.split("\n");
      } catch (e) {
        letterLinesList = rawLetter.split("\n");
      }
    }
    const finalLetterCount = letterLinesList.filter(l => (typeof l === "string" ? l.trim() : Boolean(l))).length;

    const rawTimeline = parseJsonField(wish.timeline_json || wish.timeline || wish.t, []);
    const timelineList = Array.isArray(rawTimeline) ? rawTimeline : [];
    const timelineCount = timelineList.length;

    const rawGallery = parseJsonField(wish.gallery_json || wish.gallery || wish.g, []);
    const galleryList = Array.isArray(rawGallery) ? rawGallery : [];
    const photoCount = galleryList.length;

    const musicActive = Boolean(wish.music_url && typeof wish.music_url === "string" && wish.music_url.trim());
    const videoActive = Boolean(wish.video_url && typeof wish.video_url === "string" && wish.video_url.trim());

    const giftObj = parseJsonField(wish.gift_json || wish.gift || wish.gft, {});
    const giftMessage = giftObj.message || giftObj.m || wish.gift_message || "";
    const giftCoupon = giftObj.coupon || giftObj.c || wish.gift_coupon || "";
    const hasGift = Boolean(giftMessage || giftCoupon);

    // Helpers for media offset
    const getOffset = (url) => {
      if (!url || typeof url !== "string") return 0;
      const match = url.match(/[#&?]bw-start=(\d+)/i) || url.match(/[#&?]t=(\d+)/i);
      return match ? parseInt(match[1], 10) : 0;
    };
    const fmtOffset = (sec) => {
      if (!sec || isNaN(sec)) return "00:00";
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    // ==========================================
    // RENDER DETAIL VIEW IF SECTION IS ACTIVE
    // ==========================================
    let bodyContentHtml = "";

    if (activeQuickViewSection) {
      let sectionTitle = "";
      let detailContentHtml = "";

      if (activeQuickViewSection === "wishes") {
        sectionTitle = `💖 Wishes (${wishesCount} messages)`;
        if (wishesCount > 0) {
          detailContentHtml = `
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${wishesList.map((item, idx) => {
                const text = typeof item === "string" ? item : (item.message || item.text || item.title || "");
                const emoji = (typeof item === "object" && item.emoji) ? item.emoji : "✨";
                if (!text) return "";
                return `
                  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 14px;font-size:0.85rem;color:var(--text-main,#f8fafc);display:flex;align-items:baseline;gap:10px;">
                    <span style="font-size:1.1rem;flex-shrink:0;">${escapeHtml(emoji)}</span>
                    <div style="flex:1;line-height:1.5;">
                      <div style="font-weight:600;color:#e879f9;font-size:0.75rem;margin-bottom:2px;">Wish #${idx + 1}</div>
                      <div style="word-break:break-word;">${escapeHtml(text)}</div>
                    </div>
                  </div>
                `;
              }).filter(Boolean).join("")}
            </div>
          `;
        } else {
          detailContentHtml = `<div style="padding:24px;text-align:center;color:var(--text-dim,#94a3b8);font-style:italic;background:rgba(255,255,255,0.02);border-radius:10px;">Wishes — No wishes added</div>`;
        }
      } else if (activeQuickViewSection === "reasons") {
        sectionTitle = `💭 Reasons (${reasonsCount} items)`;
        if (reasonsCount > 0) {
          detailContentHtml = `
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${reasonsList.map((item, idx) => {
                const text = typeof item === "string" ? item : (item.text || item.title || item.message || "");
                if (!text) return "";
                return `
                  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 14px;font-size:0.85rem;color:var(--text-main,#f8fafc);display:flex;align-items:baseline;gap:10px;">
                    <span style="color:#e879f9;font-size:1rem;flex-shrink:0;">💖</span>
                    <div style="flex:1;line-height:1.5;">
                      <div style="font-weight:600;color:#c084fc;font-size:0.75rem;margin-bottom:2px;">Reason #${idx + 1}</div>
                      <div style="word-break:break-word;">${escapeHtml(text)}</div>
                    </div>
                  </div>
                `;
              }).filter(Boolean).join("")}
            </div>
          `;
        } else {
          detailContentHtml = `<div style="padding:24px;text-align:center;color:var(--text-dim,#94a3b8);font-style:italic;background:rgba(255,255,255,0.02);border-radius:10px;">Reasons — No reasons added</div>`;
        }
      } else if (activeQuickViewSection === "memory") {
        sectionTitle = `📝 Memory Note`;
        if (wish.memory_text && wish.memory_text.trim()) {
          detailContentHtml = `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;font-size:0.88rem;color:var(--text-main,#f8fafc);line-height:1.6;white-space:pre-wrap;word-break:break-word;">
              ${escapeHtml(wish.memory_text.trim())}
            </div>
          `;
        } else {
          detailContentHtml = `<div style="padding:24px;text-align:center;color:var(--text-dim,#94a3b8);font-style:italic;background:rgba(255,255,255,0.02);border-radius:10px;">Memory — Not added</div>`;
        }
      } else if (activeQuickViewSection === "letter") {
        sectionTitle = `💌 Letter (${finalLetterCount} paragraphs)`;
        if (finalLetterCount > 0) {
          detailContentHtml = `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;font-size:0.88rem;color:var(--text-main,#f8fafc);line-height:1.6;">
              ${letterLinesList.map(p => `<p style="margin:0;word-break:break-word;">${escapeHtml(typeof p === "string" ? p : JSON.stringify(p))}</p>`).join("")}
            </div>
          `;
        } else {
          detailContentHtml = `<div style="padding:24px;text-align:center;color:var(--text-dim,#94a3b8);font-style:italic;background:rgba(255,255,255,0.02);border-radius:10px;">Letter — Not added</div>`;
        }
      } else if (activeQuickViewSection === "gift") {
        sectionTitle = `🎁 Gift Message & Coupon`;
        if (hasGift) {
          detailContentHtml = `
            <div style="display:flex;flex-direction:column;gap:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;">
              ${giftMessage ? `<div><span style="font-size:0.75rem;text-transform:uppercase;color:var(--text-dim,#94a3b8);">Message:</span><div style="font-size:0.88rem;color:#fff;margin-top:2px;">${escapeHtml(giftMessage)}</div></div>` : ""}
              ${giftCoupon ? `<div><span style="font-size:0.75rem;text-transform:uppercase;color:var(--text-dim,#94a3b8);">Coupon Code:</span><div style="font-size:0.9rem;font-weight:700;color:#38bdf8;margin-top:2px;">🎟️ ${escapeHtml(giftCoupon)}</div></div>` : ""}
            </div>
          `;
        } else {
          detailContentHtml = `<div style="padding:24px;text-align:center;color:var(--text-dim,#94a3b8);font-style:italic;background:rgba(255,255,255,0.02);border-radius:10px;">Gift — Not added</div>`;
        }
      } else if (activeQuickViewSection === "music") {
        sectionTitle = `🎵 Background Music`;
        if (musicActive) {
          const offset = getOffset(wish.music_url);
          detailContentHtml = `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;">
              <div style="font-size:0.95rem;font-weight:700;color:#38bdf8;">Active 🎵</div>
              <div style="font-size:0.8rem;color:var(--text-dim,#94a3b8);word-break:break-all;">URL: <code style="color:#fff;">${escapeHtml(wish.music_url)}</code></div>
              ${offset > 0 ? `<div style="font-size:0.8rem;color:#34d399;">Starts at: <strong>${fmtOffset(offset)}</strong></div>` : ""}
            </div>
          `;
        } else {
          detailContentHtml = `<div style="padding:24px;text-align:center;color:var(--text-dim,#94a3b8);font-style:italic;background:rgba(255,255,255,0.02);border-radius:10px;">Music — No background music attached</div>`;
        }
      } else if (activeQuickViewSection === "video") {
        sectionTitle = `🎥 Video Message`;
        if (videoActive) {
          const offset = getOffset(wish.video_url);
          detailContentHtml = `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;">
              <div style="font-size:0.95rem;font-weight:700;color:#f43f5e;">Active 🎥</div>
              <div style="font-size:0.8rem;color:var(--text-dim,#94a3b8);word-break:break-all;">URL: <code style="color:#fff;">${escapeHtml(wish.video_url)}</code></div>
              ${offset > 0 ? `<div style="font-size:0.8rem;color:#34d399;">Starts at: <strong>${fmtOffset(offset)}</strong></div>` : ""}
            </div>
          `;
        } else {
          detailContentHtml = `<div style="padding:24px;text-align:center;color:var(--text-dim,#94a3b8);font-style:italic;background:rgba(255,255,255,0.02);border-radius:10px;">Video — No video message attached</div>`;
        }
      } else if (activeQuickViewSection === "gallery") {
        sectionTitle = `📸 Gallery Photos (${photoCount} items)`;
        if (photoCount > 0) {
          detailContentHtml = `
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:10px;">
              ${galleryList.map((item, idx) => {
                const imgUrl = extractImageUrl(item);
                const caption = extractImageCaption(item, idx);
                const hasValidUrl = Boolean(imgUrl && imgUrl.length > 0);
                return `
                  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:6px;">
                    <div class="gallery-photo-thumb-wrap" data-index="${idx}" style="position:relative;width:100%;aspect-ratio:4/3;border-radius:6px;overflow:hidden;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;">
                      ${hasValidUrl ? `
                        <img src="${escapeHtml(imgUrl)}" alt="Photo #${idx + 1}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
                        <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:0.7rem;color:var(--text-dim,#94a3b8);text-align:center;padding:4px;">Image preview unavailable</div>
                      ` : `
                        <div style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;font-size:0.7rem;color:var(--text-dim,#94a3b8);text-align:center;padding:4px;">Image preview unavailable</div>
                      `}
                      <span style="position:absolute;top:4px;left:4px;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);color:#fff;font-size:0.68rem;font-weight:700;padding:2px 6px;border-radius:4px;">#${idx + 1}</span>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                      <span style="font-size:0.72rem;color:var(--text-dim,#94a3b8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(caption)}">${escapeHtml(caption)}</span>
                      <button type="button" class="btn-gallery-view-item" data-index="${idx}" style="background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.25);color:#38bdf8;font-size:0.72rem;font-weight:600;flex-shrink:0;padding:2px 6px;border-radius:4px;cursor:pointer;">View ↗</button>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          `;
        } else {
          detailContentHtml = `<div style="padding:24px;text-align:center;color:var(--text-dim,#94a3b8);font-style:italic;background:rgba(255,255,255,0.02);border-radius:10px;">Gallery — No photos added</div>`;
        }
      } else if (activeQuickViewSection === "timeline") {
        sectionTitle = `⏳ Timeline Milestones (${timelineCount} items)`;
        if (timelineCount > 0) {
          detailContentHtml = `
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${timelineList.map((item, idx) => {
                const year = item.year || item.date || "";
                const title = item.title || "";
                const desc = item.desc || item.description || "";
                return `
                  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 14px;font-size:0.85rem;color:var(--text-main,#f8fafc);">
                    <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#34d399;margin-bottom:4px;">
                      <span>⏳ #${idx + 1}</span>
                      ${year ? `<span style="background:rgba(52,211,153,0.15);padding:2px 6px;border-radius:4px;font-size:0.75rem;">${escapeHtml(year)}</span>` : ""}
                      <span>${escapeHtml(title)}</span>
                    </div>
                    ${desc ? `<div style="font-size:0.8rem;color:var(--text-dim,#94a3b8);line-height:1.4;">${escapeHtml(desc)}</div>` : ""}
                  </div>
                `;
              }).join("")}
            </div>
          `;
        } else {
          detailContentHtml = `<div style="padding:24px;text-align:center;color:var(--text-dim,#94a3b8);font-style:italic;background:rgba(255,255,255,0.02);border-radius:10px;">Timeline — No milestones added</div>`;
        }
      }

      bodyContentHtml = `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:10px;">
            <button type="button" class="btn-sm" id="btn-quick-view-back" style="display:inline-flex;align-items:center;gap:5px;width:auto;flex:0 0 auto;padding:4px 10px;font-size:0.78rem;">← Back to Overview</button>
            <h4 style="margin:0;font-size:0.92rem;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sectionTitle}</h4>
          </div>
          <div style="max-height:55vh;overflow-y:auto;padding-right:4px;">
            ${detailContentHtml}
          </div>
        </div>
      `;
    } else {
      // ==========================================
      // RENDER MAIN DASHBOARD OVERVIEW
      // ==========================================
      bodyContentHtml = `
        <!-- Technical: Compact UUID & Public URL Row -->
        <div style="display:flex;flex-direction:column;gap:6px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:8px 12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;overflow:hidden;">
              <span style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-dim,#94a3b8);white-space:nowrap;flex-shrink:0;">UUID:</span>
              <code style="font-size:0.78rem;color:#c084fc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;" title="${rawId}">${rawId}</code>
            </div>
            <button type="button" class="btn-sm" id="btn-quick-view-copy-uuid" data-id="${rawId}" style="white-space:nowrap;width:auto;flex:0 0 auto;padding:3px 10px;font-size:0.75rem;height:26px;display:inline-flex;align-items:center;gap:4px;">📋 Copy UUID</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:0.75rem;border-top:1px solid rgba(255,255,255,0.04);padding-top:6px;">
            <span style="color:var(--text-dim,#94a3b8);">Created: <strong style="color:#fff;">${formattedCreatedDate}</strong></span>
            <a href="${fullUrl}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;display:inline-flex;align-items:center;gap:4px;font-weight:600;padding:2px 8px;border-radius:4px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.2);" title="Open public birthday wish page in new tab">🌐 Open Public Page ↗</a>
          </div>
        </div>

        <!-- Basic Info Grid -->
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
          <div style="background:rgba(255,255,255,0.02);border-radius:8px;padding:8px 10px;">
            <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-dim,#94a3b8);">🎂 Birthday</div>
            <div style="font-size:0.85rem;font-weight:600;color:#fff;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${birthDateText}</div>
          </div>
          <div style="background:rgba(255,255,255,0.02);border-radius:8px;padding:8px 10px;">
            <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-dim,#94a3b8);">👤 Recipient</div>
            <div style="font-size:0.85rem;font-weight:600;color:#fff;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${recipientName}</div>
          </div>
          <div style="background:rgba(255,255,255,0.02);border-radius:8px;padding:8px 10px;">
            <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-dim,#94a3b8);">✍️ Sender</div>
            <div style="font-size:0.85rem;font-weight:600;color:#fff;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${senderName}</div>
          </div>
        </div>

        <!-- Section: Content & Highlights Cards -->
        <div>
          <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-dim,#94a3b8);margin-bottom:6px;">Content & Highlights</div>
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;">
            <button type="button" class="quick-view-card-btn" data-section="letter" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 8px;text-align:center;cursor:pointer;color:inherit;font-family:inherit;transition:all 0.15s ease;">
              <div style="font-size:1.1rem;">💌</div>
              <div style="font-size:0.82rem;font-weight:700;color:#a855f7;margin-top:2px;">Letter (${finalLetterCount})</div>
              <div style="font-size:0.68rem;color:var(--text-dim,#94a3b8);margin-top:2px;">Click to view →</div>
            </button>
            <button type="button" class="quick-view-card-btn" data-section="memory" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 8px;text-align:center;cursor:pointer;color:inherit;font-family:inherit;transition:all 0.15s ease;">
              <div style="font-size:1.1rem;">📝</div>
              <div style="font-size:0.82rem;font-weight:700;color:#38bdf8;margin-top:2px;">Memory</div>
              <div style="font-size:0.68rem;color:var(--text-dim,#94a3b8);margin-top:2px;">${wish.memory_text ? "Available" : "Not added"}</div>
            </button>
            <button type="button" class="quick-view-card-btn" data-section="reasons" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 8px;text-align:center;cursor:pointer;color:inherit;font-family:inherit;transition:all 0.15s ease;">
              <div style="font-size:1.1rem;">💭</div>
              <div style="font-size:0.82rem;font-weight:700;color:#c084fc;margin-top:2px;">Reasons (${reasonsCount})</div>
              <div style="font-size:0.68rem;color:var(--text-dim,#94a3b8);margin-top:2px;">Click to view →</div>
            </button>
            <button type="button" class="quick-view-card-btn" data-section="wishes" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 8px;text-align:center;cursor:pointer;color:inherit;font-family:inherit;transition:all 0.15s ease;">
              <div style="font-size:1.1rem;">💖</div>
              <div style="font-size:0.82rem;font-weight:700;color:#e879f9;margin-top:2px;">Wishes (${wishesCount})</div>
              <div style="font-size:0.68rem;color:var(--text-dim,#94a3b8);margin-top:2px;">Click to view →</div>
            </button>
          </div>
        </div>

        <!-- Section: Media Highlights Cards -->
        <div>
          <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-dim,#94a3b8);margin-bottom:6px;">Media & Highlights</div>
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;">
            <button type="button" class="quick-view-card-btn" data-section="gallery" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:8px;text-align:center;cursor:pointer;color:inherit;font-family:inherit;transition:all 0.15s ease;">
              <div style="font-size:0.95rem;font-weight:700;color:#fbbf24;">${photoCount} 📸</div>
              <div style="font-size:0.68rem;color:var(--text-dim,#94a3b8);margin-top:2px;">Photos</div>
            </button>
            <button type="button" class="quick-view-card-btn" data-section="timeline" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:8px;text-align:center;cursor:pointer;color:inherit;font-family:inherit;transition:all 0.15s ease;">
              <div style="font-size:0.95rem;font-weight:700;color:#34d399;">${timelineCount} ⏳</div>
              <div style="font-size:0.68rem;color:var(--text-dim,#94a3b8);margin-top:2px;">Timeline</div>
            </button>
            <button type="button" class="quick-view-card-btn" data-section="music" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:8px;text-align:center;cursor:pointer;color:inherit;font-family:inherit;transition:all 0.15s ease;">
              <div style="font-size:0.95rem;font-weight:700;color:#38bdf8;">${musicActive ? "Active 🎵" : "None"}</div>
              <div style="font-size:0.68rem;color:var(--text-dim,#94a3b8);margin-top:2px;">Music</div>
            </button>
            <button type="button" class="quick-view-card-btn" data-section="video" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:8px;text-align:center;cursor:pointer;color:inherit;font-family:inherit;transition:all 0.15s ease;">
              <div style="font-size:0.95rem;font-weight:700;color:#f43f5e;">${videoActive ? "Active 🎥" : "None"}</div>
              <div style="font-size:0.68rem;color:var(--text-dim,#94a3b8);margin-top:2px;">Video</div>
            </button>
          </div>
        </div>

        <!-- Section: Customization & Gift Summary (Exactly 4 equal columns in ONE line) -->
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:8px 12px;display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:8px;font-size:0.75rem;color:var(--text-dim,#94a3b8);align-items:center;box-sizing:border-box;">
          <div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="Theme: ${themeName}">
            <span>🎨 Theme:</span> <strong style="color:#fff;">${themeName}</strong>
          </div>
          <div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="Font: ${fontName}">
            <span>🔤 Font:</span> <strong style="color:#fff;">${fontName}</strong>
          </div>
          <div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="Cake: ${cakeFlavor}">
            <span>🍰 Cake:</span> <strong style="color:#fff;">${cakeFlavor}</strong>
          </div>
          <div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:${hasGift ? "pointer" : "default"};" class="${hasGift ? "quick-view-card-btn" : ""}" data-section="gift" title="${hasGift ? "Click to view gift details" : "No gift attached"}">
            <span>🎁 Gift:</span> <strong style="color:${hasGift ? "#38bdf8" : "#fff"};">${hasGift ? "Attached (View →)" : "None"}</strong>
          </div>
        </div>
      `;
    }

    overlay.innerHTML = `
      <div class="quick-view-card" id="wishes-quick-view-card" style="
        position: relative;
        background: rgba(20, 10, 32, 0.96);
        border: 1px solid rgba(168, 85, 247, 0.35);
        border-radius: 16px;
        box-shadow: 0 25px 60px rgba(0,0,0,0.85), 0 0 30px rgba(168, 85, 247, 0.15);
        max-width: 640px;
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: var(--text-main, #f8fafc);
        font-family: inherit;
      ">
        <!-- Floating Feedback Toast in Top-Right Area of Quick View Card -->
        <div id="wishes-quick-view-toast" style="display:none;position:absolute;top:14px;right:52px;background:rgba(30,12,50,0.98);border:1px solid #c084fc;color:#fff;padding:5px 12px;border-radius:8px;font-size:0.75rem;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.9), 0 0 12px rgba(168,85,247,0.4);z-index:10000;pointer-events:none;transition:opacity 0.2s ease;white-space:nowrap;"></div>

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg, #ec4899, #8b5cf6);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:1.1rem;color:#fff;flex-shrink:0;">
              ${escapeHtml((wish.recipient_name || "W").charAt(0).toUpperCase())}
            </div>
            <div style="min-width:0;">
              <h3 style="margin:0;font-size:1.05rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${recipientName}</h3>
              <span style="font-size:0.75rem;color:var(--text-dim, #94a3b8);">Created by: <strong style="color:var(--text-main, #e2e8f0);">${senderName}</strong></span>
            </div>
          </div>
          <button type="button" id="btn-quick-view-close" class="btn-icon" style="background:transparent;border:none;color:var(--text-dim, #94a3b8);font-size:1.2rem;cursor:pointer;padding:4px 8px;border-radius:6px;flex-shrink:0;" title="Close Quick View (Esc)" aria-label="Close">✕</button>
        </div>

        <!-- Body Content (Overview or Detail) -->
        <div style="padding:16px 18px;overflow-y:auto;display:flex;flex-direction:column;gap:14px;font-size:0.85rem;">
          ${bodyContentHtml}
        </div>

        <!-- Footer Actions (Single Horizontal Row) -->
        <div style="display:flex;flex-wrap:nowrap;align-items:center;justify-content:space-between;gap:8px;padding:12px 18px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);overflow-x:auto;">
          <div style="display:flex;flex-wrap:nowrap;align-items:center;gap:6px;">
            <button type="button" class="btn-primary" id="btn-quick-view-edit" data-id="${rawId}" style="display:inline-flex;align-items:center;justify-content:center;gap:5px;height:32px;padding:0 12px;font-size:0.8rem;white-space:nowrap;">✏️ Edit</button>
            <button type="button" class="btn-sm" id="btn-quick-view-duplicate" data-id="${rawId}" style="display:inline-flex;align-items:center;justify-content:center;gap:5px;height:32px;padding:0 12px;font-size:0.8rem;white-space:nowrap;">📋 Duplicate</button>
            <button type="button" class="btn-sm" id="btn-quick-view-copy-link" data-id="${rawId}" style="display:inline-flex;align-items:center;justify-content:center;gap:5px;height:32px;padding:0 12px;font-size:0.8rem;white-space:nowrap;">🔗 Copy Link</button>
            <button type="button" class="btn-sm danger" id="btn-quick-view-delete" data-id="${rawId}" style="display:inline-flex;align-items:center;justify-content:center;gap:5px;height:32px;padding:0 12px;font-size:0.8rem;white-space:nowrap;">🗑️ Delete</button>
          </div>
          <button type="button" class="btn-sm" id="btn-quick-view-close-footer" style="display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 14px;font-size:0.8rem;white-space:nowrap;">Close</button>
        </div>
      </div>
    `;

    overlay.style.display = "flex";
    overlay.style.opacity = "1";

    // Bind Header & Footer Controls
    const closeBtn = document.getElementById("btn-quick-view-close");
    const closeFooterBtn = document.getElementById("btn-quick-view-close-footer");
    const editBtn = document.getElementById("btn-quick-view-edit");
    const dupBtn = document.getElementById("btn-quick-view-duplicate");
    const copyLinkBtn = document.getElementById("btn-quick-view-copy-link");
    const copyUuidBtn = document.getElementById("btn-quick-view-copy-uuid");
    const delBtn = document.getElementById("btn-quick-view-delete");
    const backBtn = document.getElementById("btn-quick-view-back");

    if (closeBtn) closeBtn.onclick = () => closeQuickView();
    if (closeFooterBtn) closeFooterBtn.onclick = () => closeQuickView();

    if (backBtn) {
      backBtn.onclick = () => {
        activeQuickViewSection = null;
        renderQuickViewModal();
      };
    }

    // Card click handlers (transitions to detail view)
    const cardBtns = overlay.querySelectorAll(".quick-view-card-btn");
    cardBtns.forEach(btn => {
      btn.onclick = () => {
        const sec = btn.dataset.section;
        if (sec) {
          activeQuickViewSection = sec;
          renderQuickViewModal();
        }
      };
    });

    // Gallery View Lightbox Bindings
    const galleryViewBtns = overlay.querySelectorAll(".btn-gallery-view-item, .gallery-photo-thumb-wrap");
    galleryViewBtns.forEach(btn => {
      btn.onclick = (e) => {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (!isNaN(idx)) {
          openGalleryLightbox(idx, galleryList);
        }
      };
    });

    if (editBtn) {
      editBtn.onclick = () => {
        const targetId = wish.id;
        closeQuickView();
        openWishEditor(targetId);
      };
    }

    if (dupBtn) {
      dupBtn.onclick = async () => {
        const targetId = wish.id;
        closeQuickView();
        await duplicateWish(targetId);
      };
    }

    if (copyLinkBtn) {
      copyLinkBtn.onclick = async () => {
        if (window.AdminCore && typeof window.AdminCore.copyWishUrl === "function") {
          window.AdminCore.copyWishUrl(fullUrl);
        } else {
          const nav = window.navigator || (typeof navigator !== "undefined" ? navigator : null);
          if (nav && nav.clipboard && typeof nav.clipboard.writeText === "function") {
            await nav.clipboard.writeText(fullUrl);
          }
        }
        showQuickViewToast("🔗 Shareable link copied to clipboard!");
      };
    }

    if (copyUuidBtn) {
      copyUuidBtn.onclick = async () => {
        const nav = window.navigator || (typeof navigator !== "undefined" ? navigator : null);
        if (nav && nav.clipboard && typeof nav.clipboard.writeText === "function") {
          await nav.clipboard.writeText(wish.id || "");
        }
        showQuickViewToast("📋 UUID copied to clipboard!");
      };
    }

    if (delBtn) {
      delBtn.onclick = async () => {
        const targetId = wish.id;
        closeQuickView();
        await deleteWish(targetId);
      };
    }
  }

  /**
   * Opens Quick View modal for a given wish UUID.
   * @param {string} wishId - Wish UUID to inspect.
   */
  function openQuickView(wishId) {
    if (!wishId) return;
    const wish = wishesState.find(w => w && w.id && w.id.trim() === String(wishId).trim());
    if (!wish) {
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast("Wish record not found ⚠️");
      }
      return;
    }

    activeQuickViewWishId = wish.id;
    activeQuickViewSection = null; // Always open in overview mode
    renderQuickViewModal();
  }

  /**
   * Closes the Quick View modal.
   */
  function closeQuickView() {
    closeGalleryLightbox();
    activeQuickViewWishId = null;
    activeQuickViewSection = null;
    if (quickViewToastTimer) {
      clearTimeout(quickViewToastTimer);
      quickViewToastTimer = null;
    }
    const overlay = document.getElementById("wishes-quick-view-overlay");
    if (overlay) {
      overlay.style.opacity = "0";
      overlay.style.display = "none";
    }
  }

  /* ============================================================
     14. AUTHORITATIVE PUBLIC API
     ============================================================ */
  window.AdminWishes = Object.freeze({
    init,
    render,
    clearSearch,
    resetFilters,
    openQuickView,
    closeQuickView,
    getQuickViewWish,
    setWishes,
    getWishes,
    deleteWish,
    deleteSelectedWishes,
    duplicateWish,
    duplicateSelectedWishes,
    getSelectedWishLinks,
    copySelectedWishLinks,
    getSelectedWishesData,
    formatWishesToCSV,
    exportSelectedWishes,
    getProcessedWishes,
    getFilteredAndSortedWishes,
    openWishEditor,
    hasMusic,
    hasVideo,
    hasPhotos,
    getPhotoCount,
    getLetterCount,
    getTimelineCount,
    getMediaOffset,
    formatOffset,
    renderContentBadges,
    matchesDateFilter,
    getSortState,
    setSortState,
    toggleSortByField,
    getPage,
    setPage,
    getPageSize,
    setPageSize,
    getTotalPages,
    getSelectedIds,
    isWishSelected,
    selectWish,
    deselectWish,
    toggleWishSelection,
    selectAllVisible,
    deselectAllVisible,
    clearSelection,
    updateSelectionUI,
    openGalleryLightbox,
    closeGalleryLightbox,
    isGalleryLightboxOpen,
    normalizeBirthDate,
    formatBirthDateDisplay,
    resolveWishTheme,
    resolveWishFont,
    resolveWishCake
  });

})(window);
