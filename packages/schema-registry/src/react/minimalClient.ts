'use client';
import { QueryClient } from '@tanstack/react-query';

let _client: QueryClient | null = null;

export function createMinimalClient(): QueryClient {
  if (!_client) {
    _client = new QueryClient({
      defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
    });
  }
  return _client;
}
