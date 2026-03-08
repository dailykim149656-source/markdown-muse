# Docsy Document AST Design Spec

Version: `v0.1`  
Date: `2026-03-09`  
Related Documents:
- `PRD/docsy_prd_v0.2.docx`
- `PRD/docsy_system_architecture_v0.2.docx`
- `PRD/docsy_execution_plan_v0.1.md`
- `PRD/docsy_issue_backlog_v0.1.md`

## 1. Purpose

This document defines the canonical document model for Docsy.

Its purpose is to replace the current architecture tendency of:

- source format -> HTML intermediate -> target format

with a future architecture centered on:

- source format -> Document AST -> target format

This spec is also the foundation for:

- patch-based update review,
- stable cross-document analysis,
- section-level ingestion,
- and future AI-assisted document updates.

## 2. Scope

This spec covers:

- the canonical document envelope,
- the rich-text technical writing AST,
- the structured data model for JSON and YAML documents,
- stable node identity,
- reference semantics,
- and patch targeting requirements derived from the AST.

This spec does not yet define:

- AI prompt contracts,
- retrieval ranking logic,
- vector storage design,
- collaboration protocol,
- or final database persistence format.

## 3. Design Goals

The AST must satisfy all of the following.

### 3.1 Fidelity

It must represent the current editor feature set without losing meaning:

- headings
- paragraphs
- code blocks
- tables
- images
- figure captions
- footnotes
- admonitions
- math
- mermaid diagrams
- cross references
- table of contents placeholder

### 3.2 Stable identity

Patch review and AI suggestions require stable targets. The AST must make it possible to target:

- a block,
- an inline atom,
- an attribute,
- or a text span

without relying on DOM location.

### 3.3 Format independence

The AST must be independent of:

- HTML markup shape,
- TipTap internal JSON shape,
- and export format syntax.

### 3.4 Incremental migration

The system must support a hybrid phase where:

- current HTML-based exporters still exist,
- while AST-native serializers/exporters are introduced gradually.

### 3.5 Explicit reviewability

The AST must make it possible to produce and apply patches that are:

- previewable,
- rejectable,
- editable,
- and conflict-detectable.

## 4. Current Implementation Context

The current codebase already has a usable editor/export MVP, but no canonical AST.

Current relevant implementation facts:

- `DocumentData` is defined in `src/components/editor/useAutoSave.ts`
- editor mode is one of:
  - `markdown`
  - `latex`
  - `html`
  - `json`
  - `yaml`
- TipTap extensions currently include:
  - image
  - task list / task item
  - tables
  - underline
  - highlight
  - subscript
  - superscript
  - text alignment
  - color
  - font family
  - font size
  - math inline / block
  - mermaid block
  - admonition
  - footnote ref / item
  - table of contents
  - figure caption
  - cross reference

Therefore, the AST spec must cover both:

- standard rich-text structures,
- and Docsy-specific technical writing blocks.

## 5. Canonical Document Model

Docsy should not force every document into a single tree shape.

The correct canonical domain is a discriminated union:

- `RichTextDocument`
- `StructuredDataDocument`

This is necessary because JSON and YAML are not just alternate text syntaxes for the WYSIWYG editor. They are structured data artifacts with different editing, validation, and patch semantics.

## 6. Top-Level Envelope

All documents should share a common envelope.

```ts
type DocsyDocument = RichTextDocument | StructuredDataDocument;

interface BaseDocumentEnvelope {
  docId: string;
  name: string;
  primaryMode: "markdown" | "latex" | "html" | "json" | "yaml";
  createdAt: number;
  updatedAt: number;
  version: "1.0";
  metadata: DocumentMetadata;
}

interface DocumentMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  authors?: string[];
  labels?: Record<string, string>;
  sourceFiles?: SourceFileReference[];
}

interface SourceFileReference {
  sourceId: string;
  fileName: string;
  sourceFormat: string;
  importedAt: number;
}
```

### 6.1 Rich text document envelope

```ts
interface RichTextDocument extends BaseDocumentEnvelope {
  kind: "rich_text";
  ast: DocumentAst;
}
```

### 6.2 Structured data document envelope

```ts
interface StructuredDataDocument extends BaseDocumentEnvelope {
  kind: "structured_data";
  structured: StructuredDataAst;
}
```

## 7. Rich Text AST v1

The rich-text AST is the canonical model for:

- Markdown
- LaTeX
- HTML
- imported AsciiDoc
- imported RST
- and the internal WYSIWYG document state

## 7.1 Root shape

```ts
interface DocumentAst {
  type: "document";
  nodeId: string;
  blocks: BlockNode[];
}
```

The root `nodeId` exists for completeness and patch scoping, but most patch operations target child nodes.

## 7.2 Common node contracts

All nodes share a base shape.

