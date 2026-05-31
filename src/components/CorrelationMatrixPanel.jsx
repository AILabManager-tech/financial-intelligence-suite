import { useEffect, useMemo, useState } from "react";
import { Grid3x3, RefreshCw } from "lucide-react";
import { fetchPriceHistory } from "../services/priceHistory";
import { computeMonthlyReturns } from "../utils/returnsCalculator";
import { computeCorrelationMatrix } from "../utils/correlationMatrix";

// Matrice de corrélation des positions (P5.x). Feature de catalogue du tableau
// de bord, dérivée des mêmes séries de prix factuelles (/api/history) que les
// panels de rendements — aucune nouvelle source serveur. Complète la
// concentration (P5.8) : deux titres de faible poids peuvent bouger à
// l'unisson, donc le portefeuille est moins diversifié que les poids le
// laissent croire. Factualité : cellule masquée si overlap insuffisant, jamais
// de corrélation inventée. « Pas un conseil ».

const HISTORY_DAYS = 1825;
const MAX_SYMBOLS = 10; // borne le nombre de fetchs et garde la grille lisible

function heldSymbols(assets) {
  const seen = new Set();
  const out = [];
  for (const asset of Array.isArray(assets) ? assets : []) {
    const symbol = String(asset?.symbol ?? "").trim().toUpperCase();
    if (symbol && !seen.has(symbol)) {
      seen.add(symbol);
      out.push(symbol);
    }
  }
  return out;
}

function formatCorr(value) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(2).replace(".", ",");
}

function cellTone(value) {
  if (value == null) return "bg-surface-900 text-slate-600";
  if (value >= 0.7) return "bg-rose-500/25 text-rose-200";
  if (value >= 0.3) return "bg-amber-500/20 text-amber-200";
  if (value > -0.3) return "bg-emerald-500/15 text-emerald-200";
  return "bg-blue-500/20 text-blue-200";
}

function avgTone(value) {
  if (value == null) return "text-slate-500";
  if (value >= 0.7) return "text-rose-400";
  if (value >= 0.3) return "text-amber-300";
  return "text-emerald-400";
}

