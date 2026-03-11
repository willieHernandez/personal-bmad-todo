import { useRef, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { NodeResponse } from '@todo-bmad-style/shared'

interface TreeRowProps {
  node: NodeResponse
  depth: number
  isExpanded: boolean
  hasChildren: boolean
  isFocused: boolean
  isEditing: boolean
  editValue: string
  onToggleExpand: (nodeId: string) => void
  onEditChange: (value: string) => void
  onEditCommit: () => void
  onEditCancel: () => void
  style?: React.CSSProperties
}

export function TreeRow({
  node,
  depth,
  isExpanded,
  hasChildren,
  isFocused,
  isEditing,
  editValue,
  onToggleExpand,
  onEditChange,
  onEditCommit,
  onEditCancel,
  style,
}: TreeRowProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      cancelledRef.current = false
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onEditCommit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelledRef.current = true
      onEditCancel()
    }
  }

  const handleBlur = () => {
    if (!cancelledRef.current) {
      onEditCommit()
    }
  }

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-level={depth + 1}
      aria-selected={isFocused}
      tabIndex={isFocused ? 0 : -1}
      data-node-id={node.id}
      className={cn(
        'flex h-7 items-center text-sm text-app-text-primary',
        isFocused && 'border-l-2 border-l-app-accent bg-[#EFF6FF]',
        !isFocused && 'hover:bg-[#F5F5F5]'
      )}
      style={{
        ...style,
        paddingLeft: `${depth * 16}px`,
      }}
    >
      {/* Chevron */}
      <button
        type="button"
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center',
          !hasChildren && 'invisible'
        )}
        onClick={(e) => {
          e.stopPropagation()
          onToggleExpand(node.id)
        }}
        tabIndex={-1}
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 transition-transform',
            isExpanded && 'rotate-90'
          )}
        />
      </button>

      {/* Title or Input */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={handleBlur}
          className="ml-1 flex-1 border-none bg-transparent text-sm text-app-text-primary outline-none"
          data-testid="tree-row-input"
        />
      ) : (
        <span className="ml-1 truncate">{node.title}</span>
      )}
    </div>
  )
}
