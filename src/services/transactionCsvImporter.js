// Import du JOURNAL DE TRANSACTIONS depuis un relevé de courtier (P3.4).
//
// Pourquoi ça compte plus que l'import de positions (`csvImporter.js`) : celui-ci
// importe une PHOTO (ce qui est détenu aujourd'hui). Le journal, lui, est un
// FILM — et c'est le film qui allume tout ce qui est déjà construit et tourne
// dans le vide : moteur de lots (P3.3), gains réalisés (P6.2), rapport fiscal,
// et — via la reconstruction de série — le TWR et la section « depuis la
// dernière rencontre » du brief.
//
// Sans lui, un planificateur qui importe voit ses positions puis une section
// phare vide pendant des semaines, le temps que FIS accumule ses propres
// journées. C'est la raison précise pour laquelle l'outil est jetable.
//
// FACTUALITÉ : rien n'est deviné. Une ligne dont le type est inconnu, la date
// illisible ou la quantité invalide est REJETÉE avec son numéro de ligne, jamais
// réparée au jugé. Un relevé à moitié importé sans le dire serait pire qu'un
// refus — les gains réalisés d'un T5008 se calculent sur le journal COMPLET.
import { parseCsv } from "./csvImporter";

const HEADER_PATTERNS = {
  date: /^(date|trade.?date|transaction.?date|date.?de.?transaction|date.?d.?op[ée]ration|date.?de.?n[ée]gociation|settlement.?date|date.?de.?r[èe]glement)$/i,
  type: /^(type|transaction|transaction.?type|operation|op[ée]ration|activity|activit[ée]|side|sens|nature)$/i,
  symbol: /^(symbol|ticker|symbole|isin|code|cusip)$/i,
  quantity: /^(quantity|quantit[ée]|qty|qte|shares|units|parts|nombre|nb)$/i,
  price: /^(price|prix|unit.?price|prix.?unitaire|cours|rate|taux)$/i,
  fee: /^(fee|fees|frais|commission|commissions|charges)$/i,
  amount: /^(amount|montant|total|net.?amount|montant.?net|value|valeur)$/i,
};

// Vocabulaire réel des relevés FR/EN. Un type non reconnu est rejeté, jamais
// rangé par défaut dans "buy" — se tromper de sens inverse un gain en perte.
const TYPE_PATTERNS = [
  [/^(buy|bought|purchase|purchased|achat|acht|acheté|achete|souscription)$/i, "buy"],
  [/^(sell|sold|sale|vente|vendu|vend|rachat|disposition)$/i, "sell"],
  [/^(dividend|dividends|dividende|dividendes|div|distribution|revenu)$/i, "dividend"],
  [/^(fee|fees|frais|commission|charge|honoraires)$/i, "fee"],
];

function findColumn(headers, pattern) {
  return headers.findIndex((header) => pattern.test(String(header).trim()));
}

export function detectTransactionMapping(headers) {
  return Object.fromEntries(
    Object.entries(HEADER_PATTERNS).map(([field, pattern]) => [field, findColumn(headers, pattern)]),
  );
}

function parseNumericField(raw) {
  if (raw == null) return NaN;
  const cleaned = String(raw)
    .replace(/[\s$€£¥]/g, "")
    .replace(/[()]/g, "") // (1 234,56) = montant négatif chez certains courtiers
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(/%$/, "")
    .replace(/,/g, ".");
  return Number(cleaned);
}

// Accepte ISO (2026-03-06) et les formats courants des relevés canadiens
// (06/03/2026 = jour/mois/année, 2026/03/06). Ambigu ⇒ rejeté, jamais deviné :
// interpréter 03/06 à l'envers décale une disposition d'année fiscale.
export function parseTransactionDate(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmy) {
    const [, a, b, year] = dmy;
    // Si les deux premiers champs sont ≤ 12, on ne peut pas trancher jour/mois.
    if (Number(a) <= 12 && Number(b) <= 12 && a !== b) return { ambiguous: true };
    const day = Number(a) > 12 ? a : b;
    const month = Number(a) > 12 ? b : a;
    if (Number(month) > 12) return null;
    return `${year}-${month}-${day}`;
  }
  return null;
}

