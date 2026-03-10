import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from './ui-store'

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      activeProjectId: null,
      openProjectIds: [],
      activeNodeId: null,
    })
  })

  describe('setActiveProject', () => {
    it('sets activeProjectId and adds to openProjectIds', () => {
      useUIStore.getState().setActiveProject('p1')

      const state = useUIStore.getState()
      expect(state.activeProjectId).toBe('p1')
      expect(state.openProjectIds).toEqual(['p1'])
    })

    it('does not duplicate in openProjectIds if already present', () => {
      useUIStore.getState().setActiveProject('p1')
      useUIStore.getState().setActiveProject('p2')
      useUIStore.getState().setActiveProject('p1')

      const state = useUIStore.getState()
      expect(state.activeProjectId).toBe('p1')
      expect(state.openProjectIds).toEqual(['p1', 'p2'])
    })
  })

  describe('closeProjectTab', () => {
    it('removes tab and switches active to adjacent', () => {
      useUIStore.getState().setActiveProject('p1')
      useUIStore.getState().setActiveProject('p2')
      useUIStore.getState().setActiveProject('p3')

      // Active is p3, close p3 → should switch to p2
      useUIStore.getState().closeProjectTab('p3')

      const state = useUIStore.getState()
      expect(state.openProjectIds).toEqual(['p1', 'p2'])
      expect(state.activeProjectId).toBe('p2')
    })

    it('switches to next tab when closing first tab', () => {
      useUIStore.getState().setActiveProject('p1')
      useUIStore.getState().setActiveProject('p2')
      useUIStore.getState().setActiveProject('p1')

      useUIStore.getState().closeProjectTab('p1')

      const state = useUIStore.getState()
      expect(state.openProjectIds).toEqual(['p2'])
      expect(state.activeProjectId).toBe('p2')
    })

    it('sets activeProjectId to null on last tab', () => {
      useUIStore.getState().setActiveProject('p1')
      useUIStore.getState().closeProjectTab('p1')

      const state = useUIStore.getState()
      expect(state.openProjectIds).toEqual([])
      expect(state.activeProjectId).toBeNull()
    })

    it('does not change active when closing a non-active tab', () => {
      useUIStore.getState().setActiveProject('p1')
      useUIStore.getState().setActiveProject('p2')

      useUIStore.getState().closeProjectTab('p1')

      const state = useUIStore.getState()
      expect(state.openProjectIds).toEqual(['p2'])
      expect(state.activeProjectId).toBe('p2')
    })
  })

  describe('reorderTabs', () => {
    it('updates openProjectIds order', () => {
      useUIStore.getState().setActiveProject('p1')
      useUIStore.getState().setActiveProject('p2')
      useUIStore.getState().setActiveProject('p3')

      useUIStore.getState().reorderTabs(['p3', 'p1', 'p2'])

      expect(useUIStore.getState().openProjectIds).toEqual(['p3', 'p1', 'p2'])
    })
  })
})
