import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PortfolioSelector from "./PortfolioSelector";

const TWO = {
  activeId: "default",
  portfolios: [
    { id: "default", name: "Portefeuille principal", client: "", baseCurrency: "USD", openedAt: null },
    { id: "client-a", name: "Client A", client: "A inc.", baseCurrency: "CAD", openedAt: null },
  ],
};
const ONE = { activeId: "default", portfolios: [TWO.portfolios[0]] };

function setup(state = TWO, handlers = {}) {
  const props = { onSwitch: vi.fn(), onCreate: vi.fn(), onRename: vi.fn(), onDelete: vi.fn(), ...handlers };
  render(<PortfolioSelector state={state} {...props} />);
  return props;
}

describe("PortfolioSelector", () => {
  it("affiche le mandat actif", () => {
    setup();
    expect(screen.getByLabelText("Sélecteur de mandat")).toHaveTextContent("Portefeuille principal");
  });

  it("ouvre le menu et bascule de mandat", () => {
    const { onSwitch } = setup();
    fireEvent.click(screen.getByLabelText("Sélecteur de mandat"));
    fireEvent.click(screen.getByLabelText("Activer le mandat Client A"));
    expect(onSwitch).toHaveBeenCalledWith("client-a");
  });

  it("crée un mandat depuis le champ", () => {
    const { onCreate } = setup();
    fireEvent.click(screen.getByLabelText("Sélecteur de mandat"));
    fireEvent.change(screen.getByLabelText("Nom du nouveau mandat"), { target: { value: "Mandat C" } });
    fireEvent.click(screen.getByLabelText("Créer le mandat"));
    expect(onCreate).toHaveBeenCalledWith({ name: "Mandat C" });
  });

  it("renomme le mandat actif", () => {
    const { onRename } = setup();
    fireEvent.click(screen.getByLabelText("Sélecteur de mandat"));
    fireEvent.change(screen.getByLabelText("Renommer le mandat actif"), { target: { value: "Renommé" } });
    expect(onRename).toHaveBeenCalledWith("default", { name: "Renommé" });
  });

  it("change le type de compte du mandat actif", () => {
    const { onRename } = setup();
    fireEvent.click(screen.getByLabelText("Sélecteur de mandat"));
    fireEvent.change(screen.getByLabelText("Type de compte du mandat actif"), { target: { value: "rrsp" } });
    expect(onRename).toHaveBeenCalledWith("default", { accountType: "rrsp" });
  });

  it("supprime un mandat (bouton présent quand >1)", () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByLabelText("Sélecteur de mandat"));
    fireEvent.click(screen.getByLabelText("Supprimer le mandat Client A"));
    expect(onDelete).toHaveBeenCalledWith("client-a");
  });

  it("cache la suppression quand il ne reste qu'un mandat", () => {
    setup(ONE);
    fireEvent.click(screen.getByLabelText("Sélecteur de mandat"));
    expect(screen.queryByLabelText(/Supprimer le mandat/)).toBeNull();
  });
});
