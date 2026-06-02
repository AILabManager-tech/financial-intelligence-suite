import { useEffect, useMemo, useState } from "react";
import { FileText, Printer, Plus, Trash2 } from "lucide-react";
import { buildMandateReport } from "../utils/mandateReport";
import { computeBenchmarkComparison } from "../utils/benchmarkComparison";
import { fetchPriceHistory } from "../services/priceHistory";
import { formatPct, returnTone } from "../utils/returnsFormatters";

const BENCHMARK = { symbol: "SPY", label: "S&P 500" };
const HISTORY_DAYS = 1825;

function money(value, currency = "USD") {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function pnlTone(value) {
  if (!Number.isFinite(value) || value === 0) return "text-slate-300";
  return value > 0 ? "text-emerald-400" : "text-rose-400";
}

function Section({ title, children }) {
  return (
    <section className="p-4 rounded-xl bg-surface-800 border border-white/5 break-inside-avoid">
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      {children}
    </section>
  );
}

export default function MandateReportView({ mandate = {}, assets = [], snapshots = [], transactions = [], commentary = [], onAddComment, onRemoveComment }) {
  const asOf = useMemo(() => new Date().toISOString(), []);
  const report = useMemo(
    () => buildMandateReport({ mandate, assets, snapshots, transactions, asOf }),
    [mandate, assets, snapshots, transactions, asOf],
  );
  const { summary, positions, twr, realized } = report;
  const ccy = summary.baseCurrency;

  const [bench, setBench] = useState({ status: "loading", comparison: { hasData: false } });
  useEffect(() => {
    const controller = new AbortController();
    fetchPriceHistory(BENCHMARK.symbol, { days: HISTORY_DAYS })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setBench({
          status: "ready",
          comparison: computeBenchmarkComparison(snapshots, transactions, payload.points, { benchmarkLabel: BENCHMARK.label }),
        });
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === "AbortError") return;
        setBench({ status: "error", comparison: { hasData: false } });
      });
    return () => controller.abort();
  }, [snapshots, transactions]);

  const asOfLabel = new Date(asOf).toLocaleDateString("fr-CA", { dateStyle: "long" });
  const comparison = bench.comparison;

  const [draft, setDraft] = useState({ date: asOf.slice(0, 10), text: "" });
  const submitComment = () => {
    if (!draft.text.trim()) return;
    onAddComment?.({ date: draft.date, text: draft.text });
    setDraft((d) => ({ date: d.date, text: "" }));
  };

  return (
    <div className="space-y-5 animate-slide-up" role="region" aria-label="Rapport de mandat">
      {/* Toolbar — masquée à l'impression */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-400" aria-hidden="true" />
          <span className="text-sm text-slate-400">Aperçu — utilise « Enregistrer en PDF » dans la boîte d'impression</span>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 text-xs font-semibold cursor-pointer"
          aria-label="Imprimer ou enregistrer le rapport en PDF"
        >
          <Printer className="w-3.5 h-3.5" aria-hidden="true" />
          Imprimer / PDF
        </button>
      </div>

      {/* En-tête du rapport */}
      <div className="p-4 rounded-xl bg-surface-900 border border-white/5">
        <h1 className="text-xl font-bold text-white">Rapport de mandat — {summary.mandateName}</h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          {summary.client && <span>Client : {summary.client}</span>}
          {summary.accountTypeLabel && <span>Compte : {summary.accountTypeLabel}</span>}
          <span>Devise de référence : {ccy}</span>
          <span>Au {asOfLabel}</span>
        </div>
      </div>

      <Section title="Sommaire">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <div className="text-[11px] text-slate-500">Valeur de marché</div>
            <div className="text-lg font-bold text-white">{money(summary.totalMarketValue, ccy)}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Coût total</div>
            <div className="text-lg font-bold text-white">{money(summary.totalCost, ccy)}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">P&amp;L latent</div>
            <div className={`text-lg font-bold ${pnlTone(summary.unrealizedPnl)}`}>
              {money(summary.unrealizedPnl, ccy)}
              {summary.unrealizedPnlPct != null ? ` (${formatPct(summary.unrealizedPnlPct)})` : ""}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Positions</div>
            <div className="text-lg font-bold text-white">{summary.positionsCount}</div>
          </div>
        </div>
      </Section>

      <Section title="Performance">
        {twr.hasData ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] text-slate-500">Rendement pondéré-temps (cumulé)</div>
              <div className={`text-lg font-bold ${returnTone(twr.twrPct)}`}>{formatPct(twr.twrPct)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Annualisé</div>
              <div className="text-lg font-bold text-white">{twr.annualizedPct != null ? formatPct(twr.annualizedPct) : "— (série < 1 an)"}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">
                vs {BENCHMARK.label} (excès)
              </div>
              <div className={`text-lg font-bold ${comparison.hasData && comparison.excessPct != null ? returnTone(comparison.excessPct) : "text-slate-500"}`}>
                {bench.status === "loading"
                  ? "…"
                  : comparison.hasData && comparison.excessPct != null
                    ? formatPct(comparison.excessPct)
                    : "—"}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Série de valorisations insuffisante pour un rendement pondéré-temps (les snapshots quotidiens s'accumulent dans le temps).
          </p>
        )}
        <p className="text-[11px] text-slate-500 mt-3">
          Rendement pondéré-temps, flux de capital neutralisés. Comparaison au {BENCHMARK.label} sur la même fenêtre (rendement de prix, hors dividendes réinvestis), masquée si la série ne couvre pas la période.
        </p>
      </Section>

      <Section title="Positions détenues">
        {positions.length === 0 ? (
          <p className="text-xs text-slate-500">Aucune position détenue.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-surface-900/60">
                  <th className="px-3 py-2">Titre</th>
                  <th className="px-3 py-2 text-right">Qté</th>
                  <th className="px-3 py-2 text-right">Coût moyen</th>
                  <th className="px-3 py-2 text-right">Prix</th>
                  <th className="px-3 py-2 text-right">Valeur</th>
                  <th className="px-3 py-2 text-right">Poids</th>
                  <th className="px-3 py-2 text-right">P&amp;L latent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {positions.map((p) => (
                  <tr key={p.symbol}>
                    <td className="px-3 py-2">
                      <span className="font-semibold text-white">{p.symbol}</span>
                      <span className="block text-[11px] text-slate-500 truncate max-w-[160px]">{p.name}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">{p.quantity}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{money(p.averageCost, ccy)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{money(p.price, ccy)}</td>
                    <td className="px-3 py-2 text-right text-slate-200">{money(p.marketValue, ccy)}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{p.weight.toFixed(1)} %</td>
                    <td className={`px-3 py-2 text-right font-semibold ${pnlTone(p.unrealizedPnl)}`}>{money(p.unrealizedPnl, ccy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {realized.hasData && (
        <Section title="Gains/pertes réalisés par année">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-surface-900/60">
                <th className="px-3 py-2">Année</th>
                <th className="px-3 py-2 text-right">Produit</th>
                <th className="px-3 py-2 text-right">Coût</th>
                <th className="px-3 py-2 text-right">Net réalisé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {realized.years.map((y) => (
                <tr key={y.year}>
                  <td className="px-3 py-2 font-semibold text-white">{y.year}</td>
                  <td className="px-3 py-2 text-right text-slate-300">{money(y.proceeds)}</td>
                  <td className="px-3 py-2 text-right text-slate-300">{money(y.costBasis)}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${pnlTone(y.netGain)}`}>{money(y.netGain)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-500 mt-2">Appariement {realized.method.toUpperCase()} ; au Canada le gain officiel se calcule par PBR/ACB. Montants USD.</p>
        </Section>
      )}

      <Section title="Commentaire du gestionnaire">
        {onAddComment && (
          <div className="print:hidden mb-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                aria-label="Date du commentaire"
                className="px-2 py-1 rounded-lg bg-surface-900 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
              />
              <button
                type="button"
                onClick={submitComment}
                disabled={!draft.text.trim()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
                aria-label="Ajouter le commentaire"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Ajouter
              </button>
            </div>
            <textarea
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              placeholder="Commentaire de période (markdown accepté)…"
              rows={3}
              aria-label="Texte du commentaire"
              className="w-full px-2 py-1.5 rounded-lg bg-surface-900 border border-white/5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
            />
          </div>
        )}

        {commentary.length === 0 ? (
          <p className="text-xs text-slate-500">Aucun commentaire enregistré pour ce mandat.</p>
        ) : (
          <div className="space-y-3">
            {commentary.map((c) => (
              <div key={c.id} className="rounded-lg bg-surface-900/60 border border-white/5 p-3 break-inside-avoid">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {new Date(c.date).toLocaleDateString("fr-CA", { dateStyle: "long" })}
                  </span>
                  {onRemoveComment && (
                    <button
                      type="button"
                      onClick={() => onRemoveComment(c.id)}
                      className="print:hidden p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                      aria-label={`Supprimer le commentaire du ${c.date}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{c.text}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Notes">
        <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
          <li>Attribution de performance par secteur (méthode de Brinson) non incluse — bloquée sur données (composition sectorielle du benchmark non disponible en source gratuite).</li>
          <li>Commentaire du gestionnaire daté : à venir (P6.3).</li>
          <li>Données factuelles (positions × cotations réelles, transactions du journal). Pas un conseil en placement.</li>
        </ul>
      </Section>
    </div>
  );
}
