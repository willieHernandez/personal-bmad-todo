import { useState, useCallback } from 'react'
import type { FlatTreeNode } from './use-tree-data'

interface UseTreeNavigationOptions {
  visibleNodes: FlatTreeNode[]
  expandedMap: Record<string, boolean>
  setExpanded: (nodeId: string, expanded: boolean) => void
}

interface UseTreeNavigationResult {
  focusedIndex: number
  setFocusedIndex: (index: number) => void
  handleKeyDown: (event: React.KeyboardEvent) => void
}

export function useTreeNavigation({
  visibleNodes,
  expandedMap,
  setExpanded,
}: UseTreeNavigationOptions): UseTreeNavigationResult {
  const [focusedIndex, setFocusedIndex] = useState<number>(0)

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const { key } = event
      const nodeCount = visibleNodes.length
      if (nodeCount === 0) return

      switch (key) {
        case 'ArrowDown': {
          event.preventDefault()
          setFocusedIndex((prev) => Math.min(prev + 1, nodeCount - 1))
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          setFocusedIndex((prev) => Math.max(prev - 1, 0))
          break
        }
        case 'ArrowRight': {
          event.preventDefault()
          setFocusedIndex((prev) => {
            const current = visibleNodes[prev]
            if (!current) return prev

            if (current.hasChildren && !expandedMap[current.node.id]) {
              // Collapsed node with children → expand it (side effect)
              setExpanded(current.node.id, true)
              return prev
            } else if (current.hasChildren && expandedMap[current.node.id]) {
              // Expanded node → move to first child
              if (prev + 1 < nodeCount) {
                const next = visibleNodes[prev + 1]
                if (next && next.depth === current.depth + 1) {
                  return prev + 1
                }
              }
            }
            return prev
          })
          break
        }
        case 'ArrowLeft': {
          event.preventDefault()
          setFocusedIndex((prev) => {
            const current = visibleNodes[prev]
            if (!current) return prev

            if (current.hasChildren && expandedMap[current.node.id]) {
              // Expanded node → collapse it (side effect)
              setExpanded(current.node.id, false)
              return prev
            } else {
              // Collapsed or leaf → move to parent
              const parentIndex = findParentIndex(visibleNodes, prev)
              return parentIndex >= 0 ? parentIndex : prev
            }
          })
          break
        }
        case 'Home': {
          event.preventDefault()
          setFocusedIndex(0)
          break
        }
        case 'End': {
          event.preventDefault()
          setFocusedIndex(nodeCount - 1)
          break
        }
        default:
          return // Don't prevent default for unhandled keys
      }
    },
    [visibleNodes, expandedMap, setExpanded]
  )

  return { focusedIndex, setFocusedIndex, handleKeyDown }
}

function findParentIndex(
  visibleNodes: FlatTreeNode[],
  currentIndex: number
): number {
  const current = visibleNodes[currentIndex]
  if (!current || current.depth === 0) return -1

  const parentDepth = current.depth - 1
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (visibleNodes[i].depth === parentDepth) {
      return i
    }
  }
  return -1
}
