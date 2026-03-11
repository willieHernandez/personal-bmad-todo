import { forwardRef, useRef, useEffect } from 'react'
import { ChevronRight, Minus, Trash2 } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { NodeResponse } from '@todo-bmad-style/shared'

interface TreeRowProps {
  node: NodeResponse
  depth: number
  isExpanded: boolean
  hasChildren: boolean
  isFocused: boolean
  isEditing: boolean
  isRenaming?: boolean
  editValue: string
  onToggleExpand: (nodeId: string) => void
  onEditChange: (value: string) => void
  onEditCommit: () => void
  onEditCancel: () => void
  onDoubleClick?: () => void
  onDelete?: () => void
  style?: React.CSSProperties
}

export const TreeRow = forwardRef<HTMLDivElement, TreeRowProps>(function TreeRow(
  {
    node,
    depth,
    isExpanded,
    hasChildren,
    isFocused,
    isEditing,
    isRenaming,
    editValue,
    onToggleExpand,
    onEditChange,
    onEditCommit,
    onEditCancel,
    onDoubleClick,
    onDelete,
    style,
  },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      cancelledRef.current = false
      inputRef.current.focus()
      if (isRenaming) {
        inputRef.current.select()
      }
    }
  }, [isEditing, isRenaming])

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onEditCommit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelledRef.current = true
      onEditCancel()
    }
    // Stop propagation for all keys during edit mode to prevent navigation
    e.stopPropagation()
  }

  const handleBlur = () => {
    if (!cancelledRef.current) {
      onEditCommit()
    }
  }

  return (
    <div
      ref={ref}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-level={depth + 1}
      aria-selected={isFocused}
      tabIndex={isFocused ? 0 : -1}
      data-node-id={node.id}
      aria-keyshortcuts="Enter Delete"
      className={cn(
        'group flex h-7 items-center text-sm text-app-text-primary',
        isFocused && 'border-l-2 border-l-app-accent bg-[#EFF6FF]',
        !isFocused && 'hover:bg-[#F5F5F5]'
      )}
      style={{
        ...style,
        paddingLeft: `${depth * 16}px`,
        ...(isFocused ? { outline: '2px solid #3B82F6', outlineOffset: '2px' } : {}),
      }}
      onDoubleClick={(e) => {
        if (!isEditing && onDoubleClick) {
          e.preventDefault()
          e.stopPropagation()
          onDoubleClick()
        }
      }}
    >
      {/* Chevron / Dash indicator */}
      <button
        type="button"
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center',
          !hasChildren && node.type === 'subtask' && 'invisible'
        )}
        onClick={(e) => {
          e.stopPropagation()
          onToggleExpand(node.id)
        }}
        tabIndex={-1}
        aria-label={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : 'No children'}
      >
        {hasChildren ? (
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-transform',
              isExpanded && 'rotate-90'
            )}
          />
        ) : (
          <Minus className="h-3 w-3 text-app-text-secondary" data-testid="empty-node-dash" />
        )}
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
        <>
          <span className="ml-1 flex-1 truncate">{node.title}</span>
          {onDelete && (
            <button
              type="button"
              className="tree-row-delete mr-1 flex h-4 w-4 shrink-0 items-center justify-center opacity-0 transition-opacity focus-visible:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              tabIndex={-1}
              aria-label="Delete node"
              title="Delete (or press Delete key)"
              data-testid="tree-row-delete"
            >
              <Trash2 className="h-3 w-3 text-app-text-secondary hover:text-red-500" />
            </button>
          )}
        </>
      )}
    </div>
  )
})
