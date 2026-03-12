import { useRef, useEffect, useCallback } from 'react'
import { cn } from '#/lib/utils'
import { useNode } from '#/queries/node-queries'
import { useDetailPanelStore } from '#/stores/detail-panel-store'
import { MarkdownEditor } from './markdown-editor'

interface DetailContentProps {
  nodeId: string
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
        'border border-app-border bg-app-surface text-app-text-secondary'
      )}
    >
      {type}
    </span>
  )
}

export function DetailContent({ nodeId }: DetailContentProps) {
  const { data: node } = useNode(nodeId)
  const scrollPositions = useDetailPanelStore((s) => s.scrollPositions)
  const saveScrollPosition = useDetailPanelStore((s) => s.saveScrollPosition)
  const panelRef = useRef<HTMLDivElement>(null)

  // Restore scroll position when switching to this tab
  useEffect(() => {
    const el = panelRef.current
    if (el) {
      el.scrollTop = scrollPositions[nodeId] ?? 0
    }
  }, [nodeId, scrollPositions])

  // Save scroll position on scroll
  const handleScroll = useCallback(() => {
    const el = panelRef.current
    if (el) {
      saveScrollPosition(nodeId, el.scrollTop)
    }
  }, [nodeId, saveScrollPosition])

  if (!node) {
    return null
  }

  return (
    <div
      ref={panelRef}
      role="tabpanel"
      id={`tabpanel-${nodeId}`}
      aria-labelledby={`tab-${nodeId}`}
      className="flex flex-1 flex-col overflow-y-auto p-4"
      onScroll={handleScroll}
    >
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-app-text-primary">
          {node.title}
        </h2>
        <TypeBadge type={node.type} />
        {node.isCompleted && (
          <span className="text-xs text-app-accent">Completed</span>
        )}
      </div>
      <MarkdownEditor
        nodeId={nodeId}
        parentId={node.parentId}
        markdownBody={node.markdownBody}
        nodeTitle={node.title}
      />
    </div>
  )
}
