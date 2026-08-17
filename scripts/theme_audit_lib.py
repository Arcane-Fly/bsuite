"""Shared helpers for the theme audit gates.

Exists for exactly one function. `audit-palette-whitelist.py` and
`audit-oklch-lightness.py` both have to answer "is this character inside a
comment", and the first implementation of that answer was wrong in a way that
made the gate silently scan nothing. Two copies of a subtly wrong function is
how it stays wrong in one of them after somebody fixes the other, so there is
one copy and both import it.
"""


def code_lines(text: str) -> list:
    """The source with every commented character blanked, line numbers intact.

    ONE STATEFUL PASS, NOT A DEPTH COUNT
    ------------------------------------
    The original decided what was a comment by counting `/*` and `*/` per line
    and accumulating a depth. That assumes block comments nest. They do not —
    in CSS, and in JS/TS, a `/*` inside a comment is just text.

    The assumption is not academic. It silently blinded the scanner:

        crm7/src/styles/theme.css:91, prose INSIDE a comment
            "the semi-transparent black scrim (--color-overlay, bg-overlay/*)"

    `bg-overlay/*` is a Tailwind opacity wildcard written in English. The
    counter read it as a second comment opening, depth climbed to 2, the real
    `*/` eight lines later brought it only back to 1, and depth never returned
    to zero for the rest of the file. Every line from 91 onward — 595 of 660 —
    was then treated as comment and skipped, including `--bg-shell-elevated`
    and `--bg-shell-hero` at 163 and 164, the two tokens the near-pure gate was
    written to catch. It reported them clean while they sat in the tree.

    Measured across `packages/`, the only tree the palette whitelist reads, the
    counter treated more than half the lines as comment in 22 files:

        100%  packages/eslint-config/rules/no-hardcoded-colours.js  (1005 lines)
        100%  packages/theme/src/react/BrandingProvider.tsx          (402 lines)
         72%  packages/nav-core/src/tokens/d2c-sidebar.css
         66%  packages/nav-core/src/tokens/corporate-sidebar.css
         62%  packages/theme/src/css/vars.css                        (435 of 704)

    vars.css is the token source. A gate that cannot see 62% of the file it
    exists to police is not a gate, and its `0 violations` was partly a
    measurement of its own blind spot. (The corrected pass still measures 0, so
    nothing was actually hiding there — but nothing was stopping it either.)

    So: scan character by character. Once inside a block only `*/` gets out.
    `//` ends the line, except in `://` — a URL is not a comment, and a scanner
    that thinks it is drops whatever colour follows it on the line.

    Returns one string per input line, same count and same order, with
    commented characters replaced by spaces so column positions still line up.
    """
    out, in_block = [], False
    for line in text.splitlines():
        buf, i, n = [], 0, len(line)
        while i < n:
            if in_block:
                j = line.find('*/', i)
                if j < 0:
                    buf.append(' ' * (n - i))
                    i = n
                else:
                    buf.append(' ' * (j + 2 - i))
                    i, in_block = j + 2, False
                continue
            j = line.find('/*', i)
            k = line.find('//', i)
            while k > 0 and line[k - 1] == ':':
                k = line.find('//', k + 2)
            if j < 0 and k < 0:
                buf.append(line[i:])
                i = n
            elif k >= 0 and (j < 0 or k < j):
                buf.append(line[i:k])
                buf.append(' ' * (n - k))
                i = n
            else:
                buf.append(line[i:j])
                buf.append('  ')
                i, in_block = j + 2, True
        out.append(''.join(buf))
    return out
