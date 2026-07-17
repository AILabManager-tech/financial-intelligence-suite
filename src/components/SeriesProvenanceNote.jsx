// Per-panel factual-basis note for the performance panels.
//
// The dashboard shows a top banner when the value series is reconstructed, but a
// planner may look at (or screenshot) a single panel in isolation — and under
// AMF accountability must never present a reconstructed figure as an accrued
// track record. So each performance panel that derives from the value series
// carries its own note: when the series is RECONSTRUCTED (journal × real
// historical closes, cold start) rather than accrued day by day, it says so
// right there. Silent when the series is real accrued — nothing to disclose.
export default function SeriesProvenanceNote({ snapshots = [], className = "" }) {
  const reconstructed = Array.isArray(snapshots) && snapshots.some((s) => s?.reconstructed);
  if (!reconstructed) return null;

  return (
    <p className={`text-[11px] text-amber-300/90 mt-2 ${className}`}>
      Série de valeurs <span className="font-medium">reconstruite</span> à partir du journal de transactions
      et des clôtures historiques réelles (aucun relevé accumulé au jour le jour) — factuelle mais rétrospective.
    </p>
  );
}
