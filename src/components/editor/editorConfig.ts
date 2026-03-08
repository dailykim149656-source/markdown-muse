import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExt from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import ResizableImage from "./extensions/ResizableImage";
import LinkExt from "@tiptap/extension-link";
import { Table as TableExt } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Highlight from "@tiptap/extension-highlight";
import SubscriptExt from "@tiptap/extension-subscript";
import SuperscriptExt from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import FontSize from "./extensions/FontSize";
import { MathExtension, MathBlockExtension } from "./extensions/MathExtension";
import MermaidBlock from "./extensions/MermaidBlock";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import AdmonitionExtension from "./extensions/AdmonitionExtension";
import { FootnoteRef, FootnoteItem } from "./extensions/FootnoteExtension";
import TableOfContents from "./extensions/TableOfContents";
import FigureCaption from "./extensions/FigureCaption";
import CrossReference from "./extensions/CrossReference";
import FindReplaceHighlight from "./extensions/FindReplaceHighlight";

const lowlight = createLowlight(common);

export const createEditorExtensions = (placeholder: string) => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: false,
  }),
  CodeBlockLowlight.configure({ lowlight }),
  Placeholder.configure({ placeholder }),
  UnderlineExt,
  TaskList,
  TaskItem.configure({ nested: true }),
  ResizableImage,
  LinkExt.configure({
    openOnClick: false,
    HTMLAttributes: { class: "text-primary underline cursor-pointer" },
  }),
  TableExt.configure({ resizable: true }),
  TableRow,
  TableCell,
  TableHeader,
  Highlight.configure({ multicolor: false }),
  SubscriptExt,
  SuperscriptExt,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  MathExtension,
  MathBlockExtension,
  MermaidBlock,
  AdmonitionExtension,
  FootnoteRef,
  FootnoteItem,
  TableOfContents,
  FigureCaption,
  CrossReference,
  FindReplaceHighlight,
];

export const editorPropsDefault = {
  attributes: {
    class: "prose prose-neutral dark:prose-invert max-w-none focus:outline-none",
  },
};
