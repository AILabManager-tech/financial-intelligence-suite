// Pure formatters for the operational stats panel (P4.12). Each returns null for
// invalid input so the panel can hide the field (factual: no fabricated 0 or
// "n/d"). Percentages and currency reuse the existing shared formatters.

export function formatCount(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  return new Intl.NumberFormat("fr-CA").format(Math.round(Number(value)));
}

// Holding period: days for short spans, years once it crosses ~1 year, so a PM
// reads "182 j" or "1,4 an" rather than "512 j".
export function formatDays(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  const days = Number(value);
  if (days < 0) return null;
  if (days < 365) return `${Math.round(days)} j`;
  const years = days / 365;
  return `${years.toFixed(1).replace(".", ",")} an${years >= 2 ? "s" : ""}`;
}

// Win/loss ratio rendered as a multiple, e.g. "3,00×".
export function formatMultiple(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  return `${Number(value).toFixed(2).replace(".", ",")}×`;
}
