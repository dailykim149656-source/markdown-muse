import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import { loadMermaid } from "@/lib/rendering/loadMermaid";

vi.mock("@/lib/rendering/loadMermaid", () => ({
  loadMermaid: vi.fn(),
}));

describe("MarkdownEditor", () => {
  const mermaid = {
    initialize: vi.fn(),
    parse: vi.fn(),
    render: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadMermaid).mockResolvedValue(mermaid as unknown as Awaited<ReturnType<typeof loadMermaid>>);
    mermaid.parse.mockResolvedValue({ diagramType: "flowchart-v2" });
    mermaid.render.mockResolvedValue({ svg: "<svg><text>mermaid-preview</text></svg>" });
  });

  it("hydrates initial markdown into WYSIWYG immediately", async () => {
    render(<MarkdownEditor initialContent={"# Hello\n\nTemplate body"} />);

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("Template body")).toBeInTheDocument();
    });
  });

  it("syncs source edits into WYSIWYG", async () => {
    const onContentChange = vi.fn();

    render(
      <MarkdownEditor
        initialContent={"# Start\n\nBody"}
        onContentChange={onContentChange}
      />,
    );

    fireEvent.click(screen.getByText("Source"));

    await screen.findByText("Markdown Source");

    const sourceTextarea = await screen.findByPlaceholderText(/Write raw Markdown source here/i);

    fireEvent.change(sourceTextarea, {
      target: {
        value: "# Updated\n\nSynced body",
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Updated")).toBeInTheDocument();
      expect(screen.getByText("Synced body")).toBeInTheDocument();
    });

    expect(onContentChange).toHaveBeenCalled();
  });

  it("does not replay source sync after WYSIWYG edits in markdown mode", async () => {
    let activeEditor: Editor | null = null;

    render(
      <MarkdownEditor
        initialContent={"Hello"}
        onEditorReady={(editor) => {
          activeEditor = editor;
        }}
      />,
    );

    await waitFor(() => {
      expect(activeEditor).not.toBeNull();
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    const originalSetContent = activeEditor!.commands.setContent.bind(activeEditor!.commands);
    const setContentSpy = vi.fn((...args: Parameters<typeof originalSetContent>) => originalSetContent(...args));
    activeEditor!.commands.setContent = setContentSpy;

    await act(async () => {
      activeEditor?.commands.insertContent({
        type: "paragraph",
        content: [{ type: "text", text: "World" }],
      });
    });

    await waitFor(() => {
      expect(activeEditor?.getJSON().content).toHaveLength(2);
    });

    expect(setContentSpy).not.toHaveBeenCalled();
  });

  it("renders Mermaid fences immediately when advanced blocks are enabled", async () => {
    render(
      <MarkdownEditor
        advancedBlocksEnabled
        initialContent={"```mermaid\ngraph TD\nA --> B\n```"}
      />,
    );

    await waitFor(() => {
      expect(mermaid.parse).toHaveBeenCalled();
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(screen.getByText("mermaid-preview")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("preserves Mermaid markdown while advanced blocks auto-enable", async () => {
    const AutoEnableHarness = () => {
      const [advancedBlocksEnabled, setAdvancedBlocksEnabled] = useState(false);

      return (
        <MarkdownEditor
          advancedBlocksEnabled={advancedBlocksEnabled}
          initialContent={"```mermaid\ngraph TD\nA --> B\n```"}
          onEnableAdvancedBlocks={() => setAdvancedBlocksEnabled(true)}
        />
      );
    };

    render(<AutoEnableHarness />);

    await waitFor(() => {
      expect(mermaid.parse).toHaveBeenCalled();
      expect(screen.getByText("mermaid-preview")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("keeps Mermaid previews visible when the source panel is opened", async () => {
    render(
      <MarkdownEditor
        advancedBlocksEnabled
        initialContent={"```mermaid\ngraph TD\nA --> B\n```"}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("mermaid-preview")).toBeInTheDocument();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByText("Source"));

    await waitFor(() => {
      expect(screen.getByText("mermaid-preview")).toBeInTheDocument();
      expect(screen.getByText("Markdown Source")).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
