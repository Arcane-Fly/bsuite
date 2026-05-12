import { create } from 'zustand';
import {
  type EditorBreakpoint,
  type ResponsiveStyleCascade,
  type StyleObj,
  normalizeResponsiveStyleCascade,
  resolveStyles,
} from '../utils/cascade.js';

export const BREAKPOINT_CANVAS_WIDTH: Record<EditorBreakpoint, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

interface PageBuilderStoreState {
  currentBreakpoint: EditorBreakpoint;
  layoutStyles: Record<string, ResponsiveStyleCascade>;
  setCurrentBreakpoint: (breakpoint: EditorBreakpoint) => void;
  setLayoutStyles: (layoutId: string, styles: ResponsiveStyleCascade | StyleObj) => void;
  updateStyleProperty: (
    layoutId: string,
    property: string,
    value: StyleObj[string],
    breakpoint?: EditorBreakpoint,
  ) => void;
  resetStyleProperty: (layoutId: string, property: string, breakpoint?: EditorBreakpoint) => void;
}

const initialStoreState = {
  currentBreakpoint: 'desktop' as EditorBreakpoint,
  layoutStyles: {},
};

export const usePageBuilderStore = create<PageBuilderStoreState>((set, get) => ({
  ...initialStoreState,
  setCurrentBreakpoint: (breakpoint) => set({ currentBreakpoint: breakpoint }),
  setLayoutStyles: (layoutId, styles) =>
    set((state) => ({
      layoutStyles: {
        ...state.layoutStyles,
        [layoutId]: normalizeResponsiveStyleCascade(styles),
      },
    })),
  updateStyleProperty: (layoutId, property, value, breakpoint) =>
    set((state) => {
      const activeBreakpoint = breakpoint ?? state.currentBreakpoint;
      const normalized = normalizeResponsiveStyleCascade(state.layoutStyles[layoutId]);

      if (activeBreakpoint === 'desktop') {
        return {
          layoutStyles: {
            ...state.layoutStyles,
            [layoutId]: {
              ...normalized,
              desktop: {
                ...normalized.desktop,
                [property]: value,
              },
            },
          },
        };
      }

      if (activeBreakpoint === 'tablet') {
        return {
          layoutStyles: {
            ...state.layoutStyles,
            [layoutId]: {
              ...normalized,
              tablet: {
                ...(normalized.tablet ?? {}),
                [property]: value,
              },
            },
          },
        };
      }

      return {
        layoutStyles: {
          ...state.layoutStyles,
          [layoutId]: {
            ...normalized,
            mobile: {
              ...(normalized.mobile ?? {}),
              [property]: value,
            },
          },
        },
      };
    }),
  resetStyleProperty: (layoutId, property, breakpoint) =>
    set((state) => {
      const activeBreakpoint = breakpoint ?? state.currentBreakpoint;
      const normalized = normalizeResponsiveStyleCascade(state.layoutStyles[layoutId]);

      if (activeBreakpoint === 'desktop') {
        const { [property]: _removed, ...desktop } = normalized.desktop;
        return {
          layoutStyles: {
            ...state.layoutStyles,
            [layoutId]: { ...normalized, desktop },
          },
        };
      }

      if (activeBreakpoint === 'tablet') {
        const tablet = normalized.tablet ?? {};
        const { [property]: _removed, ...nextTablet } = tablet;
        return {
          layoutStyles: {
            ...state.layoutStyles,
            [layoutId]: {
              ...normalized,
              tablet: Object.keys(nextTablet).length > 0 ? nextTablet : undefined,
            },
          },
        };
      }

      const mobile = normalized.mobile ?? {};
      const { [property]: _removed, ...nextMobile } = mobile;
      return {
        layoutStyles: {
          ...state.layoutStyles,
          [layoutId]: {
            ...normalized,
            mobile: Object.keys(nextMobile).length > 0 ? nextMobile : undefined,
          },
        },
      };
    }),
}));

export function getResolvedLayoutStyles(
  layoutId: string,
  breakpoint?: EditorBreakpoint,
): ReturnType<typeof resolveStyles> {
  const state = usePageBuilderStore.getState();
  const styles = state.layoutStyles[layoutId];
  return resolveStyles(styles, breakpoint ?? state.currentBreakpoint);
}

export function resetPageBuilderStore(): void {
  usePageBuilderStore.setState(initialStoreState);
}

export function useCurrentBreakpoint(): EditorBreakpoint {
  return usePageBuilderStore((state) => state.currentBreakpoint);
}
