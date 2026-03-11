import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { createCoreEditorExtensions } from "@/components/editor/editorConfigBase";
import { createDocumentEditorExtensions } from "@/components/editor/editorConfigDocument";

const waitForNodeIdSync = () => new Promise((resolve) => setTimeout(resolve, 0));
const createExtensions = () => [
  ...createCoreEditorExtensions(""),
  ...createDocumentEditorExtensions(),
];

describe("NodeIdExtension", () => {
  it("assigns deterministic node ids to eligible nodes on initial load", async () => {
    const editor = new Editor({
      extensions: createExtensions(),
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "First paragraph" }],
          },
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Overview" }],
          },
        ],
      },
    });

    await waitForNodeIdSync();

    const json = editor.getJSON();

    expect(json.content?.[0]?.attrs?.nodeId).toBe("node-paragraph-1");
    expect(json.content?.[1]?.attrs?.nodeId).toBe("node-heading-1");

    editor.destroy();
  });

  it("preserves existing node ids and fills missing ids after content updates", async () => {
    const editor = new Editor({
      extensions: createExtensions(),
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { nodeId: "node-paragraph-9" },
            content: [{ type: "text", text: "Existing paragraph" }],
          },
        ],
      },
    });

    await waitForNodeIdSync();

    editor.commands.setContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { nodeId: "node-paragraph-9" },
          content: [{ type: "text", text: "Existing paragraph" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "New paragraph" }],
        },
      ],
    });

    await waitForNodeIdSync();

    const json = editor.getJSON();

    expect(json.content?.[0]?.attrs?.nodeId).toBe("node-paragraph-9");
    expect(json.content?.[1]?.attrs?.nodeId).toBe("node-paragraph-10");

    editor.destroy();
  });
});
