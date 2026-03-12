import { useRef, useEffect, useCallback } from 'react'
import { useNode } from '#/queries/node-queries'
import { useDetailPanelStore } from '#/stores/detail-panel-store'
import { MarkdownEditor } from './markdown-editor'
import { BreadcrumbNav } from './breadcrumb-nav'

interface DetailContentProps {
  nodeId: string
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
      <BreadcrumbNav nodeId={nodeId} />
      <MarkdownEditor
        nodeId={nodeId}
        parentId={node.parentId}
        markdownBody={node.markdownBody}
        nodeTitle={node.title}
      />
    </div>
  )
}
