# Documents pending encryption at rest

https://github.com/GaryOcean428/bsuite/issues/2664

Snapshot updatedAt: 2026-09-08T04:20:08Z. Open at capture; re-read live.

**26** document(s) sit unencrypted in categories whose `encrypt_at_rest` says they must not.

Per-tenant breakdown, and who can action each, is in the [latest run summary](https://github.com/GaryOcean428/bsuite/actions/runs/34186604854).

Run the pass at **Settings → Document Categories** in crm7. It is audited and resumable:
it writes the encrypted object to a new path, commits metadata, and only then removes the
plaintext — a failed cleanup lands as `cleanup_pending`, never as a silent success.

This issue is opened and closed automatically by `pending-encryption-watch.yml`.
It closes itself when the count reaches zero. Do not close it by hand — a hand-closed
issue on a still-nonzero count is how this went unnoticed in the first place.
