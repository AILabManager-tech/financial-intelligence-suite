import { createContext, useContext, useState } from "react";
import { loadLayout } from "../services/layoutStore";

// Reactive layout state (P0.4a). P0.3's useLayout read the persisted layout once
// at mount — enough to drive the default render but blind to live edits. This
// context holds the layout in React state (see LayoutProvider) so the settings
// UI (P0.4b/c) re-renders IntelligenceCard and the dashboard as the user
// toggles / reorders / re-columns features.
//
// Split across files to satisfy react-refresh: the context + hooks live here
// (no JSX), the provider component lives in components/LayoutProvider.jsx.
export const LayoutContext = createContext(null);

// Read the current layout. Inside a LayoutProvider it is reactive (re-renders on
// edits). Outside one (e.g. an isolated component test) it falls back to a
// single non-reactive read of the persisted layout so consumers still work.
export function useLayout() {
  const ctx = useContext(LayoutContext);
  const [fallback] = useState(() => (ctx ? null : loadLayout()));
  return ctx ? ctx.layout : fallback;
}

// Mutators for the settings UI (setVisibility / setColumns / move / reset).
// Requires a LayoutProvider.
export function useLayoutControls() {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error("useLayoutControls doit être utilisé dans un LayoutProvider");
  }
  const { layout: _layout, ...controls } = ctx;
  return controls;
}
