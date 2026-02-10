import { describe, it, expect } from 'vitest';
import {
  getScoreLabel,
  getScoreColor,
  formatCurrency,
  formatPercent,
  confidenceToText,
  timeAgo,
} from './scoreTranslator';

describe('getScoreLabel', () => {
  it('returns "Opportunité Forte" for score >= 90', () => {
    expect(getScoreLabel(92)).toBe('Opportunité Forte');
    expect(getScoreLabel(90)).toBe('Opportunité Forte');
  });
  it('returns "Opportunité Modérée" for score 75-89', () => {
    expect(getScoreLabel(84)).toBe('Opportunité Modérée');
    expect(getScoreLabel(75)).toBe('Opportunité Modérée');
  });
  it('returns "Surveiller" for score 60-74', () => {
    expect(getScoreLabel(60)).toBe('Surveiller');
  });
  it('returns "Prudence" for score 40-59', () => {
    expect(getScoreLabel(45)).toBe('Prudence');
  });
  it('returns "Risque Élevé" for score < 40', () => {
    expect(getScoreLabel(20)).toBe('Risque Élevé');
  });
});

describe('getScoreColor', () => {
  it('returns emerald colors for score >= 90', () => {
    const result = getScoreColor(95);
    expect(result.ring).toBe('#34d399');
    expect(result.text).toContain('emerald');
  });
  it('returns blue colors for score 75-89', () => {
    const result = getScoreColor(80);
    expect(result.ring).toBe('#60a5fa');
  });
  it('returns amber for score 60-74', () => {
    expect(getScoreColor(65).ring).toBe('#fbbf24');
  });
  it('returns orange for score 40-59', () => {
    expect(getScoreColor(50).ring).toBe('#fb923c');
  });
  it('returns rose for score < 40', () => {
    expect(getScoreColor(20).ring).toBe('#fb7185');
  });
});

describe('formatCurrency', () => {
  it('formats trillions', () => {
    expect(formatCurrency(2.5e12)).toBe('$2.5T');
  });
  it('formats billions as Mds', () => {
    expect(formatCurrency(130e9)).toBe('$130.0Mds');
  });
  it('formats millions', () => {
    expect(formatCurrency(5.5e6)).toBe('$5.5M');
  });
});

describe('formatPercent', () => {
  it('adds + sign for positive values', () => {
    expect(formatPercent(1.23)).toBe('+1.23%');
  });
  it('keeps - sign for negative values', () => {
    expect(formatPercent(-2.15)).toBe('-2.15%');
  });
  it('handles zero', () => {
    expect(formatPercent(0)).toBe('+0.00%');
  });
});

describe('confidenceToText', () => {
  it('maps confidence levels correctly', () => {
    expect(confidenceToText(0.95)).toBe('Confiance très élevée');
    expect(confidenceToText(0.85)).toBe('Confiance élevée');
    expect(confidenceToText(0.75)).toBe('Confiance modérée');
    expect(confidenceToText(0.55)).toBe('Confiance faible');
    expect(confidenceToText(0.3)).toBe('Incertain');
  });
});

describe('timeAgo', () => {
  it('returns "À l\'instant" for recent times', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe("À l'instant");
  });
  it('returns minutes for times < 1 hour ago', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60000).toISOString();
    expect(timeAgo(tenMinAgo)).toBe('il y a 10 min');
  });
  it('returns hours for times < 24 hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(timeAgo(threeHoursAgo)).toBe('il y a 3h');
  });
  it('returns days for times > 24 hours ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(timeAgo(twoDaysAgo)).toBe('il y a 2j');
  });
});
