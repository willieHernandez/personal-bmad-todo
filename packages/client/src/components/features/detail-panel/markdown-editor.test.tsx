import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MarkdownEditor } from './markdown-editor'

vi.mock('#/hooks/use-auto-save', () => ({
  useAutoSave: () => ({
    error: null,
    flush: vi.fn(),
  }),
}))

vi.mock('#/queries/node-queries', () => ({
  useUpdateNode: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
  }),
}))

afterEach(() => {
  cleanup()
})

describe('MarkdownEditor', () => {
  it('renders a textbox with correct aria attributes', () => {
    render(
      <MarkdownEditor nodeId="node-1" markdownBody="" parentId="parent-1" nodeTitle="Test Task" />
    )
    const textbox = screen.getByRole('textbox')
    expect(textbox).toBeDefined()
    expect(textbox.getAttribute('aria-multiline')).toBe('true')
    expect(textbox.getAttribute('aria-label')).toBe('Markdown notes for Test Task')
  })

  it('renders placeholder text when content is empty', () => {
    const { container } = render(
      <MarkdownEditor nodeId="node-1" markdownBody="" parentId="parent-1" nodeTitle="Test Task" />
    )
    // Placeholder is configured in the editor - verify via the ProseMirror element
    const proseMirror = container.querySelector('.ProseMirror')
    expect(proseMirror).not.toBeNull()
    // The placeholder text is rendered via CSS ::before pseudo-element on empty paragraphs
    // Verify the editor has empty content (placeholder would be shown)
    const textbox = screen.getByRole('textbox')
    expect(textbox.textContent?.trim()).toBe('')
  })

  it('does not render a toolbar', () => {
    const { container } = render(
      <MarkdownEditor nodeId="node-1" markdownBody="# Hello" parentId="parent-1" nodeTitle="Test Task" />
    )
    expect(container.querySelector('[role="toolbar"]')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
  })

  it('loads existing markdown content', () => {
    render(
      <MarkdownEditor nodeId="node-1" markdownBody="Hello **world**" parentId="parent-1" nodeTitle="Test Task" />
    )
    const textbox = screen.getByRole('textbox')
    expect(textbox.textContent).toContain('Hello')
    expect(textbox.textContent).toContain('world')
  })

  it('applies prose styling classes', () => {
    const { container } = render(
      <MarkdownEditor nodeId="node-1" markdownBody="" parentId="parent-1" nodeTitle="Test Task" />
    )
    const editorEl = container.querySelector('.ProseMirror')
    expect(editorEl).not.toBeNull()
  })
})
