import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FileSidebar from "@/components/editor/FileSidebar";
import { I18nContext } from "@/i18n/I18nProvider";
import { SidebarProvider } from "@/components/ui/sidebar";

vi.mock("@/hooks/use-mobile", () => ({
  TABLET_BREAKPOINT: 1024,
  useIsMobile: () => false,
  useIsTabletLayout: () => false,
  useMediaQuery: () => false,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { asChild?: boolean; children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <div />,
}));

const renderSidebar = () =>
  render(
    <I18nContext.Provider
      value={{
        locale: "en",
        setLocale: vi.fn(),
        t: (key) => key,
      }}
    >
      <SidebarProvider>
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
          capabilities={{
            canAccessHistory: false,
            canAccessKnowledge: false,
            canAccessStructuredModes: false,
          }}
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
        />
      </SidebarProvider>
    </I18nContext.Provider>,
  );

describe("FileSidebar beginner profile", () => {
  it("shows only document navigation and rich-text creation actions", () => {
    renderSidebar();

    expect(screen.getByText("sidebar.documents")).toBeInTheDocument();
    expect(screen.queryByText("sidebar.knowledge")).toBeNull();
    expect(screen.queryByText("sidebar.history")).toBeNull();
    expect(screen.getByText("sidebar.newMarkdown")).toBeInTheDocument();
    expect(screen.getByText("sidebar.newLatex")).toBeInTheDocument();
    expect(screen.getByText("sidebar.newHtml")).toBeInTheDocument();
    expect(screen.queryByText("sidebar.newJson")).toBeNull();
    expect(screen.queryByText("sidebar.newYaml")).toBeNull();
  });
});
