import { describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../dialog.js'
import { EmptyState } from '../empty-state.js'
import { ErrorBoundary } from '../error-boundary.js'
import { LoadingSpinner } from '../loading-spinner.js'
import { StatusBadge } from '../status-badge.js'

describe('@bsuite/ui primitives', () => {
  it('renders button variants with safe default type', () => {
    render(
      <>
        <Button>Save</Button>
        <Button variant="destructive" size="sm">
          Remove
        </Button>
      </>,
    )

    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: 'Remove' })).toHaveClass('bg-destructive')
  })

  it('renders empty state copy and action', () => {
    render(
      <EmptyState
        title="No placements"
        description="Placements appear here after CRM7 creates them."
        action={<Button variant="outline">Open CRM7</Button>}
      />,
    )

    expect(screen.getByRole('heading', { name: 'No placements' })).toBeInTheDocument()
    expect(screen.getByText('Placements appear here after CRM7 creates them.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open CRM7' })).toBeInTheDocument()
  })

  it('opens dialog content through the trigger', async () => {
    const user = userEvent.setup()

    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm action</DialogTitle>
            <DialogDescription>Confirm this shared dialog works.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    )

    await user.click(screen.getByRole('button', { name: 'Open' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Confirm this shared dialog works.')).toBeInTheDocument()
  })

  it('renders accessible loading spinner', () => {
    render(<LoadingSpinner label="Loading tenants" size="lg" />)

    expect(screen.getByRole('status', { name: 'Loading tenants' })).toHaveClass('h-8', 'w-8')
  })

  it('renders status badge tones', () => {
    render(<StatusBadge tone="success">Complete</StatusBadge>)

    expect(screen.getByText('Complete')).toHaveClass('text-status-success')
  })

  it('renders a safe default error boundary fallback', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    function BrokenView(): ReactElement {
      throw new Error('Exploded')
    }

    render(
      <ErrorBoundary>
        <BrokenView />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('The view could not be rendered. Please try again.')).toBeInTheDocument()
    expect(screen.queryByText('Exploded')).not.toBeInTheDocument()

    consoleError.mockRestore()
  })

  it('can opt in to rendering the thrown message for local debugging', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    function BrokenView(): ReactElement {
      throw new Error('Local debug detail')
    }

    render(
      <ErrorBoundary showErrorMessage>
        <BrokenView />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Local debug detail')).toBeInTheDocument()

    consoleError.mockRestore()
  })

  it('respects null fallback as an intentional empty boundary', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    function BrokenView(): ReactElement {
      throw new Error('Hidden fallback detail')
    }

    const { container } = render(
      <ErrorBoundary fallback={null}>
        <BrokenView />
      </ErrorBoundary>,
    )

    expect(container).toBeEmptyDOMElement()

    consoleError.mockRestore()
  })
})
