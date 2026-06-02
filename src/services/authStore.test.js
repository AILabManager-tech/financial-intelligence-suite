import { describe, it, expect, vi } from "vitest";
import {
  ROLES,
  DEFAULT_ROLE,
  deriveRole,
  normalizeUser,
  toSafeError,
  isAuthEnabled,
  signInWithPassword,
  signUpWithPassword,
  signOut,
  getCurrentUser,
  onAuthChange,
} from "./authStore";

const SECRET_TOKEN = "super-secret-access-token-xyz";
const SUPA_USER = { id: "u-1", email: "pm@example.com", user_metadata: { full_name: "Meta Name" } };
const SESSION = { access_token: SECRET_TOKEN, refresh_token: "refresh-xyz", user: SUPA_USER };

function fakeClient({ user = null, session = null, error = null, profile = null } = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn(async () => ({ data: { user, session }, error })),
      signUp: vi.fn(async () => ({ data: { user, session }, error })),
      signOut: vi.fn(async () => ({ error })),
      getUser: vi.fn(async () => ({ data: { user }, error })),
      onAuthStateChange: vi.fn((cb) => {
        cb("SIGNED_IN", session);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: profile, error: null })),
        })),
      })),
    })),
  };
}

describe("authStore — pure helpers", () => {
  it("clamps unknown roles to the PM default", () => {
    expect(DEFAULT_ROLE).toBe("pm");
    for (const role of ROLES) expect(deriveRole(role)).toBe(role);
    expect(deriveRole("superuser")).toBe("pm");
    expect(deriveRole(undefined)).toBe("pm");
  });

  it("normalizes a user with profile, falling back to metadata", () => {
    expect(normalizeUser(null)).toBeNull();
    expect(normalizeUser({})).toBeNull();
    const withProfile = normalizeUser(SUPA_USER, { full_name: "Profile Name", role: "compliance", org_id: "o-9" });
    expect(withProfile).toEqual({
      id: "u-1",
      email: "pm@example.com",
      fullName: "Profile Name",
      role: "compliance",
      orgId: "o-9",
    });
    const noProfile = normalizeUser(SUPA_USER);
    expect(noProfile.fullName).toBe("Meta Name");
    expect(noProfile.role).toBe("pm");
    expect(noProfile.orgId).toBeNull();
  });

  it("reduces errors to a safe message", () => {
    expect(toSafeError(null)).toBeNull();
    expect(toSafeError({ message: "Invalid login" })).toEqual({ message: "Invalid login" });
    expect(toSafeError({})).toEqual({ message: "Erreur d'authentification" });
  });

  it("auth is disabled in a solo build", () => {
    expect(isAuthEnabled()).toBe(false);
  });
});

describe("authStore — wrappers", () => {
  it("returns a disabled error when no client is configured", async () => {
    expect(await signInWithPassword({ email: "a@b.co", password: "x" }, null)).toEqual({
      error: { message: "Authentification non configurée" },
    });
    expect(await signOut(null)).toEqual({ error: { message: "Authentification non configurée" } });
  });

  it("signs in and returns a token-free normalized user", async () => {
    const client = fakeClient({ user: SUPA_USER, session: SESSION });
    const result = await signInWithPassword({ email: "pm@example.com", password: "secret" }, client);
    expect(result.user.id).toBe("u-1");
    expect(result.error).toBeUndefined();
    // No token must ever cross back to the UI layer.
    expect(JSON.stringify(result)).not.toContain(SECRET_TOKEN);
    expect(JSON.stringify(result)).not.toContain("refresh");
  });

  it("surfaces sign-in errors safely", async () => {
    const client = fakeClient({ error: { message: "Invalid login credentials" } });
    const result = await signInWithPassword({ email: "x@y.co", password: "bad" }, client);
    expect(result).toEqual({ error: { message: "Invalid login credentials" } });
  });

  it("flags sign-up that still needs email confirmation", async () => {
    const client = fakeClient({ user: SUPA_USER, session: null });
    const result = await signUpWithPassword({ email: "pm@example.com", password: "secret", fullName: "X" }, client);
    expect(result.needsConfirmation).toBe(true);
    expect(result.user.id).toBe("u-1");
    expect(JSON.stringify(result)).not.toContain(SECRET_TOKEN);
  });

  it("loads the current user enriched with its profile role/org", async () => {
    const client = fakeClient({ user: SUPA_USER, profile: { full_name: "P", role: "admin", org_id: "o-1" } });
    const user = await getCurrentUser(client);
    expect(user).toEqual({ id: "u-1", email: "pm@example.com", fullName: "P", role: "admin", orgId: "o-1" });
  });

  it("returns null when signed out", async () => {
    expect(await getCurrentUser(fakeClient({ user: null }))).toBeNull();
    expect(await getCurrentUser(null)).toBeNull();
  });

  it("subscribes to auth changes and exposes an unsubscribe", () => {
    const client = fakeClient({ session: SESSION });
    const handler = vi.fn();
    const unsubscribe = onAuthChange(handler, client);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: "u-1" }));
    expect(typeof unsubscribe).toBe("function");
    expect(() => unsubscribe()).not.toThrow();
    // No-op (no throw) when auth disabled.
    expect(typeof onAuthChange(handler, null)).toBe("function");
  });
});
