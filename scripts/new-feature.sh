#!/usr/bin/env bash
# Générateur de scaffolding pour une feature FIS (convention CLAUDE.md : feature × couche).
#
# Produit les fichiers squelettes fidèles au pattern du projet (fetch + cache +
# AbortController + 4 états, tests no-leak token, formatters null-safe), avec des
# TODO explicites là où le JUGEMENT humain est requis (source, factualité,
# anti-chevauchement). Il ne touche JAMAIS vite.config.js / featureRegistry.js /
# IntelligenceCard.jsx (édition risquée) : il imprime les snippets exacts à coller.
#
# Usage :
#   scripts/new-feature.sh --id short-interest --component ShortInterestPanel \
#       --surface asset --category sentiment --api short-interest --formatters
#
#   scripts/new-feature.sh --id sector-weights --surface dashboard \
#       --category portfolio            # feature PURE (pas de source externe)
#
# Flags :
#   --id <kebab>          id de feature (kebab-case, obligatoire)
#   --component <Pascal>  nom du composant React (défaut : <Pascal de l'id>Panel)
#   --surface <s>         asset | dashboard (défaut : asset)
#   --category <c>        catégorie de registre (défaut : overview)
#   --api <kebab>         nom d'endpoint /api/<kebab> → génère server + api + service
#                         (omis = feature pure dérivée des props, sans couche serveur)
#   --formatters          génère src/utils/<camel>Formatters.{js,test.js}
#   --force               autorise l'écrasement de fichiers existants
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ID=""; COMPONENT=""; SURFACE="asset"; CATEGORY="overview"; API=""; FORMATTERS=0; FORCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --id) ID="$2"; shift 2;;
    --component) COMPONENT="$2"; shift 2;;
    --surface) SURFACE="$2"; shift 2;;
    --category) CATEGORY="$2"; shift 2;;
    --api) API="$2"; shift 2;;
    --formatters) FORMATTERS=1; shift;;
    --force) FORCE=1; shift;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    *) echo "Flag inconnu : $1" >&2; exit 2;;
  esac
done

[[ -z "$ID" ]] && { echo "Erreur : --id <kebab> est obligatoire." >&2; exit 2; }
[[ "$ID" =~ ^[a-z][a-z0-9-]*$ ]] || { echo "Erreur : --id doit être kebab-case." >&2; exit 2; }
[[ "$SURFACE" == "asset" || "$SURFACE" == "dashboard" ]] || { echo "Erreur : --surface = asset|dashboard." >&2; exit 2; }

# Dérivations de casse à partir de l'id kebab.
CAMEL="$(echo "$ID" | awk -F- '{out=$1; for(i=2;i<=NF;i++){out=out toupper(substr($i,1,1)) substr($i,2)} print out}')"
PASCAL="$(echo "$CAMEL" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"
[[ -z "$COMPONENT" ]] && COMPONENT="${PASCAL}Panel"
LABEL_HINT="$(echo "$ID" | tr '-' ' ')"

write() { # write <path> <<<content
  local path="$ROOT/$1"
  if [[ -e "$path" && $FORCE -ne 1 ]]; then
    echo "  SKIP (existe déjà, --force pour écraser) : $1"; return
  fi
  mkdir -p "$(dirname "$path")"
  cat > "$path"
  echo "  + $1"
}

echo "Génération de la feature '$ID' (surface=$SURFACE, category=$CATEGORY, api=${API:-aucune}, formatters=$FORMATTERS) :"

# ---------------------------------------------------------------------------
# Couche serveur + API + service client (seulement si une source externe --api)
# ---------------------------------------------------------------------------
if [[ -n "$API" ]]; then
  write "server/${CAMEL}.js" <<EOF
const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// TODO(jugement) : normaliser la donnée upstream. Règle de factualité STRICTE —
// droppe toute ligne dont un champ requis manque ou est non fini. JAMAIS de 0
// fabriqué ni de valeur inventée pour boucher un trou.
function normalizeItem(raw) {
  // TODO: remplacer par la vraie normalisation.
  return raw && typeof raw === 'object' ? raw : null;
}

