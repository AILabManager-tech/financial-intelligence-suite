import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import LayoutSurface from "./LayoutSurface";
import { getFeaturesBySurface } from "../core/featureRegistry";
import { getDefaultLayout, setFeatureVisibility, moveFeature } from "../services/layoutStore";

// Fake components keyed by the registry componentKeys, each rendering an
// identifiable marker so we can assert order/visibility from the DOM.
function makeComponents(surface) {
  const map = {};
  for (const feature of getFeaturesBySurface(surface)) {
    map[feature.componentKey] = ({ asset }) => (
      <div data-testid={`feat-${feature.id}`}>{feature.componentKey}{asset ? `:${asset}` : ""}</div>
    );
  }
  return map;
}

const ASSET_COMPONENTS = makeComponents("asset");
const ASSET_IDS = getFeaturesBySurface("asset").map((f) => f.id);

describe("LayoutSurface", () => {
  it("rend toutes les features visibles d'une surface dans l'ordre du layout", () => {
    render(<LayoutSurface surface="asset" layout={getDefaultLayout()} components={ASSET_COMPONENTS} />);
    const rendered = screen.getAllByTestId(/^feat-/).map((el) => el.dataset.testid);
    expect(rendered).toEqual(ASSET_IDS.map((id) => `feat-${id}`));
  });

  it("n'affiche pas une feature masquée", () => {
    const layout = setFeatureVisibility(getDefaultLayout(), "asset", ASSET_IDS[0], false);
    render(<LayoutSurface surface="asset" layout={layout} components={ASSET_COMPONENTS} />);
    expect(screen.queryByTestId(`feat-${ASSET_IDS[0]}`)).toBeNull();
    expect(screen.getByTestId(`feat-${ASSET_IDS[1]}`)).toBeInTheDocument();
  });

  it("respecte un réordonnancement du layout", () => {
    const layout = moveFeature(getDefaultLayout(), "asset", 0, 2);
    render(<LayoutSurface surface="asset" layout={layout} components={ASSET_COMPONENTS} />);
    const rendered = screen.getAllByTestId(/^feat-/).map((el) => el.dataset.testid);
    expect(rendered[2]).toBe(`feat-${ASSET_IDS[0]}`);
  });

  it("transmet les props fournies par propsFor à chaque composant", () => {
    render(
      <LayoutSurface
        surface="asset"
        layout={getDefaultLayout()}
        components={ASSET_COMPONENTS}
        propsFor={() => ({ asset: "AAPL" })}
      />,
    );
    expect(screen.getByTestId(`feat-${ASSET_IDS[0]}`)).toHaveTextContent(":AAPL");
  });

  it("ignore sans crasher un componentKey absent de la map", () => {
    const partial = { ...ASSET_COMPONENTS };
    const firstKey = getFeaturesBySurface("asset")[0].componentKey;
    delete partial[firstKey];
    render(<LayoutSurface surface="asset" layout={getDefaultLayout()} components={partial} />);
    expect(screen.queryByTestId(`feat-${ASSET_IDS[0]}`)).toBeNull();
    // les autres features restent rendues
    expect(screen.getByTestId(`feat-${ASSET_IDS[1]}`)).toBeInTheDocument();
  });

  it("enveloppe chaque feature via wrapItem en conservant l'ordre", () => {
    render(
      <LayoutSurface
        surface="asset"
        layout={getDefaultLayout()}
        components={ASSET_COMPONENTS}
        wrapItem={(feature, node) => <section aria-label={feature.label}>{node}</section>}
      />,
    );
    const sections = screen.getAllByRole("region");
    expect(sections.length).toBe(ASSET_IDS.length);
    // le marqueur de la première feature est bien à l'intérieur d'une section
    expect(sections[0]).toContainElement(screen.getByTestId(`feat-${ASSET_IDS[0]}`));
  });

  it("rend un ensemble vide pour une surface sans feature visible", () => {
    let layout = getDefaultLayout();
    for (const id of ASSET_IDS) layout = setFeatureVisibility(layout, "asset", id, false);
    const { container } = render(
      <LayoutSurface surface="asset" layout={layout} components={ASSET_COMPONENTS} />,
    );
    expect(container.querySelectorAll("[data-testid^='feat-']").length).toBe(0);
  });
});
