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
}))

import { useUpdateNode, useDeleteNode } from './node-queries'
import { updateNode, deleteNode } from '../api/nodes.api'

const mockUpdateNode = vi.mocked(updateNode)
const mockDeleteNode = vi.mocked(deleteNode)

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
