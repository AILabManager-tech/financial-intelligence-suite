import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ThemeSelector from "./ThemeSelector";

describe("ThemeSelector", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders four radio options with FIS active by default", () => {
    render(<ThemeSelector />);
    const fisRadio = screen.getByRole("radio", { name: "FIS" });
    expect(fisRadio).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Matrix" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "Cyber" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "Clair" })).toHaveAttribute("aria-checked", "false");
  });

  it("applies data-theme to <html> when a non-default theme is selected", () => {
    render(<ThemeSelector />);
    fireEvent.click(screen.getByRole("radio", { name: "Cyber" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("cyber");
  });

  it("removes data-theme when switching back to FIS", () => {
    render(<ThemeSelector />);
    fireEvent.click(screen.getByRole("radio", { name: "Matrix" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("matrix");
    fireEvent.click(screen.getByRole("radio", { name: "FIS" }));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("persists the selection across remounts", () => {
    const first = render(<ThemeSelector />);
    fireEvent.click(screen.getByRole("radio", { name: "Matrix" }));
    first.unmount();

    render(<ThemeSelector />);
    expect(screen.getByRole("radio", { name: "Matrix" })).toHaveAttribute("aria-checked", "true");
  });
});
