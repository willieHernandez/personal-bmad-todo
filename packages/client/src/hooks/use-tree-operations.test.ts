import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { NodeResponse } from '@todo-bmad-style/shared'

const mockMutateAsync = vi.fn()

vi.mock('#/queries/node-queries', () => ({
  useCreateNode: () => ({
    mutateAsync: mockMutateAsync,
  }),
  useToggleNodeCompletion: () => ({
    mutate: vi.fn(),
  }),
}))

vi.mock('#/api/nodes.api', () => ({
  moveNode: vi.fn(() => Promise.resolve({})),
}))

import { useTreeOperations } from './use-tree-operations'
import { moveNode } from '#/api/nodes.api'

const mockMoveNode = vi.mocked(moveNode)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function makeNode(overrides: Partial<NodeResponse>): NodeResponse {
  return {
    id: 'n1',
    title: 'Node',
    type: 'effort',
    parentId: 'proj-1',
    sortOrder: 0,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
    ...overrides,
  }
}

function makeFlatNode(
  node: NodeResponse,
  depth: number,
  isExpanded = false,
  hasChildren = true
) {
  return { kind: 'node' as const, node, depth, isExpanded, hasChildren, childProgress: null }
}

describe('useTreeOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSibling', () => {
    it('creates a node with the same type and parent', async () => {
      const effort = makeNode({ id: 'e1', type: 'effort', parentId: 'proj-1', sortOrder: 2 })
      mockMutateAsync.mockResolvedValue(makeNode({ id: 'new-1', type: 'effort' }))

      const { result } = renderHook(() => useTreeOperations(), {
        wrapper: createWrapper(),
      })

      const visibleNodes = [makeFlatNode(effort, 0)]
      const created = await result.current.createSibling(effort, visibleNodes)

      expect(mockMutateAsync).toHaveBeenCalledWith({
        title: 'Untitled',
        type: 'effort',
        parentId: 'proj-1',
        sortOrder: 3,
      })
      expect(created).toBeTruthy()
    })

    it('returns null if node has no parent', async () => {
      const project = makeNode({ id: 'p1', type: 'project', parentId: null })

      const { result } = renderHook(() => useTreeOperations(), {
        wrapper: createWrapper(),
      })

      const created = await result.current.createSibling(project, [])
      expect(created).toBeNull()
      expect(mockMutateAsync).not.toHaveBeenCalled()
    })
  })

  describe('indentNode', () => {
    it('prevents indenting subtasks (max depth)', async () => {
      const subtask = makeNode({ id: 's1', type: 'subtask', parentId: 't1' })
      const visibleNodes = [makeFlatNode(subtask, 2, false, false)]

      const { result } = renderHook(() => useTreeOperations(), {
        wrapper: createWrapper(),
      })

      const success = await result.current.indentNode('s1', visibleNodes)
      expect(success).toBe(false)
      expect(mockMoveNode).not.toHaveBeenCalled()
    })

    it('indents a task under its previous sibling', async () => {
      const effort1 = makeNode({ id: 'e1', type: 'effort', parentId: 'proj-1', sortOrder: 0 })
      const effort2 = makeNode({ id: 'e2', type: 'effort', parentId: 'proj-1', sortOrder: 1 })
      const visibleNodes = [
        makeFlatNode(effort1, 0),
        makeFlatNode(effort2, 0),
      ]

      const { result } = renderHook(() => useTreeOperations(), {
        wrapper: createWrapper(),
      })

      const newParentId = await result.current.indentNode('e2', visibleNodes)
      expect(newParentId).toBe('e1')
      expect(mockMoveNode).toHaveBeenCalledWith('e2', {
        newParentId: 'e1',
        sortOrder: 0,
        newType: 'task',
      })
    })

    it('returns false when no previous sibling exists', async () => {
      const effort = makeNode({ id: 'e1', type: 'effort', parentId: 'proj-1' })
      const visibleNodes = [makeFlatNode(effort, 0)]

      const { result } = renderHook(() => useTreeOperations(), {
        wrapper: createWrapper(),
      })

      const success = await result.current.indentNode('e1', visibleNodes)
      expect(success).toBe(false)
    })
  })

  describe('outdentNode', () => {
    it('prevents outdenting efforts (min depth)', async () => {
      const effort = makeNode({ id: 'e1', type: 'effort', parentId: 'proj-1' })
      const visibleNodes = [makeFlatNode(effort, 0)]

      const { result } = renderHook(() => useTreeOperations(), {
        wrapper: createWrapper(),
      })

      const success = await result.current.outdentNode('e1', visibleNodes)
      expect(success).toBe(false)
      expect(mockMoveNode).not.toHaveBeenCalled()
    })

    it('outdents a task to become sibling of its parent', async () => {
      const effort = makeNode({ id: 'e1', type: 'effort', parentId: 'proj-1' })
      const task = makeNode({ id: 't1', type: 'task', parentId: 'e1' })
      const visibleNodes = [
        makeFlatNode(effort, 0, true),
        makeFlatNode(task, 1),
      ]

      const { result } = renderHook(() => useTreeOperations(), {
        wrapper: createWrapper(),
      })

      const success = await result.current.outdentNode('t1', visibleNodes)
      expect(success).toBe(true)
      expect(mockMoveNode).toHaveBeenCalledWith('t1', {
        newParentId: 'proj-1',
        sortOrder: 0,
        newType: 'effort',
      })
    })
  })
})
