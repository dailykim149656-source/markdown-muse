import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection, type Selection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";

type BookmarkLike = {
  resolve: (doc: ProseMirrorNode) => Selection;
};

export interface EditorSelectionSnapshot {
  bookmark: BookmarkLike;
  from: number;
  to: number;
}

export type EditorCommand = (editor: Editor) => boolean | void;

interface EditorSelectionMemoryEntry {
  active: EditorSelectionSnapshot;
  range: EditorSelectionSnapshot | null;
}

const editorSelectionMemory = new WeakMap<Editor, EditorSelectionMemoryEntry>();

const createSelectionSnapshot = (editor: Editor): EditorSelectionSnapshot => {
  const domSelection = typeof window !== "undefined" ? window.getSelection() : null;
  if (
    domSelection
    && domSelection.rangeCount > 0
    && domSelection.anchorNode
    && domSelection.focusNode
    && editor.view.dom.contains(domSelection.anchorNode)
    && editor.view.dom.contains(domSelection.focusNode)
  ) {
    try {
      const anchorPosition = editor.view.posAtDOM(domSelection.anchorNode, domSelection.anchorOffset);
      const focusPosition = editor.view.posAtDOM(domSelection.focusNode, domSelection.focusOffset);
      const selection = TextSelection.create(
        editor.state.doc,
        Math.min(anchorPosition, focusPosition),
        Math.max(anchorPosition, focusPosition),
      );

      return {
        bookmark: selection.getBookmark() as BookmarkLike,
        from: selection.from,
        to: selection.to,
      };
    } catch {
      // Fall back to editor state selection below.
    }
  }

  const { selection } = editor.state;

  return {
    bookmark: selection.getBookmark() as BookmarkLike,
    from: selection.from,
    to: selection.to,
  };
};

const clampSelectionPosition = (editor: Editor, position: number) => {
  const maxPosition = editor.state.doc.content.size;
  return Math.min(Math.max(position, 0), maxPosition);
};

const resolveSelectionSnapshot = (editor: Editor, snapshot: EditorSelectionSnapshot) => {
  try {
    return snapshot.bookmark.resolve(editor.state.doc);
  } catch {
    try {
      return TextSelection.create(
        editor.state.doc,
        clampSelectionPosition(editor, snapshot.from),
        clampSelectionPosition(editor, snapshot.to),
      );
    } catch {
      return null;
    }
  }
};

export const rememberEditorSelection = (editor: Editor | null) => {
  if (!editor) {
    return null;
  }

  const snapshot = createSelectionSnapshot(editor);
  const previous = editorSelectionMemory.get(editor);
  editorSelectionMemory.set(editor, {
    active: snapshot,
    range: snapshot.from !== snapshot.to ? snapshot : previous?.range ?? null,
  });
  return snapshot;
};

export const getRememberedEditorSelection = (
  editor: Editor | null,
  options?: { preferExpanded?: boolean },
) => {
  if (!editor) {
    return null;
  }

  const stored = editorSelectionMemory.get(editor);
  if (!stored) {
    return null;
  }

  if (options?.preferExpanded && stored.active.from === stored.active.to && stored.range) {
    return stored.range;
  }

  return stored.active;
};

export const restoreEditorSelection = (
  editor: Editor | null,
  snapshot?: EditorSelectionSnapshot | null,
  options?: { preferExpanded?: boolean },
) => {
  if (!editor) {
    return false;
  }

  const stored = editorSelectionMemory.get(editor);
  const nextSnapshot = options?.preferExpanded
    ? (snapshot && snapshot.from !== snapshot.to ? snapshot : stored?.range ?? snapshot)
    : snapshot ?? stored?.active;

  if (!nextSnapshot) {
    return false;
  }

  const selection = resolveSelectionSnapshot(editor, nextSnapshot);
  if (!selection) {
    return false;
  }

  if (typeof editor.commands.setTextSelection === "function") {
    editor.commands.setTextSelection({ from: selection.from, to: selection.to });
  } else {
    editor.view.dispatch(editor.state.tr.setSelection(selection));
  }
  editorSelectionMemory.set(editor, {
    active: {
      bookmark: selection.getBookmark() as BookmarkLike,
      from: selection.from,
      to: selection.to,
    },
    range: selection.from !== selection.to
      ? {
        bookmark: selection.getBookmark() as BookmarkLike,
        from: selection.from,
        to: selection.to,
      }
      : stored?.range ?? null,
  });

  return true;
};

export const runEditorCommand = (
  editor: Editor | null,
  command: EditorCommand,
  options?: {
    preferExpandedSelection?: boolean;
    selection?: EditorSelectionSnapshot | null;
  },
) => {
  if (!editor) {
    return false;
  }

  if (options?.selection || getRememberedEditorSelection(editor, { preferExpanded: options?.preferExpandedSelection })) {
    restoreEditorSelection(editor, options?.selection, {
      preferExpanded: options?.preferExpandedSelection,
    });
  } else {
    rememberEditorSelection(editor);
  }

  const result = command(editor);
  rememberEditorSelection(editor);

  return result !== false;
};
