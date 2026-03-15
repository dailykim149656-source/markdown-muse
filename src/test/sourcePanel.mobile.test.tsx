import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SourcePanel, SplitEditorLayout } from "@/components/editor/SourcePanel";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

describe("SourcePanel mobile layout", () => {
  const renderMobileSourceLayout = (showPanel = true, onShowPanel = vi.fn()) =>
    render(
      <SplitEditorLayout
        editorContent={<div>Editor body</div>}
        onShowPanel={onShowPanel}
        showPanel={showPanel}
        sourceLeft={false}
        sourcePanel={
          <SourcePanel
            label="Markdown Source"
            onChange={vi.fn()}
            onClose={() => onShowPanel(false)}
            onKeyDown={vi.fn()}
            onSwap={vi.fn()}
            value={"# Mobile source"}
          />
        }
      />,
    );

  it("renders the source panel inside a mobile bottom sheet with a visible close button", () => {
    const onShowPanel = vi.fn();
    renderMobileSourceLayout(true, onShowPanel);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Close source panel")).toBeVisible();
    expect(within(dialog).queryByTitle("Move source panel")).not.toBeInTheDocument();
  });

  it("closes the mobile source sheet when the source close button is pressed", () => {
    const onShowPanel = vi.fn();
    renderMobileSourceLayout(true, onShowPanel);

    fireEvent.click(screen.getByLabelText("Close source panel"));
    expect(onShowPanel).toHaveBeenCalledWith(false);
  });

  it("opens the mobile source sheet from the floating source button", () => {
    const onShowPanel = vi.fn();
    renderMobileSourceLayout(false, onShowPanel);

    fireEvent.click(screen.getByRole("button", { name: "Source" }));
    expect(onShowPanel).toHaveBeenCalledWith(true);
  });
});
