import { Fragment } from "react";
import { getFeatureById } from "../core/featureRegistry";
import { getVisibleFeatureIds } from "../services/layoutStore";

// Renders the visible features of a surface, in the layout's order (P0.2 store),
// by resolving each feature's stable componentKey against a provided component
// map and feeding it the props returned by propsFor(feature).
//
// This replaces the hard-coded panel stacking in IntelligenceCard.jsx (asset
// surface) and App.jsx (dashboard surface). Order + visibility come from the
// layout; the registry stays the single source of truth for WHICH features
// exist and their componentKey.
//
// Column span is persisted by the store but NOT rendered as a grid here: the
// default is 1 (full width), which reproduces the current stacked layout
// pixel-for-pixel. The 2-column arrangement lands with the settings UI (P0.4),
// where the user can actually set it.
//
// wrapItem(feature, node) lets a surface wrap each rendered feature (e.g. the
// dashboard wraps panels in <section aria-label>). Keys are always applied by
// LayoutSurface via Fragment, so wrapItem need not handle them.
export default function LayoutSurface({ surface, layout, components, propsFor, wrapItem }) {
  const ids = getVisibleFeatureIds(layout, surface);
  return ids.map((id) => {
    const feature = getFeatureById(id);
    // Defensive: layout is reconciled against the registry on load, so an
    // unknown id or surface mismatch shouldn't reach here — skip rather than crash.
    if (!feature || feature.surface !== surface) return null;
    const Component = components[feature.componentKey];
    if (!Component) return null;
    const props = propsFor ? propsFor(feature) : {};
    const node = <Component {...props} />;
    return <Fragment key={id}>{wrapItem ? wrapItem(feature, node) : node}</Fragment>;
  });
}