export function normalizeTransactionType(raw) {
  const text = String(raw ?? "").trim();
  for (const [pattern, type] of TYPE_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return null;
}

function buildTransaction(row, mapping, lineNumber) {
  const cell = (field) => (mapping[field] >= 0 ? row[mapping[field]] : undefined);
  const errors = [];

  // Sans type connu on ne sait pas quelle forme valider (quantité+prix pour un
  // achat, montant pour un dividende) — on s'arrête là plutôt que d'empiler des
  // erreurs de suivi qui noieraient la vraie cause.
  const type = normalizeTransactionType(cell("type"));
  if (!type) {
    return { errors: [{ line: lineNumber, reason: `Type de transaction non reconnu : « ${String(cell("type") ?? "").trim()} ».` }] };
  }

  const parsedDate = parseTransactionDate(cell("date"));
  if (parsedDate?.ambiguous) {
    errors.push({ line: lineNumber, reason: `Date ambiguë « ${String(cell("date")).trim()} » — jour et mois indiscernables. Exporte en ISO (AAAA-MM-JJ).` });
  } else if (!parsedDate) {
    errors.push({ line: lineNumber, reason: "Date manquante ou illisible." });
  }

  const symbol = String(cell("symbol") ?? "").trim().toUpperCase();
  if (!symbol) errors.push({ line: lineNumber, reason: "Symbole manquant." });

  const fee = Math.abs(parseNumericField(cell("fee"))) || 0;

  // buy/sell exigent quantité ET prix : sans eux, ni lot ni flux de capital.
  if (type === "buy" || type === "sell") {
    const quantity = Math.abs(parseNumericField(cell("quantity")));
    const price = Math.abs(parseNumericField(cell("price")));
    if (!Number.isFinite(quantity) || quantity <= 0) errors.push({ line: lineNumber, reason: "Quantité invalide ou nulle." });
    if (!Number.isFinite(price) || price <= 0) errors.push({ line: lineNumber, reason: "Prix invalide ou nul." });
    if (errors.length) return { errors };
    return { transaction: { type, symbol, date: parsedDate, quantity, price, fee, sourceLine: lineNumber } };
  }

  // dividend/fee portent un montant, pas une quantité.
  const amount = Math.abs(parseNumericField(cell("amount")));
  if (!Number.isFinite(amount) || amount <= 0) errors.push({ line: lineNumber, reason: "Montant invalide ou nul." });
  if (errors.length) return { errors };
  return { transaction: { type, symbol, date: parsedDate, amount, sourceLine: lineNumber } };
}

export function parseTransactionCsv(text, options = {}) {
  const { headers, rows } = parseCsv(text);
  const empty = { date: -1, type: -1, symbol: -1, quantity: -1, price: -1, fee: -1, amount: -1 };

  if (!headers.length) {
    return { mapping: empty, transactions: [], errors: [{ line: 0, reason: "CSV vide ou en-têtes manquants." }] };
  }

  const mapping = options.mapping ?? detectTransactionMapping(headers);

  const missing = ["date", "type", "symbol"].filter((field) => mapping[field] === -1);
  if (missing.length) {
    return {
      mapping,
      transactions: [],
      errors: [{ line: 1, reason: `Colonnes requises introuvables : ${missing.join(", ")}. Vérifie l'en-tête ou ajuste le mapping.` }],
    };
  }

  const transactions = [];
  const errors = [];

  rows.forEach((row, index) => {
    const result = buildTransaction(row, mapping, index + 2);
    if (result.errors) errors.push(...result.errors);
    else transactions.push(result.transaction);
  });

  // Tri chronologique : le moteur de lots apparie dans l'ordre, un relevé
  // trié à l'envers (le plus courant) inverserait FIFO.
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return { mapping, transactions, errors };
}
