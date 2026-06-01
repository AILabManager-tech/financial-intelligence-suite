import { parseSymbolExchange } from "./symbolExchange";

// Canadian listing recognizer (P5.5). Derives the venue from the symbol suffix
// deterministically — no external source, no fabrication. Only the factual,
// suffix-derivable facts are surfaced here:
//   - which Canadian exchange the symbol is listed on;
//   - the venue's usual quote currency (CAD) — a property of the place, not a
//     per-security assertion (a handful of interlisted TSX names quote in USD).
//
// Out of scope / blocked-on-data (documented honestly in the panel, never
// fabricated): SEDAR+ filings (no free API), and CAD gross/net dividend +
// 15% US withholding on registered accounts (RRSP/TFSA), which would require an
// account-type model the app does not have.
const CANADIAN_EXCHANGES = {
  ".TO": { code: "TSX", name: "Toronto Stock Exchange" },
  ".V": { code: "TSX-V", name: "TSX Venture Exchange" },
  ".CN": { code: "CSE", name: "Canadian Securities Exchange" },
  ".NE": { code: "Cboe CA", name: "Cboe Canada (NEO)" },
};

export function isCanadianListing(symbol) {
  const { suffix } = parseSymbolExchange(symbol);
  return Object.prototype.hasOwnProperty.call(CANADIAN_EXCHANGES, suffix);
}

export function describeCanadianListing(symbol) {
  const { base, suffix } = parseSymbolExchange(symbol);
  const venue = CANADIAN_EXCHANGES[suffix];
  if (!venue) return { listed: false };

  return {
    listed: true,
    base,
    suffix,
    exchangeCode: venue.code,
    exchangeName: venue.name,
    country: "CA",
    countryLabel: "Canada",
    quoteCurrency: "CAD",
  };
}
