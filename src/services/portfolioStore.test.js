import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { normalizePortfolioAsset, removePortfolioAsset, upsertPortfolioAsset, loadPortfolioAssets, savePortfolioAssets } from './portfolioStore';
import { calculatePortfolioAnalytics } from '../utils/portfolioAnalytics';

describe('normalizePortfolioAsset', () => {
  it('normalizes position fields', () => {
    expect(normalizePortfolioAsset({
      symbol: 'nvda',
      name: 'NVIDIA',
      price: '215.2',
      position: { quantity: '2', averageCost: '200', targetWeight: '10' },
    })).toMatchObject({
      symbol: 'NVDA',
      price: 215.2,
      position: { quantity: 2, averageCost: 200, targetWeight: 10 },
    });
  });

  it("neutralise les valeurs hors borne comme une donnée corrompue", () => {
    // C'est la SEULE couche en ligne : le portefeuille persiste en localStorage,
    // il n'existe pas de handler `/api/portfolio`. Sans borne ici, `quantity ×
    // price` vaut Infinity et contamine tous les totaux du portefeuille — le
    // validateur serveur ne couvre que le backend SQLite de développement.
    // Traitement identique à une valeur non finie : repli, jamais un nombre
    // inventé entre les deux.
    const normalized = normalizePortfolioAsset({
      symbol: 'AAPL',
      name: 'Apple',
      price: 1e308,
      position: { quantity: 1e308, averageCost: 1e308, targetWeight: 10 },
    });

    expect(normalized.price).toBe(0);
    expect(normalized.position.quantity).toBe(0);
    expect(normalized.position.averageCost).toBe(0);
  });

  it("laisse passer un portefeuille réaliste", () => {
    const normalized = normalizePortfolioAsset({
      symbol: 'AAPL',
      name: 'Apple',
      price: 750_000,
      position: { quantity: 1_000_000, averageCost: 750_000, targetWeight: 10 },
    });

    expect(normalized.price).toBe(750_000);
    expect(normalized.position.quantity).toBe(1_000_000);
    expect(normalized.position.averageCost).toBe(750_000);
  });

  it("un actif hors borne ne rend plus les totaux infinis", () => {
    // La conséquence réelle du défaut, et donc le vrai test de non-régression :
    // une seule position démesurée suffisait à mettre Infinity dans la valeur
    // totale, les poids et l'exposition sectorielle.
    const analytics = calculatePortfolioAnalytics([
      normalizePortfolioAsset({
        symbol: 'AAPL',
        name: 'Apple',
        sector: 'Technology',
        price: 1e308,
        position: { quantity: 1e308, averageCost: 1e308, targetWeight: 10 },
      }),
    ]);

    expect(Number.isFinite(analytics.totalMarketValue)).toBe(true);
  });
});

describe('portfolio updates', () => {
  it('upserts and removes assets', () => {
    const added = upsertPortfolioAsset([], { symbol: 'AAPL', name: 'Apple Inc.', price: 293 }, {
      quantity: 4,
      averageCost: 250,
      targetWeight: 12,
    });

    expect(added).toHaveLength(1);
    expect(added[0].position.quantity).toBe(4);
    expect(removePortfolioAsset(added, 'AAPL')).toHaveLength(0);
  });
});

describe('positions scopées par mandat (P3.2)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('isole les positions de chaque mandat (clé namespacée), default = clé legacy', () => {
    savePortfolioAssets([{ symbol: 'AAPL', name: 'Apple', price: 200, position: { quantity: 1, averageCost: 100, targetWeight: 0 } }], 'default');
    savePortfolioAssets([{ symbol: 'MSFT', name: 'Microsoft', price: 300, position: { quantity: 2, averageCost: 150, targetWeight: 0 } }], 'client-a');

    expect(loadPortfolioAssets([], 'default').map((a) => a.symbol)).toEqual(['AAPL']);
    expect(loadPortfolioAssets([], 'client-a').map((a) => a.symbol)).toEqual(['MSFT']);
    // le mandat 'default' utilise la clé legacy (rétro-compat)
    expect(localStorage.getItem('financial-intelligence-suite.portfolio.v1')).not.toBeNull();
    expect(localStorage.getItem('financial-intelligence-suite.portfolio.v1::client-a')).not.toBeNull();
  });

  it("un mandat sans positions stockées retombe sur le défaut fourni", () => {
    expect(loadPortfolioAssets([], 'vide')).toEqual([]);
  });
});

