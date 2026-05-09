import { Activity, Clock, Database, ShieldCheck } from "lucide-react";

export default function SafetyBadge({ assets }) {
  const liveQuotes = assets.filter((asset) => asset.marketData?.status === "live").length;
  const sources = Array.from(new Set(assets.map((asset) => asset.marketData?.source).filter(Boolean)));
  const latestFetch = assets
    .map((asset) => asset.marketData?.fetchedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Provenance & Fiabilité</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">Quotes</span>
          </div>
          <div className="text-sm font-semibold text-emerald-400">{liveQuotes}/{assets.length} reçues</div>
          <div className="text-[11px] text-slate-500 mt-1">Aucune donnée statique affichée</div>
        </div>

        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400">Sources</span>
          </div>
          <div className="text-sm font-semibold text-blue-400">{sources.join(", ") || "n/d"}</div>
          <div className="text-[11px] text-slate-500 mt-1">Source visible par actif</div>
        </div>

        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-slate-400">Dernière requête</span>
          </div>
          <div className="text-sm font-semibold text-violet-400">
            {latestFetch ? new Date(latestFetch).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" }) : "n/d"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Horodatage API local</div>
        </div>

        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">Mode</span>
          </div>
          <div className="text-sm font-semibold text-emerald-400">Factuel</div>
          <div className="text-[11px] text-slate-500 mt-1">Mock masqué hors chargement</div>
        </div>
      </div>
    </div>
  );
}
