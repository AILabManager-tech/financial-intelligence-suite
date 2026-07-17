import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("../services/meetingTopics", () => ({ fetchMeetingTopics: vi.fn() }));
vi.mock("../services/priceHistory", () => ({ fetchPriceHistory: vi.fn() }));

import { fetchMeetingTopics } from "../services/meetingTopics";
import { fetchPriceHistory } from "../services/priceHistory";
import MeetingBriefView from "./MeetingBriefView";

beforeEach(() => {
  vi.clearAllMocks(); // repartir d'un compteur d'appels vierge à chaque test
  // Défaut : capability non configurée (aucune clé) — l'état le plus courant.
  fetchMeetingTopics.mockResolvedValue({ hasData: false, reason: "Sélection des sujets non configurée (ANTHROPIC_API_KEY absente).", topics: [] });
  // Défaut : pas d'historique → aucune reconstruction (série vide), zéro réseau réel.
  fetchPriceHistory.mockResolvedValue({ points: [] });
});

const MANDATE = { name: "Client A", client: "A inc.", accountType: "taxable", baseCurrency: "USD" };
const ASSETS = [{ symbol: "AAPL", name: "Apple", price: 200, position: { quantity: 10, averageCost: 100 } }];
const SNAPSHOTS = [
  { snapshotDate: "2026-05-01", totalMarketValue: 1100 },
  { snapshotDate: "2026-06-01", totalMarketValue: 2000 },
];

describe("MeetingBriefView", () => {
  it("renders the brief heading and the no-recommendation notice", () => {
    render(<MeetingBriefView mandate={MANDATE} assets={ASSETS} />);
    expect(screen.getByText(/Brief de rencontre/)).toBeInTheDocument();
    expect(screen.getByText(/aucune recommandation/i)).toBeInTheDocument();
  });

  it("reports the missing meeting date as an absence until one is picked", () => {
    render(<MeetingBriefView mandate={MANDATE} assets={ASSETS} snapshots={SNAPSHOTS} />);
    expect(screen.getByText("Données absentes")).toBeInTheDocument();
    expect(screen.getByText(/Aucune date de dernière rencontre/i)).toBeInTheDocument();
  });

  it("rebuilds the brief with a period once a meeting date is picked", () => {
    render(<MeetingBriefView mandate={MANDATE} assets={ASSETS} snapshots={SNAPSHOTS} />);
    fireEvent.change(screen.getByLabelText(/Dernière rencontre le/i), { target: { value: "2026-05-01" } });
    expect(screen.getByText(/Depuis la dernière rencontre \(2026-05-01 → 2026-06-01\)/)).toBeInTheDocument();
  });

  it("renders selected topics with a link to each source article", async () => {
    fetchMeetingTopics.mockResolvedValue({
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
    });
    render(<MeetingBriefView mandate={MANDATE} assets={ASSETS} />);
    await waitFor(() => expect(screen.getByText(/Sujets probables/)).toBeInTheDocument());
    const link = screen.getByRole("link", { name: "Apple cuts output" });
    expect(link).toHaveAttribute("href", "https://r.co/1");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("requests topics only for held positions", async () => {
    const assets = [...ASSETS, { symbol: "GHOST", name: "Not held", price: 10, position: { quantity: 0, averageCost: 0 } }];
    render(<MeetingBriefView mandate={MANDATE} assets={assets} />);
    await waitFor(() => expect(fetchMeetingTopics).toHaveBeenCalled());
    expect(fetchMeetingTopics.mock.calls[0][0]).toEqual(["AAPL"]);
  });

  it("surfaces the unconfigured selector as an absence, not an error", async () => {
    render(<MeetingBriefView mandate={MANDATE} assets={ASSETS} />);
    await waitFor(() => expect(screen.getByText(/non configurée/i)).toBeInTheDocument());
    // La section est omise ; le sujet n'est nommé que comme donnée absente.
    expect(screen.queryByRole("heading", { name: "Sujets probables" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Données absentes" })).toBeInTheDocument();
  });

  it("reconstructs a factual value series from the journal when no snapshots have accrued yet", async () => {
    // Démarrage à froid : journal importé, aucun relevé accumulé (snapshots absent).
    const transactions = [{ type: "buy", symbol: "AAPL", date: "2026-05-01", quantity: 10, price: 100 }];
    fetchPriceHistory.mockResolvedValue({
      points: [
        { date: "2026-05-01", close: 100 },
        { date: "2026-06-01", close: 120 },
      ],
    });
    render(<MeetingBriefView mandate={MANDATE} assets={ASSETS} transactions={transactions} />);
    await waitFor(() => expect(fetchPriceHistory).toHaveBeenCalledWith("AAPL", expect.anything()));
    fireEvent.change(screen.getByLabelText(/Dernière rencontre le/i), { target: { value: "2026-05-01" } });
    await waitFor(() => expect(screen.getByText(/Depuis la dernière rencontre \(2026-05-01/)).toBeInTheDocument());
    expect(screen.getByText(/reconstruite à partir du journal/i)).toBeInTheDocument();
  });

  it("does not reconstruct when real accrued snapshots already exist", async () => {
    const transactions = [{ type: "buy", symbol: "AAPL", date: "2026-05-01", quantity: 10, price: 100 }];
    render(<MeetingBriefView mandate={MANDATE} assets={ASSETS} snapshots={SNAPSHOTS} transactions={transactions} />);
    // Les relevés réels (≥ 2) priment → aucun fetch d'historique pour reconstruire.
    await waitFor(() => expect(fetchMeetingTopics).toHaveBeenCalled());
    expect(fetchPriceHistory).not.toHaveBeenCalled();
  });

  it("copies the raw markdown to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<MeetingBriefView mandate={MANDATE} assets={ASSETS} />);
    fireEvent.click(screen.getByLabelText(/Copier le brief en markdown/i));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toContain("# Brief de rencontre — Client A — A inc.");
    await waitFor(() => expect(screen.getByText("Copié")).toBeInTheDocument());
    vi.unstubAllGlobals();
  });
});
