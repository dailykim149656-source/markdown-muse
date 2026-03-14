# Security Credential Rotation Runbook

## When to use this runbook

Use this runbook immediately if a workspace state file, OAuth token, or imported
Google Docs payload is committed to Git history or otherwise exposed outside the
trusted runtime environment.

This repository previously tracked `.data/docsy-workspace-state.json`. Treat any
Google Workspace session material from that file as compromised.

## Immediate response

1. Revoke all exposed Google OAuth refresh tokens.
2. Revoke any exposed access tokens if refresh-token inventory is incomplete.
3. Rotate `GOOGLE_CLIENT_SECRET` in Google Cloud if the secret itself was exposed.
4. Remove the leaked state file from the current branch and prevent future repo-local persistence.
5. Rewrite Git history to remove the leaked file from every reachable commit.
6. Force-push the cleaned history and notify all collaborators to re-clone or hard-reset intentionally.

## Revoke Google OAuth tokens

Use the Google revoke endpoint for every leaked token:

```bash
curl -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=REDACTED_TOKEN" \
  https://oauth2.googleapis.com/revoke
```

Notes:

- Revoke refresh tokens first. That invalidates future access token refreshes.
- If you are unsure whether all refresh tokens were captured, revoke exposed access tokens too.
- After revocation, reconnect Google Workspace from the application.

## Remove the file from current state

This repo now ignores `.data/` and stores workspace state outside the repository
by default. Confirm the leaked file is absent:

```bash
git status --short
git ls-files .data
```

Expected result:

- `.data/` is not tracked
- no live workspace tokens remain in the worktree

## Rewrite Git history

Preferred approach with `git filter-repo`:

```bash
git filter-repo --path .data/docsy-workspace-state.json --invert-paths
```

After review:

```bash
git push --force-with-lease origin main
```

If your hosting provider cached the leaked blob, follow its secret-scanning or
repository cleanup guidance as well.

## Post-cleanup validation

1. `git log --all -- .data/docsy-workspace-state.json` returns nothing.
2. `git grep -n "refreshToken" $(git rev-list --all)` does not show the leaked state file.
3. Local runtime state resolves outside the repo:
   - local default: `${HOME}/.docsy/workspace-state.json`
   - Cloud Run default: `/tmp/docsy-workspace-state.json`
4. `npm run check:public-deploy` passes with an explicit non-wildcard `AI_ALLOWED_ORIGIN`.

## Follow-up actions

- Reconnect Google Workspace accounts from clean sessions.
- Rotate any downstream secrets copied into screenshots, HAR files, or logs.
- Review collaborators' local clones for stale leaked state files under `.data/`.
