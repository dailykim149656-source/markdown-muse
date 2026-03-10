# Landing Guide Implementation Plan

Date: 2026-03-11
Status: Proposed
Scope: Landing page + user guide surface

## Why this is needed

The product now has enough functionality that first-time users need orientation
 before entering the editor.

Current issue:

- the landing page explains what the product is
- it does not explain how to actually use the product
- advanced features like `Knowledge`, `Graph`, `Patch Review`, and
  `Suggestion Queue` are hard to understand without guided context

Goal:

- make the landing page useful for first-time orientation
- add a dedicated user guide surface without overloading the landing page

## Recommended product structure

Use a two-layer guide model.

1. Landing page
- show a short onboarding summary
- explain the main user flows
- provide strong entry points into the full guide

2. Dedicated guide page
- provide structured, section-based usage documentation
- support both desktop and mobile reading
- explain when to use each feature, not just what it is called

This keeps the landing page focused while still giving users a clear next step.

## Scope

### P0

- add `Quick Start` to landing
- add `How it works` section to landing
- add `Guide` route
- add full user guide page with core feature walkthroughs
- support `ko/en`

### P1

- add screenshots or annotated visuals
- add FAQ section
- add “recommended path for first use” callouts

### P2

- interactive onboarding or in-product walkthrough
- searchable guide content

## Information architecture

### Landing page additions

Keep the existing hero and feature marketing sections.

Add these new sections:

1. `Quick Start`
- 3 steps
- `Create a document`
- `Edit and review suggestions`
- `Share or export`

2. `Core workflows`
- simple cards for the main workflows
- writing/editing
- reviewing patches
- tracking related documents
- working across multiple docs

3. `When to use each feature`
- short guidance cards
- `Templates`
- `Version History`
- `Knowledge`
- `Graph`
- `Patch Review`
- `Suggestion Queue`

4. `Guide CTA`
- clear button to open `/guide`

5. `Editing help entry points`
- expose keyboard shortcut help clearly for desktop users
- explain that mobile users should use the toolbar and `More` actions instead

### Dedicated guide page sections

Recommended order:

1. `Getting started`
- what Docsy is for
- what a first session should look like

2. `Create your first document`
- blank document
- template selection
- supported document modes

3. `Basic editing`
- toolbar
- source/WYSIWYG behavior
- structured modes

4. `Keyboard shortcuts`
- common editing shortcuts
- formatting shortcuts
- block and alignment shortcuts
- where shortcuts apply and where they do not
- mobile replacement path through toolbar and `More`

5. `Versioning and recovery`
- autosave
- version history
- restoring earlier state

6. `Knowledge and graph`
- what knowledge indexing does
- how to use impact, health, consistency, change monitoring
- when to open graph

7. `Patch Review`
- why review-first matters
- how to inspect confidence and provenance
- how to accept or reject

8. `Multi-document maintenance`
- suggestion queue
- retry
- queue all
- graph re-entry

9. `Share and export`
- share link
- QR
- export formats

10. `Mobile usage tips`
- sidebar behavior
- toolbar behavior
- where advanced tools live on mobile
- how keyboard shortcuts map to mobile UI actions

## Content model

Do not hardcode long guide copy directly in page components.

Recommended structure:

- page layout components stay in React pages
- guide content lives in a dedicated content module
- locale-specific content is stored as structured data

Recommended files:

- `src/pages/Landing.tsx`
- `src/pages/Guide.tsx`
- `src/content/guideContent.ts`
- `src/i18n/messages/en.ts`
- `src/i18n/messages/ko.ts`
- `src/App.tsx`

## File-level implementation plan

### 1. Route wiring

File:

- `src/App.tsx`

Work:

- add lazy route for `/guide`
- keep landing and editor routes unchanged

### 2. Guide content source

New file:

- `src/content/guideContent.ts`

Work:

- define typed section data
- locale-specific title, summary, steps, and bullets
- keep content separate from page markup

Suggested shape:

- `guideHero`
- `quickStartSteps`
- `workflowCards`
- `featureUsageCards`
- `guideSections`

### 3. Guide page

New file:

- `src/pages/Guide.tsx`

Work:

- build long-form guide page
- add sticky or compact table of contents
- render sections from `guideContent.ts`
- support mobile-friendly one-column layout

### 4. Landing page updates

File:

- `src/pages/Landing.tsx`

Work:

- add `Guide` CTA in nav
- add `Quick Start`
- add `Core workflows`
- add `When to use each feature`
- add bottom CTA to `/guide`

### 5. i18n additions

Files:

- `src/i18n/messages/en.ts`
- `src/i18n/messages/ko.ts`

Work:

- add short UI labels only
- section headings
- CTA labels
- nav labels

Keep shortcut-related labels aligned with:

- `src/components/editor/KeyboardShortcutsModal.tsx`

Do not put the full guide body into message trees unless the content remains
 very short.

## UX rules

### Landing

- explain fast
- avoid giant paragraphs
- prefer 3-step blocks and concise cards

### Guide page

- explain in task order
- each section should answer:
  - what this feature is
  - when to use it
  - how to use it

### Mobile

- single-column layout
- sticky nav should not consume too much height
- table of contents may collapse into a compact block
- cards should avoid dense multi-column layouts

## Visual direction

Keep the existing landing style.

Do not turn the guide into plain documentation-only chrome.

Recommended treatment:

- same brand language as landing
- calmer layout than hero/marketing sections
- structured cards, numbered steps, and anchored sections

## Delivery order

1. Add `/guide` route and page shell
2. Add guide content data file
3. Add landing entry points and quick-start sections
4. Fill `ko/en` UI labels and guide content
5. Add mobile polish
6. Add focused render/smoke tests

## Acceptance criteria

1. A first-time user can understand how to start within 10 to 20 seconds on the landing page.
2. A user can open `/guide` and understand the main product flows without entering the editor first.
3. The guide explains `Knowledge`, `Graph`, `Patch Review`, and `Suggestion Queue` in plain workflow terms.
4. The guide works on both desktop and mobile.
5. `ko/en` are both supported.
6. Keyboard shortcut usage is explained for both desktop and mobile contexts.

## Recommended next step

Implement the `P0` slice first:

- `/guide` route
- guide shell
- landing quick-start
- feature usage cards
- shortcut/help entry points
- locale-aware guide content
