export function getScoreLabel(score) {
  if (score >= 90) return "Opportunité Forte";
  if (score >= 75) return "Opportunité Modérée";
  if (score >= 60) return "Surveiller";
  if (score >= 40) return "Prudence";
  return "Risque Élevé";
}

export function getScoreColor(score) {
  if (score >= 90) return { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", ring: "#34d399" };
  if (score >= 75) return { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", ring: "#60a5fa" };
  if (score >= 60) return { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30", ring: "#fbbf24" };
  if (score >= 40) return { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30", ring: "#fb923c" };
  return { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30", ring: "#fb7185" };
}

export function formatCurrency(value, currency = "USD") {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}Mds`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export function formatPercent(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function confidenceToText(confidence) {
  if (confidence >= 0.9) return "Confiance très élevée";
  if (confidence >= 0.8) return "Confiance élevée";
  if (confidence >= 0.7) return "Confiance modérée";
  if (confidence >= 0.5) return "Confiance faible";
  return "Incertain";
}

export function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}
