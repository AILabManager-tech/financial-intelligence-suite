import { describe, expect, it } from "vitest";
import { createRateLimiter, clientIp } from "./rateLimiter.js";

describe("createRateLimiter", () => {
  it("allows up to the limit then blocks within the window", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 1000 });
    expect(rl.check("ip", 0).allowed).toBe(true);
    expect(rl.check("ip", 10).allowed).toBe(true);
    expect(rl.check("ip", 20).allowed).toBe(true);
    const blocked = rl.check("ip", 30);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBe(970); // oldest hit (t=0) ages out at t=1000
  });

  it("slides: allows again once old hits age out of the window", () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
    rl.check("ip", 0);
    rl.check("ip", 100);
    expect(rl.check("ip", 200).allowed).toBe(false);
    // After the window passes the first two hits, room frees up.
    expect(rl.check("ip", 1101).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("b", 0).allowed).toBe(true); // different IP, own budget
    expect(rl.check("a", 1).allowed).toBe(false);
  });

  it("reports remaining headroom", () => {
    const rl = createRateLimiter({ limit: 5, windowMs: 1000 });
    expect(rl.check("ip", 0).remaining).toBe(4);
    expect(rl.check("ip", 1).remaining).toBe(3);
  });
});

describe("clientIp", () => {
  it("prefers the first x-forwarded-for entry", () => {
    expect(clientIp({ headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } })).toBe("203.0.113.7");
  });

  it("falls back to the socket address, then 'unknown'", () => {
    expect(clientIp({ headers: {}, socket: { remoteAddress: "192.0.2.5" } })).toBe("192.0.2.5");
    expect(clientIp({})).toBe("unknown");
  });
});
