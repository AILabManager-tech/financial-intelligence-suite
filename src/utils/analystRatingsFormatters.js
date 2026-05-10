export const RATING_BUCKETS = [
  { key: "strongBuy", label: "Achat fort", weight: 5, tone: "emerald" },
  { key: "buy", label: "Achat", weight: 4, tone: "emerald" },
  { key: "hold", label: "Conserver", weight: 3, tone: "amber" },
  { key: "sell", label: "Vendre", weight: 2, tone: "rose" },
  { key: "strongSell", label: "Vendre fort", weight: 1, tone: "rose" },
];

const CONSENSUS_LABELS = [
  { min: 4.5, key: "strong-buy", label: "Achat fort", tone: "emerald" },
  { min: 3.5, key: "buy", label: "Achat", tone: "emerald" },
  { min: 2.5, key: "hold", label: "Conserver", tone: "amber" },
  { min: 1.5, key: "sell", label: "Vendre", tone: "rose" },
  { min: 0, key: "strong-sell", label: "Vendre fort", tone: "rose" },
];

export function computeConsensus(item) {
  if (!item || typeof item !== "object") return null;
  const total = Number(item.total);
  if (!Number.isFinite(total) || total <= 0) return null;
  const weighted = RATING_BUCKETS.reduce((acc, bucket) => {
    const count = Number(item[bucket.key]);
    return acc + (Number.isFinite(count) ? count * bucket.weight : 0);
  }, 0);
  const mean = weighted / total;
  if (!Number.isFinite(mean)) return null;
  const definition = CONSENSUS_LABELS.find((entry) => mean >= entry.min) ?? CONSENSUS_LABELS.at(-1);
  return {
    mean: Math.round(mean * 100) / 100,
    key: definition.key,
    label: definition.label,
    tone: definition.tone,
    total,
  };
}

export function formatBreakdown(item) {
  if (!item || typeof item !== "object") return [];
  const total = Number(item.total);
  if (!Number.isFinite(total) || total <= 0) return [];
  return RATING_BUCKETS.map((bucket) => {
    const count = Number(item[bucket.key]);
    const safeCount = Number.isFinite(count) ? count : 0;
    return {
      key: bucket.key,
      label: bucket.label,
      count: safeCount,
      pct: Math.round((safeCount / total) * 100),
      tone: bucket.tone,
    };
  });
}

export function formatPeriod(period) {
  if (typeof period !== "string" || !period) return null;
  const parsed = new Date(period);
  if (Number.isNaN(parsed.getTime())) return period;
  return parsed.toLocaleDateString("fr-CA", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function buildHistorySeries(items, { limit = 6 } = {}) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, Math.max(1, limit)).map((item) => {
    const consensus = computeConsensus(item);
    return {
      period: item.period,
      total: item.total,
      mean: consensus?.mean ?? null,
      label: consensus?.label ?? null,
      tone: consensus?.tone ?? null,
    };
  });
}
