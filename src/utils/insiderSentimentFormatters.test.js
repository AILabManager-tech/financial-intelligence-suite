import { describe, expect, it } from "vitest";
import { formatMonthYear, formatMspr, msprSentiment, averageMspr } from "./insiderSentimentFormatters";

describe("insiderSentimentFormatters", () => {
  it("formatMonthYear", () => {
    expect(formatMonthYear(2026, 3)).toBe("mars 2026");
    expect(formatMonthYear(2026, 13)).toBeNull();
    expect(formatMonthYear("x", 3)).toBeNull();
  });

  it("formatMspr", () => {
    expect(formatMspr(12.53)).toBe("12.5");
    expect(formatMspr("x")).toBeNull();
  });

  it("msprSentiment", () => {
    expect(msprSentiment(12).tone).toBe("emerald");
    expect(msprSentiment(-12).tone).toBe("rose");
    expect(msprSentiment(0).tone).toBe("slate");
    expect(msprSentiment("x").label).toBe("Indéterminé");
  });

  it("averageMspr", () => {
    expect(averageMspr([{ mspr: 10 }, { mspr: -4 }])).toBeCloseTo(3, 6);
    expect(averageMspr([])).toBeNull();
    expect(averageMspr([{ mspr: "x" }])).toBeNull();
  });
});
