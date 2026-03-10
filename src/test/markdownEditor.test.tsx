import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MarkdownEditor from "@/components/editor/MarkdownEditor";

describe("MarkdownEditor", () => {
  it("hydrates initial markdown into WYSIWYG immediately", async () => {
    render(<MarkdownEditor initialContent={"# Hello\n\nTemplate body"} />);

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("Template body")).toBeInTheDocument();
    });
  });

  it("syncs source edits into WYSIWYG", async () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        initialContent={"# Start\n\nBody"}
        onContentChange={onContentChange}
      />,
    );

    fireEvent.click(screen.getByText("Source"));

    await screen.findByText("Markdown Source");

    const sourceTextarea = await screen.findByPlaceholderText(/Write raw Markdown source here/i);

    fireEvent.change(sourceTextarea, {
      target: {
        value: "# Updated\n\nSynced body",
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Updated")).toBeInTheDocument();
      expect(screen.getByText("Synced body")).toBeInTheDocument();
    });

    expect(onContentChange).toHaveBeenCalled();
  });
});
