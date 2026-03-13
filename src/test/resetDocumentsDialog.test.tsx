import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ResetDocumentsDialog from "@/components/editor/ResetDocumentsDialog";
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

describe("ResetDocumentsDialog", () => {
  it("renders the start-fresh confirmation copy and confirms reset", () => {
    const onConfirm = vi.fn();

    renderWithI18n(
      <ResetDocumentsDialog
        onConfirm={onConfirm}
        onOpenChange={vi.fn()}
        open
      />,
    );

    expect(screen.getByText("resetDocuments.title")).toBeInTheDocument();
    expect(screen.getByText("resetDocuments.description")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "resetDocuments.confirm" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("closes when cancel is pressed", () => {
    const onOpenChange = vi.fn();

    renderWithI18n(
      <ResetDocumentsDialog
        onConfirm={vi.fn()}
        onOpenChange={onOpenChange}
        open
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "resetDocuments.cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
