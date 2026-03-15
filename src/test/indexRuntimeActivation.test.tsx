import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Index from "@/pages/Index";
import { buildShareableDocsyPayload } from "@/lib/share/docShare";

const {
  mockCreateDocument,
  mockToastDismiss,
  mockToastError,
  mockToastSuccess,
  mockReadUserProfilePreference,
  mockResolveDocumentShare,
  mockWorkspaceRuntimeRefetchAuth,
  mockWorkspaceRuntimeStateFactory,
  mockWriteUserProfilePreference,
} = vi.hoisted(() => ({
  mockCreateDocument: vi.fn(),
  mockToastDismiss: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockReadUserProfilePreference: vi.fn(() => "advanced" as const),
  mockResolveDocumentShare: vi.fn(),
  mockWorkspaceRuntimeRefetchAuth: vi.fn().mockResolvedValue({
    data: {
      connected: true,
      provider: "google_drive",
      user: null,
    },
  }),
  mockWorkspaceRuntimeStateFactory: vi.fn(() => ({
    aiSummaryAvailable: true,
    apiHealth: { configured: true },
    authError: null,
    changesError: null,
    connected: false,
    connectivityDiagnostic: null,
    disconnect: vi.fn(),
    error: null,
    exportDocument: vi.fn(),
    exportError: null,
    files: [],
    filesError: null,
    importFile: vi.fn(),
    isAuthLoading: false,
    isConnecting: false,
    isDisconnecting: false,
    isExporting: false,
    isImporting: false,
    isFilesLoading: false,
    isRefreshingDocument: false,
    isRefreshingFiles: false,
    isRescanning: false,
    isSyncing: false,
    lastRescannedAt: null,
    openGoogleConnect: vi.fn(),
    query: "",
    refetchAuth: mockWorkspaceRuntimeRefetchAuth,
    refetchFiles: vi.fn(),
    refreshDocument: vi.fn(),
    remoteChangedSources: [],
    rescan: vi.fn(),
    session: {
      connected: false,
      provider: null,
      user: null,
    },
    setQuery: vi.fn(),
    syncDocument: vi.fn(),
  })),
  mockWriteUserProfilePreference: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    dismiss: (...args: Parameters<typeof mockToastDismiss>) => mockToastDismiss(...args),
    error: (...args: Parameters<typeof mockToastError>) => mockToastError(...args),
    success: (...args: Parameters<typeof mockToastSuccess>) => mockToastSuccess(...args),
  },
}));

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

vi.mock("@/components/editor/MarkdownEditor", () => ({
  default: () => <div data-testid="markdown-editor" />,
}));

vi.mock("@/components/editor/LatexEditor", () => ({
  default: () => <div data-testid="latex-editor" />,
}));

vi.mock("@/components/editor/HtmlEditor", () => ({
  default: () => <div data-testid="html-editor" />,
}));

vi.mock("@/components/editor/JsonYamlEditor", () => ({
  default: () => <div data-testid="json-yaml-editor" />,
}));

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
    createDocument: mockCreateDocument,
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

