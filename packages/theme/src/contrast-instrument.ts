/**
 * THE CONTRAST INSTRUMENT — one pipeline, shared by every contrast gate.
 *
 * Extracted from `non-text-contrast.test.ts`, whose self-tests pin this maths
 * against three figures this repo recorded independently (3.36, 3.61, 1.12).
 * Those self-tests still run and still pass against this module, which is what
 * makes the extraction safe: the instrument is unchanged, it just stopped being
 * copied. A second gate with its own private copy of the arithmetic is two
 * instruments that can disagree, and the one that disagrees quietly is the one
 * you trust.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const VARS = resolve(__dirname, 'css/vars.css')

/* ── OKLCH -> sRGB -> WCAG relative luminance ──────────────────────────────
 * Ottosson's OKLab matrices, then the sRGB transfer function, then WCAG 2.x
 * relative luminance. Identical pipeline to scripts/audit-legibility.mjs.
 */
const DEG = Math.PI / 180

const MAX_HOPS = 8

export type Rgb = [number, number, number]

export function oklchToSrgb(L: number, C: number, H: number): Rgb {
  const a = C * Math.cos(H * DEG)
  const b = C * Math.sin(H * DEG)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return linear.map((x) => {
    const enc = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055
    return Math.min(1, Math.max(0, enc))
  }) as Rgb
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

export const luminance = ([r, g, b]: Rgb) =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)

export function contrast(a: Rgb, b: Rgb) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (hi + 0.05) / (lo + 0.05)
}

export const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Source-over alpha compositing in sRGB — what the browser does for
 * `bg-primary/20`, which Tailwind v4 emits as a colour mixed toward
 * transparent and the compositor then lays over the backdrop.
 *
 * This is the step the estate has repeatedly skipped. A `-text` token measured
 * against `--role-bg-body` is measured against a surface it is rarely on; the
 * pill it actually ships in is a wash of its OWN hue, which pulls the backdrop
 * toward the text and costs roughly a point of ratio.
 */
export function over(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha)) as Rgb
}

/* ── Read the live token values out of the stylesheet ─────────────────────
 * Comments are stripped ONCE, up front: vars.css's prose quotes token values
 * constantly, and a scan that reads them would resolve a token to whatever a
 * sentence mentioned.
 */
const CSS = readFileSync(VARS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * THE SAME READER, POINTED AT ANOTHER STYLESHEET.
 *
 * This module used to be hardcoded to `css/vars.css`, so there was NO trusted way to
 * measure `css/braden.css` — the Corporate palette. On 2026-08-28 that gap cost three
 * separate hand-rolled readers in one session, each handling `var()` differently, each
 * returning a different verdict for the same file (4.16 / 3.33 / "all pass"), and one
 * of them reached a PR description before the live page contradicted it.
 *
 * A measurement tool that covers one of two stylesheets guarantees the second gets
 * measured by whatever the reader writes that day. So: same parser, same cascade rules,
 * same alias resolution, any file.
 */
export function sheet(absPath: string) {
  const raw = readFileSync(absPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const blocksIn = (selector: string): string => {
    const out: string[] = []
    // Statement at-rules (such as @import) are not part of the next selector.
    const re = /([^{};]*)\{/g
    let m: RegExpExecArray | null
    while ((m = re.exec(raw))) {
      const sel = m[1].trim()
      const open = m.index + m[0].length - 1
      let depth = 0
      let close = -1
      for (let i = open; i < raw.length; i++) {
        if (raw[i] === '{') depth++
        else if (raw[i] === '}' && --depth === 0) { close = i; break }
      }
      if (close === -1) throw new Error(`unterminated block for "${sel}" in ${absPath}`)
      if (sel.split(',').some((x) => x.trim() === selector)) out.push(raw.slice(open + 1, close))
      re.lastIndex = close
    }
    if (!out.length) throw new Error(`selector ${selector} not found in ${absPath}`)
    return out.join('\n')
  }
  const root = blocksIn(':root')
  const read = (n: string, where: string): string | null => {
    const all = [...where.matchAll(new RegExp(`--${n}\\s*:\\s*([^;]+);`, 'g'))]
    return all.length ? all[all.length - 1][1].trim() : null
  }
  /** Resolve within THIS sheet, following aliases to a fixed point, throwing on failure. */
  const resolveIn = (name: string, scope: string): Rgb => {
    const first: string | null = read(name, scope) ?? read(name, root)
    if (first === null) throw new Error(`--${name} not declared in ${absPath}`)
    let value: string = first
    const seen: string[] = [name]
    for (let i = 0; i < MAX_HOPS; i++) {
      const hop: RegExpMatchArray | null = value.match(/^var\(\s*--([a-z0-9-]+)\s*\)$/i)
      if (hop === null) break
      const next: string = hop[1]
      if (seen.includes(next)) throw new Error(`--${name} cycles: ${seen.join(' -> ')} -> ${next}`)
      seen.push(next)
      const v: string | null = read(next, scope) ?? read(next, root)
      if (v === null) throw new Error(`--${name} aliases --${next}, not declared in ${absPath}`)
      value = v
    }
    const ok = value.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/i)
    if (!ok) throw new Error(`--${name} does not resolve to a bare oklch triple (via ${seen.join(' -> ')}): "${value}"`)
    return oklchToSrgb(Number(ok[1]), Number(ok[2]), Number(ok[3]))
  }
  return { blocks: blocksIn, resolve: resolveIn, root }
}

/**
 * Every top-level block whose selector list contains `selector`, concatenated
 * in source order — NOT the first one. vars.css declares `:root` twice and
 * `.dark` twice, and the second pair is where the role aliases live.
 */
export function blocks(selector: string): string {
  const out: string[] = []
  const re = /([^{}]*)\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(CSS))) {
    const sel = m[1].trim()
    const open = m.index + m[0].length - 1
    let depth = 0
    let close = -1
    for (let i = open; i < CSS.length; i++) {
      if (CSS[i] === '{') depth++
      else if (CSS[i] === '}' && --depth === 0) {
        close = i
        break
      }
    }
    if (close === -1) throw new Error(`unterminated block for "${sel}"`)
    if (sel.split(',').some((s) => s.trim() === selector)) out.push(CSS.slice(open + 1, close))
    re.lastIndex = close
  }
  if (!out.length) throw new Error(`selector ${selector} not found in vars.css`)
  return out.join('\n')
}

