import { useRef, useState, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Plus } from 'lucide-react'
import { useTreeData } from '#/hooks/use-tree-data'
import { useTreeOperations } from '#/hooks/use-tree-operations'
import { useTreeNavigation } from '#/hooks/use-tree-navigation'
import { useUIStore } from '#/stores/ui-store'
import { updateNode, deleteNode } from '#/api/nodes.api'
import { useQueryClient } from '@tanstack/react-query'
import { TreeRow } from './tree-row'

interface TreeViewProps {
  projectId: string
}

export function TreeView({ projectId }: TreeViewProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const pendingFocusNodeId = useRef<string | null>(null)
  const queryClient = useQueryClient()

  const { visibleNodes, expandedMap, toggleExpand, setExpanded } = useTreeData(projectId)
  const { createChild, createSibling, indentNode, outdentNode } = useTreeOperations()

  const setFocusedNode = useUIStore((s) => s.setFocusedNode)

  // Editing state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isNewNode, setIsNewNode] = useState(false)

  // Keyboard navigation
  const { focusedIndex, setFocusedIndex, handleKeyDown: navHandleKeyDown } = useTreeNavigation({
    visibleNodes,
    expandedMap,
    setExpanded,
  })

  // Resolve pending focus after visibleNodes updates (e.g., after indent/outdent)
  useEffect(() => {
    if (pendingFocusNodeId.current) {
      const newIndex = visibleNodes.findIndex((n) => n.node.id === pendingFocusNodeId.current)
      if (newIndex >= 0) {
        setFocusedIndex(newIndex)
        pendingFocusNodeId.current = null
      }
    }
  }, [visibleNodes, setFocusedIndex])

  // Sync focusedIndex → activeNodeId in Zustand store
  useEffect(() => {
    const node = visibleNodes[focusedIndex]
    if (node) {
      setFocusedNode(node.node.id)
    }
  }, [focusedIndex, visibleNodes, setFocusedNode])

  // Scroll focused row into view
  const virtualizer = useVirtualizer({
    count: visibleNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 10,
  })

  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < visibleNodes.length && virtualizer.scrollToIndex) {
      virtualizer.scrollToIndex(focusedIndex, { align: 'auto' })
    }
  }, [focusedIndex, visibleNodes.length, virtualizer])

  // Focus the DOM element when focusedIndex changes
  useEffect(() => {
    const el = rowRefs.current.get(focusedIndex)
    if (el && !editingNodeId) {
      el.focus()
    }
  }, [focusedIndex, editingNodeId])

  const clearEditing = useCallback(() => {
    setEditingNodeId(null)
    setEditValue('')
    setIsNewNode(false)
  }, [])

  const handleEditCommit = useCallback(
    async (nodeId: string) => {
      const trimmed = editValue.trim()
      if (!trimmed && isNewNode) {
        try {
          await deleteNode(nodeId)
          const flatNode = visibleNodes.find((n) => n.node.id === nodeId)
          if (flatNode?.node.parentId) {
            queryClient.invalidateQueries({
              queryKey: ['nodes', flatNode.node.parentId, 'children'],
            })
          }
        } catch {
          // ignore deletion errors
        }
        clearEditing()
        return
      }

      if (trimmed) {
        try {
          await updateNode(nodeId, { title: trimmed })
          const flatNode = visibleNodes.find((n) => n.node.id === nodeId)
          if (flatNode?.node.parentId) {
            queryClient.invalidateQueries({
              queryKey: ['nodes', flatNode.node.parentId, 'children'],
            })
          }
        } catch {
          // revert on error
        }
      }
      clearEditing()
    },
    [editValue, isNewNode, visibleNodes, queryClient, clearEditing]
  )

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement
      const nodeId = target.getAttribute('data-node-id')

      // When in edit mode, don't handle navigation keys
      if (editingNodeId) return

      // Handle Tab/Shift+Tab for indent/outdent
      if (e.key === 'Tab') {
        e.preventDefault()
        if (!nodeId) return

        // Schedule focus restoration for after the tree re-renders
        pendingFocusNodeId.current = nodeId

        if (e.shiftKey) {
          await outdentNode(nodeId, visibleNodes)
        } else {
          const newParentId = await indentNode(nodeId, visibleNodes)
          if (newParentId) {
            setExpanded(newParentId, true)
          }
        }
        return
      }

      // Handle Enter for creating siblings
      if (e.key === 'Enter') {
        e.preventDefault()
        if (!nodeId) return

        const flatNode = visibleNodes.find((n) => n.node.id === nodeId)
        if (!flatNode) return

        const result = await createSibling(flatNode.node, visibleNodes)
        if (result) {
          setFocusedNode(result.id)
          setEditingNodeId(result.id)
          setEditValue('')
          setIsNewNode(true)
        }
        return
      }

      // Delegate arrow/home/end keys to navigation hook
      navHandleKeyDown(e)
    },
    [
      editingNodeId,
      visibleNodes,
      createSibling,
      indentNode,
      outdentNode,
      setFocusedNode,
      setExpanded,
      navHandleKeyDown,
    ]
  )

  const handleNodeClick = useCallback(
    (nodeId: string, index: number) => {
      if (editingNodeId && editingNodeId !== nodeId) {
        handleEditCommit(editingNodeId)
      }
      setFocusedIndex(index)
      setFocusedNode(nodeId)
    },
    [editingNodeId, handleEditCommit, setFocusedNode, setFocusedIndex]
  )

  const handleCreateFirstEffort = useCallback(async () => {
    const result = await createChild(projectId, 'effort')
    if (result) {
      setFocusedNode(result.id)
      setEditingNodeId(result.id)
      setEditValue('')
      setIsNewNode(true)
    }
  }, [projectId, createChild, setFocusedNode])

  return (
    <div
      ref={parentRef}
      role="tree"
      aria-label="Project tree"
      className="h-full overflow-auto"
      onKeyDown={handleKeyDown}
    >
      {visibleNodes.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="text-sm text-app-text-secondary">
            No efforts yet. Create your first one to get started.
          </p>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text-primary transition-colors hover:bg-app-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
            onClick={handleCreateFirstEffort}
          >
            <Plus className="h-3.5 w-3.5" />
            Add effort
          </button>
        </div>
      )}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const flatNode = visibleNodes[virtualRow.index]
          return (
            <div
              key={flatNode.node.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size}px`,
                width: '100%',
              }}
              onClick={() => handleNodeClick(flatNode.node.id, virtualRow.index)}
            >
              <TreeRow
                ref={(el) => {
                  if (el) {
                    rowRefs.current.set(virtualRow.index, el)
                  } else {
                    rowRefs.current.delete(virtualRow.index)
                  }
                }}
                node={flatNode.node}
                depth={flatNode.depth}
                isExpanded={flatNode.isExpanded}
                hasChildren={flatNode.hasChildren}
                isFocused={focusedIndex === virtualRow.index}
                isEditing={editingNodeId === flatNode.node.id}
                editValue={editingNodeId === flatNode.node.id ? editValue : ''}
                onToggleExpand={toggleExpand}
                onEditChange={setEditValue}
                onEditCommit={() =>
                  editingNodeId && handleEditCommit(editingNodeId)
                }
                onEditCancel={async () => {
                  if (isNewNode && editingNodeId) {
                    try {
                      await deleteNode(editingNodeId)
                      const flatN = visibleNodes.find(
                        (n) => n.node.id === editingNodeId
                      )
                      if (flatN?.node.parentId) {
                        queryClient.invalidateQueries({
                          queryKey: [
                            'nodes',
                            flatN.node.parentId,
                            'children',
                          ],
                        })
                      }
                    } catch {
                      queryClient.invalidateQueries({
                        queryKey: ['nodes'],
                      })
                    }
                  }
                  clearEditing()
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
