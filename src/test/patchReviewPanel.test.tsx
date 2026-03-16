import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PatchReviewPanel from "@/components/editor/PatchReviewPanel";
import { I18nContext } from "@/i18n/I18nProvider";
import type { DocumentPatchSet } from "@/types/documentPatch";

const renderWithI18n = (ui: React.ReactNode) =>
  render(
    <I18nContext.Provider
      value={{
        locale: "en",
        setLocale: vi.fn(),
        t: (key) => key,
      }}
    >
      {ui}
    </I18nContext.Provider>,
  );

const renderWithInterpolatedI18n = (ui: React.ReactNode) =>
  render(
    <I18nContext.Provider
      value={{
        locale: "en",
        setLocale: vi.fn(),
        t: (key, vars) => {
          if (key === "patchReview.targetDocumentText") {
            return `Document text ${vars?.start}-${vars?.end}`;
          }

          if (key === "patchReview.target") {
            return `Target: ${vars?.target}`;
          }

          return key;
        },
      }}
    >
      {ui}
    </I18nContext.Provider>,
  );

const patchSetFixture: DocumentPatchSet = {
  patchSetId: "set-1",
  documentId: "doc-1",
  title: "Review updates",
  description: "Patch review session",
  author: "ai",
  status: "in_review",
  createdAt: Date.now(),
  patches: [
    {
      patchId: "patch-1",
      title: "Update intro",
      operation: "replace_text_range",
      target: { targetType: "text_range", nodeId: "blk_1", startOffset: 0, endOffset: 5 },
      originalText: "Old intro",
      suggestedText: "New intro",
      payload: { kind: "replace_text", text: "New intro" },
      author: "ai",
      status: "pending",
      sources: [{ sourceId: "doc-ref", chunkId: "chunk-1", sectionId: "sec-1" }],
    },
    {
      patchId: "patch-2",
      title: "Add conclusion",
      operation: "insert_after",
      target: { targetType: "node", nodeId: "blk_9" },
      originalText: "",
      suggestedText: "Conclusion text",
      payload: {
        kind: "insert_nodes",
        nodes: [
          {
            type: "paragraph",
            kind: "block",
            nodeId: "blk_10",
            children: [{ type: "text", text: "Conclusion text" }],
          },
        ],
      },
      author: "ai",
      status: "pending",
    },
  ],
};

const nonEditablePatchSetFixture: DocumentPatchSet = {
  ...patchSetFixture,
  patchSetId: "set-2",
  patches: [
    {
      patchId: "patch-delete",
      title: "Delete obsolete note",
      operation: "delete_node",
      target: { targetType: "node", nodeId: "blk_11" },
      originalText: "Obsolete note",
      author: "ai",
      status: "pending",
    },
  ],
};

const documentTextPatchSetFixture: DocumentPatchSet = {
  ...patchSetFixture,
  patchSetId: "set-3",
  patches: [
    {
      patchId: "patch-doc-text",
      title: "Fix LaTeX source",
      operation: "replace_text_range",
      target: { targetType: "document_text", startOffset: 0, endOffset: 14 },
      originalText: "\\badcommand{}",
      suggestedText: "\\textbf{ok}",
      payload: { kind: "replace_text", text: "\\textbf{ok}" },
      author: "ai",
      status: "pending",
      sources: [{ sourceId: "tex-diagnostic-1" }],
    },
  ],
};

