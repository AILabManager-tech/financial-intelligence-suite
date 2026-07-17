// Brief de préparation de rencontre client (P6.5) — pur, factuel.
//
// Le rapport de mandat (P6.1) est rétrospectif : positions, TWR, gains réalisés.
// Ce brief répond à une autre question : « qu'est-ce qui a changé depuis la
// dernière fois que j'ai vu ce client, et sur quoi dois-je ouvrir la
// discussion ? ». Il compose ce qui existe déjà (buildMandateReport,
// computeRebalance, computeTimeWeightedReturn) et n'ajoute qu'un calcul : le
// delta de période ancré sur un snapshot réel.
//
// Factualité stricte :
//  - la période est ancrée sur le dernier snapshot AU OU AVANT `since`. Aucun
//    snapshot d'ancrage ⇒ hasData:false. On n'interpole pas une valeur de
//    départ, on ne prend pas le plus ancien snapshot disponible « à la place » :
//    ce serait une période inventée.
//  - une VARIATION DE VALEUR n'est PAS une performance. FIS ne suit pas de
//    compte de caisse : un achat financé de l'extérieur gonfle
//    totalMarketValue. On sort donc les trois nombres séparément — variation,
//    apport net, et TWR (seul flux-neutralisé) — pour qu'aucun ne soit lu de
//    travers.
//  - le brief ne recommande rien. Il énumère des faits sourcés et ses propres
//    trous (`absences`). Le jugement reste au planificateur, qui signe.
//
// Aucun réseau, déterministe : `asOf` et `since` sont injectés, jamais lus à
// l'horloge.
import { buildMandateReport } from "./mandateReport";
import { computeRebalance } from "./rebalanceEngine";
import { computeTimeWeightedReturn, computeFlowsByDay } from "./timeWeightedReturn";

function dayKey(value) {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : null;
}

function snapshotPoints(snapshots) {
  return (Array.isArray(snapshots) ? snapshots : [])
    .map((s) => ({
      day: dayKey(s?.snapshotDate) ?? dayKey(s?.capturedAt),
      value: Number(s?.totalMarketValue),
    }))
    .filter((p) => p.day && Number.isFinite(p.value))
    .sort((a, b) => a.day.localeCompare(b.day));
}

// Période entre le dernier snapshot au ou avant `since` et le plus récent.
function buildSinceLastMeeting({ snapshots, transactions, since }) {
  const sinceDay = dayKey(since);
  if (!sinceDay) {
    return { hasData: false, reason: "Aucune date de dernière rencontre fournie." };
  }

  const points = snapshotPoints(snapshots);
  const anchorIndex = points.reduce((found, p, i) => (p.day <= sinceDay ? i : found), -1);
  if (anchorIndex === -1) {
    return {
      hasData: false,
      reason: `Aucun snapshot au ou avant le ${sinceDay} — l'historique du mandat ne remonte pas à la dernière rencontre.`,
    };
  }

  const anchor = points[anchorIndex];
  const latest = points[points.length - 1];
  if (latest.day === anchor.day) {
    return {
      hasData: false,
      reason: `Aucun snapshot après le ${anchor.day} — pas de période à comparer.`,
    };
  }

  // Convention de flux alignée sur computeSubPeriodReturns : un flux compte s'il
  // survient après le jour d'ancrage et jusqu'au jour final inclus.
  const inPeriod = (day) => day > anchor.day && day <= latest.day;

  let netFlow = 0;
  for (const [day, amount] of computeFlowsByDay(transactions)) {
    if (inPeriod(day)) netFlow += amount;
  }

  const periodTransactions = (Array.isArray(transactions) ? transactions : []).filter((tx) => {
    const day = dayKey(tx?.date);
    return day && inPeriod(day);
  });

  const valueChange = latest.value - anchor.value;
  const periodSnapshots = points.slice(anchorIndex).map((p) => ({
    snapshotDate: p.day,
    totalMarketValue: p.value,
  }));

  return {
    hasData: true,
    from: anchor.day,
    to: latest.day,
    valueFrom: anchor.value,
    valueTo: latest.value,
    valueChange,
    valueChangePct: anchor.value > 0 ? (valueChange / anchor.value) * 100 : null,
    netFlow,
    twr: computeTimeWeightedReturn(periodSnapshots, transactions),
    transactions: periodTransactions,
  };
}

export function buildMeetingBrief({
  mandate = {},
  assets = [],
  snapshots = [],
  transactions = [],
  asOf = null,
  since = null,
} = {}) {
  const { summary } = buildMandateReport({ mandate, assets, snapshots, transactions, asOf });

  const sinceLastMeeting = buildSinceLastMeeting({ snapshots, transactions, since });

  const rebalance = computeRebalance(assets);
  const drift = rebalance.hasData
    ? { ...rebalance, rows: rebalance.rows.filter((r) => r.action !== "hold") }
    : { hasData: false, reason: "Aucun poids cible défini sur les positions du mandat.", rows: [] };

  const absences = [];
  if (!sinceLastMeeting.hasData) {
    absences.push({ section: "sinceLastMeeting", label: "Évolution depuis la dernière rencontre", reason: sinceLastMeeting.reason });
  } else if (!sinceLastMeeting.twr.hasData) {
    absences.push({ section: "sinceLastMeeting.twr", label: "Performance de la période", reason: "Série de snapshots insuffisante pour un TWR sur la période." });
  }
  if (!drift.hasData) {
    absences.push({ section: "drift", label: "Dérive vs cible", reason: drift.reason });
  }

  return { summary, sinceLastMeeting, drift, absences };
}

