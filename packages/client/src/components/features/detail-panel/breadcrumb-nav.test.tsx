import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BreadcrumbNav } from './breadcrumb-nav'
import type { NodeResponse } from '@todo-bmad-style/shared'

const mockAncestors: Record<string, NodeResponse[]> = {
  'subtask-1': [
    { id: 'proj-1', title: 'My Project', type: 'project', parentId: null, sortOrder: 0, isCompleted: false, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
    { id: 'effort-1', title: 'My Effort', type: 'effort', parentId: 'proj-1', sortOrder: 0, isCompleted: false, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
    { id: 'task-1', title: 'My Task', type: 'task', parentId: 'effort-1', sortOrder: 0, isCompleted: false, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
    { id: 'subtask-1', title: 'My Subtask', type: 'subtask', parentId: 'task-1', sortOrder: 0, isCompleted: false, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
  ],
  'proj-1': [
    { id: 'proj-1', title: 'My Project', type: 'project', parentId: null, sortOrder: 0, isCompleted: false, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
  ],
  'effort-1': [
    { id: 'proj-1', title: 'My Project', type: 'project', parentId: null, sortOrder: 0, isCompleted: false, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
    { id: 'effort-1', title: 'My Effort', type: 'effort', parentId: 'proj-1', sortOrder: 0, isCompleted: false, markdownBody: '', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
  ],
}

const mockSetFocusedNode = vi.fn()
const mockOpenTab = vi.fn()

vi.mock('#/queries/node-queries', () => ({
  useNodeAncestors: (nodeId: string) => ({
    data: mockAncestors[nodeId] ?? undefined,
    isLoading: false,
    error: null,
  }),
  useToggleNodeCompletion: () => ({
    mutate: vi.fn(),
  }),
}))

vi.mock('#/stores/ui-store', () => ({
  useUIStore: (selector: (s: { setFocusedNode: typeof mockSetFocusedNode }) => unknown) =>
    selector({ setFocusedNode: mockSetFocusedNode }),
}))

vi.mock('#/stores/detail-panel-store', () => ({
  useDetailPanelStore: (selector: (s: { openTab: typeof mockOpenTab }) => unknown) =>
    selector({ openTab: mockOpenTab }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BreadcrumbNav', () => {
  it('renders breadcrumb trail with correct ancestor chain', () => {
    render(<BreadcrumbNav nodeId="subtask-1" />, { wrapper: createWrapper() })
    expect(screen.getByText('My Project')).toBeDefined()
    expect(screen.getByText('My Effort')).toBeDefined()
    expect(screen.getByText('My Task')).toBeDefined()
    expect(screen.getByText('My Subtask')).toBeDefined()
  })

  it('renders current node (last segment) as non-clickable BreadcrumbPage', () => {
    render(<BreadcrumbNav nodeId="subtask-1" />, { wrapper: createWrapper() })
    const currentNode = screen.getByText('My Subtask')
    expect(currentNode.getAttribute('aria-current')).toBe('page')
    expect(currentNode.getAttribute('aria-disabled')).toBe('true')
  })

  it('renders parent segments as clickable buttons', () => {
    render(<BreadcrumbNav nodeId="subtask-1" />, { wrapper: createWrapper() })
    const projectLink = screen.getByText('My Project')
    expect(projectLink.tagName.toLowerCase()).toBe('button')
  })

  it('calls setFocusedNode when clicking a parent breadcrumb', () => {
    render(<BreadcrumbNav nodeId="subtask-1" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByText('My Project'))
    expect(mockSetFocusedNode).toHaveBeenCalledWith('proj-1')
  })

  it('calls openTab when clicking a task-type parent breadcrumb', () => {
    render(<BreadcrumbNav nodeId="subtask-1" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByText('My Task'))
    expect(mockSetFocusedNode).toHaveBeenCalledWith('task-1')
    expect(mockOpenTab).toHaveBeenCalledWith('task-1')
  })

  it('does not call openTab when clicking a project-type breadcrumb', () => {
    render(<BreadcrumbNav nodeId="subtask-1" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByText('My Project'))
    expect(mockOpenTab).not.toHaveBeenCalled()
  })

  it('has role="navigation" and aria-label="breadcrumb"', () => {
    render(<BreadcrumbNav nodeId="subtask-1" />, { wrapper: createWrapper() })
    const nav = screen.getByRole('navigation')
    expect(nav.getAttribute('aria-label')).toBe('breadcrumb')
  })

  it('returns null for project-level nodes (single ancestor)', () => {
    const { container } = render(<BreadcrumbNav nodeId="proj-1" />, { wrapper: createWrapper() })
    expect(container.innerHTML).toBe('')
  })

  it('renders for effort-level nodes (2 ancestors)', () => {
    render(<BreadcrumbNav nodeId="effort-1" />, { wrapper: createWrapper() })
    expect(screen.getByText('My Project')).toBeDefined()
    expect(screen.getByText('My Effort')).toBeDefined()
  })

  it('uses "/" separator between segments', () => {
    render(<BreadcrumbNav nodeId="subtask-1" />, { wrapper: createWrapper() })
    const separators = screen.getAllByRole('presentation', { hidden: true })
    expect(separators.length).toBe(3)
  })
})