describe("PatchReviewPanel", () => {
  it("renders patches and switches selection", () => {
    renderWithI18n(<PatchReviewPanel patchSet={patchSetFixture} />);

    expect(screen.getAllByText(/Update intro/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Add conclusion/)).toBeInTheDocument();
    expect(screen.getByText("patchReview.sourceId")).toBeInTheDocument();

    fireEvent.click(screen.getByText("2. Add conclusion"));

    expect(screen.getAllByText("Add conclusion")[0]).toBeInTheDocument();
    expect(screen.getByDisplayValue("Conclusion text")).toBeInTheDocument();
  });

  it("emits accept, reject, and edit actions", () => {
    const onAccept = vi.fn();
    const onAcceptSelected = vi.fn();
    const onReject = vi.fn();
    const onRejectSelected = vi.fn();
    const onEdit = vi.fn();

    renderWithI18n(
      <PatchReviewPanel
        onAccept={onAccept}
        onAcceptSelected={onAcceptSelected}
        onEdit={onEdit}
        onReject={onReject}
        onRejectSelected={onRejectSelected}
        patchSet={patchSetFixture}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("New intro"), { target: { value: "Edited intro" } });
    fireEvent.click(screen.getByRole("button", { name: "patchReview.saveEdit" }));
    fireEvent.click(screen.getByRole("button", { name: "patchReview.accept" }));
    fireEvent.click(screen.getByRole("button", { name: "patchReview.reject" }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ patchId: "patch-1" }), "Edited intro");
    expect(onAccept).toHaveBeenCalledWith(expect.objectContaining({ patchId: "patch-1" }));
    expect(onReject).toHaveBeenCalledWith(expect.objectContaining({ patchId: "patch-1" }));
    expect(onAcceptSelected).not.toHaveBeenCalled();
    expect(onRejectSelected).not.toHaveBeenCalled();
  }, 15000);

  it("supports selecting patches and accepting or rejecting them in bulk", () => {
    const onAcceptSelected = vi.fn();
    const onRejectSelected = vi.fn();

    renderWithI18n(
      <PatchReviewPanel
        onAcceptSelected={onAcceptSelected}
        onRejectSelected={onRejectSelected}
        patchSet={patchSetFixture}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "patchReview.selectPatch Update intro" }));
    fireEvent.click(screen.getByRole("button", { name: "patchReview.acceptSelected" }));

    expect(onAcceptSelected).toHaveBeenCalledWith(["patch-1"]);
    expect(screen.getByRole("button", { name: "patchReview.acceptSelected" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "patchReview.selectAllInPatchSet" }));
    fireEvent.click(screen.getByRole("button", { name: "patchReview.rejectSelected" }));

    expect(onRejectSelected).toHaveBeenCalledWith(["patch-1", "patch-2"]);
    expect(screen.getByRole("button", { name: "patchReview.rejectSelected" })).toBeDisabled();
  });

  it("distinguishes visible-only selection from selecting the full patch set", () => {
    const onAcceptSelected = vi.fn();
    const onRejectSelected = vi.fn();

    renderWithI18n(
      <PatchReviewPanel
        onAcceptSelected={onAcceptSelected}
        onRejectSelected={onRejectSelected}
        patchSet={patchSetFixture}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "patchReview.provenanceGapsOnly" }));
    expect(screen.queryByText("1. Update intro")).not.toBeInTheDocument();
    expect(screen.getByText("1. Add conclusion")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "patchReview.selectVisible" }));
    fireEvent.click(screen.getByRole("button", { name: "patchReview.acceptSelected" }));

    expect(onAcceptSelected).toHaveBeenCalledWith(["patch-2"]);

    fireEvent.click(screen.getByRole("button", { name: "patchReview.selectAllInPatchSet" }));
    fireEvent.click(screen.getByRole("button", { name: "patchReview.rejectSelected" }));

    expect(onRejectSelected).toHaveBeenCalledWith(["patch-1", "patch-2"]);
  }, 30000);

  it("disables text editing for non-rewritable patches", () => {
    renderWithI18n(<PatchReviewPanel patchSet={nonEditablePatchSetFixture} />);

    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "patchReview.saveEdit" })).toBeDisabled();
    expect(screen.getByText("patchReview.nonEditable")).toBeInTheDocument();
  });

  it("renders document_text targets in the detail header", () => {
    renderWithInterpolatedI18n(<PatchReviewPanel patchSet={documentTextPatchSetFixture} />);

    expect(screen.getByText("Target: Document text 0-14")).toBeInTheDocument();
  });

  it("uses internal scroll containers instead of a fixed patch list height", () => {
    renderWithI18n(<PatchReviewPanel patchSet={patchSetFixture} />);

    expect(screen.getByTestId("patch-review-panel")).toHaveClass("min-h-0");
    expect(screen.getByTestId("patch-review-list-scroll")).not.toHaveClass("h-[520px]");
    expect(screen.getByTestId("patch-review-detail-scroll")).toHaveClass("overflow-y-auto");
    expect(screen.getByRole("button", { name: "patchReview.accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "patchReview.saveEdit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "patchReview.reject" })).toBeInTheDocument();
  });
});
