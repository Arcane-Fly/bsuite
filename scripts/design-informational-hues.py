#!/usr/bin/env python3
"""Derive the INFORMATIONAL (categorical) hue set for a brand.

Operator ruling 2026-08-03: "informational hues might be handy to stand out
against the style colour palette."

WHAT THIS SOLVES
Role tokens describe STATE — primary, error, warning, success. They cannot
describe CATEGORY: which pipeline stage, which user role, which product tile.
Apps that needed a category reached for raw Tailwind (bg-purple-500,
bg-sky-500, ...), which is how BSU accumulated 512 palette bypasses and how a
single role-badge table ended up using purple, indigo, blue, violet and sky
as its only distinguishing signal.

TWO CONSTRAINTS, AND THE SECOND IS THE OPERATOR'S POINT
  1. Each informational hue must be distinguishable FROM THE OTHERS, including
     under deuteranopia and protanopia.
  2. Each must be distinguishable FROM THE BRAND ROLES. That is what "stand out
     against the style palette" means: an informational badge must not read as
     a primary action or an error. A category that looks like `--role-error` is
     worse than an ugly one.

METHOD
Viénot-Brettel-Mollon (1999) dichromat simulation, distance measured as
Euclidean DeltaE in OKLab, scored as the WORST case across normal, deuteranope
and protanope vision. Candidate hues are swept at fixed L and C; the set is
chosen greedily by maximising the minimum pairwise distance, with brand roles
seeded as fixed points that must be avoided but never selected.

Usage:  scripts/design-informational-hues.py [d2c|corporate] [count]
"""
import math
import sys

# ── OKLCH -> OKLab -> linear sRGB ────────────────────────────────────────────
M2_INV = [[1.0,  0.3963377774,  0.2158037573],
          [1.0, -0.1055613458, -0.0638541728],
          [1.0, -0.0894841775, -1.2914855480]]
LMS_TO_LRGB = [[ 4.0767416621, -3.3077115913,  0.2309699292],
               [-1.2684380046,  2.6097574011, -0.3413193965],
               [-0.0041960863, -0.7034186147,  1.7076147010]]
LRGB_TO_LMS_INV = [[0.4122214708, 0.5363325363, 0.0514459929],
                   [0.2119034982, 0.6806995451, 0.1073969566],
                   [0.0883024619, 0.2817188376, 0.6299787005]]


def mul(m, v):
    return [sum(m[i][j] * v[j] for j in range(3)) for i in range(3)]


def oklch_to_lrgb(L, C, H):
    a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    lms = mul(M2_INV, [L, a, b])
    return mul(LMS_TO_LRGB, [c ** 3 for c in lms])


def lrgb_to_oklab(rgb):
    lms = mul(LRGB_TO_LMS_INV, rgb)
    c = [math.copysign(abs(x) ** (1 / 3), x) for x in lms]
    M2 = [[0.2104542553,  0.7936177850, -0.0040720468],
          [1.9779984951, -2.4285922050,  0.4505937099],
          [0.0259040371,  0.7827717662, -0.8086757660]]
    return mul(M2, c)


# ── Vienot 1999 dichromat simulation (operates in linear sRGB) ───────────────
# Long-wave (protan) and medium-wave (deutan) cone loss, projected onto the
# plane spanned by the remaining two cones.
SIM = {
    'protan': [[0.0, 1.05118294, -0.05116099],
               [0.0, 1.0,          0.0],
               [0.0, 0.0,          1.0]],
    'deutan': [[1.0,        0.0, 0.0],
               [0.9513092,  0.0, 0.04866992],
               [0.0,        0.0, 1.0]],
}
LRGB_TO_LMS = [[0.31399022, 0.63951294, 0.04649755],
               [0.15537241, 0.75789446, 0.08670142],
               [0.01775239, 0.10944209, 0.87256922]]
LMS_TO_LRGB2 = [[ 5.47221206, -4.6419601,   0.16963708],
                [-1.1252419,   2.29317094, -0.1678952],
                [ 0.02980165, -0.19318073,  1.16364789]]


def simulate(rgb, kind):
    if kind == 'normal':
        return rgb
    lms = mul(LRGB_TO_LMS, rgb)
    return mul(LMS_TO_LRGB2, mul(SIM[kind], lms))


def lab_under(L, C, H, vision):
    return lrgb_to_oklab(simulate(oklch_to_lrgb(L, C, H), vision))


def worst_delta(a, b):
    """Smallest separation across the three vision types — the binding case."""
    out = []
    for v in ('normal', 'deutan', 'protan'):
        la, lb = lab_under(*a, v), lab_under(*b, v)
        out.append(math.dist(la, lb))
    return min(out)


def in_gamut(L, C, H):
    return all(-0.001 <= c <= 1.001 for c in oklch_to_lrgb(L, C, H))


