import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchTransactionsFromApi, saveTransactionsToApi } from "./transactionApi";

const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
const firstUrl = () => globalThis.fetch.mock.calls[0][0];

describe("transactionApi — scoping par mandat", () => {
  beforeEach(() => { globalThis.fetch = vi.fn(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("default utilise l'endpoint nu", async () => {
    globalThis.fetch.mockReturnValue(ok({ transactions: [] }));
    await fetchTransactionsFromApi();
    expect(firstUrl()).toBe("/api/transactions");
  });

  it("autre mandat ajoute ?portfolio=", async () => {
    globalThis.fetch.mockReturnValue(ok({ transactions: [] }));
    await fetchTransactionsFromApi("client-a");
    expect(firstUrl()).toBe("/api/transactions?portfolio=client-a");
  });

  it("sauvegarde via PUT et retourne les transactions", async () => {
    globalThis.fetch.mockReturnValue(ok({ transactions: [{ id: "t1" }] }));
    const out = await saveTransactionsToApi([{ id: "t1" }], "client-a");
    expect(firstUrl()).toBe("/api/transactions?portfolio=client-a");
    expect(globalThis.fetch.mock.calls[0][1]).toMatchObject({ method: "PUT" });
    expect(out).toEqual([{ id: "t1" }]);
  });

  it("lève si la réponse n'est pas ok", async () => {
    globalThis.fetch.mockReturnValue(Promise.resolve({ ok: false, status: 502 }));
    await expect(fetchTransactionsFromApi()).rejects.toThrow(/502/);
  });
});
