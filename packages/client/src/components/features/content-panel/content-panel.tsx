import { Plus } from 'lucide-react'
import { useUIStore } from '#/stores/ui-store'
import { useProjects, useCreateProject } from '#/queries/node-queries'

export function ContentPanel() {
  const activeProjectId = useUIStore((s) => s.activeProjectId)
  const setActiveProject = useUIStore((s) => s.setActiveProject)
  const { data: projects } = useProjects()
  const createProject = useCreateProject()

  const activeProject = projects?.find((p) => p.id === activeProjectId)

  if (!activeProjectId || !activeProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-app-bg text-center">
        <p className="text-sm text-app-text-secondary">
          Select a project from the sidebar or create a new one
        </p>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-app-border bg-app-surface px-4 py-2 text-sm text-app-text-primary transition-colors hover:bg-app-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
          onClick={() => {
            createProject.mutate(
              { title: 'New Project' },
              {
                onSuccess: (node) => {
                  setActiveProject(node.id)
                },
              }
            )
          }}
        >
          <Plus className="h-4 w-4" />
          Create project
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center bg-app-bg">
      <p className="text-sm text-app-text-secondary">
        Tree view for {activeProject.title} (coming in Story 1.4)
      </p>
    </div>
  )
}
