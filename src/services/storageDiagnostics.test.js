import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearStorageFailures,
  describeStorageFailures,
  getStorageFailures,
  recordStorageFailure,
} from './storageDiagnostics';

afterEach(() => {
  clearStorageFailures();
  vi.restoreAllMocks();
});

describe('storageDiagnostics', () => {
  it('retient de quelle clé vient la panne et pourquoi', () => {
    recordStorageFailure('portefeuille', 'fis.portfolio.v1', new SyntaxError('Unexpected token'));

    const [failure] = getStorageFailures();
    expect(failure.label).toBe('portefeuille');
    expect(failure.key).toBe('fis.portfolio.v1');
    expect(failure.message).toContain('Unexpected token');
    expect(failure.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('laisse une trace en console — sans elle rien n\'est diagnosticable à distance', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    recordStorageFailure('portefeuille', 'fis.portfolio.v1', new Error('quota'));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toMatch(/portefeuille/i);
  });

  it('ne signale pas deux fois la même clé', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    recordStorageFailure('portefeuille', 'k', new Error('a'));
    recordStorageFailure('portefeuille', 'k', new Error('b'));
    expect(getStorageFailures()).toHaveLength(1);
  });

  it('rend un message lisible, sans jargon ni contenu de la clé', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    recordStorageFailure('portefeuille', 'fis.portfolio.v1', new SyntaxError('boom'));
    recordStorageFailure('historique', 'fis.snapshots.v1', new SyntaxError('boom'));

    const message = describeStorageFailures(getStorageFailures());
    expect(message).toMatch(/portefeuille/i);
    expect(message).toMatch(/historique/i);
    // La donnée corrompue n'est pas recopiée dans l'écran.
    expect(message).not.toContain('fis.portfolio.v1');
  });

  it('rend null quand il n\'y a rien à signaler', () => {
    expect(describeStorageFailures([])).toBeNull();
  });
});
