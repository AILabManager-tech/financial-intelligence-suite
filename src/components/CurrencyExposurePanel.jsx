import { useEffect, useState } from "react";
import { Coins, AlertTriangle } from "lucide-react";
import { fetchFxRates } from "../services/fx";
import { convertPortfolioTotals } from "../utils/fxConvert";
import { calculatePortfolioAnalytics } from "../utils/portfolioAnalytics";
import { formatCurrency } from "../utils/scoreTranslator";

// Currency exposure (P3.4). The app reports market values in USD (the quote
// source currency); this panel converts the active mandate's portfolio totals to
// its base currency via live ECB-backed FX rates. Strictly factual: when a rate
// is missing the converted figure is hidden (null), never invented, and a banner
// states the rate source + as-of date. Hidden entirely when the mandate base is
// already USD (nothing to convert).
const REPORTING_CURRENCY = "USD";

export default function CurrencyExposurePanel({ assets, baseCurrency = "USD" }) {
  const base = String(baseCurrency || "USD").toUpperCase();
  // `forBase` records which currency the result belongs to; while it differs from
  // the active base, the fetch is still in flight (no synchronous setState in the
  // effect, which keeps the render pass clean — see react-hooks rules).
  const [state, setState] = useState({ status: "idle", forBase: null, rates: null, source: null, asOf: null });

  useEffect(() => {
    if (base === REPORTING_CURRENCY) return undefined;
    const controller = new AbortController();
    fetchFxRates(base, { signal: controller.signal })
      .then((payload) => {
        if (!controller.signal.aborted) {
          setState({ status: "ready", forBase: base, rates: payload.rates, source: payload.source, asOf: payload.asOf });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: "error", forBase: base, rates: null, source: null, asOf: null });
        }
      });
    return () => controller.abort();
  }, [base]);

  // Same-currency mandate: nothing to show (USD totals already visible elsewhere).
  if (base === REPORTING_CURRENCY) return null;

  const resolved = state.forBase === base;
  const status = resolved ? state.status : "loading";
  const analytics = calculatePortfolioAnalytics(assets);
  const converted = resolved && state.rates
    ? convertPortfolioTotals(analytics, REPORTING_CURRENCY, base, state.rates)
    : null;

  return (
    <div className="animate-slide-up" role="region" aria-label="Exposition devises">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Coins className="w-5 h-5 text-blue-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-white">Exposition en {base}</h2>
        <span className="ml-auto text-xs text-slate-500">Valeurs USD converties</span>
      </div>

      {status === "loading" && (
        <div className="text-xs text-slate-500">Chargement des taux de change…</div>
      )}

      {status === "error" && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[11px] text-amber-200/90">
            Taux de change indisponibles. Conversion masquée pour éviter d'afficher une valeur non sourcée.
          </p>
        </div>
      )}

      {status === "ready" && converted && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: `Valeur (${base})`, value: converted.totalMarketValue },
              { label: `Coût (${base})`, value: converted.totalCost },
              { label: `P&L latent (${base})`, value: converted.unrealizedPnl, tone: true },
            ].map((kpi) => (
              <div key={kpi.label} className="p-4 rounded-xl bg-surface-800 border border-white/5">
                <div className="text-xs text-slate-400 mb-1">{kpi.label}</div>
                <div className={`text-xl font-bold ${
                  kpi.value === null
                    ? "text-slate-500"
                    : kpi.tone
                      ? (kpi.value >= 0 ? "text-emerald-400" : "text-rose-400")
                      : "text-white"
                }`}>
                  {kpi.value === null ? "—" : `${formatCurrency(kpi.value)} ${base}`}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Taux {REPORTING_CURRENCY}→{base} · source {state.source ?? "n/d"}
            {state.asOf ? ` · au ${state.asOf}` : ""}. Conversion factuelle, pas un conseil.
          </p>
        </>
      )}
    </div>
  );
}
