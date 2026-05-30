// Formateurs purs pour la matrice de rendements (P4.1). Par champ : chacun
// renvoie `null` quand l'entrée est invalide, pour que l'UI masque (jamais de
// placeholder inventé — CLAUDE.md factualité stricte).

/**
 * Pourcentage signé à deux décimales. null si non fini.
 * @param {number} value
 * @returns {string|null}
 */
export function formatPct(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} %`;
}

/**
 * Classe de couleur FIS selon le signe (palette gelée — aucune couleur neuve).
 * @param {number|null} value
 * @returns {string}
 */
export function returnTone(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "text-slate-500";
  return value >= 0 ? "text-emerald-400" : "text-rose-400";
}

/**
 * Nombre à `decimals` décimales (signé non forcé). null si non fini.
 * Sert aux mesures de forme (skewness / kurtosis) de la distribution P4.10.
 * @param {number} value
 * @param {number} [decimals]
 * @returns {string|null}
 */
export function formatRatio(value, decimals = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value.toFixed(decimals);
}

const MONTH_RE = /^(\d{4})-(\d{2})$/;

/**
 * "YYYY-MM" -> libellé mois court FR en UTC (pas de glissement de fuseau).
 * @param {string} month
 * @returns {string|null}
 */
export function formatMonthLabel(month) {
  if (typeof month !== "string") return null;
  const match = MONTH_RE.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("fr-CA", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
