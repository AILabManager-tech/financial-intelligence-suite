import { Activity } from "lucide-react";
import { computePortfolioRisk } from "../utils/portfolioRisk";
import { formatPct, formatRatio } from "../utils/returnsFormatters";
import SeriesProvenanceNote from "./SeriesProvenanceNote";

function formatDay(day) {
  if (typeof day !== "string" || day.length < 10) return null;
  const parsed = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function PortfolioRiskPanel({ snapshots = [], transactions = [] }) {
  const risk = computePortfolioRisk(snapshots, transactions);

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="Risque du portefeuille (volatilité et repli)">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-blue-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-white">Risque — volatilité &amp; repli</span>
      </div>

      {!risk.hasData && (
        <div className="text-sm text-slate-400">
          Série de valeur du portefeuille insuffisante. La volatilité et le repli s'affichent dès qu'au moins deux rendements journaliers sont accumulés.
        </div>
      )}

      {risk.hasData && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-slate-500">Volatilité annualisée</div>
              <div className="text-2xl font-bold text-white">{formatPct(risk.annualizedVolPct, { signed: false })}</div>
              <div className="text-[11px] text-slate-500">σ période {formatRatio(risk.perPeriodVolPct)} %</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Repli maximal</div>
              <div className={`text-2xl font-bold ${risk.maxDrawdownPct < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {formatPct(risk.maxDrawdownPct)}
              </div>
              {risk.maxDrawdownFrom && risk.maxDrawdownTo && (
                <div className="text-[11px] text-slate-500">
                  {formatDay(risk.maxDrawdownFrom)} → {formatDay(risk.maxDrawdownTo)}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
            <div>
              <span className="text-slate-500">Repli courant</span>
              <div className={risk.atHigh ? "text-emerald-400" : "text-amber-400"}>
                {risk.atHigh ? "Au sommet" : formatPct(risk.currentDrawdownPct)}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Récupération</span>
              <div className="text-slate-200">
                {risk.maxDrawdownPct >= 0
                  ? "—"
                  : risk.recovered
                    ? `${risk.recoveryDays} j après le creux`
                    : "en cours (sous l'eau)"}
              </div>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            Sur {risk.observations} rendements ({risk.days} j accumulés), apports/retraits neutralisés. σ rééchelonnée sur la fréquence réelle des points (×√(365/jours moyens)) — estimation sur la série accumulée, pas un conseil.
          </div>
          <SeriesProvenanceNote snapshots={snapshots} />
        </>
      )}
    </div>
  );
}