vi.mock("@/lib/share/shareClient", async () => {
  const actual = await vi.importActual<typeof import("@/lib/share/shareClient")>("@/lib/share/shareClient");

  return {
    ...actual,
    getShareResolveErrorCode: (error: unknown) => {
      if (error instanceof Error && error.message === "expired") {
        return "expired";
      }

      if (error instanceof Error && error.message === "not_found") {
        return "not_found";
      }

      return "create_failed";
    },
    resolveDocumentShare: (...args: Parameters<typeof mockResolveDocumentShare>) => mockResolveDocumentShare(...args),
  };
});

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
    documentPerformanceProfile: {
      blockCount: 1,
      charCount: 7,
      imageCount: 0,
      kind: "normal" as const,
    },
    flushSecondaryRenderables: async () => ({
      latex: "\\section{Draft}",
      latexDocument: "\\section{Draft}",
      markdown: "# Draft",
    }),
    getFreshRenderableLatexDocument: async () => "\\section{Draft}",
    getFreshRenderableMarkdown: async () => "# Draft",
    handleModeChange: vi.fn(),
    secondaryConversionsPending: false,
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
  readUserProfilePreference: mockReadUserProfilePreference,
  writeAdvancedBlocksPreference: vi.fn(),
  writeDocumentToolsPreference: vi.fn(),
  writeUserProfilePreference: mockWriteUserProfilePreference,
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
    renderEditor: () => ReactNode;
    sidebarProps: {
      onActivateHistory: () => void;
    };
  }) => (
    <div>
      {props.headerProps.onOpenAiAssistant ? (
        <button onClick={() => props.headerProps.onOpenAiAssistant?.()} type="button">
          open-ai-runtime
        </button>
      ) : null}
      <button onClick={() => props.sidebarProps.onActivateHistory()} type="button">
        activate-history-runtime
      </button>
      <button onClick={() => props.headerProps.onTogglePreview?.()} type="button">
        toggle-preview-runtime
      </button>
      {props.headerProps.onOpenPatchReview ? (
        <button onClick={() => props.headerProps.onOpenPatchReview?.()} type="button">
          open-patch-review-runtime
        </button>
      ) : null}
      <button onClick={() => props.headerProps.onOpenShare?.()} type="button">
        open-io-runtime
      </button>
      <button onClick={() => props.headerProps.onOpenWorkspaceConnection?.()} type="button">
        open-workspace-runtime
      </button>
      <div data-testid="workspace-editor-surface">{props.renderEditor()}</div>
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
  default: (props: { onStateChange: (state: unknown) => void }) => {
    const React = require("react") as typeof import("react");
    React.useEffect(() => {
      props.onStateChange(mockWorkspaceRuntimeStateFactory());
      return () => props.onStateChange(null);
    }, [props.onStateChange]);

    return <div data-testid="workspace-runtime" />;
  },
}));

vi.mock("@/components/editor/DocumentIORuntime", () => ({
  default: () => <div data-testid="io-runtime" />,
}));

vi.mock("@/components/editor/ResetDocumentsDialog", () => ({
  default: () => null,
}));

const RoutedIndex = () => {
  const location = useLocation();

  return (
    <>
      <div data-testid="location-path">{location.pathname}</div>
      <Index />
    </>
  );
};

const renderIndex = (initialEntry = "/editor") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<RoutedIndex />} path="/editor" />
        <Route element={<RoutedIndex />} path="/s/:shareId" />
      </Routes>
    </MemoryRouter>,
  );

