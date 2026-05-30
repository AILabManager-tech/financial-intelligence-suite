import { useEffect, useMemo, useState } from "react";
import { LayoutContext } from "../core/layoutContext";
import {
  loadLayout,
  saveLayout,
  getDefaultLayout,
  setFeatureVisibility,
  setFeatureColumns,
  moveFeature,
} from "../services/layoutStore";

// Holds the layout in React state and persists every change. Controls use
// functional state updates (so they don't depend on the current layout and stay
// memoised), and persistence is a single effect on `layout` — saveLayout removes
// the stored entry when the layout equals the default, exactly like themeStore.
export function LayoutProvider({ children }) {
  const [layout, setLayout] = useState(() => loadLayout());

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  const controls = useMemo(
    () => ({
      setVisibility: (surface, id, visible) =>
        setLayout((current) => setFeatureVisibility(current, surface, id, visible)),
      setColumns: (surface, id, columns) =>
        setLayout((current) => setFeatureColumns(current, surface, id, columns)),
      move: (surface, from, to) => setLayout((current) => moveFeature(current, surface, from, to)),
      reset: () => setLayout(getDefaultLayout()),
      // Commit a complete layout at once (e.g. applying a profile, P0.5).
      apply: (next) => setLayout(next),
    }),
    [],
  );

  const value = useMemo(() => ({ layout, ...controls }), [layout, controls]);
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}
