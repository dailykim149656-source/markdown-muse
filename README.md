# Markdown Muse

Markdown Muse is a local-first technical document editor built around `.docsy`,
`Document AST`, and reviewable AI patch workflows.

## Language

- [Korean README](README.ko.md)
- [English README](README.en.md)

## Quick Summary

- Multi-format editing for Markdown, LaTeX, HTML, JSON, YAML, AsciiDoc, and RST
- `.docsy` persistence with richer editor state preservation
- AST-based rendering, validation, and patch application
- Review-first AI summaries, section generation, comparisons, and updates
- Local knowledge indexing and search
- Version history with local snapshot restore
- Share-link and QR-based lightweight document sharing
- Clipboard export for Markdown, HTML, JSON, and YAML
- Responsive editor shell for desktop, tablet, and mobile

## Build Profiles

- `npm run build`
  Desktop profile. Full UI surface is visible by default.
- `npm run build:web`
  Web profile. The default editor opens in a lighter mode and loads heavy tools on demand.

## Build Examples

```bash
# Desktop-oriented production build
npm run build

# Web-oriented production build
npm run build:web
```

For deployment details, see:

- [Web Performance Optimization Summary](docs/session-summary-2026-03-10-web-performance-optimization.md)
- [GCP Deployment Guide](docs/gcp-deployment.md)

## Recent Optimization Work

- Web default editor now starts with core rich-text tools only
- Document tools such as tables, images, footnotes, captions, TOC, and font controls are opt-in on web
- Math and Mermaid remain opt-in on web
- JSON/YAML editing remains supported, but is opened through an explicit structured flow on web
- AI, knowledge, history, share, and structured editing paths are split into lazy runtime boundaries
- Desktop keeps the full feature set available while allowing internal lazy loading

Representative web build snapshot:

- `/editor` main chunk: about `270KB raw / 79KB gzip`
- `EditorToolbarDocumentTools` chunk: about `21KB raw`
- `EditorToolbarAdvancedTools` chunk: about `3KB raw`

## Latest Docs

- [Docs Index](docs/README.md)
- [PRD Index](PRD/README.md)
- [Architecture Overview](docs/architecture-overview-2026-03-10.md)
- [Web Performance Optimization Summary](docs/session-summary-2026-03-10-web-performance-optimization.md)
- [GCP Deployment Guide](docs/gcp-deployment.md)
- [v0.7 Implementation Update](docs/session-summary-2026-03-10-v0.7-implementation-update.md)
- [v0.7 Plan](docs/prd-v0.7-implementation-plan-2026-03-10.md)
- [v0.4-v0.6 Plan](docs/prd-v0.4-to-v0.6-implementation-plan-2026-03-09.md)
