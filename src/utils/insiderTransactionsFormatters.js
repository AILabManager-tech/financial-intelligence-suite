// Pure formatters for insider (Form 4) transactions. Per-field, return null on
// invalid input — never fabricate a value. SEC transaction codes are mapped to
// French labels; the row's tone is driven by the share-change SIGN (acquired vs
// disposed), which is the factual signal, not by the code alone.

const CODE_LABELS = {
  P: 'Achat (marché)',
  S: 'Vente (marché)',
  A: 'Attribution',
  D: 'Cession à l\'émetteur',
  F: 'Paiement en titres',
  M: 'Exercice de dérivés',
  G: 'Don',
  C: 'Conversion',
  X: 'Exercice d\'options',
  J: 'Autre',
};

export function describeTransactionCode(code) {
  const key = typeof code === 'string' ? code.trim().toUpperCase() : '';
  if (!key) return { code: '', label: 'Non précisé' };
  return { code: key, label: CODE_LABELS[key] ?? key };
}

export function transactionDirection(change) {
  const value = Number(change);
  if (!Number.isFinite(value) || value === 0) return null;
  return value > 0 ? 'acquired' : 'disposed';
}

export function directionTone(direction) {
  if (direction === 'acquired') return 'emerald';
  if (direction === 'disposed') return 'rose';
  return 'slate';
}

export function formatShareChange(change) {
  const value = Number(change);
  if (!Number.isFinite(value) || value === 0) return null;
  const sign = value > 0 ? '+' : '−';
  return `${sign}${Math.abs(value).toLocaleString('fr-CA')}`;
}

export function formatInsiderDate(value) {
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

export function formatTransactionValue(change, price) {
  const shares = Math.abs(Number(change));
  const unit = Number(price);
  if (!Number.isFinite(shares) || shares === 0 || !Number.isFinite(unit) || unit <= 0) {
    return null;
  }
  return (shares * unit).toLocaleString('fr-CA', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function summarizeInsiderActivity(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { hasData: false };
  }

  let buyCount = 0;
  let sellCount = 0;
  let acquiredShares = 0;
  let disposedShares = 0;
  const insiders = new Set();
  let lastTransactionDate = null;

  for (const item of items) {
    const direction = transactionDirection(item?.change);
    if (!direction) continue;
    if (typeof item?.name === 'string' && item.name.trim()) insiders.add(item.name.trim());
    const magnitude = Math.abs(Number(item.change));
    if (direction === 'acquired') {
      buyCount += 1;
      acquiredShares += magnitude;
    } else {
      sellCount += 1;
      disposedShares += magnitude;
    }
    if (typeof item?.transactionDate === 'string'
      && (!lastTransactionDate || item.transactionDate > lastTransactionDate)) {
      lastTransactionDate = item.transactionDate;
    }
  }

  if (buyCount === 0 && sellCount === 0) {
    return { hasData: false };
  }

  const netShares = acquiredShares - disposedShares;
  return {
    hasData: true,
    count: buyCount + sellCount,
    buyCount,
    sellCount,
    acquiredShares,
    disposedShares,
    netShares,
    netDirection: netShares > 0 ? 'acquired' : netShares < 0 ? 'disposed' : null,
    uniqueInsiders: insiders.size,
    lastTransactionDate,
  };
}
