# Google Workspace Live Validation Runbook

Date: 2026-03-12
Status: Active manual validation runbook
Scope: Real-account Google Workspace import, rescan, refresh, sync, conflict, and warning validation

## References

- `docs/release-closeout-checklist-2026-03-11.md`
- `docs/release-closeout-results-template-2026-03-12.md`
- `docs/remaining-work-execution-plan-2026-03-11.md`
- `server/modules/workspace/routes.ts`
- `server/modules/workspace/googleDocsMapper.ts`

## Purpose

Use this runbook to complete the remaining live Google Workspace validation
that cannot be closed by local mocks alone.

This is the manual counterpart to the current automated coverage for:

- Workspace connection and import dialog UI
- Workspace sync `409` conflict handling
- workspace warning persistence and visibility

## Validation goals

Confirm all of the following with a real Google account and a real Google Doc:

1. account connection works end to end
2. Google Docs file search and import work end to end
3. remote changes become visible through rescan
4. refresh replaces stale imported content
5. patch apply to Google Docs succeeds when the revision is current
6. sync conflict is surfaced when the remote revision changed
7. lossy sync warnings are visible after a real sync

## Prerequisites

- a working frontend build or local dev server
- a working AI/workspace server with Google auth configured
- a Google account with access to a test Drive space
- at least two Google Docs files prepared for testing

Required environment assumptions:

- auth routes are reachable
- workspace routes are reachable
- the browser can receive auth cookies from the workspace server

## Suggested test documents

Prepare these Google Docs files in advance.

### 1. Lossless-ish baseline doc

Use simple headings, paragraphs, bullet lists, and links only.

Example contents:

- headings
- paragraphs
- bulleted steps
- inline links

Purpose:

- validate connect, import, refresh, and clean sync

### 2. Lossy-structure doc

Include structures that the current mapper warns about.

Include:

- fenced code block
- markdown-style table equivalent
- image
- block quote or callout-like content
- footnote-like content

Purpose:

- validate warning capture and warning visibility

### 3. Conflict doc

Use any small doc that can be edited from two browser sessions or from the
Google Docs web UI after import.

Purpose:

- validate `409` conflict handling

## Validation steps

### A. Connect Google Workspace

1. Open the editor.
2. Click `Connect Google`.
3. Complete OAuth in the Google account.
4. Return to the editor.

Expected result:

- connection dialog shows `Connected`
- connected user identity is visible
- `Drive Import` becomes available

Record:

- pass / fail
- connected account email
- any cookie or redirect issue

### B. Search and import a Google Doc

1. Open `Drive Import`.
2. Search for the baseline doc by name.
3. Click `Import`.

Expected result:

- the document appears as a new or replaced editor tab
- document content is visible in the editor
- workspace binding badge appears in header, tabs, or sidebar
- imported doc status shows `Imported` or equivalent workspace status

Record:

- imported file name
- imported document mode
- any parsing or rendering issue

### C. Rescan and remote-change detection

1. While the imported doc is open, edit the source Google Doc directly in the
   Google Docs web UI.
2. Return to the editor.
3. Trigger `Rescan`.

Expected result:

- changed source appears in change monitoring
- imported document status becomes `Conflict`
- the document shows a refresh-required error or status

Record:

- pass / fail
- time between remote edit and detected rescan result
- any false negatives

### D. Refresh imported content

1. From the changed imported doc, trigger refresh.

Expected result:

- refreshed content matches the latest Google Doc content
- conflict state clears if the imported content is now current
- source snapshots update accordingly

Record:

- pass / fail
- whether imported content changed as expected

### E. Clean patch apply to Google Docs

1. Open a rich-text imported document with current revision state.
2. Generate or load a reviewable patch set.
3. Accept one or more safe patches.
4. Apply accepted patches.

Expected result:

- local document updates
- remote Google Doc updates
- status becomes `Synced` or `Synced with warnings`
- no conflict state is shown

Record:

- patch count applied
- resulting workspace status
- whether Google Docs content matches local result

### F. Conflict on apply

1. Import a Google Doc.
2. Make a local reviewable change but do not apply yet.
3. Edit the same Google Doc remotely in Google Docs web UI.
4. Apply the reviewed patch from the editor.

Expected result:

- apply fails with conflict
- document status becomes `Conflict`
- user-visible error explains that the Google Doc changed and refresh is needed

Record:

- pass / fail
- exact error text shown
- whether local content remained reviewable after failure

### G. Lossy sync warning visibility

1. Import the lossy-structure doc.
2. Apply a reviewed patch back to Google Docs.

Expected result:

- sync returns warnings if lossy structures are present
- warning state persists on the workspace binding
- `Synced with warnings` appears in workspace status surfaces
- Patch Review shows the sync warning summary after apply or on reopen

Record:

- warnings shown
- surfaces where warnings are visible:
  - header
  - tabs
  - file sidebar
  - patch review
- any missing expected warning

## Evidence to capture

Capture screenshots or clips for:

- connected Workspace dialog
- imported document with workspace badge
- conflict state after rescan
- refreshed document after remote change
- successful apply state
- conflict-on-apply state
- synced-with-warnings state
- patch review warning summary

Recommended artifact folder:

- `output/playwright/`

## Pass criteria

Validation is considered complete only if all of the following are true:

- real Google auth succeeds
- real file search and import succeed
- remote change rescan produces a visible conflict state
- refresh succeeds on a changed imported doc
- clean apply succeeds on a current revision
- stale revision apply fails with visible conflict handling
- lossy sync warnings are visible on at least one real sync

## Failure handling

If a step fails, record:

- exact step id
- expected result
- actual result
- screenshot or short clip path
- whether the failure is auth, network, import, sync, conflict, or warning-related

Do not treat mocked or local-only evidence as a substitute for this runbook.

## Suggested result template

Use this section when the runbook is executed.

- Validation date:
- Validator:
- Google account:
- Baseline doc result:
- Lossy-structure doc result:
- Conflict doc result:
- Import result:
- Rescan result:
- Refresh result:
- Clean apply result:
- Conflict apply result:
- Warning visibility result:
- Open issues:
- Final judgment:
