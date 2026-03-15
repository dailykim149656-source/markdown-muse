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
      expect(screen.getByText("Visible")).toBeInTheDocument();
      expect(screen.getByText("Body")).toBeInTheDocument();
    });
  });
});
