import { useState } from "react";
import { Bookmark, ChevronDown, Plus, Trash2, Check } from "lucide-react";

// Watchlist list selector (P5.4): switch the active thematic list and manage
// lists (create / rename / delete). Pure presentational — all state lives in App
// via watchlistListStore. Mirrors PortfolioSelector (mandates). Frozen FIS
// palette only.
export default function WatchlistSelector({ state, onSwitch, onCreate, onRename, onDelete }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const active = state.lists.find((l) => l.id === state.activeId) ?? state.lists[0];

  const create = () => {
    if (!newName.trim()) return;
    onCreate({ name: newName });
    setNewName("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Sélecteur de liste"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-surface-900/70 text-xs font-medium text-white hover:bg-white/5 cursor-pointer"
      >
        <Bookmark className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
        <span className="max-w-[140px] truncate">{active?.name ?? "Liste"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 z-50 p-2 rounded-xl bg-surface-900 border border-white/10 shadow-2xl shadow-black/40 space-y-1" role="menu" aria-label="Listes thématiques">
          {state.lists.map((l) => (
            <div key={l.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { onSwitch(l.id); setOpen(false); }}
                aria-label={`Activer la liste ${l.name}`}
                className={`flex-1 flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-sm cursor-pointer ${l.id === state.activeId ? "bg-violet-500/15 text-violet-200" : "text-slate-300 hover:bg-white/5"}`}
              >
                {l.id === state.activeId ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <span className="w-3.5" />}
                <span className="flex-1 truncate">{l.name}</span>
              </button>
              {state.lists.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDelete(l.id)}
                  aria-label={`Supprimer la liste ${l.name}`}
                  className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}

          <div className="pt-1 border-t border-white/5">
            <label className="block px-2 pt-1">
              <span className="text-[10px] text-slate-500">Renommer « {active?.name} »</span>
              <input
                type="text"
                value={active?.name ?? ""}
                onChange={(e) => onRename(active.id, { name: e.target.value })}
                aria-label="Renommer la liste active"
                className="mt-1 w-full px-2 py-1 rounded-lg bg-surface-800 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
              />
            </label>
            <div className="flex items-center gap-1 px-2 pt-2 pb-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nouvelle liste…"
                aria-label="Nom de la nouvelle liste"
                className="flex-1 px-2 py-1 rounded-lg bg-surface-800 border border-white/5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
              />
              <button
                type="button"
                onClick={create}
                disabled={!newName.trim()}
                aria-label="Créer la liste"
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
