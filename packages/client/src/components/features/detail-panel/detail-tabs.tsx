import { useCallback, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '#/lib/utils'
import { useDetailPanelStore } from '#/stores/detail-panel-store'
import { useNode } from '#/queries/node-queries'

interface TabItemProps {
  nodeId: string
  isActive: boolean
  onSelect: () => void
  onClose: () => void
}

function TabItem({ nodeId, isActive, onSelect, onClose }: TabItemProps) {
  const { data: node } = useNode(nodeId)
  const title = node?.title ?? 'Loading...'

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault()
        onClose()
      }
    },
    [onClose]
  )

  const handleCloseClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClose()
    },
    [onClose]
  )

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${nodeId}`}
      id={`tab-${nodeId}`}
      tabIndex={isActive ? 0 : -1}
      onClick={onSelect}
      onMouseDown={handleMouseDown}
      className={cn(
        'flex max-w-[180px] items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-inset',
        isActive
          ? 'border-b-app-accent text-app-text-primary'
          : 'border-b-transparent text-app-text-secondary hover:text-app-text-primary'
      )}
    >
      <span className="truncate">{title}</span>
      <span
        role="button"
        tabIndex={-1}
        aria-label={`Close ${title} tab`}
        onClick={handleCloseClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
            onClose()
          }
        }}
        className="ml-auto flex-shrink-0 rounded p-0.5 text-app-text-secondary hover:bg-app-hover hover:text-app-text-primary"
      >
        <X className="h-3 w-3" />
      </span>
    </button>
  )
}

export function DetailTabs() {
  const openTabIds = useDetailPanelStore((s) => s.openTabIds)
  const activeTabId = useDetailPanelStore((s) => s.activeTabId)
  const setActiveTab = useDetailPanelStore((s) => s.setActiveTab)
  const closeTab = useDetailPanelStore((s) => s.closeTab)
  const tabListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeTabId && tabListRef.current) {
      const activeButton = document.getElementById(`tab-${activeTabId}`)
      activeButton?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    }
  }, [activeTabId])

  const handleTabListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (openTabIds.length === 0 || !activeTabId) return

      const currentIndex = openTabIds.indexOf(activeTabId)
      let nextIndex: number | null = null

      switch (e.key) {
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % openTabIds.length
          break
        case 'ArrowLeft':
          nextIndex = (currentIndex - 1 + openTabIds.length) % openTabIds.length
          break
        case 'Home':
          nextIndex = 0
          break
        case 'End':
          nextIndex = openTabIds.length - 1
          break
        default:
          return
      }

      e.preventDefault()
      const nextTabId = openTabIds[nextIndex]
      setActiveTab(nextTabId)
      const nextButton = document.getElementById(`tab-${nextTabId}`)
      nextButton?.focus()
    },
    [openTabIds, activeTabId, setActiveTab]
  )

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label="Open detail tabs"
      aria-orientation="horizontal"
      onKeyDown={handleTabListKeyDown}
      className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto"
    >
      {openTabIds.map((nodeId) => (
        <TabItem
          key={nodeId}
          nodeId={nodeId}
          isActive={nodeId === activeTabId}
          onSelect={() => setActiveTab(nodeId)}
          onClose={() => closeTab(nodeId)}
        />
      ))}
    </div>
  )
}
