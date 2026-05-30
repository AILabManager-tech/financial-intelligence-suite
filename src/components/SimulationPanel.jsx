import { useState } from "react";
import { FlaskConical, TrendingUp, AlertTriangle } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import ChartErrorBoundary from "./ChartErrorBoundary";
import { fetchPriceHistory } from "../services/priceHistory";
import { simulateInvestment } from "../utils/simulationCalculator";
import { formatCurrency } from "../utils/scoreTranslator";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function defaultStartDate() {
  // 5 years ago, ISO date — a sensible, data-available default.
  const d = new Date(Date.now() - 5 * 365 * MS_PER_DAY);
  return d.toISOString().slice(0, 10);
}

function daysSince(isoDate) {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(1, Math.ceil(ms / MS_PER_DAY) + 5);
}

// What-if demo simulator (P2.3). Per asset, lets the operator ask "if I had
// invested X on date D, what would it be worth today?" — computed from the
// factual price history. A permanent banner labels it as a hypothesis, not advice.
export default function SimulationPanel({ asset }) {
  const [amount, setAmount] = useState("10000");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [state, setState] = useState({ status: "idle", result: null, source: null, error: null });

  const run = async () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setState({ status: "error", result: null, source: null, error: "Montant invalide." });
      return;
    }
    setState({ status: "loading", result: null, source: null, error: null });
    try {
      const history = await fetchPriceHistory(asset.symbol, { days: daysSince(startDate) });
      const result = simulateInvestment(history.points, { amount: numericAmount, startDate });
      if (!result) {
        setState({ status: "error", result: null, source: history.source, error: "Historique insuffisant pour cette période." });
        return;
      }
      setState({ status: "ready", result, source: history.source, error: null });
    } catch {
      setState({ status: "error", result: null, source: null, error: "Historique indisponible pour ce titre." });
    }
  };

  const { status, result, source, error } = state;
  const gainTone = result && result.totalReturn >= 0 ? "text-emerald-400" : "text-rose-400";

  return (
    <div className="mt-4 p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="Simulateur what-if">
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical className="w-4 h-4 text-violet-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-white">Simulateur — et si j'avais investi&nbsp;?</span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-[11px] text-slate-500">Montant investi ($)</span>
          <input
            type="number"
            min="1"
            step="100"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-label="Montant investi"
            className="mt-1 w-32 px-2 py-1.5 rounded-lg bg-surface-900 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-500">À partir du</span>
          <input
            type="date"
            value={startDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setStartDate(event.target.value)}
            aria-label="Date de départ"
            className="mt-1 px-2 py-1.5 rounded-lg bg-surface-900 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
          />
        </label>
        <button
          type="button"
          onClick={run}
          disabled={status === "loading"}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 disabled:opacity-50 text-xs font-semibold cursor-pointer"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          {status === "loading" ? "Calcul…" : "Simuler"}
        </button>
      </div>

      {status === "error" && (
        <div className="mt-3 text-xs text-amber-400">{error}</div>
      )}

      {status === "ready" && result && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Capital initial", value: formatCurrency(result.initialAmount) },
              { label: "Valeur aujourd'hui", value: formatCurrency(result.finalValue) },
              { label: "Gain", value: `${result.totalReturn >= 0 ? "+" : ""}${formatCurrency(result.totalReturn)} (${result.totalReturnPct >= 0 ? "+" : ""}${result.totalReturnPct.toFixed(1)}%)`, tone: gainTone },
              { label: "Rendement annualisé (CAGR)", value: result.cagrPct != null ? `${result.cagrPct >= 0 ? "+" : ""}${result.cagrPct.toFixed(1)} %/an` : "n/d" },
            ].map((kpi) => (
              <div key={kpi.label}>
                <div className="text-[11px] text-slate-500">{kpi.label}</div>
                <div className={`text-sm font-semibold ${kpi.tone ?? "text-white"}`}>{kpi.value}</div>
              </div>
            ))}
          </div>

          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={result.curve} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} interval="preserveStartEnd" tickFormatter={(value) => String(value).slice(0, 7)} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} width={48} tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
                <ChartTooltip
                  contentStyle={{ background: "#151d35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => [formatCurrency(Number(value)), "Valeur"]}
                />
                <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartErrorBoundary>

          <div className="text-[11px] text-slate-500">
            {result.shares.toLocaleString("fr-CA", { maximumFractionDigits: 2 })} parts achetées à {formatCurrency(result.entryPrice)} le {result.entryDate} · valeur au {result.finalDate}
            {source ? ` · source ${source}` : ""}
          </div>
        </div>
      )}

      {/* Bandeau permanent — factualité stricte (CLAUDE.md / roadmap P2.3) */}
      <div className="mt-4 flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[11px] text-amber-200/90">
          Simulation — hypothèse calculée à partir de données de prix factuelles. Ne constitue pas un conseil financier ni une prédiction.
        </p>
      </div>
    </div>
  );
}
