import { useMemo } from "react";
import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react";
import { buildOperatorAlerts } from "../utils/operatorAlerts";

function alertTone(level) {
  if (level === "high") return "text-rose-400 bg-rose-500/10";
  if (level === "medium") return "text-amber-400 bg-amber-500/10";
  return "text-slate-400 bg-white/5";
}

function userTriggerToAlert(trigger) {
  return {
    id: `user:${trigger.alertId}:${trigger.triggeredAt}`,
    level: trigger.level ?? "medium",
    type: `user_${trigger.type}`,
    symbol: trigger.symbol,
    title: trigger.title ?? "Alerte configurée",
    detail: trigger.detail ?? `${trigger.symbol} a déclenché une alerte`,
  };
}

export default function OperatorAlerts({ assets, userTriggers = [] }) {
  const alerts = useMemo(() => {
    const derived = buildOperatorAlerts(assets);
    const userAlerts = (userTriggers ?? []).map(userTriggerToAlert);
    return [...userAlerts, ...derived];
  }, [assets, userTriggers]);

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <Bell className="w-5 h-5 text-amber-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-white">Alertes opérateur</h2>
        <span className="ml-auto text-xs text-slate-500">{alerts.length} active{alerts.length > 1 ? "s" : ""}</span>
      </div>

      {alerts.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {alerts.slice(0, 6).map((alert) => (
            <div key={alert.id} className="p-4 rounded-xl bg-surface-800 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`p-1.5 rounded-lg ${alertTone(alert.level)}`}>
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-white">{alert.title}</div>
                  <div className="text-[11px] text-slate-500">{alert.symbol}</div>
                </div>
              </div>
              <div className="text-xs text-slate-400">{alert.detail}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-surface-800 border border-white/5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <div>
            <div className="text-sm font-semibold text-white">Aucune alerte active</div>
            <div className="text-xs text-slate-500">Quotes fraîches, variations et allocations dans les seuils actuels.</div>
          </div>
        </div>
      )}
    </div>
  );
}
