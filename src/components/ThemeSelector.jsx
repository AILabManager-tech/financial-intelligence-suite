import { useEffect, useState } from "react";
import { Palette as PaletteIcon } from "lucide-react";
import { applyTheme, loadTheme, saveTheme, VALID_THEMES } from "../services/themeStore";

const LABELS = {
  fis: "FIS",
  matrix: "Matrix",
  cyber: "Cyber",
  light: "Clair",
};

export default function ThemeSelector() {
  const [theme, setTheme] = useState(loadTheme);

  // Sync once on mount so refresh respects the persisted choice.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const change = (next) => {
    if (next === theme) return;
    setTheme(next);
    saveTheme(next);
    applyTheme(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Thème visuel"
      className="inline-flex items-center gap-1 rounded-xl border border-white/5 bg-surface-900/70 p-1"
    >
      <span className="hidden sm:inline-flex items-center pl-1 pr-1 text-slate-500" aria-hidden="true">
        <PaletteIcon className="w-3.5 h-3.5" />
      </span>
      {VALID_THEMES.map((id) => {
        const active = id === theme;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => change(id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium tracking-wide cursor-pointer ${
              active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}
