import { describe, expect, it } from "vitest";
import { MAX_QUANTITY, MAX_UNIT_PRICE } from "./positionLimits";

describe("positionLimits", () => {
  it("le produit des deux bornes reste un entier sûr", () => {
    // quantity × prix alimente la valeur de marché : si le produit maximal
    // dépassait Number.MAX_SAFE_INTEGER, borner chaque champ ne suffirait pas.
    expect(MAX_QUANTITY * MAX_UNIT_PRICE).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
  });

  it("les bornes restent au-delà de tout portefeuille réel", () => {
    expect(MAX_QUANTITY).toBeGreaterThanOrEqual(1e9);
    expect(MAX_UNIT_PRICE).toBeGreaterThanOrEqual(1e6);
  });
});
