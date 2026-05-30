import { getFeaturesBySurface } from "./featureRegistry";
import { DEFAULT_COLUMNS } from "../services/layoutStore";

// Built-in manager profiles (P0.5). Each profile lists, per surface, the visible
// feature ids in display order. Features omitted from a surface's list are
// hidden. Applying a profile produces a COMPLETE layout (every registry feature
// present: listed ones visible in the given order, the rest appended hidden in
// canonical order) which the layout context commits in one shot.
//
// "overview" uses surfaces: null = the default layout (everything visible,
// canonical order) — identical to a reset, exposed as a named starting point.
export const BUILTIN_PROFILES = Object.freeze([
  {
    id: "overview",
    label: "Vue d'ensemble",
    description: "Tout visible, ordre par défaut.",
    surfaces: null,
  },
  {
    id: "value",
    label: "Value investor",
    description: "Fondamentaux, Buffett et comparables en avant.",
    surfaces: {
      asset: ["fundamentals", "buffett", "peers", "sec-filings", "dividends"],
      dashboard: ["risk-command-center", "portfolio-manager", "safety-badge", "top-performers"],
    },
  },
  {
    id: "trader",
    label: "Trader",
    description: "Momentum, analystes, actualités et alertes.",
    surfaces: {
      asset: ["analyst-ratings", "company-news", "earnings", "fundamentals"],
      dashboard: ["top-performers", "alert-manager", "operator-alerts", "market-data-health"],
    },
  },
  {
    id: "advisor",
    label: "Conseiller client",
    description: "Positions, risque et fiabilité des données.",
    surfaces: {
      asset: ["fundamentals", "dividends", "buffett", "peers"],
      dashboard: ["portfolio-manager", "risk-command-center", "safety-badge", "market-data-health"],
    },
  },
]);

function buildSurface(surface, visibleIds) {
  const features = getFeaturesBySurface(surface);
  if (!visibleIds) {
    return features.map((f) => ({ id: f.id, visible: true, columns: DEFAULT_COLUMNS }));
  }
  const entries = [];
  const seen = new Set();
  // Listed visible ids, in the profile's order (ignoring unknown / off-surface ids).
  for (const id of visibleIds) {
    const f = features.find((x) => x.id === id);
    if (f && !seen.has(id)) {
      entries.push({ id, visible: true, columns: DEFAULT_COLUMNS });
      seen.add(id);
    }
  }
  // Remaining registry features hidden, canonical order.
  for (const f of features) {
    if (!seen.has(f.id)) entries.push({ id: f.id, visible: false, columns: DEFAULT_COLUMNS });
  }
  return entries;
}

// Produce a complete layout { asset, dashboard } from a profile definition.
// Accepts the built-in shape ({ surfaces }) and is the single way to turn any
// profile (built-in or custom) into a layout the context can commit.
export function buildLayoutFromProfile(profile) {
  const surfaces = profile?.surfaces ?? null;
  return {
    asset: buildSurface("asset", surfaces?.asset ?? null),
    dashboard: buildSurface("dashboard", surfaces?.dashboard ?? null),
  };
}

export function getBuiltinProfile(id) {
  return BUILTIN_PROFILES.find((p) => p.id === id);
}
