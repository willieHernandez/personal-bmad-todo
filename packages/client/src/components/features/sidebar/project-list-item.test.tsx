import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ProjectListItem } from './project-list-item'
import { useUIStore } from '#/stores/ui-store'

describe('ProjectListItem', () => {
  beforeEach(() => {
    useUIStore.setState({
      activeProjectId: null,
      openProjectIds: [],
      activeNodeId: null,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders project title', () => {
    render(<ProjectListItem id="p1" title="My Project" />)
    expect(screen.getByText('My Project')).toBeDefined()
  })

  it('calls setActiveProject on click', () => {
    render(<ProjectListItem id="p1" title="My Project" />)
    fireEvent.click(screen.getByRole('button'))
    expect(useUIStore.getState().activeProjectId).toBe('p1')
    expect(useUIStore.getState().openProjectIds).toContain('p1')
  })

  it('sets aria-current=page when project is active', () => {
    useUIStore.setState({ activeProjectId: 'p1', openProjectIds: ['p1'] })
    render(<ProjectListItem id="p1" title="Active Project" />)
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-current')).toBe('page')
  })

  it('does not set aria-current when project is not active', () => {
    useUIStore.setState({ activeProjectId: 'other' })
    render(<ProjectListItem id="p1" title="Inactive Project" />)
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-current')).toBeNull()
  })

  it('applies active styling when project is active', () => {
    useUIStore.setState({ activeProjectId: 'p1', openProjectIds: ['p1'] })
    render(<ProjectListItem id="p1" title="Active Project" />)
    const button = screen.getByRole('button')
    expect(button.className).toContain('border-app-accent')
  })

  it('applies inactive styling when project is not active', () => {
    useUIStore.setState({ activeProjectId: 'other' })
    render(<ProjectListItem id="p1" title="Inactive Project" />)
    const button = screen.getByRole('button')
    expect(button.className).toContain('border-transparent')
  })
})
