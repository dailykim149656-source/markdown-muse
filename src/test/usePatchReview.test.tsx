import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { JSONContent } from "@tiptap/core";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import { I18nContext } from "@/i18n/I18nProvider";
import {
  analyzeTocSuggestion,
  buildTocPatchSetWithAst,
} from "@/lib/ai/tocGeneration";
import { buildLiveAgentPatchSet } from "@/lib/ai/liveAgentPatchBuilder";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
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

const paragraphOnlyDocumentJson: JSONContent = {
  content: [
    {
      attrs: { nodeId: "paragraph-1" },
      content: [{ text: "Project background", type: "text" }],
      type: "paragraph",
    },
    {
      attrs: { nodeId: "paragraph-2" },
      content: [{ text: "Project goal", type: "text" }],
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

const emptyTiptapDoc: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

describe("usePatchReview", () => {
  it("accepts selected patches in bulk without downgrading edited patches", () => {
    const { result } = renderHook(() => usePatchReview({
      activeDoc: createActiveDoc(),
      activeEditor: createActiveEditor(richTextDocumentJson) as never,
      bumpEditorKey: vi.fn(),
      onVersionSnapshot: vi.fn(),
      onWorkspaceSync: vi.fn(),
      setLiveEditorHtml: vi.fn(),
      updateActiveDoc: vi.fn(),
    }), { wrapper });
    const patchSet: DocumentPatchSet = {
      author: "ai",
      createdAt: Date.now(),
      documentId: "doc-1",
      patchSetId: "patch-set-bulk-accept",
      patches: [
        {
          author: "ai",
          operation: "replace_text_range",
          patchId: "patch-pending",
          payload: { kind: "replace_text", text: "Updated intro" },
          status: "pending",
          suggestedText: "Updated intro",
          target: { endOffset: 3, nodeId: "paragraph-1", startOffset: 0, targetType: "text_range" },
          title: "Pending patch",
        },
        {
          author: "ai",
          operation: "replace_text_range",
          patchId: "patch-edited",
          payload: { kind: "replace_text", text: "Edited intro" },
          status: "edited",
          suggestedText: "Edited intro",
          target: { endOffset: 3, nodeId: "paragraph-1", startOffset: 0, targetType: "text_range" },
          title: "Edited patch",
        },
      ],
      status: "in_review",
      title: "Bulk accept",
    };

    act(() => {
      result.current.loadPatchSet(patchSet);
      result.current.handleAcceptPatches(["patch-pending", "patch-edited"]);
    });

    expect(result.current.patchSet?.patches).toEqual(expect.arrayContaining([
      expect.objectContaining({ patchId: "patch-pending", status: "accepted" }),
      expect.objectContaining({ patchId: "patch-edited", status: "edited" }),
    ]));
  });

  it("rejects selected patches in bulk", () => {
    const { result } = renderHook(() => usePatchReview({
      activeDoc: createActiveDoc(),
      activeEditor: createActiveEditor(richTextDocumentJson) as never,
      bumpEditorKey: vi.fn(),
      onVersionSnapshot: vi.fn(),
      onWorkspaceSync: vi.fn(),
      setLiveEditorHtml: vi.fn(),
      updateActiveDoc: vi.fn(),
    }), { wrapper });
    const patchSet: DocumentPatchSet = {
      author: "ai",
      createdAt: Date.now(),
      documentId: "doc-1",
      patchSetId: "patch-set-bulk-reject",
      patches: [
        {
          author: "ai",
          operation: "replace_text_range",
          patchId: "patch-accepted",
          payload: { kind: "replace_text", text: "Accepted intro" },
          status: "accepted",
          suggestedText: "Accepted intro",
          target: { endOffset: 3, nodeId: "paragraph-1", startOffset: 0, targetType: "text_range" },
          title: "Accepted patch",
        },
        {
          author: "ai",
          operation: "replace_text_range",
          patchId: "patch-edited",
          payload: { kind: "replace_text", text: "Edited intro" },
          status: "edited",
          suggestedText: "Edited intro",
          target: { endOffset: 3, nodeId: "paragraph-1", startOffset: 0, targetType: "text_range" },
          title: "Edited patch",
        },
      ],
      status: "in_review",
      title: "Bulk reject",
    };

    act(() => {
      result.current.loadPatchSet(patchSet);
      result.current.handleRejectPatches(["patch-accepted", "patch-edited"]);
    });

    expect(result.current.patchSet?.patches).toEqual(expect.arrayContaining([
      expect.objectContaining({ patchId: "patch-accepted", status: "rejected" }),
      expect.objectContaining({ patchId: "patch-edited", status: "rejected" }),
    ]));
  });

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

  it("auto-applies a patch set by accepting all patches through the patch pipeline", async () => {
    const updateActiveDoc = vi.fn();
    const setLiveEditorHtml = vi.fn();
    const bumpEditorKey = vi.fn();
    const activeEditor = createActiveEditor(richTextDocumentJson);
    const patchSet: DocumentPatchSet = {
      author: "ai",
      createdAt: Date.now(),
      documentId: "doc-1",
      patchSetId: "patch-set-auto-apply",
      patches: [{
        author: "ai",
        operation: "replace_text_range",
        patchId: "patch-auto-1",
        payload: {
          kind: "replace_text",
          text: "New",
        },
        status: "pending",
        suggestedText: "New",
        target: {
          endOffset: 3,
          nodeId: "paragraph-1",
          startOffset: 0,
          targetType: "text_range",
        },
        title: "Auto apply intro",
      }],
      status: "in_review",
      title: "Auto apply review",
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

    await act(async () => {
      await result.current.autoApplyPatchSet(patchSet);
    });

    expect(updateActiveDoc).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining("New intro text."),
    }));
    expect(result.current.patchSet?.status).toBe("completed");
    expect(setLiveEditorHtml).toHaveBeenCalled();
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

  it("applies document_text patch sets to raw latex documents without an active editor", async () => {
    const updateActiveDoc = vi.fn();
    const setLiveEditorHtml = vi.fn();
    const patchSet: DocumentPatchSet = {
      author: "ai",
      createdAt: Date.now(),
      documentId: "doc-1",
      patchSetId: "patch-set-3",
      patches: [{
        author: "ai",
        operation: "replace_text_range",
        patchId: "patch-1",
        payload: {
          kind: "replace_text",
          text: "\\section{Overview}\nFixed body.",
        },
        precondition: {
          expectedText: "\\section{Overview}\nBroken body.",
        },
        status: "accepted",
        target: {
          endOffset: "\\section{Overview}\nBroken body.".length,
          startOffset: 0,
          targetType: "document_text",
        },
        title: "Fix LaTeX source",
      }],
      status: "in_review",
      title: "AI LaTeX compile fix",
    };

    const { result } = renderHook(() => usePatchReview({
      activeDoc: createActiveDoc({
        content: "\\section{Overview}\nBroken body.",
        mode: "latex",
        sourceSnapshots: {
          html: "<h1>Overview</h1><p>Broken body.</p>",
          latex: "\\section{Overview}\nBroken body.",
        },
        tiptapJson: null,
      }),
      activeEditor: null,
      bumpEditorKey: vi.fn(),
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

    expect(updateActiveDoc).toHaveBeenCalledWith(expect.objectContaining({
      content: "\\section{Overview}\nFixed body.",
      tiptapJson: null,
    }));
    expect(setLiveEditorHtml).toHaveBeenCalledWith(expect.stringContaining("Fixed body."));
  });

  it("promotes anchored paragraphs into headings and rehydrates the generated TOC node", async () => {
    const updateActiveDoc = vi.fn();
    const setLiveEditorHtml = vi.fn();
    const activeEditor = createActiveEditor(paragraphOnlyDocumentJson);
    const sourceAst = serializeTiptapToAst(paragraphOnlyDocumentJson, { documentNodeId: "doc-1" });
    const analysis = analyzeTocSuggestion(sourceAst, [
      {
        anchorStrategy: "promote_block",
        anchorText: "Project background",
        level: 1,
        title: "프로젝트 배경",
      },
      {
        anchorStrategy: "promote_block",
        anchorText: "Project goal",
        level: 2,
        title: "프로젝트 목표",
      },
    ], 2);
    const patchSet = buildTocPatchSetWithAst(sourceAst, {
      analysis,
      documentId: "doc-1",
      maxDepth: 2,
      patchSetId: "toc-patch-set",
      rationale: "Promote top-level blocks and insert a TOC.",
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
        content: "Project background\n\nProject goal",
        sourceSnapshots: {
          markdown: "Project background\n\nProject goal",
        },
        tiptapJson: paragraphOnlyDocumentJson,
      }),
      activeEditor: activeEditor as never,
      bumpEditorKey: vi.fn(),
      onVersionSnapshot: vi.fn(),
      onWorkspaceSync: vi.fn(),
      setLiveEditorHtml,
      updateActiveDoc,
    }), { wrapper });

    act(() => {
      result.current.loadPatchSet(acceptedPatchSet);
    });

    await act(async () => {
      await result.current.applyReviewedPatches();
    });

    const appliedPatch = updateActiveDoc.mock.calls[0]?.[0];

    expect(appliedPatch.content).toContain("[[toc:2]]");
    expect(appliedPatch.content).toContain("# 프로젝트 배경");
    expect(appliedPatch.content).toContain("## 프로젝트 목표");
    expect(appliedPatch.sourceSnapshots?.markdown).toContain("[[toc:2]]");
    expect(setLiveEditorHtml).toHaveBeenCalledWith(expect.stringContaining('data-type="toc"'));
    expect(setLiveEditorHtml).toHaveBeenCalledWith(expect.stringContaining("프로젝트 배경"));

    const onTiptapChange = vi.fn();
    render(
      <MarkdownEditor
        documentFeaturesEnabled
        initialContent={appliedPatch.content}
        initialTiptapDoc={emptyTiptapDoc}
        onTiptapChange={onTiptapChange}
      />,
    );

    await waitFor(() => {
      expect(onTiptapChange).toHaveBeenCalled();
    }, { timeout: 20000 });

    const lastTiptapDoc = onTiptapChange.mock.calls.at(-1)?.[0] as JSONContent | undefined;
    expect(screen.queryByText("[[toc:2]]")).not.toBeInTheDocument();
    expect(lastTiptapDoc?.content?.[0]).toEqual(expect.objectContaining({
      attrs: expect.objectContaining({ maxDepth: 2 }),
      type: "tableOfContents",
    }));
    expect(lastTiptapDoc?.content?.filter((node) => node.type === "tableOfContents")).toHaveLength(1);
    expect(lastTiptapDoc?.content?.[1]).toEqual(expect.objectContaining({
      attrs: expect.objectContaining({ level: 1 }),
      type: "heading",
    }));
  }, 30000);

  it("records a preflight apply report when the rich-text editor is unavailable", async () => {
    const patchSet: DocumentPatchSet = {
      author: "ai",
      createdAt: Date.now(),
      documentId: "doc-1",
      patchSetId: "patch-set-preflight",
      patches: [{
        author: "ai",
        operation: "replace_text_range",
        patchId: "patch-preflight",
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
        title: "Preflight patch",
      }],
      status: "in_review",
      title: "Preflight review",
    };
    const { result } = renderHook(() => usePatchReview({
      activeDoc: createActiveDoc(),
      activeEditor: null,
      bumpEditorKey: vi.fn(),
      onVersionSnapshot: vi.fn(),
      onWorkspaceSync: vi.fn(),
      setLiveEditorHtml: vi.fn(),
      updateActiveDoc: vi.fn(),
    }), { wrapper });

    act(() => {
      result.current.loadPatchSet(patchSet);
    });

    await act(async () => {
      await result.current.applyReviewedPatches();
    });

    expect(result.current.lastApplyReport).toEqual(expect.objectContaining({
      appliedPatchIds: [],
      failures: [expect.objectContaining({ message: "hooks.patchReview.editorNotReady" })],
      phase: "rich_text",
      scope: "preflight",
      warnings: [],
    }));
  });

  it("records partial apply failures with applied patch ids", async () => {
    const updateActiveDoc = vi.fn();
    const patchSet: DocumentPatchSet = {
      author: "ai",
      createdAt: Date.now(),
      documentId: "doc-1",
      patchSetId: "patch-set-partial",
      patches: [
        {
          author: "ai",
          operation: "delete_node",
          patchId: "patch-delete",
          status: "accepted",
          target: {
            nodeId: "paragraph-1",
            targetType: "node",
          },
          title: "Delete paragraph",
        },
        {
          author: "ai",
          operation: "replace_text_range",
          patchId: "patch-missing-target",
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
          title: "Replace missing paragraph",
        },
      ],
      status: "in_review",
      title: "Partial apply review",
    };
    const { result } = renderHook(() => usePatchReview({
      activeDoc: createActiveDoc(),
      activeEditor: createActiveEditor(richTextDocumentJson) as never,
      bumpEditorKey: vi.fn(),
      onVersionSnapshot: vi.fn(),
      onWorkspaceSync: vi.fn(),
      setLiveEditorHtml: vi.fn(),
      updateActiveDoc,
    }), { wrapper });

    act(() => {
      result.current.loadPatchSet(patchSet);
    });

    await act(async () => {
      await result.current.applyReviewedPatches();
    });

    expect(updateActiveDoc).toHaveBeenCalled();
    expect(result.current.lastApplyReport).toEqual(expect.objectContaining({
      appliedPatchIds: ["patch-delete"],
      failures: [expect.objectContaining({
        message: expect.stringContaining('Patch "patch-missing-target" could not find target node "paragraph-1".'),
        patchId: "patch-missing-target",
        patchTitle: "Replace missing paragraph",
      })],
      phase: "rich_text",
      scope: "apply",
    }));
  });
});
