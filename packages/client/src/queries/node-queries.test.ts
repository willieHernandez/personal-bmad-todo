import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { NodeResponse } from '@todo-bmad-style/shared'

vi.mock('../api/nodes.api', () => ({
  getProjects: vi.fn(),
  getNodeChildren: vi.fn(),
  createNode: vi.fn(),
  updateNode: vi.fn(),
  deleteNode: vi.fn(),
  reorderNode: vi.fn(),
  moveNode: vi.fn(),
}))

import { useUpdateNode, useDeleteNode, useReorderNode, useMoveNode } from './node-queries'
import { updateNode, deleteNode, reorderNode, moveNode } from '../api/nodes.api'

const mockUpdateNode = vi.mocked(updateNode)
const mockDeleteNode = vi.mocked(deleteNode)
const mockReorderNode = vi.mocked(reorderNode)
const mockMoveNode = vi.mocked(moveNode)

function makeNode(overrides: Partial<NodeResponse> = {}): NodeResponse {
  return {
    id: 'node-1',
    title: 'Test Node',
    type: 'effort',
    parentId: 'proj-1',
    sortOrder: 0,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-11T00:00:00Z',
    updatedAt: '2026-03-11T00:00:00Z',
    ...overrides,
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

describe('useUpdateNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('optimistically updates the node title in cache', async () => {
    const { queryClient, wrapper } = createWrapper()
    const nodes = [makeNode({ id: 'node-1', title: 'Original' }), makeNode({ id: 'node-2', title: 'Other' })]
    queryClient.setQueryData(['nodes', 'proj-1', 'children'], nodes)

    mockUpdateNode.mockResolvedValueOnce(makeNode({ id: 'node-1', title: 'Renamed' }))

    const { result } = renderHook(() => useUpdateNode(), { wrapper })

    await act(async () => {
      result.current.mutate({ id: 'node-1', data: { title: 'Renamed' }, parentId: 'proj-1' })
    })

    // Check optimistic update applied immediately
    const cached = queryClient.getQueryData<NodeResponse[]>(['nodes', 'proj-1', 'children'])
    expect(cached?.find((n) => n.id === 'node-1')?.title).toBe('Renamed')
    expect(cached?.find((n) => n.id === 'node-2')?.title).toBe('Other')
  })

  it('rolls back on error', async () => {
    const { queryClient, wrapper } = createWrapper()
    const nodes = [makeNode({ id: 'node-1', title: 'Original' })]
    queryClient.setQueryData(['nodes', 'proj-1', 'children'], nodes)

    mockUpdateNode.mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useUpdateNode(), { wrapper })

    await act(async () => {
      result.current.mutate({ id: 'node-1', data: { title: 'Failed Rename' }, parentId: 'proj-1' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    const cached = queryClient.getQueryData<NodeResponse[]>(['nodes', 'proj-1', 'children'])
    expect(cached?.find((n) => n.id === 'node-1')?.title).toBe('Original')
  })
})

describe('useDeleteNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('optimistically removes the node from cache', async () => {
    const { queryClient, wrapper } = createWrapper()
    const nodes = [
      makeNode({ id: 'node-1', title: 'First' }),
      makeNode({ id: 'node-2', title: 'Second' }),
    ]
    queryClient.setQueryData(['nodes', 'proj-1', 'children'], nodes)

    mockDeleteNode.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useDeleteNode(), { wrapper })

    await act(async () => {
      result.current.mutate({ id: 'node-1', parentId: 'proj-1' })
    })

    // Check optimistic removal
    const cached = queryClient.getQueryData<NodeResponse[]>(['nodes', 'proj-1', 'children'])
    expect(cached).toHaveLength(1)
    expect(cached?.[0].id).toBe('node-2')
  })

  it('rolls back on error', async () => {
    const { queryClient, wrapper } = createWrapper()
    const nodes = [
      makeNode({ id: 'node-1', title: 'First' }),
      makeNode({ id: 'node-2', title: 'Second' }),
    ]
    queryClient.setQueryData(['nodes', 'proj-1', 'children'], nodes)

    mockDeleteNode.mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useDeleteNode(), { wrapper })

    await act(async () => {
      result.current.mutate({ id: 'node-1', parentId: 'proj-1' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    const cached = queryClient.getQueryData<NodeResponse[]>(['nodes', 'proj-1', 'children'])
    expect(cached).toHaveLength(2)
    expect(cached?.find((n) => n.id === 'node-1')).toBeDefined()
  })
})

describe('useReorderNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('optimistically reorders children array correctly', async () => {
    const { queryClient, wrapper } = createWrapper()
    const nodes = [
      makeNode({ id: 'node-1', title: 'First', sortOrder: 0 }),
      makeNode({ id: 'node-2', title: 'Second', sortOrder: 1 }),
      makeNode({ id: 'node-3', title: 'Third', sortOrder: 2 }),
    ]
    queryClient.setQueryData(['nodes', 'proj-1', 'children'], nodes)

    mockReorderNode.mockResolvedValueOnce(makeNode({ id: 'node-1', sortOrder: 2 }))

    const { result } = renderHook(() => useReorderNode(), { wrapper })

    await act(async () => {
      result.current.mutate({ id: 'node-1', parentId: 'proj-1', sortOrder: 2 })
    })

    const cached = queryClient.getQueryData<NodeResponse[]>(['nodes', 'proj-1', 'children'])
    expect(cached?.map((n) => n.id)).toEqual(['node-2', 'node-3', 'node-1'])
    expect(cached?.map((n) => n.sortOrder)).toEqual([0, 1, 2])
  })

  it('rolls back on error', async () => {
    const { queryClient, wrapper } = createWrapper()
    const nodes = [
      makeNode({ id: 'node-1', title: 'First', sortOrder: 0 }),
      makeNode({ id: 'node-2', title: 'Second', sortOrder: 1 }),
    ]
    queryClient.setQueryData(['nodes', 'proj-1', 'children'], nodes)

    mockReorderNode.mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useReorderNode(), { wrapper })

    await act(async () => {
      result.current.mutate({ id: 'node-1', parentId: 'proj-1', sortOrder: 1 })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    const cached = queryClient.getQueryData<NodeResponse[]>(['nodes', 'proj-1', 'children'])
    expect(cached?.map((n) => n.id)).toEqual(['node-1', 'node-2'])
  })
})

