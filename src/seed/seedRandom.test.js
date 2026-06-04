import { describe, expect, it } from "vitest";
import { hash32, hashFloat, makeRng } from "./seedRandom";

describe("seedRandom", () => {
  it("hash32 is deterministic and unsigned", () => {
    expect(hash32("AAPL")).toBe(hash32("AAPL"));
    expect(hash32("AAPL")).not.toBe(hash32("MSFT"));
    expect(hash32("x") >= 0).toBe(true);
  });

  it("hashFloat returns an independent float in [0,1)", () => {
    const f = hashFloat("demo|AAPL|123");
    expect(f).toBeGreaterThanOrEqual(0);
    expect(f).toBeLessThan(1);
    expect(hashFloat("demo|AAPL|123")).toBe(f); // stable
  });

  it("makeRng is reproducible for the same seed and differs across seeds", () => {
    const a = makeRng("seed-1");
    const b = makeRng("seed-1");
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
    const c = makeRng("seed-2");
    expect([c.next(), c.next(), c.next()]).not.toEqual(seqA);
  });

  it("int stays within the inclusive range and pick returns a member", () => {
    const rng = makeRng("range-test");
    for (let i = 0; i < 200; i += 1) {
      const n = rng.int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
    const items = ["a", "b", "c"];
    expect(items).toContain(rng.pick(items));
  });
});
