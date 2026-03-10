# Implemented Features Summary

Date: 2026-03-11
Status: Current working implementation reference
Scope: Implemented product surfaces in the current repository

## Purpose

This document summarizes what is already implemented in Markdown Muse in a
format that is faster to scan during roadmap, release, and onboarding work.

## High-level assessment

Current repository position:

- core product scope is implemented
- review-first AI and cross-document maintenance are implemented
- user guide and landing onboarding are implemented
- remaining work is mostly QA, benchmark hardening, and optional expansion

## Feature matrix

| Area | Status | Main surfaces / files | Notes |
| --- | --- | --- | --- |
| Core editing | Implemented | `src/pages/Index.tsx`, `src/components/editor/MarkdownEditor.tsx`, `src/components/editor/LatexEditor.tsx`, `src/components/editor/HtmlEditor.tsx`, `src/components/editor/JsonYamlEditor.tsx` | Multi-document editing, rich-text editing, structured editing, source/WYSIWYG sync |
| Templates and creation | Implemented | `src/components/editor/TemplateDialog.tsx` | Locale-aware templates, fallback content, operations/engineering/project templates |
| Autosave and version history | Implemented | `src/hooks/useVersionHistory.ts`, `src/components/editor/VersionHistoryPanel.tsx` | Snapshot preview, restore, patch/export snapshot capture |
| Share and export | Implemented | `src/components/editor/ShareLinkDialog.tsx`, `src/hooks/useDocumentIO.ts` | Share links, QR, clipboard export, print, file export |
| AI authoring and analysis | Implemented | `src/components/editor/AiAssistantDialog.tsx`, `src/components/editor/AiAssistantRuntime.tsx`, `src/hooks/useAiAssistant.ts` | Summary, section generation, compare, update suggestions, procedure extraction, TOC |
| Patch Review | Implemented | `src/components/editor/PatchReviewDialog.tsx`, `src/components/editor/PatchReviewPanel.tsx`, `src/hooks/usePatchReview.ts` | Accept/reject/edit/apply, confidence metrics, provenance metrics, provenance-gap filtering |
| Knowledge index and retrieval | Implemented | `src/hooks/useKnowledgeBase.ts`, `src/lib/knowledge/knowledgeIndex.ts`, `src/components/editor/KnowledgeSearchPanel.tsx` | Local index, stale/fresh state, image retrieval, semantic rerank, strict keyword mode |
| Workspace Graph | Implemented | `src/pages/WorkspaceGraph.tsx`, `src/components/editor/GraphExplorerDialog.tsx`, `src/components/editor/WorkspaceGraphPanel.tsx` | Graph route, search, filters, issues-only, source-target chain, graph handoff |
| Diagnostics | Implemented | `src/components/editor/DocumentImpactPanel.tsx`, `src/components/editor/DocumentHealthPanel.tsx`, `src/components/editor/ConsistencyIssuesPanel.tsx`, `src/components/editor/ChangeMonitoringPanel.tsx` | Impact, health, consistency, change monitoring, priority/reason, causal explanation |
| Suggestion Queue | Implemented | `src/components/editor/SuggestionQueuePanel.tsx`, `src/pages/Index.tsx` | Multi-document queue, retry/rerun, dedupe, graph re-entry, patch review reopen |
| Operations and release gate | Implemented | `src/components/editor/KnowledgeOperationsPanel.tsx`, `src/components/editor/ReleaseChecklistPanel.tsx` | Queue health, provenance coverage, review progress, release checklist, summary copy |
| Mobile and responsive behavior | Implemented | `src/components/editor/EditorToolbar.tsx`, `src/components/editor/FileSidebar.tsx`, `src/components/editor/KnowledgeOperationsPanel.tsx` | Mobile toolbar overflow handling, More access, wrap-friendly actions, mobile sidebar close flow |
| Landing and guide | Implemented | `src/pages/Landing.tsx`, `src/pages/Guide.tsx`, `src/content/guideContent.ts` | Quick start, workflow cards, feature guidance, visual tour, search, FAQ, audience filters, scenarios |
| Validation baseline | Implemented | `src/test/guidePage.test.tsx`, `src/test/dialogSmoke.test.tsx`, `src/test/knowledgeOperationsPanel.test.tsx`, `src/test/patchReviewMetrics.test.tsx`, `src/test/suggestionQueuePanel.test.tsx`, `src/test/i18nCoverage.test.ts` | Focused regression coverage exists and production build passes |

## Format and workflow support

| Capability | Status | Notes |
| --- | --- | --- |
| Markdown rich-text editing | Implemented | Primary rich-text workflow |
| LaTeX rich-text editing | Implemented | Live editing with rich-text path |
| HTML rich-text editing | Implemented | Rich-text workflow with HTML source compatibility |
| JSON editing | Implemented | Structured editing path |
| YAML editing | Implemented | Structured editing path |
| Typst export | Implemented | Export surface |
| AsciiDoc import/export | Implemented | Import/export surface |
| RST import/export | Implemented | Import/export surface |
| PDF output | Implemented | Export and print-oriented workflow |
| `.docsy` persistence | Implemented | Richer editor-state preservation |

## Review-first guarantees

| Guarantee | Status | Notes |
| --- | --- | --- |
| AI output does not auto-apply | Preserved | Patch Review remains mandatory before mutation |
| Provenance is surfaced in review flows | Implemented | Queue and Patch Review expose provenance-related state |
| Confidence is surfaced in review flows | Implemented | Queue and Patch Review expose confidence tiers |
| Cross-document suggestions preserve context | Implemented | Source/target, issue metadata, and queue context are carried forward |

## Remaining follow-up work

These items are not missing core product scope, but remain useful follow-up work.

| Follow-up item | Current state | Why it still matters |
| --- | --- | --- |
| Hard benchmark-backed performance thresholds | Partially implemented | UI guidance exists, but benchmarked operating limits are not finalized |
| Retrieval beyond heuristic expansion | Partially implemented | Semantic assist exists, but embedding/vector retrieval is not implemented |
| Final real-workspace manual QA | Pending | Focused regression coverage exists, but final sign-off still benefits from representative workspace testing |
| Additional guide examples and state-specific screenshots | In progress | Guide exists, but can still become more scenario-rich |

## Practical summary

Markdown Muse should now be treated as:

- a feature-rich release candidate
- a review-first editor with cross-document maintenance flows
- a product that already needs onboarding and operator documentation
