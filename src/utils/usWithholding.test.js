import { describe, expect, it } from "vitest";
import {
  US_DIVIDEND_WITHHOLDING_RATE,
  accountWithholdingTreatment,
  computeUsDividendWithholding,
  aggregateUsWithholding,
} from "./usWithholding";

describe("usWithholding", () => {
  it("uses the treaty rate of 15%", () => {
    expect(US_DIVIDEND_WITHHOLDING_RATE).toBe(0.15);
  });

  it("exempts RRSP/RRIF under the treaty", () => {
    const t = accountWithholdingTreatment("rrsp");
    expect(t.rate).toBe(0);
    expect(t.exempt).toBe(true);
  });

  it("withholds TFSA at 15% but marks it non-recoverable", () => {
    const t = accountWithholdingTreatment("tfsa");
    expect(t.rate).toBe(0.15);
    expect(t.exempt).toBe(false);
    expect(t.recoverable).toBe(false);
  });

  it("withholds a taxable account at 15% but recoverable via FTC", () => {
    const t = accountWithholdingTreatment("taxable");
    expect(t.rate).toBe(0.15);
    expect(t.recoverable).toBe(true);
  });

  it("treats an unknown account type as taxable", () => {
    expect(accountWithholdingTreatment("bogus")).toEqual(accountWithholdingTreatment("taxable"));
  });

  it("computes gross/withheld/net for a US dividend per account type", () => {
    expect(computeUsDividendWithholding(100, "rrsp")).toMatchObject({ gross: 100, withheld: 0, net: 100, exempt: true });
    expect(computeUsDividendWithholding(100, "tfsa")).toMatchObject({ gross: 100, withheld: 15, net: 85, recoverable: false });
    expect(computeUsDividendWithholding(100, "taxable")).toMatchObject({ gross: 100, withheld: 15, net: 85, recoverable: true });
  });

  it("returns null for an invalid or non-positive gross amount", () => {
    expect(computeUsDividendWithholding(0, "taxable")).toBeNull();
    expect(computeUsDividendWithholding(-5, "taxable")).toBeNull();
    expect(computeUsDividendWithholding(NaN, "taxable")).toBeNull();
    expect(computeUsDividendWithholding("x", "taxable")).toBeNull();
  });

  describe("aggregateUsWithholding", () => {
    it("sums withholding across held positions, dropping invalid gross", () => {
      const agg = aggregateUsWithholding(
        [
          { symbol: "msft", gross: 200 },
          { symbol: "ko", gross: 100 },
          { symbol: "noop", gross: 0 },
        ],
        "taxable",
      );
      expect(agg.hasData).toBe(true);
      expect(agg.holdings).toHaveLength(2);
      expect(agg.holdings[0].symbol).toBe("MSFT"); // trié par gross desc
      expect(agg.totalGross).toBe(300);
      expect(agg.totalWithheld).toBeCloseTo(45);
      expect(agg.totalNet).toBeCloseTo(255);
    });

    it("reports hasData:false when no holding has a positive gross", () => {
      expect(aggregateUsWithholding([{ symbol: "X", gross: 0 }], "taxable").hasData).toBe(false);
      expect(aggregateUsWithholding([], "rrsp").hasData).toBe(false);
    });

    it("withholds nothing in an RRSP (exempt)", () => {
      const agg = aggregateUsWithholding([{ symbol: "MSFT", gross: 200 }], "rrsp");
      expect(agg.totalWithheld).toBe(0);
      expect(agg.totalNet).toBe(200);
    });
  });
});
