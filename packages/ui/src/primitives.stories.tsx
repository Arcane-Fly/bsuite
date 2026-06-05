import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from './button.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog.js'
import { EmptyState } from './empty-state.js'
import { ErrorBoundary } from './error-boundary.js'
import { LoadingSpinner } from './loading-spinner.js'
import { StatusBadge } from './status-badge.js'

const meta = {
  title: 'Primitives/Overview',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function CrashButton() {
  const [shouldCrash, setShouldCrash] = useState(false)
  if (shouldCrash) throw new Error('Storybook fallback preview')

  return (
    <Button variant="outline" onClick={() => setShouldCrash(true)}>
      Trigger fallback
    </Button>
  )
}

export const CorePrimitives: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-8 text-foreground">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Status</h2>
        <div className="flex flex-wrap gap-3">
          <StatusBadge>Draft</StatusBadge>
          <StatusBadge tone="info">In progress</StatusBadge>
          <StatusBadge tone="success">Complete</StatusBadge>
          <StatusBadge tone="warning">Needs review</StatusBadge>
          <StatusBadge tone="destructive">Blocked</StatusBadge>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Feedback</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            title="No records yet"
            description="Create or import records once the owning app has the canonical data."
            action={<Button variant="outline">Create record</Button>}
          />
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-card">
            <LoadingSpinner label="Loading preview" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Dialog</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Shared dialog</DialogTitle>
              <DialogDescription>
                This primitive wraps Radix Dialog with BSuite semantic tokens.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Error boundary</h2>
        <ErrorBoundary>
          <CrashButton />
        </ErrorBoundary>
      </section>
    </div>
  ),
}
