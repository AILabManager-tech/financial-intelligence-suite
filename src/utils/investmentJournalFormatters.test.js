import { describe, expect, it } from "vitest";
import {
  convictionLabel,
  formatConviction,
  reviewStatus,
} from "./investmentJournalFormatters";

describe("formatConviction", () => {
  it("renders an integer 1..5 as 'n / 5'", () => {
    expect(formatConviction(4)).toBe("4 / 5");
    expect(formatConviction(1)).toBe("1 / 5");
  });

  it("returns null for out-of-range / non-integer / missing values", () => {
    expect(formatConviction(0)).toBeNull();
    expect(formatConviction(6)).toBeNull();
    expect(formatConviction(2.5)).toBeNull();
    expect(formatConviction(null)).toBeNull();
    expect(formatConviction(undefined)).toBeNull();
  });
});

describe("convictionLabel", () => {
  it("maps each level to a French label", () => {
    expect(convictionLabel(1)).toBe("Très faible");
    expect(convictionLabel(3)).toBe("Modérée");
    expect(convictionLabel(5)).toBe("Très forte");
  });

  it("returns null for invalid levels", () => {
    expect(convictionLabel(0)).toBeNull();
    expect(convictionLabel(7)).toBeNull();
    expect(convictionLabel(null)).toBeNull();
  });
});

describe("reviewStatus", () => {
  it("flags a past date as overdue", () => {
    const status = reviewStatus("2026-01-01", { today: "2026-05-31" });
    expect(status.key).toBe("overdue");
    expect(status.tone).toContain("rose");
    expect(typeof status.label).toBe("string");
  });

  it("flags a date within 14 days as soon", () => {
    const status = reviewStatus("2026-06-10", { today: "2026-05-31" });
    expect(status.key).toBe("soon");
    expect(status.tone).toContain("amber");
  });

  it("flags a far date as scheduled", () => {
    const status = reviewStatus("2026-12-31", { today: "2026-05-31" });
    expect(status.key).toBe("scheduled");
  });

  it("treats today as soon (0 days out), not overdue", () => {
    expect(reviewStatus("2026-05-31", { today: "2026-05-31" }).key).toBe("soon");
  });

  it("returns null for an invalid or empty review date", () => {
    expect(reviewStatus("", { today: "2026-05-31" })).toBeNull();
    expect(reviewStatus("nope", { today: "2026-05-31" })).toBeNull();
    expect(reviewStatus("2026-06-10", { today: "bad" })).toBeNull();
  });
});
