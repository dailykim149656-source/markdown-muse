import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DocumentTabs from "@/components/editor/DocumentTabs";
import { I18nContext } from "@/i18n/I18nProvider";
import type { DocumentData } from "@/types/document";

const buildDocument = (overrides: Partial<DocumentData> = {}): DocumentData => ({
  content: "# Test",
  createdAt: 1,
  id: "doc-1",
  mode: "markdown",
  name: "Test Doc",
  sourceSnapshots: {
    markdown: "# Test",
  },
  storageKind: "docsy",
  updatedAt: 1,
  ...overrides,
});

const renderWithI18n = (ui: ReactNode) =>
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

describe("DocumentTabs", () => {
  it("renders the tabs bar and reset action even with a single document", () => {
    renderWithI18n(
      <DocumentTabs
        activeDocId="doc-1"
        documents={[buildDocument()]}
        onCloseDoc={vi.fn()}
        onNewDoc={vi.fn()}
        onResetDocuments={vi.fn()}
        onSelectDoc={vi.fn()}
      />,
    );

    expect(screen.getByText("Test Doc")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "resetDocuments.action" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tabs.newDocument" })).toBeInTheDocument();
  });

  it("fires only the reset handler when the reset action is clicked", () => {
    const onResetDocuments = vi.fn();
    const onSelectDoc = vi.fn();

    renderWithI18n(
      <DocumentTabs
        activeDocId="doc-1"
        documents={[buildDocument()]}
        onCloseDoc={vi.fn()}
        onNewDoc={vi.fn()}
        onResetDocuments={onResetDocuments}
        onSelectDoc={onSelectDoc}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "resetDocuments.action" }));

    expect(onResetDocuments).toHaveBeenCalledTimes(1);
    expect(onSelectDoc).not.toHaveBeenCalled();
  });

  it("disables the reset action when reset is unavailable", () => {
    renderWithI18n(
      <DocumentTabs
        activeDocId="doc-1"
        documents={[buildDocument()]}
        onCloseDoc={vi.fn()}
        onNewDoc={vi.fn()}
        onResetDocuments={vi.fn()}
        onSelectDoc={vi.fn()}
        resetDocumentsDisabled
      />,
    );

    expect(screen.getByRole("button", { name: "resetDocuments.action" })).toBeDisabled();
  });

  it("preserves multi-document select, new, and close actions", () => {
    const onCloseDoc = vi.fn();
    const onNewDoc = vi.fn();
    const onSelectDoc = vi.fn();

    renderWithI18n(
      <DocumentTabs
        activeDocId="doc-1"
        documents={[
          buildDocument({ id: "doc-1", name: "Alpha" }),
          buildDocument({ id: "doc-2", name: "Beta" }),
        ]}
        onCloseDoc={onCloseDoc}
        onNewDoc={onNewDoc}
        onResetDocuments={vi.fn()}
        onSelectDoc={onSelectDoc}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Beta/ }));
    fireEvent.click(screen.getByRole("button", { name: "tabs.newDocument" }));

    const alphaTab = screen.getByRole("button", { name: /Alpha/ });
    const alphaCloseControl = alphaTab.querySelector("span[class*='ml-0.5']");

    expect(alphaCloseControl).not.toBeNull();
    fireEvent.click(alphaCloseControl!);

    expect(onSelectDoc).toHaveBeenCalledWith("doc-2");
    expect(onSelectDoc).toHaveBeenCalledTimes(1);
    expect(onNewDoc).toHaveBeenCalledTimes(1);
    expect(onCloseDoc).toHaveBeenCalledWith("doc-1");
    expect(onCloseDoc).toHaveBeenCalledTimes(1);
  });
});
