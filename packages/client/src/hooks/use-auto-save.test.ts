import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoSave } from './use-auto-save'
import type { Editor } from '@tiptap/react'

const mockMutate = vi.fn()

vi.mock('#/queries/node-queries', () => ({
  useUpdateNode: () => ({
    mutate: mockMutate,
  }),
}))

function createMockEditor(markdown = 'test content'): Editor {
  return {
    isDestroyed: false,
    getMarkdown: () => markdown,
    storage: {},
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as Editor
}

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockMutate.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls mutation after 500ms debounce following content change', () => {
    const editor = createMockEditor()
    renderHook(() => useAutoSave(editor, 'node-1', 'parent-1'))

    // Get the update handler that was registered
    const onCall = (editor.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === 'update'
    )
    expect(onCall).toBeDefined()
    const handleUpdate = onCall![1]

    // Trigger an update
    act(() => {
      handleUpdate()
    })

    // Before 500ms, no mutation should be called
    expect(mockMutate).not.toHaveBeenCalled()

    // After 500ms, mutation should fire
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockMutate).toHaveBeenCalledWith(
      { id: 'node-1', data: { markdownBody: 'test content' }, parentId: 'parent-1' },
      expect.any(Object)
    )
  })

  it('resets debounce timer on rapid successive updates', () => {
    const editor = createMockEditor()
    renderHook(() => useAutoSave(editor, 'node-1', 'parent-1'))

    const onCall = (editor.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === 'update'
    )
    const handleUpdate = onCall![1]

    // Trigger multiple rapid updates
    act(() => {
      handleUpdate()
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    act(() => {
      handleUpdate()
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Should not have fired yet (only 300ms since last update)
    expect(mockMutate).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Now 500ms since last update — should fire
    expect(mockMutate).toHaveBeenCalledTimes(1)
  })

  it('does NOT call mutation if content has not changed from last saved value', () => {
    const editor = createMockEditor('saved content')
    renderHook(() => useAutoSave(editor, 'node-1', 'parent-1'))

    const onCall = (editor.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === 'update'
    )
    const handleUpdate = onCall![1]

    // First save
    act(() => {
      handleUpdate()
      vi.advanceTimersByTime(500)
    })

    expect(mockMutate).toHaveBeenCalledTimes(1)

    // Simulate successful save callback
    const firstCallOptions = mockMutate.mock.calls[0][1]
    act(() => {
      firstCallOptions.onSuccess()
    })

    // Trigger another update with same content
    act(() => {
      handleUpdate()
      vi.advanceTimersByTime(500)
    })

    // Should not call again since content hasn't changed
    expect(mockMutate).toHaveBeenCalledTimes(1)
  })

  it('cancels pending timer on unmount', () => {
    const editor = createMockEditor()
    const { unmount } = renderHook(() => useAutoSave(editor, 'node-1', 'parent-1'))

    const onCall = (editor.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === 'update'
    )
    const handleUpdate = onCall![1]

    act(() => {
      handleUpdate()
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should NOT have called mutation after unmount
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('flushes pending save on explicit flush call', () => {
    const editor = createMockEditor('flush content')
    const { result } = renderHook(() => useAutoSave(editor, 'node-1', 'parent-1'))

    act(() => {
      result.current.flush()
    })

    expect(mockMutate).toHaveBeenCalledWith(
      { id: 'node-1', data: { markdownBody: 'flush content' }, parentId: 'parent-1' },
      expect.any(Object)
    )
  })

  it('retries silently on first failure', () => {
    const editor = createMockEditor()
    renderHook(() => useAutoSave(editor, 'node-1', 'parent-1'))

    const onCall = (editor.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === 'update'
    )
    const handleUpdate = onCall![1]

    act(() => {
      handleUpdate()
      vi.advanceTimersByTime(500)
    })

    // Simulate first failure — triggers retry
    const firstCallOptions = mockMutate.mock.calls[0][1]
    act(() => {
      firstCallOptions.onError()
    })

    // Should have retried (2 total calls)
    expect(mockMutate).toHaveBeenCalledTimes(2)
  })

  it('sets error state on second consecutive failure', () => {
    const editor = createMockEditor()
    const { result } = renderHook(() => useAutoSave(editor, 'node-1', 'parent-1'))

    const onCall = (editor.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === 'update'
    )
    const handleUpdate = onCall![1]

    act(() => {
      handleUpdate()
      vi.advanceTimersByTime(500)
    })

    // First failure triggers retry
    const firstCallOptions = mockMutate.mock.calls[0][1]
    act(() => {
      firstCallOptions.onError()
    })

    // Second failure sets error
    const retryOptions = mockMutate.mock.calls[1][1]
    act(() => {
      retryOptions.onError()
    })

    expect(result.current.error).toBe('Save failed')
  })

  it('clears error state on next successful save', () => {
    const editor = createMockEditor()
    const { result } = renderHook(() => useAutoSave(editor, 'node-1', 'parent-1'))

    const onCall = (editor.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === 'update'
    )
    const handleUpdate = onCall![1]

    // Trigger and fail twice to set error
    act(() => {
      handleUpdate()
      vi.advanceTimersByTime(500)
    })
    const firstCallOptions = mockMutate.mock.calls[0][1]
    act(() => {
      firstCallOptions.onError()
    })
    const retryOptions = mockMutate.mock.calls[1][1]
    act(() => {
      retryOptions.onError()
    })

    expect(result.current.error).toBe('Save failed')

    // Now trigger a new update with different content
    ;(editor as Editor & { getMarkdown: () => string }).getMarkdown = vi.fn(() => 'new content')
    act(() => {
      handleUpdate()
      vi.advanceTimersByTime(500)
    })

    // Simulate success on third call
    const thirdCallOptions = mockMutate.mock.calls[2][1]
    act(() => {
      thirdCallOptions.onSuccess()
    })

    expect(result.current.error).toBeNull()
  })
})
