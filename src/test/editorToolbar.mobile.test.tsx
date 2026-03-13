import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditorToolbar from "@/components/editor/EditorToolbar";
import MobileEditorFormatSheet from "@/components/editor/MobileEditorFormatSheet";
import {
  rememberEditorSelection,
  runEditorCommand,
} from "@/components/editor/editorSelectionMemory";
import { I18nContext } from "@/i18n/I18nProvider";

const createMockEditor = () => {
  const calls: Array<{ args: unknown[]; name: string }> = [];
  const run = vi.fn(() => true);
  const selectionBookmark = {
    resolve: () => ({
      from: 2,
      getBookmark: () => selectionBookmark,
      to: 7,
    }),
  };
  const chain = new Proxy(
    {},
    {
      get: (_, property) => {
        if (property === "run") {
          return run;
        }

        return (...args: unknown[]) => {
          calls.push({ args, name: String(property) });
          return chain;
        };
      },
    },
  );
  const tr = {
    setSelection: vi.fn().mockReturnThis(),
  };
  const editor = {
    calls,
    chain: () => chain,
    commands: {
      focus: vi.fn(() => true),
      insertAdmonition: vi.fn(() => true),
      insertCrossReference: vi.fn(() => true),
      insertFigureCaption: vi.fn(() => true),
      insertFootnote: vi.fn(() => true),
      insertMermaid: vi.fn(() => true),
      insertTableOfContents: vi.fn(() => true),
    },
    getAttributes: (name: string) => {
      if (name === "link") {
        return { href: "" };
      }

      if (name === "textStyle") {
        return { color: "#112233", fontFamily: "", fontSize: "" };
      }

      return {};
    },
    isActive: (_name?: string | Record<string, unknown>) => false,
    state: {
      doc: {
        content: {
          size: 20,
        },
        descendants: vi.fn(),
      },
      selection: {
        from: 2,
        getBookmark: () => selectionBookmark,
        to: 7,
      },
      tr,
    },
    view: {
      dispatch: vi.fn(),
    },
  };

  return { editor, run, tr };
};

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

