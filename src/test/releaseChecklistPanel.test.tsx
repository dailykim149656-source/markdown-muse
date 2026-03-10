import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReleaseChecklistPanel from "@/components/editor/ReleaseChecklistPanel";
import { I18nContext } from "@/i18n/I18nProvider";

const renderWithI18n = (ui: React.ReactNode) =>
  render(
    <I18nContext.Provider
      value={{
        locale: "en",
        setLocale: vi.fn(),
        t: (key, params) => {
          if (!params) {
            return key;
          }

          return `${key}:${JSON.stringify(params)}`;
        },
      }}
    >
      {ui}
    </I18nContext.Provider>,
  );

describe("ReleaseChecklistPanel", () => {
  it("tracks checklist items and resets local progress", () => {
    const onToggleItem = vi.fn();
    const onReset = vi.fn();

    const { rerender } = renderWithI18n(
      <ReleaseChecklistPanel
        checkedItemIds={[]}
        onReset={onReset}
        onToggleItem={onToggleItem}
      />,
    );

    const firstItem = screen.getByLabelText("knowledge.releaseChecklistItems.consistency_graph");

    fireEvent.click(firstItem);

    expect(onToggleItem).toHaveBeenCalledWith("consistency_graph");

    rerender(
      <I18nContext.Provider
        value={{
          locale: "en",
          setLocale: vi.fn(),
          t: (key, params) => {
            if (!params) {
              return key;
            }

            return `${key}:${JSON.stringify(params)}`;
          },
        }}
      >
        <ReleaseChecklistPanel
          checkedItemIds={["consistency_graph"]}
          onReset={onReset}
          onToggleItem={onToggleItem}
        />
      </I18nContext.Provider>,
    );

    expect(screen.getByLabelText("knowledge.releaseChecklistItems.consistency_graph")).toBeChecked();
    expect(screen.getByText('knowledge.releaseChecklistProgress:{"completed":1,"total":10}')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "knowledge.releaseChecklistReset" }));

    expect(onReset).toHaveBeenCalled();
  });
});
