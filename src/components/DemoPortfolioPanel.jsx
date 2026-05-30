import { useState } from "react";
import { Briefcase, TrendingUp, Plus, Trash2, AlertTriangle } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis, Legend } from "recharts";
import ChartErrorBoundary from "./ChartErrorBoundary";
import { fetchPriceHistory } from "../services/priceHistory";
import { simulateInvestment } from "../utils/simulationCalculator";
import { simulateDemoPortfolio, excessReturnPct } from "../utils/portfolioSimulation";
import { formatCurrency } from "../utils/scoreTranslator";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const defaultStart = () => new Date(Date.now() - 5 * 365 * MS_PER_DAY).toISOString().slice(0, 10);
const daysSince = (iso) => Math.max(1, Math.ceil((Date.now() - new Date(iso).getTime()) / MS_PER_DAY) + 5);

// Merge the portfolio curve and the benchmark curve onto the portfolio's date
// axis (forward-fill the benchmark) so Recharts can plot both lines together.
function mergeForChart(portfolioCurve, benchmarkCurve) {
  if (!benchmarkCurve) return portfolioCurve.map((p) => ({ date: p.date, portefeuille: p.value }));
  let bi = 0;
  let last = null;
  return portfolioCurve.map((p) => {
    while (bi < benchmarkCurve.length && benchmarkCurve[bi].date <= p.date) {
      last = benchmarkCurve[bi].value;
      bi += 1;
    }
    return { date: p.date, portefeuille: p.value, benchmark: last };
  });
}

