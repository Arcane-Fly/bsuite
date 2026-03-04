import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AppSwitcher } from '../AppSwitcher'

// Simple mock icon component
const MockIcon = ({ className }: { className?: string }) => (
  <svg className={className} data-testid="mock-icon" />
)

const apps = [
  { key: 'bsu', name: 'Business Suite', shortName: 'BSU', icon: MockIcon, url: '/bsu', description: 'Portal' },
  { key: 'crm7', name: 'CRM7', shortName: 'CRM7', icon: MockIcon, url: '/crm7', description: 'CRM' },
]

describe('AppSwitcher', () => {
  it('renders current app shortName in button', () => {
    render(<AppSwitcher apps={apps} currentApp="bsu" />)
    expect(screen.getByText('BSU')).toBeInTheDocument()
  })

  it('opens dropdown on click showing all apps', () => {
    render(<AppSwitcher apps={apps} currentApp="bsu" />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByText('Business Suite')).toBeInTheDocument()
    expect(screen.getByText('CRM7')).toBeInTheDocument()
  })

  it('closes on Escape key', () => {
    render(<AppSwitcher apps={apps} currentApp="bsu" />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('marks current app with aria-current=page', () => {
    render(<AppSwitcher apps={apps} currentApp="bsu" />)
    fireEvent.click(screen.getByRole('button'))
    const bsuLink = screen.getByRole('menuitem', { name: /Business Suite/i })
    expect(bsuLink).toHaveAttribute('aria-current', 'page')
    const crm7Link = screen.getByRole('menuitem', { name: /CRM7/i })
    expect(crm7Link).not.toHaveAttribute('aria-current')
  })
})
