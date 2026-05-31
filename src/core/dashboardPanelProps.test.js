import { describe, expect, it } from "vitest";
import { buildDashboardPanelProps } from "./dashboardPanelProps";
import { getFeaturesBySurface } from "./featureRegistry";

// A representative deps object — values are dummies; the builder is a pure
// mapping, so what matters is which panels it lists, not the values.
function deps(overrides = {}) {
  return {
    assets: [{ symbol: "AAPL" }],
    buffettSummaries: {},
    onSelect: () => {},
    alertTriggers: [],
    alerts: [],
    availableSymbols: ["AAPL"],
    onAddAlert: () => {},
    onRemoveAlert: () => {},
    onToggleAlert: () => {},
    snapshots: [],
    onSavePosition: () => {},
    onRemoveAsset: () => {},
    onImportPositions: () => {},
    baseCurrency: "USD",
    transactions: [{ type: "buy", symbol: "AAPL", date: "2024-01-01", quantity: 1, price: 10 }],
    ...overrides,
  };
}

describe("buildDashboardPanelProps", () => {
  it("provides a props entry for EVERY dashboard panel in the registry", () => {
    const props = buildDashboardPanelProps(deps());
    const registered = getFeaturesBySurface("dashboard").map((f) => f.componentKey);
    for (const componentKey of registered) {
      // A missing entry = the panel silently renders with no data (the P4.12
      // OperationalStatsPanel regression). Every registered panel must be wired.
      expect(props, `missing props wiring for ${componentKey}`).toHaveProperty(componentKey);
    }
  });

  it("wires the entered transactions (with a lot-matching method) into OperationalStatsPanel", () => {
    const transactions = [{ type: "buy", symbol: "MSFT", date: "2024-02-02", quantity: 3, price: 100 }];
    const props = buildDashboardPanelProps(deps({ transactions }));
    expect(props.OperationalStatsPanel.transactions).toBe(transactions);
    expect(props.OperationalStatsPanel.method).toBe("fifo");
  });

  it("passes the merged assets to the value-derived portfolio panels", () => {
    const assets = [{ symbol: "AAPL" }];
    const props = buildDashboardPanelProps(deps({ assets }));
    expect(props.PortfolioConcentrationPanel.assets).toBe(assets);
    expect(props.CurrencyExposurePanel.assets).toBe(assets);
    expect(props.RiskCommandCenter.assets).toBe(assets);
  });
});
