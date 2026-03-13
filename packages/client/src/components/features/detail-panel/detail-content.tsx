import { useRef, useEffect, useCallback } from 'react'
import { useNode, useNodeChildren } from '#/queries/node-queries'
import { useDetailPanelStore } from '#/stores/detail-panel-store'
import { cn } from '#/lib/utils'
import { MarkdownEditor } from './markdown-editor'
import { BreadcrumbNav } from './breadcrumb-nav'

interface DetailContentProps {
  nodeId: string
}

export function DetailContent({ nodeId }: DetailContentProps) {
  const { data: node } = useNode(nodeId)
  const showChildren = node?.type === 'effort' || node?.type === 'task'
  const { data: children } = useNodeChildren(showChildren ? nodeId : null)
  const openTab = useDetailPanelStore((s) => s.openTab)
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
      <BreadcrumbNav nodeId={nodeId} />
      {node.isCompleted && (
        <div className="mb-2 text-sm text-app-text-secondary line-through motion-safe:transition-opacity motion-safe:duration-200" data-testid="detail-completed-indicator">
          {node.title} — Completed
        </div>
      )}
      {showChildren && children && children.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5" data-testid="detail-children-list">
          {children.map((child) => (
            <button
              key={child.id}
              type="button"
              className={cn(
                'rounded-md border border-app-border bg-app-surface px-2 py-0.5 text-xs text-app-text-secondary transition-colors hover:bg-app-hover hover:text-app-text-primary',
                child.isCompleted && 'line-through'
              )}
              onClick={() => openTab(child.id)}
              title={child.title}
              aria-label={`Open child node: ${child.title}`}
              data-testid="detail-child-chip"
            >
              <span className="max-w-[150px] truncate inline-block align-bottom">{child.title}</span>
            </button>
          ))}
        </div>
      )}
      <MarkdownEditor
        nodeId={nodeId}
        parentId={node.parentId}
        markdownBody={node.markdownBody}
        nodeTitle={node.title}
      />
    </div>
  )
}
