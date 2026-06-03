import { FlaskConical } from "lucide-react";

// Honest, single label for the whole performance surface when the active mandate
// is a demo whose value series is RECONSTITUTED (not real accrued market data).
// Renders nothing otherwise — so it never appears on a real portfolio.
export default function ReconstructedSnapshotsBanner({ active }) {
  if (!active) return null;

  return (
    <section
      aria-label="Avertissement données de démo"
      className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] px-4 py-2.5 flex items-start gap-2.5"
    >
      <FlaskConical className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-[11px] leading-relaxed text-amber-200/90">
        <span className="font-semibold text-amber-200">Portefeuille de démo — performance reconstituée.</span>{" "}
        Les courbes de performance (TWR, risque, ratios…) sont calculées sur une série de
        valeurs <span className="font-medium">reconstituée</span> à partir des transactions du
        portefeuille et de prix de référence statiques, <span className="font-medium">pas</span> sur
        de vraies données de marché accumulées. Outil de développement, invisible en production.
      </p>
    </section>
  );
}
