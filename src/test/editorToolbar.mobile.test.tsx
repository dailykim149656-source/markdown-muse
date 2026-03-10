import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditorToolbar from "@/components/editor/EditorToolbar";
import { I18nContext } from "@/i18n/I18nProvider";

const createMockEditor = () => {
  const chain = {
    extendMarkRange: () => chain,
    focus: () => chain,
    redo: () => chain,
    run: vi.fn(),
    setHorizontalRule: () => chain,
    setLink: () => chain,
    setTextAlign: () => chain,
    toggleBlockquote: () => chain,
    toggleBold: () => chain,
    toggleBulletList: () => chain,
    toggleCode: () => chain,
    toggleHeading: () => chain,
    toggleHighlight: () => chain,
    toggleItalic: () => chain,
    toggleOrderedList: () => chain,
    toggleStrike: () => chain,
    toggleSubscript: () => chain,
    toggleSuperscript: () => chain,
    toggleTaskList: () => chain,
    toggleUnderline: () => chain,
    undo: () => chain,
    unsetLink: () => chain,
  };

  return {
    chain: () => chain,
    commands: {},
    getAttributes: () => ({ href: "" }),
    isActive: () => false,
  };
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

describe("EditorToolbar mobile layout", () => {
  it("keeps the More button outside the mobile scroll rail", () => {
    renderWithI18n(
      <EditorToolbar
        editor={createMockEditor() as never}
      />,
    );

    const mobileScroll = screen.getByTestId("toolbar-mobile-scroll");
    const mobileMore = screen.getByTestId("toolbar-mobile-more");

    expect(within(mobileMore).getByRole("button", { name: "toolbar.actions.more" })).toBeInTheDocument();
    expect(within(mobileScroll).queryByRole("button", { name: "toolbar.actions.more" })).not.toBeInTheDocument();
  });
});
