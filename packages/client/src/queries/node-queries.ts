import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProjects, getNodeChildren, createNode, updateNode, deleteNode } from '../api/nodes.api'
import type { CreateNode, NodeResponse } from '@todo-bmad-style/shared'

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
    mutationFn: ({ id, data }: { id: string; data: { title: string }; parentId: string | null }) =>
      updateNode(id, data),
    onMutate: async ({ id, data, parentId }) => {
      const queryKey = ['nodes', parentId, 'children'] as const
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<NodeResponse[]>(queryKey)
      queryClient.setQueryData<NodeResponse[]>(queryKey, (old) =>
        old?.map((n) => (n.id === id ? { ...n, ...data } : n))
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
