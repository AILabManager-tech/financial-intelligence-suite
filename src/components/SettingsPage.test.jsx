import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import SettingsPage from "./SettingsPage";
import { LayoutProvider } from "./LayoutProvider";
import { getFeatureById, getFeaturesBySurface } from "../core/featureRegistry";
import { LAYOUT_KEY } from "../services/layoutStore";

const firstDashboard = getFeaturesBySurface("dashboard")[0];

function renderPage() {
  return render(
    <LayoutProvider>
      <SettingsPage />
    </LayoutProvider>,
  );
}

describe("SettingsPage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("liste toutes les features des deux surfaces avec un switch de visibilité", () => {
    renderPage();
    const allFeatures = [...getFeaturesBySurface("dashboard"), ...getFeaturesBySurface("asset")];
    for (const feature of allFeatures) {
      expect(screen.getByRole("switch", { name: `Afficher ${feature.label}` })).toBeInTheDocument();
    }
  });

  it("affiche tout en Visible par défaut", () => {
    renderPage();
    const sw = screen.getByRole("switch", { name: `Afficher ${firstDashboard.label}` });
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("un clic sur le switch masque la feature et persiste", () => {
    renderPage();
    const sw = screen.getByRole("switch", { name: `Afficher ${firstDashboard.label}` });
    fireEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(localStorage.getItem(LAYOUT_KEY)).not.toBeNull();
  });

  it("permet de passer une feature en 2 colonnes", () => {
    renderPage();
    const group = screen.getByRole("group", { name: `Colonnage de ${firstDashboard.label}` });
    const twoCols = within(group).getByRole("button", { name: "2 colonnes" });
    fireEvent.click(twoCols);
    expect(twoCols).toHaveAttribute("aria-pressed", "true");
  });

  it("désactive le colonnage quand la feature est masquée", () => {
    renderPage();
    fireEvent.click(screen.getByRole("switch", { name: `Afficher ${firstDashboard.label}` }));
    const group = screen.getByRole("group", { name: `Colonnage de ${firstDashboard.label}` });
    expect(within(group).getByRole("button", { name: "1 colonne" })).toBeDisabled();
  });

  it("le bouton Réinitialiser restaure les valeurs par défaut", () => {
    renderPage();
    const sw = screen.getByRole("switch", { name: `Afficher ${firstDashboard.label}` });
    fireEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByRole("button", { name: /Réinitialiser/ }));
    expect(screen.getByRole("switch", { name: `Afficher ${firstDashboard.label}` })).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem(LAYOUT_KEY)).toBeNull();
  });

  it("affiche le libellé de catégorie de chaque feature", () => {
    renderPage();
    // la première feature dashboard est 'overview' -> 'Vue d'ensemble'
    expect(getFeatureById(firstDashboard.id).category).toBe("overview");
    expect(screen.getAllByText("Vue d'ensemble").length).toBeGreaterThan(0);
  });

  it("réordonne via le bouton Descendre", () => {
    renderPage();
    const dash = getFeaturesBySurface("dashboard").map((f) => f.id);
    const region = screen.getByLabelText("Paramètres — Tableau de bord");
    const order = () =>
      within(region)
        .getAllByTestId(/^row-/)
        .map((el) => el.dataset.testid.replace("row-", ""));
    expect(order()).toEqual(dash);
    fireEvent.click(screen.getByRole("button", { name: `Descendre ${firstDashboard.label}` }));
    const next = order();
    expect(next[0]).toBe(dash[1]);
    expect(next[1]).toBe(dash[0]);
  });

  it("désactive Monter sur la première ligne et Descendre sur la dernière", () => {
    renderPage();
    const dash = getFeaturesBySurface("dashboard");
    expect(screen.getByRole("button", { name: `Monter ${dash[0].label}` })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: `Descendre ${dash[dash.length - 1].label}` }),
    ).toBeDisabled();
  });

  it("réordonne via un drop natif (drag-and-drop)", () => {
    renderPage();
    const dash = getFeaturesBySurface("dashboard").map((f) => f.id);
    const region = screen.getByLabelText("Paramètres — Tableau de bord");
    const rows = within(region).getAllByTestId(/^row-/);
    // glisser la 1re ligne sur la 3e
    fireEvent.dragStart(rows[0]);
    fireEvent.dragOver(rows[2]);
    fireEvent.drop(rows[2]);
    const order = within(region)
      .getAllByTestId(/^row-/)
      .map((el) => el.dataset.testid.replace("row-", ""));
    expect(order[2]).toBe(dash[0]);
  });
});
