// Règles de conformité par mandat (P5.2), persistées localStorage. Un seul objet
// { [portfolioId]: rules } versionné. Tolérant : JSON corrompu → défauts.

const STORAGE_KEY = "financial-intelligence-suite.compliance.v1";

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function defaultRules() {
  return { maxPositionPct: null, maxSectorPct: null, excludedSymbols: [] };
}

function normalizeRules(raw) {
  const base = defaultRules();
  if (!raw || typeof raw !== "object") return base;
  const maxPositionPct = Number(raw.maxPositionPct);
  const maxSectorPct = Number(raw.maxSectorPct);
  return {
    maxPositionPct: Number.isFinite(maxPositionPct) && maxPositionPct > 0 ? maxPositionPct : null,
    maxSectorPct: Number.isFinite(maxSectorPct) && maxSectorPct > 0 ? maxSectorPct : null,
    excludedSymbols: Array.isArray(raw.excludedSymbols)
      ? [...new Set(raw.excludedSymbols.map((s) => String(s ?? "").trim().toUpperCase()).filter(Boolean))]
      : [],
  };
}

function readAll() {
  if (!hasStorage()) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function loadComplianceRules(portfolioId = "default") {
  return normalizeRules(readAll()[portfolioId]);
}

export function saveComplianceRules(portfolioId = "default", rules = {}) {
  const normalized = normalizeRules(rules);
  if (!hasStorage()) return normalized;
  const all = readAll();
  all[portfolioId] = normalized;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // best-effort : la conformité ne doit pas casser l'app si le stockage est plein
  }
  return normalized;
}
