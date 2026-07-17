import { describe, expect, it } from "vitest";
import { buildMeetingBrief, renderMeetingBriefMarkdown } from "./meetingBrief";

const MANDATE = { name: "Client A", client: "A inc.", accountType: "rrsp", baseCurrency: "CAD" };

const ASSETS = [
  { symbol: "AAPL", name: "Apple", price: 200, position: { quantity: 10, averageCost: 100, targetWeight: 50 } },
  { symbol: "MSFT", name: "Microsoft", price: 50, position: { quantity: 4, averageCost: 60, targetWeight: 50 } },
];

// Série journalière : 1000 -> 1100 -> 2200. Le saut final vient d'un achat de 1000
// financé de l'extérieur, pas du marché.
const SNAPSHOTS = [
  { snapshotDate: "2026-04-01", totalMarketValue: 1000 },
  { snapshotDate: "2026-05-01", totalMarketValue: 1100 },
  { snapshotDate: "2026-06-01", totalMarketValue: 2200 },
];

const TRANSACTIONS = [
  { type: "buy", symbol: "AAPL", date: "2026-05-15", quantity: 5, price: 200 },
];

describe("buildMeetingBrief", () => {
  it("delegates the summary to the mandate report", () => {
    const b = buildMeetingBrief({ mandate: MANDATE, assets: ASSETS, asOf: "2026-06-01" });
    expect(b.summary.client).toBe("A inc.");
    expect(b.summary.accountTypeLabel).toBe("REER / FERR");
    expect(b.summary.totalMarketValue).toBe(2200);
  });

  it("anchors the period on the last snapshot at or before `since`", () => {
    const b = buildMeetingBrief({
      mandate: MANDATE,
      assets: ASSETS,
      snapshots: SNAPSHOTS,
      transactions: TRANSACTIONS,
      since: "2026-05-01",
    });
    expect(b.sinceLastMeeting.hasData).toBe(true);
    expect(b.sinceLastMeeting.from).toBe("2026-05-01");
    expect(b.sinceLastMeeting.to).toBe("2026-06-01");
    expect(b.sinceLastMeeting.valueFrom).toBe(1100);
    expect(b.sinceLastMeeting.valueTo).toBe(2200);
  });

  it("separates value change, capital flow, and flow-neutralized performance", () => {
    const b = buildMeetingBrief({
      mandate: MANDATE,
      assets: ASSETS,
      snapshots: SNAPSHOTS,
      transactions: TRANSACTIONS,
      since: "2026-05-01",
    });
    const s = b.sinceLastMeeting;
    // La valeur a doublé (+1100) mais 1000 vient d'un apport, pas du marché.
    expect(s.valueChange).toBe(1100);
    expect(s.netFlow).toBe(1000);
    // Performance réelle : (2200 - 1000) / 1100 - 1 = +9.09 %
    expect(s.twr.hasData).toBe(true);
    expect(s.twr.twrPct).toBeCloseTo(9.0909, 3);
  });

  it("picks an earlier anchor when `since` falls between two snapshots", () => {
    const b = buildMeetingBrief({ mandate: MANDATE, assets: ASSETS, snapshots: SNAPSHOTS, since: "2026-05-20" });
    expect(b.sinceLastMeeting.from).toBe("2026-05-01");
  });

  it("lists only the transactions of the period", () => {
    const transactions = [
      { type: "buy", symbol: "OLD", date: "2026-01-05", quantity: 1, price: 10 },
      ...TRANSACTIONS,
    ];
    const b = buildMeetingBrief({ mandate: MANDATE, assets: ASSETS, snapshots: SNAPSHOTS, transactions, since: "2026-05-01" });
    expect(b.sinceLastMeeting.transactions.map((t) => t.symbol)).toEqual(["AAPL"]);
  });

  it("refuses to compute a period with no snapshot at or before `since`", () => {
    const b = buildMeetingBrief({ mandate: MANDATE, assets: ASSETS, snapshots: SNAPSHOTS, since: "2026-01-01" });
    expect(b.sinceLastMeeting.hasData).toBe(false);
    expect(b.sinceLastMeeting.reason).toMatch(/snapshot/i);
    expect(b.sinceLastMeeting.valueChange).toBeUndefined();
    expect(b.absences.some((a) => a.section === "sinceLastMeeting")).toBe(true);
  });

  it("refuses to compute a period without a `since` date", () => {
    const b = buildMeetingBrief({ mandate: MANDATE, assets: ASSETS, snapshots: SNAPSHOTS });
    expect(b.sinceLastMeeting.hasData).toBe(false);
    expect(b.sinceLastMeeting.reason).toMatch(/date/i);
  });

  it("reports actionable drift against target weights", () => {
    const b = buildMeetingBrief({ mandate: MANDATE, assets: ASSETS, asOf: "2026-06-01" });
    expect(b.drift.hasData).toBe(true);
    // AAPL 2000/2200 = 90.9 % vs cible 50 % -> vendre ; MSFT 9.1 % vs 50 % -> acheter.
    expect(b.drift.rows.map((r) => r.symbol)).toEqual(["AAPL", "MSFT"]);
    expect(b.drift.rows[0].action).toBe("sell");
  });

  it("reports no drift data when no target weight is defined", () => {
    const assets = [{ symbol: "AAPL", name: "Apple", price: 200, position: { quantity: 10, averageCost: 100 } }];
    const b = buildMeetingBrief({ mandate: MANDATE, assets });
    expect(b.drift.hasData).toBe(false);
    expect(b.absences.some((a) => a.section === "drift")).toBe(true);
  });

  it("carries injected discussion topics with their sources", () => {
    const topics = {
      hasData: true,
      topics: [
        {
          symbol: "AAPL",
          headline: "Baisse de production",
          why: "Le client suit Apple de près.",
          articles: [{ headline: "Apple cuts output", source: "Reuters", url: "https://r.co/1", date: "2026-06-10T00:00:00.000Z" }],
        },
      ],
    };
    const b = buildMeetingBrief({ mandate: MANDATE, assets: ASSETS, topics });
    expect(b.topics.hasData).toBe(true);
    expect(b.topics.topics[0].articles[0].url).toBe("https://r.co/1");
    expect(b.absences.some((a) => a.section === "topics")).toBe(false);
  });

  it("records unconfigured topic selection as an absence", () => {
    const topics = { hasData: false, reason: "Sélection des sujets non configurée (ANTHROPIC_API_KEY absente).", topics: [] };
    const b = buildMeetingBrief({ mandate: MANDATE, assets: ASSETS, topics });
    expect(b.absences.some((a) => a.section === "topics")).toBe(true);
  });

  it("does not claim a topics absence when none was requested", () => {
    const b = buildMeetingBrief({ mandate: MANDATE, assets: ASSETS });
    expect(b.absences.some((a) => a.section === "topics")).toBe(false);
  });

  it("omits holds from the drift rows", () => {
    const assets = [
      { symbol: "AAPL", name: "Apple", price: 100, position: { quantity: 10, averageCost: 100, targetWeight: 50 } },
      { symbol: "MSFT", name: "Microsoft", price: 100, position: { quantity: 10, averageCost: 100, targetWeight: 50 } },
    ];
    const b = buildMeetingBrief({ mandate: MANDATE, assets });
    expect(b.drift.rows).toEqual([]);
  });
});

