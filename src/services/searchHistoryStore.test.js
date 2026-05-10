import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_SEARCH_HISTORY,
  clearSearchHistory,
  loadSearchHistory,
  normalizeSearchHistory,
  recordSearch,
  removeSearchEntry,
  saveSearchHistory,
} from './searchHistoryStore';

describe('searchHistoryStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('caps history at MAX_SEARCH_HISTORY entries', () => {
    expect(MAX_SEARCH_HISTORY).toBeGreaterThanOrEqual(10);
    expect(MAX_SEARCH_HISTORY).toBeLessThanOrEqual(50);
  });

  it('normalizes entries: trims query, drops invalid records, defaults timestamps', () => {
    expect(
      normalizeSearchHistory([
        { query: '  Apple  ', recordedAt: '2026-05-09T11:00:00.000Z' },
        { query: '' },
        null,
        { query: 'NVDA', recordedAt: 'invalid-date' },
        { query: 'A'.repeat(120), recordedAt: '2026-05-09T10:00:00.000Z' },
      ]),
    ).toEqual([
      {
        query: 'Apple',
        normalizedQuery: 'apple',
        recordedAt: '2026-05-09T11:00:00.000Z',
        resultsCount: 0,
      },
      {
        query: 'NVDA',
        normalizedQuery: 'nvda',
        recordedAt: '2026-05-09T12:00:00.000Z',
        resultsCount: 0,
      },
      {
        query: 'A'.repeat(80),
        normalizedQuery: 'a'.repeat(80),
        recordedAt: '2026-05-09T10:00:00.000Z',
        resultsCount: 0,
      },
    ]);
  });

  it('persists and reloads history', () => {
    saveSearchHistory([{ query: 'Apple', recordedAt: '2026-05-09T11:00:00.000Z' }]);
    const reloaded = loadSearchHistory();
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].query).toBe('Apple');
  });

  it('recordSearch prepends new entries at the top', () => {
    const next = recordSearch([], { query: 'Apple', resultsCount: 4 });
    expect(next).toEqual([
      {
        query: 'Apple',
        normalizedQuery: 'apple',
        recordedAt: '2026-05-09T12:00:00.000Z',
        resultsCount: 4,
      },
    ]);
  });

  it('recordSearch deduplicates by normalized query and refreshes the timestamp', () => {
    const initial = [
      { query: 'Apple', normalizedQuery: 'apple', recordedAt: '2026-05-09T10:00:00.000Z', resultsCount: 1 },
      { query: 'NVDA', normalizedQuery: 'nvda', recordedAt: '2026-05-09T09:00:00.000Z', resultsCount: 2 },
    ];
    const next = recordSearch(initial, { query: 'apple', resultsCount: 7 });
    expect(next.map((entry) => entry.normalizedQuery)).toEqual(['apple', 'nvda']);
    expect(next[0]).toMatchObject({
      query: 'apple',
      recordedAt: '2026-05-09T12:00:00.000Z',
      resultsCount: 7,
    });
  });

  it('recordSearch ignores empty/short queries', () => {
    expect(recordSearch([], { query: ' ' })).toEqual([]);
    expect(recordSearch([], { query: 'a' })).toEqual([]);
  });

  it('recordSearch caps the history at MAX_SEARCH_HISTORY entries (FIFO)', () => {
    let history = [];
    for (let index = 0; index < MAX_SEARCH_HISTORY + 5; index += 1) {
      history = recordSearch(history, { query: `query-${index}`, resultsCount: index });
    }
    expect(history).toHaveLength(MAX_SEARCH_HISTORY);
    expect(history[0].query).toBe(`query-${MAX_SEARCH_HISTORY + 4}`);
  });

  it('removeSearchEntry filters by normalized query', () => {
    const initial = [
      { query: 'Apple', normalizedQuery: 'apple', recordedAt: '2026-05-09T11:00:00.000Z' },
      { query: 'NVDA', normalizedQuery: 'nvda', recordedAt: '2026-05-09T10:00:00.000Z' },
    ];
    const next = removeSearchEntry(initial, 'APPLE');
    expect(next).toHaveLength(1);
    expect(next[0].normalizedQuery).toBe('nvda');
  });

  it('clearSearchHistory removes the storage entry and returns []', () => {
    saveSearchHistory([{ query: 'Apple', recordedAt: '2026-05-09T11:00:00.000Z' }]);
    expect(clearSearchHistory()).toEqual([]);
    expect(loadSearchHistory()).toEqual([]);
  });
});
