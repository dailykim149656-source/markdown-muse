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
    const onReject = vi.fn();
    const onEdit = vi.fn();

    renderWithI18n(
      <PatchReviewPanel
        onAccept={onAccept}
        onEdit={onEdit}
        onReject={onReject}
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
  }, 15000);

  it("disables text editing for non-rewritable patches", () => {
    renderWithI18n(<PatchReviewPanel patchSet={nonEditablePatchSetFixture} />);

    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "patchReview.saveEdit" })).toBeDisabled();
    expect(screen.getByText("patchReview.nonEditable")).toBeInTheDocument();
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
