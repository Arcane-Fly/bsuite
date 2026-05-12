import type { GridLayoutItem } from './types.js';

export const DEFAULT_GENERATED_SECTION_DROP_EVENT_NAMES = ['bsuite-page-builder-ai-drop'] as const;
export const DEFAULT_GENERATED_SECTION_STREAM_EVENT_NAMES = ['bsuite-page-builder-ai-stream'] as const;

export type GeneratedSectionTone =
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'destructive';

export interface GeneratedSectionSize {
  w?: GridLayoutItem['w'];
  h?: GridLayoutItem['h'];
  minW?: GridLayoutItem['minW'];
  minH?: GridLayoutItem['minH'];
}

export interface GeneratedSectionPreview {
  widgetId: string;
  title: string;
  body: string;
  ctaLabel?: string;
  tone?: GeneratedSectionTone;
  defaultSize?: GeneratedSectionSize;
}

export interface GeneratedSectionDropDetail {
  source: 'dnd-kit-emulated-drop';
  section: GeneratedSectionPreview;
}

export type GeneratedSectionStreamStatus = 'generating' | 'ready' | 'error';

export interface GeneratedSectionStreamDetail {
  status: GeneratedSectionStreamStatus;
  message?: string;
}

export function isGeneratedSectionDropDetail(value: unknown): value is GeneratedSectionDropDetail {
  if (!value || typeof value !== 'object') return false;
  const detail = value as Partial<GeneratedSectionDropDetail>;
  if (detail.source !== 'dnd-kit-emulated-drop') return false;
  if (!detail.section || typeof detail.section !== 'object') return false;
  const section = detail.section as Partial<GeneratedSectionPreview>;
  return (
    typeof section.widgetId === 'string' &&
    section.widgetId.length > 0 &&
    typeof section.title === 'string' &&
    section.title.length > 0 &&
    typeof section.body === 'string' &&
    section.body.length > 0
  );
}

export function isGeneratedSectionStreamDetail(value: unknown): value is GeneratedSectionStreamDetail {
  if (!value || typeof value !== 'object') return false;
  const detail = value as Partial<GeneratedSectionStreamDetail>;
  return detail.status === 'generating' || detail.status === 'ready' || detail.status === 'error';
}

export function emitGeneratedSectionDrop(
  detail: Omit<GeneratedSectionDropDetail, 'source'>,
  eventName = DEFAULT_GENERATED_SECTION_DROP_EVENT_NAMES[0],
): boolean {
  if (typeof window === 'undefined') return false;
  window.dispatchEvent(
    new CustomEvent<GeneratedSectionDropDetail>(eventName, {
      detail: { source: 'dnd-kit-emulated-drop', ...detail },
    }),
  );
  return true;
}

export function emitGeneratedSectionStream(
  detail: GeneratedSectionStreamDetail,
  eventName = DEFAULT_GENERATED_SECTION_STREAM_EVENT_NAMES[0],
): boolean {
  if (typeof window === 'undefined') return false;
  window.dispatchEvent(new CustomEvent<GeneratedSectionStreamDetail>(eventName, { detail }));
  return true;
}
