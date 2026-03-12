import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProjects, getNodeChildren, getNode, getNodeAncestors, createNode, updateNode, deleteNode, reorderNode, moveNode } from '../api/nodes.api'
import type { CreateNode, MoveNode, NodeResponse, UpdateNode } from '@todo-bmad-style/shared'

export function useProjects() {
  return useQuery({
    queryKey: ['nodes'],
    queryFn: getProjects,
  })
}

export function useNodeChildren(parentId: string | null) {
  return useQuery({
    queryKey: ['nodes', parentId, 'children'],
    queryFn: () => getNodeChildren(parentId!),
    enabled: !!parentId,
  })
}

export function useNode(nodeId: string) {
  return useQuery({
    queryKey: ['nodes', nodeId, 'detail'],
    queryFn: () => getNode(nodeId),
    enabled: !!nodeId,
    retry: false,
  })
}

export function useNodeAncestors(nodeId: string | null) {
  return useQuery({
    queryKey: ['nodes', nodeId, 'ancestors'],
    queryFn: () => getNodeAncestors(nodeId!),
    enabled: !!nodeId,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<CreateNode, 'type'>) =>
      createNode({ ...data, type: 'project' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
    },
  })
}

export function useUpdateNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNode; parentId: string | null }) =>
      updateNode(id, data),
    onMutate: async ({ id, data, parentId }) => {
      const queryKey = ['nodes', parentId, 'children'] as const
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<NodeResponse[]>(queryKey)
      queryClient.setQueryData<NodeResponse[]>(queryKey, (old) =>
        old?.map((n) => (n.id === id ? { ...n, ...data } : n))
      )
      // Optimistically update the detail query so the tab title updates instantly
      const detailKey = ['nodes', id, 'detail'] as const
      const previousDetail = queryClient.getQueryData<NodeResponse>(detailKey)
      if (previousDetail) {
        queryClient.setQueryData<NodeResponse>(detailKey, { ...previousDetail, ...data })
      }
      return { previous, queryKey, previousDetail, detailKey }
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previous)
        if (context.previousDetail) {
          queryClient.setQueryData(context.detailKey, context.previousDetail)
        }
      }
    },
    onSettled: (_data, _err, _vars, context) => {
      if (context) {
        queryClient.invalidateQueries({ queryKey: context.queryKey })
        queryClient.invalidateQueries({ queryKey: context.detailKey })
        // Invalidate ancestor queries so breadcrumbs reflect renamed parents
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'nodes' && query.queryKey[2] === 'ancestors',
        })
      }
    },
  })
}

export function useDeleteNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; parentId: string | null }) =>
      deleteNode(id),
    onMutate: async ({ id, parentId }) => {
      const queryKey = ['nodes', parentId, 'children'] as const
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<NodeResponse[]>(queryKey)
      queryClient.setQueryData<NodeResponse[]>(queryKey, (old) =>
        old?.filter((n) => n.id !== id)
      )
      return { previous, queryKey }
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
    },
    onSettled: (_data, _err, _vars, context) => {
      if (context) {
        queryClient.invalidateQueries({ queryKey: context.queryKey })
        queryClient.invalidateQueries({ queryKey: ['tree-state'] })
        // Invalidate ancestor queries so breadcrumbs update after deletion
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'nodes' && query.queryKey[2] === 'ancestors',
        })
      }
    },
  })
}

export function useCreateNode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateNode & { sortOrder?: number }) =>
      createNode(data),
    onMutate: async (newNodeData) => {
      const parentId = newNodeData.parentId ?? null
      const queryKey = ['nodes', parentId, 'children'] as const

      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<NodeResponse[]>(queryKey)

      const optimisticNode: NodeResponse = {
        id: `temp-${Date.now()}`,
        title: newNodeData.title,
        type: newNodeData.type,
        parentId,
        sortOrder: newNodeData.sortOrder ?? 0,
        isCompleted: false,
        markdownBody: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      queryClient.setQueryData<NodeResponse[]>(queryKey, (old) => [
        ...(old ?? []),
        optimisticNode,
      ])

      return { previous, parentId }
    },
    onError: (_err, _newNode, context) => {
      if (context) {
        queryClient.setQueryData(
          ['nodes', context.parentId, 'children'],
          context.previous
        )
      }
    },
    onSettled: (_data, _err, newNode) => {
      const parentId = newNode.parentId ?? null
      queryClient.invalidateQueries({
        queryKey: ['nodes', parentId, 'children'],
      })
    },
  })
}

export function useReorderNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sortOrder }: { id: string; parentId: string | null; sortOrder: number }) =>
      reorderNode(id, { sortOrder }),
    onMutate: async ({ id, parentId, sortOrder }) => {
      const queryKey = ['nodes', parentId, 'children'] as const
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<NodeResponse[]>(queryKey)
      queryClient.setQueryData<NodeResponse[]>(queryKey, (old) => {
        if (!old) return old
        const items = [...old]
        const currentIndex = items.findIndex((n) => n.id === id)
        if (currentIndex < 0) return old
        const [moved] = items.splice(currentIndex, 1)
        items.splice(sortOrder, 0, moved)
        return items.map((item, i) => ({ ...item, sortOrder: i }))
      })
      return { previous, queryKey }
    },
    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(context.queryKey, context.previous)
    },
    onSettled: (_data, _err, _vars, context) => {
      if (context) queryClient.invalidateQueries({ queryKey: context.queryKey })
    },
  })
}

export function useMoveNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; oldParentId: string | null; data: MoveNode }) =>
      moveNode(id, data),
    onMutate: async ({ id, oldParentId, data }) => {
      const oldKey = ['nodes', oldParentId, 'children'] as const
      const newKey = ['nodes', data.newParentId, 'children'] as const
      await queryClient.cancelQueries({ queryKey: oldKey })
      await queryClient.cancelQueries({ queryKey: newKey })
      const previousOld = queryClient.getQueryData<NodeResponse[]>(oldKey)
      const previousNew = queryClient.getQueryData<NodeResponse[]>(newKey)
      // Remove from old parent
      queryClient.setQueryData<NodeResponse[]>(oldKey, (old) =>
        old?.filter((n) => n.id !== id).map((n, i) => ({ ...n, sortOrder: i }))
      )
      // Add to new parent
      queryClient.setQueryData<NodeResponse[]>(newKey, (old) => {
        const items = old ? [...old] : []
        const movedNode = previousOld?.find((n) => n.id === id)
        if (!movedNode) return old
        const updated = { ...movedNode, parentId: data.newParentId, sortOrder: data.sortOrder }
        if (data.newType) updated.type = data.newType
        items.splice(data.sortOrder, 0, updated)
        return items.map((n, i) => ({ ...n, sortOrder: i }))
      })
      return { previousOld, previousNew, oldKey, newKey }
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(context.oldKey, context.previousOld)
        queryClient.setQueryData(context.newKey, context.previousNew)
      }
    },
    onSettled: (_data, _err, _vars, context) => {
      if (context) {
        queryClient.invalidateQueries({ queryKey: context.oldKey })
        queryClient.invalidateQueries({ queryKey: context.newKey })
        // Invalidate ancestor queries so breadcrumbs update after move
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'nodes' && query.queryKey[2] === 'ancestors',
        })
      }
    },
  })
}
