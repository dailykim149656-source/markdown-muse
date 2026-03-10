import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LatexEditor from "@/components/editor/LatexEditor";

describe("LatexEditor", () => {
  it("hydrates initial latex into WYSIWYG immediately", async () => {
    render(<LatexEditor initialContent={"\\section{Hello}\nTemplate body"} />);

    await waitFor(() => {
      expect(screen.getAllByText("Hello").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Template body").length).toBeGreaterThan(0);
    });
  });

  it("syncs source edits into WYSIWYG", async () => {
    const onContentChange = vi.fn();

    render(
      <LatexEditor
        initialContent={"\\section{Start}\nBody"}
        onContentChange={onContentChange}
      />,
    );

    const sourceTextarea = await screen.findByPlaceholderText(/Edit raw LaTeX source here/i);

    fireEvent.change(sourceTextarea, {
      target: {
        value: "\\section{Updated}\nSynced body",
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Updated")).toBeInTheDocument();
      expect(screen.getByText("Synced body")).toBeInTheDocument();
    });

    expect(onContentChange).toHaveBeenCalled();
  });
});
