import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import katex from "katex";
import MathRender from "@/components/editor/MathRender";

vi.mock("@/lib/rendering/loadKatex", () => ({
  loadKatex: () => Promise.resolve(katex),
}));

describe("MathRender", () => {
  it("renders standard math output", async () => {
    const { container } = render(<MathRender displayMode={false} latex="E=mc^2" />);

    await waitFor(() => {
      expect(container.querySelector(".katex")).not.toBeNull();
    });
  });

  it("does not preserve dangerous href output from untrusted latex", async () => {
    const { container } = render(<MathRender displayMode={false} latex={"\\href{javascript:alert(1)}{click}"} />);

    await waitFor(() => {
      expect(container.textContent).toContain("click");
    });

    expect(container.querySelector("a")).toBeNull();
    expect(container.innerHTML).not.toContain('href="javascript:alert(1)"');
  });
});
