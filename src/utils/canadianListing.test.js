import { describe, expect, it } from "vitest";
import { isCanadianListing, describeCanadianListing } from "./canadianListing";

describe("canadianListing", () => {
  it("recognizes the Canadian exchange suffixes", () => {
    expect(isCanadianListing("SHOP.TO")).toBe(true);
    expect(isCanadianListing("XYZ.V")).toBe(true);
    expect(isCanadianListing("XYZ.CN")).toBe(true);
    expect(isCanadianListing("XYZ.NE")).toBe(true);
  });

  it("rejects US and other foreign listings", () => {
    expect(isCanadianListing("AAPL")).toBe(false);
    expect(isCanadianListing("SHOP.L")).toBe(false);
    expect(isCanadianListing("XYZ.UNKNOWN")).toBe(false);
    expect(isCanadianListing("")).toBe(false);
  });

  it("describes a TSX listing with venue + usual quote currency", () => {
    expect(describeCanadianListing("SHOP.TO")).toEqual({
      listed: true,
      base: "SHOP",
      suffix: ".TO",
      exchangeCode: "TSX",
      exchangeName: "Toronto Stock Exchange",
      country: "CA",
      countryLabel: "Canada",
      quoteCurrency: "CAD",
    });
  });

  it("maps each Canadian suffix to its venue", () => {
    expect(describeCanadianListing("X.V").exchangeName).toBe("TSX Venture Exchange");
    expect(describeCanadianListing("X.CN").exchangeName).toBe("Canadian Securities Exchange");
    expect(describeCanadianListing("X.NE").exchangeName).toBe("Cboe Canada (NEO)");
  });

  it("returns { listed: false } for non-Canadian symbols", () => {
    expect(describeCanadianListing("AAPL")).toEqual({ listed: false });
    expect(describeCanadianListing("SAP.DE")).toEqual({ listed: false });
  });
});
