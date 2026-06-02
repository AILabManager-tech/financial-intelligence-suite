import { describe, it, expect } from "vitest";
import { authConfigured, getSupabaseClient } from "./supabaseClient";

describe("supabaseClient", () => {
  it("requires BOTH url and key for auth to be configured", () => {
    expect(authConfigured("https://x.supabase.co", "key")).toBe(true);
    expect(authConfigured("", "key")).toBe(false);
    expect(authConfigured("https://x.supabase.co", "")).toBe(false);
    expect(authConfigured("", "")).toBe(false);
  });

  it("builds no client in a solo build (VITE_SUPABASE_* absent under vitest)", () => {
    // The whole point of the optional layer: no env → null client → solo mode.
    expect(authConfigured()).toBe(false);
    expect(getSupabaseClient()).toBeNull();
  });
});
