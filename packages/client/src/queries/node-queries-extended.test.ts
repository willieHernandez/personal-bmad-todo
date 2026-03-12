import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { NodeResponse } from '@todo-bmad-style/shared'

vi.mock('../api/nodes.api', () => ({
  getProjects: vi.fn(),
  getNodeChildren: vi.fn(),
  getNode: vi.fn(),
  createNode: vi.fn(),
  updateNode: vi.fn(),
  deleteNode: vi.fn(),
  reorderNode: vi.fn(),
  moveNode: vi.fn(),
}))

import { useProjects, useNodeChildren, useCreateProject, useCreateNode } from './node-queries'
import { getProjects, getNodeChildren, createNode } from '../api/nodes.api'

const mockGetProjects = vi.mocked(getProjects)
const mockGetNodeChildren = vi.mocked(getNodeChildren)
const mockCreateNode = vi.mocked(createNode)

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

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches and returns project list', async () => {
    const projects = [
      makeNode({ id: 'p1', title: 'Project 1', type: 'project', parentId: null }),
      makeNode({ id: 'p2', title: 'Project 2', type: 'project', parentId: null }),
    ]
    mockGetProjects.mockResolvedValueOnce(projects)

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useProjects(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(projects)
    expect(mockGetProjects).toHaveBeenCalledOnce()
  })
})

describe('useNodeChildren', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches children for given parentId', async () => {
    const children = [
      makeNode({ id: 'e1', title: 'Effort 1', parentId: 'proj-1' }),
      makeNode({ id: 'e2', title: 'Effort 2', parentId: 'proj-1' }),
    ]
    mockGetNodeChildren.mockResolvedValueOnce(children)

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useNodeChildren('proj-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(children)
    expect(mockGetNodeChildren).toHaveBeenCalledWith('proj-1')
  })

  it('is disabled when parentId is null', () => {
    const { wrapper } = createWrapper()
    renderHook(() => useNodeChildren(null), { wrapper })
    expect(mockGetNodeChildren).not.toHaveBeenCalled()
  })
})

describe('useCreateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls createNode with type project', async () => {
    const newProject = makeNode({ id: 'new-p', title: 'New Project', type: 'project', parentId: null })
    mockCreateNode.mockResolvedValueOnce(newProject)

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateProject(), { wrapper })

    await act(async () => {
      result.current.mutate({ title: 'New Project' })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockCreateNode).toHaveBeenCalledWith({ title: 'New Project', type: 'project' })
  })
})

describe('useCreateNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('optimistically appends temp node to children list', async () => {
    // Make API hang so we can check optimistic state
    mockCreateNode.mockImplementation(() => new Promise(() => {}))

    const { queryClient, wrapper } = createWrapper()
    const existingChildren = [makeNode({ id: 'e1', title: 'Existing', sortOrder: 0 })]
    queryClient.setQueryData(['nodes', 'proj-1', 'children'], existingChildren)

    const { result } = renderHook(() => useCreateNode(), { wrapper })

    act(() => {
      result.current.mutate({ title: 'New Node', type: 'effort', parentId: 'proj-1', sortOrder: 1 })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData<NodeResponse[]>(['nodes', 'proj-1', 'children'])
      expect(cached).toHaveLength(2)
    })

    const cached = queryClient.getQueryData<NodeResponse[]>(['nodes', 'proj-1', 'children'])
    expect(cached?.[1].title).toBe('New Node')
    expect(cached?.[1].id).toMatch(/^temp-/)
  })

  it('rolls back on server error', async () => {
    mockCreateNode.mockRejectedValueOnce(new Error('Server error'))

    const { queryClient, wrapper } = createWrapper()
    const existingChildren = [makeNode({ id: 'e1', title: 'Existing', sortOrder: 0 })]
    queryClient.setQueryData(['nodes', 'proj-1', 'children'], existingChildren)

    const { result } = renderHook(() => useCreateNode(), { wrapper })

    await act(async () => {
      result.current.mutate({ title: 'New Node', type: 'effort', parentId: 'proj-1' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    const cached = queryClient.getQueryData<NodeResponse[]>(['nodes', 'proj-1', 'children'])
    expect(cached).toHaveLength(1)
    expect(cached?.[0].id).toBe('e1')
  })
})
