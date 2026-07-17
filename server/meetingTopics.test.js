import { describe, expect, it, vi } from "vitest";
import { buildTopicsPrompt, extractMeetingTopics, MEETING_TOPICS_MODEL } from "./meetingTopics";

const NEWS = [
  {
    symbol: "AAPL",
    items: [
      { date: "2026-06-10T00:00:00.000Z", headline: "Apple cuts iPhone output", source: "Reuters", url: "https://r.co/1", summary: "Supply chain." },
      { date: "2026-06-08T00:00:00.000Z", headline: "Apple wins appeal", source: "AP", url: "https://ap.co/2", summary: "Legal." },
    ],
  },
  {
    symbol: "MSFT",
    items: [{ date: "2026-06-09T00:00:00.000Z", headline: "Microsoft raises dividend", source: "WSJ", url: "https://wsj.co/3", summary: "Payout." }],
  },
];

// Un appel de modèle factice : renvoie ce qu'on lui dit, sans réseau.
function fakeModel(topics) {
  return vi.fn().mockResolvedValue({ topics });
}

describe("buildTopicsPrompt", () => {
  it("assigns a deterministic ref to every article and lists them", () => {
    const { prompt, refs } = buildTopicsPrompt(NEWS);
    expect([...refs.keys()]).toEqual(["a1", "a2", "a3"]);
    expect(refs.get("a1").article.headline).toBe("Apple cuts iPhone output");
    expect(refs.get("a3").symbol).toBe("MSFT");
    expect(prompt).toContain("a1");
    expect(prompt).toContain("Apple cuts iPhone output");
    expect(prompt).toContain("Microsoft raises dividend");
  });

  it("does not rely on the upstream id, which is nullable", () => {
    const { refs } = buildTopicsPrompt([{ symbol: "AAPL", items: [{ ...NEWS[0].items[0], id: null }] }]);
    expect([...refs.keys()]).toEqual(["a1"]);
  });
});

describe("extractMeetingTopics", () => {
  it("resolves cited refs back to the real articles", async () => {
    const callModel = fakeModel([
      { symbol: "AAPL", headline: "Production iPhone", why: "Baisse de production annoncée.", articleIds: ["a1"] },
    ]);
    const r = await extractMeetingTopics({ news: NEWS, callModel });
    expect(r.hasData).toBe(true);
    expect(r.topics).toHaveLength(1);
    expect(r.topics[0].articles).toEqual([
      { headline: "Apple cuts iPhone output", source: "Reuters", url: "https://r.co/1", date: "2026-06-10T00:00:00.000Z" },
    ]);
  });

  it("drops a topic citing an article that was never supplied", async () => {
    const callModel = fakeModel([
      { symbol: "AAPL", headline: "Vrai sujet", why: "Sourcé.", articleIds: ["a1"] },
      { symbol: "AAPL", headline: "Sujet fabriqué", why: "Cite un article inexistant.", articleIds: ["a99"] },
    ]);
    const r = await extractMeetingTopics({ news: NEWS, callModel });
    expect(r.topics.map((t) => t.headline)).toEqual(["Vrai sujet"]);
    expect(r.dropped).toBe(1);
  });

  it("keeps only the valid refs when a topic cites a mix of real and unknown", async () => {
    const callModel = fakeModel([{ symbol: "AAPL", headline: "Mixte", why: "…", articleIds: ["a1", "a99"] }]);
    const r = await extractMeetingTopics({ news: NEWS, callModel });
    expect(r.topics[0].articles.map((a) => a.url)).toEqual(["https://r.co/1"]);
  });

  it("drops a topic that cites nothing at all", async () => {
    const callModel = fakeModel([{ symbol: "AAPL", headline: "Sans source", why: "…", articleIds: [] }]);
    const r = await extractMeetingTopics({ news: NEWS, callModel });
    expect(r.topics).toEqual([]);
    expect(r.dropped).toBe(1);
  });

  it("reports no data rather than calling the model when there is no news", async () => {
    const callModel = vi.fn();
    const r = await extractMeetingTopics({ news: [], callModel });
    expect(r.hasData).toBe(false);
    expect(r.reason).toMatch(/actualité/i);
    expect(callModel).not.toHaveBeenCalled();
  });

  it("caps the number of topics", async () => {
    const callModel = fakeModel([
      { symbol: "AAPL", headline: "T1", why: "…", articleIds: ["a1"] },
      { symbol: "AAPL", headline: "T2", why: "…", articleIds: ["a2"] },
      { symbol: "MSFT", headline: "T3", why: "…", articleIds: ["a3"] },
    ]);
    const r = await extractMeetingTopics({ news: NEWS, callModel, maxTopics: 2 });
    expect(r.topics).toHaveLength(2);
  });

  it("never leaks the API key when the model call fails", async () => {
    const callModel = vi.fn().mockRejectedValue(new Error("401 unauthorized for key sk-ant-secret-token"));
    const r = await extractMeetingTopics({ news: NEWS, callModel, anthropicApiKey: "sk-ant-secret-token" });
    expect(r.hasData).toBe(false);
    expect(JSON.stringify(r)).not.toContain("sk-ant-secret-token");
  });

  it("targets the pinned model and asks for adaptive thinking plus a strict schema", async () => {
    const callModel = fakeModel([]);
    await extractMeetingTopics({ news: NEWS, callModel });
    const request = callModel.mock.calls[0][0];
    expect(MEETING_TOPICS_MODEL).toBe("claude-opus-4-8");
    expect(request.model).toBe(MEETING_TOPICS_MODEL);
    expect(request.thinking).toEqual({ type: "adaptive" });
    expect(request.schema.properties.topics).toBeDefined();
    expect(request.schema.additionalProperties).toBe(false);
  });
});
