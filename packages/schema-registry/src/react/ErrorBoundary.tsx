'use client';
import React from 'react';

function isProductionRuntime(): boolean {
  const maybeProcess = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
  return maybeProcess?.env?.NODE_ENV === 'production';
}

interface State { hasError: boolean; }
export class ErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { if (!isProductionRuntime()) console.error('[schema-registry ErrorBoundary] Widget error caught:', error); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}
