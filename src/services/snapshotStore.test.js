import { describe, it, expect, beforeEach } from "vitest";
import {
  SNAPSHOT_STORAGE_KEY,
  loadStoredSnapshots,
  appendStoredSnapshot,
  clearStoredSnapshots,
} from "./snapshotStore";

function snap(day, value) {
  return { capturedAt: `${day}T15:30:00.000Z`, totalMarketValue: value, positionsCount: 3 };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("snapshotStore", () => {
  it("returns an empty series when nothing is stored", () => {
    expect(loadStoredSnapshots()).toEqual([]);
  });

  it("appends and persists a snapshot with a derived snapshotDate", () => {
    const series = appendStoredSnapshot(snap("2026-06-01", 1000), "default");
    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({ snapshotDate: "2026-06-01", totalMarketValue: 1000 });
    // survives a reload
    expect(loadStoredSnapshots("default")).toHaveLength(1);
  });

  it("is idempotent per calendar day — last write of the day wins", () => {
    appendStoredSnapshot(snap("2026-06-01", 1000));
    appendStoredSnapshot(snap("2026-06-01", 1080));
    const series = loadStoredSnapshots();
    expect(series).toHaveLength(1);
    expect(series[0].totalMarketValue).toBe(1080);
  });

  it("keeps a multi-day series in ascending date order", () => {
    appendStoredSnapshot(snap("2026-06-03", 1030));
    appendStoredSnapshot(snap("2026-06-01", 1000));
    appendStoredSnapshot(snap("2026-06-02", 1010));
    expect(loadStoredSnapshots().map((s) => s.snapshotDate)).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
    ]);
  });

  it("caps the series to the requested limit (most recent kept)", () => {
    for (let d = 1; d <= 5; d += 1) {
      appendStoredSnapshot(snap(`2026-06-0${d}`, 1000 + d), "default", 3);
    }
    const series = loadStoredSnapshots("default", 3);
    expect(series.map((s) => s.snapshotDate)).toEqual(["2026-06-03", "2026-06-04", "2026-06-05"]);
  });

  it("namespaces series per mandate", () => {
    appendStoredSnapshot(snap("2026-06-01", 1000), "default");
    appendStoredSnapshot(snap("2026-06-01", 2000), "growth");
    expect(loadStoredSnapshots("default")[0].totalMarketValue).toBe(1000);
    expect(loadStoredSnapshots("growth")[0].totalMarketValue).toBe(2000);
    // the default mandate uses the bare legacy-style key
    expect(window.localStorage.getItem(SNAPSHOT_STORAGE_KEY)).toBeTruthy();
    expect(window.localStorage.getItem(`${SNAPSHOT_STORAGE_KEY}::growth`)).toBeTruthy();
  });

  it("drops a snapshot with no usable value without throwing", () => {
    const series = appendStoredSnapshot({ capturedAt: "2026-06-01T00:00:00Z" }, "default");
    expect(series).toEqual([]);
  });

  it("clears a mandate's series", () => {
    appendStoredSnapshot(snap("2026-06-01", 1000), "default");
    clearStoredSnapshots("default");
    expect(loadStoredSnapshots("default")).toEqual([]);
  });
});
