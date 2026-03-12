import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getTreeState, setNodeExpanded, bulkSetTreeState } from '../tree-state.api'

const originalFetch = globalThis.fetch

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

function mockFetchResponse(status: number, body?: unknown) {
  vi.mocked(globalThis.fetch).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response)
}

describe('tree-state.api', () => {
  it('getTreeState calls GET /tree-state and returns Record', async () => {
    const state = { 'node-1': true, 'node-2': false }
    mockFetchResponse(200, state)
    const result = await getTreeState()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/tree-state', expect.any(Object))
    expect(result).toEqual(state)
  })

  it('setNodeExpanded calls PUT /tree-state/:nodeId with isExpanded body', async () => {
    mockFetchResponse(204)
    await setNodeExpanded('node-1', true)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/tree-state/node-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ isExpanded: true }),
      })
    )
  })

  it('setNodeExpanded sends false correctly', async () => {
    mockFetchResponse(204)
    await setNodeExpanded('node-1', false)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/tree-state/node-1',
      expect.objectContaining({
        body: JSON.stringify({ isExpanded: false }),
      })
    )
  })

  it('bulkSetTreeState calls PUT /tree-state with states array', async () => {
    mockFetchResponse(204)
    const states = [
      { nodeId: 'node-1', isExpanded: true },
      { nodeId: 'node-2', isExpanded: false },
    ]
    await bulkSetTreeState(states)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/tree-state',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ states }),
      })
    )
  })
})
