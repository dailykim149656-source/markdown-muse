import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

export interface FindReplaceMatch {
  from: number;
  to: number;
}

export interface FindReplaceHighlightState {
  currentIndex: number;
  decorations: DecorationSet;
  matches: FindReplaceMatch[];
  searchText: string;
}

interface FindReplaceMeta {
  currentIndex?: number;
  searchText?: string;
}

interface FindReplaceTarget {
  state: EditorState;
  view: EditorView;
}

export const findReplaceHighlightKey = new PluginKey<FindReplaceHighlightState>("findReplaceHighlight");

const createEmptyState = (): FindReplaceHighlightState => ({
  currentIndex: 0,
  decorations: DecorationSet.empty,
  matches: [],
  searchText: "",
});

const normalizeIndex = (index: number, matchCount: number) => {
  if (matchCount === 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), matchCount - 1);
};

const getMatches = (state: EditorState, searchText: string): FindReplaceMatch[] => {
  if (!searchText.trim()) {
    return [];
  }

  const lowerSearch = searchText.toLowerCase();
  const matches: FindReplaceMatch[] = [];

  state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }

    const lowerText = node.text.toLowerCase();
    let startIndex = 0;

    while (startIndex < lowerText.length) {
      const matchIndex = lowerText.indexOf(lowerSearch, startIndex);

      if (matchIndex === -1) {
        break;
      }

      const from = pos + matchIndex;
      const to = from + searchText.length;
      matches.push({ from, to });
      startIndex = matchIndex + Math.max(searchText.length, 1);
    }
  });

  return matches;
};

const buildDecorations = (state: EditorState, matches: FindReplaceMatch[], currentIndex: number) => {
  if (matches.length === 0) {
    return DecorationSet.empty;
  }

  const decorations = matches.map((match, index) => Decoration.inline(match.from, match.to, {
    class: index === currentIndex ? "find-replace-match-current" : "find-replace-match",
  }));

  return DecorationSet.create(state.doc, decorations);
};

const createPluginState = (state: EditorState, searchText: string, currentIndex: number): FindReplaceHighlightState => {
  if (!searchText.trim()) {
    return createEmptyState();
  }

  const matches = getMatches(state, searchText);
  const normalizedIndex = normalizeIndex(currentIndex, matches.length);

  return {
    currentIndex: normalizedIndex,
    decorations: buildDecorations(state, matches, normalizedIndex),
    matches,
    searchText,
  };
};

export const getFindReplaceHighlightState = (target: FindReplaceTarget | null) => {
  if (!target) {
    return null;
  }

  return findReplaceHighlightKey.getState(target.state) ?? null;
};

export const updateFindReplaceHighlights = (
  target: FindReplaceTarget,
  searchText: string,
  currentIndex = 0
) => {
  target.view.dispatch(target.state.tr.setMeta(findReplaceHighlightKey, {
    currentIndex,
    searchText,
  } satisfies FindReplaceMeta));

  return getFindReplaceHighlightState(target);
};

export const clearFindReplaceHighlights = (target: FindReplaceTarget) => {
  target.view.dispatch(target.state.tr.setMeta(findReplaceHighlightKey, {
    currentIndex: 0,
    searchText: "",
  } satisfies FindReplaceMeta));

  return getFindReplaceHighlightState(target);
};

const FindReplaceHighlight = Extension.create({
  name: "findReplaceHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin<FindReplaceHighlightState>({
        key: findReplaceHighlightKey,
        state: {
          init: (_, state) => createEmptyState(),
          apply: (transaction, pluginState, _, newState) => {
            const meta = transaction.getMeta(findReplaceHighlightKey) as FindReplaceMeta | undefined;
            const searchText = meta?.searchText ?? pluginState.searchText;
            const currentIndex = meta?.currentIndex ?? pluginState.currentIndex;

            if (transaction.docChanged || meta) {
              return createPluginState(newState, searchText, currentIndex);
            }

            return pluginState;
          },
        },
        props: {
          decorations(state) {
            return findReplaceHighlightKey.getState(state)?.decorations ?? null;
          },
        },
      }),
    ];
  },
});

export default FindReplaceHighlight;
