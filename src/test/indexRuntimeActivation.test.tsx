import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Index from "@/pages/Index";

const mockActiveDoc = {
  ast: null,
  content: "# Draft",
  createdAt: 100,
  id: "doc-1",
  metadata: {},
  mode: "markdown" as const,
  name: "Draft",
  sourceSnapshots: {
    markdown: "# Draft",
  },
  storageKind: "docsy" as const,
  tiptapJson: null,
  updatedAt: 100,
  workspaceBinding: undefined,
};

vi.mock("@/i18n/useI18n", () => ({
  useI18n: () => ({
    locale: "en",
    setLocale: vi.fn(),
    t: (key: string) => key,
  }),
}));

vi.mock("@/hooks/useDocumentManager", () => ({
  useDocumentManager: () => ({
    activeDoc: mockActiveDoc,
    activeDocId: mockActiveDoc.id,
    autoSaveState: { error: null, lastSavedAt: null, status: "saved" },
    bumpEditorKey: vi.fn(),
    closeDocument: vi.fn(),
    createDocument: vi.fn(),
    deleteDocument: vi.fn(),
    documents: [mockActiveDoc],
    editorKey: 0,
    handleContentChange: vi.fn(),
    hasRestoredDocuments: false,
    renameDocument: vi.fn(),
    resetDocuments: vi.fn(),
    selectDocument: vi.fn(),
    updateActiveDoc: vi.fn(),
    updateDocument: vi.fn(),
  }),
}));

vi.mock("@/hooks/useEditorUiState", async () => {
  const React = await import("react");

  return {
    useEditorUiState: () => {
      const [previewOpen, setPreviewOpen] = React.useState(false);
      const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
      const [templateOpen, setTemplateOpen] = React.useState(false);

      return {
        closeFindReplace: vi.fn(),
        closePreview: () => setPreviewOpen(false),
        countWithSpaces: true,
        findReplaceOpen: false,
        isDark: false,
        isFullscreen: false,
        openShortcuts: () => setShortcutsOpen(true),
        openTemplateDialog: () => setTemplateOpen(true),
        previewOpen,
        setShortcutsOpen,
        setTemplateOpen,
        shortcutsOpen,
        templateOpen,
        toggleCountMode: vi.fn(),
        toggleFullscreen: vi.fn(),
        togglePreview: () => setPreviewOpen((value: boolean) => !value),
        toggleTheme: vi.fn(),
      };
    },
  };
});

vi.mock("@/hooks/useFormatConversion", () => ({
  useFormatConversion: () => ({
    currentRenderableHtml: "<p>Draft</p>",
    currentRenderableLatex: "\\section{Draft}",
    currentRenderableLatexDocument: "\\section{Draft}",
    currentRenderableMarkdown: "# Draft",
    handleModeChange: vi.fn(),
    setLiveEditorHtml: vi.fn(),
    textStats: {
      charCount: 5,
      lines: 1,
      paragraphs: 1,
      readingTimeMin: 1,
      wordCount: 1,
    },
  }),
}));

vi.mock("@/hooks/useDocumentIO", () => ({
  MAX_IMPORT_FILE_SIZE_BYTES: 5 * 1024 * 1024,
  resolveImportedDocumentOptions: vi.fn(),
  useDocumentIO: () => ({
    fileInputRef: { current: null },
    handleCopyHtml: vi.fn(),
    handleCopyJson: vi.fn(),
    handleCopyMd: vi.fn(),
    handleCopyShareLink: vi.fn(),
    handleCopyYaml: vi.fn(),
    handleFileChange: vi.fn(),
    handleLoad: vi.fn(),
    handlePrint: vi.fn(),
    handleSaveAdoc: vi.fn(),
    handleSaveDocsy: vi.fn(),
    handleSaveHtml: vi.fn(),
    handleSaveJson: vi.fn(),
    handleSaveMd: vi.fn(),
    handleSavePdf: vi.fn(),
    handleSaveRst: vi.fn(),
    handleSaveTex: vi.fn(),
    handleSaveTypst: vi.fn(),
    handleSaveYaml: vi.fn(),
    importState: { error: null, fileName: null, progress: null, status: "idle" },
    prepareShareLink: async () => undefined,
    shareLinkInfo: { available: false, link: null },
  }),
}));

