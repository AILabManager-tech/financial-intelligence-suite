// Rééquilibrage vers les cibles (P5.3), pur et factuel.
//
// À partir des positions détenues (valeur de marché réelle = quantité × prix) et
// de leur poids cible (`position.targetWeight`, en %), suggère l'ordre d'achat /
// vente pour rejoindre la cible. Un seuil de dérive (proxy de coûts) supprime les
// micro-ajustements non rentables. Aucune cible inventée : si aucune cible n'est
// définie, hasData:false. Les cibles sont prises telles quelles (pas de
// normalisation à 100 % — l'écart à 100 % = cash implicite, signalé).

function heldValue(asset) {
  const quantity = Number(asset?.position?.quantity);
  const price = Number(asset?.price);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) return 0;
  return quantity * price;
}

function targetPct(asset) {
  const t = Number(asset?.position?.targetWeight);
  return Number.isFinite(t) && t > 0 ? t : 0;
}

export function computeRebalance(assets, { thresholdPct = 1 } = {}) {
  const list = Array.isArray(assets) ? assets : [];
  const entries = list
    .map((asset) => ({ symbol: String(asset?.symbol ?? "").toUpperCase(), value: heldValue(asset), target: targetPct(asset) }))
    .filter((e) => e.symbol && (e.value > 0 || e.target > 0));

  const total = entries.reduce((sum, e) => sum + e.value, 0);
  const targetSum = entries.reduce((sum, e) => sum + e.target, 0);
  if (total <= 0 || targetSum <= 0) {
    return { hasData: false, rows: [] };
  }

  const threshold = Number.isFinite(Number(thresholdPct)) && Number(thresholdPct) >= 0 ? Number(thresholdPct) : 0;

  const rows = entries.map((e) => {
    const currentPct = (e.value / total) * 100;
    const targetValue = (e.target / 100) * total;
    const deltaValue = targetValue - e.value; // >0 acheter, <0 vendre
    const driftPct = currentPct - e.target;
    const actionable = Math.abs(driftPct) > threshold && Math.abs(deltaValue) > 0;
    return {
      symbol: e.symbol,
      currentPct,
      targetPct: e.target,
      driftPct,
      action: !actionable ? "hold" : deltaValue > 0 ? "buy" : "sell",
      amount: actionable ? Math.abs(deltaValue) : 0,
    };
  });

  rows.sort((a, b) => Math.abs(b.driftPct) - Math.abs(a.driftPct));

  const totalToBuy = rows.filter((r) => r.action === "buy").reduce((s, r) => s + r.amount, 0);
  const totalToSell = rows.filter((r) => r.action === "sell").reduce((s, r) => s + r.amount, 0);

  return {
    hasData: true,
    total,
    targetSumPct: targetSum, // peut différer de 100 % (cash implicite)
    thresholdPct: threshold,
    rows,
    totalToBuy,
    totalToSell,
    actionableCount: rows.filter((r) => r.action !== "hold").length,
  };
}
