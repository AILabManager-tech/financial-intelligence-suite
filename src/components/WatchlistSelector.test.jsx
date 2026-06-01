import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import WatchlistSelector from "./WatchlistSelector";

const TWO = {
  activeId: "default",
  lists: [
    { id: "default", name: "Défaut" },
    { id: "tech-us", name: "Tech US" },
  ],
};
const ONE = { activeId: "default", lists: [TWO.lists[0]] };

function setup(state = TWO, handlers = {}) {
  const props = { onSwitch: vi.fn(), onCreate: vi.fn(), onRename: vi.fn(), onDelete: vi.fn(), ...handlers };
  render(<WatchlistSelector state={state} {...props} />);
  return props;
}

describe("WatchlistSelector", () => {
  it("affiche la liste active", () => {
    setup();
    expect(screen.getByLabelText("Sélecteur de liste")).toHaveTextContent("Défaut");
  });

  it("ouvre le menu et bascule de liste", () => {
    const { onSwitch } = setup();
    fireEvent.click(screen.getByLabelText("Sélecteur de liste"));
    fireEvent.click(screen.getByLabelText("Activer la liste Tech US"));
    expect(onSwitch).toHaveBeenCalledWith("tech-us");
  });

  it("crée une liste depuis le champ", () => {
    const { onCreate } = setup();
    fireEvent.click(screen.getByLabelText("Sélecteur de liste"));
    fireEvent.change(screen.getByLabelText("Nom de la nouvelle liste"), { target: { value: "Dividendes" } });
    fireEvent.click(screen.getByLabelText("Créer la liste"));
    expect(onCreate).toHaveBeenCalledWith({ name: "Dividendes" });
  });

  it("renomme la liste active", () => {
    const { onRename } = setup();
    fireEvent.click(screen.getByLabelText("Sélecteur de liste"));
    fireEvent.change(screen.getByLabelText("Renommer la liste active"), { target: { value: "Renommée" } });
    expect(onRename).toHaveBeenCalledWith("default", { name: "Renommée" });
  });

  it("supprime une liste (bouton présent quand >1)", () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByLabelText("Sélecteur de liste"));
    fireEvent.click(screen.getByLabelText("Supprimer la liste Tech US"));
    expect(onDelete).toHaveBeenCalledWith("tech-us");
  });

  it("cache la suppression quand il ne reste qu'une liste", () => {
    setup(ONE);
    fireEvent.click(screen.getByLabelText("Sélecteur de liste"));
    expect(screen.queryByLabelText(/Supprimer la liste/)).toBeNull();
  });
});
