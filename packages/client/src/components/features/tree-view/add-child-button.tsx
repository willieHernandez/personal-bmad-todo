import { Plus } from 'lucide-react'
import type { NodeType } from '@todo-bmad-style/shared'

interface AddChildButtonProps {
  childType: NodeType
  depth: number
  parentTitle?: string
  onClick: () => void
}

export function AddChildButton({ childType, depth, parentTitle, onClick }: AddChildButtonProps) {
  const label = parentTitle
    ? `Add ${childType} under ${parentTitle}`
    : `Add ${childType}`

  return (
    <button
      type="button"
      data-testid="add-child-button"
      aria-label={label}
      className="flex h-6 items-center gap-1 text-xs text-app-text-secondary transition-colors hover:text-app-text-primary"
      style={{ paddingLeft: `${depth * 16 + 24}px` }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <Plus className="h-3 w-3" aria-hidden="true" />
      Add {childType}
    </button>
  )
}
