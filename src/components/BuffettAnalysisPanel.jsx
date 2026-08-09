import { useEffect, useMemo, useState } from "react";
import { ScrollText, RefreshCw, CheckCircle2, XCircle, Zap, AlertTriangle } from "lucide-react";

import { fetchFundamentals } from "../services/fundamentals";
import {
  calcIntrinsicValue,
  decideAction,
  evaluateCriteria,
  impliedPriceToFcfThreshold,
  resolveMoat,
} from "../utils/buffettCalculator";
import {
  extractBuffettInputs,
  formatCurrency,
  formatPercent,
  formatActionLabel,
  formatRatio,
} from "../utils/buffettFormatters";
import BuffettMathBreakdown from "./BuffettMathBreakdown";

// Seuil du critère « marge de sécurité » — le même que dans evaluateCriteria.
const MOS_GATE = 0.25;
const DEFAULT_R = 0.10;
const DEFAULT_G = 0.05;
const ASSUMPTION_PRESETS = [
  { key: "conservative", label: "Conservateur", r: 0.12, g: 0.03 },
  { key: "standard", label: "Standard", r: DEFAULT_R, g: DEFAULT_G },
  { key: "optimistic", label: "Optimiste", r: 0.09, g: 0.07 },
];

function actionTone(action) {
  if (action === "INVALID") return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
  if (action === "BUY") return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
  if (action === "SELL") return "bg-rose-500/15 text-rose-300 border border-rose-500/30";
  return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
}

function mosTone(mos) {
  if (!Number.isFinite(mos)) return "text-slate-200";
  if (mos > 0.25) return "text-emerald-400";
  if (mos > 0) return "text-amber-400";
  return "text-rose-400";
}

function MiniStat({ label, value, tone }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${tone ?? "text-white"}`}>{value}</div>
    </div>
  );
}

function CriterionRow({ criterion }) {
  const isPass = criterion.status === "PASS";
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-1">
      <span className="text-slate-300">{criterion.label}</span>
      {isPass ? (
        <span className="flex items-center gap-1 text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> PASS
        </span>
      ) : (
        <span className="flex items-center gap-1 text-rose-300">
          <XCircle className="w-3.5 h-3.5" aria-hidden="true" /> FAIL
        </span>
      )}
    </div>
  );
}

export default function BuffettAnalysisPanel({ asset }) {
  const [state, setState] = useState({
    symbol: asset?.symbol ?? null,
    status: asset?.symbol ? "loading" : "idle",
    fields: {},
    fetchedAt: null,
    source: null,
    error: null,
  });
  const [r, setR] = useState(DEFAULT_R);
  const [g, setG] = useState(DEFAULT_G);

  if (asset?.symbol && state.symbol !== asset.symbol) {
    setState({
      symbol: asset.symbol,
      status: "loading",
      fields: {},
      fetchedAt: null,
      source: null,
      error: null,
    });
  }

  useEffect(() => {
    if (!asset?.symbol) return undefined;

    const controller = new AbortController();

    fetchFundamentals(asset.symbol, { signal: controller.signal })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setState({
          symbol: asset.symbol,
          status: "ready",
          fields: payload.fields ?? {},
          fetchedAt: payload.fetchedAt,
          source: payload.source,
          error: null,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === "AbortError") return;
        setState({
          symbol: asset.symbol,
          status: "error",
          fields: {},
          fetchedAt: null,
          source: null,
          error: error.message,
        });
      });

    return () => controller.abort();
  }, [asset?.symbol]);

  const inputs = useMemo(
    () =>
      state.status === "ready"
        ? extractBuffettInputs({
            ticker: asset?.symbol ?? "",
            price: asset?.price,
            fields: state.fields,
          })
        : null,
    [state.status, state.fields, asset?.symbol, asset?.price],
  );

  if (!asset) return null;

  return (
    <div
      className="p-4 rounded-xl bg-surface-800 border border-white/5 mt-4"
      role="region"
      aria-label="Analyse Buffett"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-amber-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Analyse Buffett — DCF</span>
          {state.status === "ready" && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
              inputs
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-300 border-amber-500/20"
            }`}>
              {inputs ? "Complet" : "Incomplet"}
            </span>
          )}
        </div>
        {state.status === "ready" && state.source && (
          <span className="text-[11px] text-slate-500">{state.source} · calc DCF</span>
        )}
      </div>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 min-h-[80px]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Chargement de l'analyse Buffett
        </div>
      )}

      {state.status === "error" && (
        <div className="text-sm text-amber-400">
          Analyse Buffett indisponible pour le moment.
          <div className="text-xs text-slate-500 mt-1">
            Aucune valeur n'est affichée pour éviter de présenter une donnée non vérifiée.
          </div>
        </div>
      )}

      {state.status === "ready" && !inputs && (
        <div className="text-sm text-slate-400">
          Données insuffisantes pour {asset.symbol}.
          <div className="text-xs text-slate-500 mt-1">
            ROE TTM, croissance EPS 5y, ratio dette/equity et price/FCF sont requis. Souvent absents
            sur les non-US du plan Finnhub gratuit ; un fallback Twelve Data est prévu.
          </div>
        </div>
      )}

      {state.status === "ready" && inputs && (
        <BuffettBody inputs={inputs} r={r} g={g} setR={setR} setG={setG} />
      )}
    </div>
  );
}

