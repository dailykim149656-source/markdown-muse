import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HtmlEditor from "@/components/editor/HtmlEditor";

describe("HtmlEditor", () => {
  it("hydrates initial html into WYSIWYG immediately", async () => {
    render(<HtmlEditor initialContent={"<h1>Hello</h1><p>Template body</p>"} />);

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("Template body")).toBeInTheDocument();
    });
  });

  it("syncs source edits into WYSIWYG", async () => {
    const onContentChange = vi.fn();

    render(
      <HtmlEditor
        initialContent={"<h1>Start</h1><p>Body</p>"}
        onContentChange={onContentChange}
      />,
    );

    const sourceTextarea = await screen.findByPlaceholderText(/Edit raw HTML source/i);

    fireEvent.change(sourceTextarea, {
      target: {
        value: "<h1>Updated</h1><p>Synced body</p>",
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Updated")).toBeInTheDocument();
      expect(screen.getByText("Synced body")).toBeInTheDocument();
    });

    expect(onContentChange).toHaveBeenCalled();
  });
});
