import { useEffect, useState } from "react";
import { Trophy, RefreshCw } from "lucide-react";
import { fetchPriceHistory } from "../services/priceHistory";
import { computeBenchmarkStats } from "../utils/benchmarkStats";
import { formatRatio, formatPct } from "../utils/returnsFormatters";
import SeriesProvenanceNote from "./SeriesProvenanceNote";

const HISTORY_DAYS = 1825;
const BENCHMARKS = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "Nasdaq 100" },
  { symbol: "DIA", label: "Dow Jones" },
];

export default function BenchmarkRatiosPanel({ snapshots = [], transactions = [] }) {
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
        setState({ symbol, status: "ready", points: payload.points, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === "AbortError") return;
        setState({ symbol, status: "error", points: [], error: error.message });
      });
    return () => controller.abort();
  }, [symbol]);

  const label = BENCHMARKS.find((b) => b.symbol === symbol)?.label ?? symbol;
  const stats = state.status === "ready" ? computeBenchmarkStats(snapshots, transactions, state.points) : { hasData: false };

  const metrics = stats.hasData
    ? [
        { label: "Alpha (Jensen)", value: stats.alphaAnnualizedPct === null ? null : formatPct(stats.alphaAnnualizedPct), hint: "annualisé" },
        { label: "Tracking error", value: stats.trackingErrorPct === null ? null : formatPct(stats.trackingErrorPct, { signed: false }), hint: "annualisé" },
        { label: "Information ratio", value: stats.informationRatio === null ? null : formatRatio(stats.informationRatio), hint: "actif / TE" },
        { label: "Treynor", value: stats.treynor === null ? null : formatRatio(stats.treynor), hint: "excès / beta" },
        { label: "Up capture", value: stats.upCapturePct === null ? null : formatPct(stats.upCapturePct, { signed: false }), hint: "hausses bench." },
        { label: "Down capture", value: stats.downCapturePct === null ? null : formatPct(stats.downCapturePct, { signed: false }), hint: "baisses bench." },
      ]
    : [];

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="Ratios étendus vs benchmark">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Ratios vs benchmark</span>
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
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" /> Chargement
        </div>
      )}
      {state.status === "error" && <div className="text-sm text-amber-400">Benchmark indisponible — {state.error}</div>}
      {state.status === "ready" && !stats.hasData && (
        <div className="text-sm text-slate-400">Série insuffisante pour les ratios vs {label} (≥ 2 périodes communes requises).</div>
      )}

      {state.status === "ready" && stats.hasData && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-lg bg-surface-900 border border-white/5 p-2">
                <div className="text-[11px] text-slate-500">{m.label}</div>
                <div className={`text-base font-bold ${m.value === null ? "text-slate-500" : "text-white"}`}>{m.value ?? "n/d"}</div>
                <div className="text-[10px] text-slate-600">{m.hint}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            Vs {label} sur {stats.pairs} périodes communes ({stats.days} j), taux sans risque supposé {stats.riskFreePct} % (hypothèse). Estimation annualisée — pas un conseil.
          </div>
          <SeriesProvenanceNote snapshots={snapshots} />
        </>
      )}
    </div>
  );
}
