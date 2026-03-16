import type { Editor as TiptapEditor } from "@tiptap/react";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { JSONContent } from "@tiptap/core";
import { describe, expect, it, vi } from "vitest";
import MarkdownEditor from "@/components/editor/MarkdownEditor";

const emptyTiptapDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

describe("MarkdownEditor", () => {
  it("prefers markdown source when initial tiptap doc is empty", async () => {
    render(
      <MarkdownEditor
        initialContent={"# Visible\n\nBody"}
        initialTiptapDoc={emptyTiptapDoc}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Visible")).toBeInTheDocument();
      expect(screen.getByText("Body")).toBeInTheDocument();
    });
  });

  it("hydrates bare TOC placeholders into a TOC block in WYSIWYG mode", async () => {
    const onTiptapChange = vi.fn();

    render(
      <MarkdownEditor
        documentFeaturesEnabled
        initialContent={"[[toc]]\n\n# Overview\n\n## Setup"}
        initialTiptapDoc={emptyTiptapDoc}
        onTiptapChange={onTiptapChange}
      />,
    );

    await waitFor(() => {
      expect(onTiptapChange).toHaveBeenCalled();
    }, { timeout: 10000 });

    const lastTiptapDoc = onTiptapChange.mock.calls.at(-1)?.[0] as JSONContent | undefined;
    expect(screen.queryByText("[[toc]]")).not.toBeInTheDocument();
    expect(lastTiptapDoc?.content?.[0]).toEqual(expect.objectContaining({
      attrs: expect.objectContaining({ maxDepth: 3 }),
      type: "tableOfContents",
    }));
  });

  it("respects TOC maxDepth when rendering TOC entries", async () => {
    const onTiptapChange = vi.fn();

    render(
      <MarkdownEditor
        documentFeaturesEnabled
        initialContent={"[[toc:1]]\n\n# Overview\n\n## Setup"}
        initialTiptapDoc={emptyTiptapDoc}
        onTiptapChange={onTiptapChange}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText("[[toc:1]]")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Setup" })).not.toBeInTheDocument();
    }, { timeout: 10000 });

    const lastTiptapDoc = onTiptapChange.mock.calls.at(-1)?.[0] as JSONContent | undefined;
    expect(lastTiptapDoc?.content?.[0]).toEqual(expect.objectContaining({
      attrs: expect.objectContaining({ maxDepth: 1 }),
      type: "tableOfContents",
    }));
  });

  it("does not reseed from parent echoes within the same seed revision", async () => {
    let editor: TiptapEditor | null = null;
    const { rerender } = render(
      <MarkdownEditor
        initialContent={"# Start\n\nBody"}
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
      expect(screen.getByText("Edited")).toBeInTheDocument();
      expect(screen.getByText("Stable body")).toBeInTheDocument();
    });

    rerender(
      <MarkdownEditor
        initialContent={"# Parent Echo\n\nReset candidate"}
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
      expect(screen.getByText("Edited")).toBeInTheDocument();
      expect(screen.getByText("Stable body")).toBeInTheDocument();
    });

    expect(screen.queryByText("Parent Echo")).toBeNull();
  });

  it("delays markdown sync callbacks until composition ends", async () => {
    const onContentChange = vi.fn();
    const onTiptapChange = vi.fn();
    let editor: TiptapEditor | null = null;

    render(
      <MarkdownEditor
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
