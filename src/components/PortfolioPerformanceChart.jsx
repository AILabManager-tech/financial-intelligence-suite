import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { formatCurrency, formatPercent } from "../utils/scoreTranslator";

function formatSnapshotTime(value) {
  return new Date(value).toLocaleString("fr-CA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PortfolioTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const snapshot = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-surface-900 px-3 py-2 shadow-xl">
      <div className="text-xs text-slate-400 mb-1">{formatSnapshotTime(snapshot.capturedAt)}</div>
      <div className="text-sm font-semibold text-white">{formatCurrency(snapshot.totalMarketValue)}</div>
      <div className={snapshot.unrealizedPnl >= 0 ? "text-xs text-emerald-400" : "text-xs text-rose-400"}>
        {formatCurrency(snapshot.unrealizedPnl)} · {formatPercent(snapshot.unrealizedPnlPct)}
      </div>
      <div className="text-[11px] text-slate-500 mt-1">
        {snapshot.liveQuotesCount}/{snapshot.positionsCount} quotes live
      </div>
    </div>
  );
}

export default function PortfolioPerformanceChart({ snapshots = [] }) {
  const hasHistory = snapshots.length >= 2;
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const delta = first && last ? last.totalMarketValue - first.totalMarketValue : 0;
  const deltaPct = first?.totalMarketValue > 0 ? (delta / first.totalMarketValue) * 100 : 0;
  const tone = delta >= 0 ? "text-emerald-400" : "text-rose-400";
  const stroke = delta >= 0 ? "#34d399" : "#fb7185";

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
          Performance portefeuille
        </div>
        {hasHistory && (
          <div className={`text-xs font-semibold ${tone}`}>
            {formatCurrency(delta)} · {formatPercent(deltaPct)}
          </div>
        )}
      </div>

      {hasHistory ? (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={snapshots} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={stroke} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={stroke} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
              <XAxis
                dataKey="capturedAt"
                tickFormatter={formatSnapshotTime}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={72}
                domain={["dataMin", "dataMax"]}
              />
              <Tooltip content={<PortfolioTooltip />} />
              <Area
                type="monotone"
                dataKey="totalMarketValue"
                stroke={stroke}
                strokeWidth={2}
                fill="url(#portfolioValue)"
                dot={false}
                activeDot={{ r: 4, fill: stroke, stroke: "#0f172a", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-56 flex items-center justify-center text-center">
          <div>
            <div className="text-sm font-medium text-white">Historique en création</div>
            <div className="text-xs text-slate-500 mt-1">
              Deux snapshots sont nécessaires pour tracer une performance factuelle.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
