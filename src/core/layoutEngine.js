import { getFeatureById, VALID_SURFACES } from "./featureRegistry";

// Deterministic layout engine (P1.1). Given a layout, it reorders each surface's
// features by a rule-based ranking — no LLM, instant, free, always the same
// output for the same input. The AI suggestion (P1.2) will be an optional layer
// on top, never the foundation.
//
// Rule: rank by category PRIORITY (piloting / KPI panels at the top, documentary
// panels at the bottom), then by the registry canonical order within a category
// (stable grouping). Each entry keeps the user's visibility and column choices —
// the engine optimises ORDER, it does not hide or resize anything.
//
// Priorities are intentionally spaced by 10 so categories can be inserted later
// without renumbering. Unknown categories fall to the bottom (FALLBACK).
const CATEGORY_PRIORITY = {
  overview: 10, // pilotage / KPI -> haut
  performance: 15, // rendements / ratios PM (Phase 4) -> haut, juste sous l'overview
  fundamentals: 20,
  portfolio: 30,
  comparison: 40,
  sentiment: 50,
  calendar: 60,
  monitoring: 70,
  simulation: 75, // outil what-if -> bas, avant le documentaire
  documents: 80, // documentaire -> bas
};
const FALLBACK_PRIORITY = 100;

function priorityOf(id) {
  const category = getFeatureById(id)?.category;
  return CATEGORY_PRIORITY[category] ?? FALLBACK_PRIORITY;
}

function canonicalOrderOf(id) {
  return getFeatureById(id)?.order ?? Number.MAX_SAFE_INTEGER;
}

// Reorder one surface's entries by (categoryPriority, canonicalOrder). Pure:
// returns a new array, preserves each entry (visible + columns) untouched.
export function optimizeSurface(entries) {
  if (!Array.isArray(entries)) return [];
  return [...entries].sort((a, b) => {
    const pa = priorityOf(a.id);
    const pb = priorityOf(b.id);
    if (pa !== pb) return pa - pb;
    return canonicalOrderOf(a.id) - canonicalOrderOf(b.id);
  });
}

// Optimise every surface of a layout. Idempotent.
export function optimizeLayout(layout) {
  const out = {};
  for (const surface of VALID_SURFACES) {
    out[surface] = optimizeSurface(layout?.[surface] ?? []);
  }
  return out;
}
