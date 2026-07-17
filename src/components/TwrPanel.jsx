import { LineChart as LineChartIcon } from "lucide-react";
import { computeTimeWeightedReturn } from "../utils/timeWeightedReturn";
import { formatPct, returnTone } from "../utils/returnsFormatters";
import SeriesProvenanceNote from "./SeriesProvenanceNote";

function formatDay(day) {
  if (typeof day !== "string" || day.length < 10) return null;
  const parsed = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function TwrPanel({ snapshots = [], transactions = [] }) {
  const twr = computeTimeWeightedReturn(snapshots, transactions);

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="Rendement pondéré dans le temps (TWR)">
      <div className="flex items-center gap-2 mb-3">
        <LineChartIcon className="w-4 h-4 text-blue-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-white">Rendement pondéré-temps (TWR)</span>
      </div>

      {!twr.hasData && (
        <div className="text-sm text-slate-400">
          Série de valeur du portefeuille en cours d'accumulation (un point par jour). Le TWR s'affiche dès qu'au moins deux jours sont accumulés.
        </div>
      )}

      {twr.hasData && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-slate-500">TWR cumulé</div>
              <div className={`text-2xl font-bold ${returnTone(twr.twrPct)}`}>{formatPct(twr.twrPct)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Annualisé</div>
              {twr.annualizedPct === null ? (
                <div className="text-sm text-slate-500 mt-1">
                  —<span className="block text-[11px]">série &lt; 1 an</span>
                </div>
              ) : (
                <div className={`text-2xl font-bold ${returnTone(twr.annualizedPct)}`}>{formatPct(twr.annualizedPct)}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
            <div>
              <span className="text-slate-500">Période</span>
              <div className="text-slate-200">
                {formatDay(twr.from) ?? twr.from} → {formatDay(twr.to) ?? twr.to}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Couverture</span>
              <div className="text-slate-200">
                {twr.days} j · {twr.periods} sous-période{twr.periods > 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            Performance de marché : les apports/retraits de capital (achats/ventes) sont neutralisés (flux supposé en début de sous-période). Rendement passé sur données réelles, hors dividendes en espèces — pas un conseil.
          </div>
          <SeriesProvenanceNote snapshots={snapshots} />
        </>
      )}
    </div>
  );
}