describe("EditorToolbar mobile behavior", () => {
  it("keeps the More button outside the mobile scroll rail and limits the quick rail actions", () => {
    const { editor } = createMockEditor();

    renderWithI18n(<EditorToolbar editor={editor as never} />);

    const mobileScroll = screen.getByTestId("toolbar-mobile-scroll");
    const mobileMore = screen.getByTestId("toolbar-mobile-more");

    expect(within(mobileMore).getByRole("button", { name: "toolbar.actions.more" })).toBeInTheDocument();
    expect(within(mobileScroll).getByRole("button", { name: "toolbar.actions.bold" })).toBeInTheDocument();
    expect(within(mobileScroll).queryByRole("button", { name: "toolbar.link.title" })).not.toBeInTheDocument();
    expect(within(mobileScroll).queryByRole("button", { name: "toolbar.actions.blockquote" })).not.toBeInTheDocument();
    expect(within(mobileScroll).queryByRole("button", { name: "toolbar.actions.more" })).not.toBeInTheDocument();
  }, 15000);

  it("restores the saved selection before running a mobile quick action", () => {
    const { editor, run, tr } = createMockEditor();
    rememberEditorSelection(editor as never);

    renderWithI18n(<EditorToolbar editor={editor as never} />);

    fireEvent.click(
      within(screen.getByTestId("toolbar-mobile-scroll")).getByRole("button", {
        name: "toolbar.actions.bold",
      }),
    );

    expect(tr.setSelection).toHaveBeenCalledTimes(1);
    expect(editor.view.dispatch).toHaveBeenCalledTimes(1);
    expect(editor.calls.some((call) => call.name === "toggleBold")).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe("EditorToolbar desktop behavior", () => {
  it("keeps only five quick actions inline and exposes eleven labeled panel triggers", () => {
    const { editor } = createMockEditor();

    renderWithI18n(<EditorToolbar editor={editor as never} />);

    const quickActions = within(screen.getByTestId("toolbar-desktop-quick-actions"));
    const panels = within(screen.getByTestId("toolbar-desktop-panels"));

    expect(quickActions.getByRole("button", { name: "toolbar.actions.undo" })).toBeInTheDocument();
    expect(quickActions.getByRole("button", { name: "toolbar.actions.redo" })).toBeInTheDocument();
    expect(quickActions.getByRole("button", { name: "toolbar.actions.bold" })).toBeInTheDocument();
    expect(quickActions.getByRole("button", { name: "toolbar.actions.italic" })).toBeInTheDocument();
    expect(quickActions.getByRole("button", { name: "toolbar.actions.underline" })).toBeInTheDocument();
    expect(quickActions.queryByRole("button", { name: "toolbar.actions.heading1" })).not.toBeInTheDocument();
    expect(quickActions.queryByRole("button", { name: "toolbar.link.title" })).not.toBeInTheDocument();

    expect(panels.getByRole("button", { name: "toolbar.desktopTriggers.moreFormatting" })).toBeInTheDocument();
    expect(panels.getByRole("button", { name: "toolbar.desktopTriggers.structure" })).toBeInTheDocument();
    expect(panels.getByRole("button", { name: "toolbar.desktopTriggers.alignment" })).toBeInTheDocument();
    expect(panels.getByRole("button", { name: "toolbar.desktopTriggers.link" })).toBeInTheDocument();
    expect(panels.getByRole("button", { name: "toolbar.desktopTriggers.color" })).toBeInTheDocument();
    expect(panels.getByRole("button", { name: "toolbar.desktopTriggers.documentTools" })).toBeInTheDocument();
    expect(panels.getByRole("button", { name: "toolbar.desktopTriggers.fontFamily" })).toBeInTheDocument();
    expect(panels.getByRole("button", { name: "toolbar.desktopTriggers.fontSize" })).toBeInTheDocument();
    expect(panels.getByRole("button", { name: "toolbar.desktopTriggers.caption" })).toBeInTheDocument();
    expect(panels.getByRole("button", { name: "toolbar.desktopTriggers.mathInsert" })).toBeInTheDocument();
    expect(panels.getByRole("button", { name: "toolbar.desktopTriggers.mermaidInsert" })).toBeInTheDocument();
  });

  it("restores selection before running structure and link panel actions", async () => {
    const { editor, run, tr } = createMockEditor();
    rememberEditorSelection(editor as never);

    renderWithI18n(<EditorToolbar editor={editor as never} />);

    fireEvent.click(screen.getByRole("button", { name: "toolbar.desktopTriggers.structure" }));
    fireEvent.click(
      within(await screen.findByTestId("toolbar-desktop-panel-content-structure")).getByRole("button", {
        name: "toolbar.actions.heading1",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "toolbar.desktopTriggers.link" }));
    const linksPanel = within(await screen.findByTestId("toolbar-desktop-panel-content-link"));
    fireEvent.change(linksPanel.getByPlaceholderText("https://..."), {
      target: { value: "https://example.com/desktop" },
    });
    fireEvent.click(linksPanel.getByRole("button", { name: "toolbar.link.apply" }));

    expect(tr.setSelection).toHaveBeenCalledTimes(2);
    expect(editor.view.dispatch).toHaveBeenCalledTimes(2);
    expect(editor.calls.some((call) => call.name === "toggleHeading")).toBe(true);
    expect(
      editor.calls.some(
        (call) =>
          call.name === "setLink" &&
          call.args[0] &&
          (call.args[0] as { href: string }).href === "https://example.com/desktop",
      ),
    ).toBe(true);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("shows enable actions inside separated document and advanced triggers", async () => {
    const { editor } = createMockEditor();
    const onEnableDocumentFeatures = vi.fn();
    const onEnableAdvancedBlocks = vi.fn();

    renderWithI18n(
      <EditorToolbar
        advancedBlocksEnabled={false}
        canEnableAdvancedBlocks
        canEnableDocumentFeatures
        documentFeaturesEnabled={false}
        editor={editor as never}
        onEnableAdvancedBlocks={onEnableAdvancedBlocks}
        onEnableDocumentFeatures={onEnableDocumentFeatures}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "toolbar.desktopTriggers.fontFamily" }));
    fireEvent.click(
      within(await screen.findByTestId("toolbar-desktop-panel-content-fontFamily")).getByRole("button", {
        name: "toolbar.actions.enableDocumentTools",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "toolbar.desktopTriggers.caption" }));
    fireEvent.click(
      within(await screen.findByTestId("toolbar-desktop-panel-content-caption")).getByRole("button", {
        name: "toolbar.actions.enableDocumentTools",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "toolbar.desktopTriggers.mathInsert" }));
    fireEvent.click(
      within(await screen.findByTestId("toolbar-desktop-panel-content-mathInsert")).getByRole("button", {
        name: "toolbar.actions.enableAdvancedBlocks",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "toolbar.desktopTriggers.mermaidInsert" }));
    fireEvent.click(
      within(await screen.findByTestId("toolbar-desktop-panel-content-mermaidInsert")).getByRole("button", {
        name: "toolbar.actions.enableAdvancedBlocks",
      }),
    );

    expect(onEnableDocumentFeatures).toHaveBeenCalledTimes(2);
    expect(onEnableAdvancedBlocks).toHaveBeenCalledTimes(2);
  });
});

describe("MobileEditorFormatSheet", () => {
  it("restores selection for link, font size, and color actions", () => {
    const { editor, run } = createMockEditor();
    const runCommand = (command: Parameters<typeof runEditorCommand>[1]) =>
      runEditorCommand(editor as never, command, {
        selection: rememberEditorSelection(editor as never),
      });

    renderWithI18n(
      <MobileEditorFormatSheet
        documentFeaturesEnabled
        editor={editor as never}
        runCommand={runCommand}
      />,
    );

    expect(screen.getByTestId("toolbar-mobile-sheet-scroll")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "toolbar.mobileFormat.groups.links" }));
    fireEvent.click(screen.getByRole("button", { name: "toolbar.mobileFormat.groups.document" }));

    const linkSection = screen.getByText("toolbar.mobileFormat.sections.link").closest("section");
    const fontSizeSection = screen.getByText("toolbar.mobileFormat.sections.fontSize").closest("section");
    const colorSection = screen.getByText("toolbar.mobileFormat.sections.color").closest("section");

    if (!linkSection || !fontSizeSection || !colorSection) {
      throw new Error("Expected mobile format sections to render.");
    }

    fireEvent.change(within(linkSection).getByPlaceholderText("https://..."), {
      target: { value: "https://example.com/mobile" },
    });
    fireEvent.click(within(linkSection).getByRole("button", { name: "toolbar.link.apply" }));
    fireEvent.click(within(fontSizeSection).getByRole("button", { name: "18px" }));
    fireEvent.change(within(colorSection).getByPlaceholderText("#000000"), {
      target: { value: "#ff0000" },
    });
    fireEvent.click(within(colorSection).getByRole("button", { name: "toolbar.color.apply" }));

    expect(editor.view.dispatch).toHaveBeenCalledTimes(3);
    expect(editor.calls.some((call) => call.name === "setLink" && call.args[0] && (call.args[0] as { href: string }).href === "https://example.com/mobile")).toBe(true);
    expect(editor.calls.some((call) => call.name === "setFontSize" && call.args[0] === "18px")).toBe(true);
    expect(editor.calls.some((call) => call.name === "setColor" && call.args[0] === "#ff0000")).toBe(true);
    expect(run).toHaveBeenCalledTimes(3);
  });
});
