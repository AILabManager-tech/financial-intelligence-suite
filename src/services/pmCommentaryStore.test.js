import { afterEach, describe, expect, it } from "vitest";
import {
  addComment,
  loadCommentary,
  makeCommentId,
  normalizeComment,
  removeComment,
  saveCommentary,
} from "./pmCommentaryStore";

afterEach(() => localStorage.clear());

describe("pmCommentaryStore", () => {
  it("normalizes an entry and rejects empty text/date", () => {
    expect(normalizeComment({ date: "2026-06-01", text: "  Bon trimestre  " })).toMatchObject({
      date: "2026-06-01",
      text: "Bon trimestre",
    });
    expect(normalizeComment({ date: "2026-06-01", text: "   " })).toBeNull();
    expect(normalizeComment({ date: "", text: "x" })).toBeNull();
  });

  it("derives a stable collision-free id", () => {
    expect(makeCommentId([{ id: "c1" }, { id: "c4" }])).toBe("c5");
    expect(makeCommentId([])).toBe("c1");
  });

  it("adds and removes entries (markdown text preserved)", () => {
    const one = addComment([], { date: "2026-06-01", text: "**Solide**\nSuite" });
    expect(one).toHaveLength(1);
    expect(one[0].text).toBe("**Solide**\nSuite"); // markdown gardé verbatim
    expect(one[0].id).toBe("c1");
    expect(removeComment(one, "c1")).toEqual([]);
    expect(addComment([], { date: "2026-06-01", text: "   " })).toEqual([]); // entrée vide ignorée
  });

  it("namespaces per mandate and sorts most-recent first on load", () => {
    saveCommentary(
      [
        { id: "c1", date: "2026-03-31", text: "T1" },
        { id: "c2", date: "2026-06-30", text: "T2" },
      ],
      "client-a",
    );
    saveCommentary([{ id: "c1", date: "2026-01-01", text: "défaut" }], "default");

    const a = loadCommentary("client-a");
    expect(a.map((c) => c.text)).toEqual(["T2", "T1"]); // tri date desc
    expect(loadCommentary("default").map((c) => c.text)).toEqual(["défaut"]);
    // default reuses the base key; the mandate gets a suffixed key
    expect(localStorage.getItem("fis:pm-commentary:v1")).toContain("défaut");
    expect(localStorage.getItem("fis:pm-commentary:v1::client-a")).toContain("T2");
  });
});
