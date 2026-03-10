import Blockquote from "@tiptap/extension-blockquote";
import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import Code from "@tiptap/extension-code";
import Color from "@tiptap/extension-color";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import History from "@tiptap/extension-history";
import Italic from "@tiptap/extension-italic";
import LinkExt from "@tiptap/extension-link";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import Strike from "@tiptap/extension-strike";
import SubscriptExt from "@tiptap/extension-subscript";
import SuperscriptExt from "@tiptap/extension-superscript";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Text from "@tiptap/extension-text";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import UnderlineExt from "@tiptap/extension-underline";

export const createCoreEditorExtensions = (placeholder: string) => [
  Document,
  Paragraph,
  Text,
  HardBreak,
  History,
  Bold,
  Italic,
  Strike,
  Code,
  Blockquote,
  BulletList,
  OrderedList,
  ListItem,
  Heading.configure({ levels: [1, 2, 3] }),
  Placeholder.configure({ placeholder }),
  UnderlineExt,
  TaskList,
  TaskItem.configure({ nested: true }),
  LinkExt.configure({
    openOnClick: false,
    HTMLAttributes: { class: "text-primary underline cursor-pointer" },
  }),
  Highlight.configure({ multicolor: false }),
  SubscriptExt,
  SuperscriptExt,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TextStyle,
  Color,
];

export const editorPropsDefault = {
  attributes: {
    class: "prose prose-neutral dark:prose-invert max-w-none focus:outline-none",
  },
  handleDOMEvents: {
    keydown: (view, event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return false;
      }

      event.preventDefault();
      event.stopPropagation();

      const { state, dispatch } = view;
      const tabText = "  ";

      if (event.shiftKey) {
        if (state.selection.from !== state.selection.to || state.selection.$from.depth === 0) {
          return true;
        }

        const from = state.selection.from;
        const lineStart = state.selection.$from.start();
        const prefix = state.doc.textBetween(lineStart, from, "", "\n");
        const match = prefix.match(/[ \t]+$/);

        if (!match) {
          return true;
        }

        const removeCount = Math.min(2, match[0].length);
        dispatch(state.tr.delete(from - removeCount, from).scrollIntoView());
        return true;
      }

      dispatch(state.tr.insertText(tabText, state.selection.from, state.selection.to).scrollIntoView());
      return true;
    },
  },
};
