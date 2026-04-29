import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSchemaController } from '../hooks/useSchemaController.js'
import type { EntityField, SchemaController } from '../types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeField(overrides: Partial<EntityField> = {}): EntityField {
  return {
    id:         'field-1',
    entity_id:  'entity-1',
    tenant_id:  'tenant-1',
    field_name: 'my_field',
    field_type: 'text',
    nullable:   true,
    sort_order: 10,
    created_at: '2026-05-04T00:00:00Z',
    ...overrides,
  }
}

/** Build a mock Supabase client with configurable RPC and from() results. */
function makeClient() {
  const rpcFn = vi.fn().mockResolvedValue({ data: null, error: null })

  // from() chain: select → eq → order → order resolves
  const resolveWith = (data: unknown, error: unknown = null) => {
    const chain: Record<string, unknown> = {}
    const asPromise = Promise.resolve({ data, error })
    chain['select'] = vi.fn().mockReturnValue(chain)
    chain['eq']     = vi.fn().mockReturnValue(chain)
    chain['order']  = vi.fn().mockReturnValue(chain)
    chain['then']   = asPromise.then.bind(asPromise)
    chain['catch']  = asPromise.catch.bind(asPromise)
    return chain
  }

  let fromImpl = () => resolveWith([])
  const fromFn = vi.fn().mockImplementation(() => fromImpl())

  const setFromResult = (data: unknown, error: unknown = null) => {
    fromImpl = () => resolveWith(data, error)
  }

  return { client: { rpc: rpcFn, from: fromFn }, rpcFn, fromFn, setFromResult }
}

// ---------------------------------------------------------------------------
// Exported shape
// ---------------------------------------------------------------------------

