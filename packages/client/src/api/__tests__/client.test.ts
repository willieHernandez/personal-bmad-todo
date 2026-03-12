import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '../client'

const originalFetch = globalThis.fetch

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

function mockFetchResponse(status: number, body?: unknown) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  }
  vi.mocked(globalThis.fetch).mockResolvedValue(response as unknown as Response)
  return response
}

describe('apiClient', () => {
  it('prepends /api prefix to all paths', async () => {
    mockFetchResponse(200, { data: 'test' })
    await apiClient('/nodes')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/nodes',
      expect.any(Object)
    )
  })

  it('sets Content-Type application/json when body is provided', async () => {
    mockFetchResponse(200, {})
    await apiClient('/nodes', { method: 'POST', body: JSON.stringify({ title: 'Test' }) })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/nodes',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  it('does not set Content-Type when no body is provided', async () => {
    mockFetchResponse(200, [])
    await apiClient('/nodes')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/nodes',
      expect.objectContaining({
        headers: {},
      })
    )
  })

  it('returns parsed JSON for successful responses', async () => {
    mockFetchResponse(200, { id: '1', title: 'Test' })
    const result = await apiClient('/nodes/1')
    expect(result).toEqual({ id: '1', title: 'Test' })
  })

  it('returns undefined for 204 No Content responses', async () => {
    mockFetchResponse(204)
    const result = await apiClient('/nodes/1', { method: 'DELETE' })
    expect(result).toBeUndefined()
  })

  it('throws Error for non-ok responses', async () => {
    mockFetchResponse(404, { message: 'Not found' })
    await expect(apiClient('/nodes/bad-id')).rejects.toThrow('API error: 404')
  })

  it('throws Error for 500 server errors', async () => {
    mockFetchResponse(500, { message: 'Internal error' })
    await expect(apiClient('/nodes')).rejects.toThrow('API error: 500')
  })

  it('passes through HTTP method from options', async () => {
    mockFetchResponse(200, {})
    await apiClient('/nodes/1', { method: 'PATCH', body: JSON.stringify({ title: 'Updated' }) })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/nodes/1',
      expect.objectContaining({ method: 'PATCH' })
    )
  })
})
