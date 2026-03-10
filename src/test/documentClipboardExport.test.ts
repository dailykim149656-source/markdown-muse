import { describe, expect, it } from "vitest";
import { buildClipboardExportContent } from "@/hooks/useDocumentIO";

describe("document clipboard export", () => {
  it("returns renderable markdown for rich-text documents", () => {
    const content = buildClipboardExportContent({
      activeDoc: {
        content: "<p>ignored</p>",
        mode: "html",
      },
      format: "markdown",
      renderableEditorHtml: "<h1>Hello</h1>",
      renderableMarkdown: "# Hello",
    });

    expect(content).toBe("# Hello");
  });

  it("converts yaml content to json when copying json", () => {
    const content = buildClipboardExportContent({
      activeDoc: {
        content: "name: Docsy\ncount: 2\n",
        mode: "yaml",
      },
      format: "json",
      renderableEditorHtml: "",
      renderableMarkdown: "",
    });

    expect(content).toContain('"name": "Docsy"');
    expect(content).toContain('"count": 2');
  });

  it("converts json content to yaml when copying yaml", () => {
    const content = buildClipboardExportContent({
      activeDoc: {
        content: '{\n  "name": "Docsy",\n  "count": 2\n}',
        mode: "json",
      },
      format: "yaml",
      renderableEditorHtml: "",
      renderableMarkdown: "",
    });

    expect(content).toContain("name: Docsy");
    expect(content).toContain("count: 2");
  });
});
