import { describe, expect, it, vi } from "vitest";
import { closeOnOrBefore, resolveProfilePrices, resolveDemoProfiles } from "./priceResolver";

const HIST = {
  AAPL: {
    points: [
      { date: "2025-09-10", close: 225 },
      { date: "2025-09-15", close: 230.5 },
      { date: "2025-09-20", close: 234 },
    ],
  },
};

describe("closeOnOrBefore", () => {
  it("returns the close on or before the target date", () => {
    expect(closeOnOrBefore(HIST.AAPL.points, "2025-09-16")).toBe(230.5);
    expect(closeOnOrBefore(HIST.AAPL.points, "2025-09-20")).toBe(234);
  });

  it("returns null when the target predates the series or series is empty", () => {
    expect(closeOnOrBefore(HIST.AAPL.points, "2025-09-01")).toBeNull();
    expect(closeOnOrBefore([], "2025-09-16")).toBeNull();
    expect(closeOnOrBefore(null, "2025-09-16")).toBeNull();
  });

  it("ignores invalid points (non-finite / non-positive close)", () => {
    const pts = [{ date: "2025-01-01", close: 0 }, { date: "2025-01-02", close: "x" }];
    expect(closeOnOrBefore(pts, "2025-06-01")).toBeNull();
  });
});

describe("resolveProfilePrices", () => {
  it("fills a missing buy price from the historical close at the trade date", async () => {
    const fetchHistory = vi.fn(async (symbol) => HIST[symbol] ?? { points: [] });
    const profile = {
      dateDebut: "2025-09-15",
      transactions: [{ type: "buy", symbol: "AAPL", date: "2025-09-15", quantity: 10 }],
    };
    const out = await resolveProfilePrices(profile, { fetchHistory });
    expect(out.transactions[0].price).toBe(230.5);
    expect(fetchHistory).toHaveBeenCalledWith("AAPL");
  });

  it("leaves the price absent when history does not cover the date", async () => {
    const fetchHistory = vi.fn(async () => ({ points: [{ date: "2025-09-20", close: 234 }] }));
    const profile = {
      transactions: [{ type: "buy", symbol: "AAPL", date: "2021-01-01", quantity: 10 }],
    };
    const out = await resolveProfilePrices(profile, { fetchHistory });
    expect(out.transactions[0].price).toBeUndefined();
  });

  it("does no network work when every price is already explicit", async () => {
    const fetchHistory = vi.fn();
    const profile = {
      transactions: [{ type: "buy", symbol: "AAPL", date: "2025-09-15", quantity: 10, price: 200 }],
    };
    const out = await resolveProfilePrices(profile, { fetchHistory });
    expect(out).toBe(profile); // unchanged reference
    expect(fetchHistory).not.toHaveBeenCalled();
  });

  it("never resolves dividend/fee rows (they carry amount, not price)", async () => {
    const fetchHistory = vi.fn(async () => HIST.AAPL);
    const profile = {
      transactions: [{ type: "dividend", symbol: "AAPL", date: "2025-09-15", amount: 50 }],
    };
    const out = await resolveProfilePrices(profile, { fetchHistory });
    expect(out).toBe(profile);
    expect(fetchHistory).not.toHaveBeenCalled();
  });

  it("survives a failing fetcher (tx left for expandTransactions to drop)", async () => {
    const fetchHistory = vi.fn(async () => {
      throw new Error("network down");
    });
    const profile = {
      transactions: [{ type: "buy", symbol: "AAPL", date: "2025-09-15", quantity: 10 }],
    };
    const out = await resolveProfilePrices(profile, { fetchHistory });
    expect(out.transactions[0].price).toBeUndefined();
  });
});

describe("resolveDemoProfiles", () => {
  it("resolves a list of profiles concurrently", async () => {
    const fetchHistory = vi.fn(async (symbol) => HIST[symbol] ?? { points: [] });
    const out = await resolveDemoProfiles(
      [{ transactions: [{ type: "buy", symbol: "AAPL", date: "2025-09-15", quantity: 1 }] }],
      { fetchHistory },
    );
    expect(out[0].transactions[0].price).toBe(230.5);
  });
});