```ts
interface BaseNode {
  type: string;
  nodeId: string;
}

interface BaseBlockNode extends BaseNode {
  kind: "block";
}

interface BaseInlineNode extends BaseNode {
  kind: "inline";
}
```

Rules:

- every block node has a `nodeId`
- every inline atom node has a `nodeId`
- plain text leaves do not need individual ids

## 7.3 Block node set

### `heading`

```ts
interface HeadingNode extends BaseBlockNode {
  type: "heading";
  level: 1 | 2 | 3;
  align?: "left" | "center" | "right" | "justify";
  children: InlineNode[];
}
```

### `paragraph`

```ts
interface ParagraphNode extends BaseBlockNode {
  type: "paragraph";
  align?: "left" | "center" | "right" | "justify";
  children: InlineNode[];
}
```

### `blockquote`

```ts
interface BlockQuoteNode extends BaseBlockNode {
  type: "blockquote";
  blocks: BlockNode[];
}
```

### `code_block`

```ts
interface CodeBlockNode extends BaseBlockNode {
  type: "code_block";
  language?: string;
  code: string;
}
```

### `bullet_list`

```ts
interface BulletListNode extends BaseBlockNode {
  type: "bullet_list";
  items: ListItemNode[];
}
```

### `ordered_list`

```ts
interface OrderedListNode extends BaseBlockNode {
  type: "ordered_list";
  start?: number;
  items: ListItemNode[];
}
```

### `task_list`

```ts
interface TaskListNode extends BaseBlockNode {
  type: "task_list";
  items: TaskListItemNode[];
}
```

### `list_item`

```ts
interface ListItemNode extends BaseBlockNode {
  type: "list_item";
  blocks: BlockNode[];
}
```

### `task_list_item`

```ts
interface TaskListItemNode extends BaseBlockNode {
  type: "task_list_item";
  checked: boolean;
  blocks: BlockNode[];
}
```

### `horizontal_rule`

```ts
interface HorizontalRuleNode extends BaseBlockNode {
  type: "horizontal_rule";
}
```

### `image`

```ts
interface ImageNode extends BaseBlockNode {
  type: "image";
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  align?: "left" | "center" | "right";
}
```

### `figure_caption`

```ts
interface FigureCaptionNode extends BaseBlockNode {
  type: "figure_caption";
  captionType: "figure" | "table";
  label?: string;
  targetNodeId?: string;
  children: InlineNode[];
}
```

Notes:

- `label` is the human-readable reference label such as `fig:system`
- `targetNodeId` is the canonical internal link to the referenced figure or table block when available

### `table`

```ts
interface TableNode extends BaseBlockNode {
  type: "table";
  rows: TableRowNode[];
}

interface TableRowNode extends BaseNode {
  type: "table_row";
  nodeId: string;
  cells: TableCellNode[];
}

interface TableCellNode extends BaseNode {
  type: "table_cell";
  nodeId: string;
  role: "header" | "body";
  align?: "left" | "center" | "right";
  blocks: BlockNode[];
}
```

### `math_block`

```ts
interface MathBlockNode extends BaseBlockNode {
  type: "math_block";
  latex: string;
}
```

### `mermaid_block`

```ts
interface MermaidBlockNode extends BaseBlockNode {
  type: "mermaid_block";
  code: string;
}
```

### `admonition`

```ts
interface AdmonitionNode extends BaseBlockNode {
  type: "admonition";
  admonitionType: "note" | "warning" | "tip" | "danger" | "custom";
  title?: string;
  icon?: string;
  color?: string;
  blocks: BlockNode[];
}
```

Important:

- collapsed or expanded state is editor UI state, not canonical document state

### `table_of_contents`

```ts
interface TableOfContentsNode extends BaseBlockNode {
  type: "table_of_contents";
  maxDepth?: 1 | 2 | 3;
}
```

Important:

- this node is a placeholder
- it does not persist copied heading text
- the heading list is derived at render/export time

### `footnote_item`

```ts
interface FootnoteItemNode extends BaseBlockNode {
  type: "footnote_item";
  footnoteId: string;
  children: InlineNode[];
}
```

Note:

- current implementation stores footnote item text as a plain string
- AST v1 upgrades it to inline-rich content for future fidelity and patchability

## 7.4 Inline node set

### `text`

```ts
interface TextNode {
  type: "text";
  text: string;
  marks?: Mark[];
}
```

### `hard_break`

```ts
interface HardBreakNode extends BaseInlineNode {
  type: "hard_break";
}
```

### `math_inline`

```ts
interface MathInlineNode extends BaseInlineNode {
  type: "math_inline";
  latex: string;
}
```

### `cross_reference`

```ts
interface CrossReferenceNode extends BaseInlineNode {
  type: "cross_reference";
  targetNodeId?: string;
  targetLabel: string;
  referenceKind?: "figure" | "table" | "section" | "unknown";
}
```

