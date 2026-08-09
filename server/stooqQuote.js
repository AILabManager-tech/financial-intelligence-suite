// Normalisation d'une cote stooq (source de repli). Pure, testable hors HTTP,
// partagée par le handler de production et le middleware de développement —
// la logique était dupliquée entre les deux, donc corrigible d'un seul côté.

export const STOOQ_SOURCE = "stooq.com";

// Stooq renvoie une date et une heure SANS décalage horaire (`d2`, `t2`), et ne
// documente pas son fuseau. `new Date("2026-08-08T21:45:00")` est lu comme une
// heure LOCALE par ECMAScript : le même payload donnait un instant différent
// selon le navigateur, ce qui déplaçait l'étiquette « prix périmé ».
//
// Fabriquer un décalage (`Z`, `-05:00`…) serait de la provenance inventée. On
// ne retient donc que ce qui est fiable — la DATE — et on l'étiquette
// (`asOfPrecision: "day"`). Minuit UTC place l'instant AVANT l'heure réelle :
// la cote paraît au plus vieille d'un jour, jamais plus fraîche qu'on ne sait.
// C'est le sens prudent pour une étiquette de fraîcheur.
//
// L'heure renvoyée par stooq n'est pas conservée : l'exposer laisserait croire
// à une précision à la minute que la source ne permet pas d'établir.
export function normalizeStooqQuote(symbol, payload) {
  const rawQuote = payload?.symbols?.[0];
  const close = Number(rawQuote?.close);
  const open = Number(rawQuote?.open);
  // Sans cours d'ouverture, la variation est INCONNUE. Renvoyer 0 affirmerait
  // « stable aujourd'hui » — un fait fabriqué (factualité stricte : masqué).
  const change = Number.isFinite(open) ? close - open : null;

  if (!Number.isFinite(close)) {
    throw new Error(`${symbol}: invalid stooq payload`);
  }

  const day = typeof rawQuote?.date === "string" ? rawQuote.date.slice(0, 10) : null;
  const asOf = day ? `${day}T00:00:00.000Z` : undefined;

  return {
    symbol,
    name: rawQuote.name,
    price: close,
    change,
    changePct: Number.isFinite(open) && open > 0 ? (change / open) * 100 : null,
    volume: rawQuote.volume,
    source: STOOQ_SOURCE,
    fetchedAt: new Date().toISOString(),
    asOf,
    // Absent quand asOf l'est : pas d'étiquette de précision sans horodatage.
    asOfPrecision: asOf ? "day" : undefined,
  };
}
