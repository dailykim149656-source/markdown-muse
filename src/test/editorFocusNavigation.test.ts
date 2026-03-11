import { describe, expect, it } from "vitest";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { scrollToEditorFocusTarget } from "@/lib/editor/editorFocusNavigation";
import { technicalDocumentFixture } from "@/test/fixtures/technicalDocument.fixture";

describe("editorFocusNavigation", () => {
  it("scrolls to a matching section heading", () => {
    document.body.innerHTML = `
      <div class="ProseMirror">
        <h1>Intro</h1>
        <h2>Deploy</h2>
      </div>
    `;

    const heading = document.querySelector("h2") as HTMLElement;
    const scrollIntoView = vi.fn();
    heading.scrollIntoView = scrollIntoView;

    const result = scrollToEditorFocusTarget({
      documentId: "doc-1",
      kind: "section",
      label: "Deploy",
      sectionId: "sec-002-deploy",
    }, serializeTiptapToAst({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1, nodeId: "heading-intro" }, content: [{ type: "text", text: "Intro" }] },
        { type: "heading", attrs: { level: 2, nodeId: "heading-deploy" }, content: [{ type: "text", text: "Deploy" }] },
      ],
    }, { documentNodeId: "doc-1" }));

    expect(result).toBe(true);
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("scrolls to a matching image element", () => {
    document.body.innerHTML = `
      <div class="ProseMirror">
        <div data-node-id="node-image-1">
          <img src="/assets/system.png" alt="System diagram" />
        </div>
      </div>
    `;

    const wrapper = document.querySelector("[data-node-id='node-image-1']") as HTMLElement;
    const scrollIntoView = vi.fn();
    wrapper.scrollIntoView = scrollIntoView;

    const result = scrollToEditorFocusTarget({
      documentId: "doc-1",
      imageId: "img-001-system",
      imageSrc: "system.png",
      kind: "image",
      label: "System diagram",
    }, serializeTiptapToAst(technicalDocumentFixture, { documentNodeId: "doc-1" }));

    expect(result).toBe(true);
    expect(scrollIntoView).toHaveBeenCalled();
  });
});
