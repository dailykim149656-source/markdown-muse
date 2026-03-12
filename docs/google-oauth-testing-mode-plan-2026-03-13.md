# Google OAuth Testing Mode Plan for Hackathon Submission

Date: 2026-03-13

## Decision

For the hackathon submission, Google OAuth will remain in `Testing` mode instead of switching to `Production`.

## Why

The team initially tried to move the Google OAuth app to production so judges could log in with their own Google accounts without manual allowlisting. That path ran into a blocking policy issue:

- The OAuth consent screen homepage URL used the Firebase Hosting domain `https://urban-dds.web.app`.
- Google rejected it with a message indicating that the website is not registered to the project owner.

This happens because production OAuth apps for external users generally require a verified domain under the developer's control for:

- Homepage URL
- Privacy Policy URL
- Terms of Service URL
- Authorized domains

The Firebase-provided `web.app` domain is not a substitute for a developer-owned verified domain in this policy flow.

## Constraint

There is no practical GCP-only workaround that turns a `web.app` domain into a verified production OAuth domain for external users.

Without purchasing or already owning a verifiable domain, the realistic choices are:

- Keep the app in `Testing`
- Use an internal Google Workspace organization app
- Buy or reuse a custom domain and verify it

Because the hackathon timeline favors speed and reliability, `Testing` mode is the most practical option.

## Testing Mode Strategy

### Primary approach

Use Google OAuth in `Testing` mode and add judge Google accounts to the OAuth test users list in advance.

### Why this is acceptable

- Testing mode supports a limited allowlist of users, which is sufficient for a hackathon review.
- It avoids blocking on domain purchase and domain verification.
- It keeps the Google Workspace integration demonstrable in the real product.

## What needs to be done

1. Keep the OAuth consent screen in `Testing`
2. Collect judge Google account emails if available
3. Add each judge email under the OAuth consent screen test users list
4. Verify that each judge account can complete the Google login flow
5. Keep non-Google parts of the product usable without sign-in when possible

## Recommended Submission Posture

To reduce risk during judging:

- Ensure the core product experience works without Google sign-in
- Treat Google Workspace integration as an enhanced workflow
- Include clear instructions for judges if their email must be allowlisted
- Provide screenshots or a short demo video showing the Google login and sync flow in case a live sign-in issue occurs

## Suggested Judge Instructions

Use wording similar to the following in submission notes or the demo guide:

```text
The Google Workspace integration is currently running in Google OAuth testing mode for the hackathon build.
If you would like to test the Google login flow directly, please provide the Google account email you plan to use and it will be added to the test user allowlist.
All non-Google editor and AI workflows are available without this step.
```

## URLs Prepared During This Session

Even though the app will remain in testing mode, the following public pages were added and can still be used later if production migration resumes:

- Privacy Policy: `https://urban-dds.web.app/privacy`
- Terms of Service: `https://urban-dds.web.app/terms`

## Future Production Path

If the project later moves beyond the hackathon and needs unrestricted external Google login:

1. Obtain or reuse a custom domain
2. Verify the domain with Google
3. Move homepage, privacy, and terms URLs to that domain
4. Update OAuth consent screen authorized domains
5. Switch the OAuth app from `Testing` to `Production`

## Operational Note

Testing mode is the fastest reliable path for the submission, but it requires operational handling of judge accounts ahead of time. That tradeoff is acceptable for a time-boxed hackathon review.