export const ROOT = blocks(':root')
export const DARK = blocks('.dark')

/**
 * Resolve `--name` inside a block, following `var()` aliases TO A FIXED POINT.
 *
 * IT USED TO FOLLOW EXACTLY ONE HOP, and that was enough for `css/vars.css`, where
 * `--role-primary` is a bare `oklch()`. It is not enough for `css/braden.css`, where
 * `--role-primary: var(--braden-red)` and `--role-accent-text:
 * var(--role-accent-text-base)`. On 2026-08-28 that cost a false measurement: callers
 * that swallowed the throw treated the unresolved fill as "no tint" and graded every
 * aliased role against plain surfaces only — dropping the /15 and /20 composites,
 * which are the cells that fail. Six Corporate roles read as PASS and the live page
 * said 3.01-3.95.
 *
 * So: loop, with a bounded depth so a cycle cannot hang, and THROW on anything that
 * does not land on a bare oklch triple. Throwing is the point — a resolver that
 * returns null hands its caller a value that is easy to mistake for "nothing to
 * check", and that is precisely how half a cross product went ungraded.
 */
export function resolve_(name: string, scope: string): Rgb {
  const read = (n: string, where: string): string | null => {
    // LAST declaration wins — the same cascade the browser applies.
    const all = [...where.matchAll(new RegExp(`--${n}\\s*:\\s*([^;]+);`, 'g'))]
    return all.length ? all[all.length - 1][1].trim() : null
  }
  const first: string | null = read(name, scope) ?? read(name, ROOT)
  if (first === null) throw new Error(`--${name} not declared`)

  let value: string = first
  const seen: string[] = [name]
  for (let i = 0; i < MAX_HOPS; i++) {
    const hop: RegExpMatchArray | null = value.match(/^var\(\s*--([a-z0-9-]+)\s*\)$/i)
    if (hop === null) break
    const next: string = hop[1]
    if (seen.includes(next)) {
      throw new Error(`--${name} resolves in a cycle: ${seen.join(' -> ')} -> ${next}`)
    }
    seen.push(next)
    const v: string | null = read(next, scope) ?? read(next, ROOT)
    if (v === null) throw new Error(`--${name} aliases --${next}, which is not declared`)
    value = v
  }

  const ok = value.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/i)
  if (!ok) {
    throw new Error(
      `--${name} does not resolve to a bare oklch triple` +
        (seen.length > 1 ? ` (via ${seen.join(' -> ')})` : '') +
        `: "${value}"`,
    )
  }
  return oklchToSrgb(Number(ok[1]), Number(ok[2]), Number(ok[3]))
}

/** Does `--name` resolve in `scope`? Lets a gate enumerate without throwing. */
export function declared(name: string, scope: string): boolean {
  try {
    resolve_(name, scope)
    return true
  } catch {
    return false
  }
}

export const SURFACES = [
  'role-bg-body',
  'role-bg-surface',
  'role-bg-panel',
  'role-bg-input',
  'role-bg-sunken',
] as const
