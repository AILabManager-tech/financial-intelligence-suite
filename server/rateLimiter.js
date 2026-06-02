// Application rate limiter (P8.1). Sliding-window log per client key, used to
// cap /api/* traffic per IP — protects the upstream Finnhub free quota before a
// production deploy. Pure core: `check(key, now)` records a hit and decides;
// `now` is injected so it is deterministic and testable.
//
// Scope note: the in-memory store works for a single long-lived server (the dev
// middleware here). On Vercel's per-instance serverless runtime the counter is
// per-instance/best-effort — production-grade distributed limiting needs a
// shared store (Vercel KV / Upstash Redis). Documented, not faked.

export function createRateLimiter({ limit = 300, windowMs = 60_000 } = {}) {
  const hits = new Map(); // key -> ascending timestamps within the window

  return {
    limit,
    windowMs,
    check(key, now) {
      const windowStart = now - windowMs;
      const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

      if (recent.length >= limit) {
        // Retry once the oldest in-window hit ages out.
        const retryAfterMs = Math.max(0, recent[0] + windowMs - now);
        hits.set(key, recent);
        return { allowed: false, remaining: 0, limit, retryAfterMs };
      }

      recent.push(now);
      hits.set(key, recent);
      return { allowed: true, remaining: limit - recent.length, limit, retryAfterMs: 0 };
    },
    reset() {
      hits.clear();
    },
  };
}

// Best-effort client IP from a Node request (proxy-aware). Never throws.
export function clientIp(req) {
  const xff = req?.headers?.["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0].trim();
  return req?.socket?.remoteAddress ?? req?.connection?.remoteAddress ?? "unknown";
}
