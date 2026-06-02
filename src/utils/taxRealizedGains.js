// Annual realized gains/losses (P6.2) — the factual core of a T5008 (CA) /
// 1099-B (US) fiscal snapshot. Pure: derives dated disposition events from the
// tax-lot engine and buckets them by the year of the SELL (disposition). No
// network, no new source — built entirely from the transaction journal.
//
// Factuality: per-disposition figures come straight from the lot engine's
// closedLots (proceeds, cost basis, gain) — gross of the sell fee, which the
// engine applies once per sell; we net those fees out at the YEAR level and
// label it. The matching method (FIFO/LIFO) is carried through and labelled —
// it is NOT the Canadian ACB (average-cost) method, so an official T5008 filing
// may differ. Surfaced honestly, never presented as tax advice.
import { applyTransactions } from "./lotEngine";

function yearOf(dateStr) {
  const t = new Date(dateStr);
  const y = t.getUTCFullYear();
  return Number.isFinite(y) ? y : null;
}

function daysBetween(a, b) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Number.isFinite(ms) ? Math.round(ms / 86_400_000) : null;
}

export function computeRealizedGainsByYear(transactions, { method = "fifo" } = {}) {
  const bySymbol = applyTransactions(transactions, { method });

  // Per-year buckets of disposition rows (gross of sell fees).
  const buckets = new Map();
  for (const [symbol, acc] of Object.entries(bySymbol)) {
    for (const lot of acc.closedLots) {
      const year = yearOf(lot.exitDate);
      if (year == null) continue;
      const proceeds = lot.quantity * lot.proceedsPerShare;
      const costBasis = lot.quantity * lot.costPerShare;
      const row = {
        symbol,
        entryDate: lot.entryDate,
        exitDate: lot.exitDate,
        quantity: lot.quantity,
        proceeds,
        costBasis,
        gain: lot.pnl,
        holdingDays: daysBetween(lot.entryDate, lot.exitDate),
      };
      if (!buckets.has(year)) buckets.set(year, []);
      buckets.get(year).push(row);
    }
  }

  // Sell fees per year (the engine charges them once per sell, not per matched
  // lot) — netted out of the year total so it reflects after-fee proceeds.
  const feesByYear = new Map();
  for (const t of Array.isArray(transactions) ? transactions : []) {
    if (t?.type !== "sell") continue;
    const fee = Number(t.fee);
    if (!Number.isFinite(fee) || fee <= 0) continue;
    const year = yearOf(t.date);
    if (year == null) continue;
    feesByYear.set(year, (feesByYear.get(year) ?? 0) + fee);
  }

  const years = [...buckets.entries()]
    .map(([year, dispositions]) => {
      dispositions.sort((a, b) => String(a.exitDate).localeCompare(String(b.exitDate)) || a.symbol.localeCompare(b.symbol));
      const grossGain = dispositions.reduce((s, d) => s + d.gain, 0);
      const proceeds = dispositions.reduce((s, d) => s + d.proceeds, 0);
      const costBasis = dispositions.reduce((s, d) => s + d.costBasis, 0);
      const sellFees = feesByYear.get(year) ?? 0;
      return {
        year,
        dispositions,
        proceeds,
        costBasis,
        grossGain,
        sellFees,
        netGain: grossGain - sellFees,
        gainCount: dispositions.filter((d) => d.gain > 0).length,
        lossCount: dispositions.filter((d) => d.gain < 0).length,
      };
    })
    .sort((a, b) => b.year - a.year);

  return { method, years, hasData: years.length > 0 };
}

const CSV_COLUMNS = ["year", "symbol", "acquired", "disposed", "quantity", "proceeds", "costBasis", "gain", "holdingDays"];

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

// Flat CSV, one row per disposition (T5008/1099-B style: proceeds, cost base,
// gain per disposed lot). Pure — the panel pairs it with downloadTextFile.
export function buildRealizedGainsCsv(report) {
  const rows = [];
  for (const y of report?.years ?? []) {
    for (const d of y.dispositions) {
      rows.push({
        year: y.year,
        symbol: d.symbol,
        acquired: d.entryDate,
        disposed: d.exitDate,
        quantity: d.quantity,
        proceeds: d.proceeds.toFixed(2),
        costBasis: d.costBasis.toFixed(2),
        gain: d.gain.toFixed(2),
        holdingDays: d.holdingDays,
      });
    }
  }
  return [
    CSV_COLUMNS.join(","),
    ...rows.map((row) => CSV_COLUMNS.map((c) => csvCell(row[c])).join(",")),
  ].join("\n");
}
