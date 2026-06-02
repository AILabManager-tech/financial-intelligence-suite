import { useMemo } from "react";
import { FileText, Download } from "lucide-react";
import { computeRealizedGainsByYear, buildRealizedGainsCsv } from "../utils/taxRealizedGains";
import { downloadTextFile } from "../services/portfolioExport";

// Annual realized gains/losses panel (P6.2). Factual fiscal snapshot derived
// from the transaction journal via the tax-lot engine — per-disposition
// proceeds / cost base / gain, bucketed by disposition year, with a flat CSV
// export (T5008/1099-B style). Honest about method (FIFO/LIFO ≠ Canadian ACB)
// and fees (per-lot gross, year total net). Not tax advice. Frozen FIS palette.

const METHOD_LABEL = { fifo: "PEPS (FIFO)", lifo: "DEPS (LIFO)" };

function money(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function gainTone(value) {
  if (!Number.isFinite(value) || value === 0) return "text-slate-300";
  return value > 0 ? "text-emerald-400" : "text-rose-400";
}

function shortDate(iso) {
  return typeof iso === "string" ? iso.slice(0, 10) : "—";
}

export default function TaxReportPanel({ transactions = [], method = "fifo" }) {
  const report = useMemo(() => computeRealizedGainsByYear(transactions, { method }), [transactions, method]);

  return (
    <div className="animate-slide-up" role="region" aria-label="Gains et pertes réalisés par année fiscale">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <FileText className="w-5 h-5 text-amber-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-white">Gains/pertes réalisés par année</h2>
        <span className="ml-auto text-xs text-slate-500">{METHOD_LABEL[method] ?? method}</span>
      </div>

      {!report.hasData ? (
        <p className="text-xs text-slate-500">
          Aucune disposition réalisée — les gains/pertes apparaîtront dès qu'une vente sera enregistrée au journal des transactions.
        </p>
      ) : (
        <>
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={() => downloadTextFile(`gains-realises-${method}.csv`, "text/csv", buildRealizedGainsCsv(report))}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800 border border-white/5 text-xs text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer"
              aria-label="Télécharger le CSV des gains réalisés"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Exporter CSV
            </button>
          </div>

          <div className="space-y-5">
            {report.years.map((y) => (
              <div key={y.year}>
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <h3 className="text-base font-semibold text-white">{y.year}</h3>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${gainTone(y.netGain)}`}>{money(y.netGain)} net</div>
                    <div className="text-[11px] text-slate-500">
                      brut {money(y.grossGain)} · frais {money(y.sellFees)} · {y.gainCount} gain{y.gainCount > 1 ? "s" : ""} / {y.lossCount} perte{y.lossCount > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-surface-800/80">
                        <th className="px-3 py-2">Titre</th>
                        <th className="px-3 py-2">Acquis</th>
                        <th className="px-3 py-2">Disposé</th>
                        <th className="px-3 py-2 text-right">Qté</th>
                        <th className="px-3 py-2 text-right">Produit</th>
                        <th className="px-3 py-2 text-right">Coût</th>
                        <th className="px-3 py-2 text-right">Gain</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {y.dispositions.map((d, i) => (
                        <tr key={`${d.symbol}-${d.exitDate}-${i}`} className="bg-surface-900/60">
                          <td className="px-3 py-2 font-semibold text-white">{d.symbol}</td>
                          <td className="px-3 py-2 text-slate-400">{shortDate(d.entryDate)}</td>
                          <td className="px-3 py-2 text-slate-400">{shortDate(d.exitDate)}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{d.quantity}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{money(d.proceeds)}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{money(d.costBasis)}</td>
                          <td className={`px-3 py-2 text-right font-semibold ${gainTone(d.gain)}`}>{money(d.gain)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 mt-4">
            Réalisé par appariement {METHOD_LABEL[method] ?? method} du journal de transactions. Gain par lot brut du frais de vente, net au total de l'année.
            Montants en USD. ⚠️ Au Canada, le gain officiel se calcule par <strong>prix de base rajusté (PBR/ACB)</strong> moyen — un T5008 peut donc différer. Pas un conseil fiscal.
          </p>
        </>
      )}
    </div>
  );
}
