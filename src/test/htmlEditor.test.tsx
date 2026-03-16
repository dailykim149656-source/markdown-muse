import type { Editor as TiptapEditor } from "@tiptap/react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

  it("does not reseed from parent echoes within the same seed revision", async () => {
    let editor: TiptapEditor | null = null;
    const { rerender } = render(
      <HtmlEditor
        initialContent={"<h1>Start</h1><p>Body</p>"}
        onEditorReady={(nextEditor) => {
          editor = nextEditor;
        }}
        seedRevision="doc-1:0"
      />,
    );

    await waitFor(() => {
      expect(editor).toBeTruthy();
    });

    await act(async () => {
      editor?.commands.setContent("<h1>Edited</h1><p>Stable body</p>");
    });

    await waitFor(() => {
      expect(screen.getAllByText("Edited").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Stable body").length).toBeGreaterThan(0);
    });

    rerender(
      <HtmlEditor
        initialContent={"<h1>Parent Echo</h1><p>Reset candidate</p>"}
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
        onEditorReady={(nextEditor) => {
          editor = nextEditor;
        }}
        seedRevision="doc-1:0"
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Edited").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Stable body").length).toBeGreaterThan(0);
    });

    expect(screen.queryByText("Parent Echo")).toBeNull();
  });

  it("delays html sync callbacks until composition ends", async () => {
    const onContentChange = vi.fn();
    const onTiptapChange = vi.fn();
    let editor: TiptapEditor | null = null;

    render(
      <HtmlEditor
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
      editor?.commands.insertContent("한글");
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
});
