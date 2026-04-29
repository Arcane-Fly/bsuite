import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SchemaService } from '../service.js'
import type { EntityField } from '../types.js'

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

function makeClient({
  fromResult     = { data: [], error: null },
  rpcResult      = { data: null, error: null },
}: {
  fromResult?: { data: unknown; error: unknown }
  rpcResult?:  { data: unknown; error: unknown }
} = {}) {
  // Chainable query builder mock
  const orderSpy  = vi.fn().mockReturnThis()
  const eqSpy     = vi.fn().mockReturnThis()
  const selectSpy = vi.fn().mockReturnThis()

  // The final .order() call returns the resolved promise
  let callCount = 0
  orderSpy.mockImplementation(function (this: unknown) {
    callCount++
    // Second .order() call resolves the query
    if (callCount >= 2) {
      const self = this as { _resolve: () => Promise<unknown> }
      Object.assign(self, {
        then: (res: (v: unknown) => unknown) => Promise.resolve(fromResult).then(res),
        catch: (rej: (v: unknown) => unknown) => Promise.resolve(fromResult).catch(rej),
      })
    }
    return this
  })

  const fromChain = {
    select: selectSpy,
    eq:     eqSpy,
    order:  orderSpy,
    // Direct then/catch so await works on the chain
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(fromResult).then(resolve),
    catch: (reject: (v: unknown) => unknown) =>
      Promise.resolve(fromResult).catch(reject),
  }

  selectSpy.mockReturnValue(fromChain)
  eqSpy.mockReturnValue(fromChain)

  const rpcFn = vi.fn().mockResolvedValue(rpcResult)
  const fromFn = vi.fn().mockReturnValue(fromChain)

  return { client: { rpc: rpcFn, from: fromFn }, rpcFn, fromFn, orderSpy, eqSpy, selectSpy }
}

// ---------------------------------------------------------------------------
// getEntityFields
// ---------------------------------------------------------------------------

describe('SchemaService.getEntityFields', () => {
  it('queries the correct table with the entity_id filter', async () => {
    const fields = [makeField()]
    const { client, fromFn, eqSpy } = makeClient({ fromResult: { data: fields, error: null } })
    const svc = new SchemaService(client)

    const result = await svc.getEntityFields('entity-1')

    expect(fromFn).toHaveBeenCalledWith('tenant_field_definitions')
    expect(eqSpy).toHaveBeenCalledWith('entity_id', 'entity-1')
    expect(result).toEqual(fields)
  })

  it('orders by sort_order ascending (nullsFirst: false) then created_at ascending', async () => {
    const { client, orderSpy } = makeClient({ fromResult: { data: [], error: null } })
    const svc = new SchemaService(client)

    await svc.getEntityFields('entity-1')

    expect(orderSpy).toHaveBeenNthCalledWith(1, 'sort_order', { ascending: true, nullsFirst: false })
    expect(orderSpy).toHaveBeenNthCalledWith(2, 'created_at', { ascending: true })
  })

  it('returns an empty array when data is null', async () => {
    const { client } = makeClient({ fromResult: { data: null, error: null } })
    const svc = new SchemaService(client)
    const result = await svc.getEntityFields('entity-1')
    expect(result).toEqual([])
  })

  it('throws when PostgREST returns an error', async () => {
    const { client } = makeClient({
      fromResult: { data: null, error: { message: 'access denied' } },
    })
    const svc = new SchemaService(client)
    await expect(svc.getEntityFields('entity-1')).rejects.toThrow('access denied')
  })

  it('returns all fields as EntityField objects', async () => {
    const fields = [makeField({ id: 'f1' }), makeField({ id: 'f2' })]
    const { client } = makeClient({ fromResult: { data: fields, error: null } })
    const svc = new SchemaService(client)
    const result = await svc.getEntityFields('entity-1')
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('f1')
    expect(result[1].id).toBe('f2')
  })
})

// ---------------------------------------------------------------------------
// createEntityField
// ---------------------------------------------------------------------------

describe('SchemaService.createEntityField', () => {
  it('calls create_entity_field RPC with correct params', async () => {
    const newField = makeField({ id: 'new-field' })
    const { client, rpcFn } = makeClient({ rpcResult: { data: newField, error: null } })
    const svc = new SchemaService(client)

    await svc.createEntityField({
      entity_id:  'entity-1',
      field_name: 'my_field',
      field_type: 'text',
      nullable:   true,
    })

    expect(rpcFn).toHaveBeenCalledWith('create_entity_field', {
      p_entity_id:  'entity-1',
      p_field_name: 'my_field',
      p_field_type: 'text',
      p_nullable:   true,
    })
  })

  it('defaults nullable to true when not provided', async () => {
    const { client, rpcFn } = makeClient({ rpcResult: { data: makeField(), error: null } })
    const svc = new SchemaService(client)

    await svc.createEntityField({ entity_id: 'e', field_name: 'n', field_type: 'integer' })

    expect(rpcFn.mock.calls[0][1]).toMatchObject({ p_nullable: true })
  })

  it('returns the created EntityField', async () => {
    const newField = makeField({ id: 'created-id' })
    const { client } = makeClient({ rpcResult: { data: newField, error: null } })
    const svc = new SchemaService(client)

    const result = await svc.createEntityField({
      entity_id: 'e', field_name: 'f', field_type: 'text',
    })

    expect(result).toEqual(newField)
  })

  it('throws when RPC returns an error', async () => {
    const { client } = makeClient({
      rpcResult: { data: null, error: { message: 'unauthorized' } },
    })
    const svc = new SchemaService(client)
    await expect(
      svc.createEntityField({ entity_id: 'e', field_name: 'f', field_type: 'text' }),
    ).rejects.toThrow('unauthorized')
  })
})

