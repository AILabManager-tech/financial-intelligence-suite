import { useMemo, useState } from "react";
import { BellPlus, Power, Trash2 } from "lucide-react";

const ALERT_TYPE_OPTIONS = [
  { value: "price_above", label: "Prix ≥ seuil (USD)", needsSymbol: true, unit: "USD" },
  { value: "price_below", label: "Prix ≤ seuil (USD)", needsSymbol: true, unit: "USD" },
  { value: "change_pct_above", label: "Variation ≥ seuil (%)", needsSymbol: true, unit: "%" },
  { value: "change_pct_below", label: "Variation ≤ seuil (%)", needsSymbol: true, unit: "%" },
  { value: "drift_above", label: "Drift ≥ seuil (pts)", needsSymbol: false, unit: "pts" },
];

function formatTimestamp(iso) {
  if (!iso) return "Jamais déclenchée";
  return `Dernier déclenchement ${new Date(iso).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" })}`;
}

function typeLabel(type) {
  return ALERT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function typeUnit(type) {
  return ALERT_TYPE_OPTIONS.find((option) => option.value === type)?.unit ?? "";
}

export default function AlertManager({
  alerts,
  availableSymbols = [],
  onAddAlert,
  onRemoveAlert,
  onToggleAlert,
}) {
  const [draftType, setDraftType] = useState("price_above");
  const [draftSymbol, setDraftSymbol] = useState("");
  const [draftThreshold, setDraftThreshold] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [error, setError] = useState("");

  const symbols = useMemo(() => Array.from(new Set(availableSymbols)).sort(), [availableSymbols]);
  const currentTypeMeta = ALERT_TYPE_OPTIONS.find((option) => option.value === draftType);

  const handleAdd = (event) => {
    event.preventDefault();
    setError("");

    const threshold = Number(draftThreshold);
    if (!Number.isFinite(threshold)) {
      setError("Seuil numérique requis.");
      return;
    }

    if (currentTypeMeta?.needsSymbol && !draftSymbol) {
      setError("Symbole requis pour ce type d'alerte.");
      return;
    }

    onAddAlert?.({
      symbol: currentTypeMeta?.needsSymbol ? draftSymbol : "",
      type: draftType,
      threshold,
      note: draftNote.trim(),
    });

    setDraftThreshold("");
    setDraftNote("");
  };

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-violet-500/10">
          <BellPlus className="w-5 h-5 text-violet-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-white">Alertes configurables</h2>
        <span className="ml-auto text-xs text-slate-500">
          {alerts.length} alerte{alerts.length > 1 ? "s" : ""} enregistrée{alerts.length > 1 ? "s" : ""}
        </span>
      </div>

      <form
        onSubmit={handleAdd}
        className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 rounded-xl bg-surface-800 border border-white/5 mb-4"
      >
        <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-2">
          Type
          <select
            value={draftType}
            onChange={(event) => setDraftType(event.target.value)}
            className="bg-surface-900 border border-white/5 rounded-lg px-3 py-2 text-sm text-white"
          >
            {ALERT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Symbole
          <select
            value={draftSymbol}
            onChange={(event) => setDraftSymbol(event.target.value)}
            disabled={!currentTypeMeta?.needsSymbol}
            className="bg-surface-900 border border-white/5 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            <option value="">{currentTypeMeta?.needsSymbol ? "— choisir —" : "Portefeuille"}</option>
            {symbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Seuil ({currentTypeMeta?.unit})
          <input
            type="number"
            step="any"
            value={draftThreshold}
            onChange={(event) => setDraftThreshold(event.target.value)}
            className="bg-surface-900 border border-white/5 rounded-lg px-3 py-2 text-sm text-white"
            placeholder="ex. 150"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Note (optionnelle)
          <input
            type="text"
            value={draftNote}
            onChange={(event) => setDraftNote(event.target.value)}
            maxLength={120}
            className="bg-surface-900 border border-white/5 rounded-lg px-3 py-2 text-sm text-white"
            placeholder="contexte"
          />
        </label>

        <div className="md:col-span-5 flex items-center justify-between gap-3">
          {error ? (
            <span className="text-xs text-rose-400">{error}</span>
          ) : (
            <span className="text-xs text-slate-500">
              Les alertes sont évaluées à chaque rafraîchissement des prix.
            </span>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/15 text-violet-200 hover:bg-violet-500/25 cursor-pointer text-sm font-medium"
          >
            <BellPlus className="w-4 h-4" aria-hidden="true" />
            Ajouter
          </button>
        </div>
      </form>

      {!alerts.length ? (
        <div className="p-4 rounded-xl bg-surface-800 border border-white/5 text-sm text-slate-400">
          Aucune alerte configurée. Ajoute un seuil prix, variation ou drift pour recevoir des signaux opérateur.
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={`p-4 rounded-xl border ${alert.enabled ? "bg-surface-800 border-white/5" : "bg-surface-900/60 border-white/5 opacity-70"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {alert.symbol || "Portefeuille"} · {typeLabel(alert.type)}
                  </div>
                  <div className="text-xs text-slate-500">
                    Seuil {alert.threshold} {typeUnit(alert.type)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleAlert?.(alert.id)}
                    className={`p-2 rounded-lg cursor-pointer ${alert.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-surface-800 text-slate-400 hover:text-white"}`}
                    aria-label={alert.enabled ? "Désactiver l'alerte" : "Activer l'alerte"}
                  >
                    <Power className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveAlert?.(alert.id)}
                    className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                    aria-label="Supprimer l'alerte"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-500">{formatTimestamp(alert.lastTriggeredAt)}</div>
              {alert.note && (
                <div className="text-xs text-slate-400 mt-1 italic">« {alert.note} »</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
