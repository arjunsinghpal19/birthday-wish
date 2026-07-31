/**
 * ============================================================================
 * WISH EDITOR ENGINE (js/editor.js)
 * Dedicated controller for create and edit modes of wish pages.
 * Handles database fetching, dynamic hydration, strict passcode validation,
 * and seamless saving/previewing.
 * ============================================================================
 */

(function (window) {
  "use strict";

  let currentWishId = null;
  let isEditMode = false;

  // Toast Notification Helper
  function showToast(message) {
    const toast = document.getElementById("editor-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3500);
  }

  // Populate Dynamic Event Categories Dropdown
  function populateEventTypes() {
    const select = document.getElementById("edit-event-type");
    if (!select) return;
    select.innerHTML = "";

    const activeEvents = (window.CONFIG && Array.isArray(window.CONFIG.ACTIVE_EVENT_TYPES))
      ? window.CONFIG.ACTIVE_EVENT_TYPES
      : [{ id: "birthday", name: "Birthday", icon: "🎂" }];

    activeEvents.forEach(evt => {
      const option = document.createElement("option");
      option.value = evt.id;
      option.textContent = `${evt.icon || "🎂"} ${evt.name}`;
      select.appendChild(option);
    });
  }

  // Real-time Passcode Validation
  function initPasscodeValidation() {
    const passInput = document.getElementById("edit-passcode");
    const errorEl = document.getElementById("edit-passcode-error");
    const saveBtn = document.getElementById("btn-save-wish");
    const saveBtnBottom = document.getElementById("btn-save-wish-bottom");

    if (!passInput) return;

    function validate() {
      const val = (passInput.value || "").trim();
      const isValid = /^\d{4}$/.test(val);

      if (!isValid) {
        if (errorEl) errorEl.style.display = "block";
        passInput.style.borderColor = "#ff7675";
        if (saveBtn) saveBtn.disabled = true;
        if (saveBtnBottom) saveBtnBottom.disabled = true;
      } else {
        if (errorEl) errorEl.style.display = "none";
        passInput.style.borderColor = "rgba(255, 255, 255, 0.2)";
        if (saveBtn) saveBtn.disabled = false;
        if (saveBtnBottom) saveBtnBottom.disabled = false;
      }
      return isValid;
    }

    passInput.addEventListener("input", validate);
    validate();
  }

  // Load Existing Wish Data for Edit Mode
  async function loadWishForEdit(id) {
    showToast("⏳ Loading wish details...");
    try {
      if (window.SupabaseModule) {
        const client = window.SupabaseModule.getClient();
        if (client) {
          const { data, error } = await client.from("wishes").select("*").eq("id", id).single();
          if (!error && data) {
            document.getElementById("edit-recipient-name").value = data.recipient_name || "";
            document.getElementById("edit-sender-name").value = data.sender_name || "";
            document.getElementById("edit-passcode").value = data.pass_code || "1234";

            if (data.event_type) {
              const eventSelect = document.getElementById("edit-event-type");
              if (eventSelect) eventSelect.value = data.event_type;
            }

            if (Array.isArray(data.letter_lines)) {
              document.getElementById("edit-letter-lines").value = data.letter_lines.join("\n");
            } else if (typeof data.letter_lines === "string") {
              document.getElementById("edit-letter-lines").value = data.letter_lines;
            }

            document.getElementById("edit-memory-text").value = data.memory_text || "";

            if (data.letter_theme) {
              const themeSelect = document.getElementById("edit-letter-theme");
              if (themeSelect) themeSelect.value = data.letter_theme;
            }

            if (data.cake_flavor) {
              const cakeSelect = document.getElementById("edit-cake-flavor");
              if (cakeSelect) cakeSelect.value = data.cake_flavor;
            }

            document.getElementById("edit-music-url").value = data.music_url || "";
            document.getElementById("edit-video-url").value = data.video_url || "";

            showToast("✨ Wish loaded successfully!");
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Error fetching wish for edit:", e);
    }
    showToast("⚠️ Could not load remote wish. Editing locally.");
  }

  // Handle Form Submission (Create or Edit)
  async function handleFormSubmit(e) {
    e.preventDefault();

    const recipient = (document.getElementById("edit-recipient-name")?.value || "").trim();
    const sender = (document.getElementById("edit-sender-name")?.value || "").trim();
    const eventType = document.getElementById("edit-event-type")?.value || "birthday";
    const passcode = (document.getElementById("edit-passcode")?.value || "").trim();
    const letterText = (document.getElementById("edit-letter-lines")?.value || "").trim();
    const memoryText = (document.getElementById("edit-memory-text")?.value || "").trim();
    const theme = document.getElementById("edit-letter-theme")?.value || "default";
    const cakeFlavor = document.getElementById("edit-cake-flavor")?.value || "default";
    const musicUrl = (document.getElementById("edit-music-url")?.value || "").trim() || null;
    const videoUrl = (document.getElementById("edit-video-url")?.value || "").trim() || null;

    if (!recipient || !sender) {
      showToast("⚠️ Please fill in all required fields!");
      return;
    }

    if (!/^\d{4}$/.test(passcode)) {
      showToast("⚠️ Passcode must be exactly 4 numeric digits! (e.g. 1234)");
      return;
    }

    const letterLines = letterText
      ? letterText.split("\n").map(line => line.trim()).filter(Boolean)
      : ["Wishing you joy, health and endless happiness today!"];

    const payload = {
      recipient_name: recipient,
      sender_name: sender,
      event_type: eventType,
      pass_code: passcode,
      status: "published",
      letter_lines: letterLines,
      memory_text: memoryText,
      letter_theme: theme,
      cake_flavor: cakeFlavor,
      music_url: musicUrl,
      video_url: videoUrl,
      updated_at: new Date().toISOString()
    };

    showToast("⏳ Saving wish to database...");

    try {
      if (window.SupabaseModule) {
        const client = window.SupabaseModule.getClient();
        if (client) {
          let response;
          if (isEditMode && currentWishId) {
            response = await client.from("wishes").update(payload).eq("id", currentWishId).select("id");
          } else {
            payload.created_at = new Date().toISOString();
            response = await client.from("wishes").insert([payload]).select("id");
          }

          if (response.error) {
            showToast(`❌ Database Save Error: ${response.error.message}`);
            return;
          }

          if (response.data && response.data[0] && response.data[0].id) {
            currentWishId = response.data[0].id;
          }
        }
      }
    } catch (err) {
      console.error("Save exception:", err);
    }

    showToast("🎉 Wish saved successfully!");

    // Enable Preview button
    const previewBtn = document.getElementById("btn-preview-wish");
    if (previewBtn) previewBtn.disabled = false;

    // Navigate back after short delay
    setTimeout(() => {
      navigateBack();
    }, 1200);
  }

  // Navigate Back to Origin Page
  function navigateBack() {
    if (document.referrer && (document.referrer.includes("admin.html") || document.referrer.includes("dashboard.html"))) {
      window.location.href = document.referrer;
    } else {
      window.location.href = "admin.html";
    }
  }

  // Initialize Page
  document.addEventListener("DOMContentLoaded", () => {
    populateEventTypes();
    initPasscodeValidation();

    const urlParams = new URLSearchParams(window.location.search);
    const wishId = urlParams.get("id");

    const pageTitle = document.getElementById("editor-page-title");
    const pageSubtitle = document.getElementById("editor-page-subtitle");
    const previewBtn = document.getElementById("btn-preview-wish");
    const backBtn = document.getElementById("btn-back-dashboard");
    const form = document.getElementById("editor-wish-form");

    if (wishId) {
      currentWishId = wishId;
      isEditMode = true;
      if (pageTitle) pageTitle.textContent = "✏️ Edit Wish";
      if (pageSubtitle) pageSubtitle.textContent = `Update parameters for wish ID: ${wishId.substring(0, 8)}...`;
      if (previewBtn) {
        previewBtn.disabled = false;
        previewBtn.addEventListener("click", () => {
          window.open(`index.html?w=${currentWishId}`, "_blank");
        });
      }
      loadWishForEdit(wishId);
    } else {
      isEditMode = false;
      if (pageTitle) pageTitle.textContent = "✨ Create New Wish";
      if (pageSubtitle) pageSubtitle.textContent = "Build a personalized surprise wish page for your loved ones";
      if (previewBtn) previewBtn.disabled = true;
    }

    if (backBtn) {
      backBtn.addEventListener("click", navigateBack);
    }

    if (form) {
      form.addEventListener("submit", handleFormSubmit);
    }
  });

})(window);
