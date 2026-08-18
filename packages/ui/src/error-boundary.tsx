'use client'

import type { ReactNode } from 'react'
import {
  ErrorBoundary as ReactErrorBoundary,
  type ErrorBoundaryPropsWithRender,
  type FallbackProps,
} from 'react-error-boundary'
import { Button } from './button.js'
import { EmptyState } from './empty-state.js'

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  fallbackRender?: ErrorBoundaryPropsWithRender['fallbackRender']
  onError?: ErrorBoundaryPropsWithRender['onError']
  onReset?: ErrorBoundaryPropsWithRender['onReset']
  resetKeys?: ErrorBoundaryPropsWithRender['resetKeys']
  title?: ReactNode
  description?: ReactNode
  showErrorMessage?: boolean
}

function DefaultFallback({
  error,
  resetErrorBoundary,
  title,
  description,
  showErrorMessage,
}: FallbackProps & Pick<ErrorBoundaryProps, 'title' | 'description' | 'showErrorMessage'>) {
  const safeDescription = 'The view could not be rendered. Please try again.'
  const debugDescription = error instanceof Error ? error.message : safeDescription

  return (
    <EmptyState
      role="alert"
      title={title ?? 'Something went wrong'}
      description={description ?? (showErrorMessage ? debugDescription : safeDescription)}
      action={
        <Button variant="outline" onClick={resetErrorBoundary}>
          Try again
        </Button>
      }
    />
  )
}

export function ErrorBoundary({
  children,
  fallback,
  fallbackRender,
  onError,
  onReset,
  resetKeys,
  title,
  description,
  showErrorMessage,
}: ErrorBoundaryProps) {
  if (fallback !== undefined) {
    return (
      <ReactErrorBoundary
        fallback={fallback}
        onError={onError}
        onReset={onReset}
        resetKeys={resetKeys}
      >
        {children}
      </ReactErrorBoundary>
    )
  }

  if (fallbackRender) {
    return (
      <ReactErrorBoundary
        fallbackRender={fallbackRender}
        onError={onError}
        onReset={onReset}
        resetKeys={resetKeys}
      >
        {children}
      </ReactErrorBoundary>
    )
  }
  return (
    <ReactErrorBoundary
      fallbackRender={(props) => (
        <DefaultFallback
          {...props}
          title={title}
          description={description}
          showErrorMessage={showErrorMessage}
        />
      )}
      onError={onError}
      onReset={onReset}
      resetKeys={resetKeys}
    >
      {children}
    </ReactErrorBoundary>
  )
}
