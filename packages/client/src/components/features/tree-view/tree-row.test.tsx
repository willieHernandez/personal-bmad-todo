import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
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
  onToggleComplete: vi.fn(),
  onEditChange: vi.fn(),
  onEditCommit: vi.fn(),
  onEditCancel: vi.fn(),
}

function renderWithDnd(ui: React.ReactElement) {
  return render(<DndContext>{ui}</DndContext>)
}

function getChevronButton(container: HTMLElement): HTMLButtonElement {
  // The chevron/expand button is the second button (after drag handle)
  const buttons = container.querySelectorAll('button')
  return buttons[1] as HTMLButtonElement
}

describe('TreeRow', () => {
  it('renders node title', () => {
    renderWithDnd(
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
    const { container } = renderWithDnd(
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
    const { container } = renderWithDnd(
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
    const chevronBtn = getChevronButton(container)
    expect(chevronBtn?.className).toContain('invisible')
  })

  it('shows dash icon for expandable nodes with no children', () => {
    renderWithDnd(
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
    const { container } = renderWithDnd(
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
    const chevronBtn = getChevronButton(container)
    expect(chevronBtn?.className).not.toContain('invisible')
  })

  it('sets correct ARIA attributes', () => {
    const { container } = renderWithDnd(
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
    const { container } = renderWithDnd(
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
    renderWithDnd(
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
    renderWithDnd(
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
    renderWithDnd(
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
    const { container } = renderWithDnd(
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
    const chevronBtn = getChevronButton(container)
    fireEvent.click(chevronBtn)
    expect(onToggleExpand).toHaveBeenCalledWith('e1')
  })

  it('sets tabIndex -1 when not focused', () => {
    const { container } = renderWithDnd(
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

  it('renders drag handle', () => {
    renderWithDnd(
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
    const dragHandle = screen.getByTestId('tree-row-drag-handle')
    expect(dragHandle).toBeDefined()
    expect(dragHandle.getAttribute('aria-label')).toBe('Drag to reorder')
  })

  it('applies isDragging styles when being dragged', () => {
    const { container } = renderWithDnd(
      <TreeRow
        node={makeNode()}
        depth={0}
        isExpanded={false}
        hasChildren={false}
        isFocused={false}
        isEditing={false}
        editValue=""
        isDragging={true}
        {...defaultProps}
      />
    )
    const row = container.querySelector('[role="treeitem"]')
    expect(row?.className).toContain('opacity-40')
  })

  it('applies drop target styles when isDropTarget', () => {
    const { container } = renderWithDnd(
      <TreeRow
        node={makeNode()}
        depth={0}
        isExpanded={false}
        hasChildren={false}
        isFocused={false}
        isEditing={false}
        editValue=""
        isDropTarget={true}
        {...defaultProps}
      />
    )
    const row = container.querySelector('[role="treeitem"]')
    expect(row?.className).toContain('bg-[#EFF6FF]')
  })

  it('renders checkbox for each tree item', () => {
    renderWithDnd(
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
    const checkbox = screen.getByTestId('tree-row-checkbox') as HTMLInputElement
    expect(checkbox).toBeDefined()
    expect(checkbox.type).toBe('checkbox')
  })

  it('checkbox reflects isCompleted state', () => {
    renderWithDnd(
      <TreeRow
        node={makeNode({ isCompleted: true })}
        depth={0}
        isExpanded={false}
        hasChildren={false}
        isFocused={false}
        isEditing={false}
        editValue=""
        {...defaultProps}
      />
    )
    const checkbox = screen.getByTestId('tree-row-checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('calls onToggleComplete when checkbox is clicked', () => {
    const onToggleComplete = vi.fn()
    renderWithDnd(
      <TreeRow
        node={makeNode({ id: 'node-1' })}
        depth={0}
        isExpanded={false}
        hasChildren={false}
        isFocused={false}
        isEditing={false}
        editValue=""
        {...defaultProps}
        onToggleComplete={onToggleComplete}
      />
    )
    const checkbox = screen.getByTestId('tree-row-checkbox')
    fireEvent.click(checkbox)
    expect(onToggleComplete).toHaveBeenCalledWith('node-1')
  })

  it('checkbox click does NOT trigger node selection', () => {
    const handleClick = vi.fn()
    const { container } = renderWithDnd(
      <div onClick={handleClick}>
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
      </div>
    )
    const checkbox = container.querySelector('[data-testid="tree-row-checkbox"]')!
    fireEvent.click(checkbox)
    // The click should be stopped by stopPropagation
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('shows strikethrough class when node is completed', () => {
    renderWithDnd(
      <TreeRow
        node={makeNode({ isCompleted: true, title: 'Done Task' })}
        depth={0}
        isExpanded={false}
        hasChildren={false}
        isFocused={false}
        isEditing={false}
        editValue=""
        {...defaultProps}
      />
    )
    const titleSpan = screen.getByText('Done Task')
    expect(titleSpan.className).toContain('line-through')
    expect(titleSpan.className).toContain('text-app-text-secondary')
  })

  it('sets correct aria-label on checkbox based on completion state', () => {
    renderWithDnd(
      <TreeRow
        node={makeNode({ title: 'My Task', isCompleted: false })}
        depth={0}
        isExpanded={false}
        hasChildren={false}
        isFocused={false}
        isEditing={false}
        editValue=""
        {...defaultProps}
      />
    )
    const checkbox = screen.getByTestId('tree-row-checkbox')
    expect(checkbox.getAttribute('aria-label')).toBe('Mark My Task as complete')
  })
})
