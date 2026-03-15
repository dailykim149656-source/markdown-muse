import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useFormatConversion } from "@/hooks/useFormatConversion";
import type { DocumentData } from "@/types/document";

vi.mock("@/i18n/useI18n", () => ({
  useI18n: () => ({
    locale: "en",
    t: (key: string) => key,
  }),
}));

const createHtmlDocument = (content: string): DocumentData => ({
  ast: null,
  content,
  createdAt: 1,
  id: "doc-html",
  metadata: {},
  mode: "html",
  name: "HTML Doc",
  sourceSnapshots: {
    html: content,
  },
  storageKind: "docsy",
  tiptapJson: null,
  updatedAt: Date.now(),
});

describe("useFormatConversion", () => {
  it("keeps renderable HTML immediate for heavy documents and flushes markdown on demand", async () => {
    const initialDoc = createHtmlDocument(`<h1>Initial</h1><p>${"Alpha ".repeat(20_000)}</p>`);
    const { result, rerender } = renderHook(({ activeDoc }) => useFormatConversion({
      activeDoc,
      activeDocId: activeDoc.id,
      activeEditor: null,
      bumpEditorKey: vi.fn(),
      countWithSpaces: true,
      editorKey: 0,
      updateActiveDoc: vi.fn(),
    }), {
      initialProps: {
        activeDoc: initialDoc,
      },
    });

    expect(result.current.documentPerformanceProfile.kind).toBe("heavy");
    expect(result.current.currentRenderableHtml).toContain("Initial");

    const updatedDoc = createHtmlDocument(`<h1>Updated</h1><p>${"Beta ".repeat(20_000)}</p>`);
    updatedDoc.updatedAt = initialDoc.updatedAt + 1;

    rerender({ activeDoc: updatedDoc });

    expect(result.current.currentRenderableHtml).toContain("Updated");

    let markdown = "";
    await act(async () => {
      markdown = await result.current.getFreshRenderableMarkdown();
    });

    expect(markdown).toContain("Updated");
    expect(result.current.currentRenderableMarkdown).toContain("Updated");
  });
});
