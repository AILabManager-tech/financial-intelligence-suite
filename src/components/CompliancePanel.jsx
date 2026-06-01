import { useState } from "react";
import { ShieldCheck, ShieldX, Save } from "lucide-react";
import { checkCompliance } from "../utils/complianceChecker";
import { loadComplianceRules, saveComplianceRules } from "../services/complianceStore";
import { formatPct } from "../utils/returnsFormatters";

export default function CompliancePanel({ assets = [], portfolioId = "default" }) {
  const [loadedFor, setLoadedFor] = useState(portfolioId);
  const [draft, setDraft] = useState(() => {
    const r = loadComplianceRules(portfolioId);
    return {
      maxPositionPct: r.maxPositionPct === null ? "" : String(r.maxPositionPct),
      maxSectorPct: r.maxSectorPct === null ? "" : String(r.maxSectorPct),
      excludedSymbols: r.excludedSymbols.join(", "),
    };
  });

  // Recharge les règles au changement de mandat (garde de rendu, pas d'effet).
  if (loadedFor !== portfolioId) {
    const r = loadComplianceRules(portfolioId);
    setLoadedFor(portfolioId);
    setDraft({
      maxPositionPct: r.maxPositionPct === null ? "" : String(r.maxPositionPct),
      maxSectorPct: r.maxSectorPct === null ? "" : String(r.maxSectorPct),
      excludedSymbols: r.excludedSymbols.join(", "),
    });
  }

  const rules = {
    maxPositionPct: draft.maxPositionPct === "" ? null : Number(draft.maxPositionPct),
    maxSectorPct: draft.maxSectorPct === "" ? null : Number(draft.maxSectorPct),
    excludedSymbols: draft.excludedSymbols.split(",").map((s) => s.trim()).filter(Boolean),
  };
  const result = checkCompliance(assets, rules);

  const save = () => saveComplianceRules(portfolioId, rules);

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="Conformité du portefeuille">
      <div className="flex items-center gap-2 mb-3">
        {result.hasData && result.compliant ? (
          <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
        ) : (
          <ShieldX className="w-4 h-4 text-amber-400" aria-hidden="true" />
        )}
        <span className="text-sm font-semibold text-white">Conformité du mandat</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <label className="block">
          <span className="text-[11px] text-slate-500">Max / titre (%)</span>
          <input
            type="number" min="0" step="1" value={draft.maxPositionPct}
            onChange={(e) => setDraft((d) => ({ ...d, maxPositionPct: e.target.value }))}
            className="mt-1 w-full px-2 py-1.5 rounded-lg bg-surface-900 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-500">Max / secteur (%)</span>
          <input
            type="number" min="0" step="1" value={draft.maxSectorPct}
            onChange={(e) => setDraft((d) => ({ ...d, maxSectorPct: e.target.value }))}
            className="mt-1 w-full px-2 py-1.5 rounded-lg bg-surface-900 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-500">Exclusions</span>
          <input
            type="text" placeholder="XOM, BTI" value={draft.excludedSymbols}
            onChange={(e) => setDraft((d) => ({ ...d, excludedSymbols: e.target.value }))}
            className="mt-1 w-full px-2 py-1.5 rounded-lg bg-surface-900 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
          />
        </label>
      </div>
      <button
        type="button" onClick={save}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 text-xs font-semibold cursor-pointer mb-3"
      >
        <Save className="w-3.5 h-3.5" /> Enregistrer les règles
      </button>

      {!result.hasData && <div className="text-sm text-slate-400">Aucune position valorisée à contrôler.</div>}

      {result.hasData && result.compliant && (
        <div className="text-sm text-emerald-400">Conforme — aucune règle dépassée.</div>
      )}

      {result.hasData && !result.compliant && (
        <ul className="space-y-1.5">
          {result.violations.map((v, i) => (
            <li key={`${v.type}-${v.symbol ?? v.sector}-${i}`} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-amber-300">{v.label}</span>
              <span className="text-[11px] text-slate-400">
                {formatPct(v.actualPct, { signed: false })}
                {v.limitPct !== null ? ` / max ${v.limitPct} %` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 text-[11px] text-slate-500">
        Contrôle indicatif sur les positions détenues (pondéré valeur de marché). Règles par mandat — pas un conseil.
      </div>
    </div>
  );
}
