#!/usr/bin/env node
// Lance l'agent de préparation de rencontre (P6.7) hors de l'app.
//
//   npm run agent -- --portfolio ./mon-mandat.json
//
// L'entrée est le JSON que l'app exporte déjà (bouton « Exporter JSON » du
// portefeuille) : {exportedAt, assets:[{symbol, name, quantity, marketValue, weight}]}.
// Rien à recoder côté app — d'où le « plug-and-play en parallèle » : ce script
// n'est importé par aucun module de l'app, et l'app tourne identiquement sans lui.
//
// Les clés viennent de .env, chargé par Node lui-même (`--env-file`, Node 20+),
// jamais lu ni écrit par ce script.
import { readFile } from "node:fs/promises";
import { runBriefAgent } from "../server/briefAgent.js";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function normalize(raw, mandateName) {
  const assets = Array.isArray(raw?.assets) ? raw.assets : [];
  return {
    mandate: { name: mandateName ?? "Mandat" },
    positions: assets
      .filter((a) => Number(a?.quantity) > 0)
      .map((a) => ({
        symbol: String(a.symbol ?? "").toUpperCase(),
        name: a.name ?? "",
        quantity: Number(a.quantity),
        marketValue: Number(a.marketValue ?? 0),
        weight: Number(a.weight ?? 0).toFixed(1),
      }))
      .sort((a, b) => b.marketValue - a.marketValue),
  };
}

const path = arg("portfolio");
if (!path) {
  console.error("usage: npm run agent -- --portfolio <export.json>");
  console.error("       (le JSON exporté par le bouton « Exporter JSON » du portefeuille)");
  process.exit(2);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY absente. Colle-la dans .env (gabarit : .env.example), puis relance.");
  process.exit(1);
}

const portfolio = normalize(JSON.parse(await readFile(path, "utf8")), arg("mandate"));
console.error(`→ ${portfolio.positions.length} positions détenues. L'agent choisit quoi creuser…\n`);

const result = await runBriefAgent({
  portfolio,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  finnhubApiKey: process.env.FINNHUB_API_KEY,
});

if (!result.hasData) {
  console.error(`✗ ${result.reason}`);
  if (result.trace.length) console.error(`  (${result.trace.length} appels d'outils avant l'échec)`);
  process.exit(1);
}

console.log(result.text);
console.log("\n---");
// La trace EST la pièce à conviction : ce que l'agent a réellement lu.
console.log(`Trace — ${result.trace.length} appels d'outils par ${result.model} :`);
for (const call of result.trace) {
  const target = call.input?.symbol ? ` ${call.input.symbol}` : "";
  console.log(`  ${call.ok ? "✓" : "✗"} ${call.tool}${target}`);
}
console.log("\nFaits sourcés uniquement, aucune recommandation. Vérifie chaque affirmation contre la trace.");
