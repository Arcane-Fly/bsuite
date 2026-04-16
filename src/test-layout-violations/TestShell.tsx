// TEST FILE — deliberate DOM layout violations for CI smoke test
// This file intentionally violates AGENTS.md layout invariants.
// DO NOT MERGE — this PR exists only to verify the dom-layout-lint workflow blocks.

import React from 'react';

// VIOLATION 1: min-h-screen on a shell-named component
// Expected: INVARIANT 1 error from dom-layout-lint
export function TestShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 flex-col">sidebar</aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <main role="main" className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}

// VIOLATION 2: hardcoded calc(100vh-64px)
// Expected: INVARIANT 2 error from dom-layout-lint
export function CalcLayout() {
  return (
    <div className="flex h-[calc(100vh-64px)] w-full">
      <main className="flex-1 overflow-auto">content</main>
    </div>
  );
}

// VIOLATION 3: non-standard z-index utility
// Expected: INVARIANT 3 error from dom-layout-lint
export function ZIndexBanner() {
  return (
    <div className="sticky top-0 z-200 w-full bg-amber-500 px-4 py-2">
      Banner with wrong z-index
    </div>
  );
}

// VIOLATION 4: role="main" on <main>
// Expected: INVARIANT 5 error from dom-layout-lint
export function RedundantRole() {
  return (
    <main role="main" className="flex-1 overflow-y-auto">
      content
    </main>
  );
}
