import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTreeNavigation } from './use-tree-navigation'
import type { FlatTreeNode } from './use-tree-data'
import type { NodeResponse } from '@todo-bmad-style/shared'

function makeNode(overrides: Partial<NodeResponse> & { id: string; type: 'project' | 'effort' | 'task' | 'subtask' }): NodeResponse {
  return {
    title: overrides.id,
    parentId: null,
    sortOrder: 0,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
    ...overrides,
  } as NodeResponse
}

function makeFlatNode(
  id: string,
  depth: number,
  opts: { isExpanded?: boolean; hasChildren?: boolean; type?: 'project' | 'effort' | 'task' | 'subtask'; parentId?: string | null } = {}
): FlatTreeNode {
  return {
    kind: 'node' as const,
    node: makeNode({ id, type: opts.type ?? 'effort', parentId: opts.parentId ?? null }),
    depth,
    isExpanded: opts.isExpanded ?? false,
    hasChildren: opts.hasChildren ?? false,
    childProgress: null,
  }
}

function fireKey(handleKeyDown: (e: React.KeyboardEvent) => void, key: string) {
  const event = {
    key,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent
  handleKeyDown(event)
  return event
}

describe('useTreeNavigation', () => {
  const defaultNodes: FlatTreeNode[] = [
    makeFlatNode('e1', 0, { hasChildren: true, isExpanded: true }),
    makeFlatNode('t1', 1, { hasChildren: true, type: 'task', parentId: 'e1' }),
    makeFlatNode('e2', 0, { hasChildren: true }),
  ]

  function setup(visibleNodes = defaultNodes, expandedMap: Record<string, boolean> = { e1: true }) {
    const setExpanded = vi.fn()
    return renderHook(() =>
      useTreeNavigation({ visibleNodes, expandedMap, setExpanded })
    )
  }

  it('ArrowDown moves focus to next visible node', () => {
    const { result } = setup()
    expect(result.current.focusedIndex).toBe(0)

    act(() => {
      fireKey(result.current.handleKeyDown, 'ArrowDown')
    })
    expect(result.current.focusedIndex).toBe(1)
  })

  it('ArrowUp moves focus to previous visible node', () => {
    const { result } = setup()
    act(() => { result.current.setFocusedIndex(2) })

    act(() => {
      fireKey(result.current.handleKeyDown, 'ArrowUp')
    })
    expect(result.current.focusedIndex).toBe(1)
  })

  it('ArrowDown at last node does not move past end', () => {
    const { result } = setup()
    act(() => { result.current.setFocusedIndex(2) })

    act(() => {
      fireKey(result.current.handleKeyDown, 'ArrowDown')
    })
    expect(result.current.focusedIndex).toBe(2)
  })

  it('ArrowUp at first node does not move past start', () => {
    const { result } = setup()
    expect(result.current.focusedIndex).toBe(0)

    act(() => {
      fireKey(result.current.handleKeyDown, 'ArrowUp')
    })
    expect(result.current.focusedIndex).toBe(0)
  })

  it('ArrowRight on collapsed node with children calls setExpanded', () => {
    const setExpanded = vi.fn()
    const nodes: FlatTreeNode[] = [
      makeFlatNode('e1', 0, { hasChildren: true, isExpanded: false }),
    ]
    const { result } = renderHook(() =>
      useTreeNavigation({ visibleNodes: nodes, expandedMap: {}, setExpanded })
    )

    act(() => {
      fireKey(result.current.handleKeyDown, 'ArrowRight')
    })
    expect(setExpanded).toHaveBeenCalledWith('e1', true)
  })

  it('ArrowRight on expanded node moves to first child', () => {
    const { result } = setup()
    // e1 is expanded and index 0, t1 is child at index 1
    expect(result.current.focusedIndex).toBe(0)

    act(() => {
      fireKey(result.current.handleKeyDown, 'ArrowRight')
    })
    expect(result.current.focusedIndex).toBe(1)
  })

  it('ArrowLeft on expanded node calls setExpanded to collapse', () => {
    const setExpanded = vi.fn()
    const nodes: FlatTreeNode[] = [
      makeFlatNode('e1', 0, { hasChildren: true, isExpanded: true }),
      makeFlatNode('t1', 1, { type: 'task', parentId: 'e1' }),
    ]
    const { result } = renderHook(() =>
      useTreeNavigation({ visibleNodes: nodes, expandedMap: { e1: true }, setExpanded })
    )

    act(() => {
      fireKey(result.current.handleKeyDown, 'ArrowLeft')
    })
    expect(setExpanded).toHaveBeenCalledWith('e1', false)
  })

  it('ArrowLeft on collapsed/leaf node moves to parent', () => {
    const setExpanded = vi.fn()
    const nodes: FlatTreeNode[] = [
      makeFlatNode('e1', 0, { hasChildren: true, isExpanded: true }),
      makeFlatNode('t1', 1, { hasChildren: false, type: 'task', parentId: 'e1' }),
    ]
    const { result } = renderHook(() =>
      useTreeNavigation({ visibleNodes: nodes, expandedMap: { e1: true }, setExpanded })
    )
    act(() => { result.current.setFocusedIndex(1) })
    act(() => {
      fireKey(result.current.handleKeyDown, 'ArrowLeft')
    })
    expect(result.current.focusedIndex).toBe(0)
  })

  it('Home moves to first node', () => {
    const { result } = setup()
    act(() => { result.current.setFocusedIndex(2) })

    act(() => {
      fireKey(result.current.handleKeyDown, 'Home')
    })
    expect(result.current.focusedIndex).toBe(0)
  })

  it('End moves to last visible node', () => {
    const { result } = setup()
    expect(result.current.focusedIndex).toBe(0)

    act(() => {
      fireKey(result.current.handleKeyDown, 'End')
    })
    expect(result.current.focusedIndex).toBe(2)
  })
})
