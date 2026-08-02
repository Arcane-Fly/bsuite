import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AppSwitcher } from '../AppSwitcher.js'

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

  // Cross-app handoff contract (2026-05-27):
  //   The href on non-current apps MUST route through /auth/login so the
  //   destination establishes a per-app session. The current app's link
  //   stays as bare app.url because that's a same-origin click — the
  //   user already has session storage on that origin. See launchUrl.ts
  //   doc-comment for the full rationale.
  describe('cross-app handoff', () => {
    const crossAppApps = [
      { key: 'bsu', name: 'Business Suite', shortName: 'BSU', icon: MockIcon, url: 'https://suite.crm7.app', description: 'Portal' },
      { key: 'crm7', name: 'CRM7', shortName: 'CRM7', icon: MockIcon, url: 'https://crm.crm7.app', description: 'CRM' },
      { key: 'r8', name: 'R8 Calculator', shortName: 'R8', icon: MockIcon, url: 'https://r8.crm7.app/', description: 'Calc' },
    ]

    it('routes non-current apps through /auth/login?return_path=%2Fdashboard', () => {
      render(<AppSwitcher apps={crossAppApps} currentApp="bsu" />)
      fireEvent.click(screen.getByRole('button'))
      const crm7Link = screen.getByRole('menuitem', { name: /CRM7/i })
      expect(crm7Link).toHaveAttribute(
        'href',
        'https://crm.crm7.app/auth/login?return_path=%2Fdashboard',
      )
    })

    it('trims trailing slash on appUrl before appending /auth/login', () => {
      render(<AppSwitcher apps={crossAppApps} currentApp="bsu" />)
      fireEvent.click(screen.getByRole('button'))
      const r8Link = screen.getByRole('menuitem', { name: /R8 Calculator/i })
      expect(r8Link).toHaveAttribute(
        'href',
        'https://r8.crm7.app/auth/login?return_path=%2Fdashboard',
      )
    })

    it('keeps current app link as bare appUrl (same-origin, no handoff needed)', () => {
      render(<AppSwitcher apps={crossAppApps} currentApp="bsu" />)
      fireEvent.click(screen.getByRole('button'))
      const bsuLink = screen.getByRole('menuitem', { name: /Business Suite/i })
      expect(bsuLink).toHaveAttribute('href', 'https://suite.crm7.app')
    })

    it('exposes data-app-key for analytics aggregation', () => {
      render(<AppSwitcher apps={crossAppApps} currentApp="bsu" />)
      fireEvent.click(screen.getByRole('button'))
      const crm7Link = screen.getByRole('menuitem', { name: /CRM7/i })
      expect(crm7Link).toHaveAttribute('data-app-key', 'crm7')
    })
  })
})
