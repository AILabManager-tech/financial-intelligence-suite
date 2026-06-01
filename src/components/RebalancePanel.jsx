import { Scale3d } from "lucide-react";
import { computeRebalance } from "../utils/rebalanceEngine";
import { formatCurrency } from "../utils/scoreTranslator";
import { formatPct } from "../utils/returnsFormatters";

const ACTION_LABEL = { buy: "Acheter", sell: "Vendre", hold: "Garder" };
const ACTION_TONE = { buy: "text-emerald-400", sell: "text-rose-400", hold: "text-slate-500" };

export default function RebalancePanel({ assets = [] }) {
  const plan = computeRebalance(assets, { thresholdPct: 1 });

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="Rééquilibrage vers les cibles">
      <div className="flex items-center gap-2 mb-3">
        <Scale3d className="w-4 h-4 text-blue-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-white">Rééquilibrage</span>
      </div>

      {!plan.hasData && (
        <div className="text-sm text-slate-400">
          Définis un poids cible (champ « Cible % ») sur au moins une position pour calculer un plan de rééquilibrage.
        </div>
      )}

      {plan.hasData && (
        <>
          {plan.actionableCount === 0 ? (
            <div className="text-sm text-emerald-400 mb-2">Aligné sur les cibles (dérives sous le seuil de {plan.thresholdPct} %).</div>
          ) : (
            <div className="text-xs text-slate-400 mb-2">
              Acheter {formatCurrency(plan.totalToBuy)} · Vendre {formatCurrency(plan.totalToSell)} ({plan.actionableCount} ordre{plan.actionableCount > 1 ? "s" : ""})
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-left">
                  <th className="font-medium py-1">Titre</th>
                  <th className="font-medium py-1">Actuel</th>
                  <th className="font-medium py-1">Cible</th>
                  <th className="font-medium py-1">Dérive</th>
                  <th className="font-medium py-1">Action</th>
                </tr>
              </thead>
              <tbody>
                {plan.rows.map((r) => (
                  <tr key={r.symbol} className="border-t border-white/5">
                    <td className="py-1.5 text-slate-200">{r.symbol}</td>
                    <td className="py-1.5 text-slate-400">{formatPct(r.currentPct, { signed: false })}</td>
                    <td className="py-1.5 text-slate-400">{r.targetPct} %</td>
                    <td className={`py-1.5 ${r.driftPct >= 0 ? "text-amber-300" : "text-sky-300"}`}>{formatPct(r.driftPct)}</td>
                    <td className={`py-1.5 font-semibold ${ACTION_TONE[r.action]}`}>
                      {ACTION_LABEL[r.action]}{r.action !== "hold" ? ` ${formatCurrency(r.amount)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            Ordres suggérés pour rejoindre les cibles (seuil {plan.thresholdPct} % pour limiter les frais).
            {plan.targetSumPct !== 100 ? ` Somme des cibles ${plan.targetSumPct} % (écart = cash implicite).` : ""}
            {" "}Hypothèse à partir de données factuelles, pas un conseil.
          </div>
        </>
      )}
    </div>
  );
}
