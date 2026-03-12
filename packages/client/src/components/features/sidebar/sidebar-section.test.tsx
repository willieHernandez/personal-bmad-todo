import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SidebarSection } from './sidebar-section'
import { useSidebarStore } from '#/stores/sidebar-store'

describe('SidebarSection', () => {
  beforeEach(() => {
    useSidebarStore.setState({
      width: 240,
      isCollapsed: false,
      collapsedSections: {},
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders section title', () => {
    render(
      <SidebarSection title="Recent">
        <div>Child content</div>
      </SidebarSection>
    )
    expect(screen.getByText('Recent')).toBeDefined()
  })

  it('renders children when expanded (default)', () => {
    render(
      <SidebarSection title="Recent">
        <div>Child content</div>
      </SidebarSection>
    )
    expect(screen.getByText('Child content')).toBeDefined()
  })

  it('shows aria-expanded=true when open', () => {
    render(
      <SidebarSection title="Recent">
        <div>Content</div>
      </SidebarSection>
    )
    const trigger = screen.getByRole('button')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  it('toggles collapse state on header click', () => {
    render(
      <SidebarSection title="Recent">
        <div>Content</div>
      </SidebarSection>
    )
    const trigger = screen.getByRole('button')
    fireEvent.click(trigger)

    // Section should now be collapsed in store
    expect(useSidebarStore.getState().collapsedSections['Recent']).toBe(true)
  })

  it('starts collapsed when defaultOpen is false', () => {
    render(
      <SidebarSection title="On Hold" defaultOpen={false}>
        <div>Hidden content</div>
      </SidebarSection>
    )
    const trigger = screen.getByRole('button')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('respects collapsedSections store state', () => {
    useSidebarStore.setState({ collapsedSections: { Recent: true } })
    render(
      <SidebarSection title="Recent">
        <div>Content</div>
      </SidebarSection>
    )
    const trigger = screen.getByRole('button')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })
})