function Tile({ label, value, tone }) {
  const shown = value ?? "—";
  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${shown === "—" ? "text-slate-500" : tone ?? "text-white"}`}>
        {shown}
      </div>
    </div>
  );
}

export default function CorrelationMatrixPanel({ assets = [] }) {
  const allSymbols = useMemo(() => heldSymbols(assets), [assets]);
  const symbols = allSymbols.slice(0, MAX_SYMBOLS);
  const truncated = allSymbols.length > MAX_SYMBOLS;
  // Clé stable : l'effet ne refetch que si l'ENSEMBLE de symboles change, pas à
  // chaque nouveau rendu de `assets` (les ticks de cotation en recréent la
  // référence toutes les 20 s — sans cette clé, on refetcherait tout l'historique).
  const symbolsKey = symbols.join(",");

  const [state, setState] = useState({ key: null, status: "loading", result: null, total: 0 });

  // Reset to loading synchronously when the symbol SET changes (render-phase
  // adjustment — same idiom as the asset panels; satisfies the lint rule against
  // setState inside an effect body and avoids rendering a stale frame).
  if (symbols.length >= 2 && state.key !== symbolsKey) {
    setState({ key: symbolsKey, status: "loading", result: null, total: symbols.length });
  }

  useEffect(() => {
    const list = symbolsKey ? symbolsKey.split(",") : [];
    if (list.length < 2) return undefined; // chemin état-vide : aucun fetch

    const controller = new AbortController();

    Promise.allSettled(list.map((symbol) => fetchPriceHistory(symbol, { days: HISTORY_DAYS })))
      .then((settled) => {
        if (controller.signal.aborted) return;
        const seriesBySymbol = {};
        settled.forEach((outcome, index) => {
          if (outcome.status === "fulfilled") {
            seriesBySymbol[list[index]] = computeMonthlyReturns(outcome.value.points);
          }
        });
        const result = computeCorrelationMatrix(seriesBySymbol);
        if (!result.hasData) {
          setState({ key: symbolsKey, status: "error", result: null, total: list.length });
          return;
        }
        setState({ key: symbolsKey, status: "ready", result, total: list.length });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState({ key: symbolsKey, status: "error", result: null, total: list.length });
      });

    return () => controller.abort();
  }, [symbolsKey]);

  const { status, result, total } = state;

  return (
    <div className="animate-slide-up" role="region" aria-label="Matrice de corrélation des positions">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-violet-500/10">
          <Grid3x3 className="w-5 h-5 text-violet-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-white">Corrélation des positions</h2>
      </div>

      {symbols.length < 2 ? (
        <p className="text-xs text-slate-500">
          Au moins deux positions sont nécessaires pour calculer une matrice de corrélation.
        </p>
      ) : status === "loading" ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-6">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Calcul des corrélations sur {symbols.length} positions
        </div>
      ) : status === "error" || !result ? (
        <div className="py-4">
          <div className="text-sm font-medium text-amber-400">Matrice de corrélation indisponible</div>
          <div className="text-xs text-slate-500 mt-1">
            Pas assez d'historique chevauchant entre les positions. Les corrélations sont masquées pour éviter
            d'afficher des valeurs simulées.
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Tile
              label="Corrélation moyenne"
              value={result.pairsComputed > 0 ? formatCorr(result.averageCorrelation) : null}
              tone={avgTone(result.averageCorrelation)}
            />
            <Tile
              label="Paire la plus corrélée"
              value={
                result.mostCorrelated
                  ? `${result.mostCorrelated.a}–${result.mostCorrelated.b} · ${formatCorr(result.mostCorrelated.value)}`
                  : null
              }
              tone="text-rose-300"
            />
            <Tile
              label="Paire la moins corrélée"
              value={
                result.leastCorrelated
                  ? `${result.leastCorrelated.a}–${result.leastCorrelated.b} · ${formatCorr(result.leastCorrelated.value)}`
                  : null
              }
              tone="text-emerald-300"
            />
            <Tile label="Positions analysées" value={`${result.symbols.length}/${total}`} />
          </div>

          <div className="overflow-x-auto">
            <table className="text-xs border-separate" style={{ borderSpacing: "3px" }}>
              <thead>
                <tr>
                  <th className="p-1.5" aria-hidden="true" />
                  {result.symbols.map((symbol) => (
                    <th key={symbol} className="p-1.5 font-semibold text-slate-300 text-center min-w-[3.25rem]">
                      {symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.symbols.map((rowSymbol, i) => (
                  <tr key={rowSymbol}>
                    <th className="p-1.5 font-semibold text-slate-300 text-right pr-2">{rowSymbol}</th>
                    {result.matrix[i].map((value, j) => {
                      const isDiagonal = i === j;
                      return (
                        <td
                          key={`${rowSymbol}-${result.symbols[j]}`}
                          className={`p-1.5 text-center rounded font-medium tabular-nums ${
                            isDiagonal ? "bg-surface-700 text-slate-500" : cellTone(value)
                          }`}
                          title={`${rowSymbol} / ${result.symbols[j]} : ${isDiagonal ? "1,00" : formatCorr(value)}`}
                        >
                          {isDiagonal ? "—" : formatCorr(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {truncated && (
            <p className="text-[11px] text-amber-300/80 mt-3">
              Limité aux {MAX_SYMBOLS} premières positions ({allSymbols.length} détenues).
            </p>
          )}

          <p className="text-[11px] text-slate-500 mt-3">
            Corrélation de Pearson des rendements de prix mensuels (hors dividendes réinvestis), calculée sur les
            mois communs (≥ {result.minOverlap}). Cellule masquée si l'historique chevauchant est insuffisant. Une
            corrélation faible entre positions indique une meilleure diversification. Pas un conseil.
          </p>
        </>
      )}
    </div>
  );
}
