import { create } from 'zustand'

interface DetailPanelState {
  openTabIds: string[]
  activeTabId: string | null
  isDetailPanelOpen: boolean
  scrollPositions: Record<string, number>
  openTab: (nodeId: string) => void
  closeTab: (nodeId: string) => void
  setActiveTab: (nodeId: string) => void
  closeAllTabs: () => void
  saveScrollPosition: (nodeId: string, scrollTop: number) => void
}

export const useDetailPanelStore = create<DetailPanelState>((set, get) => ({
  openTabIds: [],
  activeTabId: null,
  isDetailPanelOpen: false,
  scrollPositions: {},

  openTab: (nodeId: string) => {
    const { openTabIds } = get()
    const newTabIds = openTabIds.includes(nodeId)
      ? openTabIds
      : [...openTabIds, nodeId]
    set({
      openTabIds: newTabIds,
      activeTabId: nodeId,
      isDetailPanelOpen: true,
    })
  },

  closeTab: (nodeId: string) => {
    const { openTabIds, activeTabId, scrollPositions } = get()
    const newTabIds = openTabIds.filter((id) => id !== nodeId)
    const { [nodeId]: _, ...remainingScrollPositions } = scrollPositions

    if (newTabIds.length === 0) {
      set({
        openTabIds: [],
        activeTabId: null,
        isDetailPanelOpen: false,
        scrollPositions: {},
      })
      return
    }

    let newActiveId = activeTabId
    if (activeTabId === nodeId) {
      const closedIndex = openTabIds.indexOf(nodeId)
      const adjacentIndex = Math.min(closedIndex, newTabIds.length - 1)
      newActiveId = newTabIds[adjacentIndex]
    }

    set({
      openTabIds: newTabIds,
      activeTabId: newActiveId,
      scrollPositions: remainingScrollPositions,
    })
  },

  setActiveTab: (nodeId: string) => {
    const { openTabIds } = get()
    if (openTabIds.includes(nodeId)) {
      set({ activeTabId: nodeId })
    }
  },

  closeAllTabs: () => {
    set({
      openTabIds: [],
      activeTabId: null,
      isDetailPanelOpen: false,
      scrollPositions: {},
    })
  },

  saveScrollPosition: (nodeId: string, scrollTop: number) => {
    const { scrollPositions } = get()
    set({ scrollPositions: { ...scrollPositions, [nodeId]: scrollTop } })
  },
}))
