import { ShieldAlert } from "lucide-react";
import { computeValueAtRisk } from "../utils/valueAtRisk";
import { formatPct } from "../utils/returnsFormatters";

function lossPct(value) {
  // VaR/CVaR sont des pertes : affichées en négatif (perte) ou tiret si null.
  if (value === null || !Number.isFinite(value)) return null;
  return formatPct(-value); // value est positif (perte) → afficher comme rendement négatif
}

export default function ValueAtRiskPanel({ snapshots = [], transactions = [] }) {
  const var_ = computeValueAtRisk(snapshots, transactions);

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="Valeur à risque (VaR / CVaR)">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="w-4 h-4 text-blue-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-white">Valeur à risque (VaR)</span>
      </div>

      {!var_.hasData && (
        <div className="text-sm text-slate-400">
          Série de valeur insuffisante. La VaR s'affiche dès qu'au moins deux rendements sont accumulés.
        </div>
      )}

      {var_.hasData && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-left">
                  <th className="font-medium py-1">Niveau</th>
                  <th className="font-medium py-1">VaR paramétrique</th>
                  <th className="font-medium py-1">VaR historique</th>
                  <th className="font-medium py-1">CVaR</th>
                </tr>
              </thead>
              <tbody>
                {var_.levels.map((lvl) => (
                  <tr key={lvl.confidence} className="border-t border-white/5">
                    <td className="py-1.5 text-slate-300">{Math.round(lvl.confidence * 100)} %</td>
                    <td className="py-1.5 font-semibold text-rose-300">{lossPct(lvl.varParametricPct) ?? "n/d"}</td>
                    <td className="py-1.5 font-semibold text-rose-300">{lossPct(lvl.varHistoricalPct) ?? "n/d"}</td>
                    <td className="py-1.5 font-semibold text-rose-300">{lossPct(lvl.cvarHistoricalPct) ?? "n/d"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            Perte attendue dépassée avec probabilité 1−niveau, par période de la série ({var_.observations} obs).
            {!var_.historicalAvailable && " VaR historique masquée (< 10 observations)."}
            {" "}Paramétrique = μ − z·σ (gaussienne). Estimation sur la série accumulée, pas un conseil.
          </div>
        </>
      )}
    </div>
  );
}
