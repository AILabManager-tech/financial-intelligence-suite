// Stooq's free JSON quote endpoint only reliably serves US listings under the
// ".us" namespace. A ticker carrying a known non-US exchange suffix (e.g.
// RY.TO) must NOT be rewritten to "ry-to.us" — that is a non-existent US symbol
// that can never resolve. Return null for such tickers so the caller skips the
// stooq fallback and reports the symbol as uncovered, instead of firing a bogus
// request. US class shares (BRK.B) keep working: the suffix isn't an exchange.
export const NON_US_EXCHANGE_SUFFIXES = new Set([
  ".L", ".PA", ".AS", ".BR", ".LS", ".DE", ".F", ".MI", ".MC", ".SW", ".ST",
  ".OL", ".CO", ".HE", ".VI", ".WA", ".PR", ".IS", ".ME", ".TO", ".V", ".CN",
  ".NE", ".MX", ".SA", ".BA", ".SN", ".HK", ".T", ".KS", ".KQ", ".TW", ".SS",
  ".SZ", ".NS", ".BO", ".AX", ".NZ", ".JO", ".TA",
]);

export function toStooqSymbol(symbol) {
  const clean = String(symbol ?? "").trim();
  if (!clean) return null;
  const dotIndex = clean.indexOf(".");
  if (dotIndex !== -1) {
    const suffix = clean.slice(dotIndex).toUpperCase();
    if (NON_US_EXCHANGE_SUFFIXES.has(suffix)) return null;
  }
  // US ticker, including class shares like BRK.B → "brk-b.us".
  return `${clean.replace(".", "-").toLowerCase()}.us`;
}
