import { create } from 'zustand'

interface UIState {
  activeProjectId: string | null
  openProjectIds: string[]
  activeNodeId: string | null
  setActiveProject: (id: string) => void
  closeProjectTab: (id: string) => void
  reorderTabs: (ids: string[]) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  activeProjectId: null,
  openProjectIds: [],
  activeNodeId: null,

  setActiveProject: (id: string) => {
    const { openProjectIds } = get()
    const newOpenIds = openProjectIds.includes(id)
      ? openProjectIds
      : [...openProjectIds, id]
    set({ activeProjectId: id, openProjectIds: newOpenIds })
  },

  closeProjectTab: (id: string) => {
    const { openProjectIds, activeProjectId } = get()
    const newOpenIds = openProjectIds.filter((pid) => pid !== id)

    let newActiveId = activeProjectId
    if (activeProjectId === id) {
      if (newOpenIds.length === 0) {
        newActiveId = null
      } else {
        const closedIndex = openProjectIds.indexOf(id)
        const adjacentIndex = Math.min(closedIndex, newOpenIds.length - 1)
        newActiveId = newOpenIds[adjacentIndex]
      }
    }

    set({ openProjectIds: newOpenIds, activeProjectId: newActiveId })
  },

  reorderTabs: (ids: string[]) => {
    set({ openProjectIds: ids })
  },
}))
