import { useState } from "react";
import { HelpCircle } from "lucide-react";

const GLOSSARY = {
  rsi: {
    title: "RSI — Force du marché",
    description: "Le RSI mesure si un actif est suracheté (trop cher) ou survendu (sous-évalué). En dessous de 30, c'est une opportunité d'achat. Au-dessus de 70, la prudence est de mise.",
  },
  macd: {
    title: "MACD — Tendance",
    description: "Le MACD détecte les changements de tendance. Un « croisement haussier » signifie que le prix commence à monter. Un « signal négatif » indique un début de baisse.",
  },
  bollinger: {
    title: "Bandes de Bollinger — Volatilité",
    description: "Les bandes de Bollinger mesurent la volatilité du prix. Quand le prix touche la bande supérieure, l'actif est potentiellement suracheté. Proche de la bande inférieure, il est potentiellement sous-évalué.",
  },
  movingAvg: {
    title: "Moyennes Mobiles",
    description: "La moyenne mobile lisse le prix sur une période donnée. Quand le prix est au-dessus de sa moyenne 50 jours, la tendance est haussière. Un « Golden Cross » est un signal d'achat fort.",
  },
  signalScore: {
    title: "Score Quantitatif",
    description: "Un score de 0 à 100 calculé à partir de tous les indicateurs techniques. Plus le score est élevé, plus les signaux mathématiques sont favorables.",
  },
  confidence: {
    title: "Niveau de Confiance IA",
    description: "Indique à quel point l'intelligence artificielle est sûre de son analyse. « Très élevée » (>90%) signifie que de nombreux facteurs convergent vers la même conclusion.",
  },
  decisionScore: {
    title: "Score IA",
    description: "Note attribuée par l'intelligence artificielle après analyse du contexte global : actualités, tendances sectorielles, sentiment du marché et fondamentaux de l'entreprise.",
  },
  eps: {
    title: "BPA — Bénéfice Par Action",
    description: "Le montant de profit que l'entreprise génère pour chaque action. Plus le BPA est élevé, plus l'entreprise est rentable pour ses actionnaires.",
  },
  netMargin: {
    title: "Marge Nette",
    description: "Le pourcentage de chiffre d'affaires qui devient du profit net. Une marge de 25% signifie que l'entreprise garde 25 centimes de profit pour chaque dollar de vente.",
  },
  revenue: {
    title: "Chiffre d'Affaires",
    description: "Le total des ventes de l'entreprise sur une année. C'est un indicateur de la taille et de la santé commerciale de l'entreprise.",
  },
  growth: {
    title: "Croissance",
    description: "L'évolution du chiffre d'affaires par rapport à l'année précédente. Une croissance positive signifie que l'entreprise se développe.",
  },
  score: {
    title: "Score Global",
    description: "Note de 0 à 100 combinant l'analyse quantitative (chiffres) et l'analyse IA (contexte). Au-dessus de 75, l'actif est considéré comme une bonne opportunité.",
  },
};

export default function Tooltip({ term, children }) {
  const [visible, setVisible] = useState(false);
  const info = GLOSSARY[term];
  if (!info) return children || null;

  return (
    <span
      className="relative inline-flex items-center gap-1 group"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <button
        type="button"
        aria-label={`Explication : ${info.title}`}
        className="inline-flex items-center cursor-help"
        tabIndex={0}
      >
        <HelpCircle className="w-3 h-3 text-slate-500 hover:text-violet-400 transition-colors" />
      </button>
      {visible && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-xl bg-surface-700 border border-white/10 shadow-xl shadow-black/40 z-50 animate-slide-up"
        >
          <div className="text-xs font-semibold text-violet-300 mb-1">{info.title}</div>
          <p className="text-[11px] leading-relaxed text-slate-300">{info.description}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2 h-2 rotate-45 bg-surface-700 border-r border-b border-white/10" />
          </div>
        </div>
      )}
    </span>
  );
}

export { GLOSSARY };