Rules:

- `targetNodeId` is preferred when available
- `targetLabel` is retained for human readability and fallback resolution

### `footnote_ref`

```ts
interface FootnoteRefNode extends BaseInlineNode {
  type: "footnote_ref";
  footnoteId: string;
}
```

## 7.5 Mark set

Marks apply only to `text` nodes.

```ts
type Mark =
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
```

### Standard emphasis marks

```ts
interface BoldMark { type: "bold"; }
interface ItalicMark { type: "italic"; }
interface UnderlineMark { type: "underline"; }
interface StrikeMark { type: "strike"; }
interface CodeMark { type: "code"; }
interface HighlightMark { type: "highlight"; }
interface SubscriptMark { type: "subscript"; }
interface SuperscriptMark { type: "superscript"; }
```

### `link`

```ts
interface LinkMark {
  type: "link";
  href: string;
  title?: string;
}
```

### `text_style`

```ts
interface TextStyleMark {
  type: "text_style";
  color?: string;
  fontFamily?: string;
  fontSize?: string;
}
```

## 7.6 AST unions

```ts
type BlockNode =
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

type InlineNode =
  | TextNode
  | HardBreakNode
  | MathInlineNode
  | CrossReferenceNode
  | FootnoteRefNode;
```

## 8. Structured Data AST

JSON and YAML must not be coerced into the rich-text AST.

They should use a separate canonical structure.

```ts
interface StructuredDataAst {
  format: "json" | "yaml";
  root: StructuredValue;
  schema?: JsonSchemaReference;
}

type StructuredValue =
  | StructuredScalar
  | StructuredArray
  | StructuredObject;

interface StructuredScalar {
  type: "scalar";
  valueType: "string" | "number" | "boolean" | "null";
  value: string | number | boolean | null;
}

interface StructuredArray {
  type: "array";
  items: StructuredValue[];
}

interface StructuredObject {
  type: "object";
  properties: StructuredProperty[];
}

interface StructuredProperty {
  key: string;
  value: StructuredValue;
}

interface JsonSchemaReference {
  schemaId?: string;
  rawSchema?: unknown;
}
```

This model exists so that future AI patching for JSON and YAML can target:

- object key paths,
- array item positions,
- and schema-informed fields

without abusing the rich-text AST.

## 9. Stable Node Identity

Stable identity is mandatory for patch review.

## 9.1 Identity rules

- every block node gets a `nodeId`
- every inline atom gets a `nodeId`
- plain text leaves do not get ids
- table rows and cells also get ids because table patches are otherwise fragile

## 9.2 Generation rules

- new node ids are generated at node creation time
- recommended format:
  - `doc_<id>`
  - `blk_<id>`
  - `inl_<id>`
  - `tbl_<id>`
  - `cell_<id>`
- implementation may use UUID or ULID

## 9.3 Preservation rules

- text edits inside a node preserve the node id
- mark changes preserve the node id
- attribute edits preserve the node id
- drag-and-drop moves preserve the node id
- copy/paste from another document generates new ids by default

## 9.4 Split and merge rules

- splitting a block:
  - first fragment keeps original id
  - new fragment gets a new id
- merging sibling blocks:
  - surviving block keeps its id
  - removed block id is retired

## 10. Reference Semantics

Cross references and captions must move from text-only linkage to canonical target linkage.

## 10.1 Current problem

Current references are label-based only.

That is not sufficient for robust patching because:

- labels can change,
- duplicate labels can exist temporarily,
- and imported documents may not preserve labels consistently.

## 10.2 Required rule

References should resolve in this order:

1. `targetNodeId`
2. `targetLabel`
3. heuristic fallback during import only

## 10.3 Figure and table captions

`figure_caption` should ideally point to the figure or table block it describes using `targetNodeId`.

This makes it possible to:

- renumber captions safely,
- patch caption text independently,
- and preserve cross-reference validity after reordering.

## 11. Derived Indexes

The canonical AST should remain simple.

The following should be derived indexes, not canonical duplicated state:

- heading index
- label index
- footnote index
- cross-reference resolution map
- table of contents entry list

Example:

```ts
interface DerivedDocumentIndex {
  headings: Array<{ nodeId: string; level: number; text: string }>;
  labels: Record<string, string>;
  footnotes: Record<string, string>;
}
```

## 12. Patch Target Semantics

The AST must support a patch system, so target semantics must be explicit now.

## 12.1 Patch target types

```ts
type PatchTarget =
  | NodePatchTarget
  | TextRangePatchTarget
  | AttributePatchTarget
  | StructuredPathPatchTarget;

interface NodePatchTarget {
  targetType: "node";
  nodeId: string;
}

interface TextRangePatchTarget {
  targetType: "text_range";
  nodeId: string;
  startOffset: number;
  endOffset: number;
}

interface AttributePatchTarget {
  targetType: "attribute";
  nodeId: string;
  attributePath: string;
}

interface StructuredPathPatchTarget {
  targetType: "structured_path";
  path: string;
}
```