vi.mock("@/hooks/useWorkspaceAuth", () => ({
  useWorkspaceAuth: () => ({
    aiSummaryAvailable: true,
    apiHealth: { configured: true },
    connected: false,
    connectivityDiagnostic: null,
    disconnect: vi.fn(),
    error: null,
    isConnecting: false,
    isDisconnecting: false,
    isLoading: false,
    openGoogleConnect: vi.fn(),
    refetch: vi.fn(),
    session: null,
  }),
}));

vi.mock("@/hooks/useWorkspaceFiles", () => ({
  useWorkspaceFiles: () => ({
    error: null,
    files: [],
    importFile: vi.fn(),
    isImporting: false,
    isLoading: false,
    isRefreshing: false,
    query: "",
    refetch: vi.fn(),
    setQuery: vi.fn(),
  }),
}));

vi.mock("@/hooks/useWorkspaceChanges", () => ({
  useWorkspaceChanges: () => ({
    error: null,
    isRefreshingDocument: false,
    isRescanning: false,
    lastRescannedAt: null,
    refreshDocument: vi.fn(),
    remoteChangedSources: [],
    rescan: vi.fn(),
  }),
}));

vi.mock("@/hooks/useWorkspaceSync", () => ({
  useWorkspaceSync: () => ({
    isSyncing: false,
    syncDocument: vi.fn(),
  }),
}));

vi.mock("@/hooks/useWorkspaceExport", () => ({
  useWorkspaceExport: () => ({
    error: null,
    exportDocument: vi.fn(),
    isExporting: false,
  }),
}));

vi.mock("@/lib/editor/webEditorPreferences", () => ({
  readAdvancedBlocksPreference: () => false,
  readDocumentToolsPreference: () => false,
  writeAdvancedBlocksPreference: vi.fn(),
  writeDocumentToolsPreference: vi.fn(),
}));

vi.mock("@/lib/history/versionHistoryActions", () => ({
  captureAutoSaveVersionSnapshot: vi.fn(),
  createVersionHistorySnapshot: vi.fn(),
  removeDocumentVersionHistory: vi.fn(),
}));

vi.mock("@/lib/documents/resetLocalDocumentState", () => ({
  resetLocalDocumentState: async () => undefined,
}));

vi.mock("@/lib/documents/restoredSessionToast", () => ({
  RESTORED_SESSION_TOAST_ID: "restored-session",
  showRestoredSessionToast: vi.fn(),
}));

vi.mock("@/components/editor/EditorWorkspace", () => ({
  default: (props: {
    headerProps: {
      onOpenAiAssistant?: () => void;
      onOpenPatchReview?: () => void;
      onTogglePreview?: () => void;
      onOpenShare?: () => void;
      onOpenWorkspaceConnection?: () => void;
    };
    sidebarProps: {
      onActivateHistory: () => void;
    };
  }) => (
    <div>
      <button onClick={() => props.headerProps.onOpenAiAssistant?.()} type="button">
        open-ai-runtime
      </button>
      <button onClick={() => props.sidebarProps.onActivateHistory()} type="button">
        activate-history-runtime
      </button>
      <button onClick={() => props.headerProps.onTogglePreview?.()} type="button">
        toggle-preview-runtime
      </button>
      <button onClick={() => props.headerProps.onOpenPatchReview?.()} type="button">
        open-patch-review-runtime
      </button>
      <button onClick={() => props.headerProps.onOpenShare?.()} type="button">
        open-io-runtime
      </button>
      <button onClick={() => props.headerProps.onOpenWorkspaceConnection?.()} type="button">
        open-workspace-runtime
      </button>
    </div>
  ),
}));

