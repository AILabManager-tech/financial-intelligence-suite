import { describe, expect, it } from "vitest";
import { checkCompliance } from "./complianceChecker";

function asset(symbol, sector, quantity, price) {
  return { symbol, sector, price, position: { quantity } };
}

// 3 positions : AAPL 6000 (60%), MSFT 3000 (30%), KO 1000 (10%)
const ASSETS = [
  asset("AAPL", "Technologie", 60, 100),
  asset("MSFT", "Technologie", 30, 100),
  asset("KO", "Consommation", 10, 100),
];

describe("checkCompliance", () => {
  it("hasData:false si aucune position valorisée", () => {
    expect(checkCompliance([]).hasData).toBe(false);
    expect(checkCompliance([asset("X", "Tech", 0, 100)]).hasData).toBe(false);
  });

  it("conforme quand aucune règle n'est dépassée", () => {
    const result = checkCompliance(ASSETS, { maxPositionPct: 70, maxSectorPct: 95 });
    expect(result.compliant).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("détecte un dépassement de poids par titre", () => {
    const result = checkCompliance(ASSETS, { maxPositionPct: 50 });
    const v = result.violations.find((x) => x.type === "position");
    expect(v.symbol).toBe("AAPL");
    expect(v.actualPct).toBeCloseTo(60, 6);
    expect(v.limitPct).toBe(50);
  });

  it("détecte un dépassement de poids par secteur", () => {
    const result = checkCompliance(ASSETS, { maxSectorPct: 80 });
    const v = result.violations.find((x) => x.type === "sector");
    expect(v.sector).toBe("Technologie"); // 90%
    expect(v.actualPct).toBeCloseTo(90, 6);
  });

  it("signale un titre sur la liste d'exclusion", () => {
    const result = checkCompliance(ASSETS, { excludedSymbols: ["ko"] });
    const v = result.violations.find((x) => x.type === "excluded");
    expect(v.symbol).toBe("KO");
  });

  it("n'évalue pas une règle absente (null)", () => {
    expect(checkCompliance(ASSETS, {}).violations).toHaveLength(0);
  });
});
