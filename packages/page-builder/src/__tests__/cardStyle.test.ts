/*
 * The card-appearance contract.
 *
 * The load-bearing guarantee is the FIRST test: a page nobody has restyled
 * emits no custom properties at all. Card chrome is on ~305 crm7 pages plus
 * every card surface in five other apps, so a capability that shipped with a
 * non-empty default would be an estate-wide restyle disguised as a feature.
 */
import { describe, expect, it } from 'vitest';
import {
  BORDER_TONES,
  BORDER_WIDTH_RANGE,
  DEFAULT_CARD_STYLE,
  PADDING_RANGE,
  RADIUS_RANGE,
  describeCardStyle,
  isDefaultCardStyle,
  normaliseCardStyle,
  toCssVars,
  type CardStyle,
} from '../cardStyle.js';

const vars = (style: CardStyle) => toCssVars(style) as unknown as Record<string, string>;

describe('the default costs nothing', () => {
  it('emits NO custom properties, so an untouched page renders byte-identical CSS', () => {
    expect(Object.keys(vars(DEFAULT_CARD_STYLE))).toEqual([]);
  });

  it('recognises itself as default', () => {
    expect(isDefaultCardStyle(DEFAULT_CARD_STYLE)).toBe(true);
  });

  it('emits ONLY the property the operator actually changed', () => {
    const emitted = vars({ ...DEFAULT_CARD_STYLE, radius: 4 });
    expect(Object.keys(emitted)).toEqual(['--radius-card']);
    expect(emitted['--radius-card']).toBe('4px');
  });
});

describe('border colour is a token, never a literal', () => {
  it('every non-default tone resolves through a CSS variable', () => {
    for (const tone of BORDER_TONES) {
      if (tone === DEFAULT_CARD_STYLE.borderTone) continue;
      const emitted = vars({ ...DEFAULT_CARD_STYLE, borderTone: tone });
      const value = emitted['--card-border-color'];
      if (tone === 'transparent') {
        expect(value).toBe('transparent');
      } else {
        expect(value).toBe(`var(--${tone})`);
      }
    }
  });

  it('no emitted value can be a raw colour, which would opt a tenant out of white-labelling', () => {
    for (const tone of BORDER_TONES) {
      const emitted = vars({ ...DEFAULT_CARD_STYLE, borderTone: tone, radius: 8, borderWidth: 3 });
      for (const value of Object.values(emitted)) {
        expect(value.includes('#'), `${value} must not carry a hex literal`).toBe(false);
        expect(value.includes('rgb'), `${value} must not carry an rgb literal`).toBe(false);
        expect(value.includes('oklch'), `${value} must not carry an oklch literal`).toBe(false);
      }
    }
  });
});

describe('a stored preference is untrusted input', () => {
  it('falls back to the default for a tone that no longer exists', () => {
    const restored = normaliseCardStyle({ borderTone: 'chartreuse' });
    expect(restored.borderTone).toBe(DEFAULT_CARD_STYLE.borderTone);
  });

  it('keeps the operator’s other valid choices when ONE key is bad', () => {
    const restored = normaliseCardStyle({ borderTone: 'nonsense', radius: 12, borderWidth: 3 });
    expect(restored.radius).toBe(12);
    expect(restored.borderWidth).toBe(3);
  });

  it('clamps out-of-range numbers rather than painting them', () => {
    const high = normaliseCardStyle({ radius: 9999, borderWidth: 9999, padding: 9999 });
    expect(high.radius).toBe(RADIUS_RANGE.max);
    expect(high.borderWidth).toBe(BORDER_WIDTH_RANGE.max);
    expect(high.padding).toBe(PADDING_RANGE.max);
    const low = normaliseCardStyle({ radius: -50, borderWidth: -50 });
    expect(low.radius).toBe(RADIUS_RANGE.min);
    expect(low.borderWidth).toBe(BORDER_WIDTH_RANGE.min);
  });

  it('survives the shapes a preference store can actually return', () => {
    for (const junk of [null, undefined, 'a string', 42, [], NaN]) {
      expect(() => normaliseCardStyle(junk)).not.toThrow();
      expect(normaliseCardStyle(junk).borderTone).toBe(DEFAULT_CARD_STYLE.borderTone);
    }
  });

  it('rejects an elevation outside 0..4 instead of emitting a missing token', () => {
    expect(normaliseCardStyle({ elevation: 9 }).elevation).toBe(null);
    expect(normaliseCardStyle({ elevation: -1 }).elevation).toBe(null);
    expect(normaliseCardStyle({ elevation: 3 }).elevation).toBe(3);
  });
});

describe('elevation maps onto the theme scale', () => {
  it('uses --shadow-elev-N, which @bsuite/theme ships', () => {
    expect(vars({ ...DEFAULT_CARD_STYLE, elevation: 0 })['--card-shadow']).toBe('var(--shadow-elev-0)');
    expect(vars({ ...DEFAULT_CARD_STYLE, elevation: 4 })['--card-shadow']).toBe('var(--shadow-elev-4)');
  });

  it('emits nothing when the operator has not chosen one, preserving shadow-sm', () => {
    expect('--card-shadow' in vars(DEFAULT_CARD_STYLE)).toBe(false);
  });
});

describe('the readout describes the card in the operator’s words', () => {
  it('names a customised border', () => {
    const text = describeCardStyle({
      ...DEFAULT_CARD_STYLE,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderTone: 'accent',
      radius: 8,
    });
    expect(text).toContain('2px dashed accent border');
    expect(text).toContain('8px corners');
  });

  it('says "no border" rather than "0px solid" when the border is off', () => {
    expect(describeCardStyle({ ...DEFAULT_CARD_STYLE, borderWidth: 0 })).toContain('no border');
    expect(describeCardStyle({ ...DEFAULT_CARD_STYLE, borderStyle: 'none' })).toContain('no border');
  });

  it('never renders a raw CSS variable to the operator', () => {
    const text = describeCardStyle({ ...DEFAULT_CARD_STYLE, borderTone: 'primary', elevation: 2 });
    expect(text.includes('var(')).toBe(false);
    expect(text.includes('--')).toBe(false);
  });
});