describe('useMoveNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('optimistically removes from old parent and adds to new parent', async () => {
    const { queryClient, wrapper } = createWrapper()
    const oldParentNodes = [
      makeNode({ id: 'node-1', title: 'Moving', parentId: 'effort-1', type: 'task', sortOrder: 0 }),
      makeNode({ id: 'node-2', title: 'Staying', parentId: 'effort-1', type: 'task', sortOrder: 1 }),
    ]
    const newParentNodes = [
      makeNode({ id: 'node-3', title: 'Existing', parentId: 'effort-2', type: 'task', sortOrder: 0 }),
    ]
    queryClient.setQueryData(['nodes', 'effort-1', 'children'], oldParentNodes)
    queryClient.setQueryData(['nodes', 'effort-2', 'children'], newParentNodes)

    mockMoveNode.mockResolvedValueOnce(makeNode({ id: 'node-1', parentId: 'effort-2', sortOrder: 1 }))

    const { result } = renderHook(() => useMoveNode(), { wrapper })

    await act(async () => {
      result.current.mutate({
        id: 'node-1',
        oldParentId: 'effort-1',
        data: { newParentId: 'effort-2', sortOrder: 1 },
      })
    })

    const oldCached = queryClient.getQueryData<NodeResponse[]>(['nodes', 'effort-1', 'children'])
    expect(oldCached).toHaveLength(1)
    expect(oldCached?.[0].id).toBe('node-2')

    const newCached = queryClient.getQueryData<NodeResponse[]>(['nodes', 'effort-2', 'children'])
    expect(newCached).toHaveLength(2)
    expect(newCached?.[1].id).toBe('node-1')
  })

  it('rolls back both parents on error', async () => {
    const { queryClient, wrapper } = createWrapper()
    const oldParentNodes = [
      makeNode({ id: 'node-1', title: 'Moving', parentId: 'effort-1', type: 'task', sortOrder: 0 }),
    ]
    const newParentNodes = [
      makeNode({ id: 'node-3', title: 'Existing', parentId: 'effort-2', type: 'task', sortOrder: 0 }),
    ]
    queryClient.setQueryData(['nodes', 'effort-1', 'children'], oldParentNodes)
    queryClient.setQueryData(['nodes', 'effort-2', 'children'], newParentNodes)

    mockMoveNode.mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useMoveNode(), { wrapper })

    await act(async () => {
      result.current.mutate({
        id: 'node-1',
        oldParentId: 'effort-1',
        data: { newParentId: 'effort-2', sortOrder: 1 },
      })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    const oldCached = queryClient.getQueryData<NodeResponse[]>(['nodes', 'effort-1', 'children'])
    expect(oldCached).toHaveLength(1)
    expect(oldCached?.[0].id).toBe('node-1')

    const newCached = queryClient.getQueryData<NodeResponse[]>(['nodes', 'effort-2', 'children'])
    expect(newCached).toHaveLength(1)
    expect(newCached?.[0].id).toBe('node-3')
  })
})
