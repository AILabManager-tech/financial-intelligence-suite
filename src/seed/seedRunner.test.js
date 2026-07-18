import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import {
  applyDemoGearCode,
  applyDemoSeed,
  applyDemoSeedResolved,
  buildSeedPlan,
  derivePositions,
  expandTransactions,
  isDemoMandate,
  resetDemoSeed,
} from "./seedRunner";
import { DEMO_PROFILES, DEMO_GEAR_CODE_ID } from "./profils.seed";
import { loadPortfolioList } from "../services/portfolioListStore";
import { loadTransactions } from "../services/transactionStore";
import { loadPortfolioAssets } from "../services/portfolioStore";
import { loadDemoSnapshots } from "./demoSnapshotStore";

beforeEach(() => {
  localStorage.clear();
});

describe("expandTransactions", () => {
  it("fills missing dates from dateDebut and assigns stable ids", () => {
    const out = expandTransactions({
      dateDebut: "2024-01-01",
      transactions: [
        { type: "buy", symbol: "aapl", quantity: 10, price: 100 }, // no date
        { type: "buy", symbol: "MSFT", date: "2024-02-02", quantity: 5, price: 400 },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: "t1", symbol: "AAPL", date: "2024-01-01" });
    expect(out[1]).toMatchObject({ id: "t2", symbol: "MSFT", date: "2024-02-02" });
  });

  it("drops invalid transactions (unknown type / no symbol)", () => {
    const out = expandTransactions({
      dateDebut: "2024-01-01",
      transactions: [
        { type: "wat", symbol: "AAPL", quantity: 1, price: 1 },
        { type: "buy", symbol: "", quantity: 1, price: 1 },
        { type: "buy", symbol: "OK", quantity: 1, price: 1 },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].symbol).toBe("OK");
  });

  it("drops a buy/sell with no positive price (omitted & unresolved) but keeps dividends", () => {
    const out = expandTransactions({
      dateDebut: "2024-01-01",
      transactions: [
        { type: "buy", symbol: "AAPL", quantity: 10 }, // price omitted → dropped
        { type: "buy", symbol: "MSFT", quantity: 5, price: 400 }, // kept
        { type: "dividend", symbol: "AAPL", amount: 12 }, // kept (no price needed)
      ],
    });
    expect(out.map((t) => `${t.type}:${t.symbol}`)).toEqual(["buy:MSFT", "dividend:AAPL"]);
  });
});

describe("derivePositions", () => {
  it("nets buys and sells into open quantity + average cost", () => {
    const tx = [
      { type: "buy", symbol: "X", date: "2024-01-01", quantity: 100, price: 10 },
      { type: "buy", symbol: "X", date: "2024-02-01", quantity: 100, price: 20 },
      { type: "sell", symbol: "X", date: "2024-03-01", quantity: 120, price: 25 },
    ];
    const positions = derivePositions(tx, "fifo");
    expect(positions).toHaveLength(1);
    // FIFO: 100@10 + 100@20, sell 120 -> consumes 100@10 + 20@20, leaves 80@20
    expect(positions[0].position.quantity).toBeCloseTo(80, 6);
    expect(positions[0].position.averageCost).toBeCloseTo(20, 6);
  });

  it("omits fully-sold symbols", () => {
    const tx = [
      { type: "buy", symbol: "X", date: "2024-01-01", quantity: 10, price: 10 },
      { type: "sell", symbol: "X", date: "2024-02-01", quantity: 10, price: 12 },
    ];
    expect(derivePositions(tx)).toEqual([]);
  });

  it("defaults price to 0 when no static price is provided", () => {
    const tx = [{ type: "buy", symbol: "X", date: "2024-01-01", quantity: 10, price: 10 }];
    expect(derivePositions(tx)[0].price).toBe(0);
  });

  it("seeds price from a static price map (titres non cotés par le free tier)", () => {
    const tx = [
      { type: "buy", symbol: "RY.TO", date: "2024-01-01", quantity: 100, price: 132.5 },
      { type: "buy", symbol: "X", date: "2024-01-01", quantity: 10, price: 10 },
    ];
    const positions = derivePositions(tx, "fifo", { "RY.TO": 178 });
    const ry = positions.find((p) => p.symbol === "RY.TO");
    const x = positions.find((p) => p.symbol === "X");
    expect(ry.price).toBe(178); // static reference price → valeur factuelle, pas 0/−100 %
    expect(x.price).toBe(0); // absent du map → reste 0, comblé par la cotation live si dispo
  });

  it("ignores a non-finite static price", () => {
    const tx = [{ type: "buy", symbol: "X", date: "2024-01-01", quantity: 10, price: 10 }];
    expect(derivePositions(tx, "fifo", { X: "n/a" })[0].price).toBe(0);
  });

  it("applies sector/name from the meta map, defaulting to Démo/symbol", () => {
    const tx = [
      { type: "buy", symbol: "AAPL", date: "2024-01-01", quantity: 1, price: 100 },
      { type: "buy", symbol: "ZZZ", date: "2024-01-01", quantity: 1, price: 100 },
    ];
    const meta = { AAPL: { sector: "Technologie — Matériel", name: "Apple Inc." } };
    const positions = derivePositions(tx, "fifo", {}, meta);
    const aapl = positions.find((p) => p.symbol === "AAPL");
    const zzz = positions.find((p) => p.symbol === "ZZZ");
    expect(aapl.sector).toBe("Technologie — Matériel");
    expect(aapl.name).toBe("Apple Inc.");
    expect(zzz.sector).toBe("Démo");
    expect(zzz.name).toBe("ZZZ");
  });
});

describe("buildSeedPlan", () => {
  it("returns a mandate + transactions + derived positions per profile", () => {
    const plan = buildSeedPlan(DEMO_PROFILES);
    expect(plan).toHaveLength(DEMO_PROFILES.length);
    const empty = plan.find((p) => p.mandate.id === "demo-edge-vide");
    expect(empty.transactions).toEqual([]);
    expect(empty.positions).toEqual([]);
    const julien = plan.find((p) => p.mandate.id === "demo-julien-roy");
    // SHOP.TO net 160, AC.TO net 450 -> 2 held positions
    expect(julien.positions).toHaveLength(2);
  });

  it("maps account types and currencies to the real schema", () => {
    const plan = buildSeedPlan(DEMO_PROFILES);
    const sophie = plan.find((p) => p.mandate.id === "demo-sophie-belanger");
    expect(sophie.mandate.accountType).toBe("rrsp");
    expect(sophie.mandate.baseCurrency).toBe("CAD");
  });

  it("seeds a non-zero static price for Canadian holdings the free tier won't quote", () => {
    const plan = buildSeedPlan(DEMO_PROFILES);
    const sophie = plan.find((p) => p.mandate.id === "demo-sophie-belanger");
    // every held .TO position carries a static reference price > 0 (no 0/−100 %)
    expect(sophie.positions.length).toBeGreaterThan(0);
    for (const pos of sophie.positions) {
      expect(pos.price).toBeGreaterThan(0);
    }
  });

  it("attaches a reconstituted snapshot series to funded profiles, none to empty ones", () => {
    const plan = buildSeedPlan(DEMO_PROFILES);
    const sophie = plan.find((p) => p.mandate.id === "demo-sophie-belanger");
    expect(sophie.snapshots.length).toBeGreaterThan(0);
    expect(sophie.snapshots.every((s) => s.reconstructed === true)).toBe(true);
    const empty = plan.find((p) => p.mandate.id === "demo-edge-vide");
    expect(empty.snapshots).toEqual([]);
  });

  it("includes the generated large + long-history mandates with positions and snapshots", () => {
    const plan = buildSeedPlan(DEMO_PROFILES);
    const large = plan.find((p) => p.mandate.id === "demo-gen-large");
    expect(large.positions.length).toBeGreaterThanOrEqual(50);
    expect(new Set(large.positions.map((p) => p.sector)).size).toBeGreaterThan(5);
    expect(large.snapshots.length).toBeGreaterThan(0);

    const history = plan.find((p) => p.mandate.id === "demo-gen-history");
    expect(history.transactions.length).toBeGreaterThan(50);
    // long span → many reconstituted points
    expect(history.snapshots.length).toBeGreaterThan(100);
  });
});

describe("applyDemoSeed / resetDemoSeed", () => {
  it("seeds all demo mandates with namespaced transactions and positions", () => {
    const ids = applyDemoSeed();
    expect(ids).toContain("demo-marc-tremblay");

    const list = loadPortfolioList();
    const demoCount = list.portfolios.filter(isDemoMandate).length;
    expect(demoCount).toBe(DEMO_PROFILES.length);

    expect(loadTransactions("demo-julien-roy").length).toBeGreaterThan(0);
    expect(loadPortfolioAssets([], "demo-marc-tremblay").length).toBe(4);
    // reconstituted snapshots are persisted per demo mandate
    expect(loadDemoSnapshots("demo-sophie-belanger").length).toBeGreaterThan(0);
  });

  it("resolves omitted prices from history before seeding (applyDemoSeedResolved)", async () => {
    // demo-resolver omits its buy prices; the sync plan drops them (0 positions).
    const planEmpty = buildSeedPlan().find((p) => p.mandate.id === "demo-resolver");
    expect(planEmpty.positions).toEqual([]);

    // With a history fetcher, the prices fill and the positions seed.
    const fetchHistory = vi.fn(async (symbol) => ({
      points: [{ date: "2025-09-01", close: symbol === "AAPL" ? 230 : 510 }],
    }));
    await applyDemoSeedResolved({ fetchHistory });
    const positions = loadPortfolioAssets([], "demo-resolver");
    expect(positions.map((p) => p.symbol).sort()).toEqual(["AAPL", "MSFT"]);
    expect(positions.find((p) => p.symbol === "AAPL").position.averageCost).toBe(230);
  });

  it("is idempotent — running twice does not duplicate mandates", () => {
    applyDemoSeed();
    applyDemoSeed();
    const list = loadPortfolioList();
    const demoIds = list.portfolios.filter(isDemoMandate).map((p) => p.id);
    expect(new Set(demoIds).size).toBe(demoIds.length); // no duplicate ids
    expect(demoIds.length).toBe(DEMO_PROFILES.length);
  });

  it("preserves a real mandate and removes only demos on reset", () => {
    // a real (non-demo) mandate present beforehand
    savePortfolioListWithReal();
    applyDemoSeed();
    expect(loadPortfolioList().portfolios.some(isDemoMandate)).toBe(true);

    resetDemoSeed();
    const after = loadPortfolioList();
    expect(after.portfolios.some(isDemoMandate)).toBe(false);
    expect(after.portfolios.some((p) => p.id === "mon-reel")).toBe(true);
    // namespaced demo keys are gone
    expect(localStorage.getItem("fis:transactions:v1::demo-julien-roy")).toBeNull();
    expect(loadDemoSnapshots("demo-sophie-belanger")).toEqual([]);
  });
});

describe("applyDemoGearCode (loader prospect 1-profil)", () => {
  it("seeds only the Gear Code sample mandate, activates it, network-free", () => {
    const id = applyDemoGearCode();
    expect(id).toBe(DEMO_GEAR_CODE_ID);

    const list = loadPortfolioList();
    const demoIds = list.portfolios.filter(isDemoMandate).map((p) => p.id);
    // exactly the one sample profile — never the whole dev demo set
    expect(demoIds).toEqual([DEMO_GEAR_CODE_ID]);
    // active, so a visitor with no positions lands on it
    expect(list.activeId).toBe(DEMO_GEAR_CODE_ID);
    // positions + reconstituted snapshots present without any network fetch
    expect(loadPortfolioAssets([], DEMO_GEAR_CODE_ID).length).toBeGreaterThan(0);
    expect(loadDemoSnapshots(DEMO_GEAR_CODE_ID).length).toBeGreaterThan(0);
  });

  it("preserves a real mandate already present", () => {
    savePortfolioListWithReal();
    applyDemoGearCode();
    const after = loadPortfolioList();
    expect(after.portfolios.some((p) => p.id === "mon-reel")).toBe(true);
    expect(after.portfolios.some((p) => p.id === DEMO_GEAR_CODE_ID)).toBe(true);
  });

  it("is idempotent — twice keeps a single sample mandate", () => {
    applyDemoGearCode();
    applyDemoGearCode();
    const demoIds = loadPortfolioList().portfolios.filter(isDemoMandate).map((p) => p.id);
    expect(demoIds).toEqual([DEMO_GEAR_CODE_ID]);
  });
});

function savePortfolioListWithReal() {
  localStorage.setItem(
    "fis:portfolios:v1",
    JSON.stringify({
      activeId: "mon-reel",
      portfolios: [
        { id: "mon-reel", name: "Mon vrai portefeuille", client: "", baseCurrency: "USD", accountType: "taxable", openedAt: null },
      ],
    }),
  );
}
