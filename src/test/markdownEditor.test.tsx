import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarkdownEditor from "@/components/editor/MarkdownEditor";

describe("MarkdownEditor", () => {
  it("prefers markdown source when initial tiptap doc is empty", async () => {
    render(
      <MarkdownEditor
        initialContent={"# Visible\n\nBody"}
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