function BuffettBody({ inputs, r, g, setR, setG }) {
  const intrinsicValue = useMemo(() => calcIntrinsicValue(inputs.fcf, g, r), [inputs.fcf, g, r]);
  const effectivePrice = inputs.price;
  const isDivergent = r <= g;
  const mos =
    Number.isFinite(intrinsicValue) && effectivePrice > 0
      ? (intrinsicValue - effectivePrice) / intrinsicValue
      : NaN;
  const hasMoat = useMemo(
    () =>
      resolveMoat(inputs.ticker, {
        roe: inputs.roe,
        earningsGrowth5y: inputs.earningsGrowth5y,
        fcf: inputs.fcf,
        debtEquity: inputs.debtEquity,
      }),
    [inputs.ticker, inputs.roe, inputs.earningsGrowth5y, inputs.fcf, inputs.debtEquity],
  );
  const stockForCriteria = { ...inputs, hasMoat };
  const criteria = evaluateCriteria(stockForCriteria, mos);
  const impliedPfcf = useMemo(() => impliedPriceToFcfThreshold(g, r, MOS_GATE), [g, r]);
  const allPass = criteria.every((c) => c.status === "PASS");
  const passedCount = criteria.filter((c) => c.status === "PASS").length;
  const action = isDivergent ? "INVALID" : decideAction(allPass, mos);
  const actionLabel = isDivergent ? "Hypothèse invalide" : formatActionLabel(action);

  const ivStr = formatCurrency(intrinsicValue);
  const priceStr = formatCurrency(effectivePrice);
  const deltaStr =
    Number.isFinite(intrinsicValue) && Number.isFinite(effectivePrice)
      ? formatCurrency(intrinsicValue - effectivePrice)
      : "—";
  const mosStr = Number.isFinite(mos) ? formatPercent(mos) : "—";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Hero MoS */}
        <div className="p-4 rounded-lg bg-surface-900 border border-white/5">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Marge de sécurité</div>
          <div className={`text-4xl font-bold tabular-nums mt-1 ${mosTone(mos)}`}>{mosStr}</div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <MiniStat label="VI" value={ivStr} />
            <MiniStat label="Prix" value={priceStr} />
            <MiniStat label="Δ" value={deltaStr} tone={
              Number.isFinite(intrinsicValue) && Number.isFinite(effectivePrice) && intrinsicValue >= effectivePrice
                ? "text-emerald-400"
                : "text-rose-400"
            } />
          </div>
        </div>

        {/* Sliders + decision */}
        <div className="p-4 rounded-lg bg-surface-900 border border-white/5 space-y-3">
          <div>
            <div className="text-[11px] text-slate-500 mb-1">Hypothèses</div>
            <div className="grid grid-cols-3 gap-1">
              {ASSUMPTION_PRESETS.map((preset) => {
                const isActive = r === preset.r && g === preset.g;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      setR(preset.r);
                      setG(preset.g);
                    }}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium ${
                      isActive
                        ? "bg-violet-500/20 text-violet-200"
                        : "bg-surface-800 text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                    aria-pressed={isActive}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between text-xs mb-1">
              <span className="text-slate-400">Taux d'actualisation r</span>
              <span className="text-white tabular-nums">{(r * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={0.04}
              max={0.20}
              step={0.005}
              value={r}
              onChange={(e) => setR(Number(e.target.value))}
              aria-label="Taux d'actualisation r"
              className="w-full accent-violet-500"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between text-xs mb-1">
              <span className="text-slate-400">Taux de croissance g</span>
              <span className="text-white tabular-nums">{(g * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.15}
              step={0.005}
              value={g}
              onChange={(e) => setG(Number(e.target.value))}
              aria-label="Taux de croissance g"
              className="w-full accent-violet-500"
            />
          </div>
          {isDivergent && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Hypothèse invalide: le taux de croissance doit rester inférieur au taux d'actualisation.
            </div>
          )}
          {actionLabel && (
            <div
              className={`text-center text-sm font-semibold tracking-wide rounded-lg px-3 py-2 ${actionTone(action)}`}
              aria-live="polite"
            >
              {action === "BUY" && (
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="w-4 h-4" aria-hidden="true" />
                  {actionLabel}
                </span>
              )}
              {action !== "BUY" && (
                <span className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  {actionLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-surface-900 px-3 py-2 text-xs text-slate-400">
        FCF/action estimé depuis Finnhub: prix {priceStr} ÷ P/FCF {formatRatio(inputs.raw.pfcfShareTtm)} = {formatCurrency(inputs.fcf)}.
        Le résultat dépend directement de cette approximation.
      </div>

      {/* Criteria */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-400">Critères Buffett validés</span>
        <span className="font-semibold tabular-nums text-white">{passedCount}/{criteria.length}</span>
      </div>
      {/* B3 — les hypothèses étant uniformes, la valeur intrinsèque est linéaire
          en flux : le critère de marge de sécurité revient exactement à un seuil
          de P/FCF. Le laisser implicite faisait promettre au mot « DCF » plus
          qu'il ne tient. Affiché, il devient une hypothèse vérifiable, et il
          suit les curseurs. */}
      {impliedPfcf !== null && (
        <p className="text-[11px] text-slate-500">
          Avec ces hypothèses ({(r * 100).toFixed(0)} % d&apos;actualisation, {(g * 100).toFixed(0)} % de
          croissance), « marge de sécurité &gt; 25 % » équivaut exactement à{" "}
          <span className="tabular-nums text-slate-300">P/FCF &lt; {impliedPfcf.toFixed(2)}</span>. Les mêmes
          hypothèses sont appliquées à toutes les entreprises — c&apos;est une convention affichée, pas une
          estimation propre à ce titre.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {criteria.map((criterion) => (
          <CriterionRow key={criterion.label} criterion={criterion} />
        ))}
      </div>

      {/* Math */}
      <BuffettMathBreakdown
        ticker={inputs.ticker}
        fcf={inputs.fcf}
        r={r}
        g={g}
        intrinsicValue={intrinsicValue}
        livePrice={effectivePrice}
        mos={mos}
      />
    </div>
  );
}
