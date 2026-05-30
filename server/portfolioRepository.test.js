import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPortfolioRepository } from './portfolioRepository';

function freshRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'fis-portfolio-'));
  const dbPath = join(dir, 'test.sqlite');
  const repository = createPortfolioRepository(dbPath);
  return {
    repository,
    cleanup() {
      repository.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

describe('portfolioRepository', () => {
  it('persists positions in sqlite', () => {
    const { repository, cleanup } = freshRepo();

    repository.saveAssets([
      {
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        sector: 'Technologie',
        price: 215,
        position: { quantity: 3, averageCost: 180, targetWeight: 12 },
      },
    ]);

    expect(repository.listAssets()).toEqual([
      expect.objectContaining({
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        position: { quantity: 3, averageCost: 180, targetWeight: 12 },
      }),
    ]);

    cleanup();
  });

  it('persists portfolio snapshots chronologically', () => {
    const { repository, cleanup } = freshRepo();

    repository.saveSnapshot({
      capturedAt: '2026-05-08T10:00:00.000Z',
      totalMarketValue: 1000,
      totalCost: 900,
      unrealizedPnl: 100,
      unrealizedPnlPct: 11.11,
      positionsCount: 2,
      liveQuotesCount: 2,
    });
    repository.saveSnapshot({
      capturedAt: '2026-05-08T11:00:00.000Z',
      totalMarketValue: 1050,
      totalCost: 900,
      unrealizedPnl: 150,
      unrealizedPnlPct: 16.67,
      positionsCount: 2,
      liveQuotesCount: 1,
    });

    expect(repository.listSnapshots()).toEqual([
      expect.objectContaining({
        capturedAt: '2026-05-08T10:00:00.000Z',
        totalMarketValue: 1000,
        liveQuotesCount: 2,
      }),
      expect.objectContaining({
        capturedAt: '2026-05-08T11:00:00.000Z',
        totalMarketValue: 1050,
        liveQuotesCount: 1,
      }),
    ]);

    cleanup();
  });
});

describe('portfolioRepository — multi-mandats (P3.2c)', () => {
  it('isole les positions par mandat', () => {
    const { repository, cleanup } = freshRepo();

    repository.saveAssets([
      { symbol: 'AAPL', name: 'Apple', sector: 'Tech', position: { quantity: 1, averageCost: 100, targetWeight: 0 } },
    ], 'default');
    repository.saveAssets([
      { symbol: 'MSFT', name: 'Microsoft', sector: 'Tech', position: { quantity: 2, averageCost: 150, targetWeight: 0 } },
    ], 'client-a');

    expect(repository.listAssets('default').map((a) => a.symbol)).toEqual(['AAPL']);
    expect(repository.listAssets('client-a').map((a) => a.symbol)).toEqual(['MSFT']);

    cleanup();
  });

  it('isole les snapshots par mandat', () => {
    const { repository, cleanup } = freshRepo();
    repository.saveSnapshot({ capturedAt: '2026-01-01T00:00:00.000Z', totalMarketValue: 10 }, 'client-a');
    expect(repository.listSnapshots(120, 'client-a')).toHaveLength(1);
    expect(repository.listSnapshots(120, 'default')).toHaveLength(0);
    cleanup();
  });

  it('CRUD des mandats : liste, upsert, suppression en cascade', () => {
    const { repository, cleanup } = freshRepo();

    expect(repository.listPortfolios().map((p) => p.id)).toContain('default');

    repository.savePortfolio({ id: 'client-a', name: 'Client A', client: 'Acme', baseCurrency: 'cad' });
    const a = repository.listPortfolios().find((p) => p.id === 'client-a');
    expect(a).toMatchObject({ id: 'client-a', name: 'Client A', client: 'Acme', baseCurrency: 'CAD' });

    repository.savePortfolio({ id: 'client-a', name: 'Client A renomme', baseCurrency: 'USD' });
    expect(repository.listPortfolios().filter((p) => p.id === 'client-a')).toHaveLength(1);
    expect(repository.listPortfolios().find((p) => p.id === 'client-a').name).toBe('Client A renomme');

    repository.saveAssets([{ symbol: 'TSLA', name: 'Tesla', sector: 'Auto', position: { quantity: 1, averageCost: 1 } }], 'client-a');
    expect(repository.listAssets('client-a')).toHaveLength(1);
    expect(repository.removePortfolio('client-a')).toBe(true);
    expect(repository.listPortfolios().map((p) => p.id)).not.toContain('client-a');
    expect(repository.listAssets('client-a')).toHaveLength(0);

    cleanup();
  });

  it('saveAssets enregistre le mandat manquant (FK) sans metadonnees', () => {
    const { repository, cleanup } = freshRepo();
    repository.saveAssets([{ symbol: 'GOOG', name: 'Alphabet', sector: 'Tech', position: { quantity: 1, averageCost: 1 } }], 'client-z');
    expect(repository.listPortfolios().map((p) => p.id)).toContain('client-z');
    cleanup();
  });
});