// ---------------------------------------------------------------------------
// updateEntityField
// ---------------------------------------------------------------------------

describe('SchemaService.updateEntityField', () => {
  it('calls update_entity_field RPC with correct params', async () => {
    const { client, rpcFn } = makeClient({ rpcResult: { data: null, error: null } })
    const svc = new SchemaService(client)

    await svc.updateEntityField('field-1', { field_name: 'new_name', field_type: 'integer', nullable: false })

    expect(rpcFn).toHaveBeenCalledWith('update_entity_field', {
      p_field_id:   'field-1',
      p_field_name: 'new_name',
      p_field_type: 'integer',
      p_nullable:   false,
    })
  })

  it('passes null for omitted fields', async () => {
    const { client, rpcFn } = makeClient({ rpcResult: { data: null, error: null } })
    const svc = new SchemaService(client)

    await svc.updateEntityField('field-1', { nullable: true })

    expect(rpcFn.mock.calls[0][1]).toMatchObject({
      p_field_name: null,
      p_field_type: null,
      p_nullable:   true,
    })
  })

  it('throws when RPC returns an error', async () => {
    const { client } = makeClient({
      rpcResult: { data: null, error: { message: 'field not found' } },
    })
    const svc = new SchemaService(client)
    await expect(svc.updateEntityField('bad-id', {})).rejects.toThrow('field not found')
  })
})

// ---------------------------------------------------------------------------
// deleteEntityField
// ---------------------------------------------------------------------------

describe('SchemaService.deleteEntityField', () => {
  it('calls delete_entity_field RPC with entity and field ids', async () => {
    const { client, rpcFn } = makeClient({ rpcResult: { data: null, error: null } })
    const svc = new SchemaService(client)

    await svc.deleteEntityField('entity-1', 'field-1')

    expect(rpcFn).toHaveBeenCalledWith('delete_entity_field', {
      p_entity_id: 'entity-1',
      p_field_id:  'field-1',
    })
  })

  it('throws when RPC returns an error', async () => {
    const { client } = makeClient({
      rpcResult: { data: null, error: { message: 'not found' } },
    })
    const svc = new SchemaService(client)
    await expect(svc.deleteEntityField('e', 'f')).rejects.toThrow('not found')
  })
})

// ---------------------------------------------------------------------------
// reorderEntityFields — Phase 3A
// ---------------------------------------------------------------------------

describe('SchemaService.reorderEntityFields', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls reorder_entity_fields RPC with entity id and field ids array', async () => {
    const { client, rpcFn } = makeClient({ rpcResult: { data: null, error: null } })
    const svc = new SchemaService(client)

    await svc.reorderEntityFields('entity-1', ['f1', 'f2', 'f3'])

    expect(rpcFn).toHaveBeenCalledWith('reorder_entity_fields', {
      p_entity_id: 'entity-1',
      p_field_ids: ['f1', 'f2', 'f3'],
    })
  })

  it('resolves without error on success', async () => {
    const { client } = makeClient({ rpcResult: { data: null, error: null } })
    const svc = new SchemaService(client)
    await expect(svc.reorderEntityFields('e', ['a', 'b'])).resolves.toBeUndefined()
  })

  it('throws when RPC returns an error', async () => {
    const { client } = makeClient({
      rpcResult: { data: null, error: { message: 'array length mismatch' } },
    })
    const svc = new SchemaService(client)
    await expect(svc.reorderEntityFields('e', ['a'])).rejects.toThrow('array length mismatch')
  })

  it('passes an empty array without error', async () => {
    const { client, rpcFn } = makeClient({ rpcResult: { data: null, error: null } })
    const svc = new SchemaService(client)
    await svc.reorderEntityFields('entity-1', [])
    expect(rpcFn.mock.calls[0][1].p_field_ids).toEqual([])
  })

  it('forwards the exact field ids order to the RPC', async () => {
    const ids = ['z', 'a', 'm', 'b']
    const { client, rpcFn } = makeClient({ rpcResult: { data: null, error: null } })
    const svc = new SchemaService(client)
    await svc.reorderEntityFields('entity-1', ids)
    expect(rpcFn.mock.calls[0][1].p_field_ids).toStrictEqual(ids)
  })
})
