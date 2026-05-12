import { describe, expect, it, vi } from 'vitest';
import {
  emitGeneratedSectionDrop,
  emitGeneratedSectionStream,
  isGeneratedSectionDropDetail,
  isGeneratedSectionStreamDetail,
} from '../aiSectionEvents.js';

describe('aiSectionEvents', () => {
  it('emits dnd-kit-style drop events with the expected source marker', () => {
    const listener = vi.fn();
    window.addEventListener('bsuite-page-builder-ai-drop', listener);

    const emitted = emitGeneratedSectionDrop({
      section: {
        widgetId: 'ai:hero',
        title: 'AI Hero',
        body: 'Generated body',
      },
    });

    window.removeEventListener('bsuite-page-builder-ai-drop', listener);
    expect(emitted).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent<unknown>;
    expect(isGeneratedSectionDropDetail(event.detail)).toBe(true);
  });

  it('validates stream payload shape', () => {
    const listener = vi.fn();
    window.addEventListener('bsuite-page-builder-ai-stream', listener);

    const emitted = emitGeneratedSectionStream({
      status: 'generating',
      message: 'Generating section preview…',
    });

    window.removeEventListener('bsuite-page-builder-ai-stream', listener);
    expect(emitted).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent<unknown>;
    expect(isGeneratedSectionStreamDetail(event.detail)).toBe(true);
  });
});
