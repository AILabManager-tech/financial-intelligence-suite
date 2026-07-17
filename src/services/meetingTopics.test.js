import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchMeetingTopics } from "./meetingTopics";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(payload, { ok = true, status = 200 } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status, json: async () => payload });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("fetchMeetingTopics", () => {
  it("calls the batch endpoint with the plural symbols param", async () => {
    const fetchMock = stubFetch({ hasData: true, topics: [] });
    await fetchMeetingTopics(["aapl", "msft"]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/meeting-topics?symbols=AAPL%2CMSFT");
  });

  it("passes the abort signal through", async () => {
    const fetchMock = stubFetch({ hasData: true, topics: [] });
    const controller = new AbortController();
    await fetchMeetingTopics(["AAPL"], { signal: controller.signal });
    expect(fetchMock.mock.calls[0][1]).toEqual({ signal: controller.signal });
  });

  it("does not hit the network without symbols", async () => {
    const fetchMock = stubFetch({});
    const r = await fetchMeetingTopics([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(r.hasData).toBe(false);
  });

  it("returns the unconfigured state as data, not as an error", async () => {
    stubFetch({ hasData: false, reason: "Sélection des sujets non configurée (ANTHROPIC_API_KEY absente).", topics: [] });
    const r = await fetchMeetingTopics(["AAPL"]);
    expect(r.hasData).toBe(false);
    expect(r.reason).toMatch(/non configurée/i);
  });

  it("throws on a real HTTP failure", async () => {
    stubFetch({}, { ok: false, status: 502 });
    await expect(fetchMeetingTopics(["AAPL"])).rejects.toThrow(/502/);
  });
});
