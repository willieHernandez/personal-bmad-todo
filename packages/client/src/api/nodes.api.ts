import type { CreateNode, NodeResponse } from '@todo-bmad-style/shared'
import { apiClient } from './client'

export function getProjects(): Promise<NodeResponse[]> {
  return apiClient<NodeResponse[]>('/nodes')
}

export function getNodeChildren(parentId: string): Promise<NodeResponse[]> {
  return apiClient<NodeResponse[]>(`/nodes/${parentId}/children`)
}

export function createNode(data: CreateNode): Promise<NodeResponse> {
  return apiClient<NodeResponse>('/nodes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
