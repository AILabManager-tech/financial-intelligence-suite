import { FlaskConical, LineChart } from "lucide-react";

// État vide prospect-facing : un visiteur sans position peut charger UN seul
// portefeuille d'exemple étiqueté (Gear Code 2015-2022, simulé) en un clic.
// Factualité : le libellé dit explicitement « simulé » et que ce ne sont pas des
// données réelles ni un conseil ; une fois chargé, la bannière démo + les notes
// de provenance par panel le rappellent dans le tableau de bord. Le jeu complet
// de démos + reset reste dev-only (SettingsPage), jamais exposé ici.
export default function SamplefolioEmptyState({ onLoad }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-slide-up">
      <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mb-4">
        <LineChart className="w-7 h-7 text-violet-400" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Aucune position pour l'instant</h3>
      <p className="text-sm text-slate-400 max-w-md mb-5">
        Importe un relevé de transactions, ajoute des positions manuellement, ou
        charge un portefeuille d'exemple pour explorer la suite avec des données.
      </p>
      <button
        type="button"
        onClick={onLoad}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-200 hover:bg-violet-500/25 cursor-pointer text-sm font-medium"
      >
        <FlaskConical className="w-4 h-4" aria-hidden="true" />
        Charger un portefeuille d'exemple (simulé)
      </button>
      <p className="text-[11px] text-slate-500 max-w-md mt-3">
        Simulation « Gear Code » 2015-2022 : prix synthétiques calibrés, série
        reconstituée à des fins d'illustration. Ce ne sont pas des données de
        marché réelles, ni un conseil financier.
      </p>
    </div>
  );
}
