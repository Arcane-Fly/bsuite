import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '../button.js'

// jsdom does not evaluate Tailwind, so this pins the edge the outline Button draws.
// `border-input` resolves to --role-border, a separator colour (~1.1:1 on light
// surfaces). Every consumer's EntitySelector trigger is this Button, so the
// Funding Source and Apprentice pickers on crm7 /claims/new measured 1.12:1
// beside 4.40:1 sibling fields (bsuite#1958).
describe('outline Button draws the interactive boundary', () => {
  it('uses border-border-interactive, not the separator edge', () => {
    render(<Button variant="outline">Search apprentices</Button>)
    const classes = screen.getByRole('button', { name: 'Search apprentices' }).className.split(' ')
    expect(classes).toContain('border-border-interactive')
    expect(classes).not.toContain('border-input')
  })
})
