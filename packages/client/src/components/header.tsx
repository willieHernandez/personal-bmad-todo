import ThemeToggle from './theme-toggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="flex items-center justify-between py-3">
        <h1 className="m-0 text-base font-semibold tracking-tight text-[var(--sea-ink)]">
          todo-bmad-style
        </h1>
        <ThemeToggle />
      </nav>
    </header>
  )
}
