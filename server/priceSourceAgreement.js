// Sonde d'accord entre les deux sources de prix (B6).
//
// Les cotes viennent de finnhub, l'historique de twelvedata. Rien ne surveillait
// l'écart : au moment de l'audit ils concordaient (313,33 contre 313,32999),
// mais une dérive silencieuse rendrait un panneau de performance incohérent
// avec le prix affiché juste à côté, sans que rien ne le signale.
//
// Ce qui est comparé : deux CLÔTURES. Confronter le cours courant de finnhub à
// la dernière clôture quotidienne produirait, en séance, un écart parfaitement
// normal — la sonde crierait au loup chaque après-midi. On prend donc `pc` (la
// clôture précédente de finnhub) contre la dernière clôture complète de
// twelvedata : deux mesures de la même chose.

const PROBE_SYMBOL = "AAPL";
const DEFAULT_TOLERANCE_PCT = 0.5;

function nowIso() {
  return new Date().toISOString();
}

function finiteOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// Pure. `unknown` n'est pas un échec de la sonde : c'est l'absence de matière à
// comparer. Renvoyer « aligned » dans ce cas affirmerait une concordance qui
// n'a jamais été constatée.
export function comparePriceSources({ primaryClose, secondaryClose, tolerancePct = DEFAULT_TOLERANCE_PCT }) {
  const primary = finiteOrNull(primaryClose);
  const secondary = finiteOrNull(secondaryClose);

  if (primary === null || secondary === null) {
    return {
      status: "unknown",
      reason: "clôture manquante ou non exploitable sur au moins une source",
      primaryClose: primary,
      secondaryClose: secondary,
      gapAbs: null,
      gapPct: null,
      tolerancePct,
    };
  }

  const gapAbs = Math.abs(primary - secondary);
  const gapPct = (gapAbs / secondary) * 100;

  return {
    // Borne inclusive : un écart pile au seuil n'est pas une divergence.
    status: gapPct <= tolerancePct ? "aligned" : "diverged",
    primaryClose: primary,
    secondaryClose: secondary,
    gapAbs,
    gapPct,
    tolerancePct,
  };
}

export async function checkPriceSourceAgreement({
  finnhubApiKey,
  twelveDataApiKey,
  fetcher = fetch,
  symbol = PROBE_SYMBOL,
  tolerancePct = DEFAULT_TOLERANCE_PCT,
} = {}) {
  const base = {
    provider: "finnhub.io + twelvedata.com",
    capability: "price_source_agreement",
    checkedAt: nowIso(),
    symbol,
  };

  if (!finnhubApiKey || !twelveDataApiKey) {
    return {
      ...base,
      status: "missing_config",
      configured: false,
      error: "les deux sources doivent être configurées pour comparer leurs prix",
    };
  }

  try {
    const finnhubUrl = new URL("https://finnhub.io/api/v1/quote");
    finnhubUrl.searchParams.set("symbol", symbol);
    finnhubUrl.searchParams.set("token", finnhubApiKey);

    const twelveUrl = new URL("https://api.twelvedata.com/time_series");
    twelveUrl.searchParams.set("symbol", symbol);
    twelveUrl.searchParams.set("interval", "1day");
    twelveUrl.searchParams.set("outputsize", "1");
    twelveUrl.searchParams.set("apikey", twelveDataApiKey);

    const [finnhubResponse, twelveResponse] = await Promise.all([
      fetcher(finnhubUrl, { headers: { accept: "application/json" } }),
      fetcher(twelveUrl, { headers: { accept: "application/json" } }),
    ]);

    // Le statut seul remonte, jamais l'URL : elle porte les jetons.
    if (!finnhubResponse.ok) throw new Error(`finnhub upstream ${finnhubResponse.status}`);
    if (!twelveResponse.ok) throw new Error(`twelvedata upstream ${twelveResponse.status}`);

    const finnhubPayload = await finnhubResponse.json();
    const twelvePayload = await twelveResponse.json();
    const lastBar = Array.isArray(twelvePayload?.values) ? twelvePayload.values[0] : null;

    const comparison = comparePriceSources({
      primaryClose: finnhubPayload?.pc,
      secondaryClose: lastBar?.close,
      tolerancePct,
    });

    return {
      ...base,
      // Une divergence n'est pas une panne de la sonde, mais elle doit teinter
      // l'état de santé : c'est exactement le signal qu'on voulait voir.
      status: comparison.status === "diverged" ? "degraded" : "ok",
      configured: true,
      secondaryAsOf: lastBar?.datetime ?? null,
      comparison,
    };
  } catch (error) {
    return {
      ...base,
      status: "down",
      configured: true,
      error: error.name === "AbortError" ? "request timeout" : error.message,
    };
  }
}
