import { Eye, EyeOff, RotateCcw, Columns2, Square } from "lucide-react";
import { getFeatureById } from "../core/featureRegistry";
import { useLayout, useLayoutControls } from "../core/layoutContext";

// Editing UI for the layout (P0.4b). Per surface, lists the features in their
// current layout order with a visibility toggle and a 1/2-column selector, plus
// a global reset. Reordering by drag-and-drop lands in P0.4c. Changes are live:
// the layout context is reactive, so the dashboard / asset card reflect edits
// as soon as the user navigates back. Uses only the frozen FIS palette
// (surface-*, white/slate text, violet/emerald accents) — no new colours.

const SURFACES = [
  { key: "dashboard", label: "Tableau de bord", hint: "Panneaux du tableau de bord (hors recherche et grille des actifs, qui sont fixes)." },
  { key: "asset", label: "Fiche actif", hint: "Panneaux empilés sous une fiche d'actif sélectionnée." },
];

const CATEGORY_LABELS = {
  overview: "Vue d'ensemble",
  monitoring: "Surveillance",
  portfolio: "Portefeuille",
  fundamentals: "Fondamentaux",
  sentiment: "Sentiment",
  calendar: "Calendrier",
  documents: "Documents",
  comparison: "Comparaison",
};

function FeatureRow({ surface, entry, setVisibility, setColumns }) {
  const feature = getFeatureById(entry.id);
  if (!feature) return null;
  const categoryLabel = CATEGORY_LABELS[feature.category] ?? feature.category;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-800 border border-white/5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white truncate">{feature.label}</div>
        <div className="text-[11px] text-slate-500">{categoryLabel}</div>
      </div>

      {/* Column span selector (1 / 2) */}
      <div className="inline-flex items-center rounded-lg bg-surface-900 border border-white/5 p-0.5" role="group" aria-label={`Colonnage de ${feature.label}`}>
        {[1, 2].map((cols) => {
          const Icon = cols === 1 ? Square : Columns2;
          const active = entry.columns === cols;
          return (
            <button
              key={cols}
              type="button"
              onClick={() => setColumns(surface, entry.id, cols)}
              aria-pressed={active}
              aria-label={`${cols} colonne${cols > 1 ? "s" : ""}`}
              disabled={!entry.visible}
              className={`p-1.5 rounded-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${active ? "bg-violet-500/20 text-violet-200" : "text-slate-400 hover:text-white"}`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {/* Visibility toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={entry.visible}
        aria-label={`Afficher ${feature.label}`}
        onClick={() => setVisibility(surface, entry.id, !entry.visible)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${entry.visible ? "bg-emerald-500/15 text-emerald-300" : "bg-surface-900 text-slate-400 hover:text-white"}`}
      >
        {entry.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        {entry.visible ? "Visible" : "Masqué"}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const layout = useLayout();
  const { setVisibility, setColumns, reset } = useLayoutControls();

  return (
    <div className="animate-slide-up space-y-6" role="region" aria-label="Paramètres d'agencement">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Agencement</h2>
          <p className="text-sm text-slate-400 mt-1">
            Choisis les panneaux à afficher et leur largeur. Tes réglages sont conservés sur cet appareil.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800 text-slate-300 hover:text-white border border-white/5 text-xs font-semibold cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Réinitialiser
        </button>
      </div>

      {SURFACES.map((surface) => (
        <section key={surface.key} aria-label={`Paramètres — ${surface.label}`} className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">{surface.label}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{surface.hint}</p>
          </div>
          <div className="space-y-2">
            {(layout[surface.key] ?? []).map((entry) => (
              <FeatureRow
                key={entry.id}
                surface={surface.key}
                entry={entry}
                setVisibility={setVisibility}
                setColumns={setColumns}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
