import { useEffect, useMemo, useState } from "react";
import { Landmark, RefreshCw } from "lucide-react";
import { fetchDividends } from "../services/dividends";
import { parseSymbolExchange } from "../utils/symbolExchange";
import { aggregateUsWithholding, ACCOUNT_LABEL } from "../utils/usWithholding";

// US dividend withholding panel (P5.5 unblock). Applies the published Canada-US
// treaty rule (15%, with RRSP exempt and TFSA non-recoverable) to the REAL
// trailing-12-month declared dividends of the mandate's held US-source
// positions. Factuality: amounts are real dividends × the published rate, the
// gross is a trailing-12-month figure on the current position (an estimate of
// forward income, labelled as such), holdings without dividend data contribute
// nothing (never fabricated). Not tax advice. Frozen FIS palette only.

function heldUsHoldings(assets) {
  const out = [];
  for (const asset of Array.isArray(assets) ? assets : []) {
    const symbol = String(asset?.symbol ?? "").trim().toUpperCase();
    const quantity = Number(asset?.position?.quantity);
    const price = Number(asset?.price);
    if (!symbol || !(quantity > 0) || !(price > 0)) continue;
    if (parseSymbolExchange(symbol).country !== "US") continue;
    out.push({ symbol, quantity });
  }
  return out;
}

// Trailing-12-month gross dividend per share from declared items (same window
// idiom as DividendHistoryPanel). Returns 0 when there is nothing in the window.
function trailingGrossPerShare(items, sinceIso) {
  if (!Array.isArray(items)) return 0;
  return items
    .filter((i) => typeof i?.exDate === "string" && i.exDate >= sinceIso)
    .reduce((acc, i) => acc + (Number.isFinite(i.amount) ? i.amount : 0), 0);
}

function money(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function WithholdingTaxPanel({ assets = [], accountType = "taxable" }) {
  const usHoldings = useMemo(() => heldUsHoldings(assets), [assets]);
  const symbols = usHoldings.map((h) => h.symbol);
  const symbolsKey = symbols.join(",");
  // Re-key on the symbol SET + account type only (not on every quote tick).
  const stateKey = `${accountType}|${symbolsKey}`;

  const [state, setState] = useState({ key: null, status: "idle", agg: null, covered: 0, total: 0 });

  if (symbols.length > 0 && state.key !== stateKey) {
    setState({ key: stateKey, status: "loading", agg: null, covered: 0, total: symbols.length });
  }

  useEffect(() => {
    const list = symbolsKey ? symbolsKey.split(",") : [];
    if (list.length === 0) return undefined;

    const controller = new AbortController();
    const since = new Date();
    since.setUTCFullYear(since.getUTCFullYear() - 1);
    const sinceIso = since.toISOString().slice(0, 10);
    const qtyBySymbol = Object.fromEntries(usHoldings.map((h) => [h.symbol, h.quantity]));

    Promise.allSettled(list.map((symbol) => fetchDividends(symbol, { signal: controller.signal })))
      .then((settled) => {
        if (controller.signal.aborted) return;
        let covered = 0;
        const holdings = [];
        settled.forEach((outcome, index) => {
          const symbol = list[index];
          if (outcome.status !== "fulfilled") return;
          covered += 1;
          const perShare = trailingGrossPerShare(outcome.value.items, sinceIso);
          const gross = perShare * (qtyBySymbol[symbol] ?? 0);
          if (gross > 0) holdings.push({ symbol, gross });
        });
        setState({
          key: stateKey,
          status: "ready",
          agg: aggregateUsWithholding(holdings, accountType),
          covered,
          total: list.length,
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState({ key: stateKey, status: "error", agg: null, covered: 0, total: list.length });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey]);

  const { status, agg, covered, total } = state;

  return (
    <div className="animate-slide-up" role="region" aria-label="Retenue fiscale US sur dividendes">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Landmark className="w-5 h-5 text-blue-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-white">Retenue US sur dividendes</h2>
        <span className="ml-auto text-xs text-slate-500">{ACCOUNT_LABEL[accountType] ?? accountType}</span>
      </div>

      {symbols.length === 0 ? (
        <p className="text-xs text-slate-500">
          Aucune position cotée aux États-Unis détenue — la retenue US apparaîtra dès qu'un titre US versant dividende sera au portefeuille.
        </p>
      ) : status === "loading" || status === "idle" ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-6">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Calcul de la retenue sur {symbols.length} position{symbols.length > 1 ? "s" : ""} US
        </div>
      ) : status === "error" ? (
        <div className="py-4">
          <div className="text-sm font-medium text-amber-400">Données de dividendes indisponibles</div>
          <div className="text-xs text-slate-500 mt-1">
            Les montants sont masqués pour éviter d'afficher des valeurs simulées.
          </div>
        </div>
      ) : !agg?.hasData ? (
        <div className="py-2">
          <p className="text-sm text-slate-300">{agg?.treatment?.note}</p>
          <p className="text-xs text-slate-500 mt-2">
            Aucun dividende US déclaré sur les 12 derniers mois pour les {total} position{total > 1 ? "s" : ""} US détenue{total > 1 ? "s" : ""}.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
              <div className="text-xs text-slate-400 mb-1">Dividendes US bruts</div>
              <div className="text-xl font-bold text-white">{money(agg.totalGross)}</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
              <div className="text-xs text-slate-400 mb-1">Retenue ({Math.round(agg.treatment.rate * 100)} %)</div>
              <div className={`text-xl font-bold ${agg.totalWithheld > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {money(agg.totalWithheld)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
              <div className="text-xs text-slate-400 mb-1">Net encaissé</div>
              <div className="text-xl font-bold text-emerald-400">{money(agg.totalNet)}</div>
            </div>
          </div>

          <p className="text-xs text-slate-300 mb-3">{agg.treatment.note}</p>

          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-surface-800/80">
                  <th className="px-4 py-2">Titre</th>
                  <th className="px-4 py-2 text-right">Brut</th>
                  <th className="px-4 py-2 text-right">Retenue</th>
                  <th className="px-4 py-2 text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {agg.holdings.map((row) => (
                  <tr key={row.symbol} className="bg-surface-900/60">
                    <td className="px-4 py-2 font-semibold text-white">{row.symbol}</td>
                    <td className="px-4 py-2 text-right text-slate-200">{money(row.gross)}</td>
                    <td className="px-4 py-2 text-right text-rose-300">{money(row.withheld)}</td>
                    <td className="px-4 py-2 text-right text-emerald-300">{money(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-500 mt-3">
            Montants en USD, sur la base des dividendes US réellement déclarés des 12 derniers mois appliqués à la position actuelle (estimation du revenu à venir, {covered}/{total} positions couvertes). Retenue selon le traité fiscal Canada-US. Pas un conseil fiscal.
          </p>
        </>
      )}
    </div>
  );
}
