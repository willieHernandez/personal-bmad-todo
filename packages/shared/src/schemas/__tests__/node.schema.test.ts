import { describe, it, expect } from 'vitest'
import {
  createNodeSchema,
  updateNodeSchema,
  moveNodeSchema,
  reorderNodeSchema,
  nodeResponseSchema,
} from '../node.schema.js'

describe('createNodeSchema', () => {
  it('accepts valid complete input', () => {
    const result = createNodeSchema.safeParse({
      title: 'My Effort',
      type: 'effort',
      parentId: '550e8400-e29b-41d4-a716-446655440000',
      sortOrder: 0,
    })
    expect(result.success).toBe(true)
  })

  it('accepts minimal input (title + type only)', () => {
    const result = createNodeSchema.safeParse({ title: 'Project', type: 'project' })
    expect(result.success).toBe(true)
  })

  it('accepts null parentId', () => {
    const result = createNodeSchema.safeParse({ title: 'Project', type: 'project', parentId: null })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = createNodeSchema.safeParse({ title: '', type: 'project' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid type enum value', () => {
    const result = createNodeSchema.safeParse({ title: 'Test', type: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('rejects negative sortOrder', () => {
    const result = createNodeSchema.safeParse({ title: 'Test', type: 'project', sortOrder: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer sortOrder', () => {
    const result = createNodeSchema.safeParse({ title: 'Test', type: 'project', sortOrder: 1.5 })
    expect(result.success).toBe(false)
  })

  it('rejects non-UUID parentId', () => {
    const result = createNodeSchema.safeParse({ title: 'Test', type: 'effort', parentId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('accepts all four valid node types', () => {
    for (const type of ['project', 'effort', 'task', 'subtask']) {
      const result = createNodeSchema.safeParse({ title: 'Test', type })
      expect(result.success).toBe(true)
    }
  })
})

describe('updateNodeSchema', () => {
  it('accepts title only', () => {
    const result = updateNodeSchema.safeParse({ title: 'Updated' })
    expect(result.success).toBe(true)
  })

  it('accepts markdownBody only', () => {
    const result = updateNodeSchema.safeParse({ markdownBody: '# Hello' })
    expect(result.success).toBe(true)
  })

  it('accepts both title and markdownBody', () => {
    const result = updateNodeSchema.safeParse({ title: 'Updated', markdownBody: '# Hello' })
    expect(result.success).toBe(true)
  })

  it('rejects empty object (refinement: at least one field required)', () => {
    const result = updateNodeSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty title string', () => {
    const result = updateNodeSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })

  it('accepts empty markdownBody string', () => {
    const result = updateNodeSchema.safeParse({ markdownBody: '' })
    expect(result.success).toBe(true)
  })
})

describe('moveNodeSchema', () => {
  it('accepts valid input', () => {
    const result = moveNodeSchema.safeParse({
      newParentId: '550e8400-e29b-41d4-a716-446655440000',
      sortOrder: 0,
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid input with newType', () => {
    const result = moveNodeSchema.safeParse({
      newParentId: '550e8400-e29b-41d4-a716-446655440000',
      sortOrder: 1,
      newType: 'task',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUID for newParentId', () => {
    const result = moveNodeSchema.safeParse({ newParentId: 'bad', sortOrder: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative sortOrder', () => {
    const result = moveNodeSchema.safeParse({
      newParentId: '550e8400-e29b-41d4-a716-446655440000',
      sortOrder: -1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing newParentId', () => {
    const result = moveNodeSchema.safeParse({ sortOrder: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid newType', () => {
    const result = moveNodeSchema.safeParse({
      newParentId: '550e8400-e29b-41d4-a716-446655440000',
      sortOrder: 0,
      newType: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('reorderNodeSchema', () => {
  it('accepts zero sortOrder', () => {
    const result = reorderNodeSchema.safeParse({ sortOrder: 0 })
    expect(result.success).toBe(true)
  })

  it('accepts positive sortOrder', () => {
    const result = reorderNodeSchema.safeParse({ sortOrder: 5 })
    expect(result.success).toBe(true)
  })

  it('rejects negative sortOrder', () => {
    const result = reorderNodeSchema.safeParse({ sortOrder: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer sortOrder', () => {
    const result = reorderNodeSchema.safeParse({ sortOrder: 2.5 })
    expect(result.success).toBe(false)
  })

  it('rejects missing sortOrder', () => {
    const result = reorderNodeSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('nodeResponseSchema', () => {
  const validNode = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test Node',
    type: 'effort',
    parentId: '550e8400-e29b-41d4-a716-446655440001',
    sortOrder: 0,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-11T00:00:00Z',
    updatedAt: '2026-03-11T00:00:00Z',
  }

  it('validates a complete valid response', () => {
    const result = nodeResponseSchema.safeParse(validNode)
    expect(result.success).toBe(true)
  })

  it('accepts null parentId', () => {
    const result = nodeResponseSchema.safeParse({ ...validNode, parentId: null })
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const { title, ...missing } = validNode
    const result = nodeResponseSchema.safeParse(missing)
    expect(result.success).toBe(false)
  })

  it('rejects invalid id (not UUID)', () => {
    const result = nodeResponseSchema.safeParse({ ...validNode, id: 'not-uuid' })
    expect(result.success).toBe(false)
  })
})
