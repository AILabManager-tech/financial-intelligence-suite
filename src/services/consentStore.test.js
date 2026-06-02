import { afterEach, describe, expect, it } from "vitest";
import {
  CONSENT_VERSION,
  acceptConsent,
  hasValidConsent,
  loadConsent,
  revokeConsent,
  saveConsent,
} from "./consentStore";

afterEach(() => localStorage.clear());

describe("consentStore", () => {
  it("has no valid consent by default", () => {
    expect(loadConsent()).toBeNull();
    expect(hasValidConsent()).toBe(false);
  });

  it("records and persists acceptance at the current version", () => {
    saveConsent(acceptConsent("2026-06-02T00:00:00.000Z"));
    const stored = loadConsent();
    expect(stored.version).toBe(CONSENT_VERSION);
    expect(stored.acceptedAt).toBe("2026-06-02T00:00:00.000Z");
    expect(hasValidConsent()).toBe(true);
  });

  it("re-prompts when the stored consent is from an older policy version", () => {
    saveConsent({ version: CONSENT_VERSION - 1, acceptedAt: "2025-01-01T00:00:00.000Z" });
    expect(hasValidConsent()).toBe(false); // policy changed → consent no longer valid
  });

  it("revokes consent", () => {
    saveConsent(acceptConsent("2026-06-02T00:00:00.000Z"));
    revokeConsent();
    expect(loadConsent()).toBeNull();
    expect(hasValidConsent()).toBe(false);
  });

  it("survives corrupt storage", () => {
    localStorage.setItem("fis:consent:v1", "{broken");
    expect(loadConsent()).toBeNull();
    expect(hasValidConsent()).toBe(false);
  });
});
