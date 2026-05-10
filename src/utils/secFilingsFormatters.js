const FORM_DEFINITIONS = [
  { match: /^10-K(\/A)?$/i, label: 'Rapport annuel', tone: 'violet' },
  { match: /^10-Q(\/A)?$/i, label: 'Rapport trimestriel', tone: 'sky' },
  { match: /^20-F(\/A)?$/i, label: 'Rapport annuel étranger', tone: 'violet' },
  { match: /^40-F(\/A)?$/i, label: 'Rapport annuel canadien', tone: 'violet' },
  { match: /^6-K(\/A)?$/i, label: 'Rapport semestriel étranger', tone: 'sky' },
  { match: /^8-K(\/A)?$/i, label: 'Événement matériel', tone: 'amber' },
  { match: /^4(\/A)?$/i, label: 'Transaction insider', tone: 'rose' },
  { match: /^3(\/A)?$/i, label: 'Déclaration insider', tone: 'rose' },
  { match: /^5(\/A)?$/i, label: 'Bilan insider annuel', tone: 'rose' },
  { match: /^DEF 14A$/i, label: 'Procuration (proxy)', tone: 'slate' },
  { match: /^DEFA14A$/i, label: 'Proxy supplément', tone: 'slate' },
  { match: /^S-1(\/A)?$/i, label: 'Inscription (IPO)', tone: 'emerald' },
  { match: /^S-3(\/A)?$/i, label: 'Inscription simplifiée', tone: 'emerald' },
  { match: /^S-4(\/A)?$/i, label: 'Inscription M&A', tone: 'emerald' },
  { match: /^F-1(\/A)?$/i, label: 'Inscription IPO étrangère', tone: 'emerald' },
  { match: /^424B[0-9]?$/i, label: 'Prospectus définitif', tone: 'emerald' },
  { match: /^13F(-HR)?(\/A)?$/i, label: 'Position institutionnelle', tone: 'indigo' },
  { match: /^SC 13D(\/A)?$/i, label: 'Acquisition >5% (active)', tone: 'indigo' },
  { match: /^SC 13G(\/A)?$/i, label: 'Acquisition >5% (passive)', tone: 'indigo' },
  { match: /^11-K$/i, label: 'Plan d\'actionnariat employés', tone: 'slate' },
  { match: /^NT 10-K$/i, label: 'Avis retard rapport annuel', tone: 'amber' },
  { match: /^NT 10-Q$/i, label: 'Avis retard rapport trimestriel', tone: 'amber' },
];

export function describeFormType(form) {
  if (typeof form !== 'string' || !form.trim()) return null;
  const key = form.trim();
  const match = FORM_DEFINITIONS.find((entry) => entry.match.test(key));
  if (match) {
    return { key, label: match.label, tone: match.tone };
  }
  return { key, label: key, tone: 'slate' };
}

export function formatFiledDate(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('fr-CA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function resolveFilingUrl(item) {
  if (!item || typeof item !== 'object') return null;
  const report = typeof item.reportUrl === 'string' ? item.reportUrl.trim() : '';
  if (report) return report;
  const filing = typeof item.filingUrl === 'string' ? item.filingUrl.trim() : '';
  return filing || null;
}

export function groupByForm(items) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const order = [];
  const buckets = new Map();
  for (const item of items) {
    const def = describeFormType(item?.form);
    if (!def) continue;
    if (!buckets.has(def.key)) {
      order.push(def.key);
      buckets.set(def.key, { key: def.key, label: def.label, tone: def.tone, items: [] });
    }
    buckets.get(def.key).items.push(item);
  }
  return order.map((key) => buckets.get(key));
}
