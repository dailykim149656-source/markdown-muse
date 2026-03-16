import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor, within } from "@testing-library/react";
import type { JSONContent } from "@tiptap/core";
import HtmlEditor from "@/components/editor/HtmlEditor";
import LatexEditor from "@/components/editor/LatexEditor";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import { DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR } from "@/lib/editor/displayColorOverride";

const buildColoredDoc = (text: string, color: string): JSONContent => ({
  type: "doc",
  content: [{
    type: "paragraph",
    content: [{
      type: "text",
      marks: [{
        type: "textStyle",
        attrs: { color },
      }],
      text,
    }],
  }],
});

const setDarkMode = (enabled: boolean) => {
  document.documentElement.classList.toggle("dark", enabled);
};

const getEditorScope = (container: HTMLElement) => {
  const editorRoot = container.querySelector(".ProseMirror");

  if (!editorRoot) {
    throw new Error("Expected a ProseMirror root in the rendered editor.");
  }

  return within(editorRoot);
};

afterEach(async () => {
  await act(async () => {
    document.documentElement.classList.remove("dark");
  });
});

describe("rich-text dark mode display override", () => {
  it("tags explicit black imported html in dark mode without changing stored html", async () => {
    await act(async () => {
      setDarkMode(true);
    });
    const onHtmlChange = vi.fn();
    const { container } = render(
      <HtmlEditor
        initialContent={'<p><span style="color: #000">Black text</span> <span style="color: red">Accent text</span></p>'}
        onHtmlChange={onHtmlChange}
      />,
    );
    const editor = getEditorScope(container);

    await waitFor(() => {
      expect(editor.getByText("Black text").closest(`[${DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR}="true"]`)).toBeInTheDocument();
    });

    expect(editor.getByText("Accent text").closest(`[${DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR}="true"]`)).toBeNull();
    expect((container.querySelector("textarea.html-textarea") as HTMLTextAreaElement).value).toContain('style="color: #000"');
    expect(onHtmlChange).toHaveBeenCalled();
    expect(onHtmlChange.mock.calls.at(-1)?.[0]).toContain("color: rgb(0, 0, 0)");
    expect(onHtmlChange.mock.calls.at(-1)?.[0]).not.toContain(DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR);
  });

  it("removes the dark mode override tag when dark mode is turned off", async () => {
    await act(async () => {
      setDarkMode(true);
    });

    const { container } = render(
      <HtmlEditor initialContent={'<p><span style="color: rgb(0, 0, 0)">Black text</span></p>'} />,
    );
    const editor = getEditorScope(container);

    const blackText = await waitFor(() => editor.getByText("Black text"));

    await waitFor(() => {
      expect(blackText.closest(`[${DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR}="true"]`)).toBeInTheDocument();
    });

    await act(async () => {
      setDarkMode(false);
    });

    await waitFor(() => {
      expect(blackText.closest(`[${DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR}="true"]`)).toBeNull();
    });
  });

  it("applies the same override to markdown and latex rich-text editors", async () => {
    await act(async () => {
      setDarkMode(true);
    });

    const markdownRender = render(
      <MarkdownEditor
        initialContent=""
        initialTiptapDoc={buildColoredDoc("Markdown black", "#000000")}
      />,
    );
    const markdownEditor = getEditorScope(markdownRender.container);

    await waitFor(() => {
      expect(markdownEditor.getByText("Markdown black").closest(`[${DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR}="true"]`)).toBeInTheDocument();
    });

    markdownRender.unmount();

    const latexRender = render(
      <LatexEditor
        initialContent=""
        initialTiptapDoc={buildColoredDoc("Latex black", "black")}
      />,
    );
    const latexEditor = getEditorScope(latexRender.container);

    await waitFor(() => {
      expect(latexEditor.getByText("Latex black").closest(`[${DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR}="true"]`)).toBeInTheDocument();
    });
  });
});
