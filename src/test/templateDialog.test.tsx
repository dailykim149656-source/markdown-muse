import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TemplateDialog from "@/components/editor/TemplateDialog";
import { I18nContext } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n/types";

const renderTemplateDialog = (
  locale: Locale,
  overrides: Partial<ComponentProps<typeof TemplateDialog>> = {},
) =>
  render(
    <I18nContext.Provider
      value={{
        locale,
        setLocale: vi.fn(),
        t: (key) => key,
      }}
    >
      <TemplateDialog
        onOpenChange={() => undefined}
        onSelect={() => undefined}
        open
        {...overrides}
      />
    </I18nContext.Provider>,
  );

describe("TemplateDialog", () => {
  it("renders English template UI labels", () => {
    renderTemplateDialog("en");

    expect(screen.getByText("Choose a document template")).toBeInTheDocument();
    expect(screen.getByText("Technical report")).toBeInTheDocument();
    expect(screen.getByText("ADR record")).toBeInTheDocument();
    expect(screen.getByText("Reset filters")).toBeInTheDocument();
  });

  it("renders Korean template UI labels", () => {
    renderTemplateDialog("ko");

    expect(screen.getByText("문서 템플릿 선택")).toBeInTheDocument();
    expect(screen.getByText("기술 보고서")).toBeInTheDocument();
    expect(screen.getByText("ADR 기록")).toBeInTheDocument();
    expect(screen.getByText("필터 초기화")).toBeInTheDocument();
  });

  it("filters out structured templates for beginner mode", () => {
    renderTemplateDialog("en", {
      templateFilter: (template) => template.mode !== "json" && template.mode !== "yaml",
    });

    expect(screen.queryByText("JSON config")).toBeNull();
    expect(screen.queryByText("YAML config")).toBeNull();
    expect(screen.getByText("Technical report")).toBeInTheDocument();
  });
});
