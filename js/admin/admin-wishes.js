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
    let lines = w.letter_lines;
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
    const bulkDeleteBtn = document.getElementById(SELECTORS.bulkDeleteBtn);
    const bulkDeleteCount = document.getElementById(SELECTORS.bulkDeleteCount);
    const clearBtn = document.getElementById(SELECTORS.clearSelectionBtn);

    const totalSelected = selectedWishIds.size;

    // 1. Update selection badge, counts & bulk delete button
    if (selectedCountEl) {
      selectedCountEl.textContent = String(totalSelected);
    }
    if (bulkDeleteCount) {
      bulkDeleteCount.textContent = String(totalSelected);
    }
    if (selectionBadge) {
      selectionBadge.style.display = totalSelected > 0 ? "inline-flex" : "none";
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

    // 3. Update row checkboxes in tbody
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
          cb.checked = selectedWishIds.has(id.trim());
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

    if (typeof data !== "undefined") wishesState = Array.isArray(data) ? data : [];
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

      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">
            ${emptyMsg}
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
            <a class="btn-icon" href="${fullUrl}" target="_blank" title="Open Public Page">👁️</a>
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

    // Search Input Listener (resets to page 1)
    const searchInput = document.getElementById(SELECTORS.searchInput);
    if (searchInput && !searchInput.__wishesBound) {
      searchInput.__wishesBound = true;
      searchInput.addEventListener("input", () => {
        paginationState.currentPage = 1;
        render();
      });
    }

    // Search Clear Button Listener (resets to page 1)
    const searchClearBtn = document.getElementById(SELECTORS.searchClearBtn);
    if (searchClearBtn && !searchClearBtn.__wishesBound) {
      searchClearBtn.__wishesBound = true;
      searchClearBtn.addEventListener("click", () => {
        if (searchInput) {
          searchInput.value = "";
          searchInput.focus();
        }
        paginationState.currentPage = 1;
        render();
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

      // Click Actions (Edit, Duplicate, Delete)
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

  /* ============================================================
     12. AUTHORITATIVE PUBLIC API
     ============================================================ */
  window.AdminWishes = Object.freeze({
    init,
    render,
    setWishes,
    getWishes,
    deleteWish,
    deleteSelectedWishes,
    duplicateWish,
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
    updateSelectionUI
  });

})(window);
