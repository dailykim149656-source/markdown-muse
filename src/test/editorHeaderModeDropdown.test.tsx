import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import EditorHeader from "@/components/editor/EditorHeader";
import { I18nContext } from "@/i18n/I18nProvider";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { ReactNode } from "react";

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
    <button onClick={onClick} role="menuitem" type="button">
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />,
}));

const renderHeader = (overrides: Record<string, unknown> = {}) => {
  render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <I18nContext.Provider
        value={{
          locale: "en",
          setLocale: vi.fn(),
          t: (key, params) => {
            if (!params) {
              return key;
            }

            return `${key}:${JSON.stringify(params)}`;
          },
        }}
      >
        <SidebarProvider>
          <EditorHeader
            autoSaveState={{ error: null, lastSavedAt: null, status: "saved" }}
            availableModes={["markdown", "latex", "html"]}
            crossFamilyModes={["json", "yaml"]}
            countWithSpaces
            fileName="Test Doc"
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
            onCreateDocument={vi.fn()}
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
            {...overrides}
          />
        </SidebarProvider>
      </I18nContext.Provider>
    </MemoryRouter>,
  );
};

describe("EditorHeader mode dropdown", () => {
  it("renders a single dropdown trigger for mode selection", () => {
    renderHeader();

    expect(screen.getByRole("button", { name: "Markdown" })).toBeInTheDocument();
    expect(screen.queryByText("JSON")).not.toBeInTheDocument();
    expect(screen.queryByText("YAML")).not.toBeInTheDocument();
  });

  it("shows user profile actions in the overflow menu", () => {
    renderHeader();

    expect(screen.getByText("header.userProfile.title")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "header.userProfile.beginner" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "header.userProfile.advanced" })).toBeInTheDocument();
  });

  it("hides AI and patch review buttons in beginner mode", () => {
    renderHeader({
      userProfile: "beginner",
    });

    expect(screen.queryByTitle("header.aiAssistant")).toBeNull();
    expect(screen.queryByText("header.patchReview")).toBeNull();
  });
});
