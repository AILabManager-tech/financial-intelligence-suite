// Cross-asset return correlation (P5.x) — pure, derived strictly from the held
// positions' monthly price returns (same factual /api/history series the returns
// matrix, distribution and drawdown panels use). Surfaces what concentration
// (P5.8) cannot: two positions can each be a small weight yet move in lockstep,
// so the portfolio is less diversified than the weights suggest.
//
// Pearson correlation of monthly returns, computed pairwise on the months the
// two series share. Factuality: a pair without enough overlapping months yields
// a null cell (rendered as —, never a fabricated 0); a constant (zero-variance)
// series yields null (correlation is undefined); fewer than two symbols with a
// usable history yields hasData:false. The bands are descriptive, not advice.

const DEFAULT_MIN_OVERLAP = 6;

// month (YYYY-MM) -> finite returnPct, dropping null/NaN/non-string months.
function toReturnMap(series) {
  const map = new Map();
  if (!Array.isArray(series)) return map;
  for (const point of series) {
    const month = point?.month;
    const value = Number(point?.returnPct);
    if (typeof month === "string" && month && Number.isFinite(value)) {
      map.set(month, value);
    }
  }
  return map;
}

// Pearson r over [x, y] pairs; null when undefined (n < 2 or a flat series).
function pearson(pairs) {
  const n = pairs.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  for (const [x, y] of pairs) {
    sumX += x;
    sumY += y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (const [x, y] of pairs) {
    const dx = x - meanX;
    const dy = y - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  const denom = Math.sqrt(varX * varY);
  if (denom === 0) return null; // a constant series — correlation undefined
  // Clamp tiny floating-point overshoots so a perfect pair reads exactly ±1.
  return Math.max(-1, Math.min(1, cov / denom));
}

/**
 * @param {Record<string, Array<{month:string, returnPct:number|null}>>} seriesBySymbol
 * @param {{minOverlap?:number}} [opts]
 * @returns {{hasData:false} | {
 *   hasData:true, symbols:string[], matrix:Array<Array<number|null>>,
 *   pairsComputed:number, averageCorrelation:number|null,
 *   mostCorrelated:{a:string,b:string,value:number}|null,
 *   leastCorrelated:{a:string,b:string,value:number}|null, minOverlap:number,
 * }}
 */
export function computeCorrelationMatrix(seriesBySymbol, { minOverlap = DEFAULT_MIN_OVERLAP } = {}) {
  const entries =
    seriesBySymbol && typeof seriesBySymbol === "object" ? Object.entries(seriesBySymbol) : [];

  const usable = entries
    .map(([symbol, series]) => ({
      symbol: String(symbol).trim().toUpperCase(),
      returns: toReturnMap(series),
    }))
    .filter((entry) => entry.symbol && entry.returns.size >= minOverlap);

  if (usable.length < 2) return { hasData: false };

  const symbols = usable.map((entry) => entry.symbol);
  const n = symbols.length;
  const matrix = [];
  const offDiagonal = []; // upper triangle only: { a, b, value }

  for (let i = 0; i < n; i += 1) {
    const row = [];
    for (let j = 0; j < n; j += 1) {
      if (i === j) {
        row.push(1);
        continue;
      }
      const left = usable[i].returns;
      const right = usable[j].returns;
      const pairs = [];
      for (const [month, x] of left) {
        if (right.has(month)) pairs.push([x, right.get(month)]);
      }
      const value = pairs.length >= minOverlap ? pearson(pairs) : null;
      row.push(value);
      if (j > i && value != null) offDiagonal.push({ a: symbols[i], b: symbols[j], value });
    }
    matrix.push(row);
  }

  if (offDiagonal.length === 0) {
    return {
      hasData: true,
      symbols,
      matrix,
      pairsComputed: 0,
      averageCorrelation: null,
      mostCorrelated: null,
      leastCorrelated: null,
      minOverlap,
    };
  }

  const average = offDiagonal.reduce((sum, pair) => sum + pair.value, 0) / offDiagonal.length;
  const sorted = [...offDiagonal].sort((a, b) => b.value - a.value);

  return {
    hasData: true,
    symbols,
    matrix,
    pairsComputed: offDiagonal.length,
    averageCorrelation: average,
    mostCorrelated: sorted[0],
    leastCorrelated: sorted[sorted.length - 1],
    minOverlap,
  };
}
