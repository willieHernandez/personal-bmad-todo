import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { TreeView, getDeleteFocusTarget } from './tree-view'
import { useUIStore } from '#/stores/ui-store'
import type { NodeResponse } from '@todo-bmad-style/shared'
import type { FlatTreeNode } from '#/hooks/use-tree-data'

const mockEfforts: NodeResponse[] = [
  {
    id: 'e1',
    title: 'Effort One',
    type: 'effort',
    parentId: 'proj-1',
    sortOrder: 0,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-11T00:00:00Z',
    updatedAt: '2026-03-11T00:00:00Z',
  },
  {
    id: 'e2',
    title: 'Effort Two',
    type: 'effort',
    parentId: 'proj-1',
    sortOrder: 1,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-11T00:00:00Z',
    updatedAt: '2026-03-11T00:00:00Z',
  },
  {
    id: 'e3',
    title: 'Effort Three',
    type: 'effort',
    parentId: 'proj-1',
    sortOrder: 2,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-11T00:00:00Z',
    updatedAt: '2026-03-11T00:00:00Z',
  },
]

const mockVisibleNodes = mockEfforts.map((node) => ({
  node,
  depth: 0,
  isExpanded: false,
  hasChildren: true,
}))

const mockCreateSibling = vi.fn()
const mockToggleExpand = vi.fn()

vi.mock('#/hooks/use-tree-data', () => ({
  useTreeData: () => ({
    visibleNodes: mockVisibleNodes,
    expandedMap: {},
    toggleExpand: mockToggleExpand,
    isExpanded: () => false,
    setExpanded: vi.fn(),
  }),
}))

vi.mock('#/hooks/use-tree-operations', () => ({
  useTreeOperations: () => ({
    createSibling: mockCreateSibling,
    indentNode: vi.fn(),
    outdentNode: vi.fn(),
  }),
}))

vi.mock('#/api/nodes.api', () => ({
  updateNode: vi.fn(() => Promise.resolve({})),
  deleteNode: vi.fn(() => Promise.resolve()),
}))

const mockUpdateMutate = vi.fn()
const mockDeleteMutate = vi.fn()

