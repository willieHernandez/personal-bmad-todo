import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-[var(--sea-ink)]">
          todo-bmad-style
        </h1>
        <p className="text-sm text-[var(--sea-ink-soft)]">
          Project scaffolding complete. Ready for Story 1.2.
        </p>
      </div>
    </main>
  )
}
