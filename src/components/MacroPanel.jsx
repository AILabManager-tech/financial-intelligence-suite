import { useEffect, useState } from "react";
import { Landmark, RefreshCw } from "lucide-react";
import { fetchMacroIndicators } from "../services/macro";

function formatValue(value, unit) {
  if (!Number.isFinite(Number(value))) return "n/d";
  return `${Number(value).toFixed(2)}${unit === "%" ? " %" : ""}`;
}

export default function MacroPanel() {
  const [state, setState] = useState({ status: "loading", indicators: [], source: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    fetchMacroIndicators({ signal: controller.signal })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setState({ status: "ready", indicators: payload.indicators, source: payload.source, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === "AbortError") return;
        setState({ status: "error", indicators: [], source: null, error: error.message });
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="Indicateurs macroéconomiques">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Macro — taux & courbe</span>
        </div>
        {state.status === "ready" && state.source && <span className="text-[11px] text-slate-500">{state.source}</span>}
      </div>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 min-h-[60px]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" /> Chargement
        </div>
      )}
      {state.status === "error" && (
        <div className="text-sm text-amber-400">
          Indicateurs macro indisponibles — {state.error}
          <div className="text-xs text-slate-500 mt-1">Configurer FRED_API_KEY (gratuit) pour activer les données FRED.</div>
        </div>
      )}
      {state.status === "ready" && state.indicators.length === 0 && (
        <div className="text-sm text-slate-400">Aucun indicateur macro disponible.</div>
      )}
      {state.status === "ready" && state.indicators.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {state.indicators.map((ind) => (
              <div key={ind.id} className="rounded-lg bg-surface-900 border border-white/5 p-2">
                <div className="text-[11px] text-slate-500">{ind.label}</div>
                <div className="text-lg font-bold text-white">{formatValue(ind.value, ind.unit)}</div>
                <div className="text-[10px] text-slate-600">{ind.date}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-slate-500">Dernier point publié, agrégé via FRED (taux US/Canada, inflation IPC sur 1 an calculée par FRED). Donnée factuelle, pas un conseil.</div>
        </>
      )}
    </div>
  );
}
