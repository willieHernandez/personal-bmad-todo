import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from './sidebar'
import { useUIStore } from '#/stores/ui-store'
import { useSidebarStore } from '#/stores/sidebar-store'

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
}))

describe('Sidebar', () => {
  beforeEach(() => {
    useUIStore.setState({
      activeProjectId: null,
      openProjectIds: [],
      activeNodeId: null,
    })
    useSidebarStore.setState({
      width: 240,
      isCollapsed: false,
      collapsedSections: {},
    })
  })

  it('renders all four section headers', () => {
    render(<Sidebar />)
    const triggers = screen.getAllByRole('button').filter(
      (btn) => btn.getAttribute('data-slot') === 'collapsible-trigger'
    )
    const names = triggers.map((t) => t.textContent)
    expect(names).toContain('Inbox')
    expect(names).toContain('Pinned')
    expect(names).toContain('Recent')
    expect(names).toContain('On Hold')
  })

  it('renders projects in the Recent section', () => {
    render(<Sidebar />)
    // Get project list items (buttons without data-slot, with project titles)
    const allAlpha = screen.getAllByText('Project Alpha')
    const allBeta = screen.getAllByText('Project Beta')
    // At least one of each project should be rendered
    expect(allAlpha.length).toBeGreaterThanOrEqual(1)
    expect(allBeta.length).toBeGreaterThanOrEqual(1)
  })

  it('clicking a project calls setActiveProject', () => {
    render(<Sidebar />)
    const projectButtons = screen.getAllByText('Project Alpha')
    // Click the first one
    fireEvent.click(projectButtons[0])
    expect(useUIStore.getState().activeProjectId).toBe('p1')
    expect(useUIStore.getState().openProjectIds).toContain('p1')
  })

  it('shows active state for selected project', () => {
    useUIStore.setState({ activeProjectId: 'p1', openProjectIds: ['p1'] })
    render(<Sidebar />)
    const projectButtons = screen.getAllByText('Project Alpha')
    const activeButton = projectButtons[0].closest('button')
    expect(activeButton?.getAttribute('aria-current')).toBe('page')
  })
})
