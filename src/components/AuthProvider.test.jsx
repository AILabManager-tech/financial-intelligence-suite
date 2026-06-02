import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("../services/authStore", () => ({
  isAuthEnabled: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
  signOut: vi.fn(),
}));

const authStore = await import("../services/authStore");
const { AuthProvider } = await import("./AuthProvider");
const { useAuth } = await import("../core/authContext");

function Probe() {
  const { authEnabled, status, user } = useAuth();
  return <div data-testid="probe">{`${authEnabled}|${status}|${user?.email ?? "none"}`}</div>;
}

beforeEach(() => {
  vi.clearAllMocks();
  authStore.onAuthChange.mockReturnValue(() => {});
});

describe("AuthProvider", () => {
  it("stays in inert solo mode when auth is disabled", () => {
    authStore.isAuthEnabled.mockReturnValue(false);
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId("probe")).toHaveTextContent("false|solo|none");
    expect(authStore.getCurrentUser).not.toHaveBeenCalled();
  });

  it("hydrates the signed-in user when auth is enabled", async () => {
    authStore.isAuthEnabled.mockReturnValue(true);
    authStore.getCurrentUser.mockResolvedValue({ id: "u-1", email: "pm@example.com", role: "pm", orgId: null });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent("true|authenticated|pm@example.com"),
    );
  });

  it("reports anonymous when enabled but signed out", async () => {
    authStore.isAuthEnabled.mockReturnValue(true);
    authStore.getCurrentUser.mockResolvedValue(null);
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("true|anonymous|none"));
  });
});
