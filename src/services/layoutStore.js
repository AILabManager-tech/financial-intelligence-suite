// Layout preference store (P0.2) — persists, per surface and per feature, the
// user's composed layout: visibility (on/off), order, and column span (1 or 2).
//
// Generalises themeStore: same philosophy (versioned localStorage key, the
// default state is represented by the ABSENCE of an entry, graceful recovery on
// corrupt data / private browsing). Here the persisted unit is richer than a
// single string, so storage holds a versioned JSON document.
//
// Source of truth for WHICH features exist = featureRegistry. This store only
// records user PREFERENCES over that catalogue. On load/save it reconciles the
// stored layout against the live registry:
//   - drops ids that no longer exist (removed feature),
//   - appends registry features missing from the stored layout (new feature),
//     in canonical order, at their default visibility/columns.
// => zero regression today (default = every feature visible, canonical order,
//    1 column) AND forward-compatible when P0.x adds new features.
//
// Note: featureRegistry also exports a getDefaultLayout(surface) that returns the
// visible ids only. THIS module's getDefaultLayout() returns the full preference
// object { asset, dashboard } of entries — different purpose, different shape.

import { getFeaturesBySurface, VALID_SURFACES } from "../core/featureRegistry";

export const LAYOUT_KEY = "fis:layout:v1";
export const LAYOUT_VERSION = 1;
export const VALID_COLUMNS = Object.freeze([1, 2]);
export const DEFAULT_COLUMNS = 1;

/** @typedef {{ id: string, visible: boolean, columns: 1|2 }} LayoutEntry */
/** @typedef {{ asset: LayoutEntry[], dashboard: LayoutEntry[] }} Layout */

export function isValidColumns(value) {
  return value === 1 || value === 2;
}

/**
 * Default layout entries for a surface: ALL registered features, canonical
 * order, visibility = registry defaultVisible, columns = DEFAULT_COLUMNS.
 * Includes default-hidden features so the settings UI (P0.4) can toggle them on.
 * @param {'asset'|'dashboard'} surface
 * @returns {LayoutEntry[]}
 */
export function getDefaultSurfaceLayout(surface) {
  return getFeaturesBySurface(surface).map((feature) => ({
    id: feature.id,
    visible: feature.defaultVisible,
    columns: DEFAULT_COLUMNS,
  }));
}

/**
 * Full default layout for every known surface.
 * @returns {Layout}
 */
export function getDefaultLayout() {
  const layout = {};
  for (const surface of VALID_SURFACES) {
    layout[surface] = getDefaultSurfaceLayout(surface);
  }
  return layout;
}

/**
 * Reconcile a (possibly stale / partial / corrupt) stored surface array against
 * the live registry. Preserves user order/visibility/columns for ids that still
 * exist, drops unknown ids, appends missing registry features at canonical end.
 * @param {'asset'|'dashboard'} surface
 * @param {unknown} storedEntries
 * @returns {LayoutEntry[]}
 */
function reconcileSurface(surface, storedEntries) {
  const known = getFeaturesBySurface(surface);
  const defaultsById = new Map(getDefaultSurfaceLayout(surface).map((e) => [e.id, e]));
  const list = Array.isArray(storedEntries) ? storedEntries : [];

  const result = [];
  const seen = new Set();
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const fallback = defaultsById.get(raw.id);
    if (!fallback || seen.has(raw.id)) continue; // unknown id or duplicate → drop
    seen.add(raw.id);
    result.push({
      id: raw.id,
      visible: typeof raw.visible === "boolean" ? raw.visible : fallback.visible,
      columns: isValidColumns(raw.columns) ? raw.columns : DEFAULT_COLUMNS,
    });
  }
  // Append registry features absent from the stored layout, canonical order.
  for (const feature of known) {
    if (!seen.has(feature.id)) result.push(defaultsById.get(feature.id));
  }
  return result;
}

function reconcileLayout(stored) {
  const surfaces = stored && typeof stored === "object" ? stored.surfaces : undefined;
  const layout = {};
  for (const surface of VALID_SURFACES) {
    layout[surface] = reconcileSurface(surface, surfaces?.[surface]);
  }
  return layout;
}

/**
 * Load the persisted layout, reconciled against the registry. Returns the
 * default layout when nothing is stored, the version mismatches, or data is
 * corrupt / localStorage is unavailable.
 * @returns {Layout}
 */
export function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return getDefaultLayout();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== LAYOUT_VERSION) return getDefaultLayout();
    return reconcileLayout(parsed);
  } catch {
    return getDefaultLayout();
  }
}

function layoutsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Persist a layout. The layout is reconciled (sanitised) before storage so we
 * never persist junk. When the result equals the default, the entry is removed
 * (the default state = absence of entry, like themeStore).
 * @param {Layout} layout
 */
export function saveLayout(layout) {
  try {
    const clean = reconcileLayout({ surfaces: layout });
    if (layoutsEqual(clean, getDefaultLayout())) {
      localStorage.removeItem(LAYOUT_KEY);
      return;
    }
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ version: LAYOUT_VERSION, surfaces: clean }));
  } catch {
    // private browsing / quota — non-fatal
  }
}

/** Remove the persisted layout; subsequent loadLayout() returns the default. */
export function resetLayout() {
  try {
    localStorage.removeItem(LAYOUT_KEY);
  } catch {
    // non-fatal
  }
}

// --- Pure mutators (return a new layout, never mutate the argument) ----------

function mapSurface(layout, surface, fn) {
  if (!VALID_SURFACES.includes(surface) || !Array.isArray(layout?.[surface])) {
    return layout;
  }
  return { ...layout, [surface]: fn(layout[surface]) };
}

/**
 * @param {Layout} layout @param {'asset'|'dashboard'} surface
 * @param {string} id @param {boolean} visible @returns {Layout}
 */
export function setFeatureVisibility(layout, surface, id, visible) {
  return mapSurface(layout, surface, (entries) => {
    if (!entries.some((e) => e.id === id)) return entries;
    return entries.map((e) => (e.id === id ? { ...e, visible: Boolean(visible) } : e));
  });
}

/**
 * @param {Layout} layout @param {'asset'|'dashboard'} surface
 * @param {string} id @param {1|2} columns @returns {Layout}
 */
export function setFeatureColumns(layout, surface, id, columns) {
  const next = isValidColumns(columns) ? columns : DEFAULT_COLUMNS;
  return mapSurface(layout, surface, (entries) => {
    if (!entries.some((e) => e.id === id)) return entries;
    return entries.map((e) => (e.id === id ? { ...e, columns: next } : e));
  });
}

/**
 * Move the entry at fromIndex to toIndex (clamped). Out-of-range fromIndex
 * leaves the layout unchanged.
 * @param {Layout} layout @param {'asset'|'dashboard'} surface
 * @param {number} fromIndex @param {number} toIndex @returns {Layout}
 */
export function moveFeature(layout, surface, fromIndex, toIndex) {
  return mapSurface(layout, surface, (entries) => {
    if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= entries.length) {
      return entries;
    }
    const target = Math.max(0, Math.min(entries.length - 1, toIndex));
    if (target === fromIndex) return entries;
    const next = [...entries];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(target, 0, moved);
    return next;
  });
}

/**
 * Ordered ids of the visible features on a surface — what the render (P0.3)
 * iterates over to mount panels.
 * @param {Layout} layout @param {'asset'|'dashboard'} surface
 * @returns {string[]}
 */
export function getVisibleFeatureIds(layout, surface) {
  const entries = layout?.[surface];
  if (!Array.isArray(entries)) return [];
  return entries.filter((e) => e.visible).map((e) => e.id);
}
