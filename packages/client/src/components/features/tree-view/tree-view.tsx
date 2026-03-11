import { useRef, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Plus } from 'lucide-react'
import { useTreeData } from '#/hooks/use-tree-data'
import { useTreeOperations } from '#/hooks/use-tree-operations'
import { useUIStore } from '#/stores/ui-store'
import { updateNode, deleteNode } from '#/api/nodes.api'
import { useQueryClient } from '@tanstack/react-query'
import { TreeRow } from './tree-row'

interface TreeViewProps {
  projectId: string
}

export function TreeView({ projectId }: TreeViewProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { visibleNodes, toggleExpand, setExpanded } = useTreeData(projectId)
  const { createChild, createSibling, indentNode, outdentNode } = useTreeOperations()

  const focusedNodeId = useUIStore((s) => s.activeNodeId)
  const setFocusedNode = useUIStore((s) => s.setFocusedNode)

  // Editing state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isNewNode, setIsNewNode] = useState(false)

  const clearEditing = useCallback(() => {
    setEditingNodeId(null)
    setEditValue('')
    setIsNewNode(false)
  }, [])

  const handleEditCommit = useCallback(
    async (nodeId: string) => {
      const trimmed = editValue.trim()
      if (!trimmed && isNewNode) {
        // Delete the empty new node
        try {
          await deleteNode(nodeId)
          // Find the node to get its parentId for cache invalidation
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

      // Handle Tab/Shift+Tab for indent/outdent
      if (e.key === 'Tab') {
        e.preventDefault()
        if (!nodeId) return

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
      if (e.key === 'Enter' && !editingNodeId) {
        e.preventDefault()
        if (!nodeId) return

        const flatNode = visibleNodes.find((n) => n.node.id === nodeId)
        if (!flatNode) return

        // Expand the parent so the sibling is visible
        const result = await createSibling(flatNode.node, visibleNodes)
        if (result) {
          setFocusedNode(result.id)
          setEditingNodeId(result.id)
          setEditValue('')
          setIsNewNode(true)
        }
        return
      }
    },
    [
      editingNodeId,
      visibleNodes,
      createSibling,
      indentNode,
      outdentNode,
      setFocusedNode,
      setExpanded,
    ]
  )

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (editingNodeId && editingNodeId !== nodeId) {
        handleEditCommit(editingNodeId)
      }
      setFocusedNode(nodeId)
    },
    [editingNodeId, handleEditCommit, setFocusedNode]
  )

  const virtualizer = useVirtualizer({
    count: visibleNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 10,
  })

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
              onClick={() => handleNodeClick(flatNode.node.id)}
            >
              <TreeRow
                node={flatNode.node}
                depth={flatNode.depth}
                isExpanded={flatNode.isExpanded}
                hasChildren={flatNode.hasChildren}
                isFocused={focusedNodeId === flatNode.node.id}
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
                      // If delete fails, invalidate to sync with server state
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
