const HEADER_PATTERNS = {
  symbol: /^(symbol|ticker|symbole|isin|code)$/i,
  quantity: /^(quantity|quantité|quantite|qty|qte|shares|units|parts|nombre)$/i,
  averageCost: /^(price|prix|cost|coût|cout|avg.?cost|average.?cost|cost.?basis|cost.?basis.?per.?share|prix.?moyen|moyenne|coût.?moyen|cout.?moyen)$/i,
  targetWeight: /^(target|cible|allocation|target.?weight|target.?allocation|allocation.?cible|poids.?cible)$/i,
};

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export function parseCsv(text) {
  const trimmed = String(text ?? "").replace(/^\uFEFF/, "").trim();
  if (!trimmed) return { headers: [], rows: [] };

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]).map((field) => field.trim());
  const rows = lines.slice(1).map((line) => parseCsvLine(line));

  return { headers, rows };
}

function findColumn(headers, pattern) {
  const index = headers.findIndex((header) => pattern.test(String(header).trim()));
  return index;
}

export function detectColumnMapping(headers) {
  return {
    symbol: findColumn(headers, HEADER_PATTERNS.symbol),
    quantity: findColumn(headers, HEADER_PATTERNS.quantity),
    averageCost: findColumn(headers, HEADER_PATTERNS.averageCost),
    targetWeight: findColumn(headers, HEADER_PATTERNS.targetWeight),
  };
}

function parseNumericField(raw) {
  if (raw == null) return NaN;
  const cleaned = String(raw)
    .replace(/[\s$€£¥]/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(/%$/, "")
    .replace(/,/g, ".");
  return Number(cleaned);
}

function buildPosition(row, mapping, lineNumber) {
  const errors = [];

  const symbolRaw = mapping.symbol >= 0 ? row[mapping.symbol] : undefined;
  const symbol = String(symbolRaw ?? "").trim().toUpperCase();
  if (!symbol) {
    errors.push({ line: lineNumber, reason: "Symbol manquant ou vide." });
  }

  const quantity = parseNumericField(mapping.quantity >= 0 ? row[mapping.quantity] : undefined);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.push({ line: lineNumber, reason: "Quantity invalide ou non strictement positive." });
  }

  const averageCost = parseNumericField(mapping.averageCost >= 0 ? row[mapping.averageCost] : undefined);
  if (!Number.isFinite(averageCost) || averageCost <= 0) {
    errors.push({ line: lineNumber, reason: "Cost (prix moyen) invalide ou non strictement positif." });
  }

  let targetWeight = 0;
  if (mapping.targetWeight >= 0) {
    const parsed = parseNumericField(row[mapping.targetWeight]);
    targetWeight = Number.isFinite(parsed) ? parsed : 0;
  }

  if (errors.length) {
    return { errors };
  }

  return {
    position: {
      symbol,
      quantity,
      averageCost,
      targetWeight,
      sourceLine: lineNumber,
    },
  };
}

export function parseBrokerCsv(text, options = {}) {
  const { headers, rows } = parseCsv(text);

  if (!headers.length) {
    return {
      mapping: { symbol: -1, quantity: -1, averageCost: -1, targetWeight: -1 },
      positions: [],
      errors: [{ line: 0, reason: "CSV vide ou en-têtes manquants." }],
    };
  }

  const mapping = options.mapping ?? detectColumnMapping(headers);

  if (mapping.symbol === -1) {
    return {
      mapping,
      positions: [],
      errors: [{ line: 1, reason: "Aucune colonne symbol/ticker détectée. Mapping manuel requis." }],
    };
  }
  if (mapping.quantity === -1 || mapping.averageCost === -1) {
    return {
      mapping,
      positions: [],
      errors: [{
        line: 1,
        reason: "Colonnes quantity et cost requises. Vérifiez l'en-tête ou ajustez le mapping.",
      }],
    };
  }

  const positions = [];
  const errors = [];

  rows.forEach((row, index) => {
    const lineNumber = index + 2;
    const result = buildPosition(row, mapping, lineNumber);
    if (result.errors) {
      errors.push(...result.errors);
    } else {
      positions.push(result.position);
    }
  });

  return { mapping, positions, errors };
}
