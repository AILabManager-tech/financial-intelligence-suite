import { Coins } from "lucide-react";
import { computeMoneyWeightedReturn } from "../utils/moneyWeightedReturn";
import { formatPct, returnTone } from "../utils/returnsFormatters";
import SeriesProvenanceNote from "./SeriesProvenanceNote";

export default function PortfolioMwrPanel({ snapshots = [], transactions = [] }) {
  const mwr = computeMoneyWeightedReturn(snapshots, transactions);

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="Rendement pondéré par l'argent (MWR / IRR)">
      <div className="flex items-center gap-2 mb-3">
        <Coins className="w-4 h-4 text-blue-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-white">Rendement pondéré-argent (MWR)</span>
      </div>

      {!mwr.hasData && (
        <div className="text-sm text-slate-400">
          Série de valeur du portefeuille insuffisante. Le MWR s'affiche dès qu'au moins deux jours sont accumulés.
        </div>
      )}

      {mwr.hasData && !mwr.converged && (
        <div className="text-sm text-amber-400">
          IRR non calculable sur la série actuelle (pas de convergence). Aucune valeur n'est affichée pour ne pas présenter un chiffre non fiable.
        </div>
      )}

      {mwr.hasData && mwr.converged && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-slate-500">MWR de période</div>
              <div className={`text-2xl font-bold ${returnTone(mwr.periodMwrPct)}`}>{formatPct(mwr.periodMwrPct)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">IRR annualisé</div>
              {mwr.annualizedIrrPct === null ? (
                <div className="text-sm text-slate-500 mt-1">
                  —<span className="block text-[11px]">série &lt; 1 an</span>
                </div>
              ) : (
                <div className={`text-2xl font-bold ${returnTone(mwr.annualizedIrrPct)}`}>{formatPct(mwr.annualizedIrrPct)}</div>
              )}
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            Pondéré par l'argent : capture l'effet du <span className="text-slate-300">timing des apports/retraits</span> ({mwr.flowsCount} flux sur {mwr.days} j), à comparer au TWR (effet du gérant, flux neutralisés). Rendement passé sur données réelles — pas un conseil.
          </div>
          <SeriesProvenanceNote snapshots={snapshots} />
        </>
      )}
    </div>
  );
}