export async function fetch${PASCAL}(symbol, { finnhubApiKey, fetcher = fetch, limit = DEFAULT_LIMIT } = {}) {
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY is required for ${ID}');
  }
  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }
  const cap = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const url = new URL(\`\${FINNHUB_BASE}/TODO-endpoint\`); // TODO(jugement) : choisir l'endpoint
  url.searchParams.set('symbol', cleanSymbol);
  url.searchParams.set('token', finnhubApiKey);

  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    // Ne JAMAIS interpoler le token dans le message (testé par no-leak).
    throw new Error(\`\${cleanSymbol}: ${ID} upstream \${response.status}\`);
  }

  const payload = await response.json();
  const items = (Array.isArray(payload?.data) ? payload.data : [])
    .map(normalizeItem)
    .filter(Boolean)
    .slice(0, cap);

  return { symbol: cleanSymbol, source: 'finnhub.io', fetchedAt: new Date().toISOString(), items };
}
EOF

  write "server/${CAMEL}.test.js" <<EOF
import { describe, expect, it, vi } from 'vitest';
import { fetch${PASCAL} } from './${CAMEL}.js';

function okJson(body) {
  return { ok: true, status: 200, json: async () => body };
}

describe('fetch${PASCAL}', () => {
  it('rejects when no Finnhub API key is configured', async () => {
    await expect(fetch${PASCAL}('AAPL', { finnhubApiKey: '', fetcher: vi.fn() })).rejects.toThrow(/FINNHUB_API_KEY/);
  });

  it('throws on a non-OK upstream response', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) }));
    await expect(fetch${PASCAL}('AAPL', { finnhubApiKey: 'tok', fetcher })).rejects.toThrow(/AAPL/);
  });

  it('does not leak the token in error messages', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    try {
      await fetch${PASCAL}('AAPL', { finnhubApiKey: 'super-secret', fetcher });
    } catch (error) {
      expect(error.message).not.toContain('super-secret');
      return;
    }
    throw new Error('expected throw');
  });

  // TODO(jugement) : tests de normalisation — drop des lignes invalides (jamais de 0
  // fabriqué), tri, cap, liste vide, et le cas réel de cette source.
});
EOF

  write "api/${API}.js" <<EOF
import { fetch${PASCAL} } from "../server/${CAMEL}.js";

const TTL_MS = 6 * 60 * 60 * 1000; // TODO(jugement) : TTL ajusté à la volatilité de la source
const cache = new Map();

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", \`s-maxage=\${Math.floor(TTL_MS / 1000)}, stale-while-revalidate=600\`);
  response.end(JSON.stringify(payload));
}

export default async function handler(request, response) {
  const symbol = String(request.query?.symbol ?? "").trim().toUpperCase();
  const limit = Math.min(Math.max(Number(request.query?.limit ?? 20), 1), 50);
  if (!symbol) {
    sendJson(response, 400, { error: "symbol query parameter is required" });
    return;
  }
  const key = \`\${symbol}:\${limit}\`;
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    sendJson(response, 200, { ...cached.value, cache: { status: "hit", ttlMs: TTL_MS, expiresAt: new Date(cached.expiresAt).toISOString() } });
    return;
  }
  try {
    const value = await fetch${PASCAL}(symbol, { finnhubApiKey: process.env.FINNHUB_API_KEY, limit });
    const expiresAt = now + TTL_MS;
    cache.set(key, { value, expiresAt });
    sendJson(response, 200, { ...value, cache: { status: "miss", ttlMs: TTL_MS, expiresAt: new Date(expiresAt).toISOString() } });
  } catch (error) {
    sendJson(response, 502, { error: error.message, source: "finnhub.io" });
  }
}
EOF

  write "src/services/${CAMEL}.js" <<EOF
export async function fetch${PASCAL}(symbol, { signal, limit } = {}) {
  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }
  const params = new URLSearchParams({ symbol: cleanSymbol });
  if (Number.isFinite(Number(limit))) {
    params.set('limit', String(Math.min(Math.max(Number(limit), 1), 50)));
  }
  const response = await fetch(\`/api/${API}?\${params.toString()}\`, { headers: { accept: 'application/json' }, signal });
  if (!response.ok) {
    throw new Error(\`${LABEL_HINT} unavailable (\${response.status})\`);
  }
  const payload = await response.json();
  return {
    symbol: payload.symbol ?? cleanSymbol,
    source: payload.source ?? 'finnhub.io',
    fetchedAt: payload.fetchedAt ?? null,
    items: Array.isArray(payload.items) ? payload.items : [],
    cache: payload.cache ?? null,
  };
}
EOF

  write "src/services/${CAMEL}.test.js" <<EOF
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch${PASCAL} } from './${CAMEL}';

const SAMPLE = { symbol: 'AAPL', source: 'finnhub.io', fetchedAt: '2026-05-09T12:00:00.000Z', items: [] };

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE) }));
});
afterEach(() => { vi.restoreAllMocks(); });

describe('fetch${PASCAL} (client)', () => {
  it('issues a GET to /api/${API} with the symbol uppercased', async () => {
    await fetch${PASCAL}('aapl');
    expect(String(globalThis.fetch.mock.calls[0][0])).toContain('/api/${API}?symbol=AAPL');
  });

  it('throws on missing symbol without hitting the network', async () => {
    await expect(fetch${PASCAL}('')).rejects.toThrow(/symbol/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('forwards the AbortSignal', async () => {
    const controller = new AbortController();
    await fetch${PASCAL}('AAPL', { signal: controller.signal });
    expect(globalThis.fetch.mock.calls[0][1]?.signal).toBe(controller.signal);
  });
});
EOF
fi

# ---------------------------------------------------------------------------
# Formatters purs (si --formatters)
# ---------------------------------------------------------------------------
if [[ $FORMATTERS -eq 1 ]]; then
  write "src/utils/${CAMEL}Formatters.js" <<EOF
// Formatters purs pour ${ID}. Par champ, retournent null sur entrée invalide —
// JAMAIS de valeur fabriquée. TODO(jugement) : implémenter selon les champs réels.

export function format${PASCAL}Value(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString('fr-CA');
}

export function summarize${PASCAL}(items) {
  if (!Array.isArray(items) || items.length === 0) return { hasData: false };
  // TODO(jugement) : agréger les champs réels.
  return { hasData: true, count: items.length };
}
EOF

  write "src/utils/${CAMEL}Formatters.test.js" <<EOF
import { describe, expect, it } from 'vitest';
import { format${PASCAL}Value, summarize${PASCAL} } from './${CAMEL}Formatters';

describe('format${PASCAL}Value', () => {
  it('returns null on invalid input', () => {
    expect(format${PASCAL}Value('x')).toBeNull();
  });
});

describe('summarize${PASCAL}', () => {
  it('returns hasData false for empty input', () => {
    expect(summarize${PASCAL}([])).toEqual({ hasData: false });
    expect(summarize${PASCAL}(null)).toEqual({ hasData: false });
  });
});
EOF
fi

# ---------------------------------------------------------------------------
# Composant panel + test (toujours)
# ---------------------------------------------------------------------------
if [[ -n "$API" ]]; then
  # Panel "sourced" : fetch + 4 états (loading/error/empty/ready), idiome AbortController.
  write "src/components/${COMPONENT}.jsx" <<EOF
import { useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { fetch${PASCAL} } from "../services/${CAMEL}";

export default function ${COMPONENT}({ asset }) {
  const [state, setState] = useState({
    symbol: asset?.symbol ?? null,
    status: asset?.symbol ? "loading" : "idle",
    items: [],
    fetchedAt: null,
    source: null,
    error: null,
  });

  if (asset?.symbol && state.symbol !== asset.symbol) {
    setState({ symbol: asset.symbol, status: "loading", items: [], fetchedAt: null, source: null, error: null });
  }

  useEffect(() => {
    if (!asset?.symbol) return undefined;
    const controller = new AbortController();
    fetch${PASCAL}(asset.symbol, { signal: controller.signal, limit: 20 })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setState({ symbol: asset.symbol, status: "ready", items: payload.items, fetchedAt: payload.fetchedAt, source: payload.source, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === "AbortError") return;
        setState({ symbol: asset.symbol, status: "error", items: [], fetchedAt: null, source: null, error: error.message });
      });
    return () => controller.abort();
  }, [asset?.symbol]);

  if (!asset?.symbol) return null;

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5 mt-4" role="region" aria-label="${LABEL_HINT}">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">${LABEL_HINT}</span>
        </div>
        {state.status === "ready" && state.source && <span className="text-[11px] text-slate-500">{state.source}</span>}
      </div>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 min-h-[80px]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" /> Chargement
        </div>
      )}
      {state.status === "error" && (
        <div className="text-sm text-amber-400">
          Donnée indisponible — {state.error}
          <div className="text-xs text-slate-500 mt-1">Rien n'est affiché pour éviter de présenter une donnée non vérifiée.</div>
        </div>
      )}
      {state.status === "ready" && state.items.length === 0 && (
        <div className="text-sm text-slate-400">Aucune donnée pour {asset.symbol}.</div>
      )}
      {state.status === "ready" && state.items.length > 0 && (
        <div className="text-sm text-slate-300">{/* TODO(jugement) : rendu réel des items + bandeau « pas un conseil » si applicable */}</div>
      )}
    </div>
  );
}
EOF
else
  # Panel "pur" : lit une prop (assets / transactions / …), aucun fetch.
  write "src/components/${COMPONENT}.jsx" <<EOF
import { Activity } from "lucide-react";

// Feature PURE : dérive son rendu d'une prop déjà disponible (assets, transactions…).
// Aucun fetch, aucune couche serveur. TODO(jugement) : choisir la prop et le calcul pur
// (idéalement extrait dans src/utils/, testable hors React).
export default function ${COMPONENT}({ assets = [] }) {
  const hasData = Array.isArray(assets) && assets.length > 0;
  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="${LABEL_HINT}">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-blue-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-white">${LABEL_HINT}</span>
      </div>
      {!hasData && <div className="text-sm text-slate-400">Aucune donnée à afficher.</div>}
      {hasData && <div className="text-sm text-slate-300">{/* TODO(jugement) : rendu réel */}</div>}
    </div>
  );
}
EOF
fi

write "src/components/${COMPONENT}.test.jsx" <<EOF
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ${COMPONENT} from "./${COMPONENT}";

describe("${COMPONENT}", () => {
  it("se monte sans planter", () => {
    render(<${COMPONENT} asset={{ symbol: "AAPL", name: "Apple", price: 220, change: 1, changePct: 0.5 }} assets={[]} />);
    expect(screen.getByRole("region", { name: /${LABEL_HINT}/i })).toBeInTheDocument();
  });
  // TODO(jugement) : états loading/error/empty/ready (sourced) OU cas de données (pur),
  // mock du service, re-fetch au changement de symbole, abort à l'unmount.
});
EOF

# ---------------------------------------------------------------------------
# Câblages manuels (le générateur ne touche pas ces fichiers — il imprime quoi coller)
# ---------------------------------------------------------------------------
cat <<EOF

✅ Fichiers générés. CÂBLAGES MANUELS À FAIRE (le générateur ne les fait pas par sécurité) :

1) src/core/featureRegistry.js — ajouter l'entrée (choisir 'order') :
   {
     id: "${ID}",
     label: "${LABEL_HINT}",
     category: "${CATEGORY}",
     surface: "${SURFACE}",
     componentKey: "${COMPONENT}",
     dataDeps: [${API:+\"$API\"}],
     defaultVisible: true,
     order: /* TODO */,
   },

2) $([ "$SURFACE" = asset ] && echo "src/components/IntelligenceCard.jsx" || echo "src/core/dashboardPanelProps.js + le mapping dashboard") —
   importer ${COMPONENT} et l'ajouter à la map des composants$([ "$SURFACE" = dashboard ] && echo " + définir ses props dans dashboardPanelProps").
EOF

if [[ -n "$API" ]]; then
cat <<EOF

3) vite.config.js — (a) importer fetch${PASCAL} ; (b) ajouter 'cacheTtlMs.${CAMEL}' ;
   (c) ajouter le middleware (calquer sur /api/insider-transactions) :
   server.middlewares.use('/api/${API}', async (request, response) => {
     const requestUrl = new URL(request.url ?? '', 'http://localhost')
     const symbol = (requestUrl.searchParams.get('symbol') ?? '').trim().toUpperCase()
     const limit = Math.min(Math.max(Number(requestUrl.searchParams.get('limit') ?? 20), 1), 50)
     if (!symbol) { sendJson(response, 400, { error: 'symbol query parameter is required' }); return }
     try {
       const { value, cacheStatus, expiresAt } = await readThroughCache(
         \`${API}:\${symbol}:\${limit}\`, cacheTtlMs.${CAMEL},
         () => fetch${PASCAL}(symbol, { finnhubApiKey: process.env.FINNHUB_API_KEY, limit }),
       )
       sendJson(response, 200, { ...value, cache: { status: cacheStatus, ttlMs: cacheTtlMs.${CAMEL}, expiresAt: new Date(expiresAt).toISOString() } })
     } catch (error) { sendJson(response, 502, { error: error.message, source: 'finnhub.io' }) }
   })
EOF
fi

cat <<EOF

Puis : remplir les TODO(jugement), écrire les vrais tests (rouges d'abord),
et valider : npm run lint && npm test && npm run build.
EOF
