export function CaptureBarPlaceholder() {
  return (
    <div
      className="flex h-12 shrink-0 items-center border-b border-app-border bg-app-bg px-4"
      aria-label="Quick capture"
    >
      <span className="text-xs text-app-text-muted">Quick capture (coming soon...)</span>
    </div>
  )
}