describe("Index runtime activation", () => {
  beforeEach(() => {
    delete (window as Window & { __docsyE2E?: unknown }).__docsyE2E;
    mockCreateDocument.mockReset();
    mockToastDismiss.mockReset();
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
    mockActiveDoc.content = "# Draft";
    mockActiveDoc.mode = "markdown";
    mockActiveDoc.sourceSnapshots = {
      markdown: "# Draft",
    };
    mockActiveDoc.tiptapJson = null;
    mockActiveDoc.workspaceBinding = undefined;
    mockReadUserProfilePreference.mockReturnValue("advanced");
    mockResolveDocumentShare.mockReset();
    mockWorkspaceRuntimeRefetchAuth.mockReset();
    mockWorkspaceRuntimeRefetchAuth.mockResolvedValue({
      data: {
        connected: true,
        provider: "google_drive",
        user: null,
      },
    });
    mockWorkspaceRuntimeStateFactory.mockReset();
    mockWorkspaceRuntimeStateFactory.mockImplementation(() => ({
      aiSummaryAvailable: true,
      apiHealth: { configured: true },
      authError: null,
      changesError: null,
      connected: false,
      connectivityDiagnostic: null,
      disconnect: vi.fn(),
      error: null,
      exportDocument: vi.fn(),
      exportError: null,
      files: [],
      filesError: null,
      importFile: vi.fn(),
      isAuthLoading: false,
      isConnecting: false,
      isDisconnecting: false,
      isExporting: false,
      isImporting: false,
      isFilesLoading: false,
      isRefreshingDocument: false,
      isRefreshingFiles: false,
      isRescanning: false,
      isSyncing: false,
      lastRescannedAt: null,
      openGoogleConnect: vi.fn(),
      query: "",
      refetchAuth: mockWorkspaceRuntimeRefetchAuth,
      refetchFiles: vi.fn(),
      refreshDocument: vi.fn(),
      remoteChangedSources: [],
      rescan: vi.fn(),
      session: {
        connected: false,
        provider: null,
        user: null,
      },
      setQuery: vi.fn(),
      syncDocument: vi.fn(),
    }));
    mockWriteUserProfilePreference.mockReset();
    window.history.replaceState(null, "", "/editor");
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

  it("defaults to beginner profile when no preference is stored", async () => {
    mockReadUserProfilePreference.mockReturnValue("beginner");

    renderIndex();

    expect(screen.queryByRole("button", { name: "open-ai-runtime" })).toBeNull();

    await act(async () => {
      screen.getByRole("button", { name: "activate-history-runtime" }).click();
    });

    expect(screen.queryByTestId("ai-runtime")).toBeNull();
    expect(screen.queryByTestId("document-support-runtime")).toBeNull();
  });

  it("shows a beginner guard for structured documents and recovers after switching to advanced", async () => {
    mockReadUserProfilePreference.mockReturnValue("beginner");
    mockActiveDoc.mode = "json";
    mockActiveDoc.content = '{\n  "draft": true\n}';
    mockActiveDoc.sourceSnapshots = undefined;

    renderIndex();

    expect(screen.getByTestId("editor-profile-guard")).toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: "editorGuard.action" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("json-yaml-editor")).toBeInTheDocument();
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

  it("loads a server-backed shared document from /s/:shareId and normalizes the URL", async () => {
    mockResolveDocumentShare.mockResolvedValueOnce({
      expiresAt: Date.now() + 60_000,
      payload: buildShareableDocsyPayload({
        ...mockActiveDoc,
        content: "# Shared copy",
        id: "shared-source",
        name: "Shared source",
        sourceSnapshots: {
          markdown: "# Shared copy",
        },
      }),
      shareId: "abc123share",
    });

    renderIndex("/s/abc123share");

    await waitFor(() => {
      expect(mockResolveDocumentShare).toHaveBeenCalledWith("abc123share");
    });

    await waitFor(() => {
      expect(mockCreateDocument).toHaveBeenCalledWith(expect.objectContaining({
        content: "# Shared copy",
        name: "Shared source (Shared)",
      }));
    });

    expect(screen.getByTestId("location-path")).toHaveTextContent("/editor");
  });

  it("shows workspace success only after auth refetch confirms a connected session", async () => {
    renderIndex("/editor?workspaceAuth=connected");

    await waitFor(() => {
      expect(mockWorkspaceRuntimeRefetchAuth).toHaveBeenCalledTimes(1);
    });

    expect(mockToastSuccess).toHaveBeenCalledWith("hooks.workspace.connected");
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("does not show workspace success when auth refetch reports a disconnected session", async () => {
    mockWorkspaceRuntimeRefetchAuth.mockResolvedValueOnce({
      data: {
        connected: false,
        provider: null,
        user: null,
      },
    });

    renderIndex("/editor?workspaceAuth=connected");

    await waitFor(() => {
      expect(mockWorkspaceRuntimeRefetchAuth).toHaveBeenCalledTimes(1);
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith("hooks.workspace.authErrors.oauth_callback_failed");
    expect(screen.getByText("Google Workspace")).toBeInTheDocument();
  });

  it("does not show workspace success when auth refetch throws", async () => {
    mockWorkspaceRuntimeRefetchAuth.mockRejectedValueOnce(new Error("session lookup failed"));

    renderIndex("/editor?workspaceAuth=connected");

    await waitFor(() => {
      expect(mockWorkspaceRuntimeRefetchAuth).toHaveBeenCalledTimes(1);
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith("hooks.workspace.authErrors.oauth_callback_failed");
    expect(screen.getByText("Google Workspace")).toBeInTheDocument();
  });
});
