/**
 * ============================================================================
 * MODULE: Customizer Birthday Date Picker (js/modules/editor/datepicker.js)
 * Phase 11 Extraction
 *
 * Purpose:
 * Owns Customizer Birthday Date Picker / Popup Calendar controller, date field
 * input masking (DD/MM/YYYY), date validation, year/month grid generation, and
 * date-picker display synchronization into CONFIG state.
 *
 * Owns:
 * - initWishStudioCalendar()
 * - isCurrentBirthdateValid()
 * - syncDatePickerDisplay()
 * - formatUserDisplay()
 * - formatInternalStored()
 * - parseTypedDate()
 *
 * Relationship with other modules:
 * - utils.js owns isValidCalendarDate() (pure date validation helper)
 * - renderers.js owns updateBirthdayCard() & updateAgeCounter() (live DOM updates)
 * - app.js orchestrates customizer modal boot, read/apply values, and reset flows
 * - editor/accordion.js owns accordion section toggling & auto-scroll
 * ============================================================================
 */

(function (root) {
  "use strict";

  /**
   * Safe helper resolving global CONFIG object across window/script scopes.
   */
  function getConfig() {
    if (typeof CONFIG !== "undefined") return CONFIG;
    if (root.CONFIG) return root.CONFIG;
    return {};
  }

  // ============================================================
  // FORMATTING & PARSING HELPERS
  // ============================================================

  /**
   * Formats a JavaScript Date object into user display DD/MM/YYYY string format.
   * @param {Date} dateObj - Calendar date object.
   * @returns {string} Formatted user display date string.
   */
  function formatUserDisplay(dateObj) {
    const d = String(dateObj.getDate()).padStart(2, "0");
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const y = dateObj.getFullYear();
    return `${d}/${m}/${y}`;
  }

  /**
   * Formats a JavaScript Date object into internal stored DD-MM-YYYY string format.
   * @param {Date} dateObj - Calendar date object.
   * @returns {string} Formatted internal stored date string.
   */
  function formatInternalStored(dateObj) {
    const d = String(dateObj.getDate()).padStart(2, "0");
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const y = dateObj.getFullYear();
    return `${d}-${m}-${y}`;
  }

  /**
   * Parses a typed user date string (DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD) into Date object.
   * @param {string} str - Raw typed date string.
   * @returns {Date|null} Parsed Date object or null if invalid.
   */
  function parseTypedDate(str) {
    if (!str) return null;
    str = str.trim();

    const validateFn = root.isValidCalendarDate || (typeof isValidCalendarDate === "function" ? isValidCalendarDate : null);

    // Check DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const numMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (numMatch) {
      const day = parseInt(numMatch[1], 10);
      const monthIdx = parseInt(numMatch[2], 10) - 1;
      const year = parseInt(numMatch[3], 10);
      if (validateFn && validateFn(year, monthIdx, day)) {
        return new Date(year, monthIdx, day);
      }
      return null;
    }

    // Check YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const monthIdx = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      if (validateFn && validateFn(year, monthIdx, day)) {
        return new Date(year, monthIdx, day);
      }
    }

    return null;
  }

  /**
   * Validates whether the currently displayed birthdate string in the customizer input is valid.
   * @returns {boolean} True if valid, false otherwise.
   */
  function isCurrentBirthdateValid() {
    const displayInput = document.getElementById("input-birthdate-display");
    if (!displayInput) return false;
    const val = displayInput.value.trim();
    if (!val) return false;
    return parseTypedDate(val) !== null;
  }

  /**
   * Synchronizes the customizer date picker display and hidden input with current CONFIG.birthDate state.
   */
  function syncDatePickerDisplay() {
    const displayInput = document.getElementById("input-birthdate-display");
    const hiddenInput = document.getElementById("input-birthdate");
    if (!displayInput || !hiddenInput) return;

    const cfg = getConfig();
    let curVal = hiddenInput.value || displayInput.value;
    let parsed = parseTypedDate(curVal);
    if (!parsed && cfg.birthDate) {
      parsed = new Date(cfg.birthDate.year || 2001, (cfg.birthDate.month || 1) - 1, cfg.birthDate.day || 1);
    }
    if (!parsed) parsed = new Date(2001, 0, 1);

    displayInput.value = formatUserDisplay(parsed);
    hiddenInput.value = formatInternalStored(parsed);
    displayInput.classList.remove("input-error");

    const updateCardFn = root.updateBirthdayCard || (typeof updateBirthdayCard === "function" ? updateBirthdayCard : null);
    const updateAgeFn = root.updateAgeCounter || (typeof updateAgeCounter === "function" ? updateAgeCounter : null);
    if (updateCardFn) updateCardFn();
    if (updateAgeFn) updateAgeFn();
  }

  // ============================================================
  // POPUP CALENDAR CONTROLLER
  // ============================================================

  /**
   * Initializes the Wish Studio Luxury Popup Calendar controller and binds keyboard masking & click listeners.
   */
  function initWishStudioCalendar() {
    const modal = document.getElementById("material-date-picker-modal");
    const openBtn = document.getElementById("open-material-datepicker-btn");
    const displayInput = document.getElementById("input-birthdate-display");
    const hiddenInput = document.getElementById("input-birthdate");

    if (!modal || !displayInput || !hiddenInput) return;

    const monthSelect = document.getElementById("mdp-month-select");
    const yearSelect = document.getElementById("mdp-year-select");
    const prevMonthBtn = document.getElementById("mdp-prev-month");
    const nextMonthBtn = document.getElementById("mdp-next-month");
    const prevYearBtn = document.getElementById("mdp-prev-year");
    const nextYearBtn = document.getElementById("mdp-next-year");
    const daysGrid = document.getElementById("mdp-days-grid");
    const todayBtn = document.getElementById("mdp-today-btn");
    const cancelBtn = document.getElementById("mdp-cancel-btn");
    const okBtn = document.getElementById("mdp-ok-btn");

    let selectedDate = new Date(2001, 0, 1);
    let viewDate = new Date(2001, 0, 1);

    // Populate Year Select (1900 to Current Year + 10)
    if (yearSelect && yearSelect.options.length === 0) {
      const curYear = new Date().getFullYear();
      const maxYr = curYear + 10;
      for (let y = maxYr; y >= 1900; y--) {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        opt.style.background = "#1B1530";
        opt.style.color = "#fff";
        yearSelect.appendChild(opt);
      }
    }

    const updateCardFn = () => {
      const fn = root.updateBirthdayCard || (typeof updateBirthdayCard === "function" ? updateBirthdayCard : null);
      if (fn) fn();
    };
    const updateAgeFn = () => {
      const fn = root.updateAgeCounter || (typeof updateAgeCounter === "function" ? updateAgeCounter : null);
      if (fn) fn();
    };
    const toastFn = (msg) => {
      const fn = root.showToast || (typeof showToast === "function" ? showToast : null);
      if (fn) fn(msg);
    };

    function renderGrid() {
      if (!daysGrid) return;
      daysGrid.innerHTML = "";

      const yr = viewDate.getFullYear();
      const mo = viewDate.getMonth();

      if (monthSelect) monthSelect.value = mo;
      if (yearSelect) yearSelect.value = yr;

      const firstDayIndex = new Date(yr, mo, 1).getDay();
      const totalDays = new Date(yr, mo + 1, 0).getDate();
      const prevMonthDays = new Date(yr, mo, 0).getDate();

      const today = new Date();

      // Render Prev Month Days
      for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dayNum = prevMonthDays - i;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mdp-day-btn prev-month";
        btn.textContent = dayNum;
        btn.style.cssText = "background:none;border:none;color:rgba(255,255,255,0.25);font-size:0.85rem;padding:8px 0;border-radius:10px;cursor:pointer;";
        btn.addEventListener("click", () => {
          viewDate.setMonth(mo - 1);
          viewDate.setDate(dayNum);
          selectedDate = new Date(viewDate);
          renderGrid();
        });
        daysGrid.appendChild(btn);
      }

      // Render Current Month Days
      for (let d = 1; d <= totalDays; d++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mdp-day-btn";
        btn.textContent = d;

        const isSelected = selectedDate.getFullYear() === yr && selectedDate.getMonth() === mo && selectedDate.getDate() === d;
        const isToday = today.getFullYear() === yr && today.getMonth() === mo && today.getDate() === d;

        let style = "background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;font-size:0.85rem;font-weight:600;padding:8px 0;border-radius:10px;cursor:pointer;transition:all 0.2s;";

        if (isSelected) {
          style = "background:linear-gradient(135deg, #F7C94A, #e5b630);border:1px solid #ffd700;color:#120D24;font-size:0.85rem;font-weight:800;padding:8px 0;border-radius:10px;cursor:pointer;box-shadow:0 0 15px rgba(247,201,74,0.6);transform:scale(1.05);";
        } else if (isToday) {
          style = "background:rgba(168,85,247,0.2);border:1px solid rgba(247,201,74,0.6);color:#ffd700;font-size:0.85rem;font-weight:700;padding:8px 0;border-radius:10px;cursor:pointer;";
        }

        btn.style.cssText = style;

        btn.addEventListener("click", () => {
          selectedDate = new Date(yr, mo, d);
          viewDate = new Date(yr, mo, d);
          displayInput.value = formatUserDisplay(selectedDate);
          hiddenInput.value = formatInternalStored(selectedDate);
          displayInput.classList.remove("input-error");

          const cfg = getConfig();
          if (cfg.birthDate) {
            cfg.birthDate.year = yr;
            cfg.birthDate.month = mo + 1;
            cfg.birthDate.day = d;
          }

          updateCardFn();
          updateAgeFn();

          closeCalendar();
        });

        daysGrid.appendChild(btn);
      }
    }

    function openCalendar() {
      syncDatePickerDisplay();
      renderGrid();
      modal.style.display = "flex";
      modal.classList.add("open");
    }

    function closeCalendar() {
      modal.style.display = "none";
      modal.classList.remove("open");
    }

    // Triggers
    if (openBtn) openBtn.addEventListener("click", (e) => { e.preventDefault(); openCalendar(); });

    // Segmented Date Input Keyboard & Navigation Handler
    // Segment-aware cursor navigation preventing Backspace/Delete from jumping across Day/Month/Year
    displayInput.addEventListener("keydown", (e) => {
      if (
        ["Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) ||
        e.ctrlKey || e.metaKey
      ) {
        return;
      }

      const pos = displayInput.selectionStart || 0;

      // Smart Backspace handling: prevent slash removal and unwanted segment jumping
      if (e.key === "Backspace") {
        if (pos === 3 || pos === 6) {
          e.preventDefault();
          displayInput.setSelectionRange(pos - 1, pos - 1);
          return;
        }
        return;
      }

      // Delete key handling: prevent slash removal and advance into next segment
      if (e.key === "Delete") {
        if (pos === 2 || pos === 5) {
          e.preventDefault();
          displayInput.setSelectionRange(pos + 1, pos + 1);
          return;
        }
        return;
      }

      // Allow only numeric digits
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        return;
      }

      // Auto-advance past slashes if cursor is positioned on slash
      if (pos === 2 || pos === 5) {
        displayInput.setSelectionRange(pos + 1, pos + 1);
      }
    });

    /**
     * Segment-aware typed date value synchronizer with Segment Overflow Rule.
     * Preserves Day (max 2 digits), Month (max 2 digits), and Year (max 4 digits).
     * Automatically transfers extra digits typed into a completed segment into the NEXT segment (e.g. 17/08 + '2' -> 17/08/2).
     */
    function syncTypedValue() {
      const val = displayInput.value;
      const initialPos = displayInput.selectionStart || 0;
      const wasAtEnd = (initialPos >= val.length - 1);
      let masked = "";

      let rawDay = "";
      let rawMonth = "";
      let rawYear = "";

      if (val.includes("/") || val.includes("-") || val.includes(".")) {
        const parts = val.split(/[\/\-\.]/);
        let p0 = (parts[0] || "").replace(/\D/g, "");
        let p1 = (parts[1] || "").replace(/\D/g, "");
        let p2 = (parts[2] || "").replace(/\D/g, "");

        // Day segment (max 2 digits)
        rawDay = p0.slice(0, 2);
        let overflowFromDay = p0.slice(2);

        // Month segment (max 2 digits, accepting overflow from day)
        p1 = overflowFromDay + p1;
        rawMonth = p1.slice(0, 2);
        let overflowFromMonth = p1.slice(2);

        // Year segment (max 4 digits, accepting overflow from month)
        p2 = overflowFromMonth + p2;
        rawYear = p2.slice(0, 4);

        if (parts.length >= 3 || rawYear.length > 0) {
          masked = `${rawDay}/${rawMonth}/${rawYear}`;
        } else if (parts.length === 2 || rawMonth.length > 0 || (rawDay.length === 2 && val.endsWith("/"))) {
          masked = `${rawDay}/${rawMonth}`;
          if (rawMonth.length === 2 && !val.endsWith("/")) {
            masked += "/";
          }
        } else {
          masked = rawDay;
          if (rawDay.length === 2) {
            masked += "/";
          }
        }
      } else {
        // Unsegmented typing / pasting (e.g. 17082001)
        let raw = val.replace(/\D/g, "").slice(0, 8);
        if (raw.length > 0) {
          rawDay = raw.slice(0, 2);
          rawMonth = raw.slice(2, 4);
          rawYear = raw.slice(4, 8);
          if (raw.length <= 2) {
            masked = rawDay + (rawDay.length === 2 ? "/" : "");
          } else if (raw.length <= 4) {
            masked = rawDay + "/" + rawMonth + (rawMonth.length === 2 ? "/" : "");
          } else {
            masked = rawDay + "/" + rawMonth + "/" + rawYear;
          }
        }
      }

      let newPos = initialPos;
      if (wasAtEnd) {
        newPos = masked.length;
      } else if (initialPos === 2 && masked.length > 2 && masked[2] === "/") {
        newPos = 3;
      } else if (initialPos === 5 && masked.length > 5 && masked[5] === "/") {
        newPos = 6;
      }

      displayInput.value = masked;
      if (typeof displayInput.setSelectionRange === "function") {
        try { displayInput.setSelectionRange(newPos, newPos); } catch (err) {}
      }

      // Parse complete full date via parseTypedDate (source of truth)
      const typed = parseTypedDate(masked);
      if (typed) {
        selectedDate = typed;
        viewDate = new Date(typed);
        hiddenInput.value = formatInternalStored(selectedDate);
        displayInput.classList.remove("input-error");
        const cfg = getConfig();
        if (cfg.birthDate) {
          cfg.birthDate.year = typed.getFullYear();
          cfg.birthDate.month = typed.getMonth() + 1;
          cfg.birthDate.day = typed.getDate();
        }
        updateCardFn();
        updateAgeFn();
      } else if (masked.replace(/\D/g, "").length === 8) {
        displayInput.classList.add("input-error");
      } else {
        displayInput.classList.remove("input-error");
      }
    }

    // Manual Typing Parser on Input & Blur
    displayInput.addEventListener("input", syncTypedValue);

    displayInput.addEventListener("blur", () => {
      syncTypedValue();
      const val = displayInput.value.trim();
      if (!val) return;
      const typed = parseTypedDate(val);
      if (typed) {
        displayInput.value = formatUserDisplay(typed);
        displayInput.classList.remove("input-error");
      } else {
        displayInput.classList.add("input-error");
        toastFn("Please enter a valid calendar date.");
      }
    });

    // Month / Year Navigation
    if (prevMonthBtn) prevMonthBtn.addEventListener("click", () => { viewDate.setMonth(viewDate.getMonth() - 1); renderGrid(); });
    if (nextMonthBtn) nextMonthBtn.addEventListener("click", () => { viewDate.setMonth(viewDate.getMonth() + 1); renderGrid(); });
    if (prevYearBtn) prevYearBtn.addEventListener("click", () => { viewDate.setFullYear(viewDate.getFullYear() - 1); renderGrid(); });
    if (nextYearBtn) nextYearBtn.addEventListener("click", () => { viewDate.setFullYear(viewDate.getFullYear() + 1); renderGrid(); });

    if (monthSelect) monthSelect.addEventListener("change", (e) => { viewDate.setMonth(parseInt(e.target.value, 10)); renderGrid(); });
    if (yearSelect) yearSelect.addEventListener("change", (e) => { viewDate.setFullYear(parseInt(e.target.value, 10)); renderGrid(); });

    if (todayBtn) todayBtn.addEventListener("click", () => {
      selectedDate = new Date();
      viewDate = new Date();
      displayInput.value = formatUserDisplay(selectedDate);
      hiddenInput.value = formatInternalStored(selectedDate);
      const cfg = getConfig();
      if (cfg.birthDate) {
        cfg.birthDate.year = selectedDate.getFullYear();
        cfg.birthDate.month = selectedDate.getMonth() + 1;
        cfg.birthDate.day = selectedDate.getDate();
      }
      updateCardFn();
      updateAgeFn();
      closeCalendar();
    });

    if (cancelBtn) cancelBtn.addEventListener("click", closeCalendar);
    if (okBtn) okBtn.addEventListener("click", closeCalendar);

    // Close on Backdrop Click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeCalendar();
    });

    // ESC key listener
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.style.display !== "none") {
        closeCalendar();
      }
    });

    // Initial sync
    syncDatePickerDisplay();
  }

  // Export public symbols globally on root (window)
  root.initWishStudioCalendar = initWishStudioCalendar;
  root.isCurrentBirthdateValid = isCurrentBirthdateValid;
  root.syncDatePickerDisplay = syncDatePickerDisplay;

})(typeof window !== "undefined" ? window : globalThis);
