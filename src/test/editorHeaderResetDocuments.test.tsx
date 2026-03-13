import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
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
    disabled,
    onClick,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button disabled={disabled} onClick={onClick} role="menuitem" type="button">
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />,
}));

import EditorHeader from "@/components/editor/EditorHeader";

const renderHeader = (overrides: Record<string, unknown> = {}) => {
  const onRequestResetDocuments = vi.fn();

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
          <EditorHeader
            autoSaveState={{ error: null, lastSavedAt: null, status: "saved" }}
            availableModes={["markdown", "latex", "html", "json", "yaml"]}
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
            onFileNameChange={vi.fn()}
            onLoad={vi.fn()}
            onModeChange={vi.fn()}
            onOpenAiAssistant={vi.fn()}
            onOpenPatchReview={vi.fn()}
            onOpenShare={vi.fn()}
            onOpenShortcuts={vi.fn()}
            onPrint={vi.fn()}
            onRequestResetDocuments={onRequestResetDocuments}
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
            {...overrides}
          />
        </SidebarProvider>
      </I18nContext.Provider>
    </MemoryRouter>,
  );

  return { onRequestResetDocuments };
};

describe("EditorHeader reset documents action", () => {
  it("shows the start-fresh action in the overflow menu and triggers it", () => {
    const { onRequestResetDocuments } = renderHeader();

    fireEvent.click(screen.getByRole("menuitem", { name: "resetDocuments.action" }));

    expect(onRequestResetDocuments).toHaveBeenCalledTimes(1);
  });
});
