import { useState } from "react";
import { Eye, EyeOff, RotateCcw, Columns2, Square, GripVertical, ArrowUp, ArrowDown, LayoutTemplate } from "lucide-react";
import { getFeatureById } from "../core/featureRegistry";
import { useLayout, useLayoutControls } from "../core/layoutContext";
import { BUILTIN_PROFILES, buildLayoutFromProfile } from "../core/layoutProfiles";

// Editing UI for the layout (P0.4b + P0.4c). Per surface, lists the features in
// their current layout order with: a visibility toggle, a 1/2-column selector,
// and reordering via native HTML5 drag-and-drop plus keyboard-accessible
// up/down buttons (both call the same move()). A global reset restores defaults.
// Changes are live (reactive layout context). Uses only the frozen FIS palette.

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

function FeatureRow({ surface, entry, index, count, controls, dragHandlers, isDragging }) {
  const feature = getFeatureById(entry.id);
  if (!feature) return null;
  const categoryLabel = CATEGORY_LABELS[feature.category] ?? feature.category;
  const { setVisibility, setColumns, move } = controls;

  return (
    <div
      data-testid={`row-${entry.id}`}
      draggable
      onDragStart={() => dragHandlers.onDragStart(index)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => dragHandlers.onDrop(index)}
      onDragEnd={dragHandlers.onDragEnd}
      className={`flex items-center gap-3 p-3 rounded-xl bg-surface-800 border border-white/5 ${isDragging ? "opacity-50" : ""}`}
    >
      <GripVertical className="w-4 h-4 text-slate-600 cursor-grab flex-shrink-0" aria-hidden="true" />

      {/* Keyboard-accessible reorder */}
      <div className="flex flex-col" role="group" aria-label={`Réordonner ${feature.label}`}>
        <button
          type="button"
          onClick={() => move(surface, index, index - 1)}
          disabled={index === 0}
          aria-label={`Monter ${feature.label}`}
          className="p-0.5 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ArrowUp className="w-3 h-3" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => move(surface, index, index + 1)}
          disabled={index === count - 1}
          aria-label={`Descendre ${feature.label}`}
          className="p-0.5 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ArrowDown className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>

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

function SurfaceList({ surface, entries, controls }) {
  const [draggedIndex, setDraggedIndex] = useState(null);

  const dragHandlers = {
    onDragStart: (index) => setDraggedIndex(index),
    onDragEnd: () => setDraggedIndex(null),
    onDrop: (targetIndex) => {
      if (draggedIndex !== null && draggedIndex !== targetIndex) {
        controls.move(surface, draggedIndex, targetIndex);
      }
      setDraggedIndex(null);
    },
  };

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <FeatureRow
          key={entry.id}
          surface={surface}
          entry={entry}
          index={index}
          count={entries.length}
          controls={controls}
          dragHandlers={dragHandlers}
          isDragging={draggedIndex === index}
        />
      ))}
    </div>
  );
}

function ProfilePicker({ onApply }) {
  return (
    <section aria-label="Profils d'agencement" className="p-4 rounded-2xl bg-surface-900 border border-white/5 space-y-3">
      <div className="flex items-center gap-2">
        <LayoutTemplate className="w-4 h-4 text-violet-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-white">Profils</h3>
      </div>
      <p className="text-[11px] text-slate-500">
        Applique un agencement préconfiguré en un clic, puis ajuste-le librement ci-dessous.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {BUILTIN_PROFILES.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => onApply(buildLayoutFromProfile(profile))}
            aria-label={`Appliquer le profil ${profile.label}`}
            className="text-left p-3 rounded-xl bg-surface-800 border border-white/5 hover:border-violet-500/40 cursor-pointer"
          >
            <div className="text-sm font-semibold text-white">{profile.label}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{profile.description}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const layout = useLayout();
  const controls = useLayoutControls();

  return (
    <div className="animate-slide-up space-y-6" role="region" aria-label="Paramètres d'agencement">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Agencement</h2>
          <p className="text-sm text-slate-400 mt-1">
            Choisis les panneaux à afficher, leur ordre (glisser-déposer ou flèches) et leur largeur. Tes réglages sont conservés sur cet appareil.
          </p>
        </div>
        <button
          type="button"
          onClick={controls.reset}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800 text-slate-300 hover:text-white border border-white/5 text-xs font-semibold cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Réinitialiser
        </button>
      </div>

      <ProfilePicker onApply={controls.apply} />

      {SURFACES.map((surface) => (
        <section key={surface.key} aria-label={`Paramètres — ${surface.label}`} className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">{surface.label}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{surface.hint}</p>
          </div>
          <SurfaceList surface={surface.key} entries={layout[surface.key] ?? []} controls={controls} />
        </section>
      ))}
    </div>
  );
}
