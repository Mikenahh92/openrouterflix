import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DimensionToggle from './DimensionToggle.jsx';

// ── Mock presets store ──────────────────────────────────────────────
// Use vi.hoisted so the mock factory can reference it
const { storeRef } = vi.hoisted(() => ({
  storeRef: {
    current: {
      visibleDimensions: [
        'provider', 'pricing.prompt', 'pricing.completion', 'latency',
        'contextWindow', 'qualityScore', 'maxOutput', 'modalities', 'categories',
      ],
      setVisibleDimensions: vi.fn(),
      resetVisibleDimensions: vi.fn(),
    },
  },
}));

vi.mock('../store.js', () => ({
  useComparisonPresetsStore: (selector) => selector(storeRef.current),
  ALL_DIMENSION_KEYS: [
    'provider', 'pricing.prompt', 'pricing.completion', 'latency',
    'contextWindow', 'qualityScore', 'maxOutput', 'modalities', 'categories',
  ],
}));

const ALL_DIMS = [
  'provider', 'pricing.prompt', 'pricing.completion', 'latency',
  'contextWindow', 'qualityScore', 'maxOutput', 'modalities', 'categories',
];

// ── Tests ───────────────────────────────────────────────────────────

describe('DimensionToggle', () => {
  beforeEach(() => {
    storeRef.current = {
      visibleDimensions: [...ALL_DIMS],
      setVisibleDimensions: vi.fn(),
      resetVisibleDimensions: vi.fn(),
    };
  });

  it('TC-UI-07: renders toggle button', () => {
    render(<DimensionToggle />);
    expect(screen.getByTestId('dimension-toggle-btn')).toBeInTheDocument();
    expect(screen.getByTestId('dimension-toggle-btn')).toHaveAttribute('aria-label', 'Toggle dimensions');
  });

  it('TC-UI-07: opens popover on click', async () => {
    const user = userEvent.setup();
    render(<DimensionToggle />);

    await user.click(screen.getByTestId('dimension-toggle-btn'));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Latency')).toBeInTheDocument();
  });

  it('TC-UI-07: toggling a dimension calls setVisibleDimensions', async () => {
    const user = userEvent.setup();
    render(<DimensionToggle />);

    await user.click(screen.getByTestId('dimension-toggle-btn'));
    await user.click(screen.getByText('Quality Score'));

    expect(storeRef.current.setVisibleDimensions).toHaveBeenCalled();
    const calledWith = storeRef.current.setVisibleDimensions.mock.calls[0][0];
    expect(calledWith).not.toContain('qualityScore');
    expect(calledWith).toHaveLength(8);
  });

  it('TC-UI-13: prevents hiding last dimension', async () => {
    const user = userEvent.setup();
    storeRef.current.visibleDimensions = ['latency'];

    render(<DimensionToggle />);
    await user.click(screen.getByTestId('dimension-toggle-btn'));

    const latencyBtn = screen.getByRole('menuitemcheckbox', { name: /Latency/i });
    expect(latencyBtn).toBeDisabled();
    expect(latencyBtn).toHaveAttribute('title', 'At least one dimension must be visible');
  });

  it('Reset all restores all dimensions', async () => {
    const user = userEvent.setup();
    storeRef.current.visibleDimensions = ['latency', 'pricing.prompt'];

    render(<DimensionToggle />);
    await user.click(screen.getByTestId('dimension-toggle-btn'));

    const resetBtn = screen.getByRole('menuitem', { name: /Reset all/i });
    await user.click(resetBtn);

    expect(storeRef.current.resetVisibleDimensions).toHaveBeenCalled();
  });

  it('closes popover on Escape', async () => {
    const user = userEvent.setup();
    render(<DimensionToggle />);

    await user.click(screen.getByTestId('dimension-toggle-btn'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('has correct aria-expanded state', async () => {
    const user = userEvent.setup();
    render(<DimensionToggle />);

    const btn = screen.getByTestId('dimension-toggle-btn');
    expect(btn).toHaveAttribute('aria-expanded', 'false');

    await user.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows all 9 dimensions in popover', async () => {
    const user = userEvent.setup();
    render(<DimensionToggle />);

    await user.click(screen.getByTestId('dimension-toggle-btn'));

    const items = screen.getAllByRole('menuitemcheckbox');
    expect(items).toHaveLength(9);
  });

  it('visible dimensions have aria-checked=true', async () => {
    const user = userEvent.setup();
    storeRef.current.visibleDimensions = ['latency', 'pricing.prompt'];

    render(<DimensionToggle />);
    await user.click(screen.getByTestId('dimension-toggle-btn'));

    const latencyItem = screen.getByRole('menuitemcheckbox', { name: /Latency/i });
    expect(latencyItem).toHaveAttribute('aria-checked', 'true');

    const providerItem = screen.getByRole('menuitemcheckbox', { name: /Provider/i });
    expect(providerItem).toHaveAttribute('aria-checked', 'false');
  });
});
