import { useState } from "react";
import { loadLayout } from "../services/layoutStore";

// Reads the persisted layout (P0.2 store) once at mount. P0.3 has no live
// editing UI yet, so a single read is sufficient and keeps the default render
// pixel-identical to the previous hard-coded stacking. P0.4 (settings UI) will
// upgrade this to subscribe to layout mutations so toggles/reorders re-render.
export function useLayout() {
  const [layout] = useState(() => loadLayout());
  return layout;
}
