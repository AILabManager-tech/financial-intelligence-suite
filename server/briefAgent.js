// Agent de préparation de rencontre (P6.7) — additif, optionnel, hors de l'app.
//
// Différence RÉELLE avec P6.6 (qui est un appel unique) : là-bas je décidais en
// dur « fetch les news de tous les titres détenus, donne au modèle ». Ici le
// modèle CHOISIT son chemin — avec 52 positions il ne peut pas tout regarder,
// donc il doit prioriser, décider si un résultat trimestriel compte, s'arrêter
// quand il en sait assez. C'est ça, l'agentivité : outils + boucle pilotée par
// le modèle. La boucle est celle du SDK (`toolRunner`), pas la mienne.
//
// PLUG-AND-PLAY : ce fichier n'est importé par aucune partie de l'app. Sans clé
// il est inerte ; `/brief` (P6.5) et `/api/meeting-topics` (P6.6) fonctionnent
// exactement pareil avec ou sans lui. On le lance via `npm run agent`.
//
// FACTUALITÉ — et il faut être honnête sur le compromis. P6.6 a une garantie
// DURE : le modèle cite des références, toute citation inconnue est jetée, un
// sujet non sourcé disparaît. Ici la sortie est du texte libre : cette garantie
// n'existe pas. Ce qu'on a à la place :
//   - un GARDE-FOU DE PÉRIMÈTRE — l'agent ne peut consulter que les titres
//     réellement détenus ; demander TSLA quand le client n'en a pas est refusé
//     et tracé ;
//   - une TRACE COMPLÈTE — chaque appel d'outil, son entrée et son succès sont
//     enregistrés et retournés. Le planificateur voit exactement ce que l'agent
//     a lu, et peut auditer chaque affirmation contre ça.
// La trace est une garantie plus FAIBLE qu'un contrôle de citation. C'est le
// prix de l'agentivité, et c'est pour ça que le brief déterministe (P6.5) reste
// la source des chiffres : l'agent commente, il ne calcule pas.
import Anthropic from "@anthropic-ai/sdk";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import { fetchCompanyNews as defaultFetchCompanyNews } from "./companyNews.js";
import { fetchEarningsCalendar as defaultFetchEarnings } from "./earningsCalendar.js";

export const BRIEF_AGENT_MODEL = "claude-opus-4-8";
const MAX_TOKENS = 16000;
const NEWS_PER_SYMBOL = 5;

const SYSTEM = [
  "Tu prépares un planificateur financier à une rencontre avec un client.",
  "",
  "Tu as des outils. À toi de décider lesquels appeler, dans quel ordre, et quand tu en sais assez.",
  "Commence par regarder les positions. Tu ne peux pas tout éplucher : priorise les positions qui pèsent le plus,",
  "et creuse seulement là où c'est susceptible de venir dans la conversation.",
  "",
  "Règles strictes :",
  "- N'affirme AUCUN fait qui ne provienne pas d'un résultat d'outil. Si tu ne l'as pas lu, tu ne le dis pas.",
  "- Cite le titre de l'article et son lien quand tu rapportes une actualité.",
  "- Ne donne AUCUNE recommandation d'achat, de vente ou de détention, et aucune prédiction.",
  "- Ne calcule aucune performance : les chiffres du portefeuille viennent du brief déterministe, pas de toi.",
  "- Termine par une note courte : les sujets qui risquent de venir, et pour chacun ce que le client pourrait demander.",
  "- Si l'actualité est vide ou indisponible, dis-le. N'invente rien pour remplir.",
].join("\n");

function heldSymbols(portfolio) {
  return new Set((portfolio?.positions ?? []).map((p) => String(p?.symbol ?? "").toUpperCase()).filter(Boolean));
}

