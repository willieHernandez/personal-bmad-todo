import { Fragment } from 'react'
import { cn } from '#/lib/utils'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '#/components/ui/breadcrumb'
import { useNodeAncestors } from '#/queries/node-queries'
import { useUIStore } from '#/stores/ui-store'
import { useDetailPanelStore } from '#/stores/detail-panel-store'

interface BreadcrumbNavProps {
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

export function BreadcrumbNav({ nodeId }: BreadcrumbNavProps) {
  const { data: ancestors } = useNodeAncestors(nodeId)
  const setFocusedNode = useUIStore((s) => s.setFocusedNode)
  const openTab = useDetailPanelStore((s) => s.openTab)

  if (!ancestors || ancestors.length <= 1) {
    return null
  }

  const currentNode = ancestors[ancestors.length - 1]

  function handleClick(ancestorId: string, type: string) {
    setFocusedNode(ancestorId)
    if (type === 'task' || type === 'subtask') {
      openTab(ancestorId)
    }
  }

  return (
    <div className="mb-4 flex items-center gap-2">
      <Breadcrumb>
        <BreadcrumbList>
          {ancestors.map((ancestor, index) => {
            const isLast = index === ancestors.length - 1

            return (
              <Fragment key={ancestor.id}>
                {index > 0 && (
                  <BreadcrumbSeparator>/</BreadcrumbSeparator>
                )}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="text-app-text-primary text-sm">
                      {ancestor.title}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      render={<button type="button" />}
                      className="text-app-text-secondary text-sm cursor-pointer hover:underline"
                      onClick={() => handleClick(ancestor.id, ancestor.type)}
                    >
                      {ancestor.title}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <TypeBadge type={currentNode.type} />
      {currentNode.isCompleted && (
        <span className="text-xs text-app-accent">Completed</span>
      )}
    </div>
  )
}
