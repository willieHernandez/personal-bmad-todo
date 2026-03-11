import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateNode } from '#/queries/node-queries'
import { moveNode } from '#/api/nodes.api'
import type { NodeResponse, NodeType } from '@todo-bmad-style/shared'
import type { FlatTreeNode } from './use-tree-data'

const DEPTH_TO_TYPE: Record<number, NodeType> = {
  0: 'effort',
  1: 'task',
  2: 'subtask',
}

interface UseTreeOperationsResult {
  createChild: (
    parentId: string,
    type: NodeType
  ) => Promise<NodeResponse | null>
  createSibling: (
    currentNode: NodeResponse,
    visibleNodes: FlatTreeNode[]
  ) => Promise<NodeResponse | null>
  indentNode: (
    nodeId: string,
    visibleNodes: FlatTreeNode[]
  ) => Promise<string | false>
  outdentNode: (
    nodeId: string,
    visibleNodes: FlatTreeNode[]
  ) => Promise<boolean>
}

export function useTreeOperations(): UseTreeOperationsResult {
  const createNodeMutation = useCreateNode()
  const queryClient = useQueryClient()

  const createChild = useCallback(
    async (parentId: string, type: NodeType): Promise<NodeResponse | null> => {
      try {
        const result = await createNodeMutation.mutateAsync({
          title: 'Untitled',
          type,
          parentId,
          sortOrder: 0,
        })
        return result
      } catch {
        return null
      }
    },
    [createNodeMutation]
  )

  const createSibling = useCallback(
    async (
      currentNode: NodeResponse,
      _visibleNodes: FlatTreeNode[]
    ): Promise<NodeResponse | null> => {
      const parentId = currentNode.parentId
      if (!parentId) return null

      const sortOrder = currentNode.sortOrder + 1

      const result = await createNodeMutation.mutateAsync({
        title: 'Untitled',
        type: currentNode.type,
        parentId,
        sortOrder,
      })

      return result
    },
    [createNodeMutation]
  )

  const indentNode = useCallback(
    async (
      nodeId: string,
      visibleNodes: FlatTreeNode[]
    ): Promise<string | false> => {
      const nodeIndex = visibleNodes.findIndex((n) => n.node.id === nodeId)
      if (nodeIndex < 0) return false

      const flatNode = visibleNodes[nodeIndex]
      const currentDepth = flatNode.depth

      // Cannot indent subtasks (already at max depth)
      if (currentDepth >= 2) return false

      // Find previous sibling (same depth, same parent)
      let prevSibling: FlatTreeNode | null = null
      for (let i = nodeIndex - 1; i >= 0; i--) {
        const candidate = visibleNodes[i]
        if (candidate.depth === currentDepth && candidate.node.parentId === flatNode.node.parentId) {
          prevSibling = candidate
          break
        }
        if (candidate.depth < currentDepth) break
      }

      if (!prevSibling) return false

      const newParentId = prevSibling.node.id
      const newType = DEPTH_TO_TYPE[currentDepth + 1]
      if (!newType) return false

      try {
        await moveNode(nodeId, { newParentId, sortOrder: 0, newType })
        // Invalidate both old and new parent caches
        queryClient.invalidateQueries({
          queryKey: ['nodes', flatNode.node.parentId, 'children'],
        })
        queryClient.invalidateQueries({
          queryKey: ['nodes', newParentId, 'children'],
        })
        return newParentId
      } catch {
        return false
      }
    },
    [queryClient]
  )

  const outdentNode = useCallback(
    async (
      nodeId: string,
      visibleNodes: FlatTreeNode[]
    ): Promise<boolean> => {
      const nodeIndex = visibleNodes.findIndex((n) => n.node.id === nodeId)
      if (nodeIndex < 0) return false

      const flatNode = visibleNodes[nodeIndex]
      const currentDepth = flatNode.depth

      // Cannot outdent efforts (already at min depth under project)
      if (currentDepth <= 0) return false

      // Find the current parent in visible nodes
      const currentParentId = flatNode.node.parentId
      if (!currentParentId) return false

      // Find the grandparent: the parent of the current parent
      let grandParentId: string | null = null
      for (let i = nodeIndex - 1; i >= 0; i--) {
        if (visibleNodes[i].node.id === currentParentId) {
          grandParentId = visibleNodes[i].node.parentId
          break
        }
      }

      if (!grandParentId) return false

      const newType = DEPTH_TO_TYPE[currentDepth - 1]
      if (!newType) return false

      try {
        await moveNode(nodeId, {
          newParentId: grandParentId,
          sortOrder: 0,
          newType,
        })
        // Invalidate old parent, new parent caches
        queryClient.invalidateQueries({
          queryKey: ['nodes', currentParentId, 'children'],
        })
        queryClient.invalidateQueries({
          queryKey: ['nodes', grandParentId, 'children'],
        })
        return true
      } catch {
        return false
      }
    },
    [queryClient]
  )

  return { createChild, createSibling, indentNode, outdentNode }
}
