import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { TreeView } from './tree-view'
import { useUIStore } from '#/stores/ui-store'
import type { NodeResponse } from '@todo-bmad-style/shared'

const mockEfforts: NodeResponse[] = [
  {
    id: 'e1',
    title: 'Effort One',
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
    title: 'Effort Two',
    type: 'effort',
    parentId: 'proj-1',
    sortOrder: 1,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
  },
]

const mockVisibleNodes = mockEfforts.map((node) => ({
  node,
  depth: 0,
  isExpanded: false,
  hasChildren: true,
}))

const mockCreateSibling = vi.fn()
const mockIndentNode = vi.fn()
const mockOutdentNode = vi.fn()
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
    indentNode: mockIndentNode,
    outdentNode: mockOutdentNode,
  }),
}))

vi.mock('#/api/nodes.api', () => ({
  updateNode: vi.fn(() => Promise.resolve({})),
  deleteNode: vi.fn(() => Promise.resolve()),
}))

const mockUpdateMutate = vi.fn()
const mockDeleteMutate = vi.fn()
const mockReorderMutate = vi.fn()
const mockMoveMutate = vi.fn()
const mockToggleCompletionMutate = vi.fn()

vi.mock('#/queries/node-queries', () => ({
  useUpdateNode: () => ({
    mutate: mockUpdateMutate,
  }),
  useDeleteNode: () => ({
    mutate: mockDeleteMutate,
  }),
  useReorderNode: () => ({
    mutate: mockReorderMutate,
  }),
  useMoveNode: () => ({
    mutate: mockMoveMutate,
  }),
  useToggleNodeCompletion: () => ({
    mutate: mockToggleCompletionMutate,
  }),
}))

// Mock the virtualizer to bypass jsdom layout limitations
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

describe('TreeView', () => {
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

  it('renders tree with correct role and aria-label', () => {
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })
    const tree = screen.getByRole('tree')
    expect(tree.getAttribute('aria-label')).toBe('Project tree')
  })

  it('renders visible nodes', () => {
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })
    expect(screen.getByText('Effort One')).toBeDefined()
    expect(screen.getByText('Effort Two')).toBeDefined()
  })

  it('renders tree items with treeitem role', () => {
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })
    const items = screen.getAllByRole('treeitem')
    expect(items).toHaveLength(2)
  })

  it('clicking a node sets it as focused', () => {
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByText('Effort One'))
    expect(useUIStore.getState().activeNodeId).toBe('e1')
  })

  it('pressing Enter on focused node enters rename mode', () => {
    useUIStore.setState({ activeNodeId: 'e1' })

    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const items = screen.getAllByRole('treeitem')
    fireEvent.keyDown(items[0], { key: 'Enter' })

    // Should show an input with the current title pre-filled
    const input = screen.getByTestId('tree-row-input')
    expect(input).toBeDefined()
    expect((input as HTMLInputElement).value).toBe('Effort One')
  })

  it('pressing Ctrl+Enter on focused node calls createSibling', () => {
    useUIStore.setState({ activeNodeId: 'e1' })
    mockCreateSibling.mockResolvedValue({
      id: 'new-1',
      title: '',
      type: 'effort',
      parentId: 'proj-1',
      sortOrder: 1,
      isCompleted: false,
      markdownBody: '',
      createdAt: '2026-03-10T00:00:00Z',
      updatedAt: '2026-03-10T00:00:00Z',
    })

    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const items = screen.getAllByRole('treeitem')
    fireEvent.keyDown(items[0], { key: 'Enter', ctrlKey: true })

    expect(mockCreateSibling).toHaveBeenCalled()
  })

  it('chevron click triggers expand toggle', () => {
    render(<TreeView projectId="proj-1" />, { wrapper: createWrapper() })

    const expandButtons = screen.getAllByLabelText('Expand')
    fireEvent.click(expandButtons[0])

    expect(mockToggleExpand).toHaveBeenCalledWith('e1')
  })
})
