import { act, renderHook } from "@testing-library/react";
import type { JSONContent } from "@tiptap/core";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nContext } from "@/i18n/I18nProvider";
import { buildLiveAgentPatchSet } from "@/lib/ai/liveAgentPatchBuilder";
import { usePatchReview } from "@/hooks/usePatchReview";
import type { DocumentData } from "@/types/document";
import type { DocumentAst } from "@/types/documentAst";
import type { DocumentPatchSet } from "@/types/documentPatch";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nContext.Provider
    value={{
      locale: "en",
      setLocale: vi.fn(),
      t: (key: string) => key,
    }}
  >
    {children}
  </I18nContext.Provider>
);

const richTextDocumentJson: JSONContent = {
  content: [
    {
      attrs: { level: 1, nodeId: "heading-1" },
      content: [{ text: "Overview", type: "text" }],
      type: "heading",
    },
    {
      attrs: { nodeId: "paragraph-1" },
      content: [{ text: "Old intro text.", type: "text" }],
      type: "paragraph",
    },
  ],
  type: "doc",
};

const createActiveDoc = (overrides?: Partial<DocumentData>): DocumentData => ({
  content: "# Overview\n\nOld intro text.",
  createdAt: 1,
  id: "doc-1",
  mode: "markdown",
  name: "Runbook",
  sourceSnapshots: {
    markdown: "# Overview\n\nOld intro text.",
  },
  tiptapJson: richTextDocumentJson,
  updatedAt: 1,
  ...overrides,
});

const createActiveEditor = (json: JSONContent) => ({
  getJSON: vi.fn(() => json),
});

describe("usePatchReview", () => {
  it("updates rich-text document state with the full applied snapshot", async () => {
    const updateActiveDoc = vi.fn();
    const setLiveEditorHtml = vi.fn();
    const bumpEditorKey = vi.fn();
    const activeEditor = createActiveEditor(richTextDocumentJson);
    const patchSet: DocumentPatchSet = {
      author: "ai",
      createdAt: Date.now(),
      documentId: "doc-1",
      patchSetId: "patch-set-1",
      patches: [{
        author: "ai",
        operation: "replace_text_range",
        patchId: "patch-1",
        payload: {
          kind: "replace_text",
          text: "New",
        },
        status: "accepted",
        target: {
          endOffset: 3,
          nodeId: "paragraph-1",
          startOffset: 0,
          targetType: "text_range",
        },
        title: "Update intro",
      }],
      status: "in_review",
      title: "Patch review",
    };

    const { result } = renderHook(() => usePatchReview({
      activeDoc: createActiveDoc(),
      activeEditor: activeEditor as never,
      bumpEditorKey,
      onVersionSnapshot: vi.fn(),
      onWorkspaceSync: vi.fn(),
      setLiveEditorHtml,
      updateActiveDoc,
    }), { wrapper });

    act(() => {
      result.current.loadPatchSet(patchSet);
    });

    await act(async () => {
      await result.current.applyReviewedPatches();
    });

    const appliedPatch = updateActiveDoc.mock.calls[0]?.[0];

    expect(appliedPatch).toBeTruthy();
    expect(appliedPatch.ast).toEqual(expect.objectContaining({ type: "document" }));
    expect(appliedPatch.content).toContain("New intro text.");
    expect(appliedPatch.sourceSnapshots).toEqual(expect.objectContaining({
      html: expect.stringContaining("New intro text."),
      latex: expect.stringContaining("New intro text."),
      markdown: expect.stringContaining("New intro text."),
    }));
    expect(appliedPatch.tiptapJson).toBeNull();
    expect(appliedPatch.updatedAt).toEqual(expect.any(Number));
    expect(setLiveEditorHtml).toHaveBeenCalledWith(expect.stringContaining("New intro text."));
    expect(bumpEditorKey).toHaveBeenCalled();
  });

  it("applies live-agent replace_document_body patches without leaving stale tiptap state", async () => {
    const updateActiveDoc = vi.fn();
    const activeEditorJson: JSONContent = {
      content: [
        {
          attrs: { nodeId: "para-owner" },
          content: [{ text: "Owner: TBD", type: "text" }],
          type: "paragraph",
        },
        {
          attrs: { nodeId: "para-recipient" },
          content: [{ text: "Recipient: TBD", type: "text" }],
          type: "paragraph",
        },
      ],
      type: "doc",
    };
    const activeEditor = createActiveEditor(activeEditorJson);
    const sourceAst: DocumentAst = {
      blocks: [
        {
          children: [{ text: "Owner: TBD", type: "text" }],
          kind: "block",
          nodeId: "para-owner",
          type: "paragraph",
        },
        {
          children: [{ text: "Recipient: TBD", type: "text" }],
          kind: "block",
          nodeId: "para-recipient",
          type: "paragraph",
        },
      ],
      nodeId: "doc-2",
      type: "document",
    };
    const patchSet = buildLiveAgentPatchSet({
      documentAst: sourceAst,
      documentId: "doc-1",
      draft: {
        edits: [{
          kind: "replace_document_body",
          markdownBody: "Owner: Hong Gil-dong\n\nRecipient: Sim Cheong-i",
          rationale: "Apply handover fields.",
        }],
        kind: "current_document",
      },
      patchSetId: "patch-set-2",
      title: "Apply handover fields",
    });

    const acceptedPatchSet: DocumentPatchSet = {
      ...patchSet,
      patches: patchSet.patches.map((patch) => ({
        ...patch,
        status: "accepted" as const,
      })),
    };

    const { result } = renderHook(() => usePatchReview({
      activeDoc: createActiveDoc({
        content: "Owner: TBD\n\nRecipient: TBD",
        sourceSnapshots: {
          markdown: "Owner: TBD\n\nRecipient: TBD",
        },
        tiptapJson: activeEditorJson,
      }),
      activeEditor: activeEditor as never,
      bumpEditorKey: vi.fn(),
      onVersionSnapshot: vi.fn(),
      onWorkspaceSync: vi.fn(),
      setLiveEditorHtml: vi.fn(),
      updateActiveDoc,
    }), { wrapper });

    act(() => {
      result.current.loadPatchSet(acceptedPatchSet);
    });

    await act(async () => {
      await result.current.applyReviewedPatches();
    });

    const appliedPatch = updateActiveDoc.mock.calls[0]?.[0];

    expect(appliedPatch).toBeTruthy();
    expect(appliedPatch.content).toContain("Owner: Hong Gil-dong");
    expect(appliedPatch.content).toContain("Recipient: Sim Cheong-i");
    expect(appliedPatch.tiptapJson).toBeNull();
  });
});