## 12.2 Patch operations

Minimum operation set:

```ts
type PatchOperation =
  | "insert_before"
  | "insert_after"
  | "replace_node"
  | "delete_node"
  | "replace_text_range"
  | "update_attribute";
```

## 12.3 Conflict detection

Every patch should support an optional precondition:

```ts
interface PatchPrecondition {
  expectedNodeHash?: string;
  expectedText?: string;
}
```

If the precondition fails, the patch must not auto-apply silently.

## 13. Validation Rules

The AST serializer and hydrator must enforce these rules.

### Required validation rules

- root type must be `document`
- all block nodes must have unique ids
- all inline atom nodes must have unique ids
- heading level must be `1 | 2 | 3` in v1
- `footnote_ref.footnoteId` should resolve to exactly one `footnote_item`
- `cross_reference.targetNodeId` should resolve when present
- table rows must contain one or more cells
- image nodes must have `src`
- math nodes must have `latex`
- mermaid nodes must have `code`

### Soft validation warnings

- figure caption label duplicates
- unresolved cross-reference labels
- footnote refs without item
- footnote items without ref

## 14. Serialization Boundaries

## 14.1 Required serializers

- TipTap document -> AST
- AST -> TipTap document
- Markdown -> AST
- HTML -> AST
- LaTeX -> AST
- AsciiDoc -> AST
- RST -> AST
- JSON/YAML -> StructuredDataAst

## 14.2 Required exporters

- AST -> Markdown
- AST -> HTML
- AST -> LaTeX
- AST -> Typst
- AST -> AsciiDoc
- AST -> RST
- AST -> PDF render input

## 14.3 Hybrid migration rule

During migration, some exporters may temporarily remain:

- AST -> HTML -> target format

But the long-term target remains:

- AST -> target format directly

## 15. Example Rich Text AST

```json
{
  "type": "document",
  "nodeId": "doc_01",
  "blocks": [
    {
      "type": "heading",
      "kind": "block",
      "nodeId": "blk_001",
      "level": 1,
      "children": [
        { "type": "text", "text": "System Overview" }
      ]
    },
    {
      "type": "paragraph",
      "kind": "block",
      "nodeId": "blk_002",
      "children": [
        { "type": "text", "text": "See " },
        {
          "type": "cross_reference",
          "kind": "inline",
          "nodeId": "inl_101",
          "targetNodeId": "blk_900",
          "targetLabel": "fig:system",
          "referenceKind": "figure"
        },
        { "type": "text", "text": " for the architecture diagram." }
      ]
    },
    {
      "type": "mermaid_block",
      "kind": "block",
      "nodeId": "blk_900",
      "code": "graph TD\\nA-->B"
    },
    {
      "type": "figure_caption",
      "kind": "block",
      "nodeId": "blk_901",
      "captionType": "figure",
      "label": "fig:system",
      "targetNodeId": "blk_900",
      "children": [
        { "type": "text", "text": "Overall system architecture" }
      ]
    }
  ]
}
```

## 16. Migration Plan

## Phase A

- centralize domain types
- define AST types in source code
- add AST fixtures

## Phase B

- build TipTap -> AST serializer
- build AST -> TipTap hydrator
- add round-trip tests

## Phase C

- route preview/export through AST-generated HTML where possible
- add first AST-native exporters

## Phase D

- define patch schema against AST target semantics
- build patch preview/apply flow

## Phase E

- attach ingestion, chunking, and AI workflows to canonical document model

## 17. Implementation Recommendation

The first implementation deliverables should be:

1. `src/types/document.ts`
2. `src/types/documentAst.ts`
3. `src/types/structuredDataAst.ts`
4. AST fixture files for rich technical documents
5. TipTap -> AST serializer test suite

## 18. Open Decisions

These decisions should be resolved early, but they do not block the first spec implementation.

### Decision 1

Should footnotes remain inline-rich only, or allow block-rich content in a later AST version?

Recommendation:

- use inline-rich content in v1
- leave block-rich footnotes for a future version if needed

### Decision 2

Should captions be separate blocks or attached to figures/tables directly?

Recommendation:

- keep them as separate blocks in v1 because that matches current editor behavior and simplifies migration

### Decision 3

Should section references target headings by node id only, or also maintain human-readable slug ids?

Recommendation:

- store `nodeId` as canonical target
- derive slug ids at render/export time

## 19. Final Recommendation

Docsy should adopt:

- a union document model,
- a canonical rich-text AST,
- a separate structured data AST for JSON/YAML,
- and node-id-based patch targeting.

This is the minimum architecture that makes the PRD's AI patch-review workflow technically credible.
