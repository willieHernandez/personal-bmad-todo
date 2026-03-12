import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ContentPanel } from './content-panel'
import { useUIStore } from '#/stores/ui-store'

const mockMutate = vi.fn()

vi.mock('#/queries/node-queries', () => ({
  useProjects: () => ({
    data: [
      {
        id: 'p1',
        title: 'Project One',
        type: 'project',
        parentId: null,
        sortOrder: 0,
        isCompleted: false,
        markdownBody: '',
        createdAt: '2026-03-11T00:00:00Z',
        updatedAt: '2026-03-11T00:00:00Z',
      },
    ],
    isLoading: false,
  }),
  useCreateProject: () => ({
    mutate: mockMutate,
  }),
  useToggleNodeCompletion: () => ({
    mutate: vi.fn(),
  }),
}))

vi.mock('#/components/features/tree-view/tree-view', () => ({
  TreeView: ({ projectId }: { projectId: string }) => (
    <div data-testid="tree-view">TreeView: {projectId}</div>
  ),
}))

vi.mock('#/components/features/detail-panel/detail-panel', () => ({
  DetailPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="detail-panel">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

describe('ContentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUIStore.setState({
      activeProjectId: null,
      openProjectIds: [],
      activeNodeId: null,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders empty state when no project is selected', () => {
    render(<ContentPanel />)
    expect(screen.getByText(/Select a project from the sidebar/)).toBeDefined()
  })

  it('empty state shows "Create project" button', () => {
    render(<ContentPanel />)
    expect(screen.getByRole('button', { name: /Create project/ })).toBeDefined()
  })

  it('clicking "Create project" triggers project creation', () => {
    render(<ContentPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Create project/ }))
    expect(mockMutate).toHaveBeenCalledWith(
      { title: 'New Project' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('renders TreeView when activeProjectId is set and project exists', () => {
    useUIStore.setState({ activeProjectId: 'p1', openProjectIds: ['p1'] })
    render(<ContentPanel />)
    expect(screen.getByTestId('tree-view')).toBeDefined()
    expect(screen.getByText('TreeView: p1')).toBeDefined()
  })

  it('renders DetailPanel alongside TreeView', () => {
    useUIStore.setState({ activeProjectId: 'p1', openProjectIds: ['p1'] })
    render(<ContentPanel />)
    expect(screen.getByTestId('detail-panel')).toBeDefined()
  })

  it('renders empty state when activeProjectId does not match any project', () => {
    useUIStore.setState({ activeProjectId: 'non-existent', openProjectIds: ['non-existent'] })
    render(<ContentPanel />)
    expect(screen.getByText(/Select a project from the sidebar/)).toBeDefined()
  })
})
