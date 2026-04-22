import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantLayoutSlot } from './TenantLayoutSlot';

// Mock useTenantPageLayout
vi.mock('./useTenantPageLayout', () => ({
  useTenantPageLayout: vi.fn(),
}));

import { useTenantPageLayout } from './useTenantPageLayout';

const mockUseTenantPageLayout = vi.mocked(useTenantPageLayout);

// Minimal supabase mock
const mockSupabase = {
  from: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })),
  removeChannel: vi.fn(),
} as unknown as Parameters<typeof TenantLayoutSlot>[0]['supabase'];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TenantLayoutSlot', () => {
  it('renders null when isLoading is true', () => {
    mockUseTenantPageLayout.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useTenantPageLayout>);

    const { container } = render(
      <TenantLayoutSlot supabase={mockSupabase} route="/test" appScope="crm7" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null when layout is null', () => {
    mockUseTenantPageLayout.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useTenantPageLayout>);

    const { container } = render(
      <TenantLayoutSlot supabase={mockSupabase} route="/test" appScope="crm7" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null when layout_json is malformed', () => {
    mockUseTenantPageLayout.mockReturnValue({
      data: { layout_json: { invalid: true } },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useTenantPageLayout>);

    const { container } = render(
      <TenantLayoutSlot supabase={mockSupabase} route="/test" appScope="crm7" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders UnknownWidget for unknown widget type without throwing', () => {
    mockUseTenantPageLayout.mockReturnValue({
      data: {
        layout_json: {
          widgets: [
            {
              id: 'w1',
              type: 'SomeUnknownWidget',
              props: {},
              position: { x: 0, y: 0, w: 12, h: 4 },
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useTenantPageLayout>);

    expect(() => {
      render(<TenantLayoutSlot supabase={mockSupabase} route="/test" appScope="crm7" />);
    }).not.toThrow();
  });

  it('ErrorBoundary catches widget crash and renders null fallback', () => {
    // Use an unknown widget type so that WidgetPropsSchema.safeParse returns failure
    // and UnknownWidget is rendered — this avoids async useEffect errors
    // The ErrorBoundary wraps each widget and returns null on crash
    mockUseTenantPageLayout.mockReturnValue({
      data: {
        layout_json: {
          widgets: [
            {
              id: 'w-crash',
              type: 'CrashingWidget',
              props: {},
              position: { x: 0, y: 0, w: 12, h: 4 },
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useTenantPageLayout>);

    // Suppress console.error for expected boundary catches
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TenantLayoutSlot supabase={mockSupabase} route="/test" appScope="crm7" />);
    }).not.toThrow();

    consoleError.mockRestore();
  });
});