vi.mock('#/queries/node-queries', () => ({
  useUpdateNode: () => ({
    mutate: mockUpdateMutate,
  }),
  useDeleteNode: () => ({
    mutate: mockDeleteMutate,
  }),
}))

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 28,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * 28,
        size: 28,
        key: i,
      })),
  }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('TreeView Rename & Delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUIStore.setState({
      activeProjectId: 'proj-1',
      openProjectIds: ['proj-1'],
      activeNodeId: null,
    })
  })

  afterEach(() => {
    cleanup()
  })

  // AC #1: Enter enters rename mode with current title pre-filled
  it('pressing Enter on focused node enters rename mode with current title pre-filled', () => {
    useUIStore.setState({ activeNodeId: 'e1' })
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const items = screen.getAllByRole('treeitem')
    fireEvent.keyDown(items[0], { key: 'Enter' })

    const input = screen.getByTestId('tree-row-input') as HTMLInputElement
    expect(input).toBeDefined()
    expect(input.value).toBe('Effort One')
  })

  // AC #2: Enter in rename mode commits the rename
  it('pressing Enter in rename mode commits the rename', () => {
    useUIStore.setState({ activeNodeId: 'e1' })
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    // Enter rename mode
    const items = screen.getAllByRole('treeitem')
    fireEvent.keyDown(items[0], { key: 'Enter' })

    const input = screen.getByTestId('tree-row-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Renamed Effort' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: 'e1',
      data: { title: 'Renamed Effort' },
      parentId: 'proj-1',
    })
  })

  // AC #3: Escape in rename mode cancels and restores original title
  it('pressing Escape in rename mode cancels and restores original title', () => {
    useUIStore.setState({ activeNodeId: 'e1' })
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const items = screen.getAllByRole('treeitem')
    fireEvent.keyDown(items[0], { key: 'Enter' })

    const input = screen.getByTestId('tree-row-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Changed' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    // Input should be gone, original title restored
    expect(screen.queryByTestId('tree-row-input')).toBeNull()
    expect(screen.getByText('Effort One')).toBeDefined()
    // No mutation should be called
    expect(mockUpdateMutate).not.toHaveBeenCalled()
  })

  // AC #4: Blur on rename input commits the rename
  it('blur on rename input commits the rename', () => {
    useUIStore.setState({ activeNodeId: 'e1' })
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const items = screen.getAllByRole('treeitem')
    fireEvent.keyDown(items[0], { key: 'Enter' })

    const input = screen.getByTestId('tree-row-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Blur Renamed' } })
    fireEvent.blur(input)

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: 'e1',
      data: { title: 'Blur Renamed' },
      parentId: 'proj-1',
    })
  })

  // AC #6: Delete key removes node from tree
  it('pressing Delete on focused node triggers delete mutation', () => {
    useUIStore.setState({ activeNodeId: 'e1' })
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const items = screen.getAllByRole('treeitem')
    fireEvent.keyDown(items[0], { key: 'Delete' })

    expect(mockDeleteMutate).toHaveBeenCalledWith({
      id: 'e1',
      parentId: 'proj-1',
    })
  })

  // AC #6: Backspace also removes node
  it('pressing Backspace on focused node triggers delete mutation', () => {
    useUIStore.setState({ activeNodeId: 'e1' })
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const items = screen.getAllByRole('treeitem')
    fireEvent.keyDown(items[0], { key: 'Backspace' })

    expect(mockDeleteMutate).toHaveBeenCalledWith({
      id: 'e1',
      parentId: 'proj-1',
    })
  })

  // AC #6 edge case: Delete/Backspace during edit mode does NOT delete the node
  it('Delete key during edit mode does NOT trigger delete', () => {
    useUIStore.setState({ activeNodeId: 'e1' })
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    // Enter rename mode first
    const items = screen.getAllByRole('treeitem')
    fireEvent.keyDown(items[0], { key: 'Enter' })

    // Now press Delete while in edit mode (editing the input)
    const input = screen.getByTestId('tree-row-input')
    fireEvent.keyDown(input, { key: 'Delete' })

    // Delete mutation should NOT be called
    expect(mockDeleteMutate).not.toHaveBeenCalled()
  })

  // Empty rename value cancels rename (does not delete existing node)
  it('empty rename value cancels rename without deleting', () => {
    useUIStore.setState({ activeNodeId: 'e1' })
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const items = screen.getAllByRole('treeitem')
    fireEvent.keyDown(items[0], { key: 'Enter' })

    const input = screen.getByTestId('tree-row-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // Should NOT call delete or update
    expect(mockDeleteMutate).not.toHaveBeenCalled()
    expect(mockUpdateMutate).not.toHaveBeenCalled()
  })

  // AC #11: ArrowUp/Down still work after rename/delete
  it('arrow keys still work when not in edit mode', () => {
    useUIStore.setState({ activeNodeId: 'e1' })
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const items = screen.getAllByRole('treeitem')
    // Arrow down should move focus (handled by navHandleKeyDown)
    fireEvent.keyDown(items[0], { key: 'ArrowDown' })

    // The test just verifies it doesn't throw and doesn't enter unexpected state
    expect(screen.queryByTestId('tree-row-input')).toBeNull()
  })

  // AC #12: ARIA attributes remain correct
  it('tree items have correct ARIA attributes', () => {
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const items = screen.getAllByRole('treeitem')
    expect(items).toHaveLength(3)

    // Check aria-level
    expect(items[0].getAttribute('aria-level')).toBe('1')
    expect(items[1].getAttribute('aria-level')).toBe('1')

    // Check aria-expanded (hasChildren is true in mocks)
    expect(items[0].getAttribute('aria-expanded')).toBe('false')
  })

  // Rename with same title does not trigger API call
  it('renaming with the same title does not call mutation', () => {
    useUIStore.setState({ activeNodeId: 'e1' })
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const items = screen.getAllByRole('treeitem')
    fireEvent.keyDown(items[0], { key: 'Enter' })

    const input = screen.getByTestId('tree-row-input') as HTMLInputElement
    // Keep the same value and commit
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockUpdateMutate).not.toHaveBeenCalled()
  })

  // Double-click enters rename mode
  it('double-clicking a node enters rename mode with current title', () => {
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const items = screen.getAllByRole('treeitem')
    fireEvent.doubleClick(items[0])

    const input = screen.getByTestId('tree-row-input') as HTMLInputElement
    expect(input).toBeDefined()
    expect(input.value).toBe('Effort One')
  })

  // Double-click does not enter rename when already editing
  it('double-clicking while already in edit mode does nothing', () => {
    useUIStore.setState({ activeNodeId: 'e1' })
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    // Enter rename mode via Enter key on first node
    const items = screen.getAllByRole('treeitem')
    fireEvent.keyDown(items[0], { key: 'Enter' })

    const input = screen.getByTestId('tree-row-input')
    expect(input).toBeDefined()

    // Double-click on second node should not enter rename (already editing)
    fireEvent.doubleClick(items[1])

    // Should still only have one input (the first one)
    const inputs = screen.getAllByTestId('tree-row-input')
    expect(inputs).toHaveLength(1)
  })

  // Delete button triggers delete mutation
  it('clicking the delete button removes the node', () => {
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const deleteButtons = screen.getAllByTestId('tree-row-delete')
    expect(deleteButtons.length).toBeGreaterThan(0)

    fireEvent.click(deleteButtons[0])

    expect(mockDeleteMutate).toHaveBeenCalledWith({
      id: 'e1',
      parentId: 'proj-1',
    })
  })

  // Delete button exists on each row
  it('each tree row has a delete button', () => {
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const deleteButtons = screen.getAllByTestId('tree-row-delete')
    expect(deleteButtons).toHaveLength(3)
  })
})

