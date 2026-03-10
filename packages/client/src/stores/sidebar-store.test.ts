import { describe, it, expect, beforeEach } from 'vitest'
import { useSidebarStore } from './sidebar-store'

describe('useSidebarStore', () => {
  beforeEach(() => {
    useSidebarStore.setState({
      width: 240,
      isCollapsed: false,
      collapsedSections: {},
    })
  })

  describe('setWidth', () => {
    it('sets width within bounds', () => {
      useSidebarStore.getState().setWidth(300)
      expect(useSidebarStore.getState().width).toBe(300)
    })

    it('clamps width to minimum 180px', () => {
      useSidebarStore.getState().setWidth(100)
      expect(useSidebarStore.getState().width).toBe(180)
    })

    it('clamps width to maximum 400px', () => {
      useSidebarStore.getState().setWidth(500)
      expect(useSidebarStore.getState().width).toBe(400)
    })
  })

  describe('toggleSection', () => {
    it('toggles a section to collapsed', () => {
      useSidebarStore.getState().toggleSection('Recent')
      expect(useSidebarStore.getState().collapsedSections['Recent']).toBe(true)
    })

    it('toggles a collapsed section back to expanded', () => {
      useSidebarStore.getState().toggleSection('Recent')
      useSidebarStore.getState().toggleSection('Recent')
      expect(useSidebarStore.getState().collapsedSections['Recent']).toBe(false)
    })

    it('toggles sections independently', () => {
      useSidebarStore.getState().toggleSection('Recent')
      useSidebarStore.getState().toggleSection('Inbox')

      const state = useSidebarStore.getState()
      expect(state.collapsedSections['Recent']).toBe(true)
      expect(state.collapsedSections['Inbox']).toBe(true)
    })
  })

  describe('toggleCollapsed', () => {
    it('toggles sidebar collapsed state', () => {
      useSidebarStore.getState().toggleCollapsed()
      expect(useSidebarStore.getState().isCollapsed).toBe(true)
    })

    it('toggles back to expanded', () => {
      useSidebarStore.getState().toggleCollapsed()
      useSidebarStore.getState().toggleCollapsed()
      expect(useSidebarStore.getState().isCollapsed).toBe(false)
    })
  })
})
