// Pure formatters for the investment journal panel (P5.1). Each returns null for
// invalid input so the panel can hide the field (factual: no fabricated value).
// reviewStatus takes `today` as an argument (no Date.now) so it stays pure and
// testable; the panel injects the current date. Tones reuse the frozen FIS
// palette tokens (rose / amber / slate) — no new colors.

const CONVICTION_LABELS = {
  1: "Très faible",
  2: "Faible",
  3: "Modérée",
  4: "Forte",
  5: "Très forte",
};

function levelOf(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

export function formatConviction(value) {
  const level = levelOf(value);
  return level === null ? null : `${level} / 5`;
}

export function convictionLabel(value) {
  const level = levelOf(value);
  return level === null ? null : CONVICTION_LABELS[level];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;
const SOON_DAYS = 14;

// Status of a review date relative to `today`, both "YYYY-MM-DD". Returns null
// when either date is invalid. overdue = past, soon = within 14 days (incl.
// today), scheduled = further out.
export function reviewStatus(reviewDate, { today } = {}) {
  if (!DATE_RE.test(String(reviewDate)) || !DATE_RE.test(String(today))) return null;
  const review = Date.parse(`${reviewDate}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(review) || !Number.isFinite(now)) return null;
  const days = Math.round((review - now) / MS_PER_DAY);
  if (days < 0) return { key: "overdue", label: "Revue en retard", tone: "text-rose-400" };
  if (days <= SOON_DAYS) return { key: "soon", label: "Revue imminente", tone: "text-amber-300" };
  return { key: "scheduled", label: "Revue planifiée", tone: "text-slate-300" };
}
