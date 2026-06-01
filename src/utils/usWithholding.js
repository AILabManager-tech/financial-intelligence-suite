// US dividend withholding model (P5.5 unblock). Pure, factual application of
// published rules — never tax advice. Under the Canada-US tax treaty
// (Article XVIII), US-source dividends paid to a Canadian resident are subject
// to a 15% non-resident withholding tax, with these account-type exceptions:
//   - RRSP/RRIF (REER/FERR): exempt (Art. XVIII(7)) — 0% withheld.
//   - TFSA (CELI): withheld at 15%, and NOT recoverable (TFSA income isn't
//     taxed in Canada, so no foreign tax credit applies; the treaty doesn't
//     recognize the TFSA as a pension).
//   - Taxable (non-registered): withheld at 15%, recoverable via the foreign
//     tax credit on the Canadian return.
// Only US-source dividends are in scope; the caller decides US-source from the
// listing country. Amounts are factual (real declared dividends × the rate),
// never fabricated.
export const US_DIVIDEND_WITHHOLDING_RATE = 0.15;

// Short labels for display (kept here so panels don't depend on the store).
export const ACCOUNT_LABEL = Object.freeze({
  taxable: "Compte imposable",
  rrsp: "REER / FERR",
  tfsa: "CELI",
});

const TREATMENTS = {
  taxable: {
    rate: US_DIVIDEND_WITHHOLDING_RATE,
    exempt: false,
    recoverable: true,
    note: "Retenue 15 % récupérable via le crédit pour impôt étranger (compte imposable).",
  },
  rrsp: {
    rate: 0,
    exempt: true,
    recoverable: false,
    note: "Exempté de la retenue US par le traité fiscal Canada-US (REER/FERR).",
  },
  tfsa: {
    rate: US_DIVIDEND_WITHHOLDING_RATE,
    exempt: false,
    recoverable: false,
    note: "Retenue 15 % non récupérable : le CELI n'est pas reconnu comme régime de retraite par le traité.",
  },
};

export function accountWithholdingTreatment(accountType) {
  return TREATMENTS[accountType] ?? TREATMENTS.taxable;
}

export function computeUsDividendWithholding(grossAmount, accountType) {
  const gross = Number(grossAmount);
  if (!Number.isFinite(gross) || gross <= 0) return null;

  const treatment = accountWithholdingTreatment(accountType);
  const withheld = gross * treatment.rate;

  return {
    gross,
    withheld,
    net: gross - withheld,
    rate: treatment.rate,
    exempt: treatment.exempt,
    recoverable: treatment.recoverable,
    note: treatment.note,
  };
}

// Aggregate withholding across held US-source positions. Each input holding is
// { symbol, gross } where `gross` is its annual US dividend in $ (a factual
// figure the caller derives from real declared dividends). Holdings with a
// non-positive/invalid gross are dropped (no fabrication). Returns totals + the
// per-holding breakdown, or hasData:false if nothing qualifies.
export function aggregateUsWithholding(holdings, accountType) {
  const treatment = accountWithholdingTreatment(accountType);
  const rows = (Array.isArray(holdings) ? holdings : [])
    .map((h) => {
      const computed = computeUsDividendWithholding(h?.gross, accountType);
      return computed ? { symbol: String(h.symbol ?? "").toUpperCase(), ...computed } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.gross - a.gross);

  if (rows.length === 0) {
    return { accountType, treatment, hasData: false, holdings: [], totalGross: 0, totalWithheld: 0, totalNet: 0 };
  }

  const totalGross = rows.reduce((acc, r) => acc + r.gross, 0);
  const totalWithheld = rows.reduce((acc, r) => acc + r.withheld, 0);

  return {
    accountType,
    treatment,
    hasData: true,
    holdings: rows,
    totalGross,
    totalWithheld,
    totalNet: totalGross - totalWithheld,
  };
}
