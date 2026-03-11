import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { TreeRow } from './tree-row'
import type { NodeResponse } from '@todo-bmad-style/shared'

function makeNode(overrides: Partial<NodeResponse> = {}): NodeResponse {
  return {
    id: 'n1',
    title: 'Test Node',
    type: 'effort',
    parentId: 'proj-1',
    sortOrder: 0,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

const defaultProps = {
  onToggleExpand: vi.fn(),
  onEditChange: vi.fn(),
  onEditCommit: vi.fn(),
  onEditCancel: vi.fn(),
}

describe('TreeRow', () => {
  it('renders node title', () => {
    render(
      <TreeRow
        node={makeNode({ title: 'My Effort' })}
        depth={0}
        isExpanded={false}
        hasChildren={true}
        isFocused={false}
        isEditing={false}
        editValue=""
        {...defaultProps}
      />
    )
    expect(screen.getByText('My Effort')).toBeDefined()
  })

  it('renders with correct depth indentation', () => {
    const { container } = render(
      <TreeRow
        node={makeNode()}
        depth={2}
        isExpanded={false}
        hasChildren={false}
        isFocused={false}
        isEditing={false}
        editValue=""
        {...defaultProps}
      />
    )
    const row = container.querySelector('[role="treeitem"]')
    expect(row?.getAttribute('style')).toContain('padding-left: 32px')
  })

  it('hides chevron for subtask nodes with no children', () => {
    const { container } = render(
      <TreeRow
        node={makeNode({ type: 'subtask' })}
        depth={0}
        isExpanded={false}
        hasChildren={false}
        isFocused={false}
        isEditing={false}
        editValue=""
        {...defaultProps}
      />
    )
    const chevronBtn = container.querySelector('button')
    expect(chevronBtn?.className).toContain('invisible')
  })

  it('shows dash icon for expandable nodes with no children', () => {
    render(
      <TreeRow
        node={makeNode({ type: 'effort' })}
        depth={0}
        isExpanded={false}
        hasChildren={false}
        isFocused={false}
        isEditing={false}
        editValue=""
        {...defaultProps}
      />
    )
    const dash = screen.getByTestId('empty-node-dash')
    expect(dash).toBeDefined()
  })

  it('shows chevron when node has children', () => {
    const { container } = render(
      <TreeRow
        node={makeNode()}
        depth={0}
        isExpanded={false}
        hasChildren={true}
        isFocused={false}
        isEditing={false}
        editValue=""
        {...defaultProps}
      />
    )
    const chevronBtn = container.querySelector('button')
    expect(chevronBtn?.className).not.toContain('invisible')
  })

  it('sets correct ARIA attributes', () => {
    const { container } = render(
      <TreeRow
        node={makeNode()}
        depth={1}
        isExpanded={true}
        hasChildren={true}
        isFocused={true}
        isEditing={false}
        editValue=""
        {...defaultProps}
      />
    )
    const row = container.querySelector('[role="treeitem"]')
    expect(row?.getAttribute('aria-expanded')).toBe('true')
    expect(row?.getAttribute('aria-level')).toBe('2')
    expect(row?.getAttribute('aria-selected')).toBe('true')
    expect(row?.getAttribute('tabindex')).toBe('0')
  })

  it('does not set aria-expanded when no children', () => {
    const { container } = render(
      <TreeRow
        node={makeNode()}
        depth={0}
        isExpanded={false}
        hasChildren={false}
        isFocused={false}
        isEditing={false}
        editValue=""
        {...defaultProps}
      />
    )
    const row = container.querySelector('[role="treeitem"]')
    expect(row?.hasAttribute('aria-expanded')).toBe(false)
  })

  it('renders input in edit mode', () => {
    render(
      <TreeRow
        node={makeNode()}
        depth={0}
        isExpanded={false}
        hasChildren={false}
        isFocused={true}
        isEditing={true}
        editValue="New title"
        {...defaultProps}
      />
    )
    const input = screen.getByTestId('tree-row-input') as HTMLInputElement
    expect(input.value).toBe('New title')
  })

  it('calls onEditCommit on Enter in edit mode', () => {
    const onEditCommit = vi.fn()
    render(
      <TreeRow
        node={makeNode()}
        depth={0}
        isExpanded={false}
        hasChildren={false}
        isFocused={true}
        isEditing={true}
        editValue="Test"
        {...defaultProps}
        onEditCommit={onEditCommit}
      />
    )
    const input = screen.getByTestId('tree-row-input')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onEditCommit).toHaveBeenCalled()
  })

  it('calls onEditCancel on Escape in edit mode', () => {
    const onEditCancel = vi.fn()
    render(
      <TreeRow
        node={makeNode()}
        depth={0}
        isExpanded={false}
        hasChildren={false}
        isFocused={true}
        isEditing={true}
        editValue="Test"
        {...defaultProps}
        onEditCancel={onEditCancel}
      />
    )
    const input = screen.getByTestId('tree-row-input')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onEditCancel).toHaveBeenCalled()
  })

  it('calls onToggleExpand when chevron is clicked', () => {
    const onToggleExpand = vi.fn()
    const { container } = render(
      <TreeRow
        node={makeNode({ id: 'e1' })}
        depth={0}
        isExpanded={false}
        hasChildren={true}
        isFocused={false}
        isEditing={false}
        editValue=""
        {...defaultProps}
        onToggleExpand={onToggleExpand}
      />
    )
    const chevronBtn = container.querySelector('button')!
    fireEvent.click(chevronBtn)
    expect(onToggleExpand).toHaveBeenCalledWith('e1')
  })

  it('sets tabIndex -1 when not focused', () => {
    const { container } = render(
      <TreeRow
        node={makeNode()}
        depth={0}
        isExpanded={false}
        hasChildren={false}
        isFocused={false}
        isEditing={false}
        editValue=""
        {...defaultProps}
      />
    )
    const row = container.querySelector('[role="treeitem"]')
    expect(row?.getAttribute('tabindex')).toBe('-1')
  })
})
