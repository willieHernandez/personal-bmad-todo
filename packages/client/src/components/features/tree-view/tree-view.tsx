import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import type { DragStartEvent, DragOverEvent, DragEndEvent, DragMoveEvent, CollisionDetection } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { useTreeData } from '#/hooks/use-tree-data'
import { useTreeOperations } from '#/hooks/use-tree-operations'
import { useTreeNavigation } from '#/hooks/use-tree-navigation'
import { useUIStore } from '#/stores/ui-store'
import { useDetailPanelStore } from '#/stores/detail-panel-store'
import { useQueryClient } from '@tanstack/react-query'
import { useUpdateNode, useDeleteNode, useCreateNode, useReorderNode, useMoveNode, useToggleNodeCompletion } from '#/queries/node-queries'
import { TreeRow } from './tree-row'
import { AddChildButton } from './add-child-button'
import { InlineEffortMarkdown } from './inline-effort-markdown'
import type { FlatTreeNode } from '#/hooks/use-tree-data'
import { VALID_CHILD_TYPES } from '@todo-bmad-style/shared'
import type { NodeType, NodeResponse } from '@todo-bmad-style/shared'

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


function isDescendant(
  nodeId: string,
  potentialAncestorId: string,
  visibleNodes: FlatTreeNode[]
): boolean {
  const ancestorIdx = visibleNodes.findIndex((n) => n.node.id === potentialAncestorId)
  if (ancestorIdx < 0) return false
  const ancestorDepth = visibleNodes[ancestorIdx].depth

  for (let i = ancestorIdx + 1; i < visibleNodes.length; i++) {
    if (visibleNodes[i].depth <= ancestorDepth) break
    if (visibleNodes[i].node.id === nodeId) return true
  }
  return false
}

export interface DropIndicator {
  targetParentId: string | null
  targetIndex: number
  type: 'before' | 'after' | 'child'
  targetNodeId: string
}

// Check if moving a node with children to a new type would break its subtree
// The server only retypes the moved node, not its descendants, so children must
// remain valid under the node's new type.
function wouldBreakSubtree(draggedNode: FlatTreeNode, newParentType: string): boolean {
  if (!draggedNode.hasChildren) return false
  const newType = VALID_CHILD_TYPES[newParentType]
  if (!newType) return true
  // If the dragged node's type would change, its children retain their original
  // types which become invalid under the new parent hierarchy
  return newType !== draggedNode.node.type
}

export function isValidDropTarget(
  draggedNode: FlatTreeNode,
  targetNode: FlatTreeNode,
  dropPosition: 'before' | 'after' | 'child',
  visibleNodes: FlatTreeNode[]
): boolean {
  // Cannot drop on self
  if (draggedNode.node.id === targetNode.node.id) return false

  // Cannot drop on own descendant
  if (isDescendant(targetNode.node.id, draggedNode.node.id, visibleNodes)) return false

  if (dropPosition === 'child') {
    // Target must be a type that can have children
    const allowedChildType = VALID_CHILD_TYPES[targetNode.node.type]
    if (!allowedChildType) return false
    // Subtasks can't have children
    if (targetNode.node.type === 'subtask') return false
    // Prevent drops that would break the dragged node's subtree hierarchy
    if (wouldBreakSubtree(draggedNode, targetNode.node.type)) return false
    return true
  }

  // For before/after: we're inserting as a sibling of the target
  // The target's parent must be a valid parent for the dragged node's new type
  const targetParentId = targetNode.node.parentId
  if (!targetParentId) return false // Cannot place at root level (only projects are root)

  // If dragged node and target share the same parent, it's a same-parent reorder — always valid
  if (draggedNode.node.parentId === targetParentId) return true

  // Find the target's parent to check if it can accept the dragged node
  const targetParent = visibleNodes.find((n) => n.node.id === targetParentId)
  if (!targetParent) return false

  const allowedChildType = VALID_CHILD_TYPES[targetParent.node.type]
  if (!allowedChildType) return false

  // Prevent drops that would break the dragged node's subtree hierarchy
  if (wouldBreakSubtree(draggedNode, targetParent.node.type)) return false

  return true
}

function computeNewType(targetParentType: string): NodeType | undefined {
  return VALID_CHILD_TYPES[targetParentType]
}

const TREE_ROW_HEIGHT = 28

interface TreeViewProps {
  projectId: string
}

