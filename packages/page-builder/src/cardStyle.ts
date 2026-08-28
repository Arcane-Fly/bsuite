/*
 * cardStyle.ts — the card's appearance, as something the operator edits.
 *
 * WHY THIS EXISTS. Card chrome — the border, the corner radius, the shadow,
 * the padding — was a string of Tailwind classes compiled into
 * `PageGridLayout`. Changing any of it meant asking an agent to edit the
 * package, publish it, and roll it through five apps. The operator has asked
 * for the border to be corrected repeatedly, and each ask cost a full release
 * cycle to answer. The remedy is not another correct border; it is to stop
 * being the only one who can set it.
 *
 * THE DEFAULT IS "DON'T EMIT ANYTHING". `toCssVars` returns only the
 * properties that DIFFER from `DEFAULT_CARD_STYLE`, and the chrome element
 * falls back to exactly the values it used before this file existed. A page
 * whose operator has never opened the editor therefore renders byte-identical
 * CSS — this is a capability, not a restyle, and it must not show up as a
 * visual diff on 305 pages the day it ships.
 *
 * TOKENS, NOT COLOURS. `borderTone` names a theme token, never a literal.
 * The estate bans hex/rgb in D2C apps (`bsuite/no-hardcoded-colours`) and the
 * whole point of `--border` is that a tenant can rebrand it. An editor that
 * wrote a raw hex value into a preference would be a white-label regression wearing
 * a feature's clothes, so the palette below is a closed set of token names and
 * the type makes an arbitrary string unrepresentable.
 */

/** Theme tokens a border may reference. Closed set — never a raw colour. */
export const BORDER_TONES = [
  'border',
  'primary',
  'accent',
  'muted',
  'destructive',
  'transparent',
] as const;

export type BorderTone = (typeof BORDER_TONES)[number];

export const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'none'] as const;
export type BorderStyle = (typeof BORDER_STYLES)[number];

/** `--shadow-elev-0..4`, shipped by @bsuite/theme >= 0.11.0. */
export type Elevation = 0 | 1 | 2 | 3 | 4;

export interface CardStyle {
  /** Corner radius in px. */
  radius: number;
  /** Border thickness in px. */
  borderWidth: number;
  /** Theme token the border colour reads from. */
  borderTone: BorderTone;
  borderStyle: BorderStyle;
  /**
   * `null` means "leave the class-based shadow alone" — which is what every
   * card did before this file. A number selects `--shadow-elev-N`.
   */
  elevation: Elevation | null;
  /** Inner padding in px. `null` leaves the card's own padding untouched. */
  padding: number | null;
}

/**
 * The values the chrome element already rendered.
 *
 * `radius: 24` is `1.5rem`, the existing `--radius-card` fallback.
 * `borderWidth: 1` + `borderTone: 'border'` is the existing `border
 * border-border`. `elevation: null` preserves `shadow-sm` and the dark-mode
 * `--glow-card` rule rather than replacing them with an elevation token that
 * is close but not equal.
 */
export const DEFAULT_CARD_STYLE: CardStyle = {
  radius: 24,
  borderWidth: 1,
  borderTone: 'border',
  borderStyle: 'solid',
  elevation: null,
  padding: null,
};

export const RADIUS_RANGE = { min: 0, max: 48 } as const;
export const BORDER_WIDTH_RANGE = { min: 0, max: 8 } as const;
export const PADDING_RANGE = { min: 0, max: 48 } as const;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Coerce anything read back out of a preference store into a valid style.
 *
 * Preferences are user-writable JSON that survives releases, so this has to
 * treat its input as untrusted: a stored `borderTone` naming a token that no
 * longer exists must not paint an invalid border, it must fall back. Every
 * field is validated independently so one bad key cannot discard the rest of
 * the operator's choices.
 */
