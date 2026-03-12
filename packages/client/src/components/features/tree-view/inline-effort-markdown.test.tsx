import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { InlineEffortMarkdown } from './inline-effort-markdown'

vi.mock('@tiptap/react', () => ({
  useEditor: () => ({ isDestroyed: false, commands: { setContent: vi.fn() } }),
  EditorContent: ({ editor }: { editor: unknown }) => editor ? <div data-testid="editor-content">rendered markdown</div> : null,
}))

afterEach(() => {
  cleanup()
})

describe('InlineEffortMarkdown', () => {
  const defaultProps = {
    markdownBody: '# Hello\nSome notes',
    depth: 1,
    title: 'My Effort',
  }

  it('renders for effort nodes with non-empty markdownBody', () => {
    render(<InlineEffortMarkdown {...defaultProps} />)
    expect(screen.getByLabelText('Effort notes for My Effort')).toBeDefined()
  })

  it('does NOT render when markdownBody is empty', () => {
    const { container } = render(
      <InlineEffortMarkdown {...defaultProps} markdownBody="" />
    )
    expect(container.innerHTML).toBe('')
  })

  it('does NOT render when markdownBody is whitespace only', () => {
    const { container } = render(
      <InlineEffortMarkdown {...defaultProps} markdownBody="   " />
    )
    expect(container.innerHTML).toBe('')
  })

  it('has aria-label with effort title', () => {
    render(<InlineEffortMarkdown {...defaultProps} />)
    const container = screen.getByLabelText('Effort notes for My Effort')
    expect(container).toBeDefined()
  })

  it('is NOT focusable (tabIndex=-1)', () => {
    render(<InlineEffortMarkdown {...defaultProps} />)
    const container = screen.getByLabelText('Effort notes for My Effort')
    expect(container.getAttribute('tabindex')).toBe('-1')
  })

  it('is collapsed by default', () => {
    render(<InlineEffortMarkdown {...defaultProps} />)
    expect(screen.getByText('▸ Show notes')).toBeDefined()
    expect(screen.queryByTestId('editor-content')).toBeNull()
  })

  it('expands when toggle is clicked', () => {
    render(<InlineEffortMarkdown {...defaultProps} />)
    fireEvent.click(screen.getByText('▸ Show notes'))
    expect(screen.getByText('▾ Hide notes')).toBeDefined()
    expect(screen.getByTestId('editor-content')).toBeDefined()
  })

  it('collapses when toggle is clicked again', () => {
    render(<InlineEffortMarkdown {...defaultProps} />)
    fireEvent.click(screen.getByText('▸ Show notes'))
    fireEvent.click(screen.getByText('▾ Hide notes'))
    expect(screen.getByText('▸ Show notes')).toBeDefined()
    expect(screen.queryByTestId('editor-content')).toBeNull()
  })

  it('does not have treeitem role', () => {
    render(<InlineEffortMarkdown {...defaultProps} />)
    expect(screen.queryByRole('treeitem')).toBeNull()
  })
})
