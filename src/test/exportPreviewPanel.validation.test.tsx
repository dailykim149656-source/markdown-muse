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

describe("ExportPreviewPanel validation inspector", () => {
  it("switches back to LaTeX preview when a diagnostic is clicked", async () => {
    const onJumpToLine = vi.fn();

    renderWithI18n(
      <ExportPreviewPanel
        editorHtml="<p>Hello</p>"
        editorLatex={"\\section{Intro}\n\\badcommand"}
        editorMarkdown="# Intro"
        editorMode="latex"
        fileName="Draft"
        onClose={vi.fn()}
        rawContent={"\\section{Intro}\n\\badcommand"}
        texValidationProps={{
          compileMs: 40,
          diagnostics: [{
            line: 2,
            message: "Undefined control sequence.",
            severity: "error",
            stage: "compile",
          }],
          health: {
            configured: true,
            engine: "xelatex",
            ok: true,
          },
          isExportingPdf: false,
          lastValidatedAt: Date.now(),
          latexSource: "\\section{Intro}\n\\badcommand",
          logSummary: "Undefined control sequence.",
          onCompilePdf: vi.fn(),
          onJumpToLine,
          onRunValidation: vi.fn(),
          sourceType: "raw-latex",
          status: "error",
          validationEnabled: true,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "texValidation.title" }));
    fireEvent.click(screen.getByRole("button", { name: /Undefined control sequence\./i }));

    await waitFor(() => {
      expect(onJumpToLine).toHaveBeenCalledWith(2);
    });

    expect(screen.getByRole("button", { name: "LaTeX" })).toBeInTheDocument();
    expect(screen.getByText("\\badcommand")).toBeInTheDocument();
  });
});
