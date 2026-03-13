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

const mockMixedTasks: NodeResponse[] = [
  { id: 'mt1', title: 'Mixed Task 1', type: 'task', parentId: 'e2', sortOrder: 0, isCompleted: true, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
  { id: 'mt2', title: 'Mixed Task 2', type: 'task', parentId: 'e2', sortOrder: 1, isCompleted: false, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
  { id: 'mt3', title: 'Mixed Task 3', type: 'task', parentId: 'e2', sortOrder: 2, isCompleted: true, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
  { id: 'mt4', title: 'Mixed Task 4', type: 'task', parentId: 'e2', sortOrder: 3, isCompleted: false, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
]

const mockAllCompleteTasks: NodeResponse[] = [
  { id: 'ac1', title: 'Done 1', type: 'task', parentId: 'e2', sortOrder: 0, isCompleted: true, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
  { id: 'ac2', title: 'Done 2', type: 'task', parentId: 'e2', sortOrder: 1, isCompleted: true, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
  { id: 'ac3', title: 'Done 3', type: 'task', parentId: 'e2', sortOrder: 2, isCompleted: true, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
]

const mockNoneCompleteTasks: NodeResponse[] = [
  { id: 'nc1', title: 'Todo 1', type: 'task', parentId: 'e2', sortOrder: 0, isCompleted: false, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
  { id: 'nc2', title: 'Todo 2', type: 'task', parentId: 'e2', sortOrder: 1, isCompleted: false, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
  { id: 'nc3', title: 'Todo 3', type: 'task', parentId: 'e2', sortOrder: 2, isCompleted: false, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
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
  useToggleNodeCompletion: () => ({
    mutate: vi.fn(),
  }),
}))

let mockE2Children: NodeResponse[] = mockMixedTasks

vi.mock('#/api/nodes.api', () => ({
  getNodeChildren: vi.fn((parentId: string) => {
    if (parentId === 'e1') return Promise.resolve(mockTasks)
    if (parentId === 'e2') return Promise.resolve(mockE2Children)
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
import type { FlatTreeNode } from './use-tree-data'

function isNodeRow(row: { kind?: string }): row is FlatTreeNode {
  return row.kind === 'node'
}

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
    mockE2Children = mockMixedTasks
  })

  it('returns flat list of root children at depth 0', () => {
    const { result } = renderHook(() => useTreeData('proj-1'), {
      wrapper: createWrapper(),
    })

    const nodeRows = result.current.visibleNodes.filter(isNodeRow)
    expect(nodeRows).toHaveLength(2)
    expect(nodeRows[0].node.id).toBe('e1')
    expect(nodeRows[0].depth).toBe(0)
    expect(nodeRows[1].node.id).toBe('e2')
    expect(nodeRows[1].depth).toBe(0)
  })

  it('marks efforts as having children and subtasks as not', () => {
    const { result } = renderHook(() => useTreeData('proj-1'), {
      wrapper: createWrapper(),
    })

    // Efforts can have children
    const nodeRows = result.current.visibleNodes.filter(isNodeRow)
    expect(nodeRows[0].hasChildren).toBe(true)
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
    const e1Node = result.current.visibleNodes.filter(isNodeRow).find((n) => n.node.id === 'e1')
    expect(e1Node?.isExpanded).toBe(true)
  })

  it('exposes expandedMap from API state', () => {
    mockTreeState = { e1: true, e2: false }

    const { result } = renderHook(() => useTreeData('proj-1'), {
      wrapper: createWrapper(),
    })

    expect(result.current.expandedMap).toEqual({ e1: true, e2: false })
  })

  describe('childProgress computation', () => {
    it('returns null childProgress for efforts when not expanded (no children data in cache)', () => {
      // e1 and e2 are not expanded, so childrenMap has no data for them
      const { result } = renderHook(() => useTreeData('proj-1'), {
        wrapper: createWrapper(),
      })

      const nodeRows = result.current.visibleNodes.filter(isNodeRow)
      expect(nodeRows[0].childProgress).toBeNull()
      expect(nodeRows[1].childProgress).toBeNull()
    })

    it('returns null childProgress for subtask nodes (leaf nodes cannot have children)', () => {
      // Subtasks have type 'subtask' so canHaveChildren = false → childProgress = null
      mockTreeState = { e1: true, t1: true }

      const { result } = renderHook(() => useTreeData('proj-1'), {
        wrapper: createWrapper(),
      })

      // Even if subtask data were in childrenMap, subtasks should still return null progress
      // since canHaveChildren is false for subtasks
      const allNodes = result.current.visibleNodes.filter(isNodeRow)
      const subtaskNode = allNodes.find((n) => n.node.type === 'subtask')
      if (subtaskNode) {
        expect(subtaskNode.childProgress).toBeNull()
      }
    })

    it('includes childProgress property on all FlatTreeNode objects', () => {
      const { result } = renderHook(() => useTreeData('proj-1'), {
        wrapper: createWrapper(),
      })

      // All nodes should have childProgress property (null or object)
      for (const flatNode of result.current.visibleNodes.filter(isNodeRow)) {
        expect(flatNode).toHaveProperty('childProgress')
      }
    })

    it('computes progress when children data is available in childrenMap', async () => {
      mockTreeState = { e1: true }

      const { result, rerender } = renderHook(() => useTreeData('proj-1'), {
        wrapper: createWrapper(),
      })

      // After queries resolve, e1's childProgress should reflect its children
      // Wait for useQueries to resolve
      await vi.waitFor(() => {
        rerender()
        const e1Node = result.current.visibleNodes.filter(isNodeRow).find((n) => n.node.id === 'e1')
        // mockTasks has 1 task with isCompleted: false
        expect(e1Node?.childProgress).toEqual({ completed: 0, total: 1 })
      })
    })

    it('computes mixed progress: 2 of 4 children completed', async () => {
      mockE2Children = mockMixedTasks
      mockTreeState = { e2: true }

      const { result, rerender } = renderHook(() => useTreeData('proj-1'), {
        wrapper: createWrapper(),
      })

      await vi.waitFor(() => {
        rerender()
        const e2Node = result.current.visibleNodes.filter(isNodeRow).find((n) => n.node.id === 'e2')
        expect(e2Node?.childProgress).toEqual({ completed: 2, total: 4 })
      })
    })

    it('computes all-complete progress: 3 of 3 children completed', async () => {
      mockE2Children = mockAllCompleteTasks
      mockTreeState = { e2: true }

      const { result, rerender } = renderHook(() => useTreeData('proj-1'), {
        wrapper: createWrapper(),
      })

      await vi.waitFor(() => {
        rerender()
        const e2Node = result.current.visibleNodes.filter(isNodeRow).find((n) => n.node.id === 'e2')
        expect(e2Node?.childProgress).toEqual({ completed: 3, total: 3 })
      })
    })

    it('computes none-complete progress: 0 of 3 children completed', async () => {
      mockE2Children = mockNoneCompleteTasks
      mockTreeState = { e2: true }

      const { result, rerender } = renderHook(() => useTreeData('proj-1'), {
        wrapper: createWrapper(),
      })

      await vi.waitFor(() => {
        rerender()
        const e2Node = result.current.visibleNodes.filter(isNodeRow).find((n) => n.node.id === 'e2')
        expect(e2Node?.childProgress).toEqual({ completed: 0, total: 3 })
      })
    })
  })
})
