import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_WATCHLIST_ID,
  createWatchlist,
  defaultWatchlistState,
  getActiveWatchlist,
  loadWatchlistList,
  makeWatchlistId,
  normalizeState,
  removeWatchlist,
  saveWatchlistList,
  setActiveWatchlist,
  updateWatchlist,
} from "./watchlistListStore";

afterEach(() => {
  localStorage.clear();
});

describe("watchlistListStore", () => {
  it("defaults to a single 'défaut' list active", () => {
    const state = defaultWatchlistState();
    expect(state.activeId).toBe(DEFAULT_WATCHLIST_ID);
    expect(state.lists).toHaveLength(1);
    expect(state.lists[0].id).toBe(DEFAULT_WATCHLIST_ID);
  });

  it("loads the default state when storage is empty", () => {
    expect(loadWatchlistList()).toEqual(defaultWatchlistState());
  });

  it("round-trips through save/load", () => {
    const created = createWatchlist(defaultWatchlistState(), { name: "Tech US" });
    saveWatchlistList(created);
    expect(loadWatchlistList()).toEqual(created);
  });

  it("reconciles a corrupt stored state back to the default", () => {
    expect(normalizeState(null)).toEqual(defaultWatchlistState());
    expect(normalizeState({ lists: "nope" })).toEqual(defaultWatchlistState());
  });

  it("falls back to the first list when activeId is dangling", () => {
    const reconciled = normalizeState({
      activeId: "ghost",
      lists: [{ id: "a", name: "A" }],
    });
    expect(reconciled.activeId).toBe("a");
  });

  it("creates a list with a stable, collision-free id and activates it", () => {
    const state = createWatchlist(defaultWatchlistState(), { name: "Tech US" });
    expect(state.lists).toHaveLength(2);
    expect(state.activeId).toBe("tech-us");
    const dup = createWatchlist(state, { name: "Tech US" });
    expect(dup.lists.map((l) => l.id)).toContain("tech-us-2");
  });

  it("ignores creation with an empty name", () => {
    const state = defaultWatchlistState();
    expect(createWatchlist(state, { name: "   " })).toBe(state);
  });

  it("renames a list while preserving its id", () => {
    const created = createWatchlist(defaultWatchlistState(), { name: "Tech" });
    const renamed = updateWatchlist(created, "tech", { name: "Tech US" });
    const list = renamed.lists.find((l) => l.id === "tech");
    expect(list.name).toBe("Tech US");
  });

  it("removes a list and reassigns the active one, never below one list", () => {
    const created = createWatchlist(defaultWatchlistState(), { name: "Tech" });
    const removed = removeWatchlist(created, "tech");
    expect(removed.lists).toHaveLength(1);
    expect(removed.activeId).toBe(DEFAULT_WATCHLIST_ID);
    // last list is protected
    expect(removeWatchlist(removed, DEFAULT_WATCHLIST_ID)).toBe(removed);
  });

  it("switches the active list only to an existing one", () => {
    const created = createWatchlist(defaultWatchlistState(), { name: "Tech" });
    expect(setActiveWatchlist(created, DEFAULT_WATCHLIST_ID).activeId).toBe(DEFAULT_WATCHLIST_ID);
    expect(setActiveWatchlist(created, "ghost")).toBe(created);
  });

  it("returns the active list, falling back to the first", () => {
    const created = createWatchlist(defaultWatchlistState(), { name: "Tech" });
    expect(getActiveWatchlist(created).id).toBe("tech");
  });

  it("derives ids from names", () => {
    expect(makeWatchlistId("Dividendes 2026")).toBe("dividendes-2026");
  });
});