export function normaliseCardStyle(input: unknown): CardStyle {
  if (input === null || typeof input !== 'object') return { ...DEFAULT_CARD_STYLE };
  const raw = input as Partial<Record<keyof CardStyle, unknown>>;
  const tone = BORDER_TONES.includes(raw.borderTone as BorderTone)
    ? (raw.borderTone as BorderTone)
    : DEFAULT_CARD_STYLE.borderTone;
  const style = BORDER_STYLES.includes(raw.borderStyle as BorderStyle)
    ? (raw.borderStyle as BorderStyle)
    : DEFAULT_CARD_STYLE.borderStyle;
  const elevation =
    typeof raw.elevation === 'number' && raw.elevation >= 0 && raw.elevation <= 4
      ? (Math.round(raw.elevation) as Elevation)
      : null;
  return {
    radius:
      typeof raw.radius === 'number'
        ? clamp(raw.radius, RADIUS_RANGE.min, RADIUS_RANGE.max)
        : DEFAULT_CARD_STYLE.radius,
    borderWidth:
      typeof raw.borderWidth === 'number'
        ? clamp(raw.borderWidth, BORDER_WIDTH_RANGE.min, BORDER_WIDTH_RANGE.max)
        : DEFAULT_CARD_STYLE.borderWidth,
    borderTone: tone,
    borderStyle: style,
    elevation,
    padding:
      typeof raw.padding === 'number'
        ? clamp(raw.padding, PADDING_RANGE.min, PADDING_RANGE.max)
        : null,
  };
}

export function isDefaultCardStyle(style: CardStyle): boolean {
  return (
    style.radius === DEFAULT_CARD_STYLE.radius &&
    style.borderWidth === DEFAULT_CARD_STYLE.borderWidth &&
    style.borderTone === DEFAULT_CARD_STYLE.borderTone &&
    style.borderStyle === DEFAULT_CARD_STYLE.borderStyle &&
    style.elevation === DEFAULT_CARD_STYLE.elevation &&
    style.padding === DEFAULT_CARD_STYLE.padding
  );
}

/** The CSS custom properties a non-default style needs. Empty when default. */
export function toCssVars(style: CardStyle): React.CSSProperties {
  const vars: Record<string, string> = {};
  if (style.radius !== DEFAULT_CARD_STYLE.radius) {
    vars['--radius-card'] = `${style.radius}px`;
  }
  if (style.borderWidth !== DEFAULT_CARD_STYLE.borderWidth) {
    vars['--card-border-width'] = `${style.borderWidth}px`;
  }
  if (style.borderTone !== DEFAULT_CARD_STYLE.borderTone) {
    // `transparent` is a CSS-wide keyword, not a token, so it is not wrapped.
    vars['--card-border-color'] =
      style.borderTone === 'transparent' ? 'transparent' : `var(--${style.borderTone})`;
  }
  if (style.borderStyle !== DEFAULT_CARD_STYLE.borderStyle) {
    vars['--card-border-style'] = style.borderStyle;
  }
  if (style.elevation !== null) {
    vars['--card-shadow'] = `var(--shadow-elev-${style.elevation})`;
  }
  if (style.padding !== null) {
    vars['--card-padding'] = `${style.padding}px`;
  }
  return vars as React.CSSProperties;
}

/**
 * A human sentence describing the current card, for the editor's live readout.
 *
 * The operator is adjusting something they can see, so the readout names the
 * change in their words rather than echoing CSS: "2px dashed accent border,
 * 8px corners". D8.3 -- a control whose effect you cannot predict from the
 * screen is not finished.
 */
export function describeCardStyle(style: CardStyle): string {
  const parts: string[] = [];
  if (style.borderStyle === 'none' || style.borderWidth === 0) {
    parts.push('no border');
  } else {
    const tone = style.borderTone === 'border' ? 'default' : style.borderTone;
    parts.push(`${style.borderWidth}px ${style.borderStyle} ${tone} border`);
  }
  parts.push(style.radius === 0 ? 'square corners' : `${style.radius}px corners`);
  if (style.elevation !== null) {
    parts.push(style.elevation === 0 ? 'no shadow' : `elevation ${style.elevation}`);
  }
  if (style.padding !== null) parts.push(`${style.padding}px padding`);
  return parts.join(', ');
}
