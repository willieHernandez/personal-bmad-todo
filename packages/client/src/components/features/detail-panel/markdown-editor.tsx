import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { useAutoSave } from '#/hooks/use-auto-save'

interface MarkdownEditorProps {
  nodeId: string
  parentId: string | null
  markdownBody: string
  nodeTitle: string
}

export function MarkdownEditor({ nodeId, parentId, markdownBody, nodeTitle }: MarkdownEditorProps) {
  const prevNodeIdRef = useRef(nodeId)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      Placeholder.configure({ placeholder: 'Write notes...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: markdownBody,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': `Markdown notes for ${nodeTitle}`,
        class: 'prose max-w-none outline-none min-h-[200px] p-2 text-app-text-primary',
      },
    },
  })

  const { error, flush } = useAutoSave(editor, nodeId, parentId)

  // Update content when nodeId changes (tab switch)
  useEffect(() => {
    if (editor && prevNodeIdRef.current !== nodeId) {
      flush()
      editor.commands.setContent(markdownBody || '', { contentType: 'markdown' })
      prevNodeIdRef.current = nodeId
    }
  }, [editor, nodeId, flush])

  // Update aria-label when nodeTitle changes
  useEffect(() => {
    if (editor) {
      editor.setOptions({
        editorProps: {
          attributes: {
            role: 'textbox',
            'aria-multiline': 'true',
            'aria-label': `Markdown notes for ${nodeTitle}`,
            class: 'prose max-w-none outline-none min-h-[200px] p-2 text-app-text-primary',
          },
        },
      })
    }
  }, [editor, nodeTitle])

  if (!editor) {
    return null
  }

  return (
    <div className="flex-1">
      <EditorContent editor={editor} />
      {error && (
        <p className="mt-1 text-xs text-destructive">Save failed</p>
      )}
    </div>
  )
}
