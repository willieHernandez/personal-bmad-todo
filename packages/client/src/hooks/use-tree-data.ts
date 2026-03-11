import { useCallback, useMemo } from 'react'
import { useNodeChildren } from '#/queries/node-queries'
import { useQueries } from '@tanstack/react-query'
import { getNodeChildren } from '#/api/nodes.api'
import { useTreeState, useSetNodeExpanded } from '#/queries/tree-state-queries'
import type { NodeResponse } from '@todo-bmad-style/shared'

export interface FlatTreeNode {
  node: NodeResponse
  depth: number
  isExpanded: boolean
  hasChildren: boolean
}

interface UseTreeDataResult {
  visibleNodes: FlatTreeNode[]
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

    const result: FlatTreeNode[] = []

    function flatten(nodes: NodeResponse[], depth: number) {
      for (const node of nodes) {
        const expanded = !!expandedMap[node.id]
        const children = childrenMap[node.id]
        const canHaveChildren = node.type !== 'subtask'
        const hasChildren = canHaveChildren && !emptyParents.has(node.id) && (children ? children.length > 0 : true)

        result.push({
          node,
          depth,
          isExpanded: expanded && hasChildren,
          hasChildren,
        })

        if (expanded && children && children.length > 0) {
          flatten(children, depth + 1)
        }
      }
    }

    flatten(rootChildren, 0)
    return result
  }, [rootChildren, expandedMap, childrenMap, emptyParents])

  return { visibleNodes, expandedMap, toggleExpand, isExpanded, setExpanded }
}
