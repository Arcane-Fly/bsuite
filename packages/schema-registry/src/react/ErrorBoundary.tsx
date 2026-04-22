'use client';
import React from 'react';
interface State { hasError: boolean; }
export class ErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { if (process.env.NODE_ENV !== 'production') console.error('[TenantLayoutSlot] Widget error caught:', error); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}
