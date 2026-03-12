import { describe, it, expect } from 'vitest'
import { treeStateSchema, bulkTreeStateSchema } from '../tree-state.schema.js'

describe('treeStateSchema', () => {
  it('accepts isExpanded true', () => {
    const result = treeStateSchema.safeParse({ isExpanded: true })
    expect(result.success).toBe(true)
  })

  it('accepts isExpanded false', () => {
    const result = treeStateSchema.safeParse({ isExpanded: false })
    expect(result.success).toBe(true)
  })

  it('rejects missing isExpanded', () => {
    const result = treeStateSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects non-boolean isExpanded', () => {
    const result = treeStateSchema.safeParse({ isExpanded: 'true' })
    expect(result.success).toBe(false)
  })
})

describe('bulkTreeStateSchema', () => {
  it('accepts array of valid states', () => {
    const result = bulkTreeStateSchema.safeParse({
      states: [
        { nodeId: '550e8400-e29b-41d4-a716-446655440000', isExpanded: true },
        { nodeId: '550e8400-e29b-41d4-a716-446655440001', isExpanded: false },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty states array', () => {
    const result = bulkTreeStateSchema.safeParse({ states: [] })
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUID in nodeId', () => {
    const result = bulkTreeStateSchema.safeParse({
      states: [{ nodeId: 'not-a-uuid', isExpanded: true }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing states array', () => {
    const result = bulkTreeStateSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects missing isExpanded in state entry', () => {
    const result = bulkTreeStateSchema.safeParse({
      states: [{ nodeId: '550e8400-e29b-41d4-a716-446655440000' }],
    })
    expect(result.success).toBe(false)
  })
})
