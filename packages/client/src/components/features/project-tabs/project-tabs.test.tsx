import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProjectTabs } from './project-tabs'
import { useUIStore } from '#/stores/ui-store'

const mockProjects = [
  {
    id: 'p1',
    title: 'Project Alpha',
    type: 'project' as const,
    parentId: null,
    sortOrder: 0,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-08T10:00:00Z',
    updatedAt: '2026-03-09T10:00:00Z',
  },
  {
    id: 'p2',
    title: 'Project Beta',
    type: 'project' as const,
    parentId: null,
    sortOrder: 1,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-07T10:00:00Z',
    updatedAt: '2026-03-08T10:00:00Z',
  },
]

vi.mock('#/queries/node-queries', () => ({
  useProjects: () => ({ data: mockProjects, isLoading: false }),
  useCreateProject: () => ({ mutate: vi.fn() }),
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('ProjectTabs', () => {
  beforeEach(() => {
    useUIStore.setState({
      activeProjectId: null,
      openProjectIds: [],
      activeNodeId: null,
    })
  })

  it('renders tabs for open projects', () => {
    useUIStore.setState({
      activeProjectId: 'p1',
      openProjectIds: ['p1', 'p2'],
    })

    renderWithProviders(<ProjectTabs />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
  })

  it('renders no tabs when no projects are open', () => {
    renderWithProviders(<ProjectTabs />)

    const tabs = screen.queryAllByRole('tab')
    expect(tabs).toHaveLength(0)
  })

  it('clicking a tab switches active project', () => {
    useUIStore.setState({
      activeProjectId: 'p1',
      openProjectIds: ['p1', 'p2'],
    })

    renderWithProviders(<ProjectTabs />)

    // Each tab is a div[role="tab"] containing a button for the title
    const tabs = screen.getAllByRole('tab')
    const secondTabButton = tabs[1].querySelector('button')!
    fireEvent.click(secondTabButton)
    expect(useUIStore.getState().activeProjectId).toBe('p2')
  })

  it('close button removes the tab', () => {
    useUIStore.setState({
      activeProjectId: 'p1',
      openProjectIds: ['p1', 'p2'],
    })

    renderWithProviders(<ProjectTabs />)

    const closeButtons = screen.getAllByLabelText(/Close .* tab/)
    fireEvent.click(closeButtons[0])

    expect(useUIStore.getState().openProjectIds).toEqual(['p2'])
  })

  it('shows create project button', () => {
    renderWithProviders(<ProjectTabs />)
    const buttons = screen.getAllByLabelText('Create new project')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })
})
