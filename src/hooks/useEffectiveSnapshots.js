// Which value series should the performance surface DISPLAY?
//
// The real accrued series (one point per day, positions × live quotes) is the
// truth — but it is empty right after a broker-statement import (P3.4) and takes
// days to build two points. So at cold start we fall back to a FACTUAL series
// reconstructed from the journal × real historical closes (reconstructSnapshots),
// tagged `reconstructed: true` so the UI can label it.
//
// Rule: the real accrued series wins as soon as it has ≥ 2 usable points (no
// mixing). Reconstruction is DISPLAY-ONLY — this hook never mutates or persists
// the accrued series, so the live accrual keeps working untouched.
//
// Shared by the dashboard (App feeds every performance panel) and the meeting
// brief, so the decision lives in one place.
import { useEffect, useMemo, useState } from "react";
import { reconstructSnapshots } from "../utils/reconstructSnapshots";
import { fetchPriceHistory } from "../services/priceHistory";

const HISTORY_DAYS = 1825; // ~5 ans demandés ; free tier en rend ~18 mois

export function useEffectiveSnapshots(transactions = [], snapshots = []) {
  const [reconstructed, setReconstructed] = useState(null);
  // asOf ancré une seule fois (init paresseux) → stable, pas de refetch au render.
  const [asOf] = useState(() => new Date().toISOString());

  // Symboles présents dans le journal (buy/sell) — la reconstruction est pilotée
  // par le journal, pas par les positions courantes : un import de relevé (P3.4)
  // crée des transactions sans positions, et un titre revendu doit quand même
  // être valorisé les jours où il était détenu. Clé stable → pas de refetch au tick.
  const symbolsKey = useMemo(
    () =>
      [
        ...new Set(
          (Array.isArray(transactions) ? transactions : [])
            .filter((t) => (t?.type === "buy" || t?.type === "sell") && t?.symbol)
            .map((t) => String(t.symbol).trim().toUpperCase()),
        ),
      ]
        .sort()
        .join(","),
    [transactions],
  );

  const hasRealSeries = useMemo(
    () => (Array.isArray(snapshots) ? snapshots.filter((s) => Number.isFinite(Number(s?.totalMarketValue))).length : 0) >= 2,
    [snapshots],
  );

  useEffect(() => {
    if (hasRealSeries || !symbolsKey) return undefined; // relevés réels suffisants, ou rien à valoriser
    const controller = new AbortController();
    const list = symbolsKey.split(",");
    Promise.allSettled(list.map((symbol) => fetchPriceHistory(symbol, { days: HISTORY_DAYS })))
      .then((settled) => {
        if (controller.signal.aborted) return;
        const historyBySymbol = {};
        settled.forEach((outcome, index) => {
          if (outcome.status === "fulfilled") historyBySymbol[list[index]] = outcome.value.points;
        });
        setReconstructed(reconstructSnapshots({ transactions, historyBySymbol, asOf }));
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setReconstructed(null);
      });
    return () => controller.abort();
  }, [symbolsKey, transactions, hasRealSeries, asOf]);

  return hasRealSeries ? snapshots : reconstructed ?? snapshots;
}
