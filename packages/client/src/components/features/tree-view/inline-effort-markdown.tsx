import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'

interface InlineEffortMarkdownProps {
  markdownBody: string
  depth: number
  title: string
}

function ReadonlyMarkdown({ markdownBody }: { markdownBody: string }) {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: markdownBody,
    editable: false,
  })

  useEffect(() => {
    if (editor && !editor.isDestroyed && markdownBody !== undefined) {
      editor.commands.setContent(markdownBody)
    }
  }, [editor, markdownBody])

  if (!editor) return null

  return (
    <div className="rounded bg-app-hover p-2 mb-1">
      <div className="prose prose-sm max-w-none text-app-text-primary">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export function InlineEffortMarkdown({ markdownBody, depth, title }: InlineEffortMarkdownProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!markdownBody || !markdownBody.trim()) {
    return null
  }

  // Indent past the chevron column: depth * indent + chevron width
  const paddingLeft = `${depth * 20 + 24}px`

  return (
    <div
      aria-label={`Effort notes for ${title}`}
      tabIndex={-1}
      style={{ paddingLeft }}
    >
      <button
        type="button"
        className="w-full text-left text-xs text-app-text-secondary hover:text-app-text-primary py-0.5"
        onClick={() => setIsExpanded(!isExpanded)}
        tabIndex={-1}
      >
        {isExpanded ? '▾ Hide notes' : '▸ Show notes'}
      </button>
      {isExpanded && <ReadonlyMarkdown markdownBody={markdownBody} />}
    </div>
  )
}
