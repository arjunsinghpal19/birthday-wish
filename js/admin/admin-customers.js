/**
 * ============================================================================
 * ADMIN CUSTOMERS CONTROLLER (js/admin/admin-customers.js)
 * Architecture: Phase P4C Customer Management Subsystem
 *
 * Full-featured customer accounts management controller for Master Admin.
 * Fetches customer profiles with accurate wish counts via privileged
 * serverless API /api/admin-customers and provides direct wish drill-down.
 * ============================================================================
 */

(function (window) {
  "use strict";

  const SELECTORS = {
    tbody: "customers-tbody",
    searchInput: "customers-search-input",
    searchClearBtn: "btn-customers-search-clear",
    filterStatus: "customers-filter-status",
    filterPlan: "customers-filter-plan",
    filterWishes: "customers-filter-wishes",
    sortSelect: "customers-sort-select",
    resetFiltersBtn: "btn-customers-reset-filters",
    countBadge: "customers-count-badge",
    refreshBtn: "btn-refresh-customers"
  };

  let customersState = [];
  let isLoading = false;
  let isInitialized = false;

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDateTime(isoString) {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch (e) {
      return "—";
    }
  }

  /**
   * Fetches customer list from privileged serverless API.
   * @returns {Promise<Array>}
   */
  async function fetchCustomers() {
    const token = (typeof sessionStorage !== "undefined" && sessionStorage.getItem("admin_session_token")) || "";
    const apiUrl = (typeof window.getApiUrl === "function")
      ? window.getApiUrl("/api/admin-customers")
      : "/api/admin-customers";

    try {
      isLoading = true;
      const res = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      customersState = Array.isArray(data.customers) ? data.customers : [];
      updatePlanOptions();
      return customersState;
    } catch (err) {
      console.warn("⚠️ AdminCustomers: Failed to load customers:", err);
      if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
        window.AdminCore.showToast(`Failed to load customers: ${err.message} ⚠️`);
      }
      return [];
    } finally {
      isLoading = false;
    }
  }

  /**
   * Dynamically populates the Plan select dropdown with actual plan_tier values present in customer data.
   */
  function updatePlanOptions() {
    const planSelect = document.getElementById(SELECTORS.filterPlan);
    if (!planSelect) return;

    const currentVal = planSelect.value || "all";
    const uniquePlans = Array.from(
      new Set(customersState.map(c => (c.plan_tier || "free").toLowerCase()).filter(Boolean))
    ).sort();

    let optionsHtml = '<option value="all">All Plans</option>';
    uniquePlans.forEach(p => {
      optionsHtml += `<option value="${escapeHtml(p)}">${escapeHtml(p.toUpperCase())}</option>`;
    });

    planSelect.innerHTML = optionsHtml;
    if (uniquePlans.includes(currentVal) || currentVal === "all") {
      planSelect.value = currentVal;
    } else {
      planSelect.value = "all";
    }
  }

  /**
   * Returns filtered and sorted customers array based on search input and filter selectors.
   * @returns {Array}
   */
  function getFilteredCustomers() {
    const searchInput = document.getElementById(SELECTORS.searchInput);
    const term = (searchInput?.value || "").toLowerCase().trim();

    const statusVal = document.getElementById(SELECTORS.filterStatus)?.value || "all";
    const planVal = document.getElementById(SELECTORS.filterPlan)?.value || "all";
    const wishesVal = document.getElementById(SELECTORS.filterWishes)?.value || "all";
    const sortVal = document.getElementById(SELECTORS.sortSelect)?.value || "newest";

    const filtered = customersState.filter(c => {
      // 1. Search term (matches name, email, or UUID)
      if (term) {
        const name = (c.full_name || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const id = (c.id || "").toLowerCase();
        if (!name.includes(term) && !email.includes(term) && !id.includes(term)) {
          return false;
        }
      }

      // 2. Status filter (Active / Inactive)
      if (statusVal !== "all") {
        const status = (c.account_status || "active").toLowerCase();
        if (status !== statusVal) return false;
      }

      // 3. Plan filter
      if (planVal !== "all") {
        const plan = (c.plan_tier || "free").toLowerCase();
        if (plan !== planVal) return false;
      }

      // 4. Wishes filter (all / 0 / 1-5 / 6-10 / 10+)
      if (wishesVal !== "all") {
        const wishes = Number(c.total_wishes) || 0;
        if (wishesVal === "0" && wishes !== 0) return false;
        if (wishesVal === "1-5" && (wishes < 1 || wishes > 5)) return false;
        if (wishesVal === "6-10" && (wishes < 6 || wishes > 10)) return false;
        if (wishesVal === "10+" && wishes < 10) return false;
      }

      return true;
    });

    // 5. Client-side Sort
    filtered.sort((a, b) => {
      if (sortVal === "oldest") {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (sortVal === "most_wishes") {
        return (Number(b.total_wishes) || 0) - (Number(a.total_wishes) || 0);
      }
      if (sortVal === "least_wishes") {
        return (Number(a.total_wishes) || 0) - (Number(b.total_wishes) || 0);
      }
      if (sortVal === "last_active") {
        return new Date(b.last_active_at || 0) - new Date(a.last_active_at || 0);
      }
      // Default: "newest"
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return filtered;
  }

  /**
   * Resets all filters, search query, and sort to their default state.
   */
  function resetFilters() {
    const searchInput = document.getElementById(SELECTORS.searchInput);
    if (searchInput) searchInput.value = "";

    const statusSelect = document.getElementById(SELECTORS.filterStatus);
    if (statusSelect) statusSelect.value = "all";

    const planSelect = document.getElementById(SELECTORS.filterPlan);
    if (planSelect) planSelect.value = "all";

    const wishesSelect = document.getElementById(SELECTORS.filterWishes);
    if (wishesSelect) wishesSelect.value = "all";

    const sortSelect = document.getElementById(SELECTORS.sortSelect);
    if (sortSelect) sortSelect.value = "newest";

    const searchClearBtn = document.getElementById(SELECTORS.searchClearBtn);
    if (searchClearBtn) searchClearBtn.style.display = "none";

    renderTable();
    if (searchInput) searchInput.focus();
  }

  /**
   * Renders the customers table and count badge.
   */
  function renderTable() {
    const tbody = document.getElementById(SELECTORS.tbody);
    if (!tbody) return;

    const filtered = getFilteredCustomers();
    const countBadge = document.getElementById(SELECTORS.countBadge);
    if (countBadge) {
      countBadge.textContent = `Showing ${filtered.length} of ${customersState.length} customers`;
    }

    const searchInput = document.getElementById(SELECTORS.searchInput);
    const searchClearBtn = document.getElementById(SELECTORS.searchClearBtn);
    if (searchClearBtn) {
      searchClearBtn.style.display = (searchInput && searchInput.value) ? "inline-block" : "none";
    }

    if (filtered.length === 0) {
      const isSearching = Boolean(searchInput?.value?.trim());
      const hasActiveFilters = (document.getElementById(SELECTORS.filterStatus)?.value || "all") !== "all" ||
                               (document.getElementById(SELECTORS.filterPlan)?.value || "all") !== "all" ||
                               (document.getElementById(SELECTORS.filterWishes)?.value || "all") !== "all";

      const msg = (isSearching || hasActiveFilters)
        ? "No customers match your search or filter criteria. 🔍"
        : (isLoading ? "⏳ Loading customer accounts..." : "No customer accounts registered yet.");

      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center;color:var(--text-muted);padding:36px 16px;">
            <div style="font-size:0.92rem;margin-bottom:8px;">${msg}</div>
            ${(isSearching || hasActiveFilters)
              ? '<button type="button" class="btn-sm btn-customers-empty-reset" style="background:rgba(168,85,247,0.2);border:1px solid rgba(168,85,247,0.4);color:#d8b4fe;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:0.8rem;margin-top:6px;">↺ Reset Filters</button>'
              : ""}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(c => {
      const name = c.full_name ? escapeHtml(c.full_name) : "—";
      const email = escapeHtml(c.email || "—");
      const shortId = c.id ? c.id.substring(0, 8) + "..." : "";
      const status = c.account_status || "active";
      const statusColor = status === "active" ? "#10b981" : "#f59e0b";
      const plan = (c.plan_tier || "free").toUpperCase();
      const created = formatDateTime(c.created_at);
      const lastActive = formatDateTime(c.last_active_at);
      const totalWishes = Number(c.total_wishes) || 0;
      const initial = (c.full_name || c.email || "C").charAt(0).toUpperCase();

      return `
        <tr data-customer-id="${escapeHtml(c.id)}">
          <td class="td-cust-name">
            <div class="user-cell">
              <div class="user-avatar customer-avatar">${escapeHtml(initial)}</div>
              <div class="user-name-wrap" title="${name}">
                <strong class="user-name-text">${name}</strong>
                <div class="user-id-subtext" style="font-size:0.75rem;color:var(--text-dim);" title="${escapeHtml(c.id)}">ID: ${escapeHtml(shortId)}</div>
              </div>
            </div>
          </td>
          <td class="td-cust-email"><span style="font-family:monospace;font-size:0.85rem;color:var(--text-bright,#f8fafc);white-space:nowrap;">${email}</span></td>
          <td class="td-cust-status" style="white-space:nowrap;">
            <span class="status-badge" style="background:rgba(16,185,129,0.15);color:${statusColor};border:1px solid ${statusColor}44;padding:3px 8px;border-radius:6px;font-size:0.78rem;text-transform:capitalize;white-space:nowrap;">
              ● ${escapeHtml(status)}
            </span>
          </td>
          <td class="td-cust-plan" style="white-space:nowrap;">
            <span class="nav-badge" style="background:rgba(212,175,55,0.15);color:#d4af37;border:1px solid rgba(212,175,55,0.3);padding:3px 8px;border-radius:6px;font-size:0.75rem;font-weight:600;white-space:nowrap;">
              ${escapeHtml(plan)}
            </span>
          </td>
          <td class="td-cust-date" style="white-space:nowrap;"><span class="created-date" style="font-size:0.82rem;color:var(--text-muted);white-space:nowrap;">${created}</span></td>
          <td class="td-cust-date" style="white-space:nowrap;"><span class="created-date" style="font-size:0.82rem;color:var(--text-muted);white-space:nowrap;">${lastActive}</span></td>
          <td class="td-cust-wishes" style="white-space:nowrap;">
            <span style="font-size:0.88rem;font-weight:600;color:${totalWishes > 0 ? '#38bdf8' : 'var(--text-dim)'};background:rgba(56,189,248,0.1);padding:3px 10px;border-radius:12px;border:1px solid rgba(56,189,248,0.2);white-space:nowrap;">
              🎂 ${totalWishes} wish${totalWishes === 1 ? "" : "es"}
            </span>
          </td>
          <td class="td-cust-actions" style="text-align:right;white-space:nowrap;min-width:150px;">
            <button type="button" class="btn-sm btn-view-customer-wishes" data-cust-id="${escapeHtml(c.id)}" title="View wishes created by this customer">
              🔍 View Wishes (${totalWishes})
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  /**
   * Drills down into a customer's wishes by switching to the Wishes tab and setting the filter.
   * @param {string} customerId - Target customer UUID.
   */
  function drillDownCustomerWishes(customerId) {
    if (!customerId) return;

    // 1. Switch Admin tab to Wishes
    const wishesNavBtn = document.querySelector('.admin-sidebar .nav-item[data-tab="wishes"]');
    if (wishesNavBtn) {
      wishesNavBtn.click();
    }

    // 2. Set the ownership filter to this customer
    setTimeout(() => {
      if (window.AdminWishes && typeof window.AdminWishes.setOwnershipFilter === "function") {
        window.AdminWishes.setOwnershipFilter(`cust_${customerId}`);
      }
    }, 50);
  }

  /**
   * Initializes event listeners for search, filters, clear, refresh, and table actions.
   */
  function bindEvents() {
    const searchInput = document.getElementById(SELECTORS.searchInput);
    if (searchInput && !searchInput.__custBound) {
      searchInput.__custBound = true;
      searchInput.addEventListener("input", () => {
        renderTable();
      });
    }

    const searchClearBtn = document.getElementById(SELECTORS.searchClearBtn);
    if (searchClearBtn && !searchClearBtn.__custBound) {
      searchClearBtn.__custBound = true;
      searchClearBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        renderTable();
        searchInput?.focus();
      });
    }

    const statusSelect = document.getElementById(SELECTORS.filterStatus);
    if (statusSelect && !statusSelect.__custBound) {
      statusSelect.__custBound = true;
      statusSelect.addEventListener("change", () => {
        renderTable();
      });
    }

    const planSelect = document.getElementById(SELECTORS.filterPlan);
    if (planSelect && !planSelect.__custBound) {
      planSelect.__custBound = true;
      planSelect.addEventListener("change", () => {
        renderTable();
      });
    }

    const wishesSelect = document.getElementById(SELECTORS.filterWishes);
    if (wishesSelect && !wishesSelect.__custBound) {
      wishesSelect.__custBound = true;
      wishesSelect.addEventListener("change", () => {
        renderTable();
      });
    }

    const sortSelect = document.getElementById(SELECTORS.sortSelect);
    if (sortSelect && !sortSelect.__custBound) {
      sortSelect.__custBound = true;
      sortSelect.addEventListener("change", () => {
        renderTable();
      });
    }

    const resetFiltersBtn = document.getElementById(SELECTORS.resetFiltersBtn);
    if (resetFiltersBtn && !resetFiltersBtn.__custBound) {
      resetFiltersBtn.__custBound = true;
      resetFiltersBtn.addEventListener("click", () => {
        resetFilters();
      });
    }

    const refreshBtn = document.getElementById(SELECTORS.refreshBtn);
    if (refreshBtn && !refreshBtn.__custBound) {
      refreshBtn.__custBound = true;
      refreshBtn.addEventListener("click", async () => {
        refreshBtn.disabled = true;
        const origText = refreshBtn.textContent;
        refreshBtn.textContent = "⏳ Refreshing...";
        await fetchCustomers();
        renderTable();
        refreshBtn.disabled = false;
        refreshBtn.textContent = origText;
        if (window.AdminCore && typeof window.AdminCore.showToast === "function") {
          window.AdminCore.showToast(`Customers refreshed (${customersState.length}) 👥`);
        }
      });
    }

    const tbody = document.getElementById(SELECTORS.tbody);
    if (tbody && !tbody.__custBound) {
      tbody.__custBound = true;
      tbody.addEventListener("click", (e) => {
        const viewBtn = e.target.closest(".btn-view-customer-wishes");
        if (viewBtn) {
          const custId = viewBtn.dataset.custId;
          if (custId) {
            drillDownCustomerWishes(custId);
          }
          return;
        }

        const resetBtn = e.target.closest(".btn-customers-empty-reset");
        if (resetBtn) {
          resetFilters();
        }
      });
    }
  }

  /**
   * Controller lifecycle initialization.
   */
  async function init() {
    bindEvents();
    if (!isInitialized) {
      isInitialized = true;
      await fetchCustomers();
      renderTable();
    }
  }

  /**
   * Re-render entry point called by Admin core.
   */
  async function render() {
    bindEvents();
    if (customersState.length === 0) {
      await fetchCustomers();
    }
    updatePlanOptions();
    renderTable();
  }

  window.AdminCustomers = Object.freeze({
    init,
    render,
    fetchCustomers,
    getCustomers: () => [...customersState],
    drillDownCustomerWishes,
    resetFilters,
    isPlaceholder: false
  });

})(typeof window !== "undefined" ? window : globalThis);
