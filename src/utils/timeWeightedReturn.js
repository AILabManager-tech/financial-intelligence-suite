// TWR — rendement pondéré dans le temps (P4.2), pur et factuel.
//
// Le TWR mesure la performance de MARCHÉ d'un portefeuille en neutralisant les
// apports/retraits de capital : une hausse de valeur due à un achat financé de
// l'extérieur n'est PAS de la performance. On chaîne les rendements de chaque
// sous-période entre deux snapshots, en soustrayant le flux de capital net de la
// sous-période. Convention : flux rattaché à la FIN de la sous-période —
// (1 + r) = (V_fin − flux) / V_début, l'apport ne « travaille » pas sur la
// période où il arrive. (Le rattacher au début donnerait V_fin / (V_début + flux).)
//
// Entrées :
//  - snapshots : [{ snapshotDate|capturedAt, totalMarketValue }] (série de valeur
//    journalière réelle produite par l'accrual P4-socle).
//  - transactions : [{ type, date, quantity, price, fee, amount }] — les buy/sell
//    sont les flux de capital qui gonflent/dégonflent totalMarketValue. Les
//    dividend/fee ne touchent pas la valeur des positions → ignorés ici.
//
// Factualité stricte : aucun rendement fabriqué. < 2 snapshots utilisables ⇒
// hasData:false. Annualisation seulement si la série couvre ≥ 365 jours.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dayKey(value) {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : null;
}

// Flux de capital externe par jour : buy = +capital investi (coût + frais),
// sell = -produit net (proceeds - frais). Map<jour, montant net>.
export function computeFlowsByDay(transactions) {
  const flows = new Map();
  if (!Array.isArray(transactions)) return flows;

  for (const tx of transactions) {
    const day = dayKey(tx?.date);
    if (!day) continue;
    const quantity = Number(tx?.quantity);
    const price = Number(tx?.price);
    const fee = Number.isFinite(Number(tx?.fee)) ? Number(tx.fee) : 0;

    let flow;
    if (tx?.type === "buy" && Number.isFinite(quantity) && Number.isFinite(price)) {
      flow = quantity * price + fee;
    } else if (tx?.type === "sell" && Number.isFinite(quantity) && Number.isFinite(price)) {
      flow = -(quantity * price - fee);
    } else {
      continue; // dividend / fee / invalide : pas un flux de capital sur les positions
    }
    flows.set(day, (flows.get(day) ?? 0) + flow);
  }
  return flows;
}

export function daysBetween(fromDay, toDay) {
  const from = new Date(`${fromDay}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDay}T00:00:00.000Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.round((to - from) / MS_PER_DAY);
}

// Rendements de sous-période FACTUELS et flux-neutralisés entre snapshots
// journaliers consécutifs. Primitif partagé : le TWR (P4.2) en fait le produit,
// la volatilité/drawdown portefeuille (P4.4) en fait l'écart-type et la courbe.
// Chaque entrée : { fromDay, toDay, growth (=1+r), ret }. Saute les bases ≤ 0.
export function computeSubPeriodReturns(snapshots, transactions = []) {
  const points = (Array.isArray(snapshots) ? snapshots : [])
    .map((s) => ({
      day: dayKey(s?.snapshotDate) ?? dayKey(s?.capturedAt),
      value: Number(s?.totalMarketValue),
    }))
    .filter((p) => p.day && Number.isFinite(p.value))
    .sort((a, b) => a.day.localeCompare(b.day));

  const flows = computeFlowsByDay(transactions);
  const flowEntries = [...flows.entries()];
  const series = [];

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    if (!(prev.value > 0)) continue; // base nulle/négative : sous-période non définissable

    // Flux de capital net survenu après `prev` jusqu'à `cur` inclus.
    let flow = 0;
    for (const [day, amount] of flowEntries) {
      if (day > prev.day && day <= cur.day) flow += amount;
    }

    // Facteur de croissance de la sous-période, flux de capital neutralisé :
    // (1 + rendement) = (valeur_fin - flux) / valeur_début.
    const growth = (cur.value - flow) / prev.value;
    if (!Number.isFinite(growth)) continue;

    series.push({ fromDay: prev.day, toDay: cur.day, growth, ret: growth - 1 });
  }

  return series;
}

export function computeTimeWeightedReturn(snapshots, transactions = []) {
  const series = computeSubPeriodReturns(snapshots, transactions);
  if (series.length === 0) {
    return { hasData: false };
  }

  const cumulative = series.reduce((acc, s) => acc * s.growth, 1);
  const from = series[0].fromDay;
  const to = series[series.length - 1].toDay;
  const spanDays = daysBetween(from, to);

  const twrPct = (cumulative - 1) * 100;
  let annualizedPct = null;
  if (spanDays && spanDays >= 365 && cumulative > 0) {
    annualizedPct = (cumulative ** (365 / spanDays) - 1) * 100;
  }

  return {
    hasData: true,
    twrPct,
    annualizedPct, // null tant que la série ne couvre pas ≥ 1 an
    periods: series.length,
    from,
    to,
    days: spanDays,
  };
}
