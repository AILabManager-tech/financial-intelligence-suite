import { beforeEach, describe, expect, it } from "vitest";
import {
  JOURNAL_KEY,
  getNote,
  hasContent,
  loadJournal,
  normalizeNote,
  removeNote,
  saveJournal,
  upsertNote,
} from "./investmentJournalStore";

beforeEach(() => {
  localStorage.clear();
});

describe("investmentJournalStore — normalizeNote", () => {
  it("uppercases the symbol and trims the thesis", () => {
    const note = normalizeNote({ symbol: " aapl ", thesis: "  Moat durable.  " });
    expect(note.symbol).toBe("AAPL");
    expect(note.thesis).toBe("Moat durable.");
  });

  it("keeps conviction only as an integer 1..5, else null", () => {
    expect(normalizeNote({ symbol: "X", conviction: 4 }).conviction).toBe(4);
    expect(normalizeNote({ symbol: "X", conviction: "5" }).conviction).toBe(5);
    expect(normalizeNote({ symbol: "X", conviction: 0 }).conviction).toBeNull();
    expect(normalizeNote({ symbol: "X", conviction: 6 }).conviction).toBeNull();
    expect(normalizeNote({ symbol: "X", conviction: 3.5 }).conviction).toBeNull();
    expect(normalizeNote({ symbol: "X" }).conviction).toBeNull();
  });

  it("keeps target/stop prices only when finite and > 0, else null", () => {
    expect(normalizeNote({ symbol: "X", targetPrice: "210.5" }).targetPrice).toBe(210.5);
    expect(normalizeNote({ symbol: "X", targetPrice: 0 }).targetPrice).toBeNull();
    expect(normalizeNote({ symbol: "X", targetPrice: -5 }).targetPrice).toBeNull();
    expect(normalizeNote({ symbol: "X", stopPrice: 150 }).stopPrice).toBe(150);
    expect(normalizeNote({ symbol: "X", stopPrice: "abc" }).stopPrice).toBeNull();
  });

  it("keeps reviewDate only as a YYYY-MM-DD string, else empty", () => {
    expect(normalizeNote({ symbol: "X", reviewDate: "2026-09-01" }).reviewDate).toBe("2026-09-01");
    expect(normalizeNote({ symbol: "X", reviewDate: "soon" }).reviewDate).toBe("");
    expect(normalizeNote({ symbol: "X" }).reviewDate).toBe("");
  });

  it("returns null when there is no usable symbol", () => {
    expect(normalizeNote({ thesis: "no symbol" })).toBeNull();
    expect(normalizeNote(null)).toBeNull();
    expect(normalizeNote({ symbol: "   " })).toBeNull();
  });
});

describe("investmentJournalStore — hasContent", () => {
  it("is false for an empty note, true once any field is filled", () => {
    expect(hasContent(normalizeNote({ symbol: "X" }))).toBe(false);
    expect(hasContent(normalizeNote({ symbol: "X", thesis: "t" }))).toBe(true);
    expect(hasContent(normalizeNote({ symbol: "X", conviction: 2 }))).toBe(true);
    expect(hasContent(normalizeNote({ symbol: "X", targetPrice: 10 }))).toBe(true);
    expect(hasContent(normalizeNote({ symbol: "X", reviewDate: "2026-01-01" }))).toBe(true);
    expect(hasContent(null)).toBe(false);
  });
});

describe("investmentJournalStore — pure map mutators", () => {
  it("upserts a note keyed by symbol and looks it up case-insensitively", () => {
    const map = upsertNote({}, { symbol: "aapl", thesis: "Moat." });
    expect(getNote(map, "AAPL").thesis).toBe("Moat.");
    expect(getNote(map, "aapl").thesis).toBe("Moat.");
    expect(getNote(map, "MSFT")).toBeNull();
  });

  it("replaces an existing note for the same symbol", () => {
    let map = upsertNote({}, { symbol: "AAPL", conviction: 3 });
    map = upsertNote(map, { symbol: "AAPL", conviction: 5, thesis: "Renforcé." });
    expect(Object.keys(map)).toHaveLength(1);
    expect(getNote(map, "AAPL").conviction).toBe(5);
    expect(getNote(map, "AAPL").thesis).toBe("Renforcé.");
  });

  it("upserting an empty note removes the key (no junk)", () => {
    let map = upsertNote({}, { symbol: "AAPL", thesis: "Moat." });
    map = upsertNote(map, { symbol: "AAPL", thesis: "   " });
    expect(getNote(map, "AAPL")).toBeNull();
    expect(map).toEqual({});
  });

  it("removeNote drops the key", () => {
    const map = upsertNote({}, { symbol: "AAPL", thesis: "Moat." });
    expect(removeNote(map, "aapl")).toEqual({});
  });
});

describe("investmentJournalStore — persistence", () => {
  it("round-trips a journal through localStorage", () => {
    const map = upsertNote({}, { symbol: "AAPL", thesis: "Moat.", conviction: 4 });
    saveJournal(map);
    expect(localStorage.getItem(JOURNAL_KEY)).toBeTruthy();
    const loaded = loadJournal();
    expect(getNote(loaded, "AAPL").conviction).toBe(4);
  });

  it("returns an empty map when nothing is stored", () => {
    expect(loadJournal()).toEqual({});
  });

  it("recovers from corrupt data", () => {
    localStorage.setItem(JOURNAL_KEY, "{not json");
    expect(loadJournal()).toEqual({});
  });

  it("drops invalid entries on load", () => {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify({ "": { symbol: "" }, AAPL: { symbol: "AAPL", thesis: "ok" } }));
    const loaded = loadJournal();
    expect(Object.keys(loaded)).toEqual(["AAPL"]);
  });
});
