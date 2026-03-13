import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { ScrollArea, ScrollBar } from '#/components/ui/scroll-area'
import { useUIStore } from '#/stores/ui-store'
import { useProjects, useCreateProject } from '#/queries/node-queries'
import type { NodeResponse } from '@todo-bmad-style/shared'

export function ProjectTabs() {
  const { openProjectIds, activeProjectId, setActiveProject, closeProjectTab } =
    useUIStore()
  const { data: projects } = useProjects()
  const createProject = useCreateProject()
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const projectMap = new Map<string, NodeResponse>()
  if (projects) {
    for (const p of projects) {
      projectMap.set(p.id, p)
    }
  }

  function handleCreate() {
    const title = newTitle.trim()
    if (!title) {
      setIsCreating(false)
      return
    }
    createProject.mutate(
      { title },
      {
        onSuccess: (node) => {
          setActiveProject(node.id)
          setNewTitle('')
          setIsCreating(false)
        },
      }
    )
  }

  return (
    <div className="flex h-9 shrink-0 items-center border-b border-app-border bg-app-surface">
      <ScrollArea className="w-full">
        <div className="flex h-9 items-center">
          <div role="tablist" aria-label="Open projects" className="flex h-9 items-center">
            {openProjectIds.map((id) => {
              const project = projectMap.get(id)
              const isActive = id === activeProjectId
              return (
                <div
                  key={id}
                  className={`group relative flex h-9 shrink-0 items-center text-sm transition-colors ${
                    isActive
                      ? 'font-medium text-app-text-primary'
                      : 'text-app-text-secondary hover:bg-app-hover'
                  }`}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className="flex h-full items-center gap-1.5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                    onClick={() => setActiveProject(id)}
                  >
                    <span className="max-w-32 truncate">
                      {project?.title ?? 'Loading...'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="mr-1 rounded p-0.5 opacity-0 transition-opacity hover:bg-app-border group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-1"
                    onClick={() => closeProjectTab(id)}
                    aria-label={`Close ${project?.title ?? 'project'} tab`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-app-accent" />
                  )}
                </div>
              )
            })}
          </div>

          {isCreating ? (
            <input
              className="h-9 w-32 border-none bg-transparent px-3 text-sm outline-none"
              placeholder="Project name..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') {
                  setIsCreating(false)
                  setNewTitle('')
                }
              }}
              onBlur={handleCreate}
              autoFocus
            />
          ) : (
            <button
              type="button"
              className="flex h-9 shrink-0 items-center px-2 text-app-text-muted hover:text-app-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
              onClick={() => setIsCreating(true)}
              aria-label="Create new project"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
