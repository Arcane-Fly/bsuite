# BSuite Auth Email Templates

Branded email templates for Supabase Auth. Apply these in:
**Supabase Dashboard → Auth → Email Templates**

## Templates

| File | Template Name in Dashboard |
|------|---------------------------|
| `confirm-signup.html` | Confirm signup |
| `invite-user.html` | Invite user |
| `magic-link.html` | Magic link |
| `change-email.html` | Change email address |
| `reset-password.html` | Reset password |

## Theme

Uses the D2C Neon Electric brand:
- Primary: Electric Blue `#2563eb`
- Accent: Electric Cyan `#00cec9`
- Success: Electric Green `#22c55e`
- Background: Deep Navy `#0a0e1a`
- Text: Off-white `#e2e8f0`
- Font: Inter (with system fallbacks)

## Variables

Supabase provides these template variables:
- `{{ .ConfirmationURL }}` — the action link
- `{{ .Email }}` — recipient email
- `{{ .SiteURL }}` — your site URL
- `{{ .Token }}` — OTP token (6-digit)
- `{{ .TokenHash }}` — hashed token
