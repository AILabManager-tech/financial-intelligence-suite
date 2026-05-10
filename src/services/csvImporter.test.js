import { describe, expect, it } from 'vitest';
import {
  detectColumnMapping,
  parseBrokerCsv,
  parseCsv,
} from './csvImporter';

describe('parseCsv', () => {
  it('handles a basic CSV with comma separator', () => {
    const csv = 'Symbol,Quantity,Cost\nAAPL,10,150\nNVDA,2,800';
    expect(parseCsv(csv)).toEqual({
      headers: ['Symbol', 'Quantity', 'Cost'],
      rows: [
        ['AAPL', '10', '150'],
        ['NVDA', '2', '800'],
      ],
    });
  });

  it('handles CRLF line endings (Windows broker exports)', () => {
    const csv = 'Symbol,Quantity\r\nAAPL,10\r\nNVDA,2\r\n';
    expect(parseCsv(csv).rows).toEqual([
      ['AAPL', '10'],
      ['NVDA', '2'],
    ]);
  });

  it('handles quoted fields containing commas and embedded quotes', () => {
    const csv = 'Symbol,Description,Quantity\n"BRK.A","Berkshire ""A""",1\n"AAPL","Apple, Inc.",10';
    const { rows } = parseCsv(csv);
    expect(rows[0]).toEqual(['BRK.A', 'Berkshire "A"', '1']);
    expect(rows[1]).toEqual(['AAPL', 'Apple, Inc.', '10']);
  });

  it('skips empty trailing lines without producing empty rows', () => {
    const csv = 'A,B\n1,2\n\n\n';
    expect(parseCsv(csv).rows).toEqual([['1', '2']]);
  });

  it('returns empty headers and rows for empty input', () => {
    expect(parseCsv('')).toEqual({ headers: [], rows: [] });
    expect(parseCsv('   ')).toEqual({ headers: [], rows: [] });
  });
});

describe('detectColumnMapping', () => {
  it('detects a typical broker CSV (English headers)', () => {
    expect(detectColumnMapping(['Symbol', 'Quantity', 'Average Cost', 'Target Weight']))
      .toEqual({ symbol: 0, quantity: 1, averageCost: 2, targetWeight: 3 });
  });

  it('detects French headers', () => {
    expect(detectColumnMapping(['Ticker', 'Quantité', 'Prix moyen', 'Allocation cible']))
      .toEqual({ symbol: 0, quantity: 1, averageCost: 2, targetWeight: 3 });
  });

  it('detects shares/cost basis variants', () => {
    expect(detectColumnMapping(['Symbol', 'Shares', 'Cost Basis Per Share']))
      .toEqual({ symbol: 0, quantity: 1, averageCost: 2, targetWeight: -1 });
  });

  it('returns -1 for missing columns rather than guessing', () => {
    expect(detectColumnMapping(['Date', 'Notes']))
      .toEqual({ symbol: -1, quantity: -1, averageCost: -1, targetWeight: -1 });
  });

  it('is case insensitive and trims whitespace', () => {
    expect(detectColumnMapping(['  SYMBOL  ', 'qty', 'PRICE']))
      .toEqual({ symbol: 0, quantity: 1, averageCost: 2, targetWeight: -1 });
  });
});

describe('parseBrokerCsv', () => {
  it('returns a list of valid positions ready for upsert', () => {
    const csv = 'Symbol,Quantity,Average Cost,Target Weight\nAAPL,10,150.5,15\nnvda,2,800,10';
    const result = parseBrokerCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.positions).toEqual([
      { symbol: 'AAPL', quantity: 10, averageCost: 150.5, targetWeight: 15, sourceLine: 2 },
      { symbol: 'NVDA', quantity: 2, averageCost: 800, targetWeight: 10, sourceLine: 3 },
    ]);
    expect(result.mapping).toEqual({ symbol: 0, quantity: 1, averageCost: 2, targetWeight: 3 });
  });

  it('coerces percentage strings ("12.5%") on target weight', () => {
    const csv = 'Symbol,Quantity,Cost,Allocation\nAAPL,10,150,"12.5%"';
    const result = parseBrokerCsv(csv);
    expect(result.positions[0].targetWeight).toBe(12.5);
  });

  it('strips currency symbols and thousands separators on numeric fields', () => {
    const csv = 'Symbol,Quantity,Cost\nAAPL,"1,000","$1,250.75"';
    const result = parseBrokerCsv(csv);
    expect(result.positions[0].quantity).toBe(1000);
    expect(result.positions[0].averageCost).toBe(1250.75);
  });

  it('reports errors with line numbers and reasons but keeps valid rows', () => {
    const csv = 'Symbol,Quantity,Cost\nAAPL,10,150\n,5,200\nNVDA,abc,800\nMSFT,2,0';
    const result = parseBrokerCsv(csv);

    expect(result.positions.map((position) => position.symbol)).toEqual(['AAPL']);
    expect(result.errors).toEqual([
      { line: 3, reason: expect.stringMatching(/symbol/i) },
      { line: 4, reason: expect.stringMatching(/quantity/i) },
      { line: 5, reason: expect.stringMatching(/cost/i) },
    ]);
  });

  it('rejects the file when no symbol column is detected', () => {
    const csv = 'Date,Notes,Other\n2026-05-09,foo,bar';
    const result = parseBrokerCsv(csv);
    expect(result.positions).toEqual([]);
    expect(result.errors[0].reason).toMatch(/symbol/i);
  });

  it('accepts a manual mapping override that beats auto-detection', () => {
    const csv = 'a,b,c\nAAPL,10,150';
    const result = parseBrokerCsv(csv, {
      mapping: { symbol: 0, quantity: 1, averageCost: 2, targetWeight: -1 },
    });
    expect(result.positions[0]).toMatchObject({ symbol: 'AAPL', quantity: 10, averageCost: 150 });
  });

  it('defaults targetWeight to 0 when the column is missing', () => {
    const csv = 'Symbol,Quantity,Cost\nAAPL,10,150';
    const result = parseBrokerCsv(csv);
    expect(result.positions[0].targetWeight).toBe(0);
  });
});
