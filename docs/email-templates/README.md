# BSuite Auth Email Templates

Branded email templates for Supabase Auth. Apply these in:
**Supabase Dashboard → Auth → Email Templates**

## THESE ARE NOT AUTOMATICALLY DEPLOYED — read this first

Supabase email templates live in **dashboard config**. They are not in git, not
reviewed, not covered by any test, and silently editable. This directory is the
*intended* source of truth; the dashboard is what actually sends.

**Those two drifted, and it locked users out.** On 2026-08-07 the deployed reset
template was found sending
`{{ .SiteURL }}/auth/reset-password?token_hash=…&type=recovery` while this
directory still held `{{ .ConfirmationURL }}`. Nobody had brought the dashboard
change back. Worse, `/auth/reset-password` was not a registered route, so every
recovery link rendered the landing page — no error, no 404, it simply *looked*
like it worked. Every user whose only identity is `email`, with no social
provider to fall back on, had no route back into their account.

So: **after changing anything here, apply it in the dashboard; after changing
anything in the dashboard, bring it back here.** A template that exists in only
one of the two places is the defect.

## Templates

| File | Template Name in Dashboard | Link form |
|------|---------------------------|-----------|
| `reset-password.html` | Reset password | `token_hash` → `/auth/reset-password?type=recovery` |
| `confirm-signup.html` | Confirm signup | `{{ .ConfirmationURL }}` |
| `invite-user.html` | Invite user | `{{ .ConfirmationURL }}` |
| `magic-link.html` | Magic link | `{{ .ConfirmationURL }}` |
| `change-email.html` | Change email address | `{{ .ConfirmationURL }}` |

### Why only reset-password uses `token_hash`

`{{ .ConfirmationURL }}` is a GET link Supabase verifies server-side. Link
scanners — Outlook Safe Links, Proofpoint — pre-click it, consuming the
single-use token before the human sees the email. The `token_hash` form defers
verification to a POST the app makes itself, so a scanner's GET does not burn
it. `ResetPassword.tsx` Path 1 implements exactly that and calls it "Safe Links
resistant" in its own comment.

**The other four are deliberately NOT converted.** Their handlers cannot accept
the token_hash form today — verified, not assumed:

- `ResetPassword.tsx:32` gates Path 1 on `type === 'recovery'` **only**. A
  `type=invite` link falls through to the existing-session path and errors for
  anyone not already signed in.
- `AuthCallback.tsx` contains the token `type` **zero times**. It branches on
  consent-return, cross-app return, then `navigate('/')`. Pointing
  `magiclink` / `signup` / `email_change` at it with a `type` parameter would
  send the token somewhere that ignores it — the same defect this directory's
  own history records.

Convert them when their handlers accept it, not before. A link is only as good
as the route that receives it.

## Theme

D2C Neon Electric. Pure white and pure black are **banned in every role** —
verified zero occurrences across all five files.

- Primary: Electric Blue `#2563eb`
- Accent: Electric Cyan `#00cec9`
- Success: Electric Green `#22c55e`
- Background: Deep Navy `#0a0e1a` / `#111827`
- Text: Off-white `#e2e8f0`
- Heading gradient: `linear-gradient(135deg,#2563eb 0%,#00cec9 100%)`
- Font: Inter (with system fallbacks)

Hex rather than `oklch()` is deliberate: email clients have no meaningful
`oklch()` support, so these are the hex equivalents of the D2C role tokens
rather than an exemption from them.

## Variables

Supabase provides:
- `{{ .ConfirmationURL }}` — the action link (server-verified GET; scanner-fragile)
- `{{ .TokenHash }}` — hashed token, for the app-side POST verification flow
- `{{ .SiteURL }}` — your site URL
- `{{ .Email }}` — recipient email
- `{{ .Token }}` — OTP token (6-digit)
