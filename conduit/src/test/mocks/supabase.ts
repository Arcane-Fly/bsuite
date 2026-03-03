import { vi } from 'vitest';

/**
 * Mock Supabase client for testing.
 * Provides chainable query builder methods that resolve to empty data by default.
 */
export function createMockSupabaseClient() {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockImplementation((resolve) =>
      resolve({ data: [], error: null, count: 0 })
    ),
  };

  // Make the query builder thenable (for await)
  const makeThenable = (builder: typeof mockQueryBuilder) => {
    builder.then = vi.fn().mockImplementation((resolve) =>
      Promise.resolve(resolve({ data: [], error: null, count: 0 }))
    );
    return builder;
  };

  const client = {
    from: vi.fn().mockReturnValue(makeThenable({ ...mockQueryBuilder })),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { id: 'test-user-id', email: 'test@example.com' },
          },
        },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    }),
  };

  return client;
}

/**
 * Mock the Supabase module for component tests
 */
export function mockSupabaseModule() {
  const client = createMockSupabaseClient();

  vi.mock('@/lib/supabase/client', () => ({
    createClient: () => client,
  }));

  return client;
}
