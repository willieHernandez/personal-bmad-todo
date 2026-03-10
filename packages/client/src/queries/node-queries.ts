import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProjects, getNodeChildren, createNode } from '../api/nodes.api'
import type { CreateNode } from '@todo-bmad-style/shared'

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
