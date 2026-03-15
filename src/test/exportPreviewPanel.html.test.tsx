import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExportPreviewPanel from "@/components/editor/ExportPreviewPanel";
import { I18nContext } from "@/i18n/I18nProvider";

const renderWithI18n = (ui: ReactNode) =>
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

describe("ExportPreviewPanel html preview", () => {
  it("renders syntax-highlighted html and keeps wrap toggle working", async () => {
    const { container } = renderWithI18n(
      <ExportPreviewPanel
        editorHtml={'<!DOCTYPE html>\n<div class="hero">&amp; body</div>'}
        editorLatex="\\section{Intro}"
        editorMarkdown="# Intro"
        editorMode="html"
        fileName="Draft"
        onClose={vi.fn()}
        rawContent={'<!DOCTYPE html>\n<div class="hero">&amp; body</div>'}
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Markdown" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "HTML" }));

    await waitFor(() => {
      expect(container.querySelector(".html-source-tag-name")).toBeInTheDocument();
    });

    expect(container.querySelector(".html-source-doctype")?.textContent).toBe("DOCTYPE html");
    expect(container.querySelector(".html-source-tag-name")?.textContent).toBe("div");
    expect(container.querySelector(".html-source-attr-name")?.textContent).toBe("class");
    expect(container.querySelector(".html-source-entity")?.textContent).toBe("&amp;");

    const getFirstRenderedLine = () =>
      Array.from(container.querySelectorAll("div.grid > span:last-child")).find(
        (node) => node.textContent === "<!DOCTYPE html>",
      ) as HTMLSpanElement | undefined;

    expect(getFirstRenderedLine()?.className).toContain("whitespace-pre");

    fireEvent.click(screen.getByRole("button", { name: "previewPanel.wrap" }));

    await waitFor(() => {
      expect(getFirstRenderedLine()?.className).toContain("whitespace-pre-wrap");
    });
  });
});
