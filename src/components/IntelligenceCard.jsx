import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, X, Database, RefreshCw, Save, BookmarkPlus, BookmarkCheck, Star } from "lucide-react";
import { formatCurrency } from "../utils/scoreTranslator";
import { CartesianGrid, LineChart, Line, ReferenceLine, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import ChartErrorBoundary from "./ChartErrorBoundary";
import { fetchPriceHistory } from "../services/priceHistory";
import { DEFAULT_PERIOD, PERIOD_OPTIONS } from "../services/priceHistoryPeriods";
import FundamentalsPanel from "./FundamentalsPanel";
import BuffettAnalysisPanel from "./BuffettAnalysisPanel";
import AnalystRatingsPanel from "./AnalystRatingsPanel";
import CompanyNewsPanel from "./CompanyNewsPanel";
import EarningsCalendarPanel from "./EarningsCalendarPanel";
import DividendHistoryPanel from "./DividendHistoryPanel";
import SecFilingsPanel from "./SecFilingsPanel";
import PeersComparisonPanel from "./PeersComparisonPanel";
import LayoutSurface from "./LayoutSurface";
import { useLayout } from "../hooks/useLayout";

// Maps the registry componentKeys of the "asset" surface to their components.
// The render order and visibility now come from the layout store (P0.2) via
// LayoutSurface; this map only resolves the stable string keys to components.
// All asset panels take the same single prop (asset), so propsFor is uniform.
const ASSET_FEATURE_COMPONENTS = {
  FundamentalsPanel,
  BuffettAnalysisPanel,
  AnalystRatingsPanel,
  EarningsCalendarPanel,
  DividendHistoryPanel,
  CompanyNewsPanel,
  SecFilingsPanel,
  PeersComparisonPanel,
};

function formatTick(value, timeUnit) {
  if (!value) return "";
  if (timeUnit === "intraday") {
    const datePart = value.includes(" ") ? value.split(" ")[1] : value;
    return datePart.slice(0, 5);
  }
  if (timeUnit === "weekly") {
    return value.slice(0, 7);
  }
  return value.slice(5);
}

function describePeriod(period) {
  return PERIOD_OPTIONS.find((option) => option.key === period)?.description ?? "période";
}

function PeriodSelector({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-surface-900/70 border border-white/5 p-1">
      {PERIOD_OPTIONS.map((option) => {
        const isActive = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange?.(option.key)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
              isActive ? "bg-violet-500/20 text-violet-200" : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            aria-pressed={isActive}
            aria-label={`Période ${option.description}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PriceHistoryChart({ asset }) {
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [history, setHistory] = useState({ symbol: asset.symbol, period, status: "loading", points: [], source: null, fetchedAt: null, timeUnit: "daily" });

  if ((history.symbol !== asset.symbol || history.period !== period) && history.status !== "loading") {
    setHistory({ symbol: asset.symbol, period, status: "loading", points: [], source: null, fetchedAt: null, timeUnit: "daily" });
  }

  useEffect(() => {
    let active = true;

    fetchPriceHistory(asset.symbol, { period })
      .then((payload) => {
        if (active) {
          setHistory({
            symbol: asset.symbol,
            period,
            status: "ready",
            points: payload.points,
            source: payload.source,
            fetchedAt: payload.fetchedAt,
            timeUnit: payload.timeUnit ?? "daily",
            interval: payload.interval ?? null,
          });
        }
      })
      .catch((error) => {
        if (active) {
          setHistory({ symbol: asset.symbol, period, status: "error", points: [], source: null, fetchedAt: null, timeUnit: "daily", error: error.message });
        }
      });

    return () => {
      active = false;
    };
  }, [asset.symbol, period]);

  if (history.status === "loading") {
    return (
      <div className="p-4 rounded-xl bg-surface-800 border border-white/5 min-h-[260px]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs text-slate-500">Prix — {describePeriod(period)}</span>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        <div className="flex items-center justify-center min-h-[180px]">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
            Chargement historique
          </div>
        </div>
      </div>
    );
  }

  if (history.status === "error" || history.points.length < 2) {
    return (
      <div className="p-4 rounded-xl bg-surface-800 border border-white/5 min-h-[260px]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs text-slate-500">Prix — {describePeriod(period)}</span>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        <div className="flex items-center justify-center min-h-[180px] text-center">
          <div>
            <div className="text-sm font-medium text-amber-400">Historique indisponible</div>
            <div className="text-xs text-slate-500 mt-1">La courbe est masquée pour éviter d'afficher des valeurs simulées.</div>
          </div>
        </div>
      </div>
    );
  }

  const first = history.points[0].close;
  const last = history.points.at(-1).close;
  const prices = history.points.map((point) => point.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const deltaPct = ((last - first) / first) * 100;
  const isImproving = deltaPct >= 0;
  const stroke = isImproving ? "#34d399" : "#fb7185";
  const domainMin = Math.max(0, min * 0.98);
  const domainMax = max * 1.02;

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <span className="text-xs text-slate-500 block">Prix — {describePeriod(period)}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-white">${last.toFixed(2)}</span>
            <span className={`text-xs font-semibold ${isImproving ? "text-emerald-400" : "text-rose-400"}`}>
              {isImproving ? "+" : ""}{deltaPct.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PeriodSelector value={period} onChange={setPeriod} />
          <div className="text-right text-[11px] text-slate-500">
            <div>Min ${min.toFixed(2)}</div>
            <div>Max ${max.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <ChartErrorBoundary>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={history.points} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              interval="preserveStartEnd"
              tickFormatter={(value) => formatTick(value, history.timeUnit)}
            />
            <YAxis
              domain={[domainMin, domainMax]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              width={34}
              tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
            />
            <ReferenceLine y={first} stroke="rgba(96,165,250,0.45)" strokeDasharray="4 4" />
            <ChartTooltip
              cursor={{ stroke: "rgba(255,255,255,0.12)" }}
              contentStyle={{ background: "#151d35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
              labelFormatter={(value) => value}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, "Clôture"]}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke={stroke}
              strokeWidth={3}
              dot={{ r: 3, strokeWidth: 0, fill: stroke }}
              activeDot={{ r: 5, stroke: "#ffffff", strokeWidth: 2, fill: stroke }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartErrorBoundary>
      <div className="mt-2 text-[11px] text-slate-500">
        Source: {history.source}{history.interval ? ` · interval ${history.interval}` : ""}. Ligne pointillée: première clôture de la période.
      </div>
    </div>
  );
}

export default function IntelligenceCard({
  asset,
  onClose,
  onSavePosition,
  onToggleWatchlist,
  onToggleFavorite,
  isInPortfolio = false,
  isInWatchlist = false,
  isFavorite = false,
}) {
  const layout = useLayout();
  const isUp = asset.changePct >= 0;
  const [positionDraft, setPositionDraft] = useState({
    symbol: asset.symbol,
    quantity: String(asset.position?.quantity ?? 0),
    averageCost: String(asset.position?.averageCost ?? asset.price),
    targetWeight: String(asset.position?.targetWeight ?? 0),
  });

  if (positionDraft.symbol !== asset.symbol) {
    setPositionDraft({
      symbol: asset.symbol,
      quantity: String(asset.position?.quantity ?? 0),
      averageCost: String(asset.position?.averageCost ?? asset.price),
      targetWeight: String(asset.position?.targetWeight ?? 0),
    });
  }

  const quantity = asset.position?.quantity ?? 0;
  const averageCost = asset.position?.averageCost ?? asset.price;
  const positionValue = quantity * asset.price;
  const positionCost = quantity * averageCost;
  const unrealizedPnl = positionValue - positionCost;
  const unrealizedPnlPct = positionCost > 0 ? (unrealizedPnl / positionCost) * 100 : 0;
  const pnlTone = unrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400";
  const savePosition = () => {
    onSavePosition?.(asset, {
      quantity: Number(positionDraft.quantity),
      averageCost: Number(positionDraft.averageCost),
      targetWeight: Number(positionDraft.targetWeight),
    });
  };

  return (
    <div className="animate-slide-up" role="region" aria-label={`Analyse de ${asset.symbol}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
              {asset.symbol} <span className="text-sm sm:text-base font-normal text-slate-400">— {asset.name}</span>
            </h2>
            <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
              <span className="text-lg sm:text-xl font-semibold text-white">
                ${asset.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold ${isUp ? "bg-emerald-500/25 text-emerald-300" : "bg-rose-500/25 text-rose-300"}`}>
                {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {isUp ? "+" : ""}{asset.changePct.toFixed(2)}%
              </span>
              <span className={`text-sm font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                {isUp ? "+" : "-"}${Math.abs(asset.change).toFixed(2)}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300">
                {asset.marketData?.source ?? "source externe"}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onClose} aria-label="Fermer l'analyse" className="p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer flex-shrink-0">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="p-4 rounded-xl bg-surface-800 border border-white/5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Provenance des données</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-slate-500">Quote</div>
            <div className="font-medium text-slate-200">{asset.marketData?.source ?? "source externe"}</div>
          </div>
          <div>
            <div className="text-slate-500">Horodatage</div>
            <div className="font-medium text-slate-200">
              {asset.marketData?.asOf ? new Date(asset.marketData.asOf).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" }) : "API quote"}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Volume</div>
            <div className="font-medium text-slate-200">{asset.volume?.toLocaleString("fr-CA") ?? "n/d"}</div>
          </div>
        </div>
      </div>

      {/* Score trend mini-chart + Earnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PriceHistoryChart asset={asset} />

        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-xs text-slate-500 block">Position</span>
            <span className={`text-[11px] ${isInPortfolio ? "text-emerald-400" : "text-amber-400"}`}>
              {isInPortfolio ? "En portefeuille" : "Consultation seulement"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Valeur position", term: "positionValue", value: formatCurrency(positionValue) },
              { label: "P&L latent", term: "unrealizedPnl", value: `${formatCurrency(unrealizedPnl)} (${unrealizedPnlPct >= 0 ? "+" : ""}${unrealizedPnlPct.toFixed(1)}%)`, tone: pnlTone },
              { label: "Quantité", term: "quantity", value: quantity.toLocaleString("fr-FR") },
              { label: "Coût moyen", term: "averageCost", value: `$${averageCost.toFixed(2)}` },
              { label: "Prix actuel", value: `$${asset.price.toFixed(2)}` },
              { label: "Variation", value: `${isUp ? "+" : "-"}$${Math.abs(asset.change).toFixed(2)} (${isUp ? "+" : ""}${asset.changePct.toFixed(2)}%)`, tone: isUp ? "text-emerald-400" : "text-rose-400" },
            ].map((item) => (
              <div key={item.label}>
                <span className="text-[11px] text-slate-500">{item.label}</span>
                <div className={`text-sm font-semibold ${item.tone ?? "text-white"}`}>{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
          <div className="grid grid-cols-3 gap-2">
              {[
                { key: "quantity", label: "Quantité", step: "0.01" },
                { key: "averageCost", label: "Coût moyen", step: "0.1" },
                { key: "targetWeight", label: "Cible %", step: "0.1" },
              ].map((field) => (
                <label key={field.key} className="block">
                  <span className="text-[11px] text-slate-500">{field.label}</span>
                  <input
                    type="number"
                    min="0"
                    step={field.step}
                    value={positionDraft[field.key]}
                    onChange={(event) => setPositionDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="mt-1 w-full px-2 py-1.5 rounded-lg bg-surface-900 border border-white/5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={savePosition}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 text-xs font-semibold cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {isInPortfolio ? "Mettre à jour la position" : "Ajouter au portefeuille"}
              </button>
              <button
                type="button"
                onClick={() => onToggleWatchlist?.(asset)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 text-xs font-semibold cursor-pointer"
              >
                {isInWatchlist ? <BookmarkCheck className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                {isInWatchlist ? "Retirer de la watchlist" : "Ajouter à la watchlist"}
              </button>
              <button
                type="button"
                onClick={() => onToggleFavorite?.(asset.symbol)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${isFavorite ? "bg-amber-500/15 text-amber-300" : "bg-surface-900 text-slate-300 hover:bg-white/5"}`}
              >
                <Star className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`} />
                {isFavorite ? "Favori" : "Marquer favori"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <LayoutSurface
        surface="asset"
        layout={layout}
        components={ASSET_FEATURE_COMPONENTS}
        propsFor={() => ({ asset })}
      />
    </div>
  );
}
