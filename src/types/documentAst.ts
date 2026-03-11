import type { EditorMode } from "./document";

export type DocumentVersion = "1.0";
export type NodeId = string;
export type TextAlign = "left" | "center" | "right" | "justify";
export type ImageAlign = "left" | "center" | "right";
export type HeadingLevel = 1 | 2 | 3;

export interface SourceFileReference {
  sourceId: string;
  fileName: string;
  sourceFormat: string;
  importedAt: number;
}

export interface DocumentMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  authors?: string[];
  labels?: Record<string, string>;
  sourceFiles?: SourceFileReference[];
}

export interface BaseDocumentEnvelope {
  docId: string;
  name: string;
  primaryMode: EditorMode;
  createdAt: number;
  updatedAt: number;
  version: DocumentVersion;
  metadata: DocumentMetadata;
}

export interface RichTextDocument extends BaseDocumentEnvelope {
  kind: "rich_text";
  ast: DocumentAst;
}

export interface StructuredDataDocument extends BaseDocumentEnvelope {
  kind: "structured_data";
  structured: StructuredDataAst;
}

export type DocsyDocument = RichTextDocument | StructuredDataDocument;

export interface DocumentAst {
  type: "document";
  nodeId: NodeId;
  blocks: BlockNode[];
}

export interface BaseNode {
  type: string;
  nodeId: NodeId;
}

export interface BaseBlockNode extends BaseNode {
  kind: "block";
}

export interface BaseInlineNode extends BaseNode {
  kind: "inline";
}

export interface HeadingNode extends BaseBlockNode {
  type: "heading";
  level: HeadingLevel;
  align?: TextAlign;
  children: InlineNode[];
}

export interface ParagraphNode extends BaseBlockNode {
  type: "paragraph";
  align?: TextAlign;
  children: InlineNode[];
}

export interface BlockQuoteNode extends BaseBlockNode {
  type: "blockquote";
  blocks: BlockNode[];
}

export interface CodeBlockNode extends BaseBlockNode {
  type: "code_block";
  language?: string;
  code: string;
}

export interface BulletListNode extends BaseBlockNode {
  type: "bullet_list";
  items: ListItemNode[];
}

export interface OrderedListNode extends BaseBlockNode {
  type: "ordered_list";
  start?: number;
  items: ListItemNode[];
}

export interface TaskListNode extends BaseBlockNode {
  type: "task_list";
  items: TaskListItemNode[];
}

export interface ListItemNode extends BaseBlockNode {
  type: "list_item";
  blocks: BlockNode[];
}

export interface TaskListItemNode extends BaseBlockNode {
  type: "task_list_item";
  checked: boolean;
  blocks: BlockNode[];
}

export interface HorizontalRuleNode extends BaseBlockNode {
  type: "horizontal_rule";
}

export interface ImageNode extends BaseBlockNode {
  type: "image";
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  align?: ImageAlign;
}

export interface FigureCaptionNode extends BaseBlockNode {
  type: "figure_caption";
  captionType: "figure" | "table";
  label?: string;
  targetNodeId?: NodeId;
  children: InlineNode[];
}

export interface TableNode extends BaseBlockNode {
  type: "table";
  rows: TableRowNode[];
}

export interface TableRowNode extends BaseNode {
  type: "table_row";
  cells: TableCellNode[];
}

export interface TableCellNode extends BaseNode {
  type: "table_cell";
  role: "header" | "body";
  align?: "left" | "center" | "right";
  blocks: BlockNode[];
}

export interface MathBlockNode extends BaseBlockNode {
  type: "math_block";
  latex: string;
}

export interface MermaidBlockNode extends BaseBlockNode {
  type: "mermaid_block";
  code: string;
}

export interface AdmonitionNode extends BaseBlockNode {
  type: "admonition";
  admonitionType: "note" | "warning" | "tip" | "danger" | "custom";
  title?: string;
  icon?: string;
  color?: string;
  blocks: BlockNode[];
}

export interface TableOfContentsNode extends BaseBlockNode {
  type: "table_of_contents";
  maxDepth?: HeadingLevel;
}

export interface FootnoteItemNode extends BaseBlockNode {
  type: "footnote_item";
  footnoteId: string;
  children: InlineNode[];
}

