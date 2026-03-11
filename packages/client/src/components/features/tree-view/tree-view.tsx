import { useRef, useState, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Plus } from 'lucide-react'
import { useTreeData } from '#/hooks/use-tree-data'
import { useTreeOperations } from '#/hooks/use-tree-operations'
import { useTreeNavigation } from '#/hooks/use-tree-navigation'
import { useUIStore } from '#/stores/ui-store'
import { useUpdateNode, useDeleteNode } from '#/queries/node-queries'
import { TreeRow } from './tree-row'
import type { FlatTreeNode } from '#/hooks/use-tree-data'

export function getDeleteFocusTarget(
  visibleNodes: FlatTreeNode[],
  deletedNodeId: string
): string | null {
  const idx = visibleNodes.findIndex((n) => n.node.id === deletedNodeId)
  if (idx < 0) return null

  const node = visibleNodes[idx]
  const parentId = node.node.parentId

  // 1. Next sibling (same parent)
  for (let i = idx + 1; i < visibleNodes.length; i++) {
    if (visibleNodes[i].node.parentId === parentId) return visibleNodes[i].node.id
    if (visibleNodes[i].depth <= node.depth) break
  }

  // 2. Previous sibling (same parent)
  for (let i = idx - 1; i >= 0; i--) {
    if (visibleNodes[i].node.parentId === parentId) return visibleNodes[i].node.id
    if (visibleNodes[i].depth < node.depth) break
  }

  // 3. Parent
  if (parentId) {
    const parentNode = visibleNodes.find((n) => n.node.id === parentId)
    if (parentNode) return parentNode.node.id
  }

  return null
}

interface TreeViewProps {
  projectId: string
}

export function TreeView({ projectId }: TreeViewProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const pendingFocusNodeId = useRef<string | null>(null)

  const { visibleNodes, expandedMap, toggleExpand, setExpanded } = useTreeData(projectId)
  const { createChild, createSibling, indentNode, outdentNode } = useTreeOperations()
  const updateNodeMutation = useUpdateNode()
  const deleteNodeMutation = useDeleteNode()

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
    (nodeId: string) => {
      const trimmed = editValue.trim()
      const flatNode = visibleNodes.find((n) => n.node.id === nodeId)

      if (!trimmed && isNewNode) {
        // Empty name on new node creation — delete the placeholder via mutation
        if (flatNode) {
          deleteNodeMutation.mutate({
            id: nodeId,
            parentId: flatNode.node.parentId,
          })
        }
        clearEditing()
        return
      }

      if (!trimmed && !isNewNode) {
        // Empty name on rename — cancel (restore original title)
        clearEditing()
        return
      }

      if (flatNode && trimmed !== flatNode.node.title) {
        // Both rename and new node creation use the optimistic update mutation
        updateNodeMutation.mutate({
          id: nodeId,
          data: { title: trimmed },
          parentId: flatNode.node.parentId,
        })
      }
      clearEditing()
    },
    [editValue, isNewNode, visibleNodes, clearEditing, updateNodeMutation, deleteNodeMutation]
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

      // Handle Ctrl+Enter for creating siblings (previously just Enter)
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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

      // Handle Enter for rename mode on existing nodes
      if (e.key === 'Enter') {
        e.preventDefault()
        if (!nodeId) return

        const flatNode = visibleNodes.find((n) => n.node.id === nodeId)
        if (!flatNode) return

        // Enter on existing node = rename mode
        setEditingNodeId(nodeId)
        setEditValue(flatNode.node.title)
        setIsNewNode(false)
        return
      }

      // Handle Delete/Backspace for node deletion (not during edit mode)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        if (!nodeId) return

        const flatNode = visibleNodes.find((n) => n.node.id === nodeId)
        if (!flatNode) return

        // Compute focus target before deletion
        const focusTargetId = getDeleteFocusTarget(visibleNodes, nodeId)

        // Set pending focus for after re-render
        if (focusTargetId) {
          pendingFocusNodeId.current = focusTargetId
        }

        // Optimistic delete
        deleteNodeMutation.mutate({
          id: nodeId,
          parentId: flatNode.node.parentId,
        })
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
      deleteNodeMutation,
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

  const handleNodeDoubleClick = useCallback(
    (nodeId: string) => {
      if (editingNodeId) return
      const flatNode = visibleNodes.find((n) => n.node.id === nodeId)
      if (!flatNode) return
      setEditingNodeId(nodeId)
      setEditValue(flatNode.node.title)
      setIsNewNode(false)
    },
    [editingNodeId, visibleNodes]
  )

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      const flatNode = visibleNodes.find((n) => n.node.id === nodeId)
      if (!flatNode) return

      const focusTargetId = getDeleteFocusTarget(visibleNodes, nodeId)
      if (focusTargetId) {
        pendingFocusNodeId.current = focusTargetId
      }

      deleteNodeMutation.mutate({
        id: nodeId,
        parentId: flatNode.node.parentId,
      })
    },
    [visibleNodes, deleteNodeMutation]
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
                isRenaming={editingNodeId === flatNode.node.id && !isNewNode}
                editValue={editingNodeId === flatNode.node.id ? editValue : ''}
                onToggleExpand={toggleExpand}
                onEditChange={setEditValue}
                onDoubleClick={() => handleNodeDoubleClick(flatNode.node.id)}
                onDelete={() => handleNodeDelete(flatNode.node.id)}
                onEditCommit={() =>
                  editingNodeId && handleEditCommit(editingNodeId)
                }
                onEditCancel={() => {
                  if (isNewNode && editingNodeId) {
                    // New node creation cancelled — delete the placeholder via mutation
                    const flatN = visibleNodes.find(
                      (n) => n.node.id === editingNodeId
                    )
                    if (flatN) {
                      deleteNodeMutation.mutate({
                        id: editingNodeId,
                        parentId: flatN.node.parentId,
                      })
                    }
                  }
                  // For rename (isNewNode === false): just clear editing state, original title restored
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
