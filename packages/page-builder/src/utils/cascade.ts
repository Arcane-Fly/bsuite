export const EDITOR_BREAKPOINTS = ['desktop', 'tablet', 'mobile'] as const;

export type EditorBreakpoint = (typeof EDITOR_BREAKPOINTS)[number];

export type StyleValue = string | number | boolean | null;

export type StyleObj = Record<string, StyleValue>;

export interface ResponsiveStyleCascade {
  desktop: StyleObj;
  tablet?: Partial<StyleObj>;
  mobile?: Partial<StyleObj>;
}

export interface ResolvedStyles {
  styles: StyleObj;
  overriddenProperties: Set<string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStyleObj(input: unknown): StyleObj {
  if (!isRecord(input)) return {};

  const normalized: StyleObj = {};
  for (const [key, value] of Object.entries(input)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      normalized[key] = value;
    }
  }
  return normalized;
}

export function normalizeResponsiveStyleCascade(
  value: ResponsiveStyleCascade | StyleObj | null | undefined,
): ResponsiveStyleCascade {
  if (!isRecord(value)) {
    return { desktop: {} };
  }

  if ('desktop' in value) {
    return {
      desktop: normalizeStyleObj(value.desktop),
      tablet: normalizeStyleObj(value.tablet),
      mobile: normalizeStyleObj(value.mobile),
    };
  }

  return { desktop: normalizeStyleObj(value) };
}

export function resolveStyles(
  value: ResponsiveStyleCascade | StyleObj | null | undefined,
  breakpoint: EditorBreakpoint,
): ResolvedStyles {
  const normalized = normalizeResponsiveStyleCascade(value);
  const desktop = normalized.desktop ?? {};
  const tablet = normalized.tablet ?? {};
  const mobile = normalized.mobile ?? {};

  if (breakpoint === 'desktop') {
    return {
      styles: { ...desktop },
      overriddenProperties: new Set(),
    };
  }

  if (breakpoint === 'tablet') {
    return {
      styles: normalizeStyleObj({ ...desktop, ...tablet }),
      overriddenProperties: new Set(Object.keys(tablet)),
    };
  }

  return {
    styles: normalizeStyleObj({ ...desktop, ...tablet, ...mobile }),
    overriddenProperties: new Set(Object.keys(mobile)),
  };
}
