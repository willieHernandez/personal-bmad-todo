import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

vi.mock('../api/tree-state.api', () => ({
  getTreeState: vi.fn(),
  setNodeExpanded: vi.fn(),
}))

import { useTreeState, useSetNodeExpanded } from './tree-state-queries'
import { getTreeState, setNodeExpanded } from '../api/tree-state.api'

const mockGetTreeState = vi.mocked(getTreeState)
const mockSetNodeExpanded = vi.mocked(setNodeExpanded)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

describe('useTreeState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches and returns tree state map', async () => {
    const stateMap = { 'node-1': true, 'node-2': false }
    mockGetTreeState.mockResolvedValueOnce(stateMap)

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useTreeState(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(stateMap)
    expect(mockGetTreeState).toHaveBeenCalledOnce()
  })
})

describe('useSetNodeExpanded', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls setNodeExpanded API', async () => {
    mockSetNodeExpanded.mockResolvedValueOnce(undefined)

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSetNodeExpanded(), { wrapper })

    await act(async () => {
      result.current.mutate({ nodeId: 'node-1', isExpanded: true })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockSetNodeExpanded).toHaveBeenCalledWith('node-1', true)
  })

  it('optimistically updates cache before server responds', async () => {
    // Make API call hang so we can check optimistic state
    mockSetNodeExpanded.mockImplementation(() => new Promise(() => {}))

    const { queryClient, wrapper } = createWrapper()
    queryClient.setQueryData(['tree-state'], { 'node-1': false, 'node-2': true })

    const { result } = renderHook(() => useSetNodeExpanded(), { wrapper })

    act(() => {
      result.current.mutate({ nodeId: 'node-1', isExpanded: true })
    })

    // Wait for optimistic update to apply
    await waitFor(() => {
      const cached = queryClient.getQueryData<Record<string, boolean>>(['tree-state'])
      expect(cached?.['node-1']).toBe(true)
    })

    // node-2 should be untouched
    const cached = queryClient.getQueryData<Record<string, boolean>>(['tree-state'])
    expect(cached?.['node-2']).toBe(true)
  })

  it('rolls back cache on server error', async () => {
    mockSetNodeExpanded.mockRejectedValueOnce(new Error('Server error'))

    const { queryClient, wrapper } = createWrapper()
    queryClient.setQueryData(['tree-state'], { 'node-1': false })

    const { result } = renderHook(() => useSetNodeExpanded(), { wrapper })

    await act(async () => {
      result.current.mutate({ nodeId: 'node-1', isExpanded: true })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    const cached = queryClient.getQueryData<Record<string, boolean>>(['tree-state'])
    expect(cached?.['node-1']).toBe(false)
  })
})