vi.mock("@/components/editor/AiAssistantRuntime", () => ({
  default: () => <div data-testid="ai-runtime" />,
}));

vi.mock("@/components/editor/DocumentSupportRuntime", () => ({
  default: () => <div data-testid="document-support-runtime" />,
}));

vi.mock("@/components/editor/PreviewRuntime", () => ({
  default: () => <div data-testid="preview-runtime" />,
}));

vi.mock("@/components/editor/WorkspaceRuntime", () => ({
  default: () => <div data-testid="workspace-runtime" />,
}));

vi.mock("@/components/editor/DocumentIORuntime", () => ({
  default: () => <div data-testid="io-runtime" />,
}));

vi.mock("@/components/editor/ResetDocumentsDialog", () => ({
  default: () => null,
}));

const renderIndex = (initialEntry = "/editor") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<Index />} path="/editor" />
      </Routes>
    </MemoryRouter>,
  );

describe("Index runtime activation", () => {
  beforeEach(() => {
    delete (window as Window & { __docsyE2E?: unknown }).__docsyE2E;
    mockActiveDoc.workspaceBinding = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not mount optional runtimes on the initial editor render", () => {
    renderIndex();

    expect(screen.queryByTestId("ai-runtime")).toBeNull();
    expect(screen.queryByTestId("document-support-runtime")).toBeNull();
    expect(screen.queryByTestId("preview-runtime")).toBeNull();
    expect(screen.queryByTestId("workspace-runtime")).toBeNull();
    expect(screen.queryByTestId("io-runtime")).toBeNull();
  });

  it("mounts the AI runtime only after the AI action is requested", async () => {
    renderIndex();

    await act(async () => {
      screen.getByRole("button", { name: "open-ai-runtime" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("ai-runtime")).toBeInTheDocument();
    });
  });

  it("mounts the document support runtime when history is activated", async () => {
    renderIndex();

    await act(async () => {
      screen.getByRole("button", { name: "activate-history-runtime" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("document-support-runtime")).toBeInTheDocument();
    });
  });

  it("mounts the preview runtime only after preview is opened", async () => {
    renderIndex();

    await act(async () => {
      screen.getByRole("button", { name: "toggle-preview-runtime" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("preview-runtime")).toBeInTheDocument();
    });
  });

  it("mounts the workspace runtime only after a workspace action is requested", async () => {
    renderIndex();

    await act(async () => {
      screen.getByRole("button", { name: "open-workspace-runtime" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("workspace-runtime")).toBeInTheDocument();
    });
  });

  it("mounts the document IO runtime only after an IO action is requested", async () => {
    renderIndex();

    await act(async () => {
      screen.getByRole("button", { name: "open-io-runtime" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("io-runtime")).toBeInTheDocument();
    });
  });

  it("mounts the workspace runtime during idle when a bound document exists", async () => {
    vi.useFakeTimers();
    mockActiveDoc.workspaceBinding = {
      documentKind: "google_docs",
      fileId: "file-1",
      importedAt: Date.now(),
      mimeType: "application/vnd.google-apps.document",
      provider: "google_drive",
      syncStatus: "synced",
    };

    renderIndex();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
      await Promise.resolve();
    });

    expect(screen.getByTestId("workspace-runtime")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("mounts the document support runtime for a patch review load request", async () => {
    renderIndex("/editor?e2e=1");

    await waitFor(() => {
      expect((window as Window & {
        __docsyE2E?: { openPatchReview: (patchSet: unknown) => boolean };
      }).__docsyE2E).toBeTruthy();
    });

    await act(async () => {
      (window as Window & {
        __docsyE2E?: { openPatchReview: (patchSet: unknown) => boolean };
      }).__docsyE2E?.openPatchReview({
        createdAt: Date.now(),
        documentId: mockActiveDoc.id,
        patchSetId: "patch-set-1",
        patches: [],
        status: "draft",
        title: "Patch Set",
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("document-support-runtime")).toBeInTheDocument();
    });
  });
});
