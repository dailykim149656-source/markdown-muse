# Google Docs Sync Support Matrix

Date: 2026-03-12
Status: Current implementation reference
Scope: What the current Docsy <-> Google Docs workflow preserves, degrades, or warns about

## Purpose

This document makes the current Google Docs support boundary explicit.

Use it when:

- planning live validation
- explaining current product limits
- reviewing bug reports about sync fidelity
- deciding whether a document is a good candidate for Google Docs export or save

## Notes on interpretation

- This matrix reflects the current mapper behavior in `server/modules/workspace/googleDocsMapper.ts`.
- "Preserved" means the current mapper explicitly supports the structure.
- "Degraded" means the flow continues but the representation is flattened or reduced.
- "Warned" means the current mapper emits a sync warning when it detects the structure.

## Supported and preserved

| Structure | Current status | Notes |
| --- | --- | --- |
| Paragraphs | Preserved | Basic paragraph content is supported |
| Headings 1-3 | Preserved | Current mapper recognizes `#`, `##`, `###` |
| Bullet lists | Preserved | Standard `-` or `*` list lines are mapped |
| Ordered lists | Preserved | `1.` style lists are mapped |
| Bold | Preserved | Markdown `**bold**` is supported |
| Italic | Preserved | Markdown `*italic*` is supported |
| Strikethrough | Preserved | Markdown `~~strike~~` is supported |
| Underline | Preserved with limited syntax | Current mapper recognizes `<u>...</u>` |
| Links | Preserved | Markdown link syntax is supported |
| Plain text line flow | Preserved | Content is converted into Google Docs text insertion requests |

## Supported with reduced fidelity

| Structure | Current status | Notes |
| --- | --- | --- |
| Rich-text source document exported to Google Docs | Supported | Export creates a new Google Doc and binds the current tab |
| Google-bound document save | Supported | Bound rich-text documents can save back to Google Docs |
| Imported Google Docs refresh | Supported | Existing local doc id can be preserved during refresh |
| Some inline formatting | Reduced | Mapper warns that some inline formatting is reduced during sync |

## Degraded or flattened

| Structure | Current status | Notes |
| --- | --- | --- |
| Block quotes | Degraded | Flattened during sync |
| Admonition-like blocks | Degraded | Flattened during sync |
| Cross-references | Degraded | Flattened during sync |

## Warned and not preserved well

| Structure | Current status | Warning behavior |
| --- | --- | --- |
| Code fences | Warned | `Code fences are not preserved in Google Docs sync.` |
| Math blocks | Warned | `Math blocks are not preserved in Google Docs sync.` |
| Images | Warned | `Images are not preserved in Google Docs sync.` |
| Markdown tables | Warned | `Markdown tables are not preserved in Google Docs sync.` |
| TOC placeholders | Warned | `TOC placeholders are not preserved in Google Docs sync.` |
| Footnotes | Warned | `Footnotes are not preserved in Google Docs sync.` |

## Not eligible for Google Docs export

| Document type | Current status | Notes |
| --- | --- | --- |
| JSON documents | Not supported for export | Google Docs export is disabled in the UI |
| YAML documents | Not supported for export | Google Docs export is disabled in the UI |

## Practical guidance

### Best candidates for Google Docs export or save

- procedure docs
- runbooks
- meeting notes
- SOPs built from headings, paragraphs, lists, and links

### Risky candidates

- docs with heavy table usage
- docs with diagrams, images, or code blocks
- docs that depend on footnotes or internal cross-references
- docs using richer Docsy-only structures

## Product surfaces that show sync state or warnings

Current product surfaces:

- header workspace badge
- document tabs workspace label
- file sidebar workspace label
- patch review warning summary
- Google dropdown actions for export and save

## Recommended usage in validation

When running live Google Workspace QA:

1. use one "safe" document containing only supported structures
2. use one "lossy" document containing tables, images, code fences, or footnotes
3. record whether warnings match the structures present
4. confirm users can still complete the review-first flow without silent corruption
