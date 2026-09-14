---
kind: reference
authority: engineering
owner: bsuite
evidence:
  - packages/auth/src/session-ownership.ts
  - packages/auth/src/__tests__/session-ownership.test.ts
---

# Coordinating session changes across tabs

This module is an opt-in adapter contract. Publishing it does not change any app's
session behavior. All five consumers still need implementation and deployed tests.
It does not replace OAuth state, PKCE, nonce validation or the code-exchange guard.

## Ownership and exclusion

`createAuthSessionCoordinator()` requires browser Web Locks, localStorage and secure
random IDs. Web Locks serialize SDK mutations across participating contexts on the
same origin. They do not coordinate different app origins. Unsupported or denied
coordination throws `AuthCoordinationUnavailableError` with an explicit recovery
value; do not fall back to an unguarded mutation or a localStorage lease.

- `beginSignIn()` synchronously supersedes older attempts and returns a serializable
  ownership snapshot. Use it for an intentional new login, not provider polling.
- `capture()` snapshots current ownership for background synchronization. Background
  adapters must additionally compare the captured token pair after their awaits:
  token refresh can rotate tokens without starting a new login generation.
- `isCurrent(snapshot)` / `assertCurrent(snapshot)` check shared storage immediately;
  they do not depend on delayed `storage` events.
- `commit(snapshot, adapter)` runs one serialized SDK change, checks ownership after
  the change, and only then calls synchronous `publish`. It returns `committed` or
  `superseded`; errors remain errors after cleanup.
- `logout(adapter)` invalidates snapshots synchronously, then serializes clearing.
  Hide authenticated UI immediately on logout intent. Await logout before claiming
  that persisted session state has been removed.

The lock wait is bounded to ten seconds. Once acquired, the lock is held until the
SDK operation and reconciliation settle. Adapters must bound their own network
work without detaching a write that can later complete. Never use Web Locks `steal`
or race a pending session write against a timeout that releases exclusion early.

A separate durable logout marker ensures a failed subsequent login cannot cancel
logout. Each commit drains pending logout before writing. An older logout resuming
after that drain does not erase the newer committed session. An in-progress marker
forces clearing after a partial failure or a crashed writer; reconciliation failure
leaves this marker intact and blocks subsequent publication until clearing succeeds.
No previously captured token is restored as rollback.

## Carry the original attempt across the redirect

Bind the `beginSignIn()` snapshot to the exact OAuth transaction **before redirect**.
The callback reads that original snapshot. It must not call `beginSignIn()` or merely
`capture()` on arrival: a stale callback could otherwise adopt a newer login's
generation. Use per-transaction storage and validate the returned state independently.
`signInWithBusinessSuite` and `attemptSilentAuthDetailed` accept a synchronous
`beforeRedirect(state)` hook. Use `state => ownership.bind(snapshot, state)` there.
The hook runs after PKCE persistence and before location assignment. If it throws,
navigation is cancelled and only that new flow's PKCE state is removed. Existing
callers without the hook retain their behavior. Hooks must not start detached work.

`readBinding(state)` returns the original snapshot, including when it is superseded,
so the callback can distinguish a stale attempt from one it owns. Missing, malformed,
future-dated or older-than-ten-minute bindings return null: stop and offer fresh
sign-in. Each state uses its own storage key, avoiding concurrent map overwrite;
expired entries are collected on subsequent bindings. Eligibility is checked on every
read even if no further login occurs. Bindings contain metadata, never tokens.

## Adapter shape

The following is schematic consumer code. `clearLocalSessionAndArtifacts` must clear
the SDK session, BS tokens, cookies and bridged marker, be idempotent and throw on
failure. It must preserve all `bs_auth_ownership_*` metadata. It must not invoke
`logout()` recursively from the SDK's own sign-out notification.

```ts
const ownership = createAuthSessionCoordinator();
const adapter = { clear: clearLocalSessionAndArtifacts };

// Intentional login: persist this snapshot bound to the generated OAuth state
// before the authorization navigation. Exchange remains outside the commit lock.
const initiatingAttempt = ownership.beginSignIn();
await signInWithBusinessSuite({
  beforeRedirect: state => ownership.bind(initiatingAttempt, state),
});

// Callback, using the restored ORIGINAL snapshot for this returned state:
const originalAttempt = ownership.readBinding(state);
if (!originalAttempt) throw new Error('Missing or expired sign-in ownership');
ownership.assertCurrent(originalAttempt);
const { tokens, user } = await exchangeCodeForTokens(code, state);
const result = await ownership.commit(originalAttempt, {
  ...adapter,
  async apply(scope) {
    scope.assertCurrent();
    const { error } = await supabase.auth.setSession(tokens);
    if (error) throw error;
    scope.assertCurrent();
    const { data, error: readError } = await supabase.auth.getSession();
    scope.assertCurrent();
    if (readError || data.session?.access_token !== tokens.access_token) {
      throw readError ?? new Error('Session bridge did not persist');
    }
  },
  publish() {
    writeBSTokensCookieAndBridgeMarker(tokens, user);
    window.location.replace(validatedReturnPath);
    return undefined;
  },
});
// Do nothing on superseded. Do not navigate again after commit returns.
// Login and callback snippets run on separate page loads.

// Logout: this call invalidates ownership BEFORE returning its promise.
const clearing = ownership.logout(adapter);
hideAuthenticatedUI();
await clearing;
showSignedOutUI();
```

`apply` may transiently cause the SDK to emit SIGNED_IN before resolving. Consumers
must suppress authenticated UI/navigation effects from a superseded operation while
reconciliation drains. This coordinator cannot make SDK events, localStorage, cookies
and navigation one atomic browser transaction. Every post-await publication is guarded,
and stale partial writes are reconciled before another coordinated writer enters.
Other code writing SDK sessions outside the lock invalidates those guarantees.

Native `exchangeCodeForSession` itself writes a session, so it belongs inside `apply`.
Choose either native SDK URL detection or manual callback exchange at singleton
construction, never both. Deduplicate callbacks before state dispatch; a remount must
not route a previously consumed BS state into native exchange.

An exchange failure before `commit` has not mutated the SDK: do not globally clear
sessions. Suppress stale failures using the original snapshot. Unknown code-consumption
outcomes require a fresh sign-in, never an automatic replay. Superseded results must
not trigger interactive fallback.

## Verification boundaries

Deterministic tests construct separate coordinator instances sharing storage and an
exclusive lock manager. They cover partial writes, queued logout, replacement login,
failed replacement exchange, failed reconciliation and missing capabilities. Consumer
tests must additionally assert SDK state, BS storage, cookie, marker, subscriptions
and navigation for two tabs, remounts, sign-out during verification/bridge, and native
URL handling. No real-browser or five-consumer completion is claimed here.

Sources: [Web Locks API specification](https://www.w3.org/TR/web-locks/) and
[MDN Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).
