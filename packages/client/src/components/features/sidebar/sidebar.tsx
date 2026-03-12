import { useProjects } from '#/queries/node-queries'
import { SidebarSection } from './sidebar-section'
import { ProjectListItem } from './project-list-item'

export function Sidebar() {
  const { data: projects } = useProjects()

  const sortedProjects = projects
    ? [...projects].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    : []

  return (
    <nav className="flex h-full flex-col overflow-y-auto border-r border-app-border bg-app-surface">
      <SidebarSection title="Inbox">
        <div className="px-4 py-2 text-xs text-app-text-muted">No inbox items</div>
      </SidebarSection>

      <SidebarSection title="Pinned">
        <div className="px-4 py-2 text-xs text-app-text-muted">No pinned projects</div>
      </SidebarSection>

      <SidebarSection title="Recent">
        {sortedProjects.length > 0 ? (
          sortedProjects.map((project) => (
            <ProjectListItem
              key={project.id}
              id={project.id}
              title={project.title}
            />
          ))
        ) : (
          <div className="px-4 py-2 text-xs text-app-text-muted">No projects yet</div>
        )}
      </SidebarSection>

      <SidebarSection title="On Hold">
        <div className="px-4 py-2 text-xs text-app-text-muted">No on-hold projects</div>
      </SidebarSection>
    </nav>
  )
}