function money(value, currency) {
  return Number.isFinite(value) ? `${value.toFixed(2)} ${currency}` : null;
}

function pct(value) {
  return Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(2)} %` : null;
}

function signedMoney(value, currency) {
  return Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(2)} ${currency}` : null;
}

const ACTION_LABEL = { buy: "Acheter", sell: "Vendre" };

// Rend le brief en markdown. Une section sans donnée est OMISE — jamais de « n/d »
// ni de 0 de remplissage (même discipline que fundamentalsNormalizer, qui omet
// les champs absents). Ce qui manque est dit une seule fois, dans « Données
// absentes ».
export function renderMeetingBriefMarkdown(brief) {
  const { summary, sinceLastMeeting, drift, absences } = brief ?? {};
  if (!summary) return "";

  const currency = summary.baseCurrency ?? "USD";
  const lines = [];

  const title = summary.client ? `${summary.mandateName} — ${summary.client}` : summary.mandateName;
  lines.push(`# Brief de rencontre — ${title}`);
  lines.push("");
  lines.push("> Note de préparation. Faits sourcés uniquement, **aucune recommandation** : le jugement et la signature restent au planificateur.");
  lines.push("");

  lines.push("## Sommaire");
  lines.push("");
  if (summary.asOf) lines.push(`- **Arrêté au** : ${summary.asOf}`);
  if (summary.accountTypeLabel) lines.push(`- **Type de compte** : ${summary.accountTypeLabel}`);
  lines.push(`- **Positions détenues** : ${summary.positionsCount}`);
  lines.push(`- **Valeur de marché** : ${money(summary.totalMarketValue, currency)}`);
  lines.push(`- **Coût** : ${money(summary.totalCost, currency)}`);
  const pnl = signedMoney(summary.unrealizedPnl, currency);
  const pnlPct = pct(summary.unrealizedPnlPct);
  lines.push(`- **P&L latent** : ${pnl}${pnlPct ? ` (${pnlPct})` : ""}`);
  lines.push("");

  if (sinceLastMeeting?.hasData) {
    lines.push(`## Depuis la dernière rencontre (${sinceLastMeeting.from} → ${sinceLastMeeting.to})`);
    lines.push("");
    const changePct = pct(sinceLastMeeting.valueChangePct);
    lines.push(`- **Variation de valeur** : ${signedMoney(sinceLastMeeting.valueChange, currency)}${changePct ? ` (${changePct})` : ""}`);
    lines.push(`- **Apport net de capital** : ${signedMoney(sinceLastMeeting.netFlow, currency)}`);
    if (sinceLastMeeting.twr?.hasData) {
      lines.push(`- **Performance (TWR, flux neutralisés)** : ${pct(sinceLastMeeting.twr.twrPct)}`);
      lines.push("");
      lines.push("  *La variation de valeur inclut les apports ; seul le TWR mesure le marché.*");
    }
    lines.push("");

    if (sinceLastMeeting.transactions.length > 0) {
      lines.push("### Transactions de la période");
      lines.push("");
      lines.push(`| Date | Type | Titre | Quantité | Prix |`);
      lines.push(`| --- | --- | --- | ---: | ---: |`);
      for (const tx of sinceLastMeeting.transactions) {
        lines.push(`| ${tx.date} | ${tx.type} | ${tx.symbol} | ${tx.quantity} | ${money(Number(tx.price), currency)} |`);
      }
      lines.push("");
    }
  }

  if (drift?.hasData && drift.rows.length > 0) {
    lines.push("## Dérive vs cible");
    lines.push("");
    lines.push(`| Titre | Actuel | Cible | Écart | Piste | Montant |`);
    lines.push(`| --- | ---: | ---: | ---: | --- | ---: |`);
    for (const row of drift.rows) {
      lines.push(
        `| ${row.symbol} | ${row.currentPct.toFixed(2)} % | ${row.targetPct.toFixed(2)} % | ${pct(row.driftPct)} | ${ACTION_LABEL[row.action] ?? row.action} | ${money(row.amount, currency)} |`,
      );
    }
    lines.push("");
    if (Number.isFinite(drift.targetSumPct) && Math.abs(drift.targetSumPct - 100) > 0.01) {
      lines.push(`*Somme des cibles : ${drift.targetSumPct.toFixed(2)} % — l'écart à 100 % est du cash implicite.*`);
      lines.push("");
    }
  }

  if (absences?.length > 0) {
    lines.push("## Données absentes");
    lines.push("");
    for (const a of absences) {
      lines.push(`- **${a.label}** : ${a.reason}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
