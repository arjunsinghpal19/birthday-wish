/**
 * ============================================================================
 * SECURE CUSTOMER ACCOUNT DELETION API (api/customer-delete-account.js)
 * Architecture: Phase 32C-B Customer Platform Foundation
 *
 * Dedicated serverless endpoint to permanently delete an authenticated
 * customer's account from auth.users using SUPABASE_SERVICE_ROLE_KEY.
 *
 * CRITICAL ARCHITECTURAL INVARIANTS:
 * 1. Requires valid Customer Bearer JWT in Authorization header.
 * 2. Authenticates user identity via Supabase GoTrue Auth before deletion.
 * 3. Deletion target is ALWAYS the authenticated user's own ID (no body override).
 * 4. PostgreSQL cascades: public.customers is deleted (ON DELETE CASCADE),
 *    and public.wishes.owner_id is set to NULL (ON DELETE SET NULL),
 *    preserving public celebration wish URLs and media assets.
 * 5. SUPABASE_SERVICE_ROLE_KEY is strictly server-side and never leaked.
 * 6. File size kept minimal (~2-3 KB).
 * ============================================================================
 */

import { loadLocalEnv } from "./session.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  // 1. Resolve Server Environment & Credentials
  loadLocalEnv();

  const supabaseUrl = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim())
    ? process.env.SUPABASE_URL.trim()
    : "https://dvacxeooaqxwldszqpek.supabase.co";

  const anonKey = (process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY.trim())
    ? process.env.SUPABASE_ANON_KEY.trim()
    : "sb_publishable_UZ1WSWZHyaij07xleBgSxw_YBn7-lAx";

  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim())
    ? process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
    : "";

  if (!serviceRoleKey) {
    console.error("❌ Customer Delete Account API Error: Missing SUPABASE_SERVICE_ROLE_KEY on server.");
    return res.status(500).json({ success: false, error: "Server configuration error." });
  }

  // 2. Extract Customer Bearer Token
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Unauthorized: Missing customer session token." });
  }

  const customerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!customerToken) {
    return res.status(401).json({ success: false, error: "Unauthorized: Invalid customer session token." });
  }

  try {
    // 3. Verify Customer Identity with Supabase GoTrue Auth
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${customerToken}`
      }
    });

    if (!userRes.ok) {
      return res.status(401).json({ success: false, error: "Unauthorized: Session expired or invalid." });
    }

    const userData = await userRes.json();
    const authenticatedUserId = userData ? userData.id : null;

    if (!authenticatedUserId) {
      return res.status(401).json({ success: false, error: "Unauthorized: Could not verify customer identity." });
    }

    // 4. Delete the User from auth.users using Service Role (Cascades public.customers)
    const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${authenticatedUserId}`, {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!deleteRes.ok) {
      const errBody = await deleteRes.json().catch(() => ({}));
      console.error("❌ Customer Delete Account API Error:", errBody);
      return res.status(deleteRes.status >= 400 && deleteRes.status < 500 ? deleteRes.status : 500).json({
        success: false,
        error: errBody.message || "Failed to delete customer account."
      });
    }

    // 5. Return Confirmed Success Response
    return res.status(200).json({
      success: true,
      message: "Customer account deleted successfully."
    });

  } catch (err) {
    console.error("❌ Customer Delete Account API Exception:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error while processing account deletion."
    });
  }
}
