// Deterministic seeded PRNG for the demo generators — no Date.now / Math.random,
// so a given seed always yields the same portfolio (reproducible demos). Shared
// single source of truth: the snapshot wiggle and the profile generators both
// draw from it.

// FNV-1a 32-bit string hash.
export function hash32(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 step from a uint32 state → float in [0, 1).
function mulberry32(state) {
  let t = (state + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Stateless float for a string key — independent draws (used for per-cell noise).
export function hashFloat(key) {
  return mulberry32(hash32(key));
}

// Stateful sequential RNG seeded deterministically from a string or number.
export function makeRng(seed) {
  let state = typeof seed === "number" ? seed >>> 0 : hash32(seed);
  const next = () => {
    state = (state + 1) >>> 0;
    return mulberry32(state);
  };
  return {
    next,
    // integer in [min, max] inclusive
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    // float in [min, max)
    range(min, max) {
      return min + next() * (max - min);
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
  };
}
