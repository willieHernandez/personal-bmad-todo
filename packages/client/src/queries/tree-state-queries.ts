import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTreeState, setNodeExpanded } from '../api/tree-state.api'

export function useTreeState() {
  return useQuery({
    queryKey: ['tree-state'],
    queryFn: getTreeState,
  })
}

export function useSetNodeExpanded() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ nodeId, isExpanded }: { nodeId: string; isExpanded: boolean }) =>
      setNodeExpanded(nodeId, isExpanded),
    onMutate: async ({ nodeId, isExpanded }) => {
      await queryClient.cancelQueries({ queryKey: ['tree-state'] })
      const previous = queryClient.getQueryData<Record<string, boolean>>(['tree-state'])
      queryClient.setQueryData<Record<string, boolean>>(['tree-state'], (old) => ({
        ...old,
        [nodeId]: isExpanded,
      }))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tree-state'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-state'] })
    },
  })
}
