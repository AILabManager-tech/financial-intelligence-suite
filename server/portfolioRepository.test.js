import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPortfolioRepository } from './portfolioRepository';

describe('portfolioRepository', () => {
  it('persists positions in sqlite', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fis-portfolio-'));
    const dbPath = join(dir, 'test.sqlite');
    const repository = createPortfolioRepository(dbPath);

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

    repository.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('persists portfolio snapshots chronologically', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fis-portfolio-'));
    const dbPath = join(dir, 'test.sqlite');
    const repository = createPortfolioRepository(dbPath);

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

    repository.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
