import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { TreeView, isValidDropTarget } from './tree-view'
import { useUIStore } from '#/stores/ui-store'
import type { NodeResponse } from '@todo-bmad-style/shared'
import type { FlatTreeNode } from '#/hooks/use-tree-data'

// Shared mock data
function makeNode(overrides: Partial<NodeResponse> = {}): NodeResponse {
  return {
    id: 'n1',
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

function makeFlatNode(nodeOverrides: Partial<NodeResponse> = {}, flatOverrides: Partial<Omit<FlatTreeNode, 'node'>> = {}): FlatTreeNode {
  return {
    node: makeNode(nodeOverrides),
    depth: 0,
    isExpanded: false,
    hasChildren: false,
    ...flatOverrides,
  }
}

// Complex tree for DnD integration tests
const effort1 = makeNode({ id: 'e1', title: 'Effort One', type: 'effort', parentId: 'proj-1', sortOrder: 0 })
const effort2 = makeNode({ id: 'e2', title: 'Effort Two', type: 'effort', parentId: 'proj-1', sortOrder: 1 })
const task1 = makeNode({ id: 't1', title: 'Task One', type: 'task', parentId: 'e1', sortOrder: 0 })
const task2 = makeNode({ id: 't2', title: 'Task Two', type: 'task', parentId: 'e1', sortOrder: 1 })
const subtask1 = makeNode({ id: 's1', title: 'Subtask One', type: 'subtask', parentId: 't1', sortOrder: 0 })

const mockEfforts: NodeResponse[] = [effort1, effort2]

const mockVisibleNodesSimple = mockEfforts.map((node) => ({
  node,
  depth: 0,
  isExpanded: false,
  hasChildren: true,
}))

const mockVisibleNodesComplex: FlatTreeNode[] = [
  { node: effort1, depth: 0, isExpanded: true, hasChildren: true },
  { node: task1, depth: 1, isExpanded: true, hasChildren: true },
  { node: subtask1, depth: 2, isExpanded: false, hasChildren: false },
  { node: task2, depth: 1, isExpanded: false, hasChildren: false },
  { node: effort2, depth: 0, isExpanded: false, hasChildren: true },
]

const mockCreateSibling = vi.fn()
const mockToggleExpand = vi.fn()

vi.mock('#/hooks/use-tree-data', () => ({
  useTreeData: () => ({
    visibleNodes: mockVisibleNodesSimple,
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
  reorderNode: vi.fn(() => Promise.resolve({})),
  moveNode: vi.fn(() => Promise.resolve({})),
}))

const mockUpdateMutate = vi.fn()
const mockDeleteMutate = vi.fn()
const mockReorderMutate = vi.fn()
const mockMoveMutate = vi.fn()

vi.mock('#/queries/node-queries', () => ({
  useUpdateNode: () => ({ mutate: mockUpdateMutate }),
  useDeleteNode: () => ({ mutate: mockDeleteMutate }),
  useReorderNode: () => ({ mutate: mockReorderMutate }),
  useMoveNode: () => ({ mutate: mockMoveMutate }),
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
    measureElement: () => {},
    scrollToIndex: () => {},
  }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('DnD Integration', () => {
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

  it('renders drag handles on each tree row', () => {
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })
    const dragHandles = screen.getAllByTestId('tree-row-drag-handle')
    expect(dragHandles).toHaveLength(2)
  })

  it('keyboard shortcuts still work after rendering with DnD context', () => {
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    // Verify tree is still functional
    const items = screen.getAllByRole('treeitem')
    expect(items).toHaveLength(2)

    // Click a node to focus it
    fireEvent.click(screen.getByText('Effort One'))
    expect(useUIStore.getState().activeNodeId).toBe('e1')

    // Enter should enter rename mode
    fireEvent.keyDown(items[0], { key: 'Enter' })
    const input = screen.getByTestId('tree-row-input')
    expect(input).toBeDefined()
  })

  it('ARIA attributes remain correct on tree items', () => {
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })
    const items = screen.getAllByRole('treeitem')

    expect(items[0].getAttribute('aria-level')).toBe('1')
    expect(items[1].getAttribute('aria-level')).toBe('1')
    expect(items[0].getAttribute('data-node-id')).toBe('e1')
    expect(items[1].getAttribute('data-node-id')).toBe('e2')
  })
})

describe('isValidDropTarget', () => {
  it('rejects dropping a node onto itself', () => {
    const node = makeFlatNode({ id: 'e1', type: 'effort', parentId: 'proj-1' })
    expect(isValidDropTarget(node, node, 'child', [node])).toBe(false)
  })

  it('rejects dropping a node onto its own descendant', () => {
    const parent = makeFlatNode({ id: 'e1', type: 'effort', parentId: 'proj-1' }, { depth: 0 })
    const child = makeFlatNode({ id: 't1', type: 'task', parentId: 'e1' }, { depth: 1 })
    const nodes = [parent, child]
    expect(isValidDropTarget(parent, child, 'child', nodes)).toBe(false)
  })

  it('allows dropping a task as child of an effort', () => {
    const dragged = makeFlatNode({ id: 't1', type: 'task', parentId: 'e1' }, { depth: 1 })
    const target = makeFlatNode({ id: 'e2', type: 'effort', parentId: 'proj-1' }, { depth: 0, hasChildren: true })
    const nodes = [target, dragged]
    expect(isValidDropTarget(dragged, target, 'child', nodes)).toBe(true)
  })

  it('allows dropping a leaf effort onto another effort as child (becomes task)', () => {
    const dragged = makeFlatNode({ id: 'e1', type: 'effort', parentId: 'proj-1' }, { depth: 0, hasChildren: false })
    const target = makeFlatNode({ id: 'e2', type: 'effort', parentId: 'proj-1' }, { depth: 0 })
    // Leaf effort can become task (no children to break)
    expect(isValidDropTarget(dragged, target, 'child', [dragged, target])).toBe(true)
  })

  it('rejects dropping an effort WITH children onto another effort as child (would break subtree)', () => {
    const dragged = makeFlatNode({ id: 'e1', type: 'effort', parentId: 'proj-1' }, { depth: 0, hasChildren: true })
    const target = makeFlatNode({ id: 'e2', type: 'effort', parentId: 'proj-1' }, { depth: 0 })
    // Effort with task children → becomes task, but children are still tasks (invalid under task parent)
    expect(isValidDropTarget(dragged, target, 'child', [dragged, target])).toBe(false)
  })

  it('rejects dropping a task WITH children as child of a task (would exceed depth)', () => {
    const dragged = makeFlatNode({ id: 't1', type: 'task', parentId: 'e1' }, { depth: 1, hasChildren: true })
    const target = makeFlatNode({ id: 't2', type: 'task', parentId: 'e1' }, { depth: 1 })
    // Task with subtask children → becomes subtask, but children are still subtasks (invalid under subtask)
    expect(isValidDropTarget(dragged, target, 'child', [dragged, target])).toBe(false)
  })

  it('allows dropping a leaf task as child of another task (becomes subtask)', () => {
    const dragged = makeFlatNode({ id: 't1', type: 'task', parentId: 'e1' }, { depth: 1, hasChildren: false })
    const target = makeFlatNode({ id: 't2', type: 'task', parentId: 'e1' }, { depth: 1 })
    expect(isValidDropTarget(dragged, target, 'child', [dragged, target])).toBe(true)
  })

  it('rejects dropping onto a subtask as child (subtask cannot have children)', () => {
    const dragged = makeFlatNode({ id: 't1', type: 'task', parentId: 'e1' }, { depth: 1 })
    const target = makeFlatNode({ id: 's1', type: 'subtask', parentId: 't1' }, { depth: 2 })
    expect(isValidDropTarget(dragged, target, 'child', [dragged, target])).toBe(false)
  })

  it('allows reorder (before/after) between siblings with valid parent', () => {
    const proj = makeFlatNode({ id: 'proj-1', type: 'project', parentId: null }, { depth: -1 })
    const e1Node = makeFlatNode({ id: 'e1', type: 'effort', parentId: 'proj-1' }, { depth: 0 })
    const e2Node = makeFlatNode({ id: 'e2', type: 'effort', parentId: 'proj-1' }, { depth: 0 })
    const nodes = [proj, e1Node, e2Node]
    expect(isValidDropTarget(e1Node, e2Node, 'before', nodes)).toBe(true)
    expect(isValidDropTarget(e1Node, e2Node, 'after', nodes)).toBe(true)
  })

  it('rejects before/after that would change type for node with children', () => {
    // Effort with children dropped as sibling of a task (target parent is effort)
    // → effort would become task, but its children (tasks) would be invalid under task
    const proj = makeFlatNode({ id: 'proj-1', type: 'project', parentId: null }, { depth: -1 })
    const e1Node = makeFlatNode({ id: 'e1', type: 'effort', parentId: 'proj-1' }, { depth: 0, hasChildren: true })
    const e2Node = makeFlatNode({ id: 'e2', type: 'effort', parentId: 'proj-1' }, { depth: 0 })
    const t1Node = makeFlatNode({ id: 't1', type: 'task', parentId: 'e2' }, { depth: 1 })
    const nodes = [proj, e1Node, e2Node, t1Node]
    expect(isValidDropTarget(e1Node, t1Node, 'before', nodes)).toBe(false)
  })

  it('rejects before/after when target has no parent (root level)', () => {
    const proj = makeFlatNode({ id: 'proj-1', type: 'project', parentId: null }, { depth: 0 })
    const dragged = makeFlatNode({ id: 'e1', type: 'effort', parentId: 'proj-1' }, { depth: 1 })
    expect(isValidDropTarget(dragged, proj, 'before', [proj, dragged])).toBe(false)
  })

  it('rejects dropping a parent onto a nested descendant', () => {
    const nodes = mockVisibleNodesComplex
    // effort1 -> task1 -> subtask1
    const effort = nodes[0] // effort1
    const subtask = nodes[2] // subtask1 (descendant of effort1)
    expect(isValidDropTarget(effort, subtask, 'child', nodes)).toBe(false)
    expect(isValidDropTarget(effort, subtask, 'before', nodes)).toBe(false)
  })
})
