import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { fetchMarketDataHealth } from "../services/marketDataHealth";

const statusLabels = {
  ok: "OK",
  partial: "Partiel",
  degraded: "Dégradé",
  down: "Hors ligne",
  missing_config: "Clé absente",
};

function statusTone(status) {
  if (status === "ok") return "text-emerald-400";
  if (status === "missing_config" || status === "partial") return "text-amber-400";
  return "text-rose-400";
}

function StatusIcon({ status }) {
  if (status === "ok") {
    return <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />;
  }

  if (status === "missing_config" || status === "partial") {
    return <AlertTriangle className="w-4 h-4 text-amber-400" aria-hidden="true" />;
  }

  return <AlertTriangle className="w-4 h-4 text-rose-400" aria-hidden="true" />;
}

export default function MarketDataHealthPanel() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = () => {
    setLoading(true);
    fetchMarketDataHealth()
      .then(setHealth)
      .catch((error) => {
        setHealth({
          status: "down",
          checkedAt: new Date().toISOString(),
          providers: [],
          error: error.message,
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;

    fetchMarketDataHealth()
      .then((payload) => {
        if (active) setHealth(payload);
      })
      .catch((error) => {
        if (active) {
          setHealth({
            status: "down",
            checkedAt: new Date().toISOString(),
            providers: [],
            error: error.message,
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const providers = health?.providers ?? [];

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Activity className="w-5 h-5 text-blue-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-white">État fournisseurs</h2>
        <span className={`ml-auto text-xs font-medium ${statusTone(health?.status)}`}>
          {statusLabels[health?.status] ?? "Vérification"}
        </span>
        <button
          type="button"
          onClick={loadHealth}
          disabled={loading}
          className="p-2 rounded-lg bg-surface-800 text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-50 cursor-pointer"
          aria-label="Rafraîchir l'état des fournisseurs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {providers.map((provider) => (
          // Key by provider + capability: a single provider (e.g. finnhub.io)
          // exposes several capabilities (quote, fundamentals, news), so the
          // provider name alone is not unique across rows.
          <div key={`${provider.provider}-${provider.capability}`} className="p-4 rounded-xl bg-surface-800 border border-white/5">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <StatusIcon status={provider.status} />
                <span className="text-sm font-semibold text-white">{provider.provider}</span>
              </div>
              <span className={`text-xs font-medium ${statusTone(provider.status)}`}>
                {statusLabels[provider.status] ?? provider.status}
              </span>
            </div>
            <div className="text-xs text-slate-400">{provider.capability}</div>
            <div className="text-[11px] text-slate-500 mt-2">
              {provider.latencyMs !== undefined ? `${provider.latencyMs} ms` : "Non testé"} · {provider.sample ?? "n/d"}
            </div>
            {provider.error && (
              <div className="text-[11px] text-rose-400 mt-2 truncate" title={provider.error}>
                {provider.error}
              </div>
            )}
          </div>
        ))}

        {!providers.length && (
          <div className="md:col-span-3 p-4 rounded-xl bg-surface-800 border border-white/5 text-sm text-slate-400">
            {loading ? "Vérification des fournisseurs..." : health?.error ?? "Aucun fournisseur vérifié."}
          </div>
        )}
      </div>

      {health?.checkedAt && (
        <div className="text-[11px] text-slate-600 mt-3">
          Vérifié {new Date(health.checkedAt).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" })}
          {health.cache?.status === "hit" ? " · cache" : ""}
        </div>
      )}
    </div>
  );
}
