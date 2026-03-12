import { useRef, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '#/lib/utils'
import { useDetailPanelStore } from '#/stores/detail-panel-store'
import { DetailTabs } from './detail-tabs'
import { DetailContent } from './detail-content'

interface DetailPanelProps {
  onClose?: () => void
}

export function DetailPanel({ onClose }: DetailPanelProps) {
  const isOpen = useDetailPanelStore((s) => s.isDetailPanelOpen)
  const activeTabId = useDetailPanelStore((s) => s.activeTabId)
  const closeAllTabs = useDetailPanelStore((s) => s.closeAllTabs)
  const panelRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => {
    closeAllTabs()
    onClose?.()
  }, [closeAllTabs, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.stopPropagation()
        handleClose()
      }
    },
    [handleClose, isOpen]
  )

  return (
    <div
      ref={panelRef}
      role="complementary"
      aria-label="Task detail panel"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex h-full flex-col border-l border-app-border bg-app-bg outline-none',
        'transition-all duration-200 ease-in-out',
        'motion-reduce:transition-none',
        isOpen ? 'w-1/2 opacity-100' : 'w-0 overflow-hidden opacity-0'
      )}
    >
      {isOpen && (
        <>
          <div className="flex items-center gap-2 border-b border-app-border px-3 py-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded p-1 text-app-text-secondary transition-colors hover:bg-app-hover hover:text-app-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
              aria-label="Close detail panel"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <DetailTabs />
          </div>
          {activeTabId && <DetailContent nodeId={activeTabId} />}
        </>
      )}
    </div>
  )
}
