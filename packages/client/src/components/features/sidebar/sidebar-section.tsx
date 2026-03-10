import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { useSidebarStore } from '#/stores/sidebar-store'

interface SidebarSectionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

export function SidebarSection({
  title,
  children,
  defaultOpen = true,
}: SidebarSectionProps) {
  const { collapsedSections, toggleSection } = useSidebarStore()
  const isOpen = collapsedSections[title] === undefined ? defaultOpen : !collapsedSections[title]

  return (
    <Collapsible open={isOpen} onOpenChange={() => toggleSection(title)}>
      <CollapsibleTrigger
        className="flex w-full items-center gap-1 px-3 py-1.5 text-xs uppercase tracking-wide text-app-text-muted hover:text-app-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
        aria-expanded={isOpen}
      >
        <ChevronRight
          className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  )
}
