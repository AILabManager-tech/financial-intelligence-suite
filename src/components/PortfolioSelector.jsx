import { useState } from "react";
import { Briefcase, ChevronDown, Plus, Trash2, Check } from "lucide-react";

// Header mandate selector (P3.2): switch the active portfolio and manage mandates
// (create / rename / delete). Pure presentational — all state lives in App via
// the portfolioListStore. Frozen FIS palette only.
export default function PortfolioSelector({ state, onSwitch, onCreate, onRename, onDelete }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const active = state.portfolios.find((p) => p.id === state.activeId) ?? state.portfolios[0];

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
        aria-label="Sélecteur de mandat"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-surface-900/70 text-xs font-medium text-white hover:bg-white/5 cursor-pointer"
      >
        <Briefcase className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
        <span className="max-w-[140px] truncate">{active?.name ?? "Mandat"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 z-50 p-2 rounded-xl bg-surface-900 border border-white/10 shadow-2xl shadow-black/40 space-y-1" role="menu" aria-label="Mandats">
          {state.portfolios.map((p) => (
            <div key={p.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { onSwitch(p.id); setOpen(false); }}
                aria-label={`Activer le mandat ${p.name}`}
                className={`flex-1 flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-sm cursor-pointer ${p.id === state.activeId ? "bg-violet-500/15 text-violet-200" : "text-slate-300 hover:bg-white/5"}`}
              >
                {p.id === state.activeId ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <span className="w-3.5" />}
                <span className="flex-1 truncate">{p.name}</span>
                {p.client ? <span className="text-[10px] text-slate-500 truncate max-w-[70px]">{p.client}</span> : null}
              </button>
              {state.portfolios.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDelete(p.id)}
                  aria-label={`Supprimer le mandat ${p.name}`}
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
                aria-label="Renommer le mandat actif"
                className="mt-1 w-full px-2 py-1 rounded-lg bg-surface-800 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
              />
            </label>
            <div className="flex items-center gap-1 px-2 pt-2 pb-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nouveau mandat…"
                aria-label="Nom du nouveau mandat"
                className="flex-1 px-2 py-1 rounded-lg bg-surface-800 border border-white/5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
              />
              <button
                type="button"
                onClick={create}
                disabled={!newName.trim()}
                aria-label="Créer le mandat"
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
