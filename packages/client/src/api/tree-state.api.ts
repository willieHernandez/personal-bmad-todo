import { apiClient } from './client'

export function getTreeState(): Promise<Record<string, boolean>> {
  return apiClient<Record<string, boolean>>('/tree-state')
}

export function setNodeExpanded(nodeId: string, isExpanded: boolean): Promise<void> {
  return apiClient<void>(`/tree-state/${nodeId}`, {
    method: 'PUT',
    body: JSON.stringify({ isExpanded }),
  })
}

export function bulkSetTreeState(
  states: Array<{ nodeId: string; isExpanded: boolean }>
): Promise<void> {
  return apiClient<void>('/tree-state', {
    method: 'PUT',
    body: JSON.stringify({ states }),
  })
}
