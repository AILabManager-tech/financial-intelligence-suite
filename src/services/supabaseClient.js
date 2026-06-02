// Supabase client (P7.1 — auth foundation).
//
// Auth is an OPTIONAL layer: when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are
// absent the client is null and the app keeps running in solo, client-first
// localStorage mode exactly as before. This preserves offline usability and the
// existing test suite (env vars are undefined under vitest → auth disabled).
//
// The publishable/anon key is public by design (Row-Level Security guards the
// data); it is safe to ship in the client bundle. Never put service-role or
// secret keys here.
import { createClient } from "@supabase/supabase-js";

// Read once. `import.meta.env` only exposes VITE_-prefixed vars to the client.
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL?.trim() || "";
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY?.trim() || "";

// Pure predicate — both values must be present for auth to be enabled.
export function authConfigured(url = SUPABASE_URL, key = SUPABASE_ANON_KEY) {
  return Boolean(url) && Boolean(key);
}

let cachedClient;

// Lazily build (and memoize) the client. Returns null when auth is not
// configured so callers can branch into solo mode without throwing.
export function getSupabaseClient() {
  if (!authConfigured()) return null;
  if (cachedClient === undefined) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return cachedClient;
}

// Test-only seam: reset the memoized client between cases.
export function __resetSupabaseClientForTests() {
  cachedClient = undefined;
}