// Demo what-if portfolio (P2.2b). Compose a fictional multi-position portfolio,
// project its aggregate value over time from factual prices, and compare it to a
// benchmark. A permanent banner labels it as a hypothesis, not advice.
export default function DemoPortfolioPanel() {
  const [startDate, setStartDate] = useState(defaultStart);
  const [benchmark, setBenchmark] = useState("SPY");
  const [positions, setPositions] = useState([
    { symbol: "AAPL", amount: "10000" },
    { symbol: "MSFT", amount: "10000" },
  ]);
  const [state, setState] = useState({ status: "idle" });

  const updatePos = (i, field, value) => setPositions((ps) => ps.map((p, j) => (j === i ? { ...p, [field]: value } : p)));
  const addPos = () => setPositions((ps) => [...ps, { symbol: "", amount: "5000" }]);
  const removePos = (i) => setPositions((ps) => ps.filter((_, j) => j !== i));

  const run = async () => {
    const clean = positions
      .map((p) => ({ symbol: p.symbol.trim().toUpperCase(), amount: Number(p.amount) }))
      .filter((p) => p.symbol && Number.isFinite(p.amount) && p.amount > 0);
    if (clean.length === 0) {
      setState({ status: "error", error: "Ajoute au moins une position valide (symbole + montant)." });
      return;
    }
    setState({ status: "loading" });
    try {
      const days = daysSince(startDate);
      const histories = await Promise.all(
        clean.map((p) => fetchPriceHistory(p.symbol, { days }).then((h) => h.points).catch(() => [])),
      );
      const withPoints = clean.map((p, i) => ({ ...p, points: histories[i] }));
      const portfolio = simulateDemoPortfolio(withPoints, { startDate });
      if (!portfolio) {
        setState({ status: "error", error: "Historique insuffisant pour ces positions sur cette période." });
        return;
      }
      let bench = null;
      const benchSymbol = benchmark.trim().toUpperCase();
      if (benchSymbol) {
        const bh = await fetchPriceHistory(benchSymbol, { days }).catch(() => null);
        if (bh) bench = simulateInvestment(bh.points, { amount: portfolio.totalInvested, startDate });
      }
      setState({ status: "ready", portfolio, bench, benchSymbol });
    } catch {
      setState({ status: "error", error: "Données de marché indisponibles." });
    }
  };

  const { status } = state;

  return (
    <div className="animate-slide-up space-y-5" role="region" aria-label="Portefeuille de démonstration">
      <div className="flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-violet-400" aria-hidden="true" />
        <h2 className="text-xl font-bold text-white">Portefeuille de démonstration</h2>
      </div>
      <p className="text-sm text-slate-400">
        Compose un portefeuille fictif et projette sa valeur dans le temps à partir des prix réels, comparé à un indice de référence.
      </p>

      <div className="p-4 rounded-2xl bg-surface-900 border border-white/5 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-[11px] text-slate-500">À partir du</span>
            <input
              type="date"
              value={startDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Date de départ"
              className="mt-1 px-2 py-1.5 rounded-lg bg-surface-800 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Indice de référence</span>
            <input
              type="text"
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              aria-label="Symbole de l'indice de référence"
              placeholder="SPY"
              className="mt-1 w-28 px-2 py-1.5 rounded-lg bg-surface-800 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
            />
          </label>
        </div>

        <div className="space-y-2">
          {positions.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={p.symbol}
                onChange={(e) => updatePos(i, "symbol", e.target.value)}
                aria-label={`Symbole position ${i + 1}`}
                placeholder="Symbole"
                className="w-28 px-2 py-1.5 rounded-lg bg-surface-800 border border-white/5 text-sm text-white uppercase focus:outline-none focus:border-violet-500/50"
              />
              <input
                type="number"
                min="1"
                step="100"
                value={p.amount}
                onChange={(e) => updatePos(i, "amount", e.target.value)}
                aria-label={`Montant position ${i + 1}`}
                placeholder="Montant $"
                className="w-32 px-2 py-1.5 rounded-lg bg-surface-800 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
              />
              <button
                type="button"
                onClick={() => removePos(i)}
                aria-label={`Retirer la position ${i + 1}`}
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addPos}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-800 text-slate-300 hover:text-white border border-white/5 text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter une position
          </button>
          <button
            type="button"
            onClick={run}
            disabled={status === "loading"}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 disabled:opacity-50 text-xs font-semibold cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            {status === "loading" ? "Calcul…" : "Simuler le portefeuille"}
          </button>
        </div>
      </div>

      {status === "error" && <div className="text-xs text-amber-400">{state.error}</div>}

      {status === "ready" && state.portfolio && (
        <Results portfolio={state.portfolio} bench={state.bench} benchSymbol={state.benchSymbol} />
      )}

      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[11px] text-amber-200/90">
          Simulation — hypothèse calculée à partir de données de prix factuelles. Ne constitue pas un conseil financier ni une prédiction.
        </p>
      </div>
    </div>
  );
}

function Results({ portfolio, bench, benchSymbol }) {
  const tone = portfolio.totalReturn >= 0 ? "text-emerald-400" : "text-rose-400";
  const excess = bench ? excessReturnPct(portfolio.totalReturnPct, bench.totalReturnPct) : null;
  const chartData = mergeForChart(portfolio.curve, bench?.curve);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Capital investi", value: formatCurrency(portfolio.totalInvested) },
          { label: "Valeur aujourd'hui", value: formatCurrency(portfolio.finalValue) },
          { label: "Rendement", value: `${portfolio.totalReturnPct >= 0 ? "+" : ""}${portfolio.totalReturnPct.toFixed(1)}%`, tone },
          bench
            ? { label: `vs ${benchSymbol}`, value: excess != null ? `${excess >= 0 ? "+" : ""}${excess.toFixed(1)} pts` : "n/d", tone: excess >= 0 ? "text-emerald-400" : "text-rose-400" }
            : { label: "Indice", value: "n/d" },
        ].map((kpi) => (
          <div key={kpi.label}>
            <div className="text-[11px] text-slate-500">{kpi.label}</div>
            <div className={`text-sm font-semibold ${kpi.tone ?? "text-white"}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <ChartErrorBoundary>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} interval="preserveStartEnd" tickFormatter={(v) => String(v).slice(0, 7)} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} width={48} tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} />
            <ChartTooltip contentStyle={{ background: "#151d35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} formatter={(v, name) => [formatCurrency(Number(v)), name]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="portefeuille" name="Portefeuille" stroke="#a78bfa" strokeWidth={2} dot={false} />
            {bench && <Line type="monotone" dataKey="benchmark" name={benchSymbol} stroke="#64748b" strokeWidth={2} strokeDasharray="4 4" dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </ChartErrorBoundary>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-slate-500 border-b border-white/5">
              <th className="py-2">Position</th>
              <th className="py-2 text-right">Investi</th>
              <th className="py-2 text-right">Valeur</th>
              <th className="py-2 text-right">Rendement</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.positions.map((p) => (
              <tr key={p.symbol} className="border-b border-white/5">
                <td className="py-2 font-medium text-white">{p.symbol}</td>
                <td className="py-2 text-right text-slate-300">{formatCurrency(p.amount)}</td>
                <td className="py-2 text-right text-slate-300">{formatCurrency(p.finalValue)}</td>
                <td className={`py-2 text-right font-semibold ${p.totalReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {p.totalReturnPct >= 0 ? "+" : ""}{p.totalReturnPct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
