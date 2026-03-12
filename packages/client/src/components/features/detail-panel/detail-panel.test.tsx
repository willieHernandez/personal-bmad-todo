import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DetailPanel } from './detail-panel'
import { useDetailPanelStore } from '#/stores/detail-panel-store'
import type { NodeResponse } from '@todo-bmad-style/shared'

const mockNode: NodeResponse = {
  id: 'node-1',
  title: 'Test Task',
  type: 'task',
  parentId: 'proj-1',
  sortOrder: 0,
  isCompleted: false,
  markdownBody: 'Some content',
  createdAt: '2026-03-10T00:00:00Z',
  updatedAt: '2026-03-10T00:00:00Z',
}

vi.mock('#/queries/node-queries', () => ({
  useNode: (nodeId: string) => ({
    data: nodeId === 'node-1' ? mockNode : { ...mockNode, id: nodeId, title: `Node ${nodeId}` },
    isLoading: false,
    error: null,
  }),
  useNodeAncestors: () => ({
    data: undefined,
    isLoading: false,
    error: null,
  }),
  useUpdateNode: () => ({
    mutate: vi.fn(),
  }),
  useToggleNodeCompletion: () => ({
    mutate: vi.fn(),
  }),
}))

vi.mock('#/hooks/use-auto-save', () => ({
  useAutoSave: () => ({
    error: null,
    flush: vi.fn(),
  }),
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

describe('DetailPanel', () => {
  beforeEach(() => {
    useDetailPanelStore.setState({
      openTabIds: [],
      activeTabId: null,
      isDetailPanelOpen: false,
    })
  })

  it('renders with complementary role and aria-label', () => {
    render(<DetailPanel />, { wrapper: createWrapper() })
    const panel = screen.getByRole('complementary')
    expect(panel.getAttribute('aria-label')).toBe('Task detail panel')
  })

  it('shows content when panel is open with a tab', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1'],
      activeTabId: 'node-1',
      isDetailPanelOpen: true,
    })
    render(<DetailPanel />, { wrapper: createWrapper() })
    expect(screen.getAllByText('Test Task').length).toBeGreaterThan(0)
  })

  it('does not show content when panel is closed', () => {
    render(<DetailPanel />, { wrapper: createWrapper() })
    expect(screen.queryAllByText('Test Task')).toHaveLength(0)
  })

  it('has a close button that closes the panel', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1'],
      activeTabId: 'node-1',
      isDetailPanelOpen: true,
    })
    render(<DetailPanel />, { wrapper: createWrapper() })

    const closeButton = screen.getByLabelText('Close detail panel')
    fireEvent.click(closeButton)

    const state = useDetailPanelStore.getState()
    expect(state.isDetailPanelOpen).toBe(false)
    expect(state.openTabIds).toEqual([])
  })

  it('closes on Escape key', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1'],
      activeTabId: 'node-1',
      isDetailPanelOpen: true,
    })
    render(<DetailPanel />, { wrapper: createWrapper() })

    const panel = screen.getByRole('complementary')
    fireEvent.keyDown(panel, { key: 'Escape' })

    const state = useDetailPanelStore.getState()
    expect(state.isDetailPanelOpen).toBe(false)
  })

  it('calls onClose callback when closing', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1'],
      activeTabId: 'node-1',
      isDetailPanelOpen: true,
    })
    const onClose = vi.fn()
    render(<DetailPanel onClose={onClose} />, { wrapper: createWrapper() })

    const closeButton = screen.getByLabelText('Close detail panel')
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('respects prefers-reduced-motion via CSS class', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1'],
      activeTabId: 'node-1',
      isDetailPanelOpen: true,
    })
    render(<DetailPanel />, { wrapper: createWrapper() })
    const panel = screen.getByRole('complementary')
    expect(panel.className).toContain('motion-reduce:transition-none')
  })
})
