// Shared factual price-series helpers (pure). Extracted from seed/priceResolver
// so production code (reconstructSnapshots) can reuse it without depending on the
// dev-only seed layer.

function toTime(date) {
  const day = typeof date === "string" ? date.slice(0, 10) : date;
  return new Date(`${day}T00:00:00.000Z`).getTime();
}

// Real close on or before `targetDate` from a {date, close} series, or null.
// Never interpolates: it returns the last actual close at or before the date,
// or null when the series does not reach that far back.
export function closeOnOrBefore(points, targetDate) {
  const target = toTime(targetDate);
  if (!Number.isFinite(target)) return null;
  const series = (Array.isArray(points) ? points : [])
    .filter((p) => p && p.date && Number.isFinite(p.close) && p.close > 0)
    .sort((a, b) => toTime(a.date) - toTime(b.date));
  let found = null;
  for (const p of series) {
    if (toTime(p.date) <= target) found = p;
    else break;
  }
  return found ? found.close : null;
}
