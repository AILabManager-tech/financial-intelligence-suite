import { useEffect, useState } from "react";
import { Scale, RefreshCw } from "lucide-react";
import { fetchPriceHistory } from "../services/priceHistory";
import { computeBenchmarkComparison } from "../utils/benchmarkComparison";
import { formatPct, returnTone } from "../utils/returnsFormatters";
import SeriesProvenanceNote from "./SeriesProvenanceNote";
import BenchmarkSourceNote from "./BenchmarkSourceNote";

const HISTORY_DAYS = 1825;

// Indices de référence courants couverts par la source de prix (US).
const BENCHMARKS = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "Nasdaq 100" },
  { symbol: "DIA", label: "Dow Jones" },
];

export default function BenchmarkPanel({ snapshots = [], transactions = [] }) {
  const [symbol, setSymbol] = useState(BENCHMARKS[0].symbol);
  const [state, setState] = useState({ symbol, status: "loading", points: [], error: null });

  if (state.symbol !== symbol) {
    setState({ symbol, status: "loading", points: [], error: null });
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchPriceHistory(symbol, { days: HISTORY_DAYS })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setState({ symbol, status: "ready", points: payload.points, source: payload.source, fetchedAt: payload.fetchedAt, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === "AbortError") return;
        setState({ symbol, status: "error", points: [], error: error.message });
      });
    return () => controller.abort();
  }, [symbol]);

  const label = BENCHMARKS.find((b) => b.symbol === symbol)?.label ?? symbol;
  const comparison =
    state.status === "ready"
      ? computeBenchmarkComparison(snapshots, transactions, state.points, { benchmarkLabel: label })
      : { hasData: false };

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="Comparaison au benchmark">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Comparaison au benchmark</span>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg bg-surface-900/70 border border-white/5 p-1">
          {BENCHMARKS.map((b) => (
            <button
              key={b.symbol}
              type="button"
              onClick={() => setSymbol(b.symbol)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                b.symbol === symbol ? "bg-violet-500/20 text-violet-200" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
              aria-pressed={b.symbol === symbol}
            >
              {b.symbol}
            </button>
          ))}
        </div>
      </div>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 min-h-[80px]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" /> Chargement du benchmark
        </div>
      )}

      {state.status === "error" && (
        <div className="text-sm text-amber-400">
          Benchmark indisponible — {state.error}
          <div className="text-xs text-slate-500 mt-1">Aucune comparaison affichée pour éviter une donnée non vérifiée.</div>
        </div>
      )}

      {state.status === "ready" && !comparison.hasData && (
        <div className="text-sm text-slate-400">
          Série de valeur du portefeuille insuffisante pour comparer au benchmark.
        </div>
      )}

      {state.status === "ready" && comparison.hasData && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] text-slate-500">Portefeuille (TWR)</div>
              <div className={`text-lg font-bold ${returnTone(comparison.portfolioReturnPct)}`}>{formatPct(comparison.portfolioReturnPct)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">{label}</div>
              {comparison.benchmarkReturnPct === null ? (
                <div className="text-sm text-slate-500 mt-1">n/d</div>
              ) : (
                <div className={`text-lg font-bold ${returnTone(comparison.benchmarkReturnPct)}`}>{formatPct(comparison.benchmarkReturnPct)}</div>
              )}
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Excès</div>
              {comparison.excessPct === null ? (
                <div className="text-sm text-slate-500 mt-1">n/d</div>
              ) : (
                <div className={`text-lg font-bold ${returnTone(comparison.excessPct)}`}>{formatPct(comparison.excessPct)}</div>
              )}
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            Portefeuille (TWR, flux neutralisés) vs prix du {label} sur la même fenêtre ({comparison.days} j). Rendement de prix, hors dividendes réinvestis — pas un conseil.
          </div>
          <SeriesProvenanceNote snapshots={snapshots} />
          <BenchmarkSourceNote label={label} source={state.source} points={state.points} fetchedAt={state.fetchedAt} />
        </>
      )}
    </div>
  );
}
