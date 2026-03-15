import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import FontFamily from "@tiptap/extension-font-family";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { Table as TableExt } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import { createLowlight } from "lowlight";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import plaintext from "highlight.js/lib/languages/plaintext";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import AdmonitionExtension from "./extensions/AdmonitionExtension";
import CrossReference from "./extensions/CrossReference";
import FigureCaption from "./extensions/FigureCaption";
import FontSize from "./extensions/FontSize";
import FindReplaceHighlight from "./extensions/FindReplaceHighlight";
import { FootnoteItem, FootnoteRef } from "./extensions/FootnoteExtension";
import NodeIdExtension from "./extensions/NodeIdExtension";
import ResizableImage from "./extensions/ResizableImage";
import {
  LatexAbstractExtension,
  LatexTitleBlockExtension,
  OpaqueLatexBlockExtension,
  ResumeEntryExtension,
  ResumeHeaderExtension,
  ResumeSkillRowExtension,
  ResumeSummaryExtension,
} from "./extensions/ResumeLatexExtensions";
import TableOfContents from "./extensions/TableOfContents";

const lowlight = createLowlight({
  bash,
  css,
  html: xml,
  javascript,
  js: javascript,
  json,
  markdown,
  plaintext,
  shell: bash,
  ts: typescript,
  typescript,
  xml,
  yaml,
});

export const createDocumentEditorExtensions = () => [
  CodeBlockLowlight.configure({ lowlight }),
  HorizontalRule,
  ResizableImage,
  TableExt.configure({ resizable: true }),
  TableRow,
  TableCell,
  TableHeader,
  FontFamily,
  FontSize,
  AdmonitionExtension,
  FootnoteRef,
  FootnoteItem,
  TableOfContents,
  FigureCaption,
  CrossReference,
  ResumeHeaderExtension,
  ResumeSummaryExtension,
  ResumeEntryExtension,
  ResumeSkillRowExtension,
  LatexTitleBlockExtension,
  LatexAbstractExtension,
  OpaqueLatexBlockExtension,
  FindReplaceHighlight,
  NodeIdExtension,
];
