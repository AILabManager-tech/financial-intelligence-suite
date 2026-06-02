import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AuthContext } from "../core/authContext";
import AuthPanel from "./AuthPanel";

function renderPanel(overrides = {}) {
  const value = {
    authEnabled: true,
    user: null,
    status: "anonymous",
    signIn: vi.fn(async () => ({})),
    signUp: vi.fn(async () => ({})),
    signOut: vi.fn(async () => ({})),
    ...overrides,
  };
  render(<AuthContext.Provider value={value}>
    <AuthPanel />
  </AuthContext.Provider>);
  return value;
}

describe("AuthPanel", () => {
  it("states solo mode when auth is disabled", () => {
    renderPanel({ authEnabled: false });
    expect(screen.getByText(/Mode solo/i)).toBeInTheDocument();
  });

  it("shows the sign-in form and toggles to sign-up", () => {
    renderPanel();
    expect(screen.getByRole("heading", { name: "Connexion" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /En créer un/i }));
    expect(screen.getByRole("heading", { name: "Créer un compte" })).toBeInTheDocument();
  });

  it("submits credentials to signIn", async () => {
    const value = renderPanel();
    fireEvent.change(screen.getByLabelText("Courriel"), { target: { value: "pm@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "supersecret" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    await waitFor(() =>
      expect(value.signIn).toHaveBeenCalledWith({ email: "pm@example.com", password: "supersecret" }),
    );
  });

  it("surfaces a sign-in error", async () => {
    renderPanel({ signIn: vi.fn(async () => ({ error: { message: "Identifiants invalides" } })) });
    fireEvent.change(screen.getByLabelText("Courriel"), { target: { value: "x@y.co" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "badpass00" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    await waitFor(() => expect(screen.getByText("Identifiants invalides")).toBeInTheDocument());
  });

  it("shows the account summary and signs out when connected", () => {
    const value = renderPanel({
      user: { id: "u-1", email: "pm@example.com", fullName: "Jean PM", role: "pm", orgId: null },
    });
    expect(screen.getByText("Connecté")).toBeInTheDocument();
    expect(screen.getByText("Gestionnaire de portefeuille")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Se déconnecter/i }));
    expect(value.signOut).toHaveBeenCalled();
  });
});
