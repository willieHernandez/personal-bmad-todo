import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DetailContent } from './detail-content'
import type { NodeResponse } from '@todo-bmad-style/shared'

const mockNodes: Record<string, NodeResponse> = {
  'node-1': {
    id: 'node-1',
    title: 'Test Task',
    type: 'task',
    parentId: 'proj-1',
    sortOrder: 0,
    isCompleted: false,
    markdownBody: 'Hello **world**',
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
  },
  'node-2': {
    id: 'node-2',
    title: 'Completed Effort',
    type: 'effort',
    parentId: 'proj-1',
    sortOrder: 1,
    isCompleted: true,
    markdownBody: '',
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
  },
}

vi.mock('#/queries/node-queries', () => ({
  useNode: (nodeId: string) => ({
    data: mockNodes[nodeId] ?? null,
    isLoading: false,
    error: null,
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

describe('DetailContent', () => {
  it('renders tabpanel with correct role and aria attributes', () => {
    render(<DetailContent nodeId="node-1" />, { wrapper: createWrapper() })
    const panel = screen.getByRole('tabpanel')
    expect(panel.getAttribute('id')).toBe('tabpanel-node-1')
    expect(panel.getAttribute('aria-labelledby')).toBe('tab-node-1')
  })

  it('displays node title and type badge', () => {
    render(<DetailContent nodeId="node-1" />, { wrapper: createWrapper() })
    expect(screen.getByText('Test Task')).toBeDefined()
    expect(screen.getByText('task')).toBeDefined()
  })

  it('displays markdownBody as text', () => {
    render(<DetailContent nodeId="node-1" />, { wrapper: createWrapper() })
    expect(screen.getByText('Hello **world**')).toBeDefined()
  })

  it('shows placeholder when markdownBody is empty', () => {
    render(<DetailContent nodeId="node-2" />, { wrapper: createWrapper() })
    expect(screen.getByText(/No content yet/)).toBeDefined()
  })

  it('shows completed status for completed nodes', () => {
    render(<DetailContent nodeId="node-2" />, { wrapper: createWrapper() })
    expect(screen.getByText('Completed')).toBeDefined()
  })

  it('renders nothing when node is not found', () => {
    const { container } = render(<DetailContent nodeId="unknown" />, {
      wrapper: createWrapper(),
    })
    expect(container.innerHTML).toBe('')
  })
})
