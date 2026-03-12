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
