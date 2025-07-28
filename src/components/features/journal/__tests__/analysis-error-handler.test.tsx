import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalysisErrorHandler } from '../analysis-error-handler'

describe('AnalysisErrorHandler', () => {
  const mockOnRetry = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should display timeout error message', () => {
    render(
      <AnalysisErrorHandler
        error="Analysis timeout - taking longer than expected"
        onRetry={mockOnRetry}
        canRetry={true}
      />
    )

    expect(
      screen.getByText('Analysis Taking Longer Than Expected')
    ).toBeInTheDocument()
    expect(
      screen.getByText(/The AI analysis is taking longer than usual/)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /retry analysis/i })
    ).toBeInTheDocument()
  })

  test('should display network error message', () => {
    render(
      <AnalysisErrorHandler
        error="Network connection failed"
        onRetry={mockOnRetry}
        canRetry={true}
      />
    )

    expect(screen.getByText('Connection Issue')).toBeInTheDocument()
    expect(
      screen.getByText(/There was a problem connecting to our AI service/)
    ).toBeInTheDocument()
  })

  test('should display rate limit error with confirmation dialog', async () => {
    const user = userEvent.setup()

    render(
      <AnalysisErrorHandler
        error="Rate limit exceeded - high demand"
        onRetry={mockOnRetry}
        canRetry={true}
      />
    )

    expect(
      screen.getByText('Service Temporarily Unavailable')
    ).toBeInTheDocument()

    const retryButton = screen.getByRole('button', {
      name: /retry in 1 minute/i,
    })
    await user.click(retryButton)

    expect(screen.getByText('Confirm Retry')).toBeInTheDocument()
    expect(
      screen.getByText(/Consider waiting a few minutes/)
    ).toBeInTheDocument()
  })

  test('should display validation error without retry option', () => {
    render(
      <AnalysisErrorHandler
        error="Content validation failed - unusual characters"
        onRetry={mockOnRetry}
        canRetry={true}
      />
    )

    expect(screen.getByText('Content Issue')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /retry/i })
    ).not.toBeInTheDocument()
  })

  test('should handle retry action', async () => {
    mockOnRetry.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <AnalysisErrorHandler
        error="Service error occurred"
        onRetry={mockOnRetry}
        canRetry={true}
      />
    )

    const retryButton = screen.getByRole('button', { name: /try again later/i })
    await user.click(retryButton)

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })
  })

  test('should disable retry when canRetry is false', () => {
    render(
      <AnalysisErrorHandler
        error="Max retries exceeded"
        onRetry={mockOnRetry}
        canRetry={false}
      />
    )

    expect(
      screen.queryByRole('button', { name: /retry/i })
    ).not.toBeInTheDocument()
  })

  test('should show loading state during retry', async () => {
    let resolveRetry: () => void
    const retryPromise = new Promise<void>(resolve => {
      resolveRetry = resolve
    })
    mockOnRetry.mockReturnValue(retryPromise)

    const user = userEvent.setup()

    render(
      <AnalysisErrorHandler
        error="Service error"
        onRetry={mockOnRetry}
        canRetry={true}
      />
    )

    const retryButton = screen.getByRole('button', { name: /try again later/i })
    await user.click(retryButton)

    expect(
      screen.getByRole('button', { name: /retrying.../i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retrying.../i })).toBeDisabled()

    resolveRetry!()
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /retrying.../i })
      ).not.toBeInTheDocument()
    })
  })

  test('should display technical details in compact mode', () => {
    render(
      <AnalysisErrorHandler
        error="Detailed error message for debugging"
        onRetry={mockOnRetry}
        canRetry={true}
        compact={true}
      />
    )

    expect(screen.getByText('AI Service Error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  test('should handle rate limit confirmation dialog flow', async () => {
    mockOnRetry.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <AnalysisErrorHandler
        error="Rate limit exceeded"
        onRetry={mockOnRetry}
        canRetry={true}
      />
    )

    // Click retry to open confirmation dialog
    const initialRetryButton = screen.getByRole('button', {
      name: /retry in 1 minute/i,
    })
    await user.click(initialRetryButton)

    expect(screen.getByText('Confirm Retry')).toBeInTheDocument()

    // Click "Retry Now" in confirmation dialog
    const confirmRetryButton = screen.getByRole('button', {
      name: /retry now/i,
    })
    await user.click(confirmRetryButton)

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })
  })

  test('should cancel confirmation dialog', async () => {
    const user = userEvent.setup()

    render(
      <AnalysisErrorHandler
        error="Rate limit exceeded"
        onRetry={mockOnRetry}
        canRetry={true}
      />
    )

    // Click retry to open confirmation dialog
    const initialRetryButton = screen.getByRole('button', {
      name: /retry in 1 minute/i,
    })
    await user.click(initialRetryButton)

    expect(screen.getByText('Confirm Retry')).toBeInTheDocument()

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText('Confirm Retry')).not.toBeInTheDocument()
    })
    expect(mockOnRetry).not.toHaveBeenCalled()
  })
})
