import { Gauge } from "lucide-react";
import { computePortfolioRatios } from "../utils/portfolioRatios";
import { formatRatio, formatPct } from "../utils/returnsFormatters";

function ratioTone(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "text-slate-500";
  return value >= 0 ? "text-emerald-400" : "text-rose-400";
}

export default function PortfolioRatiosPanel({ snapshots = [], transactions = [] }) {
  const ratios = computePortfolioRatios(snapshots, transactions);

  const cards = [
    { key: "sharpe", label: "Sharpe", value: ratios.sharpe, hint: "excès / volatilité" },
    { key: "sortino", label: "Sortino", value: ratios.sortino, hint: "excès / baisse" },
    { key: "calmar", label: "Calmar", value: ratios.calmar, hint: "rendt annualisé / repli" },
  ];

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="Ratios de risque ajusté (Sharpe, Sortino, Calmar)">
      <div className="flex items-center gap-2 mb-3">
        <Gauge className="w-4 h-4 text-blue-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-white">Ratios de risque ajusté</span>
      </div>

      {!ratios.hasData && (
        <div className="text-sm text-slate-400">
          Série de valeur insuffisante. Les ratios s'affichent dès qu'au moins deux rendements journaliers sont accumulés.
        </div>
      )}

      {ratios.hasData && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {cards.map((card) => (
              <div key={card.key} className="rounded-lg bg-surface-900 border border-white/5 p-2">
                <div className="text-[11px] text-slate-500">{card.label}</div>
                {card.value === null ? (
                  <div className="text-sm text-slate-500 mt-1">
                    —<span className="block text-[10px]">{card.key === "calmar" ? "série < 1 an" : "n/d"}</span>
                  </div>
                ) : (
                  <div className={`text-xl font-bold ${ratioTone(card.value)}`}>{formatRatio(card.value)}</div>
                )}
                <div className="text-[10px] text-slate-600">{card.hint}</div>
              </div>
            ))}
          </div>

          {ratios.annualizedReturnPct !== null && (
            <div className="mt-3 text-xs text-slate-400">
              Rendement annualisé : <span className="text-slate-200">{formatPct(ratios.annualizedReturnPct)}</span>
            </div>
          )}

          <div className="mt-3 text-[11px] text-slate-500">
            Sur {ratios.observations} rendements ({ratios.days} j), apports/retraits neutralisés, taux sans risque supposé {ratios.riskFreePct} % (hypothèse). Estimation annualisée sur la série accumulée — pas un conseil.
          </div>
        </>
      )}
    </div>
  );
}
