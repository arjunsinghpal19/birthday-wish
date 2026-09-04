/**
 * ============================================================================
 * CUSTOMER CELEBRATION ROUTING HELPER (js/customer/customer-create.js)
 * Architecture: Phase 32C-D Customer Platform Foundation
 *
 * Dedicated client-side helper loaded on the Celebration Studio (index.html).
 * Detects entry from the Customer Portal (?new=true, ?create=true, or from=customer),
 * initializes a clean fresh wish draft, auto-opens the Quick Editor modal,
 * and reveals the customer return navigation bar.
 *
 * CRITICAL ARCHITECTURAL INVARIANTS:
 * 1. Zero disruption to public wish viewing (/?w=UUID) or legacy Base64 routes.
 * 2. Reuses existing 12-section Quick Editor (zero duplicate creator code).
 * 3. File size strictly under 5 KB.
 * ============================================================================
 */

(function (window) {
  "use strict";

  function initCustomerCreationFlow() {
    if (typeof window === "undefined" || !window.location) return;

    const params = new URLSearchParams(window.location.search);
    const isNew = params.get("new") === "true";
    const isCreate = params.get("create") === "true";
    const fromCustomer = params.get("from") === "customer";

    // Only activate when explicitly entering the new celebration flow from Customer Portal
    if (!isNew && !isCreate && !fromCustomer) {
      return;
    }

    console.log("✨ CustomerCreate: Initializing fresh celebration creation flow from Customer Portal...");

    // 1. Reveal Customer Portal Top Return Bar
    const returnBar = document.getElementById("customer-return-bar");
    if (returnBar) {
      returnBar.style.display = "flex";
    }

    // 2. Initialize Clean Blank Wish State (resets draft keys & old UUIDs)
    if (typeof window.resetToFreshNewWish === "function") {
      window.resetToFreshNewWish();
    }

    // 3. Automatically Open Customizer / Quick Editor Modal
    const customizerModal = document.getElementById("customizer-modal");
    if (customizerModal) {
      customizerModal.classList.add("open");
      customizerModal.style.display = "flex";

      // Focus the recipient name field for seamless instant typing
      setTimeout(() => {
        const nameInput = document.getElementById("input-name");
        if (nameInput) {
          nameInput.focus();
        }
      }, 300);
    }

    // 4. Show Friendly Greeting Toast
    if (typeof window.showToast === "function") {
      window.showToast("✨ Welcome to Celebration Studio! Customize your wish and click 'Save & Share'.", "info");
    }
  }

  // Run on DOM ready
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initCustomerCreationFlow);
    } else {
      setTimeout(initCustomerCreationFlow, 100);
    }
  }

  window.CustomerCreate = {
    init: initCustomerCreationFlow
  };

})(typeof window !== "undefined" ? window : globalThis);
