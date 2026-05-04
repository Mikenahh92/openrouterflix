/**
 * Component tests for ResponsePanel.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResponsePanel from './ResponsePanel';

describe('ResponsePanel', () => {
  it('shows "Response" label', () => {
    render(
      <ResponsePanel
        response={null}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        modelName={null}
        modelProvider={null}
      />
    );
    expect(screen.getByText('Response')).toBeInTheDocument();
  });

  // Empty state
  it('renders empty state placeholder', () => {
    render(
      <ResponsePanel
        response={null}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        modelName={null}
        modelProvider={null}
      />
    );
    expect(
      screen.getByText('Enter a prompt and click Send to test a model.')
    ).toBeInTheDocument();
  });

  // Loading state
  it('renders loading state with skeleton and waiting text', () => {
    render(
      <ResponsePanel
        response={null}
        isLoading={true}
        error={null}
        onRetry={vi.fn()}
        modelName="gpt-4o"
        modelProvider="OpenAI"
      />
    );
    expect(screen.getByTestId('loading-status')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('loading state has aria-label for accessibility', () => {
    render(
      <ResponsePanel
        response={null}
        isLoading={true}
        error={null}
        onRetry={vi.fn()}
        modelName="gpt-4o"
        modelProvider="OpenAI"
      />
    );
    expect(screen.getByLabelText('Loading response')).toBeInTheDocument();
  });

  // Success state
  it('renders success state with response text and metadata badges', () => {
    render(
      <ResponsePanel
        response={{
          text: 'Hello! How can I help?',
          tokens: 1247,
          latency: 2300,
          cost: 0.0012,
        }}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        modelName="gpt-4o"
        modelProvider="OpenAI"
      />
    );
    expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
    // Use Intl.NumberFormat('en-US') to format — exact output depends on locale
    expect(screen.getByText(/1,247 tokens/)).toBeInTheDocument();
    expect(screen.getByText('2.3s')).toBeInTheDocument();
    expect(screen.getByText('$0.0012')).toBeInTheDocument();
  });

  it('shows model name and provider badge on success', () => {
    render(
      <ResponsePanel
        response={{
          text: 'Response',
          tokens: 100,
          latency: 500,
          cost: 0.001,
        }}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        modelName="gpt-4o"
        modelProvider="OpenAI"
      />
    );
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('shows N/A when cost is null', () => {
    render(
      <ResponsePanel
        response={{
          text: 'Response',
          tokens: 100,
          latency: 500,
          cost: null,
        }}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        modelName="gpt-4o"
        modelProvider="OpenAI"
      />
    );
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  // Error state
  it('renders error state with message and retry button', () => {
    render(
      <ResponsePanel
        response={null}
        isLoading={false}
        error="Rate limit exceeded"
        onRetry={vi.fn()}
        modelName="gpt-4o"
        modelProvider="OpenAI"
      />
    );
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('error message has role="alert"', () => {
    render(
      <ResponsePanel
        response={null}
        isLoading={false}
        error="Something went wrong"
        onRetry={vi.fn()}
        modelName="gpt-4o"
        modelProvider="OpenAI"
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('clicking Retry calls onRetry callback', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(
      <ResponsePanel
        response={null}
        isLoading={false}
        error="Error"
        onRetry={onRetry}
        modelName="gpt-4o"
        modelProvider="OpenAI"
      />
    );
    await user.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // Accessibility
  it('container has aria-live="polite"', () => {
    const { container } = render(
      <ResponsePanel
        response={null}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        modelName={null}
        modelProvider={null}
      />
    );
    // The outer div with aria-live
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  // Elapsed timer
  it('cleans up timer interval on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <ResponsePanel
        response={null}
        isLoading={true}
        error={null}
        onRetry={vi.fn()}
        modelName="gpt-4o"
        modelProvider="OpenAI"
      />
    );

    // Advance 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Unmount — should clean up interval
    unmount();

    // Advance more — should not cause issues
    act(() => {
      vi.advanceTimersByTime(200);
    });

    vi.useRealTimers();
    // No React state update warnings = pass
  });

  it('timer stops when loading transitions to false', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <ResponsePanel
        response={null}
        isLoading={true}
        error={null}
        onRetry={vi.fn()}
        modelName="gpt-4o"
        modelProvider="OpenAI"
      />
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Check loading status shows elapsed time
    const loadingEl = screen.getByTestId('loading-status');
    expect(loadingEl.textContent).toContain('0.5s');

    // Transition to success
    rerender(
      <ResponsePanel
        response={{
          text: 'Done',
          tokens: 10,
          latency: 500,
          cost: 0,
        }}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        modelName="gpt-4o"
        modelProvider="OpenAI"
      />
    );

    // The loading element should be gone
    expect(screen.queryByTestId('loading-status')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    // Timer should have stopped — no extra time shown
    expect(screen.queryByTestId('loading-status')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
