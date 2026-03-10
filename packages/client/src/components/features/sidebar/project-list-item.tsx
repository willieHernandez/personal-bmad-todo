import { useUIStore } from '#/stores/ui-store'

interface ProjectListItemProps {
  id: string
  title: string
}

export function ProjectListItem({ id, title }: ProjectListItemProps) {
  const { activeProjectId, setActiveProject } = useUIStore()
  const isActive = activeProjectId === id

  return (
    <button
      type="button"
      className={`flex w-full items-center px-4 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 ${
        isActive
          ? 'border-l-2 border-app-accent bg-app-accent-light text-app-text-primary'
          : 'border-l-2 border-transparent text-app-text-primary hover:bg-app-hover'
      }`}
      onClick={() => setActiveProject(id)}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="truncate">{title}</span>
    </button>
  )
}