describe('getDeleteFocusTarget', () => {
  function makeFlatNode(
    id: string,
    parentId: string | null,
    depth: number
  ): FlatTreeNode {
    return {
      node: {
        id,
        title: `Node ${id}`,
        type: 'effort',
        parentId,
        sortOrder: 0,
        isCompleted: false,
        markdownBody: '',
        createdAt: '2026-03-11T00:00:00Z',
        updatedAt: '2026-03-11T00:00:00Z',
      },
      depth,
      isExpanded: false,
      hasChildren: false,
    }
  }

  // AC #8: after delete, focus moves to next sibling
  it('returns next sibling when one exists', () => {
    const nodes: FlatTreeNode[] = [
      makeFlatNode('a', 'parent', 1),
      makeFlatNode('b', 'parent', 1),
      makeFlatNode('c', 'parent', 1),
    ]
    expect(getDeleteFocusTarget(nodes, 'a')).toBe('b')
    expect(getDeleteFocusTarget(nodes, 'b')).toBe('c')
  })

  // AC #8: after delete, focus moves to next sibling (skipping children)
  it('skips children and finds next sibling', () => {
    const nodes: FlatTreeNode[] = [
      makeFlatNode('a', 'parent', 1),
      makeFlatNode('a-child1', 'a', 2),
      makeFlatNode('a-child2', 'a', 2),
      makeFlatNode('b', 'parent', 1),
    ]
    expect(getDeleteFocusTarget(nodes, 'a')).toBe('b')
  })

  // AC #8: after delete when no next sibling, focus moves to previous sibling
  it('returns previous sibling when no next sibling exists', () => {
    const nodes: FlatTreeNode[] = [
      makeFlatNode('a', 'parent', 1),
      makeFlatNode('b', 'parent', 1),
    ]
    expect(getDeleteFocusTarget(nodes, 'b')).toBe('a')
  })

  // AC #8: after delete when no siblings, focus moves to parent
  it('returns parent when no siblings exist', () => {
    const nodes: FlatTreeNode[] = [
      makeFlatNode('parent', null, 0),
      makeFlatNode('only-child', 'parent', 1),
    ]
    expect(getDeleteFocusTarget(nodes, 'only-child')).toBe('parent')
  })

  it('returns null when node not found', () => {
    const nodes: FlatTreeNode[] = [makeFlatNode('a', 'parent', 1)]
    expect(getDeleteFocusTarget(nodes, 'nonexistent')).toBeNull()
  })

  it('returns null for root node with no siblings or parent', () => {
    const nodes: FlatTreeNode[] = [makeFlatNode('root', null, 0)]
    expect(getDeleteFocusTarget(nodes, 'root')).toBeNull()
  })
})
