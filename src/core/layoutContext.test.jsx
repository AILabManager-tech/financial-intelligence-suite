import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useLayout, useLayoutControls } from "./layoutContext";
import { LayoutProvider } from "../components/LayoutProvider";
import { getFeaturesBySurface } from "./featureRegistry";
import { LAYOUT_KEY, getVisibleFeatureIds } from "../services/layoutStore";

const ASSET_IDS = getFeaturesBySurface("asset").map((f) => f.id);

// Harness: renders the live visible-ids plus buttons that invoke the controls
// from click handlers (not from render), so edits drive real re-renders.
function Probe() {
  const layout = useLayout();
  const { setVisibility, setColumns, move, reset } = useLayoutControls();
  return (
    <div>
      <div data-testid="visible">{getVisibleFeatureIds(layout, "asset").join(",")}</div>
      <div data-testid="columns0">{layout.asset[0].columns}</div>
      <button onClick={() => setVisibility("asset", ASSET_IDS[0], false)}>hide-0</button>
      <button onClick={() => setColumns("asset", ASSET_IDS[0], 2)}>cols-0-2</button>
      <button onClick={() => move("asset", 0, 2)}>move-0-2</button>
      <button onClick={() => reset()}>reset</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <LayoutProvider>
      <Probe />
    </LayoutProvider>,
  );
}

describe("layoutContext", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("expose le layout par défaut au montage", () => {
    renderWithProvider();
    expect(screen.getByTestId("visible")).toHaveTextContent(ASSET_IDS.join(","));
  });

  it("setVisibility re-rend les consommateurs et persiste", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("hide-0"));
    expect(screen.getByTestId("visible")).not.toHaveTextContent(
      new RegExp(`(^|,)${ASSET_IDS[0]}(,|$)`),
    );
    expect(localStorage.getItem(LAYOUT_KEY)).not.toBeNull();
  });

  it("setColumns met à jour le colonnage et re-rend", () => {
    renderWithProvider();
    expect(screen.getByTestId("columns0")).toHaveTextContent("1");
    fireEvent.click(screen.getByText("cols-0-2"));
    expect(screen.getByTestId("columns0")).toHaveTextContent("2");
  });

  it("move réordonne et re-rend", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("move-0-2"));
    const visible = screen.getByTestId("visible").textContent.split(",");
    expect(visible[2]).toBe(ASSET_IDS[0]);
  });

  it("reset revient au défaut et efface l'entrée stockée", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("hide-0"));
    expect(localStorage.getItem(LAYOUT_KEY)).not.toBeNull();
    fireEvent.click(screen.getByText("reset"));
    expect(screen.getByTestId("visible")).toHaveTextContent(ASSET_IDS.join(","));
    expect(localStorage.getItem(LAYOUT_KEY)).toBeNull();
  });

  it("useLayout hors provider retombe sur une lecture du store (non réactif)", () => {
    function Standalone() {
      const layout = useLayout();
      return <div data-testid="solo">{getVisibleFeatureIds(layout, "asset").length}</div>;
    }
    render(<Standalone />);
    expect(screen.getByTestId("solo")).toHaveTextContent(String(ASSET_IDS.length));
  });

  it("useLayoutControls hors provider jette une erreur explicite", () => {
    function Bad() {
      useLayoutControls();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(/LayoutProvider/);
  });
});
