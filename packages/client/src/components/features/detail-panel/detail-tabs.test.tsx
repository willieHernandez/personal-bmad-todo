import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DetailTabs } from './detail-tabs'
import { useDetailPanelStore } from '#/stores/detail-panel-store'
import type { NodeResponse } from '@todo-bmad-style/shared'

function makeNode(id: string, title: string): NodeResponse {
  return {
    id,
    title,
    type: 'task',
    parentId: 'proj-1',
    sortOrder: 0,
    isCompleted: false,
    markdownBody: '',
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
  }
}

const nodeMap: Record<string, NodeResponse> = {
  'node-1': makeNode('node-1', 'First Task'),
  'node-2': makeNode('node-2', 'Second Task'),
  'node-3': makeNode('node-3', 'Third Task'),
}

vi.mock('#/queries/node-queries', () => ({
  useNode: (nodeId: string) => ({
    data: nodeMap[nodeId] ?? makeNode(nodeId, `Node ${nodeId}`),
    isLoading: false,
    error: null,
  }),
  useToggleNodeCompletion: () => ({
    mutate: vi.fn(),
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

describe('DetailTabs', () => {
  beforeEach(() => {
    useDetailPanelStore.setState({
      openTabIds: [],
      activeTabId: null,
      isDetailPanelOpen: false,
    })
  })

  it('renders tablist with correct role', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1'],
      activeTabId: 'node-1',
      isDetailPanelOpen: true,
    })
    render(<DetailTabs />, { wrapper: createWrapper() })
    expect(screen.getByRole('tablist')).toBeDefined()
  })

  it('renders tabs with role="tab"', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1', 'node-2'],
      activeTabId: 'node-1',
      isDetailPanelOpen: true,
    })
    render(<DetailTabs />, { wrapper: createWrapper() })
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
  })

  it('shows node titles in tabs', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1', 'node-2'],
      activeTabId: 'node-1',
      isDetailPanelOpen: true,
    })
    render(<DetailTabs />, { wrapper: createWrapper() })
    expect(screen.getByText('First Task')).toBeDefined()
    expect(screen.getByText('Second Task')).toBeDefined()
  })

  it('marks active tab with aria-selected', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1', 'node-2'],
      activeTabId: 'node-1',
      isDetailPanelOpen: true,
    })
    render(<DetailTabs />, { wrapper: createWrapper() })
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(tabs[1].getAttribute('aria-selected')).toBe('false')
  })

  it('switches active tab on click', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1', 'node-2'],
      activeTabId: 'node-1',
      isDetailPanelOpen: true,
    })
    render(<DetailTabs />, { wrapper: createWrapper() })

    const tabs = screen.getAllByRole('tab')
    fireEvent.click(tabs[1])

    expect(useDetailPanelStore.getState().activeTabId).toBe('node-2')
  })

  it('closes tab via close button', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1', 'node-2'],
      activeTabId: 'node-2',
      isDetailPanelOpen: true,
    })
    render(<DetailTabs />, { wrapper: createWrapper() })

    const closeButtons = screen.getAllByLabelText(/Close .* tab/)
    fireEvent.click(closeButtons[0])

    const state = useDetailPanelStore.getState()
    expect(state.openTabIds).toEqual(['node-2'])
  })

  it('closes tab on middle-click', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1', 'node-2'],
      activeTabId: 'node-2',
      isDetailPanelOpen: true,
    })
    render(<DetailTabs />, { wrapper: createWrapper() })

    const tabs = screen.getAllByRole('tab')
    fireEvent.mouseDown(tabs[0], { button: 1 })

    const state = useDetailPanelStore.getState()
    expect(state.openTabIds).toEqual(['node-2'])
  })

  it('navigates tabs with ArrowRight key', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1', 'node-2', 'node-3'],
      activeTabId: 'node-1',
      isDetailPanelOpen: true,
    })
    render(<DetailTabs />, { wrapper: createWrapper() })

    const tablist = screen.getByRole('tablist')
    fireEvent.keyDown(tablist, { key: 'ArrowRight' })

    expect(useDetailPanelStore.getState().activeTabId).toBe('node-2')
  })

  it('navigates tabs with ArrowLeft key', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1', 'node-2', 'node-3'],
      activeTabId: 'node-2',
      isDetailPanelOpen: true,
    })
    render(<DetailTabs />, { wrapper: createWrapper() })

    const tablist = screen.getByRole('tablist')
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' })

    expect(useDetailPanelStore.getState().activeTabId).toBe('node-1')
  })

  it('wraps around with ArrowRight on last tab', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1', 'node-2'],
      activeTabId: 'node-2',
      isDetailPanelOpen: true,
    })
    render(<DetailTabs />, { wrapper: createWrapper() })

    const tablist = screen.getByRole('tablist')
    fireEvent.keyDown(tablist, { key: 'ArrowRight' })

    expect(useDetailPanelStore.getState().activeTabId).toBe('node-1')
  })

  it('navigates to first tab with Home key', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1', 'node-2', 'node-3'],
      activeTabId: 'node-3',
      isDetailPanelOpen: true,
    })
    render(<DetailTabs />, { wrapper: createWrapper() })

    const tablist = screen.getByRole('tablist')
    fireEvent.keyDown(tablist, { key: 'Home' })

    expect(useDetailPanelStore.getState().activeTabId).toBe('node-1')
  })

  it('navigates to last tab with End key', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1', 'node-2', 'node-3'],
      activeTabId: 'node-1',
      isDetailPanelOpen: true,
    })
    render(<DetailTabs />, { wrapper: createWrapper() })

    const tablist = screen.getByRole('tablist')
    fireEvent.keyDown(tablist, { key: 'End' })

    expect(useDetailPanelStore.getState().activeTabId).toBe('node-3')
  })

  it('sets roving tabindex on active tab only', () => {
    useDetailPanelStore.setState({
      openTabIds: ['node-1', 'node-2'],
      activeTabId: 'node-1',
      isDetailPanelOpen: true,
    })
    render(<DetailTabs />, { wrapper: createWrapper() })

    const tabs = screen.getAllByRole('tab')
    expect(tabs[0].getAttribute('tabindex')).toBe('0')
    expect(tabs[1].getAttribute('tabindex')).toBe('-1')
  })
})
