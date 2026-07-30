/**
 * ============================================================================
 * VERCEL SERVERLESS ENVIRONMENT INJECTOR (api/env.js)
 * Executes on Vercel Node.js Serverless Engine at runtime.
 * Safely bridges Vercel Dashboard process.env variables to static HTML frontend.
 * ============================================================================
 */

export default function handler(req, res) {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

  res.status(200).send(`
    (function(window) {
      'use strict';
      window.ENV = window.ENV || {};
      window.ENV.SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
      window.ENV.SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};
    })(typeof window !== 'undefined' ? window : this);
  `);
}
