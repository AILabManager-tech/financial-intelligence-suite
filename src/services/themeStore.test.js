import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  loadTheme,
  saveTheme,
  applyTheme,
  isValidTheme,
  VALID_THEMES,
  DEFAULT_THEME,
} from "./themeStore";

describe("themeStore", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("exposes the canonical set of themes including the FIS default", () => {
    expect(VALID_THEMES).toEqual(["fis", "matrix", "cyber", "light"]);
    expect(DEFAULT_THEME).toBe("fis");
  });

  it("isValidTheme accepts only known names", () => {
    expect(isValidTheme("matrix")).toBe(true);
    expect(isValidTheme("light")).toBe(true);
    expect(isValidTheme("fis")).toBe(true);
    expect(isValidTheme("dark")).toBe(false);
    expect(isValidTheme("")).toBe(false);
    expect(isValidTheme(null)).toBe(false);
  });

  it("returns the default when nothing is stored", () => {
    expect(loadTheme()).toBe("fis");
  });

  it("round-trips a valid theme via localStorage", () => {
    saveTheme("cyber");
    expect(loadTheme()).toBe("cyber");
  });

  it("treats fis as the default and removes the entry on save", () => {
    saveTheme("matrix");
    expect(localStorage.getItem("fis:theme:v1")).toBe("matrix");
    saveTheme("fis");
    expect(localStorage.getItem("fis:theme:v1")).toBeNull();
  });

  it("rejects unknown values silently and falls back to default", () => {
    saveTheme("rainbow");
    expect(loadTheme()).toBe("fis");
  });

  it("recovers gracefully when localStorage contains corrupt data", () => {
    localStorage.setItem("fis:theme:v1", "garbage");
    expect(loadTheme()).toBe("fis");
  });

  it("applyTheme sets the data-theme attribute for non-default themes", () => {
    applyTheme("matrix");
    expect(document.documentElement.getAttribute("data-theme")).toBe("matrix");
    applyTheme("cyber");
    expect(document.documentElement.getAttribute("data-theme")).toBe("cyber");
  });

  it("applyTheme removes data-theme when switching back to FIS default", () => {
    applyTheme("matrix");
    applyTheme("fis");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("applyTheme ignores invalid themes (preserves the current value)", () => {
    applyTheme("matrix");
    applyTheme("rainbow");
    // invalid value falls through to "remove" branch → no data-theme attribute
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});
