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

/** Resolve `--name` inside a block, following at most one `var(--other)` hop. */
export function resolve_(name: string, scope: string): Rgb {
  const read = (n: string, where: string) => {
    // LAST declaration wins — the same cascade the browser applies.
    const all = [...where.matchAll(new RegExp(`--${n}\\s*:\\s*([^;]+);`, 'g'))]
    return all.length ? all[all.length - 1][1].trim() : null
  }
  let value = read(name, scope) ?? read(name, ROOT)
  if (!value) throw new Error(`--${name} not declared`)
  const hop = value.match(/^var\(\s*--([a-z0-9-]+)\s*\)$/i)
  if (hop) value = read(hop[1], scope) ?? read(hop[1], ROOT) ?? ''
  const ok = value.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/i)
  if (!ok) throw new Error(`--${name} does not resolve to a bare oklch triple: "${value}"`)
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
