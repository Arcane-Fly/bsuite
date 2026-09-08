# StatusBadge 'success' paints on 0 of 6 hosts while 'warning' paints on three — token alive, class dead

https://github.com/GaryOcean428/bsuite/issues/3125

Snapshot updatedAt: 2026-09-06T12:18:57Z. Open at capture; re-read live.

Measured across the estate's deployed hosts.

- **`StatusBadge` with `success` paints nothing on 0 of 6 hosts.** Not "some" —
  none.
- **`warning` DOES paint** on BSU, braden and throughput.

So this is not "the badge is broken". One variant works and its sibling does not,
which narrows it sharply.

On BSU the `--status-*` tokens are **all defined at `:root`** while **only the
warning utility paints**. Token alive, class dead — i.e. the token is not the
problem and reading `:root` will tell you it is fine. This is the shape recorded
in `bsuite-brand-system/references/class-sweep-regression-20260903.md`: a class
used in source with no emitted rule in the built CSS. `getPropertyValue` on the
token is the wrong instrument; the right one is grepping the **built** CSS for
the rule, or mounting the class and reading the rendered background.

Note the discriminator that matters when someone picks this up: `success` and
`warning` differ in whether the *utility* exists, not in whether the *token*
does, so any fix that changes a token value will appear to do nothing and any
audit that checks tokens will report green.

Suggested closure condition: the built CSS of each of the six apps contains an
emitted rule for every `--status-*` utility used in its source, asserted in CI —
per the class-sweep lesson, register the token *and* fail the build on a used
class with no emitted rule.

Filed from the maker lane on bsuite#3119 (business-suite-unified#1175,
throughput#480) — measured there, out of scope for both, deliberately not folded
into an unrelated diff.

