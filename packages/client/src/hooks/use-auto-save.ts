import { useRef, useCallback, useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useUpdateNode } from '#/queries/node-queries'

const DEBOUNCE_MS = 500

function getMarkdownContent(editor: Editor): string {
  const md = (editor as Editor & { getMarkdown?: () => string }).getMarkdown?.()
  if (md === undefined) {
    throw new Error('getMarkdown() not available — is @tiptap/markdown extension registered?')
  }
  return md
}

export function useAutoSave(editor: Editor | null, nodeId: string, parentId: string | null) {
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')
  const retryCountRef = useRef(0)
  const nodeIdRef = useRef(nodeId)
  const parentIdRef = useRef(parentId)
  const { mutate } = useUpdateNode()

  nodeIdRef.current = nodeId
  parentIdRef.current = parentId

  const save = useCallback((content: string) => {
    if (content === lastSavedRef.current) return

    const currentNodeId = nodeIdRef.current
    const currentParentId = parentIdRef.current
    mutate(
      { id: currentNodeId, data: { markdownBody: content }, parentId: currentParentId },
      {
        onSuccess: () => {
          lastSavedRef.current = content
          retryCountRef.current = 0
          setError(null)
        },
        onError: () => {
          if (retryCountRef.current === 0) {
            // Silent retry
            retryCountRef.current = 1
            mutate(
              { id: currentNodeId, data: { markdownBody: content }, parentId: currentParentId },
              {
                onSuccess: () => {
                  lastSavedRef.current = content
                  retryCountRef.current = 0
                  setError(null)
                },
                onError: () => {
                  retryCountRef.current = 2
                  setError('Save failed')
                },
              }
            )
          } else {
            retryCountRef.current = 2
            setError('Save failed')
          }
        },
      }
    )
  }, [mutate])

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (editor && !editor.isDestroyed) {
      const content = getMarkdownContent(editor)
      if (content !== lastSavedRef.current) {
        save(content)
      }
    }
  }, [editor, save])

  // Set up the onUpdate listener for debounced saves
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        if (!editor.isDestroyed) {
          const content = getMarkdownContent(editor)
          save(content)
        }
      }, DEBOUNCE_MS)
    }

    editor.on('update', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [editor, save])

  // Reset state when nodeId changes
  useEffect(() => {
    lastSavedRef.current = ''
    retryCountRef.current = 0
    setError(null)
  }, [nodeId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  return { error, flush }
}
