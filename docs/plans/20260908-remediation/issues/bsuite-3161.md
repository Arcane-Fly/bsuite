# migration-collision-branch-tips FIX text prescribes an allowlist route the allowlist's Class C gate refuses (verified-harmless is not a category it implements)

https://github.com/GaryOcean428/bsuite/issues/3161

Snapshot updatedAt: 2026-09-07T11:03:16Z. Open at capture; re-read live.

## The branch-tip collision workflow prescribes an allowlist route that the allowlist's own gate refuses

**Two instruments, one allowlist, opposite rules.**

`.github/workflows/migration-collision-branch-tips.yml` (job `branch-tip-collision`) fails with this text (run 34111497957 on c5d841ff1, 10:28Z):

```
FIX: renumber the newer migration to an unused timestamp. Only if the two files
are genuinely the same migration, or verified harmless, add the version to
scripts/migration-collision-allowlist.txt with an `n=<count>` pin and a reason.
```

The allowlist's Class C gate, on the same day, rejected an entry written under the "verified harmless" clause (bsuite#3160, withdrawn 10:48Z):

```
scripts/migration-collision-allowlist.txt:181 claims "SUPERSEDED-NOT-COINCIDENCE …"
but content still differs beyond whole-line comments and blank lines — the entry is STALE.
```

Its categories are content equivalence only: byte-identical, or differing in whole-line comments and blanks. "Verified harmless" is not a category it implements. So the failure text sends a maker down a route the gate refuses, and the maker learns it one PR later. This lane made the same mistake from the workflow's text (BSU#1188 comment 5569329619, corrected).

**Measured.** `grep -c 'coincidental-timestamp, CROSS-SCOPE' scripts/migration-collision-allowlist.txt` → 10 entries that say "unrelated schemas … unverified — needs live-catalog check": pinned by count, not by content equivalence, so the Class C gate's rule is not what those entries were written under either. Which rule is intended is the maker's call; the two texts must say the same thing.

**Fix options.** (a) Change the workflow's FIX text to name only the two routes that exist: renumber, or delete the file that can never run (as BSU#1190/#1191 did); allowlist only for content-equivalent duplicates. (b) Or add the category to the gate with a stated verification requirement. Either way, the ten "unverified" cross-scope entries need a disposition under whichever rule wins.

**Owner.** The main lane (the workflow's and the allowlist gate's maker). Filed by the accountability lane; no product edit from this lane while the maker is alive.
