import { describe, it, expect, beforeEach } from 'vitest'
import { useDetailPanelStore } from './detail-panel-store'

describe('useDetailPanelStore', () => {
  beforeEach(() => {
    useDetailPanelStore.setState({
      openTabIds: [],
      activeTabId: null,
      isDetailPanelOpen: false,
      scrollPositions: {},
    })
  })

  describe('openTab', () => {
    it('opens a tab and sets it active', () => {
      useDetailPanelStore.getState().openTab('node-1')

      const state = useDetailPanelStore.getState()
      expect(state.openTabIds).toEqual(['node-1'])
      expect(state.activeTabId).toBe('node-1')
      expect(state.isDetailPanelOpen).toBe(true)
    })

    it('opens multiple tabs', () => {
      useDetailPanelStore.getState().openTab('node-1')
      useDetailPanelStore.getState().openTab('node-2')

      const state = useDetailPanelStore.getState()
      expect(state.openTabIds).toEqual(['node-1', 'node-2'])
      expect(state.activeTabId).toBe('node-2')
    })

    it('does not duplicate tab but switches to it', () => {
      useDetailPanelStore.getState().openTab('node-1')
      useDetailPanelStore.getState().openTab('node-2')
      useDetailPanelStore.getState().openTab('node-1')

      const state = useDetailPanelStore.getState()
      expect(state.openTabIds).toEqual(['node-1', 'node-2'])
      expect(state.activeTabId).toBe('node-1')
    })
  })

  describe('closeTab', () => {
    it('closes a tab and activates adjacent', () => {
      useDetailPanelStore.getState().openTab('node-1')
      useDetailPanelStore.getState().openTab('node-2')
      useDetailPanelStore.getState().openTab('node-3')

      useDetailPanelStore.getState().closeTab('node-3')

      const state = useDetailPanelStore.getState()
      expect(state.openTabIds).toEqual(['node-1', 'node-2'])
      expect(state.activeTabId).toBe('node-2')
    })

    it('activates next tab when closing first tab', () => {
      useDetailPanelStore.getState().openTab('node-1')
      useDetailPanelStore.getState().openTab('node-2')
      useDetailPanelStore.getState().setActiveTab('node-1')

      useDetailPanelStore.getState().closeTab('node-1')

      const state = useDetailPanelStore.getState()
      expect(state.openTabIds).toEqual(['node-2'])
      expect(state.activeTabId).toBe('node-2')
    })

    it('closes panel when last tab is closed', () => {
      useDetailPanelStore.getState().openTab('node-1')
      useDetailPanelStore.getState().closeTab('node-1')

      const state = useDetailPanelStore.getState()
      expect(state.openTabIds).toEqual([])
      expect(state.activeTabId).toBeNull()
      expect(state.isDetailPanelOpen).toBe(false)
    })

    it('does not change active when closing non-active tab', () => {
      useDetailPanelStore.getState().openTab('node-1')
      useDetailPanelStore.getState().openTab('node-2')

      useDetailPanelStore.getState().closeTab('node-1')

      const state = useDetailPanelStore.getState()
      expect(state.openTabIds).toEqual(['node-2'])
      expect(state.activeTabId).toBe('node-2')
    })

    it('activates middle tab correctly when closing middle active tab', () => {
      useDetailPanelStore.getState().openTab('node-1')
      useDetailPanelStore.getState().openTab('node-2')
      useDetailPanelStore.getState().openTab('node-3')
      useDetailPanelStore.getState().setActiveTab('node-2')

      useDetailPanelStore.getState().closeTab('node-2')

      const state = useDetailPanelStore.getState()
      expect(state.openTabIds).toEqual(['node-1', 'node-3'])
      expect(state.activeTabId).toBe('node-3')
    })
  })

  describe('setActiveTab', () => {
    it('sets the active tab', () => {
      useDetailPanelStore.getState().openTab('node-1')
      useDetailPanelStore.getState().openTab('node-2')
      useDetailPanelStore.getState().setActiveTab('node-1')

      expect(useDetailPanelStore.getState().activeTabId).toBe('node-1')
    })

    it('ignores setting active tab to a non-open tab', () => {
      useDetailPanelStore.getState().openTab('node-1')
      useDetailPanelStore.getState().setActiveTab('node-999')

      expect(useDetailPanelStore.getState().activeTabId).toBe('node-1')
    })
  })

  describe('closeAllTabs', () => {
    it('closes all tabs and the panel', () => {
      useDetailPanelStore.getState().openTab('node-1')
      useDetailPanelStore.getState().openTab('node-2')
      useDetailPanelStore.getState().closeAllTabs()

      const state = useDetailPanelStore.getState()
      expect(state.openTabIds).toEqual([])
      expect(state.activeTabId).toBeNull()
      expect(state.isDetailPanelOpen).toBe(false)
    })

    it('clears scroll positions', () => {
      useDetailPanelStore.getState().openTab('node-1')
      useDetailPanelStore.getState().saveScrollPosition('node-1', 150)
      useDetailPanelStore.getState().closeAllTabs()

      expect(useDetailPanelStore.getState().scrollPositions).toEqual({})
    })
  })

  describe('saveScrollPosition', () => {
    it('saves scroll position for a tab', () => {
      useDetailPanelStore.getState().openTab('node-1')
      useDetailPanelStore.getState().saveScrollPosition('node-1', 200)

      expect(useDetailPanelStore.getState().scrollPositions).toEqual({ 'node-1': 200 })
    })

    it('cleans up scroll position when tab is closed', () => {
      useDetailPanelStore.getState().openTab('node-1')
      useDetailPanelStore.getState().openTab('node-2')
      useDetailPanelStore.getState().saveScrollPosition('node-1', 100)
      useDetailPanelStore.getState().saveScrollPosition('node-2', 200)

      useDetailPanelStore.getState().closeTab('node-1')

      expect(useDetailPanelStore.getState().scrollPositions).toEqual({ 'node-2': 200 })
    })
  })
})
