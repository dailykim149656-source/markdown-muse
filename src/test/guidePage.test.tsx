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
    expect(screen.getAllByText("Profiles and surface availability").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Keyboard shortcuts").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Patch Review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Understand Docsy through the screen first").length).toBeGreaterThan(0);
    expect(screen.getByText("guide.currentBuildTitle")).toBeInTheDocument();
    expect(screen.getByText("guide.surfaceGalleryTitle")).toBeInTheDocument();
    expect(screen.getByText("guide.workspaceFlowTitle")).toBeInTheDocument();
    expect(screen.getAllByAltText("Understand Docsy through the screen first").length).toBeGreaterThan(0);
    expect(screen.getAllByAltText("guide.currentBuildGraphTitle").length).toBeGreaterThan(0);
    expect(screen.getAllByAltText("guide.currentBuildReviewTitle").length).toBeGreaterThan(0);
    expect(screen.getAllByAltText("guide.currentBuildQueueTitle").length).toBeGreaterThan(0);
    expect(screen.getAllByAltText("guide.currentBuildWorkspaceTitle").length).toBeGreaterThan(0);
    expect(screen.getByText("Recommended path for first-time users")).toBeInTheDocument();
    expect(screen.getByText("Frequently asked questions")).toBeInTheDocument();
    expect(screen.getByText("How does the format dropdown work?")).toBeInTheDocument();
    expect(screen.getByText("Why are History or Patch Review missing?")).toBeInTheDocument();
    expect(screen.getByText(/Export creates a new Google Doc from a local rich-text document/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Save to Google Docs/i).length).toBeGreaterThan(0);

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