# ── brand roles that must be AVOIDED (never selected, always repelled) ───────
BRANDS = {
    'd2c': {
        'reserved': [
            ('primary  blue',  0.546, 0.215, 262.9),
            ('accent   cyan',  0.769, 0.132, 191.7),
            ('secondary deep', 0.380, 0.140, 270.0),
            ('error    red',   0.580, 0.230,  25.0),
            ('warning  amber', 0.800, 0.150,  75.0),
            ('success  teal',  0.600, 0.130, 195.0),
        ],
        'L': 0.62, 'C': 0.14,
    },
    'corporate': {
        'reserved': [
            ('primary  red',    0.488, 0.170,  17.6),
            ('accent   gold',   0.758, 0.092,  89.9),
            ('secondary navy',  0.356, 0.039, 249.0),
            ('error    indigo', 0.400, 0.200, 270.0),
            ('success  aqua',   0.800, 0.130, 198.0),
            ('info     teal',   0.500, 0.140, 220.0),
        ],
        'L': 0.60, 'C': 0.12,
    },
}


def main():
    brand = sys.argv[1] if len(sys.argv) > 1 else 'd2c'
    want = int(sys.argv[2]) if len(sys.argv) > 2 else 8
    cfg = BRANDS[brand]
    L, C = cfg['L'], cfg['C']
    reserved = [(n, l, c, h) for n, l, c, h in cfg['reserved']]

    # Search LIGHTNESS as well as hue. At fixed L this problem is unsolvable:
    # eight hues could only reach DeltaE 0.029, against the 0.156 the contract
    # achieves for semantic pairs, because deuteranopia and protanopia collapse
    # the red-green axis and most of the hue circle folds onto itself.
    # Lightness survives both, which is exactly why the contract separates warm
    # states by lightness rather than hue. So the candidate space is (L, H).
    cands = [(l / 100, h) for l in range(46, 82, 4) for h in range(0, 360, 6)
             if in_gamut(l / 100, C, h)]
    chosen: list[tuple[float, float]] = []

    def score(cand):
        cl, ch = cand
        d = [worst_delta((cl, C, ch), (rl, rc, rh)) for _, rl, rc, rh in reserved]
        d += [worst_delta((cl, C, ch), (kl, C, kh)) for kl, kh in chosen]
        return min(d)

    for _ in range(want):
        best = max(cands, key=score)
        chosen.append(best)
        # Drop everything perceptually adjacent, not just the exact point —
        # otherwise the next pick is the swatch 6 degrees away, which is how
        # the fixed-L version produced hues 0, 12 and 26 as "well separated".
        # Two constraints, not one. Perceptual distance keeps them
        # DISTINGUISHABLE; a minimum hue gap keeps them looking CATEGORICAL.
        # Without the second, the search happily returns two lightnesses of the
        # same hue — genuinely distinguishable, but they read as a light/dark
        # pair of one colour, i.e. as related. That is the right answer for a
        # progression ramp and the wrong one for unrelated categories.
        def hue_gap(a, b):
            d = abs(a - b) % 360
            return min(d, 360 - d)

        cands = [c for c in cands
                 if worst_delta((c[0], C, c[1]), (best[0], C, best[1])) > 0.05
                 and hue_gap(c[1], best[1]) >= 28]
        if not cands:
            break

    chosen.sort(key=lambda p: p[1])
    print(f"# informational hues for {brand} — C={C}, lightness varied")
    print("# worst-case DeltaE(OKLab) across normal / deuteranopia / protanopia\n")
    print("  reserved brand roles (avoided, never selected):")
    for n, rl, rc, rh in reserved:
        print(f"    {n:16s} oklch({rl:.3f} {rc:.3f} {rh:.1f})")
    print(f"\n  selected informational hues ({len(chosen)} of {want} requested):")
    for cl, ch in chosen:
        vs_brand = min(worst_delta((cl, C, ch), (rl, rc, rh)) for _, rl, rc, rh in reserved)
        vs_peers = min([worst_delta((cl, C, ch), (kl, C, kh))
                        for kl, kh in chosen if (kl, kh) != (cl, ch)] or [9])
        print(f"    oklch({cl:.3f} {C:.3f} {ch:5.1f})   vs-brand {vs_brand:.3f}   vs-peers {vs_peers:.3f}")

    if len(chosen) > 1:
        pair = min(((a, b) for i, a in enumerate(chosen) for b in chosen[i + 1:]),
                   key=lambda p: worst_delta((p[0][0], C, p[0][1]), (p[1][0], C, p[1][1])))
        print(f"\n  tightest peer pair: {pair[0]} vs {pair[1]} -> "
              f"{worst_delta((pair[0][0], C, pair[0][1]), (pair[1][0], C, pair[1][1])):.3f}")
    worst_b = min((worst_delta((cl, C, ch), (rl, rc, rh)), ch, n)
                  for cl, ch in chosen for n, rl, rc, rh in reserved)
    print(f"  closest to a brand role: hue {worst_b[1]} vs {worst_b[2].strip()} -> {worst_b[0]:.3f}")


if __name__ == '__main__':
    main()
