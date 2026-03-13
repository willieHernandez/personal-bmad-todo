import { useCallback, useMemo } from 'react'
import { useNodeChildren } from '#/queries/node-queries'
import { useQueries } from '@tanstack/react-query'
import { getNodeChildren } from '#/api/nodes.api'
import { useTreeState, useSetNodeExpanded } from '#/queries/tree-state-queries'
import { VALID_CHILD_TYPES } from '@todo-bmad-style/shared'
import type { NodeResponse, NodeType } from '@todo-bmad-style/shared'

export interface ChildProgress {
  completed: number
  total: number
}

export interface FlatTreeNode {
  kind: 'node'
  node: NodeResponse
  depth: number
  isExpanded: boolean
  hasChildren: boolean
  childProgress: ChildProgress | null
}

export interface AddButtonRow {
  kind: 'add-button'
  parentId: string
  childType: NodeType
  depth: number
}

export type TreeRow = FlatTreeNode | AddButtonRow

interface UseTreeDataResult {
  visibleNodes: TreeRow[]
  expandedMap: Record<string, boolean>
  toggleExpand: (nodeId: string) => void
  isExpanded: (nodeId: string) => boolean
  setExpanded: (nodeId: string, expanded: boolean) => void
}

export function useTreeData(projectId: string | null): UseTreeDataResult {
  const { data: treeState } = useTreeState()
  const setNodeExpandedMutation = useSetNodeExpanded()

  const expandedMap = treeState ?? {}

  const toggleExpand = useCallback((nodeId: string) => {
    const current = expandedMap[nodeId] ?? false
    setNodeExpandedMutation.mutate({ nodeId, isExpanded: !current })
  }, [expandedMap, setNodeExpandedMutation])

  const isExpanded = useCallback(
    (nodeId: string) => !!expandedMap[nodeId],
    [expandedMap]
  )

  const setExpanded = useCallback((nodeId: string, expanded: boolean) => {
    setNodeExpandedMutation.mutate({ nodeId, isExpanded: expanded })
  }, [setNodeExpandedMutation])

  // Fetch direct children of the project (depth 0 = efforts)
  const { data: rootChildren } = useNodeChildren(projectId)

  // Collect all expanded node IDs to fetch their children
  const expandedNodeIds = useMemo(() => {
    return Object.entries(expandedMap)
      .filter(([, v]) => v)
      .map(([k]) => k)
  }, [expandedMap])

  // Fetch children for all expanded nodes using useQueries
  const childrenQueries = useQueries({
    queries: expandedNodeIds.map((nodeId) => ({
      queryKey: ['nodes', nodeId, 'children'] as const,
      queryFn: () => getNodeChildren(nodeId),
    })),
  })

  // Build a map of parentId -> children for quick lookup
  const childrenMap = useMemo(() => {
    const map: Record<string, NodeResponse[]> = {}
    expandedNodeIds.forEach((nodeId, index) => {
      const query = childrenQueries[index]
      if (query?.data) {
        map[nodeId] = query.data
      }
    })
    return map
  }, [expandedNodeIds, childrenQueries])

  // Build a set of nodes confirmed to have no children (expanded but empty)
  const emptyParents = useMemo(() => {
    const set = new Set<string>()
    expandedNodeIds.forEach((nodeId, index) => {
      const query = childrenQueries[index]
      if (query?.data && query.data.length === 0) {
        set.add(nodeId)
      }
    })
    return set
  }, [expandedNodeIds, childrenQueries])

  // Flatten the tree recursively using fetched data
  const visibleNodes = useMemo(() => {
    if (!rootChildren) return []

    const result: TreeRow[] = []

    function computeChildProgress(nodeChildren: NodeResponse[] | undefined): ChildProgress | null {
      if (!nodeChildren || nodeChildren.length === 0) return null
      const completed = nodeChildren.filter((c) => c.isCompleted).length
      return { completed, total: nodeChildren.length }
    }

    function flatten(nodes: NodeResponse[], depth: number) {
      for (const node of nodes) {
        const expanded = !!expandedMap[node.id]
        const children = childrenMap[node.id]
        const canHaveChildren = node.type !== 'subtask'
        const hasChildren = canHaveChildren && !emptyParents.has(node.id) && (children ? children.length > 0 : true)

        // Compute progress from cached children data
        const childProgress = canHaveChildren ? computeChildProgress(children) : null

        result.push({
          kind: 'node',
          node,
          depth,
          isExpanded: expanded && hasChildren,
          hasChildren,
          childProgress,
        })

        if (expanded && children && children.length > 0) {
          flatten(children, depth + 1)
          // Path A: add button after last child of expanded node
          const childType = VALID_CHILD_TYPES[node.type]
          if (childType) {
            result.push({ kind: 'add-button', parentId: node.id, childType, depth: depth + 1 })
          }
        } else if (expanded && canHaveChildren && emptyParents.has(node.id)) {
          // Path B: add button for expanded empty parent
          const childType = VALID_CHILD_TYPES[node.type]
          if (childType) {
            result.push({ kind: 'add-button', parentId: node.id, childType, depth: depth + 1 })
          }
        }
      }
    }

    flatten(rootChildren, 0)

    // Root level: add button for adding efforts to the project
    if (projectId) {
      result.push({ kind: 'add-button', parentId: projectId, childType: 'effort' as NodeType, depth: 0 })
    }

    return result
  }, [rootChildren, expandedMap, childrenMap, emptyParents, projectId])

  return { visibleNodes, expandedMap, toggleExpand, isExpanded, setExpanded }
}