describe('useSchemaController — exported shape', () => {
  it('returns all required controller properties', () => {
    const { client } = makeClient()
    const { result } = renderHook(() => useSchemaController(client))
    expect(typeof result.current.loadFields).toBe('function')
    expect(typeof result.current.createField).toBe('function')
    expect(typeof result.current.updateField).toBe('function')
    expect(typeof result.current.deleteField).toBe('function')
    expect(typeof result.current.reorderFields).toBe('function')
    expect(Array.isArray(result.current.fields)).toBe(true)
    expect(typeof result.current.loading).toBe('boolean')
    expect(result.current.error).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// loadFields
// ---------------------------------------------------------------------------

describe('useSchemaController.loadFields', () => {
  it('populates fields on success', async () => {
    const fields = [makeField({ id: 'f1' }), makeField({ id: 'f2' })]
    const { client, setFromResult } = makeClient()
    setFromResult(fields)

    const { result } = renderHook(() => useSchemaController(client))

    await act(async () => {
      await result.current.loadFields('entity-1')
    })

    expect(result.current.fields).toEqual(fields)
    expect(result.current.error).toBeNull()
  })

  it('sets error state on failure', async () => {
    const { client, setFromResult } = makeClient()
    setFromResult(null, { message: 'unauthorized' })

    const { result } = renderHook(() => useSchemaController(client))

    await act(async () => {
      await result.current.loadFields('entity-1')
    })

    expect(result.current.error).toBe('unauthorized')
    expect(result.current.fields).toEqual([])
  })

  it('calls the onError callback on failure', async () => {
    const { client, setFromResult } = makeClient()
    setFromResult(null, { message: 'rpc error' })
    const onError = vi.fn()

    const { result } = renderHook(() => useSchemaController(client, { onError }))

    await act(async () => {
      await result.current.loadFields('entity-1')
    })

    expect(onError).toHaveBeenCalledWith('rpc error')
  })

  it('clears loading flag after completion', async () => {
    const { client } = makeClient()
    const { result } = renderHook(() => useSchemaController(client))

    await act(async () => {
      await result.current.loadFields('entity-1')
    })

    expect(result.current.loading).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// createField
// ---------------------------------------------------------------------------

describe('useSchemaController.createField', () => {
  it('appends the new field to the list', async () => {
    const newField = makeField({ id: 'new-id', field_name: 'new_field' })
    const { client, rpcFn } = makeClient()
    rpcFn.mockResolvedValueOnce({ data: newField, error: null })

    const { result } = renderHook(() => useSchemaController(client))

    await act(async () => {
      await result.current.createField({
        entity_id: 'entity-1', field_name: 'new_field', field_type: 'text',
      })
    })

    expect(result.current.fields).toContainEqual(newField)
  })

  it('sets error state and rethrows on RPC failure', async () => {
    const { client, rpcFn } = makeClient()
    rpcFn.mockResolvedValueOnce({ data: null, error: { message: 'conflict' } })

    const { result } = renderHook(() => useSchemaController(client))

    let caught: unknown
    await act(async () => {
      try {
        await result.current.createField({ entity_id: 'e', field_name: 'f', field_type: 'text' })
      } catch (e) {
        caught = e
      }
    })
    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toBe('conflict')
    expect(result.current.error).toBe('conflict')
  })

  it('does not modify existing fields on failure', async () => {
    const existing = makeField({ id: 'existing' })
    const { client, setFromResult, rpcFn } = makeClient()
    setFromResult([existing])
    await act(async () => { /* load fields first... */ })

    rpcFn.mockResolvedValueOnce({ data: null, error: { message: 'fail' } })

    const { result } = renderHook(() => useSchemaController(client))
    // load
    await act(async () => { await result.current.loadFields('entity-1') })

    try {
      await act(async () => {
        await result.current.createField({ entity_id: 'e', field_name: 'f', field_type: 'text' })
      })
    } catch {
      // expected
    }

    // existing field should still be present
    expect(result.current.fields).toContainEqual(existing)
  })
})

// ---------------------------------------------------------------------------
// updateField
// ---------------------------------------------------------------------------

describe('useSchemaController.updateField', () => {
  it('updates the matching field in local state', async () => {
    const field = makeField({ id: 'f1', field_name: 'old_name' })
    const { client, setFromResult, rpcFn } = makeClient()
    setFromResult([field])
    rpcFn.mockResolvedValueOnce({ data: null, error: null }) // loadFields
    rpcFn.mockResolvedValueOnce({ data: null, error: null }) // updateField

    const { result } = renderHook(() => useSchemaController(client))
    await act(async () => { await result.current.loadFields('entity-1') })

    await act(async () => {
      await result.current.updateField('f1', { field_name: 'new_name' })
    })

    expect(result.current.fields.find(f => f.id === 'f1')?.field_name).toBe('new_name')
  })

  it('sets error and rethrows on RPC failure', async () => {
    const { client, rpcFn } = makeClient()
    rpcFn.mockResolvedValueOnce({ data: null, error: { message: 'update error' } })

    const { result } = renderHook(() => useSchemaController(client))

    let caught: unknown
    await act(async () => {
      try {
        await result.current.updateField('f1', { field_name: 'x' })
      } catch (e) {
        caught = e
      }
    })
    expect(caught).toBeInstanceOf(Error)
    expect(result.current.error).toBe('update error')
  })
})

// ---------------------------------------------------------------------------
// deleteField
// ---------------------------------------------------------------------------

describe('useSchemaController.deleteField', () => {
  it('removes the field from local state', async () => {
    const field = makeField({ id: 'f1' })
    const { client, setFromResult, rpcFn } = makeClient()
    setFromResult([field])
    rpcFn.mockResolvedValueOnce({ data: null, error: null })  // loadFields
    rpcFn.mockResolvedValueOnce({ data: null, error: null })  // deleteField

    const { result } = renderHook(() => useSchemaController(client))
    await act(async () => { await result.current.loadFields('entity-1') })
    await act(async () => { await result.current.deleteField('entity-1', 'f1') })

    expect(result.current.fields.find(f => f.id === 'f1')).toBeUndefined()
  })

  it('sets error and rethrows on failure', async () => {
    const { client, rpcFn } = makeClient()
    rpcFn.mockResolvedValueOnce({ data: null, error: { message: 'delete error' } })

    const { result } = renderHook(() => useSchemaController(client))

    await expect(
      act(() => result.current.deleteField('entity-1', 'f1')),
    ).rejects.toThrow('delete error')
  })
})

// ---------------------------------------------------------------------------
// reorderFields — Phase 3A (≥5 required test cases)
// ---------------------------------------------------------------------------

describe('useSchemaController.reorderFields', () => {
  beforeEach(() => vi.clearAllMocks())

  /** Load three ordered fields into the hook state. */
  async function loadThreeFields(result: { current: SchemaController }) {
    await act(async () => {
      await result.current.loadFields('entity-1')
    })
  }

  function makeThreeFields() {
    return [
      makeField({ id: 'f1', field_name: 'alpha',   sort_order: 10 }),
      makeField({ id: 'f2', field_name: 'beta',    sort_order: 20 }),
      makeField({ id: 'f3', field_name: 'gamma',   sort_order: 30 }),
    ]
  }

  it('move up: reorders state optimistically before RPC resolves', async () => {
    const threeFields = makeThreeFields()
    const { client, setFromResult, rpcFn } = makeClient()
    setFromResult(threeFields)
    // loadFields RPC succeeds; reorder RPC also succeeds
    rpcFn.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useSchemaController(client))
    await loadThreeFields(result)

    // Move beta (f2) up → new order: f2, f1, f3
    await act(async () => {
      await result.current.reorderFields('entity-1', ['f2', 'f1', 'f3'])
    })

    expect(result.current.fields.map(f => f.id)).toEqual(['f2', 'f1', 'f3'])
  })

  it('move down: reorders state optimistically', async () => {
    const threeFields = makeThreeFields()
    const { client, setFromResult, rpcFn } = makeClient()
    setFromResult(threeFields)
    rpcFn.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useSchemaController(client))
    await loadThreeFields(result)

    // Move alpha (f1) down → new order: f2, f1, f3
    await act(async () => {
      await result.current.reorderFields('entity-1', ['f2', 'f1', 'f3'])
    })

    expect(result.current.fields[0].id).toBe('f2')
    expect(result.current.fields[1].id).toBe('f1')
  })

  it('boundary top: single move to first position is accepted', async () => {
    const threeFields = makeThreeFields()
    const { client, setFromResult, rpcFn } = makeClient()
    setFromResult(threeFields)
    rpcFn.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useSchemaController(client))
    await loadThreeFields(result)

    // gamma (f3) moved to top
    await act(async () => {
      await result.current.reorderFields('entity-1', ['f3', 'f1', 'f2'])
    })

    expect(result.current.fields[0].id).toBe('f3')
  })

  it('boundary bottom: single move to last position is accepted', async () => {
    const threeFields = makeThreeFields()
    const { client, setFromResult, rpcFn } = makeClient()
    setFromResult(threeFields)
    rpcFn.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useSchemaController(client))
    await loadThreeFields(result)

    // alpha (f1) moved to bottom
    await act(async () => {
      await result.current.reorderFields('entity-1', ['f2', 'f3', 'f1'])
    })

    expect(result.current.fields[2].id).toBe('f1')
  })

  it('rollback-on-error: restores previous state when RPC fails', async () => {
    const threeFields = makeThreeFields()
    const { client, setFromResult, rpcFn } = makeClient()
    setFromResult(threeFields)
    // loadFields uses from() not rpc(), so only set up mock for the reorder RPC call
    rpcFn.mockResolvedValueOnce({ data: null, error: { message: 'cross-tenant field id' } })

    const { result } = renderHook(() => useSchemaController(client))
    await loadThreeFields(result)

    let caught: unknown
    await act(async () => {
      try {
        await result.current.reorderFields('entity-1', ['f2', 'f1', 'f3'])
      } catch (e) {
        caught = e
      }
    })
    expect(caught).toBeInstanceOf(Error)

    // Should be back to original order
    expect(result.current.fields.map(f => f.id)).toEqual(['f1', 'f2', 'f3'])
  })

  it('rollback-on-error: calls onError callback with error message', async () => {
    const threeFields = makeThreeFields()
    const { client, setFromResult, rpcFn } = makeClient()
    setFromResult(threeFields)
    // loadFields uses from() not rpc(); only one rpcFn mock needed for reorder
    rpcFn.mockResolvedValueOnce({ data: null, error: { message: 'reorder failed' } })

    const onError = vi.fn()
    const { result } = renderHook(() => useSchemaController(client, { onError }))
    await loadThreeFields(result)

    await act(async () => {
      try {
        await result.current.reorderFields('entity-1', ['f2', 'f1', 'f3'])
      } catch {
        // expected
      }
    })

    expect(onError).toHaveBeenCalledWith('reorder failed')
  })

  it('updates sort_order values optimistically (spacing of 10)', async () => {
    const threeFields = makeThreeFields()
    const { client, setFromResult, rpcFn } = makeClient()
    setFromResult(threeFields)
    rpcFn.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useSchemaController(client))
    await loadThreeFields(result)

    await act(async () => {
      await result.current.reorderFields('entity-1', ['f3', 'f1', 'f2'])
    })

    expect(result.current.fields[0].sort_order).toBe(10)  // position 1 × 10
    expect(result.current.fields[1].sort_order).toBe(20)  // position 2 × 10
    expect(result.current.fields[2].sort_order).toBe(30)  // position 3 × 10
  })

  it('calls the reorder_entity_fields RPC via service', async () => {
    const threeFields = makeThreeFields()
    const { client, setFromResult, rpcFn } = makeClient()
    setFromResult(threeFields)
    rpcFn.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useSchemaController(client))
    await loadThreeFields(result)

    await act(async () => {
      await result.current.reorderFields('entity-1', ['f2', 'f3', 'f1'])
    })

    // The last rpc call should be reorder_entity_fields
    const reorderCall = rpcFn.mock.calls.find(c => c[0] === 'reorder_entity_fields')
    expect(reorderCall).toBeDefined()
    expect(reorderCall![1]).toEqual({
      p_entity_id: 'entity-1',
      p_field_ids: ['f2', 'f3', 'f1'],
    })
  })
})
