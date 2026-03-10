import { create } from 'zustand'

interface SidebarState {
  width: number
  isCollapsed: boolean
  collapsedSections: Record<string, boolean>
  setWidth: (width: number) => void
  toggleCollapsed: () => void
  toggleSection: (section: string) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  width: 240,
  isCollapsed: false,
  collapsedSections: {},

  setWidth: (width: number) => {
    const clamped = Math.min(400, Math.max(180, width))
    set({ width: clamped })
  },

  toggleCollapsed: () => {
    set((state) => ({ isCollapsed: !state.isCollapsed }))
  },

  toggleSection: (section: string) => {
    set((state) => ({
      collapsedSections: {
        ...state.collapsedSections,
        [section]: !state.collapsedSections[section],
      },
    }))
  },
}))
