import { ShieldCheck, Lock, Activity, Database, Clock } from "lucide-react";
import { timeAgo } from "../utils/scoreTranslator";

export default function SafetyBadge({ health, assets }) {
  const allVerified = assets.every((a) => a.integrity.verified);
  const passRate = `${health.integrityPassed}/${health.integrityChecks}`;

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Intégrité & Fiabilité</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Données certifiées */}
        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Lock className={`w-4 h-4 ${allVerified ? "text-emerald-400" : "text-amber-400"}`} />
            <span className="text-xs text-slate-400">Données</span>
          </div>
          <div className={`text-sm font-semibold ${allVerified ? "text-emerald-400" : "text-amber-400"}`}>
            {allVerified ? "Certifiées" : "En vérification"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Empreinte numérique vérifiée
          </div>
        </div>

        {/* Contrôles passés */}
        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">Contrôles</span>
          </div>
          <div className="text-sm font-semibold text-emerald-400">{passRate} réussis</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Audit automatique nocturne
          </div>
        </div>

        {/* Sources actives */}
        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400">Analyses</span>
          </div>
          <div className="text-sm font-semibold text-blue-400">
            {health.pipelinesActive} actives
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {health.dataPointsToday.toLocaleString()} points aujourd'hui
          </div>
        </div>

        {/* Dernière mise à jour */}
        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-slate-400">Mise à jour</span>
          </div>
          <div className="text-sm font-semibold text-violet-400">
            {timeAgo(health.lastUpdate)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Rafraîchissement continu
          </div>
        </div>
      </div>
    </div>
  );
}
