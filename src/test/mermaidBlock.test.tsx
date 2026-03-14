import type { HTMLAttributes, ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MermaidNodeView } from "@/components/editor/extensions/MermaidBlock";
import { loadMermaid } from "@/lib/rendering/loadMermaid";
import { sanitizeMermaidSvg } from "@/lib/rendering/sanitizeMermaidSvg";

type NodeViewWrapperProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

vi.mock("@tiptap/core", () => ({
  Node: {
    create: (config: unknown) => config,
  },
  mergeAttributes: (...attributes: Array<Record<string, unknown> | undefined>) => Object.assign({}, ...attributes),
}));

vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: (component: unknown) => component,
  NodeViewWrapper: ({ children, ...props }: NodeViewWrapperProps) => <div {...props}>{children}</div>,
}));

vi.mock("@/lib/rendering/loadMermaid", () => ({
  loadMermaid: vi.fn(),
}));

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
};

const createNode = (code: string) => ({
  attrs: { code },
});

describe("MermaidNodeView", () => {
  const mermaid = {
    initialize: vi.fn(),
    parse: vi.fn(),
    render: vi.fn(),
  };
  const originalResizeObserver = window.ResizeObserver;
  let resizeObserverCallback: ResizeObserverCallback | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadMermaid).mockResolvedValue(mermaid as unknown as Awaited<ReturnType<typeof loadMermaid>>);
    resizeObserverCallback = null;
    window.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        resizeObserverCallback = callback;
      }

      observe() {}

      unobserve() {}

      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    vi.useRealTimers();
    window.ResizeObserver = originalResizeObserver;
  });

  it("parses before rendering and passes a container to mermaid.render", async () => {
    mermaid.parse.mockResolvedValue({ diagramType: "flowchart-v2" });
    mermaid.render.mockResolvedValue({ svg: "<svg><text>valid-preview</text></svg>" });

    render(
      <MermaidNodeView
        node={createNode("graph TD\nA-->B")}
        selected={false}
        updateAttributes={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mermaid.parse).toHaveBeenCalledWith("graph TD\nA-->B", { suppressErrors: true });
      expect(mermaid.render).toHaveBeenCalledTimes(1);
    });

    expect(mermaid.render.mock.calls[0][2]).toBeInstanceOf(HTMLDivElement);
    expect(screen.getByText("valid-preview")).toBeInTheDocument();
  });

  it("keeps the last valid preview while editing invalid Mermaid draft text", async () => {
    mermaid.parse.mockImplementation(async (source: string) =>
      source === "graph TD\nA-->B" ? { diagramType: "flowchart-v2" } : false,
    );
    mermaid.render.mockResolvedValue({ svg: "<svg><text>stable-preview</text></svg>" });

    render(
      <MermaidNodeView
        node={createNode("graph TD\nA-->B")}
        selected={false}
        updateAttributes={vi.fn()}
      />,
    );

    await screen.findByText("stable-preview");

    fireEvent.click(screen.getByTitle("Click to edit"));

    const textarea = screen.getByRole("textbox");

    fireEvent.change(textarea, {
      target: {
        value: "graph TD\nA(",
      },
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    await waitFor(() => {
      expect(mermaid.parse).toHaveBeenLastCalledWith("graph TD\nA(", { suppressErrors: true });
    });

    expect(mermaid.render).toHaveBeenCalledTimes(1);
    expect(screen.getByText("stable-preview")).toBeInTheDocument();
    expect(screen.getByText("Preview paused until Mermaid syntax is valid.")).toBeInTheDocument();
  });

  it("shows an inline warning for saved invalid Mermaid without rendering an error SVG", async () => {
    mermaid.parse.mockResolvedValue(false);

    render(
      <MermaidNodeView
        node={createNode("graph TD\nA(")}
        selected={false}
        updateAttributes={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mermaid.parse).toHaveBeenCalledWith("graph TD\nA(", { suppressErrors: true });
    });

    expect(mermaid.render).not.toHaveBeenCalled();
    expect(screen.getByText("Preview paused until Mermaid syntax is valid.")).toBeInTheDocument();
    expect(screen.queryByText("Syntax error in text")).not.toBeInTheDocument();
  });

  it("ignores stale render completions from older requests", async () => {
    const firstRender = createDeferred<{ svg: string }>();
    const secondRender = createDeferred<{ svg: string }>();

    mermaid.parse.mockResolvedValue({ diagramType: "flowchart-v2" });
    mermaid.render.mockImplementation((_: string, source: string) => {
      if (source === "graph TD\nA-->B") {
        return firstRender.promise;
      }

      return secondRender.promise;
    });

    const view = render(
      <MermaidNodeView
        node={createNode("graph TD\nA-->B")}
        selected={false}
        updateAttributes={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mermaid.render).toHaveBeenCalledTimes(1);
    });

    view.rerender(
      <MermaidNodeView
        node={createNode("graph TD\nA-->C")}
        selected={false}
        updateAttributes={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mermaid.render).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      secondRender.resolve({ svg: "<svg><text>new-preview</text></svg>" });
      await Promise.resolve();
    });

    await screen.findByText("new-preview");

    await act(async () => {
      firstRender.resolve({ svg: "<svg><text>old-preview</text></svg>" });
      await Promise.resolve();
    });

    expect(screen.getByText("new-preview")).toBeInTheDocument();
    expect(screen.queryByText("old-preview")).not.toBeInTheDocument();
  });

  it("re-renders when the Mermaid block layout size changes", async () => {
    mermaid.parse.mockResolvedValue({ diagramType: "flowchart-v2" });
    mermaid.render.mockResolvedValue({ svg: "<svg><text>resizable-preview</text></svg>" });

    render(
      <MermaidNodeView
        node={createNode("graph TD\nA-->B")}
        selected={false}
        updateAttributes={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mermaid.render).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      resizeObserverCallback?.([
        { contentRect: { height: 120, width: 420 } } as ResizeObserverEntry,
      ], {} as ResizeObserver);
      resizeObserverCallback?.([
        { contentRect: { height: 120, width: 260 } } as ResizeObserverEntry,
      ], {} as ResizeObserver);
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(mermaid.render).toHaveBeenCalledTimes(2);
  });

  it("sanitizes rendered Mermaid SVG before insertion", () => {
    const sanitized = sanitizeMermaidSvg(
      '<svg><a xlink:href="javascript:alert(1)"><text>Unsafe</text></a><script>alert(1)</script></svg>',
    );

    expect(sanitized).toContain("Unsafe");
    expect(sanitized).not.toContain("javascript:alert(1)");
    expect(sanitized).not.toContain("<script");
  });
});
