import { useEffect } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FileSidebar from "@/components/editor/FileSidebar";
import { I18nContext } from "@/i18n/I18nProvider";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";

vi.mock("@/hooks/use-mobile", () => ({
  TABLET_BREAKPOINT: 1024,
  useIsMobile: () => true,
  useIsTabletLayout: () => true,
  useMediaQuery: () => true,
}));

const SidebarMobileStateProbe = () => {
  const { openMobile } = useSidebar();

  return <div data-testid="mobile-sidebar-state">{openMobile ? "open" : "closed"}</div>;
};

const OpenSidebarOnMount = () => {
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(true);
  }, [setOpenMobile]);

  return null;
};

const renderWithProviders = (ui: React.ReactNode) =>
  render(
    <I18nContext.Provider
      value={{
        locale: "en",
        setLocale: vi.fn(),
        t: (key) => key,
      }}
    >
      <SidebarProvider>
        <OpenSidebarOnMount />
        <SidebarMobileStateProbe />
        {ui}
      </SidebarProvider>
    </I18nContext.Provider>,
  );

describe("FileSidebar mobile behavior", () => {
  it("closes the mobile sidebar when the file explorer title is pressed", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithProviders(
      <FileSidebar
        activeDoc={{
          content: "# Test",
          createdAt: 1,
          id: "doc-1",
          mode: "markdown",
          name: "Test Doc",
          updatedAt: 1,
        }}
        activeDocId="doc-1"
        createDocument={vi.fn()}
        documents={[
          {
            content: "# Test",
            createdAt: 1,
            id: "doc-1",
            mode: "markdown",
            name: "Test Doc",
            updatedAt: 1,
          },
        ]}
        historyEnabled={false}
        historyProps={{
          activeDoc: {
            content: "# Test",
            createdAt: 1,
            id: "doc-1",
            mode: "markdown",
            name: "Test Doc",
            updatedAt: 1,
          },
          onGenerateTocSuggestion: vi.fn(),
          onRestoreVersionSnapshot: vi.fn(),
          versionHistoryReady: false,
          versionHistoryRestoring: false,
          versionHistorySnapshots: [],
          versionHistorySyncing: false,
        }}
        knowledgeEnabled={false}
        knowledgeProps={{
          onDismissSuggestionQueueItem: vi.fn(),
          onGenerateTocSuggestion: vi.fn(),
          onOpenSuggestionQueueItem: vi.fn(),
          onRetrySuggestionQueueItem: vi.fn(),
          onSuggestKnowledgeImpactUpdate: vi.fn(),
          onSuggestKnowledgeUpdates: vi.fn(),
          suggestionQueue: [],
        }}
        onActivateHistory={vi.fn()}
        onActivateKnowledge={vi.fn()}
        onDeleteDoc={vi.fn()}
        onNewDoc={vi.fn()}
        onRenameDoc={vi.fn()}
        onSelectDoc={vi.fn()}
      />,
    );

    expect(screen.getByTestId("mobile-sidebar-state")).toHaveTextContent("open");

    fireEvent.click(screen.getByRole("button", { name: "sidebar.title" }));

    expect(screen.getByTestId("mobile-sidebar-state")).toHaveTextContent("closed");
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  }, 15000);
});
