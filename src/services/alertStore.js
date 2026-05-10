const STORAGE_KEY = "financial-intelligence-suite.alerts.v1";

export const ALERT_TYPES = [
  "price_above",
  "price_below",
  "change_pct_above",
  "change_pct_below",
  "drift_above",
];

const ALERT_TYPE_SET = new Set(ALERT_TYPES);

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeSymbol(symbol) {
  return String(symbol ?? "").trim().toUpperCase();
}

function coerceThreshold(value) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function nowIso() {
  return new Date().toISOString();
}

function nextId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `alert_${globalThis.crypto.randomUUID()}`;
  }
  return `alert_${Math.random().toString(36).slice(2, 11)}_${Date.now().toString(36)}`;
}

function normalizeAlert(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!ALERT_TYPE_SET.has(raw.type)) return null;
  const threshold = coerceThreshold(raw.threshold);
  if (threshold === null) return null;

  const symbol = raw.type === "drift_above"
    ? normalizeSymbol(raw.symbol ?? "")
    : normalizeSymbol(raw.symbol);
  if (raw.type !== "drift_above" && !symbol) return null;

  if (typeof raw.id !== "string" || !raw.id) return null;

  return {
    id: raw.id,
    symbol,
    type: raw.type,
    threshold,
    enabled: raw.enabled !== false,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso(),
    lastTriggeredAt: typeof raw.lastTriggeredAt === "string" ? raw.lastTriggeredAt : null,
    note: typeof raw.note === "string" ? raw.note : "",
  };
}

export function normalizeAlerts(alerts) {
  return (Array.isArray(alerts) ? alerts : [])
    .map(normalizeAlert)
    .filter(Boolean);
}

export function loadAlerts() {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeAlerts(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveAlerts(alerts) {
  if (!hasStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeAlerts(alerts)));
}

export function addAlert(alerts, alert) {
  const normalized = normalizeAlert({ id: nextId(), ...alert });
  if (!normalized) return Array.isArray(alerts) ? [...alerts] : [];
  return [...(Array.isArray(alerts) ? alerts : []), normalized];
}

export function removeAlert(alerts, alertId) {
  return (Array.isArray(alerts) ? alerts : []).filter((alert) => alert.id !== alertId);
}

export function toggleAlertEnabled(alerts, alertId) {
  return (Array.isArray(alerts) ? alerts : []).map((alert) =>
    alert.id === alertId ? { ...alert, enabled: !alert.enabled } : alert,
  );
}

export function updateAlert(alerts, alertId, patch) {
  return (Array.isArray(alerts) ? alerts : []).map((alert) => {
    if (alert.id !== alertId) return alert;
    return normalizeAlert({ ...alert, ...patch });
  }).filter(Boolean);
}

export function markAlertTriggered(alerts, alertId, isoTimestamp) {
  if (!Array.isArray(alerts)) return [];
  const stamp = isoTimestamp ?? nowIso();
  let changed = false;
  const next = alerts.map((alert) => {
    if (alert.id !== alertId) return alert;
    if (alert.lastTriggeredAt === stamp) return alert;
    changed = true;
    return { ...alert, lastTriggeredAt: stamp };
  });
  return changed ? next : alerts;
}
