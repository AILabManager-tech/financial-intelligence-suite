import { createContext, useContext } from "react";

// Auth context (P7.1). Split from the provider component to satisfy
// react-refresh (no JSX here). Mirrors layoutContext's philosophy: a consumer
// used outside a provider (e.g. an isolated component test, or a build with no
// Supabase configured) falls back to a safe "solo" value rather than throwing —
// the app stays fully usable without auth.
export const AuthContext = createContext(null);

const SOLO_VALUE = Object.freeze({
  authEnabled: false,
  user: null,
  status: "solo",
  signIn: async () => ({ error: { message: "Authentification non configurée" } }),
  signUp: async () => ({ error: { message: "Authentification non configurée" } }),
  signOut: async () => ({}),
});

// Read the current auth state. Inside an AuthProvider it is reactive; outside
// one it returns the inert solo value (authEnabled:false, no user).
export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx ?? SOLO_VALUE;
}
