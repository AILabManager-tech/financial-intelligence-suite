// localStorage store for the demo portfolios' reconstituted snapshot series.
// Kept separate from seedRunner so App can read it without importing the seed
// build logic. Real mandates mirror snapshots in dev SQLite; demo mandates live
// only in the browser, so their reconstituted series rides in localStorage,
// namespaced per mandate id (same `::id` convention as transactions/positions).

import { DEMO_PREFIX } from "./profils.seed";

export const DEMO_SNAPSHOTS_KEY = "fis:demo-snapshots:v1";

export function isDemoMandateId(id) {
  return typeof id === "string" && id.startsWith(DEMO_PREFIX);
}

function snapshotKey(id) {
  return `${DEMO_SNAPSHOTS_KEY}::${id}`;
}

export function loadDemoSnapshots(id) {
  try {
    const raw = localStorage.getItem(snapshotKey(id));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // private browsing / corrupt JSON — non-fatal
  }
}

export function saveDemoSnapshots(snapshots, id) {
  try {
    localStorage.setItem(snapshotKey(id), JSON.stringify(snapshots ?? []));
  } catch {
    // quota / private browsing — non-fatal
  }
}

export function removeDemoSnapshots(id) {
  try {
    localStorage.removeItem(snapshotKey(id));
  } catch {
    // non-fatal
  }
}
