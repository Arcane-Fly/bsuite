import { act, render } from '@testing-library/react'
import { createRef, useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useOnClickOutside } from '../hooks/useOnClickOutside.js'

function Harness({ enabled, handler }: { enabled: boolean; handler: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useOnClickOutside(ref, handler, enabled)
  return (
    <div>
      <div ref={ref} data-testid="menu">
        menu content
      </div>
      <button type="button" data-testid="outside">
        outside
      </button>
    </div>
  )
}

describe('useOnClickOutside', () => {
  it('calls the handler on an outside pointerdown', () => {
    const handler = vi.fn()
    const { getByTestId } = render(<Harness enabled handler={handler} />)
    act(() => {
      getByTestId('outside').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not call the handler on a pointerdown inside the container', () => {
    const handler = vi.fn()
    const { getByTestId } = render(<Harness enabled handler={handler} />)
    act(() => {
      getByTestId('menu').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('calls the handler on Escape', () => {
    const handler = vi.fn()
    render(<Harness enabled handler={handler} />)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does nothing when disabled', () => {
    const handler = vi.fn()
    const { getByTestId } = render(<Harness enabled={false} handler={handler} />)
    act(() => {
      getByTestId('outside').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not throw when the ref is unattached', () => {
    const handler = vi.fn()
    const ref = createRef<HTMLDivElement>()
    function UnattachedHarness() {
      useOnClickOutside(ref, handler, true)
      return (
        <button type="button" data-testid="outside">
          outside
        </button>
      )
    }
    const { getByTestId } = render(<UnattachedHarness />)
    expect(() => {
      act(() => {
        getByTestId('outside').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      })
    }).not.toThrow()
    expect(handler).not.toHaveBeenCalled()
  })
})