describe("renderMeetingBriefMarkdown", () => {
  it("renders the summary with the client and the as-of date", () => {
    const b = buildMeetingBrief({ mandate: MANDATE, assets: ASSETS, asOf: "2026-06-01" });
    const md = renderMeetingBriefMarkdown(b);
    expect(md).toContain("A inc.");
    expect(md).toContain("2026-06-01");
    expect(md).toContain("REER / FERR");
  });

  it("labels value change and performance distinctly", () => {
    const b = buildMeetingBrief({
      mandate: MANDATE,
      assets: ASSETS,
      snapshots: SNAPSHOTS,
      transactions: TRANSACTIONS,
      since: "2026-05-01",
    });
    const md = renderMeetingBriefMarkdown(b);
    expect(md).toContain("Variation de valeur");
    expect(md).toContain("Apport net de capital");
    expect(md).toContain("Performance (TWR, flux neutralisés)");
  });

  it("omits an empty section instead of writing a placeholder", () => {
    const assets = [{ symbol: "AAPL", name: "Apple", price: 200, position: { quantity: 10, averageCost: 100 } }];
    const md = renderMeetingBriefMarkdown(buildMeetingBrief({ mandate: MANDATE, assets }));
    // La section est omise ; la dérive n'est nommée que comme donnée absente.
    expect(md).not.toContain("## Dérive vs cible");
    expect(md).not.toContain("n/d");
    expect(md).not.toMatch(/^\|\s*0\s*\|/m);
  });

  it("renders the absences so the planner sees what the brief does not know", () => {
    const md = renderMeetingBriefMarkdown(buildMeetingBrief({ mandate: MANDATE, assets: ASSETS }));
    expect(md).toContain("Données absentes");
    expect(md).toMatch(/dernière rencontre/i);
  });

  it("renders each topic with its source link and the model that selected it", () => {
    const topics = {
      hasData: true,
      model: "claude-opus-4-8",
      topics: [
        {
          symbol: "AAPL",
          headline: "Baisse de production",
          why: "Le client suit Apple de près.",
          articles: [{ headline: "Apple cuts output", source: "Reuters", url: "https://r.co/1", date: "2026-06-10T00:00:00.000Z" }],
        },
      ],
    };
    const md = renderMeetingBriefMarkdown(buildMeetingBrief({ mandate: MANDATE, assets: ASSETS, topics }));
    expect(md).toContain("Sujets probables");
    expect(md).toContain("Baisse de production");
    expect(md).toContain("https://r.co/1");
    // La provenance du tri est déclarée : sélection par modèle, pas un fait établi.
    expect(md).toContain("sélectionnées par claude-opus-4-8");
    expect(md).toMatch(/pistes de discussion/i);
  });

  it("states that the brief carries no recommendation", () => {
    const md = renderMeetingBriefMarkdown(buildMeetingBrief({ mandate: MANDATE, assets: ASSETS, asOf: "2026-06-01" }));
    expect(md).toMatch(/aucune recommandation/i);
  });
});
