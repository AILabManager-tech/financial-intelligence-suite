import { FlaskConical, History } from "lucide-react";

// Honest, single label for the whole performance surface when the displayed value
// series is RECONSTRUCTED rather than accrued day by day. Two variants, because
// the two reconstructions are factually different:
//   - "demo"    : demo mandate, series built from static reference prices. Shown
//                 for the dev demo set AND the prospect-facing Gear Code sample
//                 loadable in prod — so the copy must not claim "dev-only".
//   - "journal" : real mandate cold start, series built from the transaction
//                 journal × REAL historical closes — factual, and visible in prod.
// Renders nothing when inactive.
const VARIANTS = {
  demo: {
    icon: FlaskConical,
    label: "Portefeuille de démo — performance reconstituée.",
    body: (
      <>
        Les courbes de performance (TWR, risque, ratios…) sont calculées sur une série de
        valeurs <span className="font-medium">reconstituée</span> à partir des transactions du
        portefeuille et de prix de référence statiques, <span className="font-medium">pas</span> sur
        de vraies données de marché accumulées — à des fins d'illustration, jamais un conseil.
      </>
    ),
  },
  journal: {
    icon: History,
    label: "Performance reconstruite à partir du journal.",
    body: (
      <>
        Aucun relevé de valeur n'a encore été accumulé pour ce mandat. Les courbes (TWR, risque,
        ratios…) sont calculées sur une série <span className="font-medium">reconstruite</span> à
        partir du journal de transactions et des <span className="font-medium">clôtures historiques
        réelles</span> — factuelle, mais rétrospective. Elles basculeront sur les relevés accumulés
        au jour le jour dès qu'il y en aura assez.
      </>
    ),
  },
};

export default function ReconstructedSnapshotsBanner({ active, variant = "demo" }) {
  if (!active) return null;

  const { icon: Icon, label, body } = VARIANTS[variant] ?? VARIANTS.demo;

  return (
    <section
      aria-label="Avertissement performance reconstruite"
      className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] px-4 py-2.5 flex items-start gap-2.5"
    >
      <Icon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-[11px] leading-relaxed text-amber-200/90">
        <span className="font-semibold text-amber-200">{label}</span> {body}
      </p>
    </section>
  );
}
