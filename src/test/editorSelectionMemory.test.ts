import type { Editor } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { rememberEditorSelection } from "@/components/editor/editorSelectionMemory";

describe("editorSelectionMemory", () => {
  it("falls back to the editor state when the view is not mounted yet", () => {
    const bookmark = {
      resolve() {
        throw new Error("not used");
      },
    };
    const selection = {
      from: 3,
      to: 3,
      getBookmark: () => bookmark,
    };
    const editor = {
      state: {
        selection,
      },
      get view() {
        return new Proxy(
          {},
          {
            get(_target, key) {
              throw new Error(
                `[tiptap error]: The editor view is not available. Cannot access view['${String(key)}']. The editor may not be mounted yet.`,
              );
            },
          },
        );
      },
    } as unknown as Editor;

    const snapshot = rememberEditorSelection(editor);

    expect(snapshot?.from).toBe(3);
    expect(snapshot?.to).toBe(3);
    expect(snapshot?.bookmark).toBe(bookmark);
  });
});
