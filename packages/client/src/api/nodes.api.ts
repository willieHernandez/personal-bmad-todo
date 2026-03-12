import type { CreateNode, MoveNode, ReorderNode, UpdateNode, NodeResponse } from '@todo-bmad-style/shared'
import { apiClient } from './client'

export function getProjects(): Promise<NodeResponse[]> {
  return apiClient<NodeResponse[]>('/nodes')
}

export function getNodeChildren(parentId: string): Promise<NodeResponse[]> {
  return apiClient<NodeResponse[]>(`/nodes/${parentId}/children`)
}

// sortOrder is included for optimistic update ordering; server computes final sort order
export function createNode(data: CreateNode & { sortOrder?: number }): Promise<NodeResponse> {
  return apiClient<NodeResponse>('/nodes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateNode(id: string, data: UpdateNode): Promise<NodeResponse> {
  return apiClient<NodeResponse>(`/nodes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function moveNode(id: string, data: MoveNode): Promise<NodeResponse> {
  return apiClient<NodeResponse>(`/nodes/${id}/move`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function reorderNode(id: string, data: ReorderNode): Promise<NodeResponse> {
  return apiClient<NodeResponse>(`/nodes/${id}/reorder`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteNode(id: string): Promise<void> {
  return apiClient<void>(`/nodes/${id}`, {
    method: 'DELETE',
  })
}
