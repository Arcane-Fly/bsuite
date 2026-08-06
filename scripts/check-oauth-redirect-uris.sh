#!/usr/bin/env bash
#
# Assert every origin we ship a user to can actually complete OAuth.
#
# WHY THIS EXISTS (operator report, 2026-08-06)
#
# crm7's Vercel project held VITE_R8_URL="https://r8-c.vercel.app" — a raw
# Vercel project alias — so "Edit in R8" sent every user there. It serves the
# correct app, so the page loaded and looked right. What broke was invisible
# from the link: that origin is not in R8's registered redirect_uris, so the
# user arrived signed out and Sign In was refused.
#
# Supabase's OAuth 2.1 server matches redirect_uri BYTE-FOR-BYTE against the
# comma-separated auth.oauth_clients.redirect_uris column. Measured 2026-08-06
# against the live authorize endpoint:
#
#   https://r8.crm7.app/auth/callback    -> 302 (consent screen)
#   https://d.r8.crm7.app/auth/callback  -> 302 (consent screen)
#   https://r8-c.vercel.app/auth/callback-> 400 invalid redirect_uri
#   https://r8.crm7.app/auth/callback/   -> 400  (trailing slash!)
#   https://R8.crm7.app/auth/callback    -> 400  (host CASE!)
#
# The last two matter: the comparison is a raw string compare, so it is
# STRICTER than RFC 3986, which treats hostnames as case-insensitive. Any
# client-side approximation of this rule — including a shape/pattern check —
# is looser than the server and will eventually admit an origin that 400s.
# This gate asks the server instead of guessing.
#
# NO SECRETS REQUIRED. The authorize endpoint validates client_id and
# redirect_uri before any authentication, so an unauthenticated GET is enough
# to distinguish registered from unregistered. client_id values for public
# OAuth clients are not secrets (they ship in every bundle).
#
# SIDE EFFECT, ACCEPTED: each 302 mints a pending row in
# auth.oauth_authorizations that is never completed. They expire on their own.
# A handful per run is the cost of asking the real server rather than a mirror
# of its config that can drift.
set -uo pipefail

AUTHZ="https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/oauth/authorize"
# Any valid S256 challenge; the value is irrelevant to redirect_uri validation.
CHALLENGE="E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

# app-label|client_id|origin
# Every origin a user can be sent to by a cross-app link or by landing directly.
ORIGINS=(
  "crm7|30f76744-3e0b-40bf-abb8-8c587389802e|https://crm.crm7.app"
  "crm7-dev|30f76744-3e0b-40bf-abb8-8c587389802e|https://d.crm.crm7.app"
  "r8|5d804d20-cd1b-4724-9107-86d2a9e51e09|https://r8.crm7.app"
  "r8-dev|5d804d20-cd1b-4724-9107-86d2a9e51e09|https://d.r8.crm7.app"
  "conduit|da925c19-8f32-40a0-b74d-4eb9540c422f|https://conduit.crm7.app"
  "conduit-dev|da925c19-8f32-40a0-b74d-4eb9540c422f|https://d.conduit.crm7.app"
  "throughput|35f0db49-ef62-4115-baba-7b961f034cc3|https://ideas.crm7.app"
  "throughput-dev|35f0db49-ef62-4115-baba-7b961f034cc3|https://d.ideas.crm7.app"
  "braden|dcb7af18-254a-4946-b94d-5c606b01fc3f|https://www.braden.com.au"
  "braden-dev|dcb7af18-254a-4946-b94d-5c606b01fc3f|https://d.braden.com.au"
)

probe() { # client_id, redirect_uri -> http status on stdout
  curl -s -o /dev/null -w '%{http_code}' --max-time 25 -G "$AUTHZ" \
    --data-urlencode "client_id=$1" \
    --data-urlencode 'response_type=code' \
    --data-urlencode "redirect_uri=$2" \
    --data-urlencode "code_challenge=$CHALLENGE" \
    --data-urlencode 'code_challenge_method=S256' \
    --data-urlencode 'scope=openid email profile' \
    --data-urlencode 'state=ci-redirect-uri-gate'
}

fail=0

# ── CONTROL FIRST ───────────────────────────────────────────────────────────
# A probe whose negative result is never tested is not a probe. Before trusting
# any 400 below as a real finding, prove this instrument can tell the two apart
# — a green run on a broken probe reports a confident, wrong zero.
echo "control: a deliberately unregistered origin must be REFUSED"
control=$(probe '5d804d20-cd1b-4724-9107-86d2a9e51e09' 'https://not-a-real-bsuite-origin.example/auth/callback')
if [ "$control" != '400' ]; then
  echo "  FAIL — control returned $control, expected 400."
  echo "  The probe cannot distinguish registered from unregistered, so every"
  echo "  result below is meaningless. Not reporting a pass on a blind gate."
  exit 1
fi
echo "  ok (400) — the probe can fail, so a pass below means something"
echo

echo "checking each shipped origin is registered (exact match):"
for row in "${ORIGINS[@]}"; do
  IFS='|' read -r label client origin <<<"$row"
  status=$(probe "$client" "${origin}/auth/callback")
  if [ "$status" = '302' ]; then
    printf '  ok    %-16s %s/auth/callback\n' "$label" "$origin"
  else
    printf '  FAIL  %-16s %s/auth/callback -> HTTP %s\n' "$label" "$origin" "$status"
    fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  cat <<'EOF'

An origin above is NOT registered against its OAuth client. A user sent there
lands signed out and cannot sign in — and the page still renders, so this does
not look like an auth failure from the outside.

Fix by adding the exact string `<origin>/auth/callback` to that client's
redirect_uris (Dashboard -> Authentication -> OAuth Apps). Byte-for-byte: a
trailing slash or a capital letter in the host is a different URI and is
refused.
EOF
  exit 1
fi

echo
echo "all origins registered."
