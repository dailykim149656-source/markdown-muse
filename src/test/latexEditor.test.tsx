import type { Editor as TiptapEditor } from "@tiptap/react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("focuses the requested LaTeX source line", async () => {
    const onSourceLineTargetApplied = vi.fn();

    render(
      <LatexEditor
        initialContent={"\\section{Start}\nSecond line\nThird line"}
        onSourceLineTargetApplied={onSourceLineTargetApplied}
        sourceLineTarget={2}
      />,
    );

    const sourceTextarea = await screen.findByPlaceholderText(/Edit raw LaTeX source here/i) as HTMLTextAreaElement;

    await waitFor(() => {
      expect(sourceTextarea.selectionStart).toBeGreaterThan("\\section{Start}\n".length - 1);
      expect(sourceTextarea.selectionEnd).toBeGreaterThan(sourceTextarea.selectionStart);
    });

    expect(onSourceLineTargetApplied).toHaveBeenCalled();
  });

  it("prefers source-derived rendering when initial tiptap doc is empty", async () => {
    render(
      <LatexEditor
        initialContent={"\\section{Visible}\nBody"}
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

  it("does not reseed source or WYSIWYG from parent echoes within the same seed revision", async () => {
    const { rerender } = render(
      <LatexEditor
        initialContent={"\\section{Start}\nBody"}
        seedRevision="doc-1:0"
      />,
    );

    const sourceTextarea = await screen.findByPlaceholderText(/Edit raw LaTeX source here/i);

    fireEvent.change(sourceTextarea, {
      target: {
        value: "\\section{Edited}\nStable body",
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Edited")).toBeInTheDocument();
      expect(screen.getByText("Stable body")).toBeInTheDocument();
    });

    rerender(
      <LatexEditor
        initialContent={"\\section{Parent Echo}\nReset candidate"}
        initialTiptapDoc={{
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: "Parent Echo" }],
            },
          ],
        }}
        seedRevision="doc-1:0"
      />,
    );

    await waitFor(() => {
      expect((sourceTextarea as HTMLTextAreaElement).value).toBe("\\section{Edited}\nStable body");
      expect(screen.getAllByText("Edited").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Stable body").length).toBeGreaterThan(0);
    });

    expect(screen.queryByText("Parent Echo")).toBeNull();
  });

  it("delays WYSIWYG export callbacks until composition ends", async () => {
    const onContentChange = vi.fn();
    const onTiptapChange = vi.fn();
    let editor: TiptapEditor | null = null;

    render(
      <LatexEditor
        onContentChange={onContentChange}
        onEditorReady={(nextEditor) => {
          editor = nextEditor;
        }}
        onTiptapChange={onTiptapChange}
        seedRevision="doc-2:0"
      />,
    );

    await waitFor(() => {
      expect(editor).toBeTruthy();
    });

    onContentChange.mockClear();
    onTiptapChange.mockClear();

    const compositionStart = new Event("compositionstart", { bubbles: true });
    const compositionEnd = new Event("compositionend", { bubbles: true });

    await act(async () => {
      editor?.view.dom.dispatchEvent(compositionStart);
      editor?.commands.insertContent("Alpha");
      await new Promise((resolve) => setTimeout(resolve, 25));
    });

    expect(onContentChange).not.toHaveBeenCalled();
    expect(onTiptapChange).not.toHaveBeenCalled();

    await act(async () => {
      editor?.view.dom.dispatchEvent(compositionEnd);
    });

    await waitFor(() => {
      expect(onContentChange).toHaveBeenCalledTimes(1);
      expect(onTiptapChange).toHaveBeenCalledTimes(1);
    });
  });

  it("renders and dismisses the LaTeX empty-state overlay without flickering back on same-revision echoes", async () => {
    let editor: TiptapEditor | null = null;
    const { rerender } = render(
      <LatexEditor
        onEditorReady={(nextEditor) => {
          editor = nextEditor;
        }}
        seedRevision="doc-3:0"
      />,
    );

    expect(screen.getByText("LaTeX WYSIWYG with synced source pane.")).toBeInTheDocument();

    await waitFor(() => {
      expect(editor).toBeTruthy();
    });

    await act(async () => {
      editor?.commands.insertContent("Alpha");
    });

    await waitFor(() => {
      expect(screen.queryByText("LaTeX WYSIWYG with synced source pane.")).toBeNull();
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });

    rerender(
      <LatexEditor
        initialContent=""
        onEditorReady={(nextEditor) => {
          editor = nextEditor;
        }}
        seedRevision="doc-3:0"
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText("LaTeX WYSIWYG with synced source pane.")).toBeNull();
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });
  });
});
