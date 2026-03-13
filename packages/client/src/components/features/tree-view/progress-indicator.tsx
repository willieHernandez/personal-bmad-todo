interface ProgressIndicatorProps {
  completed: number
  total: number
}

const PROGRESS_BAR_WIDTH_PX = 40
const PROGRESS_BAR_HEIGHT_PX = 3

export function ProgressIndicator({ completed, total }: ProgressIndicatorProps) {
  if (total === 0) return null

  const percentage = Math.round((completed / total) * 100)
  const isComplete = completed === total

  return (
    <div
      className="flex shrink-0 items-center gap-1.5"
      role="progressbar"
      aria-valuenow={completed}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${completed} of ${total} complete`}
      data-testid="progress-indicator"
    >
      <span className="text-xs text-app-text-secondary" data-testid="progress-count">
        {completed}/{total}
      </span>
      <div
        className="overflow-hidden rounded-sm bg-app-border"
        style={{ width: `${PROGRESS_BAR_WIDTH_PX}px`, height: `${PROGRESS_BAR_HEIGHT_PX}px` }}
        data-testid="progress-bar-track"
      >
        <div
          className={isComplete ? 'h-full bg-green-500' : 'h-full bg-app-accent'}
          style={{ width: `${percentage}%` }}
          data-testid="progress-bar-fill"
        />
      </div>
    </div>
  )
}
