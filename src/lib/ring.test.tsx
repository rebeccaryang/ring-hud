import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Ring } from "./ring";

describe("Ring", () => {
  it("renders a button for every configured item", () => {
    const items = [
      { label: "VS Code", onClick: vi.fn() },
      { label: "Browser", onClick: vi.fn() },
      { label: "Terminal", onClick: vi.fn() },
    ];

    render(<Ring items={items} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(items.length);
    items.forEach((item) => {
      expect(screen.getByTitle(item.label)).toBeInTheDocument();
    });
  });

  it("invokes the matching action when a bubble is clicked", () => {
    const onClick = vi.fn();
    render(<Ring items={[{ label: "Zoom In", onClick }]} />);

    fireEvent.click(screen.getByRole("button", { name: /zoom in/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("offsets the first item directly above the center", () => {
    render(<Ring items={[{ label: "Screenshot", onClick: vi.fn() }]} />);

    const bubble = screen.getByRole("button", { name: /screenshot/i });
    expect(bubble.style.transform.startsWith("translate(")).toBe(true);
    expect(bubble.style.transform).toMatch(/, -160px\)$/);
  });
});
