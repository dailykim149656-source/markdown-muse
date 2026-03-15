import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DocumentTabs from "@/components/editor/DocumentTabs";
import EditorHeader from "@/components/editor/EditorHeader";
import FileSidebar from "@/components/editor/FileSidebar";
import { I18nContext } from "@/i18n/I18nProvider";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { DocumentData } from "@/types/document";

vi.mock("@/hooks/use-mobile", () => ({
  TABLET_BREAKPOINT: 1024,
  useIsMobile: () => false,
  useIsTabletLayout: () => false,
  useMediaQuery: () => false,
}));

const workspaceBoundDocument = (overrides: Partial<DocumentData> = {}): DocumentData => ({
  content: "# Synced",
  createdAt: 1,
  id: "doc-1",
  mode: "markdown",
  name: "Synced Doc",
  sourceSnapshots: {
    markdown: "# Synced",
  },
  storageKind: "docsy",
  updatedAt: 2,
  workspaceBinding: {
    documentKind: "google_docs",
    fileId: "file-123",
    importedAt: 10,
    mimeType: "application/vnd.google-apps.document",
    provider: "google_drive",
    syncStatus: "synced",
    syncWarnings: ["Markdown tables are not preserved in Google Docs sync."],
  },
  ...overrides,
});

const renderWithProviders = (ui: React.ReactNode) =>
  render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <I18nContext.Provider
        value={{
          locale: "en",
          setLocale: vi.fn(),
          t: (key) => key,
        }}
      >
        <SidebarProvider>
          {ui}
        </SidebarProvider>
      </I18nContext.Provider>
    </MemoryRouter>,
  );

describe("workspace warning surfaces", () => {
  it("shows synced-with-warnings in document tabs", () => {
    renderWithProviders(
      <DocumentTabs
        activeDocId="doc-1"
        documents={[
          workspaceBoundDocument(),
          {
            ...workspaceBoundDocument({
              id: "doc-2",
              name: "Other Doc",
              workspaceBinding: undefined,
            }),
          },
        ]}
        onCloseDoc={vi.fn()}
        onNewDoc={vi.fn()}
        onResetDocuments={vi.fn()}
        onSelectDoc={vi.fn()}
      />,
    );

    expect(screen.getByText("Synced with warnings")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "resetDocuments.action" })).toBeInTheDocument();
  });

  it("shows synced-with-warnings in the editor header workspace badge", () => {
    renderWithProviders(
      <EditorHeader
        autoSaveState={{ error: null, lastSavedAt: null, status: "saved" }}
        availableModes={["markdown", "latex", "html", "json", "yaml"]}
        countWithSpaces
        fileName="Synced Doc"
        importState={{ error: null, fileName: null, progress: null, status: "idle" }}
        isDark={false}
        isFullscreen={false}
        loadFileTitle="Load file"
        mode="markdown"
        onCopyHtml={vi.fn()}
        onCopyJson={vi.fn()}
        onCopyMd={vi.fn()}
        onCopyShareLink={vi.fn()}
        onCopyYaml={vi.fn()}
        onFileNameChange={vi.fn()}
        onLoad={vi.fn()}
        onModeChange={vi.fn()}
        onOpenAiAssistant={vi.fn()}
        onOpenPatchReview={vi.fn()}
        onOpenShare={vi.fn()}
        onOpenShortcuts={vi.fn()}
        onPrint={vi.fn()}
        onUserProfileChange={vi.fn()}
        onSaveAdoc={vi.fn()}
        onSaveDocsy={vi.fn()}
        onSaveHtml={vi.fn()}
        onSaveJson={vi.fn()}
        onSaveMd={vi.fn()}
        onSavePdf={vi.fn()}
        onSaveRst={vi.fn()}
        onSaveTex={vi.fn()}
        onSaveTypst={vi.fn()}
        onSaveYaml={vi.fn()}
        onToggleCountMode={vi.fn()}
        onToggleFullscreen={vi.fn()}
        onTogglePreview={vi.fn()}
        onToggleTheme={vi.fn()}
        patchCount={0}
        previewOpen={false}
        showStructuredModeAction={false}
        textStats={{ charCount: 10, lines: 1, paragraphs: 1, readingTimeMin: 1, wordCount: 2 }}
        userProfile="advanced"
        workspaceBinding={workspaceBoundDocument().workspaceBinding}
      />,
    );

    expect(screen.getAllByText(/Synced with warnings/).length).toBeGreaterThan(0);
  });

  it("shows synced-with-warnings in the file sidebar document list", () => {
    renderWithProviders(
      <FileSidebar
        activeDoc={workspaceBoundDocument()}
        activeDocId="doc-1"
        capabilities={{
          canAccessHistory: true,
          canAccessKnowledge: true,
          canAccessStructuredModes: true,
        }}
        createDocument={vi.fn()}
        documents={[workspaceBoundDocument()]}
        historyEnabled={false}
        historyProps={{
          activeDoc: workspaceBoundDocument(),
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
          onRefreshWorkspaceDocument: vi.fn(),
          onRescanWorkspaceSources: vi.fn(),
          onRetrySuggestionQueueItem: vi.fn(),
          onSuggestKnowledgeImpactUpdate: vi.fn(),
          onSuggestKnowledgeUpdates: vi.fn(),
          suggestionQueue: [],
          workspaceChangedSources: [],
          workspaceLastRescannedAt: null,
          workspaceRescanning: false,
        }}
        onActivateHistory={vi.fn()}
        onActivateKnowledge={vi.fn()}
        onDeleteDoc={vi.fn()}
        onNewDoc={vi.fn()}
        onRenameDoc={vi.fn()}
        onSelectDoc={vi.fn()}
      />,
    );

    expect(screen.getByText(/Google Drive .*Synced with warnings/)).toBeInTheDocument();
  });
});
