import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Guide from "@/pages/Guide";
import { I18nContext } from "@/i18n/I18nProvider";

const renderWithI18n = (locale: "en" | "ko" = "en") =>
  render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <I18nContext.Provider
        value={{
          locale,
          setLocale: vi.fn(),
          t: (key) => key,
        }}
      >
        <Guide />
      </I18nContext.Provider>
    </MemoryRouter>,
  );

describe("Guide page", () => {
  it("renders the table of contents and core sections", () => {
    renderWithI18n("en");

    expect(screen.getByText("guide.tableOfContents")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("guide.searchPlaceholder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "guide.audienceBeginner" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "guide.audienceAdvanced" })).toBeInTheDocument();
    expect(screen.getByText("Real usage scenarios")).toBeInTheDocument();
    expect(screen.getByText("Fast single-document writing")).toBeInTheDocument();
    expect(screen.getAllByText("Getting started").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Keyboard shortcuts").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Patch Review").length).toBeGreaterThan(0);
    expect(screen.getByText("Understand Docsy through the screen first")).toBeInTheDocument();
    expect(screen.getByText("Recommended path for first-time users")).toBeInTheDocument();
    expect(screen.getByText("Frequently asked questions")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("guide.searchPlaceholder"), {
      target: { value: "zzz-not-found" },
    });

    expect(screen.getAllByText("guide.noResults").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText("guide.searchPlaceholder"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "guide.audienceAdvanced" }));

    expect(screen.queryAllByText("Create your first document").length).toBe(0);
    expect(screen.queryAllByText("Fast single-document writing").length).toBe(0);
    expect(screen.getByText("Related-document sync workflow")).toBeInTheDocument();
    expect(screen.getAllByText("Knowledge and graph").length).toBeGreaterThan(0);
  }, 15000);
});
