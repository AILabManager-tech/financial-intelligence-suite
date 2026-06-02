// Consent store (P8.5 — Loi 25). Records the user's acknowledgement of the
// privacy notice, versioned so a policy change re-prompts. Persisted in
// localStorage (fis:consent:v1). Pure helpers + persistence, graceful on
// private browsing / corrupt data.
//
// Note: FIS sets no tracking cookies and runs no analytics — data stays in the
// browser, only stock symbols are sent to market-data providers. So this is an
// informed-consent acknowledgement of that processing, not a tracking opt-in.
const KEY = "fis:consent:v1";
export const CONSENT_VERSION = 1; // bump when the privacy policy materially changes

export function acceptConsent(at) {
  return { version: CONSENT_VERSION, acceptedAt: at };
}

export function hasValidConsent(state = loadConsent()) {
  return Boolean(state) && state.version === CONSENT_VERSION;
}

export function loadConsent() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.version !== "number") return null;
    return { version: parsed.version, acceptedAt: parsed.acceptedAt ?? null };
  } catch {
    return null;
  }
}

export function saveConsent(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // private browsing / quota — non-fatal
  }
}

export function revokeConsent() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // non-fatal
  }
}
