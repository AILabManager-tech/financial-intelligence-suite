import { describe, expect, it, vi } from "vitest";
import { createBriefTools, runBriefAgent, BRIEF_AGENT_MODEL } from "./briefAgent";

const PORTFOLIO = {
  mandate: { name: "Client A", client: "A inc.", baseCurrency: "USD" },
  positions: [
    { symbol: "AAPL", name: "Apple", quantity: 10, marketValue: 2000, weight: 90.9 },
    { symbol: "MSFT", name: "Microsoft", quantity: 4, marketValue: 200, weight: 9.1 },
  ],
};

const NEWS = {
  symbol: "AAPL",
  items: [{ date: "2026-06-10T00:00:00.000Z", headline: "Apple cuts output", source: "Reuters", url: "https://r.co/1", summary: "Supply." }],
};
const EARNINGS = { symbol: "AAPL", items: [{ date: "2026-07-28", epsEstimate: 1.4 }] };

function tools(overrides = {}) {
  return createBriefTools({
    portfolio: PORTFOLIO,
    fetchCompanyNews: vi.fn().mockResolvedValue(NEWS),
    fetchEarnings: vi.fn().mockResolvedValue(EARNINGS),
    ...overrides,
  });
}

function byName(list, name) {
  return list.find((t) => t.name === name);
}

describe("createBriefTools", () => {
  it("exposes exactly the three tools the agent may choose from", () => {
    const { tools: list } = tools();
    expect(list.map((t) => t.name).sort()).toEqual(["get_company_news", "get_earnings_calendar", "list_positions"]);
  });

  it("lists the held positions from the payload, without any fetch", async () => {
    const { tools: list } = tools();
    const out = await byName(list, "list_positions").run({});
    expect(out).toContain("AAPL");
    expect(out).toContain("MSFT");
    expect(out).toContain("90.9");
  });

  it("fetches news for a held symbol", async () => {
    const fetchCompanyNews = vi.fn().mockResolvedValue(NEWS);
    const { tools: list } = tools({ fetchCompanyNews });
    const out = await byName(list, "get_company_news").run({ symbol: "AAPL" });
    expect(fetchCompanyNews).toHaveBeenCalledWith("AAPL", expect.anything());
    expect(out).toContain("Apple cuts output");
    expect(out).toContain("https://r.co/1");
  });

  // Garde-fou de périmètre : l'agent choisit son chemin, mais pas hors du mandat.
  it("refuses a symbol the client does not hold, without fetching", async () => {
    const fetchCompanyNews = vi.fn();
    const { tools: list } = tools({ fetchCompanyNews });
    const out = await byName(list, "get_company_news").run({ symbol: "TSLA" });
    expect(fetchCompanyNews).not.toHaveBeenCalled();
    expect(out).toMatch(/ne détient pas TSLA/i);
  });

  it("reports an upstream failure to the agent instead of throwing", async () => {
    const fetchCompanyNews = vi.fn().mockRejectedValue(new Error("upstream 502 token=secret-token"));
    const { tools: list } = tools({ fetchCompanyNews });
    const out = await byName(list, "get_company_news").run({ symbol: "AAPL" });
    expect(out).toMatch(/indisponible/i);
    expect(out).not.toContain("secret-token");
  });

  it("records every tool call in the trace, in order", async () => {
    const { tools: list, trace } = tools();
    await byName(list, "list_positions").run({});
    await byName(list, "get_company_news").run({ symbol: "AAPL" });
    await byName(list, "get_earnings_calendar").run({ symbol: "MSFT" });
    expect(trace.map((t) => t.tool)).toEqual(["list_positions", "get_company_news", "get_earnings_calendar"]);
    expect(trace[1].input).toEqual({ symbol: "AAPL" });
    expect(trace[2].ok).toBe(true);
  });

  it("marks a refused call in the trace so the audit shows it", async () => {
    const { tools: list, trace } = tools();
    await byName(list, "get_company_news").run({ symbol: "TSLA" });
    expect(trace[0].ok).toBe(false);
  });
});

describe("runBriefAgent", () => {
  it("returns the agent's text plus the trace of what it actually read", async () => {
    // Faux runner : simule un agent qui consulte les positions puis les news.
    const createRunner = vi.fn(({ tools: list }) => ({
      async run() {
        await byName(list, "list_positions").run({});
        await byName(list, "get_company_news").run({ symbol: "AAPL" });
        return "Apple a annoncé une baisse de production.";
      },
    }));
    const r = await runBriefAgent({ portfolio: PORTFOLIO, createRunner, fetchCompanyNews: vi.fn().mockResolvedValue(NEWS) });
    expect(r.hasData).toBe(true);
    expect(r.text).toMatch(/baisse de production/i);
    expect(r.trace.map((t) => t.tool)).toEqual(["list_positions", "get_company_news"]);
    expect(r.model).toBe(BRIEF_AGENT_MODEL);
  });

  it("is inert without an API key and never calls the model", async () => {
    const createRunner = vi.fn();
    const r = await runBriefAgent({ portfolio: PORTFOLIO, anthropicApiKey: null });
    expect(r.hasData).toBe(false);
    expect(r.reason).toMatch(/non configuré/i);
    expect(createRunner).not.toHaveBeenCalled();
  });

  it("reports no data rather than running with an empty portfolio", async () => {
    const createRunner = vi.fn();
    const r = await runBriefAgent({ portfolio: { mandate: {}, positions: [] }, createRunner });
    expect(r.hasData).toBe(false);
    expect(createRunner).not.toHaveBeenCalled();
  });

  it("never leaks the API key when the loop fails", async () => {
    const createRunner = () => ({
      async run() {
        throw new Error("401 for key sk-ant-secret-token");
      },
    });
    const r = await runBriefAgent({ portfolio: PORTFOLIO, anthropicApiKey: "sk-ant-secret-token", createRunner });
    expect(r.hasData).toBe(false);
    expect(JSON.stringify(r)).not.toContain("sk-ant-secret-token");
  });

  it("pins the model", () => {
    expect(BRIEF_AGENT_MODEL).toBe("claude-opus-4-8");
  });
});
