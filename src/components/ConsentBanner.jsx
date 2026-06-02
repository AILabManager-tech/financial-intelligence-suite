import { ShieldCheck } from "lucide-react";

// Privacy consent banner (P8.5 — Loi 25). Presentational: visibility and
// persistence live in App via consentStore. Hidden on print. Frozen FIS palette.
export default function ConsentBanner({ open, onAccept, onLearnMore }) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Avis de confidentialité"
      aria-modal="false"
      className="fixed bottom-0 inset-x-0 z-[60] p-3 sm:p-4 print:hidden"
    >
      <div className="max-w-3xl mx-auto rounded-xl bg-surface-900 border border-white/10 shadow-2xl shadow-black/40 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" aria-hidden="true" />
        <p className="text-xs text-slate-300 flex-1">
          Tes données de portefeuille restent dans ce navigateur (stockage local) — aucun compte, aucun pistage, aucune
          publicité. Seuls les symboles boursiers consultés sont transmis aux fournisseurs de données de marché. En
          continuant, tu reconnais la{" "}
          <button type="button" onClick={onLearnMore} className="text-violet-300 underline hover:text-violet-200 cursor-pointer">
            politique de confidentialité
          </button>
          .
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onLearnMore}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer"
          >
            En savoir plus
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold cursor-pointer"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
}
