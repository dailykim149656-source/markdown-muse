# Web Performance Optimization Summary

Date: 2026-03-10

## Goal

Keep the desktop editor feature-complete while making the web build cheaper to
open and safer to deploy as a static frontend plus AI API.

## Implemented Changes

### Runtime profiles

- Added `desktop` and `web` runtime profiles with `VITE_APP_PROFILE`.
- Desktop keeps all editing surfaces visible by default.
- Web defaults to a lighter editor shell and activates heavy features on
  demand.

### Lazy runtime boundaries

- AI runtime moved behind a lazy boundary.
- Knowledge and history sidebars remain lazy-mounted.
- Structured editor remains lazy-loaded.
- Share, patch review, template dialogs, and advanced editor tools are loaded
  only when needed.

### Editor capability tiers

- Split editor capabilities into three layers:
  - `core`
  - `document`
  - `advanced`
- `core`
  Text, headings, lists, blockquote, inline code, link, and basic text styles.
- `document`
  Tables, images, captions, cross-references, footnotes, admonitions, TOC,
  code-block highlighting, and font controls.
- `advanced`
  Math and Mermaid.

### Web defaults

- Web opens with `core` editing only.
- Document tools are opt-in via a dedicated UI action.
- Advanced blocks are opt-in via a dedicated UI action.
- If a document already contains document-tool or advanced nodes, the editor
  auto-promotes before mounting to avoid content loss.
- JSON and YAML remain supported but are not shown in the default web mode
  switch.

### Persistence and IO

- Autosave persistence was decoupled from `.docsy` serialization.
- `.docsy` remains the richer save/export/share format.
- Structured import/export and patch parsing stay behind action-time dynamic
  imports.

### Assets

- Added smaller logo and preview image variants for lighter default loading in
  header and landing.

## Current Outcome

### What is lighter now

- The web editor no longer opens with all tools active.
- Document tools and advanced tools are split into separate lazy chunks.
- AI, history, knowledge, share, and structured editing are not initialized
  until needed.
- Header and landing use smaller image assets by default.

## Representative Bundle Snapshot

The following numbers summarize the recent web-oriented build after the editor
was split into `core`, `document`, and `advanced` layers.

| Asset | Approx size | Notes |
| --- | --- | --- |
| `/editor` main chunk | `~270KB raw / ~79KB gzip` | Default web route |
| `EditorToolbarDocumentTools` | `~21KB raw` | Loaded after document tools are enabled |
| `EditorToolbarAdvancedTools` | `~3KB raw` | Loaded after advanced blocks are enabled |
| `editorConfigDocument` | `~17KB raw` | Document feature extension bundle |
| `editorConfigAdvanced` | `~8KB raw` | Math and Mermaid extension bundle |
| `AiAssistantRuntime` | `~1.4KB raw` | AI runtime shell, lazy loaded |

### What is still heavy

- `tiptap-vendor` remains large.
- `math-vendor` and `mermaid.core` remain large when requested.
- AST/docsy shared utilities still keep some common code close to the editor
  route.

## Desktop Compatibility

Desktop is still full-featured by design.

- Profile flags default to enabled on desktop:
  - document tools
  - advanced blocks
  - structured modes
  - AI runtime
  - history
  - knowledge
- The desktop build continues to expose the full UI surface.
- Internal lazy loading is allowed, but feature availability is unchanged.

## Deployment Model

- Frontend can be deployed as a static build.
- AI requests are handled by the Node proxy server.
- The recommended GCP shape is:
  - static frontend on Cloud Storage + HTTPS Load Balancer + Cloud CDN
  - AI proxy on Cloud Run

See also:

- [GCP deployment guide](gcp-deployment.md)

## Build Commands

```bash
# Desktop-oriented production build
npm run build

# Web-oriented production build
npm run build:web
```

## Remaining Optimization Targets

The next meaningful wins are:

1. Reduce `tiptap-vendor` further by trimming or re-architecting core editor
   dependencies.
2. Break apart shared AST/docsy dependencies that still leak into the web
   editor route.
3. Narrow AI and knowledge shared utilities so they stop pulling comparison and
   analysis code into route-adjacent chunks.
