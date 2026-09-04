/**
 * ============================================================================
 * CUSTOMER ENTITLEMENTS & ACCESS LAYER (js/customer/customer-entitlements.js)
 * Architecture: Phase 32E-1 Customer Platform Foundation
 *
 * Centralized, maintainable entitlement and feature-access layer for Customer
 * accounts, plan tiers, and admin-granted customer overrides.
 *
 * FORMULA:
 * PLAN ENTITLEMENTS + ADMIN-GRANTED CUSTOMER OVERRIDES + CUSTOMER ACCOUNT = FINAL ACCESS
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Single source of truth for feature access (zero hardcoded ad-hoc checks).
 * 2. Standard Free Tier has full access to all 12 Wish Studio sections and core themes.
 * 3. Prepares the lock/unlock architecture for future plans without locking active features.
 * 4. INR (₹) is the currency foundation (paid plans/UPI are future phases).
 * 5. File size strictly under 35 KB ceiling.
 * ============================================================================
 */

(function (root) {
  "use strict";

  /**
   * Base Plan Tier Definitions (INR Currency Foundation)
   * Note: Commercial subscription prices and payment gateways are planned for future phases.
   */
  const PLAN_DEFINITIONS = Object.freeze({
    free: {
      id: "free",
      name: "Standard Customer",
      badgeText: "🎁 Free Tier",
      priceInr: 0,
      storageQuotaMb: 25,
      maxWishes: Infinity,
      allowedThemes: ["default", "royalgold", "galaxy", "rosegold", "sapphire", "emerald-luxe"],
      features: {
        basicInfo: true,
        senderInfo: true,
        relationshipPresets: true,
        birthdayLetter: true,
        specialMemory: true,
        reasons: true,
        wishesQuotes: true,
        photoGallery: true,
        timelineMilestones: true,
        surpriseGift: true,
        backgroundMusic: true,
        videoWish: true,
        instantQrShare: true,
        unlimitedPublicViews: true,
        highSpeedCloudStorage: true
      }
    }
  });

  /**
   * Resolves the active customer tier from profile data.
   * @param {Object|null} profile
   * @returns {string} Tier key
   */
  function resolveTier(profile) {
    if (!profile) return "free";
    const tier = (profile.plan_tier || profile.tier || "free").toLowerCase();
    return PLAN_DEFINITIONS[tier] ? tier : "free";
  }

  /**
   * Conceptual Feature Identifiers & Aliases for future entitlement control.
   */
  const FEATURE_ALIASES = Object.freeze({
    basic_info: "basicInfo",
    basicinfo: "basicInfo",
    sender_info: "senderInfo",
    senderinfo: "senderInfo",
    relationship_presets: "relationshipPresets",
    relationshippresets: "relationshipPresets",
    letter: "birthdayLetter",
    birthday_letter: "birthdayLetter",
    birthdayletter: "birthdayLetter",
    memory: "specialMemory",
    special_memory: "specialMemory",
    specialmemory: "specialMemory",
    reasons: "reasons",
    quotes: "wishesQuotes",
    wishes: "wishesQuotes",
    wishes_quotes: "wishesQuotes",
    wishesquotes: "wishesQuotes",
    gallery: "photoGallery",
    photo_gallery: "photoGallery",
    photogallery: "photoGallery",
    timeline: "timelineMilestones",
    timeline_milestones: "timelineMilestones",
    timelinemilestones: "timelineMilestones",
    gift: "surpriseGift",
    surprise_gift: "surpriseGift",
    surprisegift: "surpriseGift",
    music: "backgroundMusic",
    background_music: "backgroundMusic",
    backgroundmusic: "backgroundMusic",
    video: "videoWish",
    video_wish: "videoWish",
    videowish: "videoWish"
  });

  function normalizeFeatureKey(key) {
    if (!key || typeof key !== "string") return "";
    const clean = key.trim();
    return FEATURE_ALIASES[clean] || FEATURE_ALIASES[clean.toLowerCase()] || clean;
  }

  /**
   * Checks if the customer account has access to a specific feature key.
   * Considers Plan Defaults + Admin-Granted Customer Overrides.
   *
   * @param {string} featureKey
   * @param {Object|null} [profile=null]
   * @returns {{ allowed: boolean, reason?: string, requiredPlan?: string }}
   */
  function canUseFeature(featureKey, profile = null) {
    if (!featureKey) return { allowed: true };

    const normKey = normalizeFeatureKey(featureKey);
    const tierKey = resolveTier(profile);
    const plan = PLAN_DEFINITIONS[tierKey] || PLAN_DEFINITIONS.free;

    // 1. Check Admin-Granted Customer Overrides
    if (profile && profile.feature_overrides) {
      if (profile.feature_overrides[normKey] !== undefined) {
        const overrideVal = Boolean(profile.feature_overrides[normKey]);
        return {
          allowed: overrideVal,
          reason: overrideVal ? "Admin override granted" : "Restricted by administrator",
          requiredPlan: overrideVal ? tierKey : "premium"
        };
      }
      if (profile.feature_overrides[featureKey] !== undefined) {
        const overrideVal = Boolean(profile.feature_overrides[featureKey]);
        return {
          allowed: overrideVal,
          reason: overrideVal ? "Admin override granted" : "Restricted by administrator",
          requiredPlan: overrideVal ? tierKey : "premium"
        };
      }
    }

    // 2. Check Plan Entitlements
    if (plan.features && plan.features[normKey] !== undefined) {
      return { allowed: Boolean(plan.features[normKey]), requiredPlan: tierKey };
    }
    if (plan.features && plan.features[featureKey] !== undefined) {
      return { allowed: Boolean(plan.features[featureKey]), requiredPlan: tierKey };
    }

    // Default to allowed for standard features
    return { allowed: true, requiredPlan: tierKey };
  }

  /**
   * Checks if the customer account has access to a specific celebration theme ID.
   *
   * @param {string} themeId
   * @param {Object|null} [profile=null]
   * @returns {{ allowed: boolean, reason?: string }}
   */
  function canUseTheme(themeId, profile = null) {
    if (!themeId) return { allowed: true };

    const tierKey = resolveTier(profile);
    const plan = PLAN_DEFINITIONS[tierKey] || PLAN_DEFINITIONS.free;

    // 1. Check Admin-Granted Theme Overrides
    if (profile && profile.theme_overrides && profile.theme_overrides[themeId] !== undefined) {
      const allowed = Boolean(profile.theme_overrides[themeId]);
      return {
        allowed,
        reason: allowed ? "Admin theme override granted" : "Theme restricted by administrator"
      };
    }

    // 2. Check Plan Theme Whitelist
    if (plan.allowedThemes && (plan.allowedThemes.includes("*") || plan.allowedThemes.includes(themeId))) {
      return { allowed: true };
    }

    // Default to allowed for core celebration themes
    return { allowed: true };
  }

  /**
   * Generates a comprehensive entitlement summary for the active customer.
   * @param {Object|null} profile
   * @returns {Object} Entitlement summary
   */
  function getCustomerEntitlements(profile = null) {
    const tierKey = resolveTier(profile);
    const plan = PLAN_DEFINITIONS[tierKey] || PLAN_DEFINITIONS.free;
    const quota = profile?.storage_quota_mb || plan.storageQuotaMb || 25;

    return {
      tier: tierKey,
      tierName: plan.name,
      badgeText: plan.badgeText,
      storageQuotaMb: quota,
      currency: "INR",
      currencySymbol: "₹",
      features: { ...plan.features, ...(profile?.feature_overrides || {}) },
      allowedThemes: plan.allowedThemes
    };
  }

  /**
   * Returns details for a specified plan tier.
   * @param {string} planTier
   * @returns {Object|null}
   */
  function getPlanDetails(planTier) {
    const key = (planTier || "free").toLowerCase();
    return PLAN_DEFINITIONS[key] || PLAN_DEFINITIONS.free;
  }

  /**
   * Generates HTML markup for a locked feature badge / banner (foundation).
   * @param {string} [requiredPlan="pro"]
   * @returns {string} HTML markup
   */
  function renderLockedBadge(requiredPlan = "pro") {
    const planName = requiredPlan.toUpperCase();
    return `<span class="feature-lock-badge" title="Available in ${planName} Plan">🔒 ${planName}</span>`;
  }

  // Export to global namespace
  root.CustomerEntitlements = Object.freeze({
    canUseFeature,
    canUseTheme,
    getCustomerEntitlements,
    getPlanDetails,
    renderLockedBadge,
    PLAN_DEFINITIONS
  });

})(typeof window !== "undefined" ? window : globalThis);
