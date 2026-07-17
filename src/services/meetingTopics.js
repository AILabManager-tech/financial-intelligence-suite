// Client des sujets de rencontre (P6.6). Endpoint batch — il prend `?symbols=`
// (pluriel, comme /api/quotes), pas `?symbol=`.
//
// L'endpoint répond 200 avec hasData:false quand la capability n'est pas
// configurée (clé absente) : ce n'est pas une erreur, c'est une feature absente.
export async function fetchMeetingTopics(symbols, { signal } = {}) {
  const list = (Array.isArray(symbols) ? symbols : [])
    .map((s) => String(s ?? "").trim().toUpperCase())
    .filter(Boolean);

  if (list.length === 0) {
    return { hasData: false, reason: "Aucune position détenue.", topics: [], dropped: 0 };
  }

  const response = await fetch(`/api/meeting-topics?symbols=${encodeURIComponent(list.join(","))}`, { signal });
  if (!response.ok) {
    throw new Error(`meeting topics request failed: ${response.status}`);
  }
  return response.json();
}
