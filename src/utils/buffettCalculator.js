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

// Seuil de P/FCF auquel le critère de marge de sécurité revient (B3).
//
// Avec des hypothèses UNIFORMES pour toutes les entreprises, `calcIntrinsicValue`
// est linéaire en FCF : VI = K × FCF, où K ne dépend que de (g, r, années). Or
// fcf = prix / (P/FCF), donc mos = 1 − (P/FCF) ÷ K. Le critère « mos > seuil »
// est alors arithmétiquement le MÊME test que « P/FCF < (1 − seuil) × K ».
//
// C'est le fond du point B3 : sous ses hypothèses par défaut (g = 5 %, r = 10 %,
// 10 ans → K = 21), le calcul ne distingue pas les entreprises entre elles, il
// applique un multiple — « marge de sécurité > 25 % » signifie exactement
// « P/FCF < 15,75 ». Le calcul est juste ; c'est le laisser implicite qui
// promettait plus qu'il ne tient. On l'expose donc, et il suit les curseurs.
//
// `null` quand r <= g : la valeur intrinsèque diverge, aucun seuil fini n'a de sens.
export function impliedPriceToFcfThreshold(g, r, mosThreshold, years = 10) {
  const k = calcIntrinsicValue(1, g, r, years);
  if (!Number.isFinite(k) || k <= 0) return null;
  return (1 - mosThreshold) * k;
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

// Critères comptés dans le score affiché. Chacun doit pouvoir ÉCHOUER pour les
// entrées que le pipeline accepte réellement — sinon il offre un point gratuit
// à tout titre analysé et le score affirme mesurer plus qu'il ne mesure.
//
// « FCF > 0 » a été retiré pour cette raison : `extractBuffettInputs` refuse
// pfcf <= 0, donc fcf = prix / pfcf est strictement positif dès qu'une analyse
// s'affiche. Le critère ne pouvait pas échouer et gonflait chaque score de 1.
// Un flux de trésorerie non positif reste traité — en amont, où il rend
// l'analyse impossible plutôt que d'être noté zéro sur un critère.
//
// Note sur les deux seuils d'endettement : ce critère exige D/E < 0.5 (prudence
// bilancielle), alors que `inferMoat` tolère jusqu'à 1.5 (une rente peut porter
// plus de dette sans perdre son avantage). Ce sont deux questions distinctes,
// pas une incohérence — d'où les seuils différents, assumés.
export function evaluateCriteria(stock, mos) {
  return [
    { label: 'ROE > 15%',              status: stock.roe > 0.15 ? 'PASS' : 'FAIL' },
    { label: 'Debt/Equity < 0.5',      status: stock.debtEquity < 0.5 ? 'PASS' : 'FAIL' },
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
