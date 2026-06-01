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

  it('accumule un seul snapshot par jour : une re-capture le même jour met à jour la valeur (005)', () => {
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
    // Même jour calendaire, plus tard : ne crée PAS une 2e ligne, met à jour.
    repository.saveSnapshot({
      capturedAt: '2026-05-08T11:00:00.000Z',
      totalMarketValue: 1050,
      totalCost: 900,
      unrealizedPnl: 150,
      unrealizedPnlPct: 16.67,
      positionsCount: 2,
      liveQuotesCount: 1,
    });

    const snapshots = repository.listSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toEqual(
      expect.objectContaining({
        capturedAt: '2026-05-08T11:00:00.000Z',
        snapshotDate: '2026-05-08',
        totalMarketValue: 1050,
        liveQuotesCount: 1,
      }),
    );

    cleanup();
  });

  it('accumule une série journalière sur plusieurs jours, en ordre chronologique', () => {
    const { repository, cleanup } = freshRepo();

    repository.saveSnapshot({ capturedAt: '2026-05-08T16:00:00.000Z', totalMarketValue: 1000 });
    repository.saveSnapshot({ capturedAt: '2026-05-09T16:00:00.000Z', totalMarketValue: 1020 });
    repository.saveSnapshot({ capturedAt: '2026-05-10T16:00:00.000Z', totalMarketValue: 990 });

    const series = repository.listSnapshots();
    expect(series.map((s) => s.snapshotDate)).toEqual(['2026-05-08', '2026-05-09', '2026-05-10']);
    expect(series.map((s) => s.totalMarketValue)).toEqual([1000, 1020, 990]);

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

describe('portfolioRepository — transactions (P3 server parity)', () => {
  it('persiste et relit les transactions, mappant date<->trade_date', () => {
    const { repository, cleanup } = freshRepo();
    repository.saveTransactions([
      { id: 't1', type: 'buy', symbol: 'aapl', date: '2020-01-01', quantity: 10, price: 100, fee: 5 },
      { id: 't2', type: 'dividend', symbol: 'AAPL', date: '2021-02-01', amount: 25 },
    ], 'default');

    const rows = repository.listTransactions('default');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 't1', type: 'buy', symbol: 'AAPL', date: '2020-01-01', quantity: 10, price: 100, fee: 5 });
    expect(rows[1]).toMatchObject({ id: 't2', type: 'dividend', symbol: 'AAPL', amount: 25 });
    cleanup();
  });

  it('isole les transactions par mandat', () => {
    const { repository, cleanup } = freshRepo();
    repository.saveTransactions([{ id: 't1', type: 'buy', symbol: 'AAPL', date: '2020-01-01', quantity: 1, price: 1 }], 'default');
    repository.saveTransactions([{ id: 't1', type: 'buy', symbol: 'MSFT', date: '2020-01-01', quantity: 2, price: 2 }], 'client-a');
    expect(repository.listTransactions('default').map((t) => t.symbol)).toEqual(['AAPL']);
    expect(repository.listTransactions('client-a').map((t) => t.symbol)).toEqual(['MSFT']);
    cleanup();
  });

  it('remplace tout le journal à chaque save (snapshot) et ignore les invalides', () => {
    const { repository, cleanup } = freshRepo();
    repository.saveTransactions([{ id: 't1', type: 'buy', symbol: 'AAPL', date: '2020-01-01', quantity: 1, price: 1 }], 'default');
    repository.saveTransactions([
      { id: 't2', type: 'sell', symbol: 'AAPL', date: '2021-01-01', quantity: 1, price: 2 },
      { type: 'xfer', symbol: 'AAPL', date: '2021-01-01' },
      { type: 'buy', symbol: '', date: '2021-01-01' },
    ], 'default');
    const rows = repository.listTransactions('default');
    expect(rows.map((t) => t.id)).toEqual(['t2']);
    cleanup();
  });

  it('cascade : supprimer le mandat supprime ses transactions', () => {
    const { repository, cleanup } = freshRepo();
    repository.saveTransactions([{ id: 't1', type: 'buy', symbol: 'TSLA', date: '2020-01-01', quantity: 1, price: 1 }], 'client-a');
    expect(repository.listTransactions('client-a')).toHaveLength(1);
    repository.removePortfolio('client-a');
    expect(repository.listTransactions('client-a')).toHaveLength(0);
    cleanup();
  });
});
