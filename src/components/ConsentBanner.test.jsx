import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ConsentBanner from "./ConsentBanner";

describe("ConsentBanner", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<ConsentBanner open={false} onAccept={vi.fn()} onLearnMore={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("explains local-first storage and no tracking when open", () => {
    render(<ConsentBanner open onAccept={vi.fn()} onLearnMore={vi.fn()} />);
    expect(screen.getByText(/aucun pistage/i)).toBeInTheDocument();
    expect(screen.getByText(/stockage local/i)).toBeInTheDocument();
  });

  it("fires accept and learn-more callbacks", () => {
    const onAccept = vi.fn();
    const onLearnMore = vi.fn();
    render(<ConsentBanner open onAccept={onAccept} onLearnMore={onLearnMore} />);
    fireEvent.click(screen.getByText("J'ai compris"));
    fireEvent.click(screen.getByText("En savoir plus"));
    expect(onAccept).toHaveBeenCalled();
    expect(onLearnMore).toHaveBeenCalled();
  });
});
