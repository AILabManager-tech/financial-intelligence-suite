import { getVisibleFeatureIds } from "./layoutStore";

// Custom (user-saved) layout profiles (P0.5b). Same shape as the built-in
// profiles (core/layoutProfiles): { id, name, surfaces: { asset, dashboard } }
// where each surface is the ordered list of visible feature ids. Persisted as a
// versioned JSON array under fis:profiles:v1; an empty list removes the entry.
//
// Profiles capture visibility + order only (not per-feature column span), mirroring
// the built-ins — applying a profile resets columns to the default.
const KEY = "fis:profiles:v1";

function isValidProfile(p) {
  return (
    p &&
    typeof p === "object" &&
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    p.surfaces &&
    typeof p.surfaces === "object" &&
    Array.isArray(p.surfaces.asset) &&
    Array.isArray(p.surfaces.dashboard)
  );
}

export function loadProfiles() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidProfile);
  } catch {
    return [];
  }
}

export function saveProfiles(profiles) {
  try {
    const clean = Array.isArray(profiles) ? profiles.filter(isValidProfile) : [];
    if (clean.length === 0) {
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {
    // private browsing / quota — non-fatal
  }
}

// Stable, collision-free id derived from the name (no Date.now/random needed).
export function makeProfileId(name, existing = []) {
  const slug =
    String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "profil";
  const ids = new Set(existing.map((p) => p.id));
  let id = `custom-${slug}`;
  let n = 2;
  while (ids.has(id)) id = `custom-${slug}-${n++}`;
  return id;
}

export function addProfile(profiles, name, surfaces) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return profiles;
  const id = makeProfileId(trimmed, profiles);
  return [...profiles, { id, name: trimmed, surfaces }];
}

export function removeProfile(profiles, id) {
  return profiles.filter((p) => p.id !== id);
}

// Derive a profile's surfaces (visible ids in order) from a live layout.
export function profileSurfacesFromLayout(layout) {
  return {
    asset: getVisibleFeatureIds(layout, "asset"),
    dashboard: getVisibleFeatureIds(layout, "dashboard"),
  };
}
