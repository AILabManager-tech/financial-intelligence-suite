// Attribution note for the benchmark price leg of the comparison panels.
//
// The benchmark panels fetch a SPY/QQQ/DIA price series from /api/history
// (twelvedata.com) and present the portfolio's excess return, beta or ratios
// against it. SeriesProvenanceNote covers the PORTFOLIO value series, but the
// benchmark price leg was silent: an "excess +32% vs S&P 500" shown in a client
// meeting under AMF accountability is an unsourced claim unless the planner can
// name where the benchmark price came from and as of when. This note names it.
// Neutral attribution (slate), not a caveat (amber) — the benchmark price is
// factual, it just needs to be sourced like every other value.
function formatDate(value) {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("fr-CA", { dateStyle: "medium" });
}

export default function BenchmarkSourceNote({ label, source, points = [], fetchedAt, className = "" }) {
  if (!source) return null;

  // As-of = the most recent close in the series (ISO YYYY-MM-DD sorts
  // chronologically), which is what the figures actually reflect — more honest
  // than the fetch time and independent of the series' order.
  const lastDate = Array.isArray(points)
    ? points.reduce((max, p) => (p?.date && p.date > max ? p.date : max), "")
    : "";
  const asOf = formatDate(lastDate);
  const title = fetchedAt ? `Récupéré le ${new Date(fetchedAt).toLocaleString("fr-CA")}` : undefined;

  return (
    <p className={`text-[11px] text-slate-500 mt-2 ${className}`} title={title}>
      Prix {label} : <span className="font-medium text-slate-400">{source}</span>
      {asOf ? ` — série jusqu'au ${asOf}` : ""}
    </p>
  );
}
