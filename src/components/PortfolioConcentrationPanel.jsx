import { useMemo } from "react";
import { PieChart, AlertTriangle } from "lucide-react";
import { computePortfolioConcentration } from "../utils/portfolioConcentration";
import { formatPct } from "../utils/returnsFormatters";

// Concentration & diversification (P5.x) — dashboard catalog feature derived
// purely from the held positions' market value (no API, no snapshot). Surfaces
// holding-level concentration (largest position, top-5), the HHI with its
// standard diversification band, the effective number of holdings, and the
// sector spread. Factual: an empty portfolio shows an honest empty state; the
// HHI bands are descriptive thresholds, not advice.

const BANDS = {
  diversified: { label: "Diversifié", tone: "text-emerald-400", bar: "bg-emerald-500/60" },
  moderate: { label: "Modéré", tone: "text-amber-300", bar: "bg-amber-500/60" },
  concentrated: { label: "Concentré", tone: "text-rose-400", bar: "bg-rose-500/60" },
};

function Tile({ label, value, tone }) {
  const shown = value ?? "—";
  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${shown === "—" ? "text-slate-500" : tone ?? "text-white"}`}>{shown}</div>
    </div>
  );
}

function WeightRow({ name, weightPct, barClass }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 truncate text-slate-300">{name}</span>
      <div className="flex-1 h-2 rounded-full bg-surface-900 overflow-hidden">
        <div className={`h-full ${barClass}`} style={{ width: `${Math.min(100, weightPct)}%` }} />
      </div>
      <span className="w-14 text-right text-slate-400">{formatPct(weightPct, { signed: false })}</span>
    </div>
  );
}

export default function PortfolioConcentrationPanel({ assets = [] }) {
  const c = useMemo(() => computePortfolioConcentration(assets), [assets]);

  return (
    <div className="animate-slide-up" role="region" aria-label="Concentration & diversification">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <PieChart className="w-5 h-5 text-blue-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-white">Concentration &amp; diversification</h2>
        {c.hasData && (
          <span className={`ml-auto text-xs font-semibold ${BANDS[c.band].tone}`}>{BANDS[c.band].label}</span>
        )}
      </div>

      {!c.hasData ? (
        <p className="text-xs text-slate-500">
          Aucune position détenue — la concentration apparaîtra dès que le portefeuille contiendra des titres
          avec une quantité et un prix.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <Tile label="Indice HHI" value={Math.round(c.hhi).toLocaleString("fr-CA")} tone={BANDS[c.band].tone} />
            <Tile
              label="Positions effectives"
              value={c.effectiveHoldings != null ? c.effectiveHoldings.toFixed(1).replace(".", ",") : null}
            />
            <Tile
              label="Plus grosse position"
              value={`${c.topHolding.symbol} · ${formatPct(c.topHolding.weightPct, { signed: false })}`}
            />
            <Tile label="Top 5" value={formatPct(c.top5Pct, { signed: false })} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Tile label="Positions" value={String(c.positionsCount)} />
            <Tile label="Secteurs" value={String(c.sectorsCount)} />
            <Tile
              label="Secteur principal"
              value={`${c.topSector.sector} · ${formatPct(c.topSector.weightPct, { signed: false })}`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-400 mb-2">Positions (par poids)</div>
              <div className="space-y-1.5">
                {c.holdings.slice(0, 5).map((h) => (
                  <WeightRow key={h.symbol} name={h.symbol} weightPct={h.weightPct} barClass={BANDS[c.band].bar} />
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-2">Secteurs (par poids)</div>
              <div className="space-y-1.5">
                {c.sectors.slice(0, 5).map((s) => (
                  <WeightRow key={s.sector} name={s.sector} weightPct={s.weightPct} barClass="bg-blue-500/60" />
                ))}
              </div>
            </div>
          </div>

          {c.band === "concentrated" && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-4">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[11px] text-amber-200/90">
                Portefeuille concentré (HHI &gt; 2500). Un poids élevé sur peu de positions ou secteurs augmente le
                risque idiosyncratique.
              </p>
            </div>
          )}

          <p className="text-[11px] text-slate-500 mt-3">
            Pondéré par valeur de marché des positions détenues. HHI = indice de concentration (somme des carrés des
            poids en %), bandes standards &lt; 1500 diversifié / 1500-2500 modéré / &gt; 2500 concentré. Pas un conseil.
          </p>
        </>
      )}
    </div>
  );
}
