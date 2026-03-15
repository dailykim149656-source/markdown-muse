import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HtmlEditor from "@/components/editor/HtmlEditor";

describe("HtmlEditor", () => {
  it("prefers html source when initial tiptap doc is empty", async () => {
    render(
      <HtmlEditor
        initialContent={"<h1>Visible</h1><p>Body</p>"}
        initialTiptapDoc={{
          type: "doc",
          content: [{ type: "paragraph" }],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Visible").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Body").length).toBeGreaterThan(0);
    });
  });

  it("renders a syntax-highlighted html source panel without changing the raw source", async () => {
    const { container } = render(
      <HtmlEditor
        initialContent={'<div class="hero">&amp;<span>Body</span></div>'}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Body").length).toBeGreaterThan(0);
    });

    const sourceTextarea = container.querySelector("textarea.html-textarea");
    expect(sourceTextarea).toBeInstanceOf(HTMLTextAreaElement);
    expect((sourceTextarea as HTMLTextAreaElement).value).toBe('<div class="hero">&amp;<span>Body</span></div>');

    expect(container.querySelector(".html-highlight-pre")).toBeInTheDocument();
    expect(container.querySelector(".html-source-tag-name")?.textContent).toBe("div");
    expect(container.querySelector(".html-source-attr-name")?.textContent).toBe("class");
    expect(container.querySelector(".html-source-entity")?.textContent).toBe("&amp;");
  });
});
