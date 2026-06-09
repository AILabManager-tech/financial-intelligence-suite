import { useEffect, useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import { fetchFundamentals } from "../services/fundamentals";
import {
  FUNDAMENTALS_DEFINITIONS,
  formatFundamentalValue,
} from "../utils/fundamentalsFormatters";

function buildAsOfTitle(field) {
  if (!field?.asOf) return field?.source ?? "";
  try {
    const dt = new Date(field.asOf);
    return `${field.source} — ${dt.toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" })}`;
  } catch {
    return field.source ?? "";
  }
}

export default function FundamentalsPanel({ asset }) {
  const [state, setState] = useState({
    symbol: asset?.symbol ?? null,
    status: asset?.symbol ? "loading" : "idle",
    fields: {},
    fetchedAt: null,
    source: null,
    error: null,
  });

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
          fields: payload.fields,
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

  const renderedFields = FUNDAMENTALS_DEFINITIONS
    .map((definition) => {
      const field = state.fields?.[definition.key];
      if (!field) return null;
      const formatted = formatFundamentalValue(definition.key, field.value);
      if (formatted === null || formatted === undefined) return null;
      return { definition, field, formatted };
    })
    .filter(Boolean);

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5 mt-4" role="region" aria-label="Données fondamentales">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Données fondamentales</span>
        </div>
        {state.status === "ready" && state.fetchedAt && (
          <span className="text-[11px] text-slate-500" title={`Récupéré le ${new Date(state.fetchedAt).toLocaleString("fr-CA")}`}>
            {state.source ?? "finnhub.io"}
          </span>
        )}
      </div>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 min-h-[80px]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Chargement des fondamentaux
        </div>
      )}

      {state.status === "error" && (
        <div className="text-sm text-amber-400">
          Fondamentaux indisponibles pour le moment.
          <div className="text-xs text-slate-500 mt-1">Aucune valeur n'est affichée pour éviter de présenter une donnée non vérifiée.</div>
        </div>
      )}

      {state.status === "ready" && renderedFields.length === 0 && (
        <div className="text-sm text-slate-400">
          Aucun fondamental publié par Finnhub pour {asset?.symbol}.
          <div className="text-xs text-slate-500 mt-1">Les non-US sont souvent absents du plan gratuit ; un repli Twelve Data est prévu en V2.</div>
        </div>
      )}

      {state.status === "ready" && renderedFields.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {renderedFields.map(({ definition, field, formatted }) => (
            <div key={definition.key} title={definition.hint}>
              <div className="text-[11px] text-slate-500">{definition.label}</div>
              <div className="text-sm font-semibold text-white">{formatted}</div>
              <div
                className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-500"
                title={buildAsOfTitle(field)}
              >
                <span className="px-1.5 py-0.5 rounded bg-surface-900 border border-white/5">
                  {field.source}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
