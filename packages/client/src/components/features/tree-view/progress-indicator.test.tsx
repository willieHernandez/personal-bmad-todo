import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ProgressIndicator } from './progress-indicator'

afterEach(() => {
  cleanup()
})

describe('ProgressIndicator', () => {
  it('renders count text showing completed/total', () => {
    render(<ProgressIndicator completed={2} total={4} />)
    expect(screen.getByTestId('progress-count').textContent).toBe('2/4')
  })

  it('renders progress bar with correct width percentage', () => {
    render(<ProgressIndicator completed={2} total={4} />)
    const fill = screen.getByTestId('progress-bar-fill')
    expect(fill.style.width).toBe('50%')
  })

  it('uses green color class when 100% complete', () => {
    render(<ProgressIndicator completed={4} total={4} />)
    const fill = screen.getByTestId('progress-bar-fill')
    expect(fill.className).toContain('bg-green-500')
    expect(fill.className).not.toContain('bg-app-accent')
  })

  it('uses accent/blue color class for partial completion', () => {
    render(<ProgressIndicator completed={2} total={4} />)
    const fill = screen.getByTestId('progress-bar-fill')
    expect(fill.className).toContain('bg-app-accent')
    expect(fill.className).not.toContain('bg-green-500')
  })

  it('returns null when total is 0', () => {
    const { container } = render(<ProgressIndicator completed={0} total={0} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows 0/N with empty bar when zero completed', () => {
    render(<ProgressIndicator completed={0} total={3} />)
    expect(screen.getByTestId('progress-count').textContent).toBe('0/3')
    const fill = screen.getByTestId('progress-bar-fill')
    expect(fill.style.width).toBe('0%')
  })

  it('has correct accessibility attributes', () => {
    render(<ProgressIndicator completed={2} total={5} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar.getAttribute('aria-valuenow')).toBe('2')
    expect(progressbar.getAttribute('aria-valuemin')).toBe('0')
    expect(progressbar.getAttribute('aria-valuemax')).toBe('5')
    expect(progressbar.getAttribute('aria-label')).toBe('2 of 5 complete')
  })
})
