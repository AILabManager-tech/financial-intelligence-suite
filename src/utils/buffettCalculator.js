// Buffett DCF + criteria evaluation — pure functions, framework-agnostic.
// Ported from fin_tech_buffet_module/src/lib/buffett.ts (TS → JS for FIS).

export function calcIntrinsicValue(fcf, g, r, years = 10) {
  if (r <= g) return Infinity;
  let pv = 0;
  for (let t = 1; t <= years; t += 1) {
    pv += (fcf * Math.pow(1 + g, t)) / Math.pow(1 + r, t);
  }
  const terminal = (fcf * Math.pow(1 + g, years) * (1 + g)) / (r - g);
  return pv + terminal / Math.pow(1 + r, years);
}

// Moat heuristic (replaces a static lookup table).
// Buffett's wide-moat signature:
//   - High return on equity (≥15%) → pricing power / capital efficiency
//   - Sustained earnings growth (≥5% over 5y) → durable demand
//   - Positive free cash flow → real cash generation
//   - Reasonable leverage (D/E < 1.5) → not financed-to-the-gills
// Overrides exist for edge cases (holdings whose ROE is diluted by float).

export const MOAT_OVERRIDES = Object.freeze({
  'BRK.A': true,
  'BRK.B': true,
});

export function inferMoat(m) {
  return (
    m.roe >= 0.15 &&
    m.earningsGrowth5y >= 0.05 &&
    m.fcf > 0 &&
    m.debtEquity < 1.5
  );
}

export function resolveMoat(ticker, m) {
  const override = MOAT_OVERRIDES[ticker];
  if (typeof override === 'boolean') return override;
  return inferMoat(m);
}

export function evaluateCriteria(stock, mos) {
  return [
    { label: 'ROE > 15%',              status: stock.roe > 0.15 ? 'PASS' : 'FAIL' },
    { label: 'Debt/Equity < 0.5',      status: stock.debtEquity < 0.5 ? 'PASS' : 'FAIL' },
    { label: 'FCF > 0',                status: stock.fcf > 0 ? 'PASS' : 'FAIL' },
    { label: 'EPS growth 5y > 5%',     status: stock.earningsGrowth5y > 0.05 ? 'PASS' : 'FAIL' },
    { label: 'Economic moat',          status: stock.hasMoat ? 'PASS' : 'FAIL' },
    { label: 'Margin of Safety > 25%', status: mos > 0.25 ? 'PASS' : 'FAIL' },
  ];
}

export function decideAction(allPass, mos) {
  if (allPass) return 'BUY';
  if (mos < -0.10) return 'SELL';
  return 'HOLD';
}