// Les outils que l'agent PEUT choisir. Fetchers injectables → testable sans réseau.
export function createBriefTools({
  portfolio,
  fetchCompanyNews = defaultFetchCompanyNews,
  fetchEarnings = defaultFetchEarnings,
  finnhubApiKey,
} = {}) {
  const trace = [];
  const held = heldSymbols(portfolio);

  const record = (tool, input, ok) => {
    trace.push({ tool, input, ok });
  };

  // Garde-fou de périmètre : l'agent choisit son chemin, pas son terrain.
  const guard = (tool, symbol) => {
    const clean = String(symbol ?? "").trim().toUpperCase();
    if (!held.has(clean)) {
      record(tool, { symbol: clean }, false);
      return { ok: false, message: `Le client ne détient pas ${clean}. Limite-toi aux positions du mandat.` };
    }
    return { ok: true, symbol: clean };
  };

  const tools = [
    betaTool({
      name: "list_positions",
      description: "Les positions réellement détenues dans le mandat, avec quantité, valeur de marché et poids. Commence par là.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      run: async () => {
        record("list_positions", {}, true);
        const rows = (portfolio?.positions ?? []).map(
          (p) => `- ${p.symbol} (${p.name ?? ""}) — qté ${p.quantity}, valeur ${p.marketValue}, poids ${p.weight}%`,
        );
        return rows.length ? `Mandat : ${portfolio?.mandate?.name ?? ""}\n${rows.join("\n")}` : "Aucune position détenue.";
      },
    }),

    betaTool({
      name: "get_company_news",
      description: "Actualités récentes d'un titre détenu. Appelle-le seulement pour les positions qui méritent qu'on creuse.",
      inputSchema: {
        type: "object",
        properties: { symbol: { type: "string", description: "Le symbole, ex. AAPL." } },
        required: ["symbol"],
        additionalProperties: false,
      },
      run: async ({ symbol }) => {
        const g = guard("get_company_news", symbol);
        if (!g.ok) return g.message;
        try {
          const payload = await fetchCompanyNews(g.symbol, { finnhubApiKey, limit: NEWS_PER_SYMBOL });
          record("get_company_news", { symbol: g.symbol }, true);
          const items = payload?.items ?? [];
          if (items.length === 0) return `Aucune actualité récente pour ${g.symbol}.`;
          return items.map((i) => `- ${i.date?.slice(0, 10)} — ${i.headline} (${i.source}) ${i.url}`).join("\n");
        } catch {
          // L'erreur amont peut porter une clé — on la remplace, jamais on la propage.
          record("get_company_news", { symbol: g.symbol }, false);
          return `Actualités indisponibles pour ${g.symbol}.`;
        }
      },
    }),

    betaTool({
      name: "get_earnings_calendar",
      description: "Prochains résultats trimestriels d'un titre détenu. Utile si une date tombe avant ou juste après la rencontre.",
      inputSchema: {
        type: "object",
        properties: { symbol: { type: "string", description: "Le symbole, ex. AAPL." } },
        required: ["symbol"],
        additionalProperties: false,
      },
      run: async ({ symbol }) => {
        const g = guard("get_earnings_calendar", symbol);
        if (!g.ok) return g.message;
        try {
          const payload = await fetchEarnings(g.symbol, { finnhubApiKey });
          record("get_earnings_calendar", { symbol: g.symbol }, true);
          const items = payload?.items ?? [];
          if (items.length === 0) return `Aucun résultat annoncé pour ${g.symbol}.`;
          return items.map((i) => `- ${i.date}${i.epsEstimate != null ? ` — BPA estimé ${i.epsEstimate}` : ""}`).join("\n");
        } catch {
          record("get_earnings_calendar", { symbol: g.symbol }, false);
          return `Calendrier de résultats indisponible pour ${g.symbol}.`;
        }
      },
    }),
  ];

  return { tools, trace };
}

// Boucle réelle : c'est le SDK qui la pilote, le modèle décide des appels.
function defaultCreateRunner({ tools, anthropicApiKey }) {
  const client = new Anthropic({ apiKey: anthropicApiKey });
  return {
    async run() {
      const message = await client.beta.messages.toolRunner({
        model: BRIEF_AGENT_MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: "adaptive" },
        system: SYSTEM,
        tools,
        messages: [{ role: "user", content: "Prépare-moi pour la rencontre. Qu'est-ce que je devrais savoir avant de m'asseoir ?" }],
      });
      if (message.stop_reason === "refusal") throw new Error("model declined");
      return message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");
    },
  };
}

export async function runBriefAgent({
  portfolio,
  anthropicApiKey,
  finnhubApiKey,
  fetchCompanyNews,
  fetchEarnings,
  createRunner = defaultCreateRunner,
} = {}) {
  if (!anthropicApiKey && createRunner === defaultCreateRunner) {
    return { hasData: false, reason: "Agent non configuré (ANTHROPIC_API_KEY absente).", trace: [] };
  }
  if ((portfolio?.positions ?? []).length === 0) {
    return { hasData: false, reason: "Aucune position détenue — rien à préparer.", trace: [] };
  }

  const { tools, trace } = createBriefTools({ portfolio, fetchCompanyNews, fetchEarnings, finnhubApiKey });

  try {
    const text = await createRunner({ tools, anthropicApiKey }).run();
    return { hasData: true, model: BRIEF_AGENT_MODEL, text, trace };
  } catch {
    return { hasData: false, reason: "L'agent est indisponible.", trace };
  }
}
