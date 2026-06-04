import { useState } from "react";
import { FlaskConical, Database, Eraser } from "lucide-react";
import { applyDemoSeedResolved, resetDemoSeed } from "../seed/seedRunner";
import { fetchPriceHistory } from "../services/priceHistory";

// DEV-only tool: inject / remove fake demo portfolios to exercise the UI.
// Rendered only under import.meta.env.DEV (hidden in production). Writing to
// localStorage does not update React state, so we reload after seeding.
export default function DemoSeedPanel() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Profiles that omit a transaction price get it filled from real history
  // (free-tier coverage; uncovered dates simply drop). 1825 days = max reach.
  const seedFetchHistory = (symbol) => fetchPriceHistory(symbol, { days: 1825 });

  const run = async (action, label) => {
    setBusy(true);
    try {
      const ids = await action();
      setMessage(`${ids.length} portefeuille(s) de démo ${label}. Rechargement…`);
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setBusy(false);
      setMessage(`Échec : ${error.message}`);
    }
  };

  return (
    <section
      aria-label="Outils de développement — données de démo"
      className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-amber-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-amber-200 uppercase tracking-wide">
          Démo (développement)
        </h3>
      </div>
      <p className="text-[11px] text-slate-400">
        Injecte de faux portefeuilles (profils réalistes + cas limites) pour tester l'interface
        selon le type de client. Outil de développement — invisible en production, n'impacte jamais
        tes portefeuilles réels (taggés à part).
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => applyDemoSeedResolved({ fetchHistory: seedFetchHistory }), "chargé(s)")}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50 cursor-pointer text-xs font-medium"
        >
          <Database className="w-3.5 h-3.5" aria-hidden="true" />
          Charger profils démo
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(resetDemoSeed, "retiré(s)")}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-800 border border-white/5 text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-50 cursor-pointer text-xs font-medium"
        >
          <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
          Effacer la démo
        </button>
        {message && <span className="text-[11px] text-amber-300">{message}</span>}
      </div>
    </section>
  );
}
