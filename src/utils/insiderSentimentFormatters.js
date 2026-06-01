// Formateurs purs pour le sentiment d'initiés (MSPR). Par champ, null si invalide.

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function formatMonthYear(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null;
  return `${MONTHS[m - 1]} ${y}`;
}

export function formatMspr(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(1);
}

// MSPR ∈ [-100, 100] : > 0 = achats nets d'initiés (accumulation), < 0 = ventes.
export function msprSentiment(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return { label: "Indéterminé", tone: "slate" };
  if (n > 5) return { label: "Accumulation", tone: "emerald" };
  if (n < -5) return { label: "Distribution", tone: "rose" };
  return { label: "Neutre", tone: "slate" };
}

// Moyenne des MSPR disponibles (sentiment d'ensemble sur la fenêtre).
export function averageMspr(items) {
  const values = (Array.isArray(items) ? items : [])
    .map((i) => Number(i?.mspr))
    .filter((v) => Number.isFinite(v));
  if (values.length === 0) return null;
  return values.reduce((a, v) => a + v, 0) / values.length;
}
