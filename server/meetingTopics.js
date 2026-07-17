// Sujets de rencontre (P6.6) — première intégration LLM du projet.
//
// Question à laquelle ça répond : parmi les N actualités des titres détenus
// depuis la dernière rencontre, lesquelles le client va-t-il soulever ? Aucune
// fonction pure ne fait ça — il faut du jugement sur du texte non structuré.
//
// FACTUALITÉ — la contrainte structurante. Un LLM peut fabriquer. Ici il n'a
// pas le droit d'ÉMETTRE un fait, seulement de SÉLECTIONNER parmi des articles
// qu'on lui fournit et de les CITER :
//  - chaque article reçoit une référence déterministe (`a1`, `a2`, …) attribuée
//    par NOUS, pas par le modèle (l'`id` amont de Finnhub est nullable) ;
//  - le modèle doit citer les références qui fondent chaque sujet ;
//  - toute référence inconnue est jetée, et un sujet qui ne cite plus rien de
//    valide est SUPPRIMÉ — un sujet non sourcé est une fabrication, par
//    définition. `dropped` compte ce qui a été rejeté.
// Le garde-fou est donc vérifiable hors-ligne : on n'a pas à faire confiance au
// modèle, on vérifie chaque pointeur.
//
// Le sujet reste une PISTE DE DISCUSSION, jamais un conseil : le planificateur
// lit l'article cité et juge lui-même (contrainte AMF).
//
// `callModel` est injectable → testable sans réseau ni clé (convention projet).
import Anthropic from "@anthropic-ai/sdk";

export const MEETING_TOPICS_MODEL = "claude-opus-4-8";
const DEFAULT_MAX_TOPICS = 3;
const MAX_TOKENS = 16000;

// Schéma strict : le modèle ne peut pas inventer de champ, et `articleIds` est
// obligatoire — pas de sujet sans citation possible au niveau du schéma.
export const TOPICS_SCHEMA = {
  type: "object",
  properties: {
    topics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Le symbole boursier concerné." },
          headline: { type: "string", description: "Le sujet en une courte phrase neutre." },
          why: { type: "string", description: "Pourquoi le client est susceptible d'en parler, en une phrase." },
          articleIds: {
            type: "array",
            items: { type: "string" },
            description: "Les références (a1, a2, …) des articles fournis qui fondent ce sujet.",
          },
        },
        required: ["symbol", "headline", "why", "articleIds"],
        additionalProperties: false,
      },
    },
  },
  required: ["topics"],
  additionalProperties: false,
};

const SYSTEM = [
  "Tu prépares un planificateur financier à une rencontre client.",
  "",
  "On te donne les actualités récentes des titres que le client détient, chacune avec une référence (a1, a2, …).",
  "Sélectionne les sujets que le client est le plus susceptible de soulever.",
  "",
  "Règles strictes :",
  "- N'affirme AUCUN fait qui ne provienne pas des articles fournis. Tu sélectionnes et reformules, tu n'ajoutes rien.",
  "- Cite dans `articleIds` les références exactes des articles qui fondent le sujet. Un sujet sans référence sera supprimé.",
  "- N'invente jamais une référence. N'utilise que celles fournies.",
  "- Ne donne AUCUNE recommandation d'achat, de vente ou de détention, et aucune prédiction. Tu identifies des sujets de discussion, pas des actions.",
  "- Formule `headline` de façon neutre et factuelle. Le planificateur juge lui-même.",
].join("\n");

// Références attribuées par nous, dans l'ordre — déterministe et indépendant de
// l'`id` amont (nullable).
export function buildTopicsPrompt(news) {
  const refs = new Map();
  const lines = [];
  let n = 0;

  for (const entry of Array.isArray(news) ? news : []) {
    const symbol = String(entry?.symbol ?? "").trim().toUpperCase();
    const items = Array.isArray(entry?.items) ? entry.items : [];
    if (!symbol || items.length === 0) continue;

    lines.push(`## ${symbol}`);
    for (const article of items) {
      if (!article?.headline || !article?.url) continue;
      n += 1;
      const ref = `a${n}`;
      refs.set(ref, { symbol, article });
      lines.push(`- [${ref}] ${article.date?.slice(0, 10) ?? ""} — ${article.headline}${article.summary ? ` — ${article.summary}` : ""}`);
    }
  }

  return { prompt: lines.join("\n"), refs };
}

async function callAnthropic({ model, system, prompt, schema, thinking, apiKey }) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    thinking,
    system,
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("model declined the request");
  }
  // `content` porte aussi les blocs de réflexion — on ne lit que le texte.
  const text = response.content.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("model returned no text block");
  return JSON.parse(text);
}

export async function extractMeetingTopics({
  news = [],
  maxTopics = DEFAULT_MAX_TOPICS,
  anthropicApiKey,
  callModel = callAnthropic,
} = {}) {
  const { prompt, refs } = buildTopicsPrompt(news);
  if (refs.size === 0) {
    return { hasData: false, reason: "Aucune actualité disponible pour les titres détenus.", topics: [], dropped: 0 };
  }

  let raw;
  try {
    raw = await callModel({
      model: MEETING_TOPICS_MODEL,
      system: SYSTEM,
      prompt,
      schema: TOPICS_SCHEMA,
      thinking: { type: "adaptive" },
      apiKey: anthropicApiKey,
    });
  } catch {
    // L'erreur amont peut contenir la clé — on ne la propage jamais.
    return { hasData: false, reason: "Le service de sélection des sujets est indisponible.", topics: [], dropped: 0 };
  }

  const topics = [];
  let dropped = 0;

  for (const candidate of Array.isArray(raw?.topics) ? raw.topics : []) {
    // Le garde-fou : on ne garde que les citations qu'on a réellement fournies.
    const articles = (Array.isArray(candidate?.articleIds) ? candidate.articleIds : [])
      .map((ref) => refs.get(ref)?.article)
      .filter(Boolean)
      .map((a) => ({ headline: a.headline, source: a.source, url: a.url, date: a.date }));

    if (articles.length === 0) {
      dropped += 1; // sujet non sourcé ⇒ fabriqué ⇒ supprimé
      continue;
    }
    topics.push({
      symbol: String(candidate.symbol ?? "").toUpperCase(),
      headline: String(candidate.headline ?? ""),
      why: String(candidate.why ?? ""),
      articles,
    });
  }

  return {
    hasData: true,
    model: MEETING_TOPICS_MODEL,
    topics: topics.slice(0, Math.max(1, maxTopics)),
    dropped,
  };
}
