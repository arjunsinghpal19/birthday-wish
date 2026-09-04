/**
 * ============================================================================
 * CUSTOMER WISH EDITOR RENDERERS (js/customer/customer-editor-renderers.js)
 * Architecture: Phase 32E-2 Customer Platform Foundation
 *
 * Dedicated UI Renderers, Media Sync, Media Bindings, and Calendar Controller.
 * File size strictly under 35 KB ceiling.
 * ============================================================================
 */

(function (root) {
  "use strict";

  let ytAudioInstance = null;
  let ytVideoInstance = null;

  const el = (id) => document.getElementById(id);
  const on = (id, evt, fn) => { const x = el(id); if (x) x.addEventListener(evt, fn); };
  const setVal = (id, v) => { const x = el(id); if (x) x.value = v; };
  const setTxt = (id, v) => { const x = el(id); if (x) x.textContent = v; };

  function escapeHtml(s) {
    return s ? String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") : "";
  }

  function formatTime(s) {
    const sec = Math.max(0, Math.floor(Number(s) || 0));
    return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
  }

  function parseTime(c) {
    if (typeof c === "number") return Math.max(0, Math.floor(c));
    if (!c || typeof c !== "string") return 0;
    if (c.includes(":")) { const [m, s] = c.split(":").map(n => parseInt(n, 10) || 0); return (m * 60) + s; }
    return Math.max(0, parseInt(c, 10) || 0);
  }

  function formatDisplayDate(b) {
    if (!b) return "01/01/2001";
    return String(b.day || 1).padStart(2, "0") + "/" + String(b.month || 1).padStart(2, "0") + "/" + String(b.year || 2001);
  }

  function parseUserDisplayDate(str) {
    if (!str || typeof str !== "string") return null;
    const clean = str.trim();
    let day = 0, month = 0, year = 0;
    const m1 = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (m1) { day = parseInt(m1[1], 10); month = parseInt(m1[2], 10); year = parseInt(m1[3], 10); }
    else {
      const m2 = clean.match(/^(\d{2})(\d{2})(\d{4})$/);
      if (m2) { day = parseInt(m2[1], 10); month = parseInt(m2[2], 10); year = parseInt(m2[3], 10); }
      else {
        const m3 = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
        if (m3) { year = parseInt(m3[1], 10); month = parseInt(m3[2], 10); day = parseInt(m3[3], 10); }
      }
    }
    if (year && month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const dObj = new Date(year, month - 1, day);
      if (dObj.getFullYear() === year && dObj.getMonth() === month - 1 && dObj.getDate() === day) {
        return { year, month, day };
      }
    }
    return null;
  }

  const calState = {
    activeEditorState: null,
    onDateChange: null,
    selDate: new Date(2001, 0, 1),
    viewDate: new Date(2001, 0, 1),
    isBound: false
  };

  function initCalendar(editorState, onDateChange) {
    const modal = el("cust-date-picker-modal");
    const openBtn = el("cust-btn-datepicker");
    const disp = el("cust-input-birthdate-display");
    const hid = el("cust-input-birthdate");
    if (!modal || !disp) return;

    calState.activeEditorState = editorState;
    calState.onDateChange = onDateChange;

    const mSel = el("cust-mdp-month-select"), ySel = el("cust-mdp-year-select"), grid = el("cust-mdp-days-grid");

    if (ySel && !ySel.options.length) {
      const cy = new Date().getFullYear();
      for (let y = cy + 10; y >= 1900; y--) {
        const opt = document.createElement("option");
        opt.value = y; opt.textContent = y; opt.style.cssText = "background:#1B1530;color:#fff;";
        ySel.appendChild(opt);
      }
    }

    function renderGrid() {
      const grid = el("cust-mdp-days-grid");
      if (!grid) return;
      grid.innerHTML = "";
      const yr = calState.viewDate.getFullYear(), mo = calState.viewDate.getMonth();
      const mSel = el("cust-mdp-month-select"), ySel = el("cust-mdp-year-select");
      if (mSel) mSel.value = mo;
      if (ySel) ySel.value = yr;

      const firstDay = new Date(yr, mo, 1).getDay(), totalDays = new Date(yr, mo + 1, 0).getDate(), prevTotal = new Date(yr, mo, 0).getDate(), today = new Date();
      for (let i = firstDay - 1; i >= 0; i--) {
        const d = prevTotal - i, btn = document.createElement("button");
        btn.type = "button"; btn.className = "mdp-day-btn prev-month"; btn.textContent = d;
        btn.onclick = () => { calState.viewDate.setMonth(mo - 1); calState.viewDate.setDate(d); calState.selDate = new Date(calState.viewDate); renderGrid(); };
        grid.appendChild(btn);
      }
      for (let d = 1; d <= totalDays; d++) {
        const btn = document.createElement("button");
        btn.type = "button"; btn.textContent = d;
        const isSel = calState.selDate.getFullYear() === yr && calState.selDate.getMonth() === mo && calState.selDate.getDate() === d;
        const isTod = today.getFullYear() === yr && today.getMonth() === mo && today.getDate() === d;
        btn.className = "mdp-day-btn" + (isSel ? " selected" : (isTod ? " today" : ""));
        btn.onclick = () => { calState.selDate = new Date(yr, mo, d); calState.viewDate = new Date(calState.selDate); renderGrid(); };
        grid.appendChild(btn);
      }
      const nextCount = (7 - ((firstDay + totalDays) % 7)) % 7;
      for (let n = 1; n <= nextCount; n++) {
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "mdp-day-btn next-month"; btn.textContent = n;
        btn.onclick = () => { calState.viewDate.setMonth(mo + 1); calState.viewDate.setDate(n); calState.selDate = new Date(calState.viewDate); renderGrid(); };
        grid.appendChild(btn);
      }
    }

    const openCal = () => {
      const dispEl = el("cust-input-birthdate-display");
      const cur = calState.activeEditorState?.config?.birthDate || (dispEl ? parseUserDisplayDate(dispEl.value) : null) || { year: 2001, month: 1, day: 1 };
      calState.selDate = new Date(cur.year || 2001, (cur.month || 1) - 1, cur.day || 1);
      calState.viewDate = new Date(calState.selDate);
      renderGrid();
      modal.classList.add("active", "open");
      modal.style.display = "flex";
    };
    const closeCal = () => {
      modal.classList.remove("active", "open");
      modal.style.display = "none";
    };
    const applyDate = () => {
      const yr = calState.selDate.getFullYear(), mo = calState.selDate.getMonth() + 1, dy = calState.selDate.getDate();
      const newDate = { year: yr, month: mo, day: dy };
      if (calState.activeEditorState?.config) {
        calState.activeEditorState.config.birthDate = newDate;
        calState.activeEditorState.isDirty = true;
      }
      disp.value = formatDisplayDate(newDate);
      if (hid) hid.value = yr + "-" + String(mo).padStart(2, "0") + "-" + String(dy).padStart(2, "0");
      disp.classList.remove("input-error");
      if (typeof calState.onDateChange === "function") calState.onDateChange();
      closeCal();
    };

    if (!calState.isBound) {
      calState.isBound = true;
      if (openBtn) openBtn.addEventListener("click", (e) => { e.preventDefault(); openCal(); });
      on("cust-mdp-cancel-btn", "click", closeCal);
      on("cust-mdp-ok-btn", "click", applyDate);
      on("cust-mdp-today-btn", "click", () => { calState.selDate = new Date(); calState.viewDate = new Date(); renderGrid(); });
      on("cust-mdp-prev-month", "click", () => { calState.viewDate.setMonth(calState.viewDate.getMonth() - 1); renderGrid(); });
      on("cust-mdp-next-month", "click", () => { calState.viewDate.setMonth(calState.viewDate.getMonth() + 1); renderGrid(); });
      on("cust-mdp-prev-year", "click", () => { calState.viewDate.setFullYear(calState.viewDate.getFullYear() - 1); renderGrid(); });
      on("cust-mdp-next-year", "click", () => { calState.viewDate.setFullYear(calState.viewDate.getFullYear() + 1); renderGrid(); });
      on("cust-mdp-month-select", "change", (e) => {
        const target = e?.target || el("cust-mdp-month-select");
        const val = parseInt(target?.value, 10);
        if (!isNaN(val)) { calState.viewDate.setMonth(val); renderGrid(); }
      });
      on("cust-mdp-year-select", "change", (e) => {
        const target = e?.target || el("cust-mdp-year-select");
        const val = parseInt(target?.value, 10);
        if (!isNaN(val)) { calState.viewDate.setFullYear(val); renderGrid(); }
      });
      modal.addEventListener("click", (e) => { if (e.target === modal) closeCal(); });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && (modal.classList.contains("active") || modal.style.display === "flex")) {
          closeCal();
        }
      });
    }

    if (disp && !disp.__keyMaskBound) {
      disp.__keyMaskBound = true;

      disp.addEventListener("keydown", (e) => {
        if (
          ["Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) ||
          e.ctrlKey || e.metaKey
        ) {
          return;
        }

        const pos = disp.selectionStart || 0;

        if (e.key === "Backspace") {
          if (pos === 3 || pos === 6) {
            e.preventDefault();
            disp.setSelectionRange(pos - 1, pos - 1);
            return;
          }
          return;
        }

        if (e.key === "Delete") {
          if (pos === 2 || pos === 5) {
            e.preventDefault();
            disp.setSelectionRange(pos + 1, pos + 1);
            return;
          }
          return;
        }

        if (!/^\d$/.test(e.key)) {
          e.preventDefault();
          return;
        }

        if (pos === 2 || pos === 5) {
          disp.setSelectionRange(pos + 1, pos + 1);
        }
      });

      function syncTypedValue() {
        const val = disp.value;
        const initialPos = disp.selectionStart || 0;
        const wasAtEnd = (initialPos >= val.length - 1);
        let p0 = "", p1 = "", p2 = "";

        if (val.includes("/") || val.includes("-") || val.includes(".")) {
          const parts = val.split(/[\/\-\.]/);
          p0 = (parts[0] || "").replace(/\D/g, "").slice(0, 2);
          p1 = (parts[1] || "").replace(/\D/g, "").slice(0, 2);
          p2 = (parts[2] || "").replace(/\D/g, "").slice(0, 4);
        } else {
          const raw = val.replace(/\D/g, "").slice(0, 8);
          p0 = raw.slice(0, 2);
          p1 = raw.slice(2, 4);
          p2 = raw.slice(4, 8);
        }

        // Semantic segment boundary limits (day <= 31, month <= 12)
        if (p0.length === 2) {
          const dNum = parseInt(p0, 10);
          if (dNum > 31) p0 = "31";
          else if (dNum === 0) p0 = "01";
        }
        if (p1.length === 2) {
          const mNum = parseInt(p1, 10);
          if (mNum > 12) p1 = "12";
          else if (mNum === 0) p1 = "01";
        }

        let masked = "";
        if (p2.length > 0 || (val.includes("/") && val.split("/").length > 2)) {
          masked = p0 + "/" + p1 + "/" + p2;
        } else if (p1.length > 0 || (val.includes("/") && val.split("/").length > 1)) {
          masked = p0 + "/" + p1 + (p1.length === 2 ? "/" : "");
        } else if (p0.length > 0) {
          masked = p0 + (p0.length === 2 ? "/" : "");
        }

        let newPos = initialPos;
        if (wasAtEnd) newPos = masked.length;
        else if (initialPos === 2 && masked.length > 2 && masked[2] === "/") newPos = 3;
        else if (initialPos === 5 && masked.length > 5 && masked[5] === "/") newPos = 6;

        disp.value = masked;
        if (typeof disp.setSelectionRange === "function") {
          try { disp.setSelectionRange(newPos, newPos); } catch (err) {}
        }

        const parsed = parseUserDisplayDate(masked);
        if (parsed) {
          calState.selDate = new Date(parsed.year, parsed.month - 1, parsed.day);
          calState.viewDate = new Date(calState.selDate);
          if (calState.activeEditorState?.config) calState.activeEditorState.config.birthDate = parsed;
          if (hid) hid.value = `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
          disp.classList.remove("input-error");
          if (calState.activeEditorState) calState.activeEditorState.isDirty = true;
          if (typeof calState.onDateChange === "function") calState.onDateChange();
        } else if (masked.replace(/\D/g, "").length === 8) {
          disp.classList.add("input-error");
        } else {
          disp.classList.remove("input-error");
        }
      }

      disp.addEventListener("input", syncTypedValue);

      disp.addEventListener("blur", () => {
        syncTypedValue();
        const val = disp.value.trim();
        if (!val) return;
        const parsed = parseUserDisplayDate(val);
        if (parsed) {
          disp.value = formatDisplayDate(parsed);
          disp.classList.remove("input-error");
        } else {
          disp.classList.add("input-error");
          const toastFn = root.CustomerWishEditor?.showToast || root.CustomerDashboard?.showToast || root.showToast;
          if (typeof toastFn === "function") {
            toastFn("Please enter a valid calendar date (DD/MM/YYYY) ⚠️", "warning");
          }
        }
      });
    }
  }

  function renderLetterLines(editorState) {
    const c = el("cust-letter-lines-container"); if (!c || !editorState.config) return;
    const lines = editorState.config.letterLines || [];
    c.innerHTML = "";
    lines.forEach((line, idx) => {
      const div = document.createElement("div");
      div.className = "repeater-item";
      div.style.marginBottom = "8px";
      div.innerHTML = '<div class="repeater-header"><span class="repeater-title">Paragraph ' + (idx + 1) + '</span>' +
        (lines.length > 1 ? '<button type="button" class="btn-remove-item" data-action="remove-line" data-index="' + idx + '">🗑️ Remove</button>' : '') +
        '</div><textarea class="form-control cust-letter-line" rows="2" data-index="' + idx + '">' + escapeHtml(line) + '</textarea>';
      c.appendChild(div);
    });
  }

  function renderReasons(editorState) {
    const c = el("cust-reasons-container"); if (!c || !editorState.config) return;
    const reasons = editorState.config.reasons || [];
    c.innerHTML = "";
    reasons.forEach((r, idx) => {
      const div = document.createElement("div");
      div.className = "repeater-item cust-reason-item";
      div.innerHTML = '<div class="repeater-header"><span class="repeater-title">Reason #' + (idx + 1) + '</span>' +
        '<button type="button" class="btn-remove-item" data-action="remove-reason" data-index="' + idx + '">🗑️ Remove</button></div>' +
        '<div class="form-grid-2"><div class="form-group"><label>Icon Emoji</label><input type="text" class="form-control cust-reason-icon" data-index="' + idx + '" value="' + escapeHtml(r.icon || "✨") + '" maxlength="4"></div>' +
        '<div class="form-group"><label>Card Title</label><input type="text" class="form-control cust-reason-title" data-index="' + idx + '" value="' + escapeHtml(r.title || "") + '" placeholder="Title"></div></div>' +
        '<div class="form-group"><label>Reason Description</label><textarea class="form-control cust-reason-text" data-index="' + idx + '" rows="2" placeholder="Why they are special...">' + escapeHtml(r.text || "") + '</textarea></div>';
      c.appendChild(div);
    });
  }

  function renderWishes(editorState) {
    const c = el("cust-wishes-container"); if (!c || !editorState.config) return;
    const wishes = editorState.config.wishes || [];
    c.innerHTML = "";
    wishes.forEach((w, idx) => {
      const div = document.createElement("div");
      div.className = "repeater-item";
      div.innerHTML = '<div class="repeater-header"><span class="repeater-title">Wish Quote #' + (idx + 1) + '</span>' +
        '<button type="button" class="btn-remove-item" data-action="remove-wish" data-index="' + idx + '">🗑️ Remove</button></div>' +
        '<textarea class="form-control cust-wish-text" data-index="' + idx + '" rows="2" placeholder="Birthday wish quote...">' + escapeHtml(w || "") + '</textarea>';
      c.appendChild(div);
    });
  }

  function renderGallery(editorState, onUpdate) {
    const c = el("cust-gallery-container"); if (!c || !editorState.config) return;
    const gallery = editorState.config.gallery || [];
    c.innerHTML = "";
    gallery.forEach((g, idx) => {
      const capVal = g.cap || "A special moment ✨", noteVal = g.secretNote || "Remember this day? 💫", emojiVal = g.emoji || "🎈", imgVal = g.image || null;
      const div = document.createElement("div");
      div.className = "repeater-item cust-gallery-card";
      div.dataset.galleryIndex = String(idx);
      div.innerHTML = '<div class="repeater-header"><span class="repeater-title">Photo #' + (idx + 1) + '</span>' +
        '<button type="button" class="btn-remove-item" data-action="remove-gallery" data-index="' + idx + '">🗑️ Remove Card</button></div>' +
        '<div class="gallery-thumb-box" data-index="' + idx + '">' +
        '<div class="gallery-thumb-preview-wrap">' +
        (imgVal ? '<img src="' + escapeHtml(imgVal) + '" class="gallery-thumb-img" alt="Thumbnail" data-index="' + idx + '" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'<div class=\\\'gallery-emoji-tile\\\'>' + escapeHtml(emojiVal) + '</div>\';">' : '<div class="gallery-emoji-tile" data-index="' + idx + '">' + escapeHtml(emojiVal) + '</div>') +
        '</div><div class="gallery-actions-inline">' +
        '<input type="file" class="cust-gallery-file-input" data-index="' + idx + '" accept="image/*" style="display:none;">' +
        '<button type="button" class="btn-sm cust-gallery-upload-btn" data-index="' + idx + '">📷 Upload Photo</button>' +
        '<button type="button" class="btn-sm cust-gallery-clear-img-btn" data-index="' + idx + '" style="' + (imgVal ? '' : 'display:none;') + '">❌ Clear Image</button>' +
        '</div></div><div class="form-grid-2"><div class="form-group"><label>Image Link (HTTPS URL)</label><input type="text" class="form-control cust-gallery-image" data-index="' + idx + '" value="' + escapeHtml(imgVal || "") + '" placeholder="Paste Image Link or Upload Photo"></div>' +
        '<div class="form-group"><label>Fallback Emoji</label><input type="text" class="form-control cust-gallery-emoji" data-index="' + idx + '" value="' + escapeHtml(emojiVal) + '" maxlength="4" style="text-align:center;"></div></div>' +
        '<div class="form-grid-2"><div class="form-group"><label>Caption</label><input type="text" class="form-control cust-gallery-caption" data-index="' + idx + '" value="' + escapeHtml(capVal) + '" placeholder="Polaroid caption"></div>' +
        '<div class="form-group"><label>Secret Flip Note</label><input type="text" class="form-control cust-gallery-secret" data-index="' + idx + '" value="' + escapeHtml(noteVal) + '" placeholder="Note on back of card"></div></div>';
      c.appendChild(div);
    });

    c.querySelectorAll(".cust-gallery-image").forEach(inp => {
      const updatePrev = () => {
        const idx = parseInt(inp.dataset.index, 10);
        if (isNaN(idx) || !editorState.config?.gallery?.[idx]) return;
        const val = inp.value.trim();
        editorState.config.gallery[idx].image = val || null;
        editorState.isDirty = true;
        const thumb = c.querySelector('.gallery-thumb-box[data-index="' + idx + '"] .gallery-thumb-preview-wrap');
        const clr = c.querySelector('.cust-gallery-clear-img-btn[data-index="' + idx + '"]');
        const emo = editorState.config.gallery[idx].emoji || "🎈";
        if (thumb) {
          if (val) {
            thumb.innerHTML = '<img src="' + escapeHtml(val) + '" class="gallery-thumb-img" alt="Thumbnail" data-index="' + idx + '" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'<div class=\\\'gallery-emoji-tile\\\'>' + escapeHtml(emo) + '</div>\';">';
            if (clr) clr.style.display = "inline-flex";
          } else {
            thumb.innerHTML = '<div class="gallery-emoji-tile" data-index="' + idx + '">' + escapeHtml(emo) + '</div>';
            if (clr) clr.style.display = "none";
          }
        }
        if (typeof onUpdate === "function") onUpdate();
      };
      inp.oninput = updatePrev; inp.onchange = updatePrev;
    });

    c.querySelectorAll(".cust-gallery-emoji").forEach(inp => {
      const updateEmoji = () => {
        const idx = parseInt(inp.dataset.index, 10);
        if (isNaN(idx) || !editorState.config?.gallery?.[idx]) return;
        const val = inp.value || "🎈";
        editorState.config.gallery[idx].emoji = val;
        editorState.isDirty = true;
        const thumb = c.querySelector('.gallery-thumb-box[data-index="' + idx + '"] .gallery-thumb-preview-wrap');
        const currentImg = editorState.config.gallery[idx].image;
        if (thumb) {
          if (currentImg) {
            const imgEl = thumb.querySelector('.gallery-thumb-img');
            if (imgEl) {
              imgEl.setAttribute("onerror", "this.style.display='none'; this.parentElement.innerHTML='<div class=\\'gallery-emoji-tile\\'>' + escapeHtml(val) + '</div>';");
            }
          } else {
            thumb.innerHTML = '<div class="gallery-emoji-tile" data-index="' + idx + '">' + escapeHtml(val) + '</div>';
          }
        }
        if (typeof onUpdate === "function") onUpdate();
      };
      inp.oninput = updateEmoji; inp.onchange = updateEmoji;
    });

    c.querySelectorAll(".cust-gallery-upload-btn").forEach(btn => {
      btn.onclick = () => { c.querySelector('.cust-gallery-file-input[data-index="' + btn.dataset.index + '"]')?.click(); };
    });

    c.querySelectorAll(".cust-gallery-file-input").forEach(inp => {
      inp.onchange = async (e) => {
        const file = e.target.files?.[0], idx = parseInt(inp.dataset.index, 10);
        if (!file || isNaN(idx) || !editorState.config?.gallery?.[idx]) return;
        try {
          if (root.CustomerWishEditor?.showToast) root.CustomerWishEditor.showToast("Compressing and uploading photo...", "info");
          let blob = file;
          if (root.MediaService?.compressImage) { try { blob = await root.MediaService.compressImage(file); } catch(e){} }
          let publicUrl = null;
          const uploadFn = (root.StorageModule && (root.StorageModule.uploadMediaFile || root.StorageModule.uploadMedia));
          if (uploadFn) publicUrl = await uploadFn(blob, "photos");
          if (publicUrl) {
            editorState.config.gallery[idx].image = publicUrl; editorState.isDirty = true; renderGallery(editorState, onUpdate);
            if (typeof onUpdate === "function") onUpdate();
            if (root.CustomerWishEditor?.showToast) root.CustomerWishEditor.showToast("Photo uploaded successfully! 📸", "success");
          } else {
            const reader = new FileReader();
            reader.onload = (re) => {
              editorState.config.gallery[idx].image = re.target.result; editorState.isDirty = true; renderGallery(editorState, onUpdate);
              if (typeof onUpdate === "function") onUpdate();
              if (root.CustomerWishEditor?.showToast) root.CustomerWishEditor.showToast("Photo attached locally! ✨", "success");
            };
            reader.readAsDataURL(file);
          }
        } catch (err) {
          if (root.CustomerWishEditor?.showToast) root.CustomerWishEditor.showToast("Photo upload error: " + (err.message || "Network error"), "error");
        }
      };
    });

    c.querySelectorAll(".cust-gallery-clear-img-btn").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (!isNaN(idx) && editorState.config?.gallery?.[idx]) {
          editorState.config.gallery[idx].image = null;
          editorState.isDirty = true;
          renderGallery(editorState, onUpdate);
          if (typeof onUpdate === "function") onUpdate();
          if (root.CustomerWishEditor?.showToast) root.CustomerWishEditor.showToast("Photo cleared. Reverted to fallback emoji 🎈", "info");
        }
      };
    });
  }

  function renderTimeline(editorState) {
    const c = el("cust-timeline-container"); if (!c || !editorState.config) return;
    const timeline = editorState.config.timeline || [];
    c.innerHTML = "";
    timeline.forEach((t, idx) => {
      const div = document.createElement("div");
      div.className = "repeater-item cust-timeline-card";
      div.innerHTML = '<div class="repeater-header"><span class="repeater-title">Milestone #' + (idx + 1) + '</span>' +
        '<button type="button" class="btn-remove-item" data-action="remove-timeline" data-index="' + idx + '">🗑️ Remove</button></div>' +
        '<div class="form-grid-2"><div class="form-group"><label>Icon Emoji</label><input type="text" class="form-control cust-timeline-icon" data-index="' + idx + '" value="' + escapeHtml(t.icon || "👶") + '" maxlength="4"></div>' +
        '<div class="form-group"><label>Date / Time Period</label><input type="text" class="form-control cust-timeline-date" data-index="' + idx + '" value="' + escapeHtml(t.date || "") + '" placeholder="e.g. 2015 or Childhood"></div></div>' +
        '<div class="form-group" style="margin-top:8px;"><label>Milestone Title</label><input type="text" class="form-control cust-timeline-title" data-index="' + idx + '" value="' + escapeHtml(t.title || "") + '" placeholder="Title"></div>' +
        '<div class="form-group"><label>Milestone Description</label><textarea class="form-control cust-timeline-text" data-index="' + idx + '" rows="2" placeholder="Story text...">' + escapeHtml(t.text || "") + '</textarea></div>';
      c.appendChild(div);
    });
  }

  function attachYouTubeAudio(ytId, startSec, onDurationChange, onStateChange) {
    const ytPrev = el("cust-audio-yt-preview");
    if (!ytPrev) return;
    ytPrev.style.display = "block";
    ytPrev.innerHTML = '<div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:12px;border:1px solid rgba(255,215,0,0.3);margin-top:6px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><span style="font-size:0.85rem;color:var(--customer-gold);font-weight:700;">🎵 YouTube Audio Track Attached</span><span style="font-size:0.75rem;color:var(--customer-text-muted);">' + (ytId ? "ID: " + escapeHtml(ytId) : "") + '</span></div>' +
      '<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;"><button type="button" id="cust-btn-yt-audio-play" class="btn-sm btn-secondary" style="color:var(--customer-gold);padding:6px 14px;border-radius:8px;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:6px;">▶️ Play Audio Track</button><span id="cust-yt-audio-status" style="font-size:0.78rem;color:var(--customer-text-muted);">Ready at start offset</span></div>' +
      '<div id="cust-audio-yt-player-slot" style="width:100%;height:140px;border-radius:8px;overflow:hidden;background:#000;"></div></div>';

    on("cust-btn-yt-audio-play", "click", () => {
      if (!ytAudioInstance?.getPlayerState) return;
      if (ytAudioInstance.getPlayerState() === 1) ytAudioInstance.pauseVideo();
      else { try { ytAudioInstance.seekTo(startSec, true); } catch(e){} ytAudioInstance.playVideo(); }
    });

    if (ytId && root.CustomerWishEditor?.loadYouTubeApi) {
      root.CustomerWishEditor.loadYouTubeApi().then((YT) => {
        if (!YT?.Player) return;
        try { ytAudioInstance?.destroy?.(); } catch(e){}
        try {
          ytAudioInstance = new YT.Player("cust-audio-yt-player-slot", {
            height: "140", width: "100%", videoId: ytId, playerVars: { playsinline: 1, enablejsapi: 1, start: startSec },
            events: {
              onReady: (ev) => {
                const dur = Math.floor(ev.target.getDuration() || 0);
                if (typeof onDurationChange === "function") onDurationChange(dur);
              },
              onStateChange: (ev) => {
                const b = el("cust-btn-yt-audio-play"), s = el("cust-yt-audio-status");
                if (ev.data === 1) { if (b) b.innerHTML = "⏸️ Pause Audio Track"; if (s) s.textContent = "Playing..."; }
                else { if (b) b.innerHTML = "▶️ Play Audio Track"; if (s) s.textContent = ev.data === 0 ? "Ended" : "Paused"; }
                if (typeof onStateChange === "function") onStateChange(ev.data);
              }
            }
          });
        } catch(e){}
      });
    }
  }

  function attachYouTubeVideo(ytId, startSec, onDurationChange) {
    const ytPrev = el("cust-video-yt-preview");
    if (!ytPrev) return;
    ytPrev.style.display = "block";
    ytPrev.innerHTML = '<div id="cust-video-yt-player-slot" style="width:100%;height:220px;border-radius:8px;overflow:hidden;background:#000;"></div>';

    if (ytId && root.CustomerWishEditor?.loadYouTubeApi) {
      root.CustomerWishEditor.loadYouTubeApi().then((YT) => {
        if (!YT?.Player) return;
        try { ytVideoInstance?.destroy?.(); } catch(e){}
        try {
          ytVideoInstance = new YT.Player("cust-video-yt-player-slot", {
            height: "220", width: "100%", videoId: ytId, playerVars: { playsinline: 1, enablejsapi: 1, start: startSec },
            events: {
              onReady: (ev) => {
                const dur = Math.floor(ev.target.getDuration() || 0);
                if (typeof onDurationChange === "function") onDurationChange(dur);
              }
            }
          });
        } catch(e){}
      });
    }
  }

  function destroyMediaPlayers() {
    try { ytAudioInstance?.destroy?.(); ytAudioInstance = null; } catch(e){}
    try { ytVideoInstance?.destroy?.(); ytVideoInstance = null; } catch(e){}
  }

  function seekAudio(sec) {
    if (ytAudioInstance?.seekTo) { try { ytAudioInstance.seekTo(sec, true); } catch(e){} }
  }

  function seekVideo(sec) {
    if (ytVideoInstance?.seekTo) { try { ytVideoInstance.seekTo(sec, true); } catch(e){} }
  }

  function bindMediaEvents(editorState, updateAudioUI, updateVideoUI, updateSummaryPanel) {
    on("cust-btn-upload-audio", "click", () => el("cust-audio-file-input")?.click());
    on("cust-audio-file-input", "change", async (e) => {
      const file = e.target.files?.[0]; if (!file || !editorState.config) return;
      try {
        if (root.CustomerWishEditor?.showToast) root.CustomerWishEditor.showToast("Uploading audio...", "info");
        const uploadFn = root.StorageModule?.uploadMedia || root.StorageModule?.uploadMediaFile;
        let u = uploadFn ? await uploadFn(file, "audio") : null;
        editorState.config.music = { file: u || URL.createObjectURL(file), startTime: 0 };
        editorState.isDirty = true; updateAudioUI(); updateSummaryPanel();
        if (root.CustomerWishEditor?.showToast) root.CustomerWishEditor.showToast(u ? "Audio track uploaded! 🎵" : "Audio loaded locally! 🎵", u ? "success" : "info");
      } catch (err) { if (root.CustomerWishEditor?.showToast) root.CustomerWishEditor.showToast("Audio upload failed: " + err.message, "error"); }
    });

    const resetAudio = (inpId, msg) => {
      setVal(inpId, "");
      if (editorState.config?.music) editorState.config.music.file = "assets/music/happy-birthday-song.mpeg";
      editorState.isDirty = true; updateAudioUI(); updateSummaryPanel();
      if (root.CustomerWishEditor?.showToast) root.CustomerWishEditor.showToast(msg, "info");
    };
    on("cust-btn-clear-direct-audio", () => resetAudio("cust-input-music-url", "Direct audio link cleared ✨"));
    on("cust-btn-clear-yt-audio", () => resetAudio("cust-input-music-yt-url", "YouTube song link cleared ✨"));
    on("cust-btn-remove-audio", () => resetAudio("cust-input-music-url", "Reset to default birthday melody 🎵"));

    on("cust-input-music-url", "input", (e) => { if (editorState.config) { editorState.config.music.file = e.target.value.trim() || "assets/music/happy-birthday-song.mpeg"; editorState.isDirty = true; updateAudioUI(); updateSummaryPanel(); } });
    on("cust-input-music-yt-url", "input", (e) => { if (editorState.config) { editorState.config.music.file = e.target.value.trim() || "assets/music/happy-birthday-song.mpeg"; editorState.isDirty = true; updateAudioUI(); updateSummaryPanel(); } });
    on("cust-input-music-time", "change", (e) => {
      const sec = parseTime(e.target.value);
      if (editorState.config?.music) { editorState.config.music.startTime = sec; e.target.value = formatTime(sec); setTxt("cust-audio-cur-time", formatTime(sec)); if (el("cust-audio-seekbar")) el("cust-audio-seekbar").value = sec; }
    });

    on("cust-btn-upload-video", "click", () => el("cust-video-file-input")?.click());
    on("cust-video-file-input", "change", async (e) => {
      const file = e.target.files?.[0]; if (!file || !editorState.config) return;
      try {
        if (root.CustomerWishEditor?.showToast) root.CustomerWishEditor.showToast("Uploading video...", "info");
        const uploadFn = root.StorageModule?.uploadMedia || root.StorageModule?.uploadMediaFile;
        let u = uploadFn ? await uploadFn(file, "videos") : null;
        editorState.config.videoWish = { url: u || URL.createObjectURL(file), startTime: 0 };
        editorState.isDirty = true; updateVideoUI(); updateSummaryPanel();
        if (root.CustomerWishEditor?.showToast) root.CustomerWishEditor.showToast(u ? "Video uploaded! 🎬" : "Video loaded locally! 🎬", u ? "success" : "info");
      } catch (err) { if (root.CustomerWishEditor?.showToast) root.CustomerWishEditor.showToast("Video upload failed: " + err.message, "error"); }
    });

    const resetVideo = (inpId, msg) => {
      if (inpId) setVal(inpId, "");
      if (editorState.config?.videoWish) editorState.config.videoWish.url = "";
      editorState.isDirty = true; updateVideoUI(); updateSummaryPanel();
      if (root.CustomerWishEditor?.showToast) root.CustomerWishEditor.showToast(msg, "info");
    };
    on("cust-btn-clear-direct-video", () => resetVideo("cust-input-video-url", "Direct video link cleared ✨"));
    on("cust-btn-clear-yt-video", () => resetVideo("cust-input-video-yt-url", "YouTube video link cleared ✨"));
    on("cust-btn-remove-video", () => resetVideo(null, "Removed custom video 🗑️"));

    on("cust-input-video-url", "input", (e) => { if (editorState.config) { editorState.config.videoWish.url = e.target.value.trim(); editorState.isDirty = true; updateVideoUI(); updateSummaryPanel(); } });
    on("cust-input-video-yt-url", "input", (e) => { if (editorState.config) { editorState.config.videoWish.url = e.target.value.trim(); editorState.isDirty = true; updateVideoUI(); updateSummaryPanel(); } });
    on("cust-input-video-time", "change", (e) => {
      const sec = parseTime(e.target.value);
      if (editorState.config?.videoWish) { editorState.config.videoWish.startTime = sec; e.target.value = formatTime(sec); setTxt("cust-video-cur-time", formatTime(sec)); if (el("cust-video-seekbar")) el("cust-video-seekbar").value = sec; }
    });
  }

  root.CustomerEditorRenderers = Object.freeze({
    initCalendar,
    formatDisplayDate,
    parseUserDisplayDate,
    renderLetterLines,
    renderReasons,
    renderWishes,
    renderGallery,
    renderTimeline,
    attachYouTubeAudio,
    attachYouTubeVideo,
    destroyMediaPlayers,
    seekAudio,
    seekVideo,
    bindMediaEvents
  });

})(typeof window !== "undefined" ? window : globalThis);