export interface TextNode {
  type: "text";
  text: string;
  marks?: Mark[];
}

export interface HardBreakNode extends BaseInlineNode {
  type: "hard_break";
}

export interface MathInlineNode extends BaseInlineNode {
  type: "math_inline";
  latex: string;
}

export interface CrossReferenceNode extends BaseInlineNode {
  type: "cross_reference";
  targetNodeId?: NodeId;
  targetLabel: string;
  referenceKind?: "figure" | "table" | "section" | "unknown";
}

export interface FootnoteRefNode extends BaseInlineNode {
  type: "footnote_ref";
  footnoteId: string;
}

export interface BoldMark {
  type: "bold";
}

export interface ItalicMark {
  type: "italic";
}

export interface UnderlineMark {
  type: "underline";
}

export interface StrikeMark {
  type: "strike";
}

export interface CodeMark {
  type: "code";
}

export interface HighlightMark {
  type: "highlight";
}

export interface SubscriptMark {
  type: "subscript";
}

export interface SuperscriptMark {
  type: "superscript";
}

export interface LinkMark {
  type: "link";
  href: string;
  title?: string;
}

export interface TextStyleMark {
  type: "text_style";
  color?: string;
  fontFamily?: string;
  fontSize?: string;
}

export type Mark =
  | BoldMark
  | ItalicMark
  | UnderlineMark
  | StrikeMark
  | CodeMark
  | HighlightMark
  | SubscriptMark
  | SuperscriptMark
  | LinkMark
  | TextStyleMark;

export type BlockNode =
  | HeadingNode
  | ParagraphNode
  | BlockQuoteNode
  | CodeBlockNode
  | BulletListNode
  | OrderedListNode
  | TaskListNode
  | ListItemNode
  | TaskListItemNode
  | HorizontalRuleNode
  | ImageNode
  | FigureCaptionNode
  | TableNode
  | MathBlockNode
  | MermaidBlockNode
  | AdmonitionNode
  | TableOfContentsNode
  | FootnoteItemNode;

export type InlineNode =
  | TextNode
  | HardBreakNode
  | MathInlineNode
  | CrossReferenceNode
  | FootnoteRefNode;

export interface StructuredDataAst {
  format: "json" | "yaml";
  root: StructuredValue;
  schema?: JsonSchemaReference;
}

export type StructuredValue = StructuredScalar | StructuredArray | StructuredObject;

export interface StructuredScalar {
  type: "scalar";
  valueType: "string" | "number" | "boolean" | "null";
  value: string | number | boolean | null;
}

export interface StructuredArray {
  type: "array";
  items: StructuredValue[];
}

export interface StructuredObject {
  type: "object";
  properties: StructuredProperty[];
}

export interface StructuredProperty {
  key: string;
  value: StructuredValue;
}

export interface JsonSchemaReference {
  schemaId?: string;
  rawSchema?: unknown;
}

export interface DerivedHeadingIndexEntry {
  nodeId: NodeId;
  level: HeadingLevel;
  text: string;
}

export interface DerivedImageIndexEntry {
  alt?: string;
  nodeId: NodeId;
  src: string;
  title?: string;
}

export interface DerivedDocumentIndex {
  headings: DerivedHeadingIndexEntry[];
  images: DerivedImageIndexEntry[];
  labels: Record<string, NodeId>;
  footnotes: Record<string, NodeId>;
}

export interface NodePatchTarget {
  targetType: "node";
  nodeId: NodeId;
}

export interface TextRangePatchTarget {
  targetType: "text_range";
  nodeId: NodeId;
  startOffset: number;
  endOffset: number;
}

export interface AttributePatchTarget {
  targetType: "attribute";
  nodeId: NodeId;
  attributePath: string;
}

export interface StructuredPathPatchTarget {
  targetType: "structured_path";
  path: string;
}

export type PatchTarget =
  | NodePatchTarget
  | TextRangePatchTarget
  | AttributePatchTarget
  | StructuredPathPatchTarget;

export type PatchOperation =
  | "insert_before"
  | "insert_after"
  | "replace_node"
  | "delete_node"
  | "replace_text_range"
  | "update_attribute";

export interface PatchPrecondition {
  expectedNodeHash?: string;
  expectedText?: string;
}
