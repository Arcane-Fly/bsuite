# What happened while you were out — 2026-08-09

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

You said work autonomously and don't defer. This is the record. It is in the repo because
you can't read the memory MCP, so a memory key would read as delivered and wouldn't be.

**Nothing went to production.** Not one migration applied, not one app deployed. Two things
still need you, and both are named at the bottom.

---

## The one you should read first

**The promotion had a hole in it, and it was ours, added yesterday.**

`20260809090000` needed two extra columns on a view called `documents_pending_encryption` —
the list of sensitive files still sitting in plaintext. `CREATE OR REPLACE VIEW` can't
insert columns in the middle, only on the end, so it dropped the view and rebuilt it. It
rebuilt it **without the two protections the previous day's migration had put there**, and
that previous migration's own header says that without both, the view is *"a public index
of exactly the files it exists to protect"*.

Both protections are load-bearing for a different reason:

- Without `security_invoker`, a view reads its underlying table **as its owner**, so the
  per-tenant rules are bypassed entirely.
- Without the explicit `REVOKE`, the database's own default hands `SELECT` to the
  anonymous browser key **at the moment the view is created**, before any other grant runs.

So anyone with the public key, **not signed in**, could have listed the tenant, filename
and storage path of every plaintext sensitive document across both clients. Worse than the
original, because the new columns also say *whose* file each one is.

I checked before believing it: neither migration is applied, and the view does not exist in
production. **The promotion would have created that exposure, not inherited it.** Fixed in
crm7#1539, and the migration now ends with a check that fails the build if either
protection is ever dropped again — a comment asking the next person to remember is exactly
what failed here.

---

## D-31 — you asked for a restore point. There isn't one, and that's the finding

**Point-in-time recovery is switched off on this project.** The nearest recovery point is a
daily snapshot, which was about nineteen hours old when I looked. If a migration damaged
something, the most recent day of work is gone with it — every placement, timesheet,
document and audit entry written since.

The artefact you asked for cannot be produced while PITR is off. **Enabling it is the one
thing I'd put ahead of the promotion**, and it costs money, so it's yours.

I took a manual backup anyway and — this is the point of your ruling — **tested restoring
it**. Two irreplaceable tables came back empty. One was my test rig. **One was real:**
three FutureBuild timesheets say `approved` with no approver, no approval time and no audit
entry. Nothing anywhere records that an approval happened. Because a restore stops at the
first bad row, all fourteen timesheets were lost, not just those three.

I did **not** invent an approval date to make the error go away — that would manufacture the
exact evidence that doesn't exist, in a client's compliance record. The rows now say
"awaiting a decision", which is what the evidence supports. Hours and dates untouched.
Merged as crm7#1537.

---

## Everything else, briefly

**Anyone signed in could have wiped the audit trail.** Not through the app — the web API
has no command for it — but the database permission was there on 353 tables, including the
2,194-row audit log. The cause is a default that grants everything on every new table, so
revoking once would have been undone by the next table created. Both fixed (crm7#1536).

**A code review bot that has reviewed nothing.** Every "bot review" on the last sixty pull
requests in both repos is the same notice: reviews are paused for this account. Not one
finding, silently, for as long as I can see back. Worth deciding whether to pay for it or
remove it, because right now it looks like review is happening.

**The data console bug is understood** (crm7#1517). The page decides what to show from a
flag that could go *yes, no, yes* while two things loaded in an unlucky order — and the
"no" in the middle throws away everything below it, including your entity selection. It's
latched now, with a test covering all 1,728 orderings. I could not reproduce the
one-in-three browser symptom on demand, so **I've left the issue open** rather than closing
it on a fix I can't demonstrate end to end.

**23 recruitment tables become buildable from source for the first time** (crm7#1460). They
exist in production and no migration creates them, so nothing could test them and a rebuild
would silently lose them. Thirteen test failures fixed to get there — and one of those
turned out not to be a test problem at all but a live drift: two access rules had reverted
to a wider scope than the July migration set them to, most likely a dashboard edit.

**The shipping skill you told me to fix** had two faults beyond the one that blocked me: it
still listed R80.3, archived earlier today, and **left out throughput entirely** — so that
app had never been shipped by it. The app list is now read from the repo rather than typed
into the file.

---

## Two things need you

**1. Turn on point-in-time recovery, or accept a 24-hour recovery point.** Either is
defensible. It should be written down rather than assumed.

**2. bsuite#1845 is still your yes** — your own step 6. Two things to know before you give
it:

- **Order matters.** The migrations must apply *before* the crm7 app ships. crm7 has code
  for five features whose tables don't exist in production yet; shipping the app first
  gives you five silent empty states. crm7#1522 is held for that reason, with the evidence
  on the PR.
- **The bundle isn't a fixed list.** It promotes a pointer, so it carries whatever crm7's
  development branch holds at the moment you merge. It was 20 when you wrote the ruling,
  24 when the classification ran, and 27 now. I'd pin it before you approve, so what you
  approve is what applies.

Full per-file classification and the recovery runbook are on bsuite#1845.
