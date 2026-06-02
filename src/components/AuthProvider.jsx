import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../core/authContext";
import {
  isAuthEnabled,
  getCurrentUser,
  onAuthChange,
  signInWithPassword,
  signUpWithPassword,
  signOut,
} from "../services/authStore";

// Holds auth state and exposes sign-in/up/out. When Supabase is not configured
// (isAuthEnabled() === false) the effect is inert: status stays "solo", user is
// null, and the app runs exactly as the pre-auth client-first build. Every auth
// event re-derives the user via getCurrentUser so the role/org from the profile
// row is always accurate (used by P7.2 gating later).
export function AuthProvider({ children }) {
  const authEnabled = isAuthEnabled();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(authEnabled ? "loading" : "solo");

  useEffect(() => {
    if (!authEnabled) return undefined;
    let active = true;

    // Re-derive the user from the session, enriched with its profile row, on
    // mount and on every auth event. setState only fires inside the promise
    // callback (never synchronously in the effect body).
    const load = () => {
      getCurrentUser()
        .then((next) => {
          if (!active) return;
          setUser(next);
          setStatus(next ? "authenticated" : "anonymous");
        })
        .catch(() => {
          if (active) setStatus("anonymous");
        });
    };

    load();
    const unsubscribe = onAuthChange(() => load());

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authEnabled]);

  const signIn = useCallback((credentials) => signInWithPassword(credentials), []);
  const signUp = useCallback((credentials) => signUpWithPassword(credentials), []);
  const doSignOut = useCallback(() => signOut(), []);

  const value = useMemo(
    () => ({ authEnabled, user, status, signIn, signUp, signOut: doSignOut }),
    [authEnabled, user, status, signIn, signUp, doSignOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
