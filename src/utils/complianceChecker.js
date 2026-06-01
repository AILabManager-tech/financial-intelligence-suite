// Contrôle de conformité (P5.2), pur et factuel.
//
// Évalue les positions détenues contre des règles de mandat : poids max par
// titre, poids max par secteur, titres exclus. Pondéré par valeur de marché
// réelle (quantité × prix). Aucune violation inventée : si une règle est absente
// (null), elle n'est pas évaluée. `hasData:false` si aucune position valorisée.

function heldValue(asset) {
  const quantity = Number(asset?.position?.quantity);
  const price = Number(asset?.price);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) return 0;
  return quantity * price;
}

export function checkCompliance(assets, rules = {}) {
  const list = Array.isArray(assets) ? assets : [];
  const valued = list
    .map((asset) => ({ asset, value: heldValue(asset) }))
    .filter((entry) => entry.value > 0);

  const total = valued.reduce((sum, entry) => sum + entry.value, 0);
  if (total <= 0) {
    return { hasData: false, violations: [] };
  }

  // Garde le null/'' AVANT Number() : Number(null) === 0 (fini) ferait une limite
  // 0 % qui invaliderait tout. Une règle non renseignée n'est pas évaluée.
  const maxPositionPct =
    rules.maxPositionPct != null && rules.maxPositionPct !== "" && Number.isFinite(Number(rules.maxPositionPct))
      ? Number(rules.maxPositionPct)
      : null;
  const maxSectorPct =
    rules.maxSectorPct != null && rules.maxSectorPct !== "" && Number.isFinite(Number(rules.maxSectorPct))
      ? Number(rules.maxSectorPct)
      : null;
  const excluded = new Set(
    (Array.isArray(rules.excludedSymbols) ? rules.excludedSymbols : [])
      .map((s) => String(s ?? "").trim().toUpperCase())
      .filter(Boolean),
  );

  const violations = [];

  // Poids max par titre + titres exclus.
  for (const { asset, value } of valued) {
    const symbol = String(asset.symbol ?? "").toUpperCase();
    const weightPct = (value / total) * 100;
    if (maxPositionPct !== null && weightPct > maxPositionPct) {
      violations.push({
        type: "position",
        symbol,
        label: `${symbol} dépasse le poids max par titre`,
        actualPct: weightPct,
        limitPct: maxPositionPct,
      });
    }
    if (excluded.has(symbol)) {
      violations.push({
        type: "excluded",
        symbol,
        label: `${symbol} est sur la liste d'exclusion`,
        actualPct: weightPct,
        limitPct: null,
      });
    }
  }

  // Poids max par secteur.
  if (maxSectorPct !== null) {
    const bySector = new Map();
    for (const { asset, value } of valued) {
      const sector = String(asset.sector ?? "").trim() || "Non classé";
      bySector.set(sector, (bySector.get(sector) ?? 0) + value);
    }
    for (const [sector, value] of bySector) {
      const weightPct = (value / total) * 100;
      if (weightPct > maxSectorPct) {
        violations.push({
          type: "sector",
          sector,
          label: `Le secteur « ${sector} » dépasse le poids max`,
          actualPct: weightPct,
          limitPct: maxSectorPct,
        });
      }
    }
  }

  return { hasData: true, violations, compliant: violations.length === 0, total };
}
