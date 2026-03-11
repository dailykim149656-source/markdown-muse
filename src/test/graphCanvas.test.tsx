import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GraphCanvas from "@/components/editor/GraphCanvas";
import { I18nContext } from "@/i18n/I18nProvider";
import type { KnowledgeGraphEdge, KnowledgeGraphNode } from "@/lib/knowledge/workspaceInsights";

const nodes: KnowledgeGraphNode[] = [
  {
    documentId: "doc-alpha",
    dominantIssueKind: "unresolved_reference",
    id: "doc:alpha",
    issueCount: 1,
    issueSeverity: "warning",
    kind: "document",
    label: "Alpha Doc",
  },
  {
    documentId: "doc-beta",
    id: "doc:beta",
    kind: "document",
    label: "Beta Doc",
  },
];

const edges: KnowledgeGraphEdge[] = [
  {
    description: "Alpha references Beta.",
    group: "reference",
    id: "edge-1",
    kind: "references",
    sourceDocumentId: "doc-alpha",
    sourceId: "doc:alpha",
    targetDocumentId: "doc-beta",
    targetId: "doc:beta",
    weight: 2,
  },
];

const renderCanvas = (overrides: Partial<ComponentProps<typeof GraphCanvas>> = {}) => {
  const onOpenDocument = vi.fn();
  const onSelectNode = vi.fn();

  render(
    <I18nContext.Provider
      value={{
        locale: "en",
        setLocale: vi.fn(),
        t: (key) => key,
      }}
    >
      <GraphCanvas
        edges={edges}
        nodes={nodes}
        onOpenDocument={onOpenDocument}
        onSelectNode={onSelectNode}
        selectedNodeId="doc:alpha"
        {...overrides}
      />
    </I18nContext.Provider>,
  );

  return { onOpenDocument, onSelectNode };
};

describe("GraphCanvas", () => {
  it("renders controls and supports node selection and open", () => {
    const { onOpenDocument, onSelectNode } = renderCanvas();

    expect(screen.getByText("knowledge.graphCanvasTitle")).toBeInTheDocument();
    expect(screen.getByText("knowledge.graphCanvasLegendTitle")).toBeInTheDocument();
    expect(screen.getByText("knowledge.graphMiniMapTitle")).toBeInTheDocument();
    expect(screen.getByTestId("graph-canvas-legend")).toHaveTextContent("knowledge.graphCanvasLegendNodes");
    expect(screen.getByTestId("graph-canvas-legend")).toHaveTextContent("knowledge.graphCanvasLegendEdges");
    expect(screen.getByTestId("graph-canvas-legend")).toHaveTextContent("knowledge.graphEdgeReferences");
    expect(screen.getByTestId("graph-canvas-legend")).toHaveTextContent("knowledge.graphNodeDocument");
    expect(screen.getByRole("button", { name: "knowledge.graphZoomIn" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "knowledge.graphCenterView" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "knowledge.graphFullscreen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "knowledge.graphCanvasSizeExpanded" })).toBeInTheDocument();
    expect(screen.getByTestId("graph-canvas-minimap")).toBeInTheDocument();

    const node = screen.getByTestId("graph-canvas-node-doc:beta");
    fireEvent.click(node);
    fireEvent.doubleClick(node);

    expect(onSelectNode).toHaveBeenCalledWith("doc:beta");
    expect(onOpenDocument).toHaveBeenCalledWith(expect.objectContaining({
      documentId: "doc-beta",
      kind: "document",
      nodeId: "doc:beta",
    }));
  }, 15000);

  it("supports canvas size presets", () => {
    renderCanvas();

    const svg = screen.getByTestId("graph-canvas-svg");
    expect(svg).toHaveStyle({ height: "360px" });

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphCanvasSizeExpanded" }));
    expect(svg).toHaveStyle({ height: "720px" });

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphCanvasSizeCompact" }));
    expect(svg).toHaveStyle({ height: "280px" });

    expect(screen.getByText("1000px")).toBeInTheDocument();
  });

  it("supports fullscreen mode", () => {
    renderCanvas();

    fireEvent.click(screen.getByRole("button", { name: "knowledge.graphFullscreen" }));

    const fullscreen = screen.getByTestId("graph-canvas-fullscreen");
    expect(fullscreen).toBeInTheDocument();
    expect(screen.getByText("knowledge.graphCanvasFullscreenTitle")).toBeInTheDocument();

    fireEvent.click(within(fullscreen).getAllByRole("button", { name: "knowledge.graphExitFullscreen" })[0]);

    expect(screen.queryByTestId("graph-canvas-fullscreen")).not.toBeInTheDocument();
  });

  it("shows hover details for nodes and edges", () => {
    renderCanvas();

    fireEvent.mouseEnter(screen.getByTestId("graph-canvas-node-doc:beta"));
    expect(screen.getByTestId("graph-canvas-hover-card")).toHaveTextContent("Beta Doc");
    expect(screen.getByTestId("graph-canvas-hover-card")).toHaveTextContent("knowledge.graphHoverOpenHint");

    fireEvent.mouseLeave(screen.getByTestId("graph-canvas-node-doc:beta"));
    fireEvent.mouseEnter(screen.getByTestId("graph-canvas-edge-edge-1"));
    expect(screen.getByTestId("graph-canvas-hover-card")).toHaveTextContent("knowledge.graphEdgeReferences");
    expect(screen.getByTestId("graph-canvas-hover-card")).toHaveTextContent("Alpha references Beta.");
  });

  it("supports recentering and dragging from the mini-map", async () => {
    renderCanvas();

    const minimap = screen.getByTestId("graph-canvas-minimap");
    expect(screen.getByTestId("graph-canvas-minimap-viewport")).toBeInTheDocument();

    expect(minimap).toHaveClass("cursor-crosshair");

    fireEvent.pointerDown(minimap, {
      clientX: 120,
      clientY: 52,
      pointerId: 1,
    });

    await waitFor(() => {
      expect(minimap).toHaveClass("cursor-grabbing");
    });

    fireEvent.pointerUp(minimap, {
      pointerId: 1,
    });

    await waitFor(() => {
      expect(minimap).toHaveClass("cursor-crosshair");
    });
  });
});