export function TreeView({ projectId }: TreeViewProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const pendingFocusNodeId = useRef<string | null>(null)

  const { visibleNodes, expandedMap, toggleExpand, setExpanded } = useTreeData(projectId)
  const { createChild, createSibling, indentNode, outdentNode } = useTreeOperations()
  const queryClient = useQueryClient()
  const updateNodeMutation = useUpdateNode()
  const deleteNodeMutation = useDeleteNode()
  const createNodeMutation = useCreateNode()
  const reorderNodeMutation = useReorderNode()
  const moveNodeMutation = useMoveNode()
  const toggleCompletionMutation = useToggleNodeCompletion()

  // Derive node-only rows for all node-dependent logic
  const nodeRows = useMemo(() =>
    visibleNodes.filter((r): r is FlatTreeNode => r.kind === 'node'),
    [visibleNodes]
  )

  // Map from nodeRows index to visibleNodes index for virtualizer scrolling
  // Also map node ID to nodeRows index for O(1) lookups
  const { nodeIndexToVisibleIndex, nodeIdToNodeIndex } = useMemo(() => {
    const indexMap = new Map<number, number>()
    const idMap = new Map<string, number>()
    let nodeIdx = 0
    for (let i = 0; i < visibleNodes.length; i++) {
      const row = visibleNodes[i]
      if (row.kind === 'node') {
        indexMap.set(nodeIdx, i)
        idMap.set(row.node.id, nodeIdx)
        nodeIdx++
      }
    }
    return { nodeIndexToVisibleIndex: indexMap, nodeIdToNodeIndex: idMap }
  }, [visibleNodes])

  const setFocusedNode = useUIStore((s) => s.setFocusedNode)
  const openTab = useDetailPanelStore((s) => s.openTab)

  // Editing state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isNewNode, setIsNewNode] = useState(false)

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)
  // Ref mirrors dropIndicator state so handleDragEnd always reads the latest value
  // (avoids stale closure when onDragEnd fires before React commits the last setState)
  const dropIndicatorRef = useRef<DropIndicator | null>(null)
  // Track current pointer Y during drag (onDragOver delta is stale since it only fires on over-change)
  const currentPointerYRef = useRef<number | null>(null)
  const updateDropIndicator = useCallback((value: DropIndicator | null) => {
    dropIndicatorRef.current = value
    setDropIndicator(value)
  }, [])

  const activeFlatNode = useMemo(
    () => (activeId ? nodeRows.find((n) => n.node.id === activeId) ?? null : null),
    [activeId, nodeRows]
  )

  // DnD sensors with activation constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Custom collision detection that filters out the active item's own droppable
  // so closestCenter doesn't match a node with itself
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const filtered = args.droppableContainers.filter(
      (container) => container.id !== args.active.id
    )
    return closestCenter({ ...args, droppableContainers: filtered })
  }, [])

  // Keyboard navigation
  const { focusedIndex, setFocusedIndex, handleKeyDown: navHandleKeyDown } = useTreeNavigation({
    visibleNodes: nodeRows,
    expandedMap,
    setExpanded,
  })

  // Set cursor during drag: grabbing when over valid target, no-drop otherwise
  useEffect(() => {
    if (!activeId) {
      document.body.style.cursor = ''
      return
    }
    document.body.style.cursor = dropIndicator ? 'grabbing' : 'no-drop'
    return () => { document.body.style.cursor = '' }
  }, [activeId, dropIndicator])

  // Resolve pending focus after nodeRows updates (e.g., after indent/outdent/delete)
  useEffect(() => {
    if (pendingFocusNodeId.current) {
      const newIndex = nodeRows.findIndex((n) => n.node.id === pendingFocusNodeId.current)
      if (newIndex >= 0) {
        if (newIndex === focusedIndex) {
          const el = rowRefs.current.get(pendingFocusNodeId.current)
          if (el && !editingNodeId) {
            el.focus()
          }
        }
        setFocusedIndex(newIndex)
        pendingFocusNodeId.current = null
      }
    }
  }, [nodeRows, setFocusedIndex, focusedIndex, editingNodeId])

  // Sync focusedIndex → activeNodeId in Zustand store
  useEffect(() => {
    const node = nodeRows[focusedIndex]
    if (node) {
      setFocusedNode(node.node.id)
    }
  }, [focusedIndex, nodeRows, setFocusedNode])

  // Scroll focused row into view
  const virtualizer = useVirtualizer({
    count: visibleNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => TREE_ROW_HEIGHT,
    overscan: 10,
  })

  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < nodeRows.length && virtualizer.scrollToIndex) {
      const visibleIdx = nodeIndexToVisibleIndex.get(focusedIndex)
      if (visibleIdx == null) return
      virtualizer.scrollToIndex(visibleIdx, { align: 'auto' })
    }
  }, [focusedIndex, nodeRows.length, nodeIndexToVisibleIndex, virtualizer])

  // Focus the DOM element when focusedIndex changes
  useEffect(() => {
    const node = nodeRows[focusedIndex]
    if (!node) return
    const el = rowRefs.current.get(node.node.id)
    if (el && !editingNodeId) {
      el.focus()
    }
  }, [focusedIndex, nodeRows, editingNodeId])

  const clearEditing = useCallback(() => {
    setEditingNodeId(null)
    setEditValue('')
    setIsNewNode(false)
  }, [])

  const handleEditCommit = useCallback(
    (nodeId: string) => {
      const trimmed = editValue.trim()
      const flatNode = nodeRows.find((n) => n.node.id === nodeId)

      if (!trimmed && isNewNode) {
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
        clearEditing()
        return
      }

      if (flatNode && trimmed !== flatNode.node.title) {
        updateNodeMutation.mutate({
          id: nodeId,
          data: { title: trimmed },
          parentId: flatNode.node.parentId,
        })
      }
      clearEditing()
    },
    [editValue, isNewNode, nodeRows, clearEditing, updateNodeMutation, deleteNodeMutation]
  )

  // Ref to store the current 'over' target during drag (so onDragMove can access it)
  const currentOverRef = useRef<DragOverEvent['over']>(null)

  // Shared helper: compute and update the drop indicator based on pointer position and over target
  const computeDropIndicator = useCallback(
    (activeNodeId: string, pointerY: number) => {
      const over = currentOverRef.current
      if (!over) {
        updateDropIndicator(null)
        return
      }

      const draggedFlatNode = nodeRows.find((n) => n.node.id === activeNodeId)
      const targetFlatNode = nodeRows.find((n) => n.node.id === over.id)

      if (!draggedFlatNode || !targetFlatNode) {
        updateDropIndicator(null)
        return
      }

      const overRect = over.rect
      if (!overRect) {
        updateDropIndicator(null)
        return
      }

      const itemTop = overRect.top
      const itemHeight = overRect.height

      let dropPosition: 'before' | 'after' | 'child'
      if (itemHeight <= 0) {
        dropPosition = 'after'
      } else {
        const relativeY = pointerY - itemTop
        const topZone = itemHeight * 0.25
        const bottomZone = itemHeight * 0.75

        if (relativeY < topZone) {
          dropPosition = 'before'
        } else if (relativeY > bottomZone) {
          dropPosition = 'after'
        } else {
          dropPosition = 'child'
        }
      }

      // Validate the drop
      if (!isValidDropTarget(draggedFlatNode, targetFlatNode, dropPosition, nodeRows)) {
        if (dropPosition === 'child') {
          if (isValidDropTarget(draggedFlatNode, targetFlatNode, 'after', nodeRows)) {
            dropPosition = 'after'
          } else {
            updateDropIndicator(null)
            return
          }
        } else {
          updateDropIndicator(null)
          return
        }
      }

      const targetParentId = dropPosition === 'child'
        ? targetFlatNode.node.id
        : targetFlatNode.node.parentId

      let targetIndex = 0
      if (dropPosition === 'child') {
        targetIndex = 0
      } else {
        const siblings = nodeRows.filter((n) => n.node.parentId === targetParentId)
        const siblingIdx = siblings.findIndex((n) => n.node.id === targetFlatNode.node.id)
        targetIndex = dropPosition === 'before' ? siblingIdx : siblingIdx + 1
      }

      updateDropIndicator({
        targetParentId,
        targetIndex,
        type: dropPosition,
        targetNodeId: targetFlatNode.node.id,
      })
    },
    [nodeRows, updateDropIndicator]
  )

  // DnD handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (editingNodeId) return
      setActiveId(event.active.id as string)
      currentOverRef.current = null
      currentPointerYRef.current = null
      updateDropIndicator(null)
    },
    [editingNodeId, updateDropIndicator]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event
      currentOverRef.current = over
      if (!over || !activeId) {
        updateDropIndicator(null)
        return
      }
      // Use tracked pointer position if available, otherwise compute from event
      const pointerY = currentPointerYRef.current
        ?? (event.activatorEvent as PointerEvent).clientY + (event.delta?.y ?? 0)
      computeDropIndicator(activeId, pointerY)
    },
    [activeId, computeDropIndicator, updateDropIndicator]
  )

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (!activeId) return
      // Track the current pointer Y position
      const activatorEvent = event.activatorEvent as PointerEvent
      const pointerY = activatorEvent.clientY + (event.delta?.y ?? 0)
      currentPointerYRef.current = pointerY
      // Recompute drop indicator with updated pointer position
      computeDropIndicator(activeId, pointerY)
    },
    [activeId, computeDropIndicator]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active } = event
      // Read from ref to avoid stale closure — state may not be committed yet
      const currentDropIndicator = dropIndicatorRef.current

      setActiveId(null)
      updateDropIndicator(null)

      if (!currentDropIndicator) return

      const draggedFlatNode = nodeRows.find((n) => n.node.id === active.id)
      if (!draggedFlatNode) return

      const { targetParentId, targetIndex, type: dropType } = currentDropIndicator
      const isSameParent = draggedFlatNode.node.parentId === targetParentId

      if (isSameParent && dropType !== 'child') {
        // Reorder within same parent
        // Adjust target index if needed (dragged node is removed from array first)
        let adjustedIndex = targetIndex
        const siblings = nodeRows.filter((n) => n.node.parentId === targetParentId)
        const currentIdx = siblings.findIndex((n) => n.node.id === draggedFlatNode.node.id)
        if (currentIdx >= 0 && currentIdx < targetIndex) {
          adjustedIndex = targetIndex - 1
        }

        if (adjustedIndex === currentIdx) return // No change

        reorderNodeMutation.mutate({
          id: draggedFlatNode.node.id,
          parentId: draggedFlatNode.node.parentId,
          sortOrder: adjustedIndex,
        })
      } else {
        // Move to different parent
        if (!targetParentId) return

        const targetParent = nodeRows.find((n) => n.node.id === targetParentId)
        if (!targetParent) return

        const newType = computeNewType(targetParent.node.type)

        moveNodeMutation.mutate({
          id: draggedFlatNode.node.id,
          oldParentId: draggedFlatNode.node.parentId,
          data: {
            newParentId: targetParentId,
            sortOrder: targetIndex,
            newType,
          },
        })

        // Expand the new parent so the moved node is visible
        setExpanded(targetParentId, true)
      }

      // Restore focus to the dragged node
      pendingFocusNodeId.current = draggedFlatNode.node.id
    },
    [nodeRows, reorderNodeMutation, moveNodeMutation, setExpanded, updateDropIndicator]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    currentOverRef.current = null
    currentPointerYRef.current = null
    updateDropIndicator(null)
  }, [updateDropIndicator])

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement
      const nodeId = target.getAttribute('data-node-id')
        ?? nodeRows[focusedIndex]?.node.id
        ?? null

      // When in edit mode, don't handle navigation keys
      if (editingNodeId) return

      // Handle Cmd/Ctrl+Arrow for reorder and indent/outdent
      if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        if (!nodeId) return

        if (e.key === 'ArrowLeft') {
          pendingFocusNodeId.current = nodeId
          outdentNode(nodeId, nodeRows)
          return
        }

        if (e.key === 'ArrowRight') {
          pendingFocusNodeId.current = nodeId
          const newParentId = await indentNode(nodeId, nodeRows)
          if (newParentId) {
            setExpanded(newParentId, true)
          }
          return
        }

        // Cmd+Up/Down: reorder within same parent
        const currentIdx = nodeRows.findIndex((n) => n.node.id === nodeId)
        if (currentIdx < 0) return

        const currentNode = nodeRows[currentIdx]
        const parentId = currentNode.node.parentId
        const currentDepth = currentNode.depth

        // Find adjacent sibling in the desired direction
        let siblingNode: FlatTreeNode | null = null
        if (e.key === 'ArrowUp') {
          for (let i = currentIdx - 1; i >= 0; i--) {
            if (nodeRows[i].depth < currentDepth) break
            if (nodeRows[i].depth === currentDepth && nodeRows[i].node.parentId === parentId) {
              siblingNode = nodeRows[i]
              break
            }
          }
        } else {
          for (let i = currentIdx + 1; i < nodeRows.length; i++) {
            if (nodeRows[i].depth < currentDepth) break
            if (nodeRows[i].depth === currentDepth && nodeRows[i].node.parentId === parentId) {
              siblingNode = nodeRows[i]
              break
            }
          }
        }

        if (!siblingNode) return

        pendingFocusNodeId.current = nodeId
        reorderNodeMutation.mutate({
          id: currentNode.node.id,
          parentId: parentId,
          sortOrder: siblingNode.node.sortOrder,
        })
        return
      }

      // Handle Tab/Shift+Tab for indent/outdent
      if (e.key === 'Tab') {
        e.preventDefault()
        if (!nodeId) return

        pendingFocusNodeId.current = nodeId

        if (e.shiftKey) {
          await outdentNode(nodeId, nodeRows)
        } else {
          const newParentId = await indentNode(nodeId, nodeRows)
          if (newParentId) {
            setExpanded(newParentId, true)
          }
        }
        return
      }

      // Handle Ctrl+Enter for creating siblings
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (!nodeId) return

        const flatNode = nodeRows.find((n) => n.node.id === nodeId)
        if (!flatNode) return

        const result = await createSibling(flatNode.node, nodeRows)
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

        const flatNode = nodeRows.find((n) => n.node.id === nodeId)
        if (!flatNode) return

        setEditingNodeId(nodeId)
        setEditValue(flatNode.node.title)
        setIsNewNode(false)
        return
      }

      // Handle Delete/Backspace for node deletion
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        if (!nodeId) return

        const flatNode = nodeRows.find((n) => n.node.id === nodeId)
        if (!flatNode) return

        const focusTargetId = getDeleteFocusTarget(nodeRows, nodeId)

        if (focusTargetId) {
          pendingFocusNodeId.current = focusTargetId
        }

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
      focusedIndex,
      nodeRows,
      createSibling,
      indentNode,
      outdentNode,
      setFocusedNode,
      setExpanded,
      navHandleKeyDown,
      deleteNodeMutation,
      reorderNodeMutation,
    ]
  )

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (editingNodeId && editingNodeId !== nodeId) {
        handleEditCommit(editingNodeId)
      }
      const nodeIndex = nodeIdToNodeIndex.get(nodeId)
      if (nodeIndex != null) {
        setFocusedIndex(nodeIndex)
      }
      setFocusedNode(nodeId)
      if (!editingNodeId) {
        openTab(nodeId)
      }
    },
    [editingNodeId, handleEditCommit, setFocusedNode, setFocusedIndex, openTab, nodeIdToNodeIndex]
  )

  const handleNodeDoubleClick = useCallback(
    (nodeId: string) => {
      if (editingNodeId) return
      const flatNode = nodeRows.find((n) => n.node.id === nodeId)
      if (!flatNode) return
      setEditingNodeId(nodeId)
      setEditValue(flatNode.node.title)
      setIsNewNode(false)
    },
    [editingNodeId, nodeRows]
  )

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      const flatNode = nodeRows.find((n) => n.node.id === nodeId)
      if (!flatNode) return

      const focusTargetId = getDeleteFocusTarget(nodeRows, nodeId)
      if (focusTargetId) {
        pendingFocusNodeId.current = focusTargetId
      }

      deleteNodeMutation.mutate({
        id: nodeId,
        parentId: flatNode.node.parentId,
      })
    },
    [nodeRows, deleteNodeMutation]
  )

  const handleToggleComplete = useCallback(
    (nodeId: string) => {
      const flatNode = nodeRows.find((n) => n.node.id === nodeId)
      if (!flatNode) return
      toggleCompletionMutation.mutate({
        id: nodeId,
        parentId: flatNode.node.parentId,
      })
    },
    [nodeRows, toggleCompletionMutation]
  )

  const handleAddChild = useCallback(async (parentId: string, childType: NodeType) => {
    if (activeId) return
    try {
      const children = queryClient.getQueryData<NodeResponse[]>(['nodes', parentId, 'children'])
      const result = await createNodeMutation.mutateAsync({
        title: 'Untitled',
        type: childType,
        parentId,
        sortOrder: children?.length ?? 0,
      })
      if (result) {
        setFocusedNode(result.id)
        setEditingNodeId(result.id)
        setEditValue('')
        setIsNewNode(true)
        setExpanded(parentId, true)
      }
    } catch {
      // Mutation error handled by TanStack Query's onError — optimistic update rolls back
    }
  }, [activeId, queryClient, createNodeMutation, setFocusedNode, setExpanded])

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
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        ref={parentRef}
        role="tree"
        aria-label="Project tree"
        className="h-full overflow-auto"
        onKeyDown={handleKeyDown}
      >
        {nodeRows.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm text-app-text-secondary">
              No efforts yet. Create your first one to get started.
            </p>
            <button
              type="button"
              data-testid="empty-state-add-effort"
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
            const row = visibleNodes[virtualRow.index]

            if (row.kind === 'add-button') {
              return (
                <div
                  key={`add-${row.parentId}`}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                    width: '100%',
                  }}
                >
                  <AddChildButton
                    childType={row.childType}
                    depth={row.depth}
                    parentTitle={nodeRows.find((n) => n.node.id === row.parentId)?.node.title}
                    onClick={() => handleAddChild(row.parentId, row.childType)}
                  />
                </div>
              )
            }

            const flatNode = row
            const nodeIndex = nodeIdToNodeIndex.get(flatNode.node.id) ?? -1
            const isBeingDragged = activeId === flatNode.node.id
            const showDropBefore = dropIndicator?.type === 'before' && dropIndicator.targetNodeId === flatNode.node.id
            const showDropAfter = dropIndicator?.type === 'after' && dropIndicator.targetNodeId === flatNode.node.id
            const showDropChild = dropIndicator?.type === 'child' && dropIndicator.targetNodeId === flatNode.node.id

            const showInlineMarkdown = flatNode.node.type === 'effort'
              && flatNode.isExpanded
              && !!flatNode.node.markdownBody?.trim()

            return (
              <div
                key={flatNode.node.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  width: '100%',
                }}
                onClick={() => handleNodeClick(flatNode.node.id)}
              >
                {showDropBefore && (
                  <div
                    className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-[2px] bg-[#3B82F6]"
                    style={{ marginLeft: `${flatNode.depth * 16}px` }}
                    data-testid="drop-indicator-before"
                  />
                )}
                <TreeRow
                  ref={(el) => {
                    if (el) {
                      rowRefs.current.set(flatNode.node.id, el)
                    } else {
                      rowRefs.current.delete(flatNode.node.id)
                    }
                  }}
                  node={flatNode.node}
                  depth={flatNode.depth}
                  isExpanded={flatNode.isExpanded}
                  hasChildren={flatNode.hasChildren}
                  childProgress={flatNode.childProgress}
                  isFocused={focusedIndex === nodeIndex}
                  isEditing={editingNodeId === flatNode.node.id}
                  isRenaming={editingNodeId === flatNode.node.id && !isNewNode}
                  editValue={editingNodeId === flatNode.node.id ? editValue : ''}
                  isDragging={isBeingDragged}
                  isDropTarget={showDropChild}
                  onToggleExpand={toggleExpand}
                  onToggleComplete={handleToggleComplete}
                  onEditChange={setEditValue}
                  onDoubleClick={() => handleNodeDoubleClick(flatNode.node.id)}
                  onDelete={() => handleNodeDelete(flatNode.node.id)}
                  onEditCommit={() =>
                    editingNodeId && handleEditCommit(editingNodeId)
                  }
                  onEditCancel={() => {
                    if (isNewNode && editingNodeId) {
                      const flatN = nodeRows.find(
                        (n) => n.node.id === editingNodeId
                      )
                      if (flatN) {
                        deleteNodeMutation.mutate({
                          id: editingNodeId,
                          parentId: flatN.node.parentId,
                        })
                      }
                    }
                    clearEditing()
                  }}
                />
                {showDropAfter && (
                  <div
                    className="pointer-events-none absolute right-0 left-0 z-10 h-[2px] bg-[#3B82F6]"
                    style={{ marginLeft: `${flatNode.depth * 16}px`, bottom: showInlineMarkdown ? 'auto' : 0, top: showInlineMarkdown ? `${TREE_ROW_HEIGHT}px` : 'auto' }}
                    data-testid="drop-indicator-after"
                  />
                )}
                {showInlineMarkdown && (
                  <InlineEffortMarkdown
                    markdownBody={flatNode.node.markdownBody}
                    depth={flatNode.depth}
                    title={flatNode.node.title}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeFlatNode && (
          <div
            className="flex h-7 items-center rounded border border-app-border bg-app-surface px-2 text-sm text-app-text-primary shadow-md"
            style={{ transform: 'scale(1.02)' }}
            data-testid="drag-overlay"
          >
            <span className="truncate">{activeFlatNode.node.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
