import { describe, expect, it, vi } from "vitest";
import { applyEditorSeed, getSeedSignature } from "@/components/editor/editorSeedSync";

const createEditor = (initial: { html: string; json: object }) => {
  const state = { ...initial };

  return {
    commands: {
      setContent: vi.fn((nextContent: unknown) => {
        if (typeof nextContent === "string") {
          state.html = nextContent;
          return true;
        }

        state.json = nextContent as object;
        return true;
      }),
    },
    getHTML: vi.fn(() => state.html),
    getJSON: vi.fn(() => state.json),
  };
};

describe("editorSeedSync", () => {
  it("does not reseed when the incoming html already matches the editor", () => {
    const editor = createEditor({
      html: "<h1>Hello</h1><p>Body</p>",
      json: { type: "doc" },
    });
    const seedSignatureRef = { current: null as string | null };

    const applied = applyEditorSeed({
      editor: editor as never,
      nextContent: "<h1>Hello</h1><p>Body</p>",
      onHtmlChange: vi.fn(),
      onTiptapChange: vi.fn(),
      seedSignatureRef,
    });

    expect(applied).toBe(false);
    expect(editor.commands.setContent).not.toHaveBeenCalled();
    expect(seedSignatureRef.current).toBe(getSeedSignature("<h1>Hello</h1><p>Body</p>"));
  });

  it("applies a new external seed when the editor content is different", () => {
    const editor = createEditor({
      html: "<h1>Hello</h1><p>Body</p>",
      json: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Body" }] }] },
    });
    const onHtmlChange = vi.fn();
    const onTiptapChange = vi.fn();
    const seedSignatureRef = { current: null as string | null };

    const applied = applyEditorSeed({
      editor: editor as never,
      nextContent: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Updated" }] }],
      },
      onHtmlChange,
      onTiptapChange,
      seedSignatureRef,
    });

    expect(applied).toBe(true);
    expect(editor.commands.setContent).toHaveBeenCalledTimes(1);
    expect(onHtmlChange).toHaveBeenCalledTimes(1);
    expect(onTiptapChange).toHaveBeenCalledTimes(1);
  });
});
