import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { NodeResponse } from '@todo-bmad-style/shared'

const mockEfforts: NodeResponse[] = [
  {
    id: 'e1',
    title: 'Effort 1',
    type: 'effort',
    parentId: 'proj-1',
    sortOrder: 0,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
  },
  {
    id: 'e2',
    title: 'Effort 2',
    type: 'effort',
    parentId: 'proj-1',
    sortOrder: 1,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
  },
]

const mockTasks: NodeResponse[] = [
  {
    id: 't1',
    title: 'Task 1',
    type: 'task',
    parentId: 'e1',
    sortOrder: 0,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
  },
]

const mockSubtasks: NodeResponse[] = [
  {
    id: 's1',
    title: 'Subtask 1',
    type: 'subtask',
    parentId: 't1',
    sortOrder: 0,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
  },
]

vi.mock('#/queries/node-queries', () => ({
  useNodeChildren: vi.fn((parentId: string | null) => {
    if (parentId === 'proj-1') return { data: mockEfforts }
    if (parentId === 'e1') return { data: mockTasks }
    if (parentId === 't1') return { data: mockSubtasks }
    return { data: [] }
  }),
}))

vi.mock('#/api/nodes.api', () => ({
  getNodeChildren: vi.fn((parentId: string) => {
    if (parentId === 'e1') return Promise.resolve(mockTasks)
    if (parentId === 't1') return Promise.resolve(mockSubtasks)
    return Promise.resolve([])
  }),
}))

let mockTreeState: Record<string, boolean> = {}
const mockMutate = vi.fn((args: { nodeId: string; isExpanded: boolean }) => {
  mockTreeState = { ...mockTreeState, [args.nodeId]: args.isExpanded }
})

vi.mock('#/queries/tree-state-queries', () => ({
  useTreeState: vi.fn(() => ({ data: mockTreeState })),
  useSetNodeExpanded: vi.fn(() => ({ mutate: mockMutate })),
}))

import { useTreeData } from './use-tree-data'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useTreeData', () => {
  beforeEach(() => {
    mockTreeState = {}
    mockMutate.mockClear()
  })

  it('returns flat list of root children at depth 0', () => {
    const { result } = renderHook(() => useTreeData('proj-1'), {
      wrapper: createWrapper(),
    })

    expect(result.current.visibleNodes).toHaveLength(2)
    expect(result.current.visibleNodes[0].node.id).toBe('e1')
    expect(result.current.visibleNodes[0].depth).toBe(0)
    expect(result.current.visibleNodes[1].node.id).toBe('e2')
    expect(result.current.visibleNodes[1].depth).toBe(0)
  })

  it('marks efforts as having children and subtasks as not', () => {
    const { result } = renderHook(() => useTreeData('proj-1'), {
      wrapper: createWrapper(),
    })

    // Efforts can have children
    expect(result.current.visibleNodes[0].hasChildren).toBe(true)
  })

  it('toggleExpand calls mutation with toggled value', () => {
    const { result } = renderHook(() => useTreeData('proj-1'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isExpanded('e1')).toBe(false)

    act(() => {
      result.current.toggleExpand('e1')
    })

    expect(mockMutate).toHaveBeenCalledWith({ nodeId: 'e1', isExpanded: true })
  })

  it('returns empty array when projectId is null', () => {
    const { result } = renderHook(() => useTreeData(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.visibleNodes).toHaveLength(0)
  })

  it('shows expanded children in flat list when node is expanded', () => {
    mockTreeState = { e1: true }

    const { result } = renderHook(() => useTreeData('proj-1'), {
      wrapper: createWrapper(),
    })

    // e1 should be expanded, and its children (from useQueries mock) should appear
    const e1Node = result.current.visibleNodes.find((n) => n.node.id === 'e1')
    expect(e1Node?.isExpanded).toBe(true)
  })

  it('exposes expandedMap from API state', () => {
    mockTreeState = { e1: true, e2: false }

    const { result } = renderHook(() => useTreeData('proj-1'), {
      wrapper: createWrapper(),
    })

    expect(result.current.expandedMap).toEqual({ e1: true, e2: false })
  })
})
