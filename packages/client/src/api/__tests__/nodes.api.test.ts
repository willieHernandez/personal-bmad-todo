import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getProjects,
  getNodeChildren,
  getNode,
  createNode,
  updateNode,
  moveNode,
  reorderNode,
  deleteNode,
} from '../nodes.api'

const originalFetch = globalThis.fetch

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

function mockFetchResponse(status: number, body?: unknown) {
  vi.mocked(globalThis.fetch).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response)
}

const sampleNode = {
  id: 'node-1',
  title: 'Test',
  type: 'effort' as const,
  parentId: 'proj-1',
  sortOrder: 0,
  isCompleted: false,
  markdownBody: '',
  createdAt: '2026-03-11T00:00:00Z',
  updatedAt: '2026-03-11T00:00:00Z',
}

describe('nodes.api', () => {
  it('getProjects calls GET /nodes', async () => {
    mockFetchResponse(200, [sampleNode])
    const result = await getProjects()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/nodes', expect.objectContaining({ headers: {} }))
    expect(result).toEqual([sampleNode])
  })

  it('getNodeChildren calls GET /nodes/:id/children', async () => {
    mockFetchResponse(200, [sampleNode])
    await getNodeChildren('proj-1')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/nodes/proj-1/children', expect.any(Object))
  })

  it('getNode calls GET /nodes/:id', async () => {
    mockFetchResponse(200, sampleNode)
    const result = await getNode('node-1')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/nodes/node-1', expect.any(Object))
    expect(result).toEqual(sampleNode)
  })

  it('createNode calls POST /nodes with body', async () => {
    mockFetchResponse(201, sampleNode)
    await createNode({ title: 'Test', type: 'effort', parentId: 'proj-1' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/nodes',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Test', type: 'effort', parentId: 'proj-1' }),
      })
    )
  })

  it('createNode includes sortOrder in body when provided', async () => {
    mockFetchResponse(201, sampleNode)
    await createNode({ title: 'Test', type: 'effort', parentId: 'proj-1', sortOrder: 3 })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/nodes',
      expect.objectContaining({
        body: JSON.stringify({ title: 'Test', type: 'effort', parentId: 'proj-1', sortOrder: 3 }),
      })
    )
  })

  it('updateNode calls PATCH /nodes/:id with body', async () => {
    mockFetchResponse(200, { ...sampleNode, title: 'Updated' })
    await updateNode('node-1', { title: 'Updated' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/nodes/node-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated' }),
      })
    )
  })

  it('moveNode calls PATCH /nodes/:id/move with body', async () => {
    mockFetchResponse(200, sampleNode)
    await moveNode('node-1', { newParentId: 'proj-2', sortOrder: 0 })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/nodes/node-1/move',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ newParentId: 'proj-2', sortOrder: 0 }),
      })
    )
  })

  it('reorderNode calls PATCH /nodes/:id/reorder with body', async () => {
    mockFetchResponse(200, sampleNode)
    await reorderNode('node-1', { sortOrder: 2 })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/nodes/node-1/reorder',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ sortOrder: 2 }),
      })
    )
  })

  it('deleteNode calls DELETE /nodes/:id', async () => {
    mockFetchResponse(204)
    await deleteNode('node-1')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/nodes/node-1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
