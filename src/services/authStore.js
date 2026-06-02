// Auth store (P7.1 — auth foundation).
//
// Thin, injectable wrappers over Supabase Auth plus pure normalizers. The
// Supabase client is a parameter (defaulting to the shared singleton) so tests
// can pass a fake client with zero network. NOTHING that crosses the boundary
// back to the UI carries a token: only a normalized, token-free user shape and
// safe { message } errors are returned.
//
// Role-based gating itself is P7.2; here we only carry the role/org through so
// the rest of the app can read it once it lands.
import { getSupabaseClient, authConfigured } from "./supabaseClient";

export const ROLES = ["pm", "client", "compliance", "admin"];
export const DEFAULT_ROLE = "pm";

// Pure: clamp an arbitrary value to a known role, defaulting to PM.
export function deriveRole(role) {
  return ROLES.includes(role) ? role : DEFAULT_ROLE;
}

// Pure: fold a Supabase user (+ optional profile row) into a stable, token-free
// shape. Returns null for an absent/invalid user.
export function normalizeUser(supabaseUser, profile = null) {
  if (!supabaseUser || !supabaseUser.id) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? null,
    fullName: profile?.full_name ?? supabaseUser.user_metadata?.full_name ?? null,
    role: deriveRole(profile?.role),
    orgId: profile?.org_id ?? null,
  };
}

// Pure: strip a Supabase error down to a safe, leak-free message.
export function toSafeError(error) {
  if (!error) return null;
  return { message: typeof error.message === "string" ? error.message : "Erreur d'authentification" };
}

function authDisabledError() {
  return { message: "Authentification non configurée" };
}

// Whether the auth layer is active in this build.
export function isAuthEnabled() {
  return authConfigured();
}

export async function signInWithPassword({ email, password }, client = getSupabaseClient()) {
  if (!client) return { error: authDisabledError() };
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { error: toSafeError(error) };
  return { user: normalizeUser(data?.user) };
}

export async function signUpWithPassword({ email, password, fullName }, client = getSupabaseClient()) {
  if (!client) return { error: authDisabledError() };
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName ?? null } },
  });
  if (error) return { error: toSafeError(error) };
  // With email confirmation on, data.user exists but no session yet.
  return { user: normalizeUser(data?.user), needsConfirmation: !data?.session };
}

export async function signOut(client = getSupabaseClient()) {
  if (!client) return { error: authDisabledError() };
  const { error } = await client.auth.signOut();
  return error ? { error: toSafeError(error) } : {};
}

// Load the current session's user, enriched with its profile row (role/org).
// Returns null when signed out or auth disabled.
export async function getCurrentUser(client = getSupabaseClient()) {
  if (!client) return null;
  const { data } = await client.auth.getUser();
  const supabaseUser = data?.user;
  if (!supabaseUser) return null;

  let profile = null;
  try {
    const { data: row } = await client
      .from("profiles")
      .select("full_name, role, org_id")
      .eq("id", supabaseUser.id)
      .maybeSingle();
    profile = row ?? null;
  } catch {
    // Profile fetch is best-effort; fall back to user metadata.
  }
  return normalizeUser(supabaseUser, profile);
}

// Subscribe to auth state changes. Returns an unsubscribe function (no-op when
// auth is disabled). The handler receives the normalized, token-free user.
export function onAuthChange(handler, client = getSupabaseClient()) {
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    handler(normalizeUser(session?.user));
  });
  return () => data?.subscription?.unsubscribe?.();
}
